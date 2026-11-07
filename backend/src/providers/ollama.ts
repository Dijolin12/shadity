export interface OllamaModelItem {
  name: string;
  size: number;
  modified_at: string;
}

export class OllamaProvider {
  private endpointUrl: string;
  private modelName: string;

  constructor(endpointUrl: string = 'http://localhost:11434', modelName: string = 'deepseek-r1:latest') {
    this.endpointUrl = endpointUrl;
    this.modelName = modelName;
  }

  // Detect whether Ollama is running and get list of installed models
  static async listLocalModels(endpointUrl: string = 'http://localhost:11434'): Promise<{ running: boolean; models: string[] }> {
    try {
      const res = await fetch(`${endpointUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return { running: false, models: [] };
      const data = await res.json();
      const models = (data.models || []).map((m: OllamaModelItem) => m.name);
      return { running: true, models };
    } catch {
      return { running: false, models: [] };
    }
  }

  async generateAutonomousResponse(
    systemPrompt: string,
    history: { role: string; content: string }[],
    onChunk?: (text: string) => void
  ): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    const res = await fetch(`${this.endpointUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        stream: true,
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama service error (${res.statusText}). Make sure Ollama is running at ${this.endpointUrl}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';
            fullText += content;
            if (onChunk) onChunk(content);
          } catch {
            // Ignore partial streaming chunks
          }
        }
      }
    }

    return fullText;
  }
}
