import fs from 'fs/promises';
import path from 'path';

export interface WorkspaceSession {
  lastOpenedProject: string;
  openTabs: { path: string; name: string }[];
  activeTabPath: string | null;
  conversations: {
    id: string;
    role: string;
    content: string;
    timestamp: number;
    toolCalls?: any[];
  }[];
  settings: {
    provider: string;
    model: string;
    temperature: number;
  };
}

const DEFAULT_SESSION: WorkspaceSession = {
  lastOpenedProject: '.',
  openTabs: [],
  activeTabPath: null,
  conversations: [],
  settings: {
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    temperature: 0.2,
  },
};

export class SessionStore {
  private filePath: string;

  constructor(workspaceRoot: string) {
    this.filePath = path.join(workspaceRoot, '.antigravity_session.json');
  }

  async getSession(): Promise<WorkspaceSession> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return { ...DEFAULT_SESSION, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SESSION;
    }
  }

  async saveSession(session: Partial<WorkspaceSession>): Promise<void> {
    try {
      const current = await this.getSession();
      const updated = { ...current, ...session };
      await fs.writeFile(this.filePath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      // Ignore write errors to keep runtime smooth
    }
  }
}

