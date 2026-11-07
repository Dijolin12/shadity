import { AgentTools } from './tools';
import { GeminiProvider } from '../providers/gemini';
import { OllamaProvider } from '../providers/ollama';
import { ProjectIndexer, ProjectIndex } from './indexer';

export interface AgentRunOptions {
  prompt: string;
  provider: 'gemini' | 'ollama';
  apiKey?: string;
  modelName?: string;
  endpointUrl?: string;
  workspaceRoot: string;
  onEvent?: (event: { type: string; payload: any }) => void;
}

export class AgentEngine {
  private tools: AgentTools;
  private indexer: ProjectIndexer;
  private cachedIndex: ProjectIndex | null = null;

  constructor(workspaceRoot: string) {
    this.tools = new AgentTools(workspaceRoot);
    this.indexer = new ProjectIndexer(workspaceRoot);
  }

  async getOrBuildIndex(): Promise<ProjectIndex> {
    if (!this.cachedIndex || Date.now() - this.cachedIndex.lastIndexed > 60000) {
      try {
        this.cachedIndex = await this.indexer.buildIndex();
      } catch {
        this.cachedIndex = {
          frameworks: [],
          languages: [],
          dependencies: {},
          files: {},
          lastIndexed: Date.now(),
        };
      }
    }
    return this.cachedIndex;
  }

  // Normalize model name to guaranteed working Google Gemini endpoint
  private normalizeGeminiModel(name?: string): string {
    if (!name || name === 'gemini-1.5-pro') return 'gemini-1.5-flash';
    if (name === 'gemini-2.0-flash') return 'gemini-2.0-flash-exp';
    if (name.includes('flash')) return 'gemini-1.5-flash';
    return name;
  }

  async run(options: AgentRunOptions) {
    const { prompt, provider, apiKey, modelName, endpointUrl, onEvent } = options;

    const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY || '';

    // If Gemini is selected but no API key was provided
    if (provider === 'gemini' && !resolvedApiKey) {
      onEvent?.({
        type: 'stream_chunk',
        payload: '⚠️ **Gemini API Key Required**\n\nPlease add your free Gemini API key to start using CodePilot:\n1. Click the **Settings icon (⚙️)** in the top right or bottom left.\n2. Paste your Google Gemini API key.\n3. Click **Save Settings**.\n\n*(Alternatively, select **Ollama** in the Model dropdown to use free local offline AI without any key!)*',
      });
      onEvent?.({ type: 'task_complete', payload: { finalResponse: 'API Key missing' } });
      return;
    }

    try {
      // 1. Build codebase memory
      const index = await this.getOrBuildIndex();
      const relevantFiles = this.indexer.findRelevantContext(prompt, index);

      const contextHeader = `PROJECT CONTEXT:
- Languages: ${index.languages.join(', ') || 'General'}
- Frameworks: ${index.frameworks.join(', ') || 'Standard'}
- Relevant Files: ${relevantFiles.join(', ') || 'None'}
`;

      const systemPromptWithContext = `You are CodePilot, an expert autonomous AI software engineer inspired by Google Antigravity and Gemini AI.
You have real tools to inspect, read, create, edit files, and execute shell commands in the project directory.

${contextHeader}

WORKFLOW:
1. When asked a simple greeting or question, answer directly and politely.
2. When asked to code or build features, start by inspecting the project structure (list_dir) or reading relevant files (read_file).
3. For multi-file requests, create complete, working files using write_file.
4. When finished, summarize what was built.`;

      if (provider === 'gemini') {
        const activeModel = this.normalizeGeminiModel(modelName);
        const gemini = new GeminiProvider(resolvedApiKey, activeModel);
        const chatHistory: any[] = [];
        let currentInput: any = prompt;

        let maxTurns = 15;
        while (maxTurns > 0) {
          maxTurns--;

          const { text, toolCalls } = await gemini.runChatTurn(systemPromptWithContext, chatHistory, currentInput);

          if (text) {
            onEvent?.({ type: 'stream_chunk', payload: text });
          }

          if (!toolCalls || toolCalls.length === 0) {
            onEvent?.({ type: 'task_complete', payload: { finalResponse: text } });
            break;
          }

          // Execute tool calls
          const toolResponses: any[] = [];
          for (const call of toolCalls) {
            onEvent?.({ type: 'tool_execution_start', payload: call });

            let result: any;
            switch (call.name) {
              case 'list_dir':
                result = await this.tools.listDir(call.args.dirPath || '.');
                break;
              case 'read_file':
                result = await this.tools.readFile(call.args.filePath);
                break;
              case 'write_file':
                result = await this.tools.writeFile(call.args.filePath, call.args.content);
                break;
              case 'edit_file':
                result = await this.tools.editFile(call.args.filePath, call.args.target, call.args.replacement);
                break;
              case 'run_terminal_command':
                result = await this.tools.runTerminalCommand(call.args.command);
                break;
              default:
                result = { success: false, error: `Unknown tool ${call.name}` };
            }

            onEvent?.({ type: 'tool_execution_end', payload: { toolCall: call, result } });

            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: result,
              },
            });
          }

          chatHistory.push({
            role: 'user',
            parts: [{ text: typeof currentInput === 'string' ? currentInput : 'Proceed with tool execution' }],
          });
          chatHistory.push({
            role: 'model',
            parts: toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } })),
          });

          currentInput = toolResponses;
        }
      } else {
        // Ollama Local Provider
        const ollama = new OllamaProvider(endpointUrl || 'http://localhost:11434', modelName || 'deepseek-r1:latest');
        const text = await ollama.generateAutonomousResponse(
          systemPromptWithContext,
          [{ role: 'user', content: prompt }],
          (chunk) => onEvent?.({ type: 'stream_chunk', payload: chunk })
        );
        onEvent?.({ type: 'task_complete', payload: { finalResponse: text } });
      }
    } catch (err: any) {
      onEvent?.({
        type: 'stream_chunk',
        payload: `\n\n❌ **Error from AI Model:**\n${err.message || 'Unknown error occurred'}`,
      });
      onEvent?.({ type: 'task_complete', payload: { finalResponse: 'Error' } });
    }
  }
}
