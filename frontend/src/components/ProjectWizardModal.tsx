import React, { useState } from 'react';
import { 
  FolderPlus, 
  Sparkles, 
  Layers, 
  Database, 
  ShieldCheck, 
  Cpu, 
  X, 
  Check, 
  Code2
} from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('my-ai-app');
  const [template, setTemplate] = useState('mern');
  const [description, setDescription] = useState('A full-featured Employee Management system with employee table, department filters, add/edit modal, and REST endpoints.');
  const [features, setFeatures] = useState<string[]>(['auth', 'database', 'responsive']);

  const { addMessage, setIsAgentRunning, setAgentMode } = useIdeStore();

  if (!isOpen) return null;

  const templates = [
    { id: 'mern', name: 'MERN Stack', desc: 'React, Node.js Express backend, MongoDB Mongoose schema' },
    { id: 'react-tailwind', name: 'React + Vite + Tailwind', desc: 'Modern SPA with components, state management, and lucid icons' },
    { id: 'fastapi-react', name: 'FastAPI + React', desc: 'High-performance Python backend with typed React frontend' },
  ];

  const availableFeatures = [
    { id: 'auth', label: 'User Authentication (JWT / Sessions)' },
    { id: 'database', label: 'CRUD Database Models & Controllers' },
    { id: 'responsive', label: 'Responsive Dark/Light UI' },
    { id: 'validation', label: 'Input Validation & Error Handling' },
  ];

  const toggleFeature = (id: string) => {
    setFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleStartGeneration = () => {
    setAgentMode('agent'); // Ensure agent mode is active

    const fullPrompt = `Create a complete multi-file project named "${projectName}" using the ${template.toUpperCase()} stack.
PROJECT DETAILS:
${description}

INCLUDED FEATURES:
${features.map(f => `- ${f}`).join('\n')}

INSTRUCTIONS:
1. Inspect the workspace root.
2. Generate all frontend and backend files with full working code (no placeholders).
3. Ensure proper imports, routes, schemas, and package.json scripts.
4. Verify code syntax and report when ready.`;

    addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: fullPrompt,
      timestamp: Date.now(),
    });

    setIsAgentRunning(true);
    onClose();

    // Trigger backend agent prompt
    fetch('/api/agent/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt, mode: 'agent' }),
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="w-[620px] bg-ide-panel border border-ide-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 border-b border-ide-border flex items-center justify-between bg-ide-sidebar">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Sparkles size={16} className="text-ide-agent" />
            <span>Autonomous Multi-File Project Generator</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ide-muted hover:text-white hover:bg-ide-hover transition">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-ide-text overflow-y-auto max-h-[75vh]">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">Project Name / Folder</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-ide-bg border border-ide-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-ide-agent"
            />
          </div>

          {/* Stack Choice */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">Select Architecture &amp; Stack</label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                    template === t.id
                      ? 'border-ide-agent bg-ide-agent/15 text-white'
                      : 'border-ide-border bg-ide-bg text-ide-muted hover:bg-ide-hover'
                  }`}
                >
                  <span className="font-semibold text-[11px] mb-1">{t.name}</span>
                  <span className="text-[10px] leading-tight opacity-80">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">Application Requirements &amp; Scope</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-ide-bg border border-ide-border rounded-lg p-2.5 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-ide-agent resize-none font-sans"
            />
          </div>

          {/* Features Checkboxes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">Required Capabilities</label>
            <div className="grid grid-cols-2 gap-2">
              {availableFeatures.map(f => {
                const isChecked = features.includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-[11px] ${
                      isChecked
                        ? 'border-ide-accent bg-ide-accent/15 text-white'
                        : 'border-ide-border bg-ide-bg text-ide-muted hover:bg-ide-hover'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-ide-accent border-ide-accent text-white' : 'border-ide-border'
                    }`}>
                      {isChecked && <Check size={10} />}
                    </div>
                    <span>{f.label}</span>
                  </div>
                );
              })}
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
            onClick={handleStartGeneration}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-ide-accent to-ide-agent text-white font-medium hover:opacity-90 transition text-xs flex items-center gap-1.5 shadow-md"
          >
            <Sparkles size={13} />
            <span>Autonomously Generate Application</span>
          </button>
        </div>
      </div>
    </div>
  );
};

