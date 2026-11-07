import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { 
  Check, 
  Undo2, 
  X, 
  FileCode, 
  ChevronRight, 
  Layers, 
  CheckCheck 
} from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

export interface ChangedFileDiff {
  path: string;
  original: string;
  modified: string;
  additions: number;
  deletions: number;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes?: ChangedFileDiff[];
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  changes = [],
  onAcceptAll,
  onRejectAll,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!isOpen) return null;

  // Default sample changes if none passed
  const activeChanges: ChangedFileDiff[] = changes.length > 0 ? changes : [
    {
      path: 'src/App.tsx',
      original: `export function App() {\n  return <div>Welcome</div>;\n}`,
      modified: `export function App() {\n  return (\n    <div className="p-6 bg-slate-900 text-white min-h-screen">\n      <h1 className="text-2xl font-bold">CodePilot Autonomous Engine Ready</h1>\n    </div>\n  );\n}`,
      additions: 5,
      deletions: 1,
    },
    {
      path: 'server.js',
      original: `// server`,
      modified: `const express = require('express');\nconst app = express();\n\napp.use(express.json());\napp.get('/api/health', (req, res) => res.json({ status: 'ok' }));\n\napp.listen(4000);`,
      additions: 7,
      deletions: 1,
    }
  ];

  const currentFile = activeChanges[selectedIdx] || activeChanges[0];
  const totalAdditions = activeChanges.reduce((acc, c) => acc + c.additions, 0);
  const totalDeletions = activeChanges.reduce((acc, c) => acc + c.deletions, 0);

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.py')) return 'python';
    return 'plaintext';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-6">
      <div className="w-[1100px] h-[85vh] bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-[#cccccc]">
        {/* Top Header */}
        <div className="h-11 px-4 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Layers size={14} className="text-[#007acc]" />
              <span>Reviewing Agent Proposed Modifications</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#252526] px-2 py-0.5 rounded border border-[#333333]">
              <span className="text-green-400">+{totalAdditions}</span>
              <span className="text-red-400">-{totalDeletions}</span>
              <span className="text-[#858585]">across {activeChanges.length} files</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onAcceptAll?.();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded bg-[#007acc] text-white hover:bg-[#0062a3] transition font-medium"
            >
              <CheckCheck size={13} />
              <span>Accept All Changes</span>
            </button>

            <button
              onClick={() => {
                onRejectAll?.();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded bg-[#2a2d2e] hover:bg-[#383b3d] text-[#cccccc] hover:text-white border border-[#3c3c3c] transition"
            >
              <Undo2 size={13} />
              <span>Reject All</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2d2e] transition ml-2"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body: Left File List + Right Monaco Diff Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-64 bg-[#181818] border-r border-[#252526] flex flex-col p-2 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777] px-2 py-1">
              Modified Files ({activeChanges.length})
            </span>
            {activeChanges.map((change, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <div
                  key={change.path}
                  onClick={() => setSelectedIdx(idx)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#2a2d2e] text-white font-medium'
                      : 'text-[#999999] hover:bg-[#1f1f1f] hover:text-[#cccccc]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode size={13} className="text-[#007acc] shrink-0" />
                    <span className="font-mono text-[11px] truncate">{change.path}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
                    <span className="text-green-400">+{change.additions}</span>
                    <span className="text-red-400">-{change.deletions}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Diff Viewer */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            {/* Diff toolbar */}
            <div className="h-8 bg-[#252526] border-b border-[#333333] px-4 flex items-center justify-between text-[11px]">
              <span className="font-mono text-white">{currentFile.path}</span>
              <div className="flex items-center gap-4 text-[#858585]">
                <span>Original (Workspace) vs Proposed (Agent)</span>
              </div>
            </div>

            {/* Monaco Diff Canvas */}
            <div className="flex-1 relative">
              <DiffEditor
                height="100%"
                language={getLanguage(currentFile.path)}
                original={currentFile.original}
                modified={currentFile.modified}
                theme="vs-dark"
                options={{
                  renderSideBySide: true,
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 12,
                  fontFamily: 'Consolas, monospace',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

