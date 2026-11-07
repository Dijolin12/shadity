import React from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { 
  Bot, 
  Sparkles, 
  Play, 
  Settings, 
  FolderGit2, 
  Terminal, 
  Layers, 
  Cpu
} from 'lucide-react';
import { AgentMode } from '../types';

export const Header: React.FC = () => {
  const { 
    projectName, 
    setProject,
    agentMode, 
    setAgentMode, 
    modelConfig, 
    setModelConfig, 
    toggleBottomPanel, 
    isBottomPanelOpen,
    loadWorkspaceFiles,
    setActiveSidebarView
  } = useIdeStore();

  const handleOpenFolder = async () => {
    if (window.electronAPI?.openDirectoryDialog) {
      const selectedPath = await window.electronAPI.openDirectoryDialog();
      if (selectedPath) {
        const folderName = selectedPath.split(/[/\\]/).pop() || selectedPath;
        setProject(folderName, selectedPath);
        loadWorkspaceFiles();
      }
    }
  };

  const modes: { id: AgentMode; label: string; desc: string }[] = [
    { id: 'ask', label: 'Ask', desc: 'Q&A & explanation only' },
    { id: 'edit', label: 'Edit', desc: 'Single-file targeted edits' },
    { id: 'agent', label: 'Agent', desc: 'Autonomous multi-file planning' },
  ];

  return (
    <header className="h-11 bg-ide-sidebar border-b border-ide-border flex items-center justify-between px-3 select-none text-xs text-ide-text">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-white">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-ide-accent to-ide-agent flex items-center justify-center text-white shadow-md">
            <Cpu size={14} />
          </div>
          <span className="tracking-wide">CodePilot</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-ide-agent/20 text-ide-agent font-mono border border-ide-agent/30">
            AGY-CORE
          </span>
        </div>

        <div className="h-4 w-[1px] bg-ide-border mx-1" />

        <button 
          onClick={handleOpenFolder}
          className="flex items-center gap-1.5 text-ide-muted hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-ide-hover transition"
          title="Click to Open Folder"
        >
          <FolderGit2 size={13} />
          <span className="font-mono text-ide-text">{projectName}</span>
        </button>
      </div>

      {/* Center: Agent Mode Selector */}
      <div className="flex items-center bg-ide-bg border border-ide-border rounded-lg p-0.5 shadow-inner">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => setAgentMode(mode.id)}
            title={mode.desc}
            className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
              agentMode === mode.id
                ? 'bg-ide-active text-white shadow-sm border border-ide-border'
                : 'text-ide-muted hover:text-white'
            }`}
          >
            {mode.id === 'agent' && <Sparkles size={12} className="text-ide-agent animate-pulse" />}
            {mode.id === 'edit' && <Layers size={12} className="text-ide-accent" />}
            {mode.id === 'ask' && <Bot size={12} />}
            {mode.label}
          </button>
        ))}
      </div>

      {/* Right: AI Model Selector & Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-ide-bg border border-ide-border px-2 py-1 rounded-md text-ide-muted">
          <span className="text-[10px] uppercase font-mono tracking-wider text-ide-muted">Model:</span>
          <select 
            value={modelConfig.model}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('ollama:')) {
                setModelConfig({ provider: 'ollama', model: val.replace('ollama:', '') });
              } else {
                setModelConfig({ provider: 'gemini', model: val });
              }
            }}
            className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
          >
            <optgroup label="Google Gemini (Cloud)">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest &amp; Latest)</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </optgroup>
            <optgroup label="Ollama (Local / 100% Free Lifetime)">
              <option value="ollama:deepseek-r1:latest">DeepSeek-R1 (Local)</option>
              <option value="ollama:qwen2.5-coder:latest">Qwen 2.5 Coder (Local)</option>
              <option value="ollama:llama3.3:latest">Llama 3.3 (Local)</option>
            </optgroup>
          </select>
        </div>

        <button 
          onClick={toggleBottomPanel}
          className={`p-1.5 rounded hover:bg-ide-hover transition ${
            isBottomPanelOpen ? 'text-ide-accent' : 'text-ide-muted'
          }`}
          title="Toggle Terminal Panel"
        >
          <Terminal size={15} />
        </button>

        <button 
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-ide-success/20 text-ide-success border border-ide-success/30 hover:bg-ide-success/30 font-medium transition"
          title="Run Current Project"
        >
          <Play size={12} fill="currentColor" />
          <span>Run</span>
        </button>

        <button 
          onClick={() => setActiveSidebarView('settings')}
          className="p-1.5 rounded text-ide-muted hover:text-white hover:bg-ide-hover transition"
          title="Settings (Ctrl + ,)"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
