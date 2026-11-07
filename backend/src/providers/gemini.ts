import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export interface ToolCallItem {
  name: string;
  args: Record<string, any>;
}

export const AGENT_TOOLS_DECLARATIONS: any[] = [
  {
    name: 'list_dir',
    description: 'Lists all files and directories in a given folder.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        dirPath: {
          type: SchemaType.STRING,
          description: 'The path of the directory to list (e.g. "." or "src").',
        },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'read_file',
    description: 'Reads the entire text content of a file.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: {
          type: SchemaType.STRING,
          description: 'The path of the file to read (e.g. "src/App.tsx").',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_file',
    description: 'Creates a new file or overwrites an existing file with the given content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: {
          type: SchemaType.STRING,
          description: 'The path of the file to write.',
        },
        content: {
          type: SchemaType.STRING,
          description: 'The complete content of the file.',
        },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edits a specific part of an existing file by replacing target code with replacement code.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: {
          type: SchemaType.STRING,
          description: 'The path of the file to edit.',
        },
        target: {
          type: SchemaType.STRING,
          description: 'The exact string of code to find and replace.',
        },
        replacement: {
          type: SchemaType.STRING,
          description: 'The new replacement code string.',
        },
      },
      required: ['filePath', 'target', 'replacement'],
    },
  },
  {
    name: 'run_terminal_command',
    description: 'Executes a command in the terminal inside the project directory (e.g. "npm install", "git status").',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: {
          type: SchemaType.STRING,
          description: 'The shell command to execute.',
        },
      },
      required: ['command'],
    },
  },
];

export class GeminiProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-3.8-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private getCandidateModels(): string[] {
    return [
      this.modelName,
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean);
  }

  // Direct text streaming / completion
  async generateAutonomousResponse(
    systemPrompt: string,
    history: { role: string; content: string }[],
    onChunk?: (text: string) => void
  ): Promise<string> {
    const candidateModels = this.getCandidateModels();

    for (const modelToTry of candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelToTry,
          systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
          history: history.slice(0, -1).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })),
          generationConfig: {
            temperature: 0.2,
          },
        });

        const lastMsg = history[history.length - 1];
        const resultStream = await chat.sendMessageStream(lastMsg.content);

        let fullText = '';
        for await (const chunk of resultStream.stream) {
          const text = chunk.text();
          fullText += text;
          if (onChunk) onChunk(text);
        }

        return fullText;
      } catch (err: any) {
        if (err.message?.includes('404') && modelToTry !== candidateModels[candidateModels.length - 1]) {
          continue;
        }
        throw err;
      }
    }
    throw new Error('All candidate models failed.');
  }

  // Real-time Streaming Agent Turn
  async runChatTurn(
    systemPrompt: string,
    history: any[],
    newPart: any,
    onChunk?: (text: string) => void
  ): Promise<{ text: string; toolCalls: ToolCallItem[] }> {
    const candidateModels = this.getCandidateModels();

    for (const modelToTry of candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelToTry,
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: AGENT_TOOLS_DECLARATIONS }],
        });

        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: 0.2,
          },
        });

        const streamResult = await chat.sendMessageStream(newPart);

        let fullText = '';
        for await (const chunk of streamResult.stream) {
          try {
            const chunkText = chunk.text();
            if (chunkText) {
              fullText += chunkText;
              onChunk?.(chunkText);
            }
          } catch {}
        }

        const finalResponse = await streamResult.response;
        const candidate = finalResponse.candidates?.[0];

        const toolCalls: ToolCallItem[] = [];
        const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);
        if (functionCalls && functionCalls.length > 0) {
          for (const fc of functionCalls) {
            toolCalls.push({
              name: fc.functionCall.name,
              args: fc.functionCall.args,
            });
          }
        }

        return { text: fullText, toolCalls };
      } catch (err: any) {
        console.error(`[Gemini Error on ${modelToTry}]:`, err.message);
        if (err.message?.includes('404') && modelToTry !== candidateModels[candidateModels.length - 1]) {
          continue;
        }

        // Direct fallback: try simple generateContentStream without tools
        try {
          const fallbackModel = this.genAI.getGenerativeModel({ model: modelToTry });
          const stream = await fallbackModel.generateContentStream(
            typeof newPart === 'string' ? newPart : JSON.stringify(newPart)
          );
          let rawText = '';
          for await (const chunk of stream.stream) {
            const t = chunk.text();
            rawText += t;
            onChunk?.(t);
          }
          return { text: rawText, toolCalls: [] };
        } catch {
          if (modelToTry !== candidateModels[candidateModels.length - 1]) continue;
          throw err;
        }
      }
    }

    throw new Error('All Gemini model candidates failed. Check API key validity.');
  }
}
