import React, { useState, useEffect } from 'react';
import { AntigravityHeader } from './components/AntigravityHeader';
import { Sidebar } from './components/Sidebar';
import { FileTree } from './components/FileTree';
import { SearchPanel } from './components/SearchPanel';
import { EditorArea } from './components/EditorArea';
import { AgentPanel } from './components/AgentPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { GitPanel } from './components/GitPanel';
import { DebugModal } from './components/DebugModal';
import { ProjectWizardModal } from './components/ProjectWizardModal';
import { ReviewModal } from './components/ReviewModal';
import { useIdeStore } from './stores/useIdeStore';

export const App: React.FC = () => {
  const { activeSidebarView, setActiveSidebarView, restoreSession } = useIdeStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isProjectWizardOpen, setIsProjectWizardOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    // Restore tabs and workspace state on load
    restoreSession();

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
  }, [restoreSession]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none font-sans">
      {/* Top Application Title & Menu Bar */}
      <AntigravityHeader 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Activity Bar */}
        <Sidebar />

        {/* File Explorer */}
        {activeSidebarView === 'files' && (
          <FileTree onOpenProjectWizard={() => setIsProjectWizardOpen(true)} />
        )}

        {/* Real Codebase Search Panel */}
        {activeSidebarView === 'search' && <SearchPanel />}

        {/* Git Source Control Panel */}
        {activeSidebarView === 'git' && <GitPanel />}

        {/* Center Canvas: Monaco Code Editor + Bottom Antigravity Terminal */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <EditorArea />
          <TerminalPanel onOpenDebugger={() => setIsDebugModalOpen(true)} />
        </div>

        {/* Right Pane: Antigravity Agent Panel */}
        <AgentPanel onOpenReview={() => setIsReviewOpen(true)} />
      </div>

      {/* Interactive Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
      />

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
    </div>
  );
};
