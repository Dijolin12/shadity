import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useIdeStore } from '../stores/useIdeStore';
import { X, Check, Undo2, Sparkles } from 'lucide-react';
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

    // Keyboard shortcut: Ctrl+K or Cmd+K to toggle inline AI
    editor.addCommand(2048 | 41, () => { // KeyMod.CtrlCmd | KeyCode.KeyK
      setShowInlineAI(prev => !prev);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-ide-bg overflow-hidden relative">
      {/* Floating Inline AI Assistant */}
      {showInlineAI && (
        <InlineAssistant 
          selectedCode={selectedText}
          onClose={() => setShowInlineAI(false)}
        />
      )}

      {/* Tabs Bar */}
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center justify-between overflow-x-auto select-none no-scrollbar">
        <div className="flex items-center h-full">
          {openTabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group h-full flex items-center gap-2 px-3 border-r border-ide-border text-xs cursor-pointer transition select-none ${
                  isActive
                    ? 'bg-ide-bg text-white font-medium border-t-2 border-t-ide-accent'
                    : 'bg-ide-sidebar text-ide-muted hover:bg-ide-panel hover:text-ide-text'
                }`}
              >
                <span className="truncate max-w-[140px]">{tab.name}</span>
                {tab.isModified && (
                  <div className="w-2 h-2 rounded-full bg-ide-accent" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-ide-hover transition text-ide-muted hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {activeTab && (
          <div className="pr-3 flex items-center gap-2">
            <button
              onClick={() => setShowInlineAI(prev => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-ide-agent/15 text-ide-agent border border-ide-agent/30 hover:bg-ide-agent/25 text-xs font-medium transition"
              title="Ctrl + K to toggle inline AI"
            >
              <Sparkles size={12} />
              <span>Inline AI (Ctrl+K)</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          activeTab.diffMode && activeTab.originalContent !== undefined ? (
            <div className="h-full flex flex-col">
              <div className="h-8 bg-ide-panel border-b border-ide-border px-3 flex items-center justify-between text-xs text-ide-muted">
                <span className="font-mono text-ide-agent font-medium">AI Proposed Diff - Reviewing Changes</span>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-success/20 text-ide-success border border-ide-success/30 hover:bg-ide-success/30 font-medium">
                    <Check size={12} /> Accept All
                  </button>
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-error/20 text-ide-error border border-ide-error/30 hover:bg-ide-error/30 font-medium">
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
                    fontFamily: 'Fira Code, Consolas, monospace',
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
                fontFamily: 'Fira Code, Consolas, monospace',
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                lineNumbers: 'on',
              }}
            />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ide-muted select-none">
            <div className="text-center space-y-3">
              <p className="text-base font-medium text-ide-text">No File Opened</p>
              <p className="text-xs">Select a file from the explorer or ask CodePilot to build a project.</p>
              <div className="flex gap-2 justify-center text-xs">
                <span className="px-2 py-1 bg-ide-panel rounded border border-ide-border">Ctrl + P: Search Files</span>
                <span className="px-2 py-1 bg-ide-panel rounded border border-ide-border">Ctrl + K: Inline AI</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
