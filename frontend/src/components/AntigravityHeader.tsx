import React, { useState, useRef, useEffect } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { 
  Columns, 
  PanelBottom, 
  Settings, 
  Minus, 
  Square, 
  X,
  FilePlus,
  FolderOpen,
  Save,
  Terminal,
  Play,
  HelpCircle,
  Search,
  ExternalLink
} from 'lucide-react';

interface AntigravityHeaderProps {
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AntigravityHeader: React.FC<AntigravityHeaderProps> = ({
  onOpenSettings,
  onOpenCommandPalette,
}) => {
  const { 
    projectName, 
    toggleBottomPanel, 
    saveActiveFile,
    closeTab,
    activeTabId,
    loadWorkspaceFiles,
    setBottomPanelTab
  } = useIdeStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(prev => (prev === menu ? null : menu));
  };

  const handleAction = async (action: string) => {
    setActiveMenu(null);
    switch (action) {
      case 'save':
        await saveActiveFile();
        break;
      case 'close_tab':
        if (activeTabId) closeTab(activeTabId);
        break;
      case 'toggle_term':
        toggleBottomPanel();
        break;
      case 'term_problems':
        setBottomPanelTab('problems');
        break;
      case 'term_output':
        setBottomPanelTab('output');
        break;
      case 'refresh_files':
        loadWorkspaceFiles();
        break;
      case 'command_palette':
        onOpenCommandPalette?.();
        break;
      case 'settings':
        onOpenSettings?.();
        break;
      case 'open_folder':
        if (window.electronAPI?.openDirectoryDialog) {
          const path = await window.electronAPI.openDirectoryDialog();
          if (path) {
            await fetch('/api/workspace/set', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path }),
            });
            loadWorkspaceFiles();
          }
        } else {
          const customPath = prompt(
            'Enter the absolute folder path on your computer to open in Antigravity:',
            'C:\\Users\\dijol\\OneDrive\\Desktop\\Shadity'
          );
          if (customPath && customPath.trim()) {
            try {
              const res = await fetch('/api/workspace/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: customPath.trim() }),
              });
              const data = await res.json();
              if (data.success) {
                const folderName = customPath.trim().replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'Workspace';
                useIdeStore.getState().setProject(folderName, customPath.trim());
                loadWorkspaceFiles();
              } else {
                alert('Folder path not found or inaccessible: ' + (data.error || ''));
              }
            } catch (err: any) {
              alert('Failed to switch workspace: ' + err.message);
            }
          }
        }
        break;
      default:
        break;
    }
  };

  return (
    <header className="h-9 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between px-2 select-none text-[12px] text-[#cccccc] relative z-40">
      {/* Left: Logo + Interactive Menus */}
      <div className="flex items-center gap-1" ref={menuRef}>
        {/* Antigravity Lambda Logo */}
        <div className="flex items-center justify-center w-5 h-5 mr-1 cursor-pointer">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
            <path d="M12 4L4 20H8.5L12 12.5L15.5 20H20L12 4Z" fill="white" />
          </svg>
        </div>

        {/* Menus */}
        {(['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'] as const).map((menu) => (
          <div key={menu} className="relative">
            <button
              onClick={() => handleMenuClick(menu)}
              className={`px-2 py-0.5 rounded text-[12px] transition ${
                activeMenu === menu
                  ? 'bg-[#094771] text-white'
                  : 'hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white'
              }`}
            >
              {menu}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === menu && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl py-1 text-xs text-[#cccccc] z-50">
                {menu === 'File' && (
                  <>
                    <button 
                      onClick={() => handleAction('open_folder')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2"><FolderOpen size={13} /> Open Folder...</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+O</span>
                    </button>
                    <button 
                      onClick={() => handleAction('save')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2"><Save size={13} /> Save</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+S</span>
                    </button>
                    <button 
                      onClick={() => handleAction('close_tab')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span>Close Active Tab</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+W</span>
                    </button>
                    <div className="h-[1px] bg-[#383838] my-1" />
                    <button 
                      onClick={() => handleAction('settings')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span>Preferences: Settings</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+,</span>
                    </button>
                  </>
                )}

                {menu === 'Edit' && (
                  <>
                    <button onClick={() => { document.execCommand('undo'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between">
                      <span>Undo</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+Z</span>
                    </button>
                    <button onClick={() => { document.execCommand('redo'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between">
                      <span>Redo</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+Y</span>
                    </button>
                    <div className="h-[1px] bg-[#383838] my-1" />
                    <button onClick={() => { document.execCommand('cut'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between">
                      <span>Cut</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+X</span>
                    </button>
                    <button onClick={() => { document.execCommand('copy'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between">
                      <span>Copy</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+C</span>
                    </button>
                  </>
                )}

                {menu === 'Selection' && (
                  <button onClick={() => { document.execCommand('selectAll'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between">
                    <span>Select All</span>
                    <span className="text-[10px] text-[#777777]">Ctrl+A</span>
                  </button>
                )}

                {menu === 'View' && (
                  <>
                    <button 
                      onClick={() => handleAction('command_palette')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span>Command Palette...</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+P</span>
                    </button>
                    <button 
                      onClick={() => handleAction('toggle_term')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span>Toggle Terminal</span>
                      <span className="text-[10px] text-[#777777]">Ctrl+`</span>
                    </button>
                    <button 
                      onClick={() => handleAction('term_problems')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white"
                    >
                      <span>Problems Panel</span>
                    </button>
                    <button 
                      onClick={() => handleAction('term_output')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white"
                    >
                      <span>Output Panel</span>
                    </button>
                  </>
                )}

                {menu === 'Terminal' && (
                  <>
                    <button 
                      onClick={() => handleAction('toggle_term')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2"
                    >
                      <Terminal size={13} />
                      <span>New Terminal</span>
                    </button>
                    <button 
                      onClick={() => handleAction('toggle_term')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white"
                    >
                      <span>Split Terminal</span>
                    </button>
                  </>
                )}

                {menu === 'Run' && (
                  <button 
                    onClick={() => handleAction('command_palette')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2"
                  >
                    <Play size={13} />
                    <span>Run Project</span>
                  </button>
                )}

                {menu === 'Help' && (
                  <>
                    <a 
                      href="https://ai.google.dev/"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center justify-between"
                    >
                      <span>Antigravity Docs</span>
                      <ExternalLink size={11} />
                    </a>
                    <button 
                      onClick={() => alert('CodePilot AI IDE - Antigravity Clone v1.0.0\nAutonomous AI-powered coding workspace.')}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white"
                    >
                      <span>About Antigravity IDE</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center: Title */}
      <div 
        onClick={() => onOpenCommandPalette?.()}
        className="text-[12px] text-[#999999] font-medium flex items-center gap-1.5 cursor-pointer hover:text-white transition"
      >
        <span>{projectName}</span>
        <span className="text-[#555555]">-</span>
        <span>Antigravity IDE</span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleBottomPanel}
          className="p-1 rounded hover:bg-[#2a2d2e] text-[#999999] hover:text-white transition"
          title="Toggle Terminal Panel"
        >
          <PanelBottom size={14} />
        </button>

        <button
          onClick={() => onOpenSettings?.()}
          className="p-1 rounded hover:bg-[#2a2d2e] text-[#999999] hover:text-white transition"
          title="Antigravity Settings"
        >
          <Settings size={14} />
        </button>

        <div className="h-3 w-[1px] bg-[#333333] mx-1" />

        <button className="p-1.5 hover:bg-[#2a2d2e] text-[#999999] hover:text-white">
          <Minus size={12} />
        </button>
        <button className="p-1.5 hover:bg-[#2a2d2e] text-[#999999] hover:text-white">
          <Square size={10} />
        </button>
        <button className="p-1.5 hover:bg-[#e81123] text-[#999999] hover:text-white">
          <X size={12} />
        </button>
      </div>
    </header>
  );
};
