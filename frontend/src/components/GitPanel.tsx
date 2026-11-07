import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  RefreshCw, 
  FileCode, 
  ArrowUpCircle 
} from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

interface GitStatus {
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
}

export const GitPanel: React.FC = () => {
  const [status, setStatus] = useState<GitStatus>({ branch: 'main', modified: [], staged: [], untracked: [] });
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { modelConfig, openTabs, setActiveTab, openFile } = useIdeStore();

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/git/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStage = async (file: string) => {
    await fetch('/api/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file }),
    });
    fetchStatus();
  };

  const handleGenerateCommitMessage = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/git/generate-commit-msg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: modelConfig.provider,
          apiKey: modelConfig.apiKey,
          modelName: modelConfig.model,
          endpointUrl: modelConfig.endpointUrl,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setCommitMsg(data.message);
      }
    } catch {
      setCommitMsg('feat: update project codebase');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg }),
      });
      setCommitMsg('');
      fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-ide-panel border-r border-ide-border flex flex-col h-full shrink-0 select-none text-xs">
      {/* Header */}
      <div className="h-8 px-3 border-b border-ide-border flex items-center justify-between text-ide-muted font-semibold uppercase tracking-wider text-[11px]">
        <span>Source Control</span>
        <button 
          onClick={fetchStatus} 
          className="p-1 hover:text-white rounded hover:bg-ide-hover transition" 
          title="Refresh Git"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Branch & Actions */}
      <div className="p-3 border-b border-ide-border space-y-2.5">
        <div className="flex items-center gap-1.5 text-ide-accent font-mono text-[11px]">
          <GitBranch size={13} />
          <span className="font-semibold">{status.branch}</span>
        </div>

        {/* Commit Input Area */}
        <div className="space-y-1.5">
          <textarea
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Message (Ctrl+Enter to commit)"
            rows={2}
            className="w-full bg-ide-bg border border-ide-border rounded p-1.5 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-ide-accent resize-none font-sans"
          />

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGenerateCommitMessage}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-ide-agent/15 text-ide-agent border border-ide-agent/30 hover:bg-ide-agent/25 transition text-[11px] font-medium"
              title="Inspect diff and draft commit message using AI"
            >
              <Sparkles size={11} className={isGenerating ? 'animate-spin' : ''} />
              <span>{isGenerating ? 'Drafting...' : 'AI Message'}</span>
            </button>

            <button
              onClick={handleCommit}
              disabled={loading || !commitMsg.trim()}
              className="px-3 py-1 rounded bg-ide-accent text-white hover:bg-ide-accent/90 disabled:opacity-40 transition font-medium text-[11px] flex items-center gap-1"
            >
              <Check size={12} />
              <span>Commit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Staged Changes */}
        {status.staged.length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-ide-muted px-1 mb-1">
              Staged Changes ({status.staged.length})
            </div>
            {status.staged.map((file, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ide-hover group">
                <span className="font-mono text-ide-success truncate text-[11px]">{file}</span>
                <span className="text-[10px] text-ide-muted">staged</span>
              </div>
            ))}
          </div>
        )}

        {/* Modified / Changes */}
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-ide-muted px-1 mb-1">
            Changes ({status.modified.length + status.untracked.length})
          </div>

          {status.modified.map((file, i) => (
            <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ide-hover group cursor-pointer">
              <span className="font-mono text-amber-400 truncate text-[11px]">{file}</span>
              <button
                onClick={() => handleStage(file)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-ide-active text-ide-muted hover:text-white"
                title="Stage Changes"
              >
                <Plus size={12} />
              </button>
            </div>
          ))}

          {status.untracked.map((file, i) => (
            <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ide-hover group cursor-pointer">
              <span className="font-mono text-ide-muted truncate text-[11px]">{file}</span>
              <button
                onClick={() => handleStage(file)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-ide-active text-ide-muted hover:text-white"
                title="Stage Untracked File"
              >
                <Plus size={12} />
              </button>
            </div>
          ))}

          {status.modified.length === 0 && status.untracked.length === 0 && (
            <div className="p-3 text-center text-[11px] text-ide-muted">
              Working tree clean.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

