import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileTree } from './components/FileTree';
import { EditorArea } from './components/EditorArea';
import { AgentPanel } from './components/AgentPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { GitPanel } from './components/GitPanel';
import { DebugModal } from './components/DebugModal';
import { ProjectWizardModal } from './components/ProjectWizardModal';
import { useIdeStore } from './stores/useIdeStore';

export const App: React.FC = () => {
  const { activeSidebarView, setActiveSidebarView } = useIdeStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isProjectWizardOpen, setIsProjectWizardOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P: Command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
      // Ctrl+Shift+N: New AI Project
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsProjectWizardOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-ide-bg text-ide-text overflow-hidden select-none">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen || activeSidebarView === 'settings'} 
        onClose={() => {
          setIsSettingsOpen(false);
          if (activeSidebarView === 'settings') setActiveSidebarView('files');
        }} 
      />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* AI Debugger Modal */}
      <DebugModal
        isOpen={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
      />

      {/* Autonomous Project Wizard Modal */}
      <ProjectWizardModal
        isOpen={isProjectWizardOpen}
        onClose={() => setIsProjectWizardOpen(false)}
      />

      {/* Top Header */}
      <Header />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Far-left Activity Bar */}
        <Sidebar />

        {/* File Explorer */}
        {activeSidebarView === 'files' && (
          <FileTree onOpenProjectWizard={() => setIsProjectWizardOpen(true)} />
        )}

        {/* Git Source Control Panel */}
        {activeSidebarView === 'git' && <GitPanel />}

        {/* Search Left Pane */}
        {activeSidebarView === 'search' && (
          <div className="w-60 bg-ide-panel border-r border-ide-border p-3 text-xs text-ide-muted">
            <span className="font-semibold text-white">Search</span>
            <input 
              type="text" 
              placeholder="Search across files..." 
              className="w-full mt-2 bg-ide-bg border border-ide-border rounded px-2 py-1 text-white text-xs focus:outline-none" 
            />
          </div>
        )}

        {/* Center Canvas: Monaco Code Editor + Bottom Terminal */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <EditorArea />
          <TerminalPanel onOpenDebugger={() => setIsDebugModalOpen(true)} />
        </div>

        {/* Right Pane: Autonomous Antigravity Agent Panel */}
        <AgentPanel />
      </div>
    </div>
  );
};
