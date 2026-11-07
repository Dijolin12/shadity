import React, { useState, useEffect } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { FileItem } from '../types';
import { api } from '../services/api';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  FilePlus, 
  FolderPlus,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FileTreeItemProps {
  item: FileItem;
  level: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ item, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileItem[]>(item.children || []);
  const [loading, setLoading] = useState(false);
  const { openFile, openTabs, activeTabId } = useIdeStore();

  const isFolder = item.type === 'folder';
  const isActive = openTabs.find(t => t.id === activeTabId)?.path === item.path;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      if (!isOpen && children.length === 0) {
        setLoading(true);
        try {
          // Normalize relative folder path
          const cleanPath = item.path.replace(/^\.\//, '');
          const res = await api.listFiles(cleanPath);
          if (res.success && res.output) {
            const lines = res.output.split('\n').filter(Boolean);
            const subItems: FileItem[] = lines.map((line, idx) => {
              const isDir = line.startsWith('[DIR]');
              const rawName = line.replace(/\[(DIR|FILE)\]\s*/, '').trim();
              return {
                id: `${item.id}-${idx}-${rawName}`,
                name: rawName,
                path: `${cleanPath}/${rawName}`,
                type: isDir ? 'folder' : 'file',
                children: isDir ? [] : undefined,
              };
            });
            setChildren(subItems);
          }
        } finally {
          setLoading(false);
        }
      }
      setIsOpen(prev => !prev);
    } else {
      openFile({ path: item.path, name: item.name });
    }
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.jsx')) {
      return <FileCode size={14} className="text-[#3794ff]" />;
    }
    if (name.endsWith('.json')) {
      return <FileText size={14} className="text-[#cbcb41]" />;
    }
    if (name.endsWith('.md')) {
      return <FileText size={14} className="text-[#519aba]" />;
    }
    if (name.startsWith('.git') || name.startsWith('.env')) {
      return <FileText size={14} className="text-[#858585]" />;
    }
    return <FileText size={14} className="text-[#858585]" />;
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        style={{ paddingLeft: `${level * 14 + 10}px` }}
        className={`flex items-center gap-1.5 py-1 pr-2 text-xs cursor-pointer select-none transition ${
          isActive 
            ? 'bg-[#37373d] text-white font-medium' 
            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
        }`}
      >
        {isFolder ? (
          <>
            <span className="text-[#858585] shrink-0">
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            {isOpen ? (
              <FolderOpen size={14} className="text-[#dcb67a] shrink-0" />
            ) : (
              <Folder size={14} className="text-[#dcb67a] shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {getFileIcon(item.name)}
          </>
        )}
        <span className="truncate">{item.name}</span>
        {loading && <span className="text-[10px] text-[#858585] ml-auto animate-pulse">loading...</span>}
      </div>

      {isFolder && isOpen && (
        <div>
          {children.length > 0 ? (
            children.map(child => (
              <FileTreeItem key={child.id} item={child} level={level + 1} />
            ))
          ) : (
            !loading && (
              <div 
                style={{ paddingLeft: `${(level + 1) * 14 + 10}px` }}
                className="py-1 text-[11px] text-[#666666] italic"
              >
                (empty folder)
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  onOpenProjectWizard?: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ onOpenProjectWizard }) => {
  const { files, projectName, loadWorkspaceFiles, openFile } = useIdeStore();
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    loadWorkspaceFiles();
  }, [loadWorkspaceFiles]);

  const handleCreate = async () => {
    if (!newItemName.trim() || !creatingType) return;
    const path = `./${newItemName.trim()}`;
    if (creatingType === 'file') {
      await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: '' }),
      });
      openFile({ path, name: newItemName.trim(), content: '' });
    } else if (creatingType === 'folder') {
      await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `mkdir "${newItemName.trim()}"` }),
      }).catch(() => {});
    }
    setNewItemName('');
    setCreatingType(null);
    loadWorkspaceFiles();
  };

  return (
    <div className="w-60 bg-[#181818] border-r border-[#252526] flex flex-col h-full shrink-0 select-none">
      {/* Header toolbar */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[#252526] text-[#858585] text-[11px] font-semibold tracking-wider uppercase">
        <span className="truncate text-white">{projectName}</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={onOpenProjectWizard}
            className="p-1 text-[#007acc] hover:text-white rounded hover:bg-[#2a2d2e] transition" 
            title="Generate Complete App with AI"
          >
            <Sparkles size={13} />
          </button>
          <button 
            onClick={() => setCreatingType('file')}
            className="p-1 hover:text-white rounded hover:bg-[#2a2d2e] transition" 
            title="New File"
          >
            <FilePlus size={13} />
          </button>
          <button 
            onClick={() => setCreatingType('folder')}
            className="p-1 hover:text-white rounded hover:bg-[#2a2d2e] transition" 
            title="New Folder"
          >
            <FolderPlus size={13} />
          </button>
          <button 
            onClick={() => loadWorkspaceFiles()} 
            className="p-1 hover:text-white rounded hover:bg-[#2a2d2e] transition" 
            title="Refresh Files"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Inline Create Input */}
      {creatingType && (
        <div className="p-2 border-b border-[#252526] bg-[#252526]">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreatingType(null);
            }}
            placeholder={`Enter ${creatingType} name...`}
            autoFocus
            className="w-full bg-[#1e1e1e] border border-[#007acc] rounded px-2 py-0.5 text-xs text-white focus:outline-none font-mono"
          />
        </div>
      )}

      {/* File Tree hierarchy */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length > 0 ? (
          files.map(item => (
            <FileTreeItem key={item.id} item={item} level={0} />
          ))
        ) : (
          <div className="p-4 text-center text-xs text-[#858585] space-y-2">
            <p>No files loaded.</p>
            <button 
              onClick={() => loadWorkspaceFiles()}
              className="text-[#007acc] hover:underline text-[11px]"
            >
              Refresh workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
