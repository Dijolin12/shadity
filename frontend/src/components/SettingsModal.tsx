import React, { useState } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { X, Key, Cpu, Sliders, Check, ShieldCheck, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { modelConfig, setModelConfig } = useIdeStore();
  const [apiKey, setApiKey] = useState(modelConfig.apiKey || '');
  const [endpointUrl, setEndpointUrl] = useState(modelConfig.endpointUrl || 'http://localhost:11434');
  const [temperature, setTemperature] = useState(modelConfig.temperature || 0.2);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setModelConfig({
      apiKey,
      endpointUrl,
      temperature,
    });
    // Persist to localStorage
    localStorage.setItem('codepilot_api_key', apiKey);
    localStorage.setItem('codepilot_ollama_endpoint', endpointUrl);

    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[560px] bg-ide-panel border border-ide-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 border-b border-ide-border flex items-center justify-between bg-ide-sidebar">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sliders size={16} className="text-ide-agent" />
            <span>CodePilot AI IDE - Settings</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-ide-muted hover:text-white hover:bg-ide-hover transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-5 text-xs text-ide-text overflow-y-auto max-h-[70vh]">
          {/* Lifetime Unlimited Usage Info Box */}
          <div className="bg-ide-agent/10 border border-ide-agent/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-ide-agent font-semibold text-xs">
              <ShieldCheck size={14} />
              <span>Unlimited Lifetime Usage (No Token Limits)</span>
            </div>
            <p className="text-[11px] text-ide-muted leading-relaxed">
              Use your own Google Gemini API key or connect to a 100% free local model runtime (Ollama) to work autonomously without any subscription or usage quotas.
            </p>
          </div>

          {/* Section: Gemini API */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <Key size={13} className="text-ide-accent" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-ide-accent hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-ide-bg border border-ide-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-ide-accent"
            />
          </div>

          {/* Section: Local Ollama Endpoint */}
          <div className="space-y-2">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Cpu size={13} className="text-ide-agent" />
              <span>Local Ollama Endpoint (Offline &amp; Free)</span>
            </label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-ide-bg border border-ide-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-ide-agent"
            />
            <span className="text-[10px] text-ide-muted">
              Supports DeepSeek-R1, Qwen 2.5 Coder, Llama 3.3.
            </span>
          </div>

          {/* Section: Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-white">
              <span>Agent Temperature (Creativity)</span>
              <span className="font-mono text-ide-agent">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-ide-agent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ide-muted">
              <span>Deterministic &amp; Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-4 bg-ide-sidebar border-t border-ide-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-ide-border text-ide-muted hover:text-white hover:bg-ide-hover transition text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-ide-agent text-white font-medium hover:bg-ide-agent/90 transition text-xs flex items-center gap-1.5"
          >
            {savedNotice ? (
              <>
                <Check size={14} className="text-green-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

