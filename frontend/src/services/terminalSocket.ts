export class TerminalSocket {
  private socket: WebSocket | null = null;
  private onDataCallback: ((data: string) => void) | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  connect(onData: (data: string) => void) {
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) return;

    this.onDataCallback = onData;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:4000`;

    this.isConnecting = true;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.onDataCallback?.('\r\n\x1b[32m[Connected to CodePilot Terminal Bridge]\x1b[0m\r\n');
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'command_result') {
            const out = parsed.result?.output || parsed.result?.error || '';
            this.onDataCallback?.(out.replace(/\n/g, '\r\n') + '\r\n$ ');
          } else if (parsed.type === 'welcome') {
            this.onDataCallback?.(`${parsed.message}\r\n$ `);
          }
        } catch {
          this.onDataCallback?.(event.data);
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.isConnecting = false;
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
      };
    } catch {
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  sendCommand(command: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'run_command', command }));
    } else {
      // Local fallback simulation
      setTimeout(() => {
        this.onDataCallback?.(`\r\nExecuted (local): ${command}\r\n$ `);
      }, 300);
    }
  }

  disconnect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }
}

export const terminalSocket = new TerminalSocket();
