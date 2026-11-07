export class OllamaProvider {
  private endpointUrl: string;
  private modelName: string;

  constructor(endpointUrl: string = 'http://localhost:11434', modelName: string = 'deepseek-r1:latest') {
    this.endpointUrl = endpointUrl;
    this.modelName = modelName;
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
      throw new Error(`Ollama error: ${res.statusText}`);
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
            // Ignore parse errors on partial stream chunks
          }
        }
      }
    }

    return fullText;
  }
}

