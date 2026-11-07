import { create } from 'zustand';
import { FileItem, OpenTab, ChatMessage, AgentMode, ModelConfig, ToolCallRecord, PlanStep } from '../types';
import { api } from '../services/api';

interface IdeState {
  // Project / Workspace
  projectPath: string;
  projectName: string;
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  setProject: (name: string, path: string) => void;
  loadWorkspaceFiles: () => Promise<void>;

  // Editor Tabs
  openTabs: OpenTab[];
  activeTabId: string | null;
  openFile: (file: { path: string; name: string; content?: string }) => Promise<void>;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  saveActiveFile: () => Promise<void>;

  // Active Tool / Sidebar View
  activeSidebarView: 'files' | 'search' | 'git' | 'settings' | 'history';
  setActiveSidebarView: (view: 'files' | 'search' | 'git' | 'settings' | 'history') => void;

  // Bottom Panel
  bottomPanelTab: 'terminal' | 'problems' | 'output' | 'agent-logs';
  isBottomPanelOpen: boolean;
  setBottomPanelTab: (tab: 'terminal' | 'problems' | 'output' | 'agent-logs') => void;
  toggleBottomPanel: () => void;

  // AI & Agent
  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;
  modelConfig: ModelConfig;
  setModelConfig: (config: Partial<ModelConfig>) => void;
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (updater: (msg: ChatMessage) => ChatMessage) => void;
  isAgentRunning: boolean;
  setIsAgentRunning: (running: boolean) => void;
  activePlan: PlanStep[];
  setActivePlan: (plan: PlanStep[]) => void;
  pendingApprovals: ToolCallRecord[];
  addPendingApproval: (tool: ToolCallRecord) => void;
  resolveApproval: (id: string, approved: boolean) => void;

  // Terminal logs
  terminalLogs: string[];
  addTerminalLog: (log: string) => void;
}

const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('codepilot_api_key') || '' : '';
const savedOllamaEndpoint = typeof window !== 'undefined' ? localStorage.getItem('codepilot_ollama_endpoint') || 'http://localhost:11434' : 'http://localhost:11434';

export const useIdeStore = create<IdeState>((set, get) => ({
  projectPath: '.',
  projectName: 'workspace',
  files: [],
  setFiles: (files) => set({ files }),
  setProject: (name, path) => set({ projectName: name, projectPath: path }),

  loadWorkspaceFiles: async () => {
    try {
      const res = await api.listFiles('.');
      if (res.success && res.output) {
        const lines = res.output.split('\n').filter(Boolean);
        const parsedFiles: FileItem[] = lines.map((line, idx) => {
          const isDir = line.startsWith('[DIR]');
          const rawName = line.replace(/\[(DIR|FILE)\]\s*/, '').trim();
          return {
            id: `item-${idx}-${rawName}`,
            name: rawName,
            path: `./${rawName}`,
            type: isDir ? 'folder' : 'file',
            children: isDir ? [] : undefined,
          };
        });
        set({ files: parsedFiles });
      }
    } catch {
      // Keep existing files if backend isn't connected yet
    }
  },

  openTabs: [],
  activeTabId: null,

  openFile: async (file) => {
    const { openTabs } = get();
    const existing = openTabs.find(t => t.path === file.path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    let fileContent = file.content;
    if (fileContent === undefined) {
      try {
        const res = await api.readFile(file.path);
        fileContent = res.success ? (res.output || '') : '// Empty file or unable to read';
      } catch {
        fileContent = '// Error reading file from workspace';
      }
    }

    const ext = file.name.split('.').pop() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
    };

    const newTab: OpenTab = {
      id: `tab-${Date.now()}-${Math.random()}`,
      name: file.name,
      path: file.path,
      language: langMap[ext] || 'plaintext',
      content: fileContent,
      isModified: false,
    };

    set({ openTabs: [...openTabs, newTab], activeTabId: newTab.id });
  },

  closeTab: (id) => {
    const { openTabs, activeTabId } = get();
    const nextTabs = openTabs.filter(t => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null;
    }
    set({ openTabs: nextTabs, activeTabId: nextActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) => {
    set(state => ({
      openTabs: state.openTabs.map(t => 
        t.id === id ? { ...t, content, isModified: true } : t
      )
    }));
  },

  saveActiveFile: async () => {
    const { openTabs, activeTabId, addTerminalLog } = get();
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    try {
      const res = await api.writeFile(activeTab.path, activeTab.content);
      if (res.success) {
        set(state => ({
          openTabs: state.openTabs.map(t => 
            t.id === activeTabId ? { ...t, isModified: false } : t
          )
        }));
        addTerminalLog(`Saved ${activeTab.name}`);
      }
    } catch (err: any) {
      addTerminalLog(`Failed to save ${activeTab.name}: ${err.message}`);
    }
  },

  activeSidebarView: 'files',
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),

  bottomPanelTab: 'terminal',
  isBottomPanelOpen: true,
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, isBottomPanelOpen: true }),
  toggleBottomPanel: () => set(state => ({ isBottomPanelOpen: !state.isBottomPanelOpen })),

  agentMode: 'agent',
  setAgentMode: (mode) => set({ agentMode: mode }),

  modelConfig: {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    apiKey: savedApiKey,
    endpointUrl: savedOllamaEndpoint,
    temperature: 0.2,
    maxTokens: 8192,
  },
  setModelConfig: (config) => set(state => ({
    modelConfig: { ...state.modelConfig, ...config }
  })),

  messages: [
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: 'Hello! I am **CodePilot Agent**, your autonomous coding partner inspired by Antigravity.\n\nI have tool access to inspect directories, read and write files, run terminal commands, and fix bugs autonomously.\n\nType your task below to get started!',
      timestamp: Date.now(),
    }
  ],
  addMessage: (msg) => set(state => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (updater) => set(state => {
    if (state.messages.length === 0) return state;
    const msgs = [...state.messages];
    msgs[msgs.length - 1] = updater(msgs[msgs.length - 1]);
    return { messages: msgs };
  }),

  isAgentRunning: false,
  setIsAgentRunning: (running) => set({ isAgentRunning: running }),

  activePlan: [],
  setActivePlan: (plan) => set({ activePlan: plan }),

  pendingApprovals: [],
  addPendingApproval: (tool) => set(state => ({ 
    pendingApprovals: [...state.pendingApprovals, tool] 
  })),
  resolveApproval: (id, approved) => set(state => ({
    pendingApprovals: state.pendingApprovals.filter(t => t.id !== id)
  })),

  terminalLogs: [
    'CodePilot IDE Environment v1.0.0 initialized.',
    'Ready for terminal execution and autonomous tool invocation.'
  ],
  addTerminalLog: (log) => set(state => ({ terminalLogs: [...state.terminalLogs, log] }))
}));
