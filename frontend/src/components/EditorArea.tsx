import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useIdeStore } from '../stores/useIdeStore';
import { X, Check, Undo2 } from 'lucide-react';
import { InlineAssistant } from './InlineAssistant';

export const EditorArea: React.FC = () => {
  const { openTabs, activeTabId, setActiveTab, closeTab, updateTabContent } = useIdeStore();
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const activeTab = openTabs.find(tab => tab.id === activeTabId);

  const handleEditorMount = (editor: any) => {
    editor.onDidChangeCursorSelection((e: any) => {
      const model = editor.getModel();
      if (model) {
        const selection = editor.getSelection();
        const text = model.getValueInRange(selection);
        setSelectedText(text);
      }
    });

    editor.addCommand(2048 | 41, () => {
      setShowInlineAI(prev => !prev);
    });
  };

  const handleFocusAgentInput = () => {
    const el = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (el) {
      el.focus();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden relative">
      {/* Floating Inline AI Assistant */}
      {showInlineAI && (
        <InlineAssistant 
          selectedCode={selectedText}
          onClose={() => setShowInlineAI(false)}
        />
      )}

      {/* Tabs Bar */}
      {openTabs.length > 0 && (
        <div className="h-9 bg-[#181818] border-b border-[#252526] flex items-center overflow-x-auto select-none no-scrollbar">
          {openTabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group h-full flex items-center gap-2 px-3 border-r border-[#252526] text-xs cursor-pointer transition select-none ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white font-medium border-t border-t-[#007acc]'
                    : 'bg-[#181818] text-[#969696] hover:bg-[#1f1f1f] hover:text-[#cccccc]'
                }`}
              >
                <span className="truncate max-w-[140px]">{tab.name}</span>
                {tab.isModified && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#333333] transition text-[#969696] hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
        {activeTab ? (
          activeTab.diffMode && activeTab.originalContent !== undefined ? (
            <div className="h-full flex flex-col">
              <div className="h-8 bg-[#252526] border-b border-[#333333] px-3 flex items-center justify-between text-xs text-[#cccccc]">
                <span className="font-mono text-[#007acc]">Reviewing Proposed Changes</span>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-700/50 hover:bg-green-800/50">
                    <Check size={12} /> Accept All
                  </button>
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/50 hover:bg-red-800/50">
                    <Undo2 size={12} /> Reject
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <DiffEditor
                  height="100%"
                  language={activeTab.language}
                  original={activeTab.originalContent}
                  modified={activeTab.content}
                  theme="vs-dark"
                  options={{
                    renderSideBySide: true,
                    readOnly: false,
                    minimap: { enabled: true },
                    fontSize: 13,
                    fontFamily: 'Consolas, monospace',
                  }}
                />
              </div>
            </div>
          ) : (
            <Editor
              height="100%"
              language={activeTab.language}
              value={activeTab.content}
              theme="vs-dark"
              onMount={handleEditorMount}
              onChange={(val) => updateTabContent(activeTab.id, val || '')}
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                fontFamily: 'Consolas, monospace',
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                bracketPairColorization: { enabled: true },
                lineNumbers: 'on',
              }}
            />
          )
        ) : (
          /* Exact Antigravity Empty Workspace Centerpiece from Image 1 */
          <div className="h-full flex flex-col items-center justify-center select-none bg-[#1e1e1e]">
            <div className="flex flex-col items-center space-y-4">
              {/* White Antigravity Lambda Logo */}
              <div className="w-14 h-14 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-white">
                  <path d="M12 3L3 21H8L12 11.5L16 21H21L12 3Z" fill="white" />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-normal tracking-wide text-white">
                Antigravity IDE
              </h2>

              {/* Shortcut Banner - Clickable */}
              <div 
                onClick={handleFocusAgentInput}
                className="flex items-center gap-8 text-xs text-[#858585] pt-12 cursor-pointer hover:text-white transition"
              >
                <span>Code with Agent</span>
                <span className="font-mono bg-[#252526] px-2 py-0.5 rounded text-[#cccccc] border border-[#333333]">
                  Ctrl + L
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
