import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { AgentEngine } from './agent/engine';
import { AgentTools } from './agent/tools';
import { GitManager } from './agent/git';
import { DebuggerEngine } from './agent/debugger';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4000;
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();

app.use(cors());
app.use(express.json());

const tools = new AgentTools(WORKSPACE_DIR);
const gitManager = new GitManager(WORKSPACE_DIR);
const agentEngine = new AgentEngine(WORKSPACE_DIR);
const debuggerEngine = new DebuggerEngine(WORKSPACE_DIR);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'CodePilot AI IDE Backend', workspace: WORKSPACE_DIR });
});

// File system APIs
app.get('/api/files/list', async (req, res) => {
  const dirPath = (req.query.path as string) || '.';
  const result = await tools.listDir(dirPath);
  res.json(result);
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
    if (!diff) {
      return res.json({ message: 'chore: update project files' });
    }

    const { provider = 'gemini', apiKey, modelName, endpointUrl } = req.body;
    let aiProvider: { generateAutonomousResponse: (s: string, h: any[]) => Promise<string> };

    if (provider === 'gemini') {
      aiProvider = new GeminiProvider(apiKey || process.env.GEMINI_API_KEY || '', modelName || 'gemini-1.5-pro');
    } else {
      aiProvider = new OllamaProvider(endpointUrl || 'http://localhost:11434', modelName || 'deepseek-r1:latest');
    }

    const commitMsg = await aiProvider.generateAutonomousResponse(
      'You are a Git commit message generator. Based on the git diff provided, write a single concise conventional commit message (e.g. "feat: add user authentication", "fix: resolve memory leak in parser"). Output ONLY the commit message line, no explanations, no quotes.',
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

// Prompt endpoint
app.post('/api/agent/prompt', async (req, res) => {
  const { prompt, provider = 'gemini', apiKey, modelName, endpointUrl } = req.body;

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
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });
    res.end();
  } catch (err: any) {
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
