import React, { useState } from 'react';
import { 
  FileCode, 
  Check, 
  ExternalLink, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Eye, 
  Play
} from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

export interface GeneratedArtifact {
  id: string;
  title: string;
  description: string;
  files: {
    path: string;
    action: 'create' | 'modify' | 'delete';
    content: string;
    originalContent?: string;
  }[];
  commands?: string[];
}

interface ArtifactViewProps {
  artifact: GeneratedArtifact;
  onApply: () => void;
  onClose?: () => void;
}

export const ArtifactView: React.FC<ArtifactViewProps> = ({ artifact, onApply, onClose }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const { openFile } = useIdeStore();

  const activeFile = artifact.files[selectedFileIdx];

  const handleCopy = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleOpenFileInEditor = () => {
    if (activeFile) {
      const fileName = activeFile.path.split(/[/\\]/).pop() || activeFile.path;
      openFile({
        path: activeFile.path,
        name: fileName,
        content: activeFile.content,
      });
    }
  };

  return (
    <div className="bg-ide-panel border border-ide-border rounded-xl shadow-xl overflow-hidden my-3 text-xs text-ide-text">
      {/* Header */}
      <div className="h-10 px-3 bg-ide-sidebar border-b border-ide-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-ide-agent/20 text-ide-agent flex items-center justify-center font-bold text-[10px]">
            <Layers size={12} />
          </div>
          <span className="font-semibold text-white truncate max-w-[200px]">{artifact.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ide-bg text-ide-muted border border-ide-border font-mono">
            {artifact.files.length} file{artifact.files.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-ide-success text-white font-medium hover:bg-ide-success/90 transition text-[11px] shadow-sm"
          >
            <Check size={12} />
            <span>Apply to Project</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {artifact.description && (
        <div className="px-3 py-2 bg-ide-bg/60 border-b border-ide-border text-[11px] text-ide-muted leading-relaxed">
          {artifact.description}
        </div>
      )}

      {/* File Selector Tabs */}
      <div className="flex border-b border-ide-border bg-ide-bg overflow-x-auto no-scrollbar">
        {artifact.files.map((file, idx) => {
          const isSelected = selectedFileIdx === idx;
          const fileName = file.path.split(/[/\\]/).pop() || file.path;
          return (
            <button
              key={file.path}
              onClick={() => setSelectedFileIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-ide-border font-mono text-[11px] whitespace-nowrap transition ${
                isSelected 
                  ? 'bg-ide-panel text-white font-medium border-t-2 border-t-ide-accent' 
                  : 'text-ide-muted hover:text-white hover:bg-ide-panel/50'
              }`}
            >
              <FileCode size={12} className={file.action === 'create' ? 'text-ide-success' : 'text-amber-400'} />
              <span>{fileName}</span>
              <span className={`text-[9px] px-1 rounded uppercase font-sans ${
                file.action === 'create' ? 'bg-ide-success/20 text-ide-success' : 'bg-amber-400/20 text-amber-400'
              }`}>
                {file.action}
              </span>
            </button>
          );
        })}
      </div>

      {/* Code Preview Area */}
      {activeFile && (
        <div className="relative">
          <div className="h-7 px-3 bg-ide-sidebar/80 border-b border-ide-border/50 flex items-center justify-between text-[10px] text-ide-muted font-mono">
            <span>{activeFile.path}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="hover:text-white flex items-center gap-1 transition"
                title="Copy Code"
              >
                <Copy size={11} />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleOpenFileInEditor}
                className="hover:text-white flex items-center gap-1 transition"
                title="Open in main Monaco editor"
              >
                <ExternalLink size={11} />
                <span>Open in Editor</span>
              </button>
            </div>
          </div>

          <pre className="p-3 bg-ide-bg font-mono text-[11px] overflow-x-auto max-h-56 text-ide-text select-text leading-relaxed">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      )}

      {/* Optional Shell Commands to Run */}
      {artifact.commands && artifact.commands.length > 0 && (
        <div className="p-2.5 bg-ide-sidebar border-t border-ide-border space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-ide-muted flex items-center gap-1">
            <Play size={10} className="text-ide-agent" /> Recommended Commands
          </span>
          <div className="space-y-1">
            {artifact.commands.map((cmd, i) => (
              <div key={i} className="flex items-center justify-between bg-ide-bg p-1.5 rounded border border-ide-border font-mono text-[11px]">
                <span className="text-ide-accent">$ {cmd}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

