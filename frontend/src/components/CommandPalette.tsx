import React, { useState, useEffect } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { Search, FileCode, Terminal, Settings, Play, Save, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const { files, openFile, toggleBottomPanel, saveActiveFile } = useIdeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // Handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickCommands = [
    { id: 'save', title: 'File: Save Current File', icon: Save, action: () => saveActiveFile() },
    { id: 'term', title: 'Terminal: Toggle Bottom Panel', icon: Terminal, action: () => toggleBottomPanel() },
    { id: 'settings', title: 'Preferences: Open Settings', icon: Settings, action: () => onOpenSettings() },
  ];

  const filteredCommands = quickCommands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[600px] bg-ide-panel border border-ide-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-ide-border bg-ide-sidebar">
          <Search size={15} className="text-ide-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a file name or command to execute..."
            className="flex-1 bg-transparent text-xs text-white placeholder-ide-muted focus:outline-none font-mono"
            autoFocus
          />
          <button 
            onClick={onClose}
            className="p-1 text-ide-muted hover:text-white rounded hover:bg-ide-hover transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 text-xs">
          {/* Commands */}
          {filteredCommands.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase font-mono text-ide-muted tracking-wider">
                Commands
              </div>
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-ide-active cursor-pointer text-ide-text hover:text-white transition"
                  >
                    <Icon size={14} className="text-ide-accent" />
                    <span>{cmd.title}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <div className="mt-1">
              <div className="px-2 py-1 text-[10px] uppercase font-mono text-ide-muted tracking-wider">
                Files
              </div>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.type === 'file') {
                      openFile({ path: file.path, name: file.name, content: file.content });
                    }
                    onClose();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-ide-active cursor-pointer text-ide-text hover:text-white transition"
                >
                  <FileCode size={14} className="text-blue-400" />
                  <span className="font-mono text-xs">{file.name}</span>
                  <span className="text-[10px] text-ide-muted ml-auto font-mono">{file.path}</span>
                </div>
              ))}
            </div>
          )}

          {filteredCommands.length === 0 && filteredFiles.length === 0 && (
            <div className="p-4 text-center text-xs text-ide-muted">
              No matching files or commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

