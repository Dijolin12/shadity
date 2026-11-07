import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class AgentTools {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  // Safe path resolve to prevent path traversal
  private resolveSafe(filePath: string): string {
    const resolved = path.resolve(this.workspaceRoot, filePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(`Access denied: Path "${filePath}" escapes workspace sandbox.`);
    }
    return resolved;
  }

  // 1. list_dir
  async listDir(dirPath: string = '.'): Promise<ToolResult> {
    try {
      const fullPath = this.resolveSafe(dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const formatted = entries
        .map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
        .join('\n');
      return { 
        success: true, 
        output: formatted || '(empty directory)',
        metadata: { count: entries.length }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 2. read_file
  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const fullPath = this.resolveSafe(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { 
        success: true, 
        output: content,
        metadata: { lines: content.split('\n').length }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 3. write_file
  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      const fullPath = this.resolveSafe(filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      const lines = content.split('\n').length;
      return { 
        success: true, 
        output: `Successfully created/updated ${filePath} (${lines} lines written).`,
        metadata: { filePath, lines }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 4. edit_file (search and replace exact block)
  async editFile(filePath: string, target: string, replacement: string): Promise<ToolResult> {
    try {
      const fullPath = this.resolveSafe(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      if (!content.includes(target)) {
        return { 
          success: false, 
          error: `Target code block not found in ${filePath}. Check exact indentation and whitespace.` 
        };
      }
      const updated = content.replace(target, replacement);
      await fs.writeFile(fullPath, updated, 'utf-8');
      return { 
        success: true, 
        output: `Successfully replaced target code block in ${filePath}.`,
        metadata: { filePath }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 5. run_terminal_command
  async runTerminalCommand(command: string): Promise<ToolResult> {
    try {
      // Disallow dangerous host operations outside project
      const dangerousPatterns = [/format\s+[a-z]:/i, /rmdir\s+\/s\s+\/q\s+c:\\/i];
      for (const pat of dangerousPatterns) {
        if (pat.test(command)) {
          return { success: false, error: 'Command blocked by security sandbox.' };
        }
      }

      const { stdout, stderr } = await execAsync(command, { 
        cwd: this.workspaceRoot,
        timeout: 30000 // 30s timeout
      });

      return { 
        success: true, 
        output: stdout ? stdout : (stderr ? `Warnings/Stderr:\n${stderr}` : 'Command executed successfully (no output).') 
      };
    } catch (err: any) {
      return { 
        success: false, 
        error: `Command failed (Exit code ${err.code || 1}): ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}` 
      };
    }
  }
}
