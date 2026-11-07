import React, { useState } from 'react';
import { Bug, Check, Undo2, X, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string;
}

export const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, initialError = '' }) => {
  const [errorInput, setErrorInput] = useState(initialError);
  const [analyzing, setAnalyzing] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { modelConfig, loadWorkspaceFiles, openFile } = useIdeStore();

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!errorInput.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setFixApplied(false);

    try {
      const res = await fetch('/api/debug/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawError: errorInput,
          provider: modelConfig.provider,
          apiKey: modelConfig.apiKey,
          modelName: modelConfig.model,
          endpointUrl: modelConfig.endpointUrl,
        }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch {
      setAnalysisResult({
        errorSummary: 'Failed to analyze error via AI provider.',
        rootCause: 'Ensure your backend is running and API key or Ollama is configured in Settings.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyFix = async () => {
    if (!analysisResult?.proposedFix) return;
    const { filePath, targetCode, replacementCode } = analysisResult.proposedFix;

    const res = await fetch('/api/debug/apply-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, targetCode, replacementCode }),
    });

    if (res.ok) {
      setFixApplied(true);
      loadWorkspaceFiles();
      if (filePath) {
        openFile({ path: filePath, name: filePath.split('/').pop() || filePath });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="w-[680px] bg-ide-panel border border-ide-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-11 px-4 border-b border-ide-border flex items-center justify-between bg-ide-sidebar">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Bug size={15} className="text-ide-error" />
            <span>CodePilot AI Autonomous Debugger</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ide-muted hover:text-white hover:bg-ide-hover transition">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs text-ide-text">
          {/* Error Input Box */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Paste Compiler / Terminal Error Log:</span>
            </label>
            <textarea
              value={errorInput}
              onChange={(e) => setErrorInput(e.target.value)}
              placeholder="e.g. TypeError: Cannot read property 'map' of undefined at src/App.tsx:28:12"
              rows={4}
              className="w-full bg-ide-bg border border-ide-border rounded-lg p-2.5 font-mono text-[11px] text-ide-text placeholder-ide-muted focus:outline-none focus:border-ide-accent resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !errorInput.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ide-agent text-white font-medium hover:bg-ide-agent/90 disabled:opacity-40 transition text-xs shadow-md"
            >
              <Sparkles size={12} className={analyzing ? 'animate-spin' : ''} />
              <span>{analyzing ? 'Diagnosing Error...' : 'Diagnose & Generate Fix'}</span>
            </button>
          </div>

          {/* Diagnosis & Proposed Fix Results */}
          {analysisResult && (
            <div className="space-y-3 pt-3 border-t border-ide-border">
              {/* Root Cause Banner */}
              <div className="bg-ide-bg p-3 rounded-lg border border-ide-border space-y-1">
                <span className="font-semibold text-ide-error text-[11px]">Root Cause:</span>
                <p className="text-[11px] text-ide-text leading-relaxed">{analysisResult.rootCause}</p>
                {analysisResult.identifiedFile && (
                  <div className="pt-1 flex items-center gap-2 font-mono text-[10px] text-ide-muted">
                    <span>File: <strong className="text-white">{analysisResult.identifiedFile}</strong></span>
                    {analysisResult.lineNumber > 0 && <span>Line: <strong className="text-ide-accent">{analysisResult.lineNumber}</strong></span>}
                  </div>
                )}
              </div>

              {/* Proposed Code Fix */}
              {analysisResult.proposedFix && analysisResult.proposedFix.targetCode && (
                <div className="bg-ide-bg p-3 rounded-lg border border-ide-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ide-success text-[11px]">Proposed Modification:</span>
                    <span className="text-[10px] font-mono text-ide-muted">{analysisResult.proposedFix.filePath}</span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="bg-red-950/40 border border-red-500/30 p-2 rounded text-red-300 overflow-x-auto">
                      - {analysisResult.proposedFix.targetCode}
                    </div>
                    <div className="bg-green-950/40 border border-green-500/30 p-2 rounded text-green-300 overflow-x-auto">
                      + {analysisResult.proposedFix.replacementCode}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-ide-muted">{analysisResult.proposedFix.explanation}</span>
                    <button
                      onClick={handleApplyFix}
                      disabled={fixApplied}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-ide-success text-white font-medium hover:bg-ide-success/90 disabled:opacity-50 transition text-xs"
                    >
                      <Check size={12} />
                      <span>{fixApplied ? 'Fix Applied!' : 'Apply Fix to File'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

