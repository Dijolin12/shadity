export type AgentMode = 'ask' | 'edit' | 'agent';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileItem[];
  content?: string;
  language?: string;
  isModified?: boolean;
}

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  originalContent?: string;
  isModified?: boolean;
  diffMode?: boolean;
}

export interface ToolCallRecord {
  id: string;
  toolName: 'read_file' | 'write_file' | 'edit_file' | 'run_terminal_command' | 'list_dir';
  args: Record<string, any>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'requires_approval';
  error?: string;
  timestamp: number;
}

export interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolCalls?: ToolCallRecord[];
}

export interface ArtifactFile {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content: string;
  originalContent?: string;
}

export interface GeneratedArtifact {
  id: string;
  title: string;
  description: string;
  files: ArtifactFile[];
  commands?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  plan?: PlanStep[];
  toolCalls?: ToolCallRecord[];
  artifact?: GeneratedArtifact;
  isStreaming?: boolean;
}

export type AIProvider = 'gemini' | 'ollama' | 'openai' | 'claude';

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  endpointUrl?: string; // e.g. http://localhost:11434 for Ollama
  temperature: number;
  maxTokens: number;
}
