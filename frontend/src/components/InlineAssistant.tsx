import React, { useState } from 'react';
import { Sparkles, Wand2, Bug, Zap, TestTube, Check, X } from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

interface InlineAssistantProps {
  selectedCode?: string;
  onApplyChanges?: (newCode: string) => void;
  onClose?: () => void;
}

export const InlineAssistant: React.FC<InlineAssistantProps> = ({ selectedCode, onApplyChanges, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { addMessage, setIsAgentRunning, modelConfig } = useIdeStore();

  const handleAction = (actionType: string) => {
    let customPrompt = prompt;
    if (actionType === 'explain') customPrompt = `Explain this code in detail:\n\`\`\`\n${selectedCode}\n\`\`\``;
    if (actionType === 'fix') customPrompt = `Find potential bugs and fix this code:\n\`\`\`\n${selectedCode}\n\`\`\``;
    if (actionType === 'optimize') customPrompt = `Optimize this code for performance and readability:\n\`\`\`\n${selectedCode}\n\`\`\``;
    if (actionType === 'test') customPrompt = `Generate comprehensive unit tests for this code:\n\`\`\`\n${selectedCode}\n\`\`\``;

    addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: customPrompt,
      timestamp: Date.now(),
    });

    setIsAgentRunning(true);
    onClose?.();
  };

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-[520px] bg-ide-panel border border-ide-agent/40 rounded-xl shadow-2xl p-2.5 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-ide-agent" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAction('custom');
            if (e.key === 'Escape') onClose?.();
          }}
          placeholder="Ask inline AI to edit, refactor, or explain selected code..."
          className="flex-1 bg-ide-bg border border-ide-border rounded-md px-2.5 py-1 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-ide-agent"
          autoFocus
        />
        <button 
          onClick={onClose}
          className="p-1 text-ide-muted hover:text-white rounded hover:bg-ide-hover transition"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-ide-muted flex-wrap">
        <span className="font-mono text-[10px] text-ide-muted uppercase">Quick:</span>
        <button
          onClick={() => handleAction('fix')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-bg border border-ide-border hover:bg-ide-hover hover:text-white transition"
        >
          <Bug size={11} className="text-amber-400" /> Fix Bugs
        </button>
        <button
          onClick={() => handleAction('optimize')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-bg border border-ide-border hover:bg-ide-hover hover:text-white transition"
        >
          <Zap size={11} className="text-blue-400" /> Optimize
        </button>
        <button
          onClick={() => handleAction('test')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-bg border border-ide-border hover:bg-ide-hover hover:text-white transition"
        >
          <TestTube size={11} className="text-green-400" /> Tests
        </button>
        <button
          onClick={() => handleAction('explain')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-bg border border-ide-border hover:bg-ide-hover hover:text-white transition"
        >
          <Wand2 size={11} className="text-purple-400" /> Explain
        </button>
      </div>
    </div>
  );
};

