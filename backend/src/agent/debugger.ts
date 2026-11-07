import { AgentTools } from './tools';
import { GeminiProvider } from '../providers/gemini';
import { OllamaProvider } from '../providers/ollama';

export interface DebugAnalysisResult {
  errorSummary: string;
  identifiedFile?: string;
  lineNumber?: number;
  rootCause: string;
  proposedFix: {
    filePath: string;
    targetCode: string;
    replacementCode: string;
    explanation: string;
  };
}

export class DebuggerEngine {
  private tools: AgentTools;

  constructor(workspaceRoot: string) {
    this.tools = new AgentTools(workspaceRoot);
  }

  // Extract file path and line number from terminal stack traces
  private extractErrorInfo(rawError: string): { filePath?: string; line?: number } {
    // Matches patterns like: at src/App.tsx:24:10 or (./src/server.ts:15:3) or File "app.py", line 42
    const tsMatch = rawError.match(/(?:[a-zA-Z0-9_\-./\\]+\.(?:tsx|ts|jsx|js|py|rs|go|json)):(\d+)/);
    if (tsMatch) {
      const parts = tsMatch[0].split(':');
      return { filePath: parts[0], line: parseInt(parts[1], 10) };
    }
    return {};
  }

  async analyzeAndFixError(
    rawError: string,
    provider: 'gemini' | 'ollama' = 'gemini',
    apiKey?: string,
    modelName?: string,
    endpointUrl?: string
  ): Promise<DebugAnalysisResult> {
    const { filePath, line } = this.extractErrorInfo(rawError);

    let fileContent = '';
    if (filePath) {
      const readRes = await this.tools.readFile(filePath);
      if (readRes.success) {
        fileContent = readRes.output || '';
      }
    }

    let aiProvider: { generateAutonomousResponse: (s: string, h: any[]) => Promise<string> };
    if (provider === 'gemini') {
      aiProvider = new GeminiProvider(apiKey || process.env.GEMINI_API_KEY || '', modelName || 'gemini-1.5-pro');
    } else {
      aiProvider = new OllamaProvider(endpointUrl || 'http://localhost:11434', modelName || 'deepseek-r1:latest');
    }

    const debugPrompt = `You are the CodePilot AI Debugger Engine.
An error occurred during build or runtime:
ERROR LOG:
${rawError}

${filePath && fileContent ? `RELEVANT FILE CONTENT (${filePath}):\n${fileContent.slice(0, 5000)}` : ''}

Analyze this error and respond ONLY with a JSON object in this format (no markdown fences, just pure JSON):
{
  "errorSummary": "Short 1-sentence summary of the error",
  "identifiedFile": "${filePath || ''}",
  "lineNumber": ${line || 0},
  "rootCause": "Detailed explanation of why this error happens",
  "proposedFix": {
    "filePath": "${filePath || ''}",
    "targetCode": "Exact string in the file to replace",
    "replacementCode": "Fixed string to replace it with",
    "explanation": "Why this fixes the problem"
  }
}`;

    const rawResponse = await aiProvider.generateAutonomousResponse(
      'You are an expert compiler and runtime error debugging engine. Output JSON only.',
      [{ role: 'user', content: debugPrompt }]
    );

    try {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        errorSummary: 'Error detected in build/runtime logs.',
        identifiedFile: filePath,
        lineNumber: line,
        rootCause: rawResponse,
        proposedFix: {
          filePath: filePath || '',
          targetCode: '',
          replacementCode: '',
          explanation: 'Review the root cause analysis above.'
        }
      };
    }
  }
}

