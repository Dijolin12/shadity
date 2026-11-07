import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface GitStatusResult {
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
}

export class GitManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  private async runGit(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`, { cwd: this.workspaceRoot });
      return stdout.trim();
    } catch (err: any) {
      throw new Error(err.stderr || err.message);
    }
  }

  // Get current status
  async getStatus(): Promise<GitStatusResult> {
    try {
      const branch = await this.runGit('rev-parse --abbrev-ref HEAD');
      const statusRaw = await this.runGit('status --porcelain');

      const modified: string[] = [];
      const staged: string[] = [];
      const untracked: string[] = [];

      const lines = statusRaw.split('\n').filter(Boolean);
      for (const line of lines) {
        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim();

        if (x === '?' && y === '?') {
          untracked.push(filePath);
        } else {
          if (x !== ' ' && x !== '?') staged.push(filePath);
          if (y !== ' ' && y !== '?') modified.push(filePath);
        }
      }

      return { branch, modified, staged, untracked };
    } catch {
      return { branch: 'main', modified: [], staged: [], untracked: [] };
    }
  }

  // Get diff for a file or entire workspace
  async getDiff(filePath?: string): Promise<string> {
    try {
      return await this.runGit(`diff ${filePath || ''}`);
    } catch (err: any) {
      return '';
    }
  }

  // Stage file
  async stageFile(filePath: string): Promise<string> {
    return await this.runGit(`add "${filePath}"`);
  }

  // Unstage file
  async unstageFile(filePath: string): Promise<string> {
    return await this.runGit(`reset HEAD "${filePath}"`);
  }

  // Commit changes
  async commit(message: string): Promise<string> {
    return await this.runGit(`commit -m "${message.replace(/"/g, '\\"')}"`);
  }
}

