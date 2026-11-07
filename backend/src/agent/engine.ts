import { AgentTools } from './tools';
import { GeminiProvider } from '../providers/gemini';
import { OllamaProvider } from '../providers/ollama';
import { ProjectIndexer, ProjectIndex } from './indexer';
import { LocalCoderEngine } from './localCoder';

export interface AgentRunOptions {
  prompt: string;
  provider: 'gemini' | 'ollama' | 'local';
  apiKey?: string;
  modelName?: string;
  endpointUrl?: string;
  workspaceRoot: string;
  onEvent?: (event: { type: string; payload: any }) => void;
}

export class AgentEngine {
  private tools: AgentTools;
  private indexer: ProjectIndexer;
  private localCoder: LocalCoderEngine;
  private cachedIndex: ProjectIndex | null = null;

  constructor(workspaceRoot: string) {
    this.tools = new AgentTools(workspaceRoot);
    this.indexer = new ProjectIndexer(workspaceRoot);
    this.localCoder = new LocalCoderEngine(workspaceRoot);
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

  async run(options: AgentRunOptions) {
    const { prompt, provider, apiKey, modelName, endpointUrl, onEvent } = options;

    const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY || '';

    // If Gemini is requested with an API key, run real Gemini API
    if (provider === 'gemini' && resolvedApiKey && resolvedApiKey.trim().length > 10) {
      try {
        const index = await this.getOrBuildIndex();
        const systemPromptWithContext = `You are CodePilot Antigravity Agent, an expert autonomous AI software engineer.
You have real tools to inspect, read, create, edit files, and execute shell commands in the project directory.

PROJECT CONTEXT:
- Languages: ${index.languages.join(', ') || 'General'}
- Frameworks: ${index.frameworks.join(', ') || 'Standard'}
- Files in project: ${Object.keys(index.files).slice(0, 15).join(', ') || 'Fresh workspace'}

AUTONOMOUS WORKFLOW:
1. When asked a greeting or question, answer directly and concisely.
2. For multi-file requests, provide a clear implementation plan.
3. Call tools to inspect existing files (list_dir, read_file).
4. Create all required files using write_file with complete, working code.
5. Verify your implementation by running terminal syntax checks or builds (run_terminal_command).
6. When all steps are done, summarize the completed files and explain how the user can test/run the application.`;

        const activeModel = modelName && modelName.includes('3.8') ? modelName : 'gemini-3.8-flash';
        const gemini = new GeminiProvider(resolvedApiKey, activeModel);
        const chatHistory: any[] = [];
        let currentInput: any = prompt;

        let maxTurns = 15;
        while (maxTurns > 0) {
          maxTurns--;

          const { text, toolCalls } = await gemini.runChatTurn(
            systemPromptWithContext,
            chatHistory,
            currentInput,
            (chunk) => {
              onEvent?.({ type: 'stream_chunk', payload: chunk });
            }
          );

          if (!toolCalls || toolCalls.length === 0) {
            onEvent?.({ type: 'task_complete', payload: { finalResponse: text } });
            return;
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
            parts: [{ text: typeof currentInput === 'string' ? currentInput : 'Proceed with next step' }],
          });
          chatHistory.push({
            role: 'model',
            parts: toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } })),
          });

          currentInput = toolResponses;
        }
        return;
      } catch (err: any) {
        console.warn('[Gemini Cloud Provider Failed, falling back to Autonomous Local Engine]:', err.message);
        onEvent?.({
          type: 'stream_chunk',
          payload: `*(Gemini API returned error: ${err.message}. Seamlessly switching to Built-in Antigravity AI Engine...)*\n\n`,
        });
      }
    }

    // Check Ollama provider if specified
    if (provider === 'ollama') {
      try {
        const ollama = new OllamaProvider(endpointUrl || 'http://localhost:11434', modelName || 'deepseek-r1:latest');
        const text = await ollama.generateAutonomousResponse(
          'You are CodePilot Antigravity Agent.',
          [{ role: 'user', content: prompt }],
          (chunk) => onEvent?.({ type: 'stream_chunk', payload: chunk })
        );
        onEvent?.({ type: 'task_complete', payload: { finalResponse: text } });
        return;
      } catch {
        // Fall back to built-in local engine
      }
    }

    // ZERO API KEY AUTONOMOUS AI ENGINE (Local, instant, creates files & runs code)
    try {
      const p = prompt.trim().toLowerCase();

      // Simple greeting
      if (['hi', 'hello', 'hey', 'start'].includes(p)) {
        const greeting = `Hello! I am your **Antigravity AI Agent**.\n\nI am fully connected to your workspace with **zero API key required**. I can:\n- Inspect and read files\n- Create and edit code across files\n- Execute commands in the terminal\n- Test and verify code autonomously\n\nGive me any coding task (e.g., *"Create math.js with add/sub and verify in test.js"* or *"Build an express server"*).`;
        onEvent?.({ type: 'stream_chunk', payload: greeting });
        onEvent?.({ type: 'task_complete', payload: { finalResponse: greeting } });
        return;
      }

      // Generate task solution
      const localResult = this.localCoder.generateCode(prompt);

      // Stream thoughts
      onEvent?.({
        type: 'stream_chunk',
        payload: `### Antigravity AI Agent Plan\n${localResult.thought}\n\n`,
      });

      // 1. Tool execution: Write files
      for (const file of localResult.filesToCreate) {
        const toolCall = {
          name: 'write_file',
          args: { filePath: file.path, content: file.content },
        };
        onEvent?.({ type: 'tool_execution_start', payload: toolCall });

        const result = await this.tools.writeFile(file.path, file.content);

        onEvent?.({
          type: 'tool_execution_end',
          payload: { toolCall, result },
        });

        onEvent?.({
          type: 'stream_chunk',
          payload: `Created \`${file.path}\`\n`,
        });
      }

      // 2. Tool execution: Run terminal command
      if (localResult.commandToRun) {
        const toolCall = {
          name: 'run_terminal_command',
          args: { command: localResult.commandToRun },
        };
        onEvent?.({ type: 'tool_execution_start', payload: toolCall });

        const result = await this.tools.runTerminalCommand(localResult.commandToRun);

        onEvent?.({
          type: 'tool_execution_end',
          payload: { toolCall, result },
        });

        onEvent?.({
          type: 'stream_chunk',
          payload: `\n**Terminal Output:**\n\`\`\`\n${result.output || result.error || 'Done'}\n\`\`\`\n`,
        });
      }

      // Final summary
      const finalMsg = `\n✅ **Task Complete!**\n${localResult.summary}`;
      onEvent?.({ type: 'stream_chunk', payload: finalMsg });
      onEvent?.({ type: 'task_complete', payload: { finalResponse: finalMsg } });
    } catch (err: any) {
      console.error(`[LOCAL ENGINE RUN ERROR]:`, err);
      onEvent?.({
        type: 'stream_chunk',
        payload: `\n\n❌ **Execution Error:**\n${err.message || 'Unknown error occurred'}`,
      });
      onEvent?.({ type: 'task_complete', payload: { finalResponse: 'Error' } });
    }
  }
}
