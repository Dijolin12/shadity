export interface ToolCallPayload {
  name: string;
  args: Record<string, any>;
}

export interface AgentStreamEvent {
  type: 'agent_thinking' | 'stream_chunk' | 'tool_execution_start' | 'tool_execution_end' | 'task_complete' | 'error';
  payload?: any;
  error?: string;
}

export const api = {
  // Fetch real directory tree from backend
  async listFiles(dirPath: string = '.'): Promise<{ success: boolean; output?: string; error?: string }> {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`);
    return res.json();
  },

  // Read file content
  async readFile(filePath: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    return res.json();
  },

  // Write/save file content
  async writeFile(filePath: string, content: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const res = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    });
    return res.json();
  },

  // Stream autonomous agent execution
  streamAgentPrompt(
    params: {
      prompt: string;
      provider: 'gemini' | 'ollama';
      apiKey?: string;
      modelName?: string;
      endpointUrl?: string;
    },
    onEvent: (event: AgentStreamEvent) => void,
    onError: (err: any) => void
  ) {
    const controller = new AbortController();

    fetch('/api/agent/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.body) throw new Error('ReadableStream not supported.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: AgentStreamEvent = JSON.parse(line.replace('data: ', '').trim());
                onEvent(data);
              } catch {
                // Ignore parse errors on partial JSON chunks
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') onError(err);
      });

    return () => controller.abort();
  },
};

