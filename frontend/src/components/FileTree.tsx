import React, { useState, useEffect } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { FileItem } from '../types';
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
  const { openFile, openTabs, activeTabId } = useIdeStore();

  const isFolder = item.type === 'folder';
  const isActive = openTabs.find(t => t.id === activeTabId)?.path === item.path;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      openFile({ path: item.path, name: item.name });
    }
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.jsx')) {
      return <FileCode size={14} className="text-blue-400" />;
    }
    if (name.endsWith('.json')) {
      return <FileText size={14} className="text-yellow-400" />;
    }
    if (name.endsWith('.md')) {
      return <FileText size={14} className="text-gray-400" />;
    }
    return <FileText size={14} className="text-ide-muted" />;
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`flex items-center gap-1.5 py-1 pr-2 text-xs cursor-pointer select-none rounded hover:bg-ide-hover transition ${
          isActive ? 'bg-ide-active text-white font-medium' : 'text-ide-text'
        }`}
      >
        {isFolder ? (
          <>
            <span className="text-ide-muted">
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            {isOpen ? (
              <FolderOpen size={14} className="text-amber-400" />
            ) : (
              <Folder size={14} className="text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(item.name)}
          </>
        )}
        <span className="truncate">{item.name}</span>
      </div>

      {isFolder && isOpen && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  onOpenProjectWizard?: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ onOpenProjectWizard }) => {
  const { files, projectName, loadWorkspaceFiles } = useIdeStore();

  useEffect(() => {
    loadWorkspaceFiles();
  }, [loadWorkspaceFiles]);

  return (
    <div className="w-60 bg-ide-panel border-r border-ide-border flex flex-col h-full shrink-0 select-none">
      {/* Header toolbar */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-ide-border text-ide-muted text-[11px] font-semibold tracking-wider uppercase">
        <span className="truncate">{projectName}</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={onOpenProjectWizard}
            className="p-1 text-ide-agent hover:text-white rounded hover:bg-ide-hover transition" 
            title="Generate Complete App with AI"
          >
            <Sparkles size={13} />
          </button>
          <button className="p-1 hover:text-white rounded hover:bg-ide-hover transition" title="New File">
            <FilePlus size={13} />
          </button>
          <button className="p-1 hover:text-white rounded hover:bg-ide-hover transition" title="New Folder">
            <FolderPlus size={13} />
          </button>
          <button 
            onClick={() => loadWorkspaceFiles()} 
            className="p-1 hover:text-white rounded hover:bg-ide-hover transition" 
            title="Refresh Files"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* File Tree hierarchy */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length > 0 ? (
          files.map(item => (
            <FileTreeItem key={item.id} item={item} level={0} />
          ))
        ) : (
          <div className="p-4 text-center text-xs text-ide-muted space-y-2">
            <p>No files loaded.</p>
            <button 
              onClick={onOpenProjectWizard}
              className="px-2 py-1 bg-ide-agent/20 text-ide-agent border border-ide-agent/30 rounded text-[11px] hover:bg-ide-agent/30 transition flex items-center gap-1 mx-auto"
            >
              <Sparkles size={11} /> Generate App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
