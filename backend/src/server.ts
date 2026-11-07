import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { AgentEngine } from './agent/engine';
import { AgentTools } from './agent/tools';
import { GitManager } from './agent/git';
import { DebuggerEngine } from './agent/debugger';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';
import { SessionStore } from './db/storage';

const execAsync = promisify(exec);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4000;

// Resolve true project workspace (Shadity root)
let WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();
if (WORKSPACE_DIR.endsWith('backend') && fs.existsSync(path.resolve(WORKSPACE_DIR, '..', 'package.json'))) {
  WORKSPACE_DIR = path.resolve(WORKSPACE_DIR, '..');
}

app.use(cors());
app.use(express.json());

let tools = new AgentTools(WORKSPACE_DIR);
let gitManager = new GitManager(WORKSPACE_DIR);
let agentEngine = new AgentEngine(WORKSPACE_DIR);
let debuggerEngine = new DebuggerEngine(WORKSPACE_DIR);
let sessionStore = new SessionStore(WORKSPACE_DIR);

// Switch workspace dynamically
app.post('/api/workspace/set', (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath || !fs.existsSync(newPath)) {
    return res.status(400).json({ error: 'Invalid directory path' });
  }
  WORKSPACE_DIR = path.resolve(newPath);
  tools = new AgentTools(WORKSPACE_DIR);
  gitManager = new GitManager(WORKSPACE_DIR);
  agentEngine = new AgentEngine(WORKSPACE_DIR);
  debuggerEngine = new DebuggerEngine(WORKSPACE_DIR);
  sessionStore = new SessionStore(WORKSPACE_DIR);
  console.log('[Workspace Switched]:', WORKSPACE_DIR);
  res.json({ success: true, workspace: WORKSPACE_DIR });
});

// Native Windows / System Folder Picker Dialog Endpoint
app.post('/api/workspace/pick-dialog', (req, res) => {
  const scriptPath = path.resolve(__dirname, '../pick-folder.ps1');
  const fallbackScript = path.resolve(process.cwd(), 'backend/pick-folder.ps1');
  const targetScript = fs.existsSync(scriptPath) ? scriptPath : fallbackScript;

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${targetScript}"`, (error, stdout) => {
    const selected = (stdout || '').trim();
    if (!selected || !fs.existsSync(selected)) {
      return res.json({ canceled: true });
    }

    WORKSPACE_DIR = path.resolve(selected);
    tools = new AgentTools(WORKSPACE_DIR);
    gitManager = new GitManager(WORKSPACE_DIR);
    agentEngine = new AgentEngine(WORKSPACE_DIR);
    debuggerEngine = new DebuggerEngine(WORKSPACE_DIR);
    sessionStore = new SessionStore(WORKSPACE_DIR);
    console.log('[Workspace Switched via Native Dialog]:', WORKSPACE_DIR);
    res.json({ success: true, workspace: WORKSPACE_DIR });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'CodePilot AI IDE Backend', workspace: WORKSPACE_DIR });
});

// Workspace Session persistence
app.get('/api/session', async (req, res) => {
  const session = await sessionStore.getSession();
  res.json(session);
});

app.post('/api/session', async (req, res) => {
  await sessionStore.saveSession(req.body);
  res.json({ success: true });
});

// File system APIs
app.get('/api/files/list', async (req, res) => {
  try {
    const relPath = (req.query.path as string) || '.';
    const targetDir = path.resolve(WORKSPACE_DIR, relPath);

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ success: false, error: 'Directory does not exist' });
    }

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    const formatted = entries
      .filter(e => !['node_modules', '.git'].includes(e.name) || relPath.includes('node_modules'))
      .map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
      .join('\n');

    res.json({ success: true, output: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/read', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const result = await tools.readFile(filePath);
  res.json(result);
});

app.post('/api/files/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  const result = await tools.writeFile(filePath, content);
  res.json(result);
});

// Code search across files
app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json({ results: [] });

  const results: { path: string; line: number; match: string }[] = [];
  const ignoreFolders = new Set(['node_modules', '.git', 'dist', 'build']);

  const searchDir = async (dir: string) => {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (ignoreFolders.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          await searchDir(full);
        } else if (e.isFile() && ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css'].includes(path.extname(e.name))) {
          const content = await fs.promises.readFile(full, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              results.push({
                path: path.relative(WORKSPACE_DIR, full).replace(/\\/g, '/'),
                line: i + 1,
                match: lines[i].trim().slice(0, 100),
              });
              if (results.length > 30) return;
            }
          }
        }
      }
    } catch {}
  };

  await searchDir(WORKSPACE_DIR);
  res.json({ results });
});

// Git APIs
app.get('/api/git/status', async (req, res) => {
  const status = await gitManager.getStatus();
  res.json(status);
});

app.get('/api/git/diff', async (req, res) => {
  const filePath = req.query.path as string;
  const diff = await gitManager.getDiff(filePath);
  res.json({ diff });
});

app.post('/api/git/stage', async (req, res) => {
  const { path: filePath } = req.body;
  try {
    const out = await gitManager.stageFile(filePath || '.');
    res.json({ success: true, output: out });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/git/commit', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const out = await gitManager.commit(message);
    res.json({ success: true, output: out });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Generated Commit Message
app.post('/api/git/generate-commit-msg', async (req, res) => {
  try {
    const diff = await gitManager.getDiff();
    if (!diff) return res.json({ message: 'chore: update project files' });

    const { provider = 'gemini', apiKey, modelName, endpointUrl } = req.body;
    let aiProvider: { generateAutonomousResponse: (s: string, h: any[]) => Promise<string> };

    if (provider === 'gemini') {
      aiProvider = new GeminiProvider(apiKey || process.env.GEMINI_API_KEY || '', modelName || 'gemini-3.8-flash');
    } else {
      aiProvider = new OllamaProvider(endpointUrl || 'http://localhost:11434', modelName || 'deepseek-r1:latest');
    }

    const commitMsg = await aiProvider.generateAutonomousResponse(
      'You are a Git commit message generator. Based on the git diff provided, write a single concise conventional commit message line. Output ONLY the commit message line, no explanations, no quotes.',
      [{ role: 'user', content: `Here is the git diff:\n\n${diff.slice(0, 4000)}` }]
    );

    res.json({ message: commitMsg.trim() });
  } catch (err: any) {
    res.json({ message: 'feat: apply code modifications' });
  }
});

// AI Debugger Endpoints
app.post('/api/debug/analyze', async (req, res) => {
  const { rawError, provider, apiKey, modelName, endpointUrl } = req.body;
  if (!rawError) return res.status(400).json({ error: 'rawError log is required' });

  try {
    const analysis = await debuggerEngine.analyzeAndFixError(rawError, provider, apiKey, modelName, endpointUrl);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debug/apply-fix', async (req, res) => {
  const { filePath, targetCode, replacementCode } = req.body;
  if (!filePath || !targetCode) return res.status(400).json({ error: 'Missing fix arguments' });

  const result = await tools.editFile(filePath, targetCode, replacementCode);
  res.json(result);
});

// Real-time Agent Prompt Endpoint
app.post('/api/agent/prompt', async (req, res) => {
  const { prompt, provider = 'gemini', apiKey, modelName, endpointUrl } = req.body;

  console.log(`\n========================================`);
  console.log(`[AGENT INCOMING PROMPT]: "${prompt}"`);
  console.log(`[PROVIDER]: ${provider} | [MODEL]: ${modelName}`);
  console.log(`[HAS API KEY]: ${Boolean(apiKey || process.env.GEMINI_API_KEY)}`);
  console.log(`========================================\n`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await agentEngine.run({
      prompt,
      provider,
      apiKey,
      modelName,
      endpointUrl,
      workspaceRoot: WORKSPACE_DIR,
      onEvent: (event) => {
        console.log(`[AGENT STREAM EVENT]:`, event.type);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });
    res.end();
  } catch (err: any) {
    console.error(`[AGENT ENGINE ERROR]:`, err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// WebSocket for real-time terminal streaming
wss.on('connection', (ws: WebSocket) => {
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to CodePilot Terminal Bridge' }));

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'run_command') {
        const result = await tools.runTerminalCommand(data.command);
        ws.send(JSON.stringify({ type: 'command_result', result }));
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[CodePilot IDE Backend] Running on http://localhost:${PORT}`);
  console.log(`[Workspace Sandbox] Active at: ${WORKSPACE_DIR}`);
});
