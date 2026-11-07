import fs from 'fs/promises';
import path from 'path';

export interface FileMetadata {
  path: string;
  extension: string;
  exports: string[];
  imports: string[];
  summary: string;
}

export interface ProjectIndex {
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  files: Record<string, FileMetadata>;
  lastIndexed: number;
}

export class ProjectIndexer {
  private workspaceRoot: string;
  private ignoreFolders = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'build', '.vscode', '.idea']);

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  // Detect frameworks and dependencies from package.json
  async detectEnvironment(): Promise<{ frameworks: string[]; dependencies: Record<string, string> }> {
    const pkgPath = path.join(this.workspaceRoot, 'package.json');
    const frameworks: string[] = [];
    let dependencies: Record<string, string> = {};

    try {
      const data = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(data);
      dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (dependencies['react']) frameworks.push('React');
      if (dependencies['vue']) frameworks.push('Vue');
      if (dependencies['express']) frameworks.push('Express');
      if (dependencies['fastapi'] || dependencies['flask']) frameworks.push('Python Backend');
      if (dependencies['tailwindcss']) frameworks.push('TailwindCSS');
      if (dependencies['vite']) frameworks.push('Vite');
      if (dependencies['mongoose']) frameworks.push('MongoDB / Mongoose');
      if (dependencies['prisma']) frameworks.push('Prisma ORM');
    } catch {
      // No package.json or non-Node environment
    }

    return { frameworks, dependencies };
  }

  // Fast regex-based signature extraction
  private parseFileSignatures(content: string, filePath: string): { exports: string[]; imports: string[] } {
    const exports: string[] = [];
    const imports: string[] = [];

    // Extract JS/TS exports
    const exportMatches = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+([a-zA-Z0-9_$]+)/g);
    for (const match of exportMatches) {
      if (match[1]) exports.push(match[1]);
    }

    // Extract JS/TS imports
    const importMatches = content.matchAll(/import\s+(?:{[^}]+}|[a-zA-Z0-9_$]+|\*\s+as\s+[a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      if (match[1]) imports.push(match[1]);
    }

    // Python function/class extraction
    if (filePath.endsWith('.py')) {
      const pyMatches = content.matchAll(/(?:def|class)\s+([a-zA-Z0-9_$]+)/g);
      for (const match of pyMatches) {
        if (match[1]) exports.push(match[1]);
      }
    }

    return { exports, imports };
  }

  // Recursively index files in workspace
  async buildIndex(): Promise<ProjectIndex> {
    const { frameworks, dependencies } = await this.detectEnvironment();
    const files: Record<string, FileMetadata> = {};
    const languages = new Set<string>();

    const scanDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (this.ignoreFolders.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.workspaceRoot, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.html', '.css', '.json', '.md'].includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const { exports, imports } = this.parseFileSignatures(content, entry.name);

              if (['.ts', '.tsx'].includes(ext)) languages.add('TypeScript');
              if (['.js', '.jsx'].includes(ext)) languages.add('JavaScript');
              if (ext === '.py') languages.add('Python');
              if (ext === '.rs') languages.add('Rust');
              if (ext === '.go') languages.add('Go');

              files[relativePath] = {
                path: relativePath,
                extension: ext,
                exports,
                imports,
                summary: `Exports: ${exports.slice(0, 5).join(', ') || 'none'}`,
              };
            } catch {
              // Ignore unreadable files
            }
          }
        }
      }
    };

    try {
      await scanDirectory(this.workspaceRoot);
    } catch {
      // Ignore root traversal errors
    }

    return {
      frameworks,
      languages: Array.from(languages),
      dependencies,
      files,
      lastIndexed: Date.now(),
    };
  }

  // Retrieve relevant files based on user query keywords
  findRelevantContext(query: string, index: ProjectIndex): string[] {
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scoredFiles: { path: string; score: number }[] = [];

    for (const [filePath, meta] of Object.entries(index.files)) {
      let score = 0;
      const lowerPath = filePath.toLowerCase();

      for (const token of tokens) {
        if (lowerPath.includes(token)) score += 3;
        for (const exp of meta.exports) {
          if (exp.toLowerCase().includes(token)) score += 5;
        }
      }

      if (score > 0) {
        scoredFiles.push({ path: filePath, score });
      }
    }

    scoredFiles.sort((a, b) => b.score - a.score);
    return scoredFiles.slice(0, 6).map(sf => sf.path);
  }
}

