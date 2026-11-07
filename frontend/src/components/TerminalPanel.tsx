import React, { useEffect, useRef, useState } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  Plus, 
  MoreHorizontal, 
  Columns, 
  ChevronUp, 
  X, 
  GitBranch, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Bug,
  Radio
} from 'lucide-react';
import { terminalSocket } from '../services/terminalSocket';

interface TerminalPanelProps {
  onOpenDebugger?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onOpenDebugger }) => {
  const { 
    bottomPanelTab, 
    setBottomPanelTab, 
    isBottomPanelOpen, 
    toggleBottomPanel, 
    terminalLogs,
    projectName,
    openFile
  } = useIdeStore();

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [activeSession, setActiveSession] = useState<'powershell' | 'esbuild'>('powershell');

  useEffect(() => {
    if (!isBottomPanelOpen || !terminalRef.current || xtermInstance.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddonRef.current = fitAddon;

    const safeFit = () => {
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
          fitAddon.fit();
        }
      } catch {}
    };

    requestAnimationFrame(() => safeFit());

    // Connect to WebSocket
    terminalSocket.connect((data) => {
      term.write(data);
    });

    let currLine = '';
    const getPrompt = () => `PS C:\\Users\\dijol\\OneDrive\\Desktop\\${useIdeStore.getState().projectName}> `;

    term.onData(data => {
      if (data === '\r') {
        term.writeln('');
        if (currLine.trim() === 'clear') {
          term.clear();
          term.write(getPrompt());
        } else if (currLine.trim().length > 0) {
          terminalSocket.sendCommand(currLine.trim());
        } else {
          term.write(getPrompt());
        }
        currLine = '';
      } else if (data === '\u007F' || data === '\b') {
        if (currLine.length > 0) {
          currLine = currLine.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\u0003') {
        // Ctrl + C
        currLine = '';
        term.writeln('^C');
        term.write(getPrompt());
      } else {
        currLine += data;
        term.write(data);
      }
    });

    xtermInstance.current = term;

    const handleResize = () => safeFit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminalSocket.disconnect();
      term.dispose();
      xtermInstance.current = null;
    };
  }, [isBottomPanelOpen]);

  // Re-fit when tab switches back to terminal
  useEffect(() => {
    if (bottomPanelTab === 'terminal' && fitAddonRef.current && terminalRef.current) {
      setTimeout(() => {
        try {
          if (terminalRef.current && terminalRef.current.clientWidth > 0) {
            fitAddonRef.current?.fit();
          }
        } catch {}
      }, 50);
    }
  }, [bottomPanelTab]);

  if (!isBottomPanelOpen) return null;

  const tabs = [
    { id: 'problems', label: 'Problems', badge: 1 },
    { id: 'output', label: 'Output' },
    { id: 'debug', label: 'Debug Console' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'ports', label: 'Ports' },
    { id: 'comments', label: 'Comments' },
  ] as const;

  return (
    <div className="h-56 bg-[#1e1e1e] border-t border-[#252526] flex flex-col select-none shrink-0 text-xs">
      {/* Antigravity Terminal Header */}
      <div className="h-8 bg-[#1e1e1e] border-b border-[#252526] px-3 flex items-center justify-between">
        {/* Left Tabs */}
        <div className="flex items-center gap-5">
          {tabs.map((tab) => {
            const isActive = bottomPanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setBottomPanelTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-1 text-xs transition relative ${
                  isActive ? 'text-white font-medium border-b border-b-white' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="w-4 h-4 rounded-full bg-[#007acc] text-white text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2 text-[#858585]">
          <button 
            onClick={onOpenDebugger}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-700/50 hover:bg-red-900/50 text-[11px]"
            title="Open AI Debugger Engine"
          >
            <Bug size={11} />
            <span>AI Debugger</span>
          </button>
          <button className="hover:text-white p-0.5"><Plus size={13} /></button>
          <button className="hover:text-white p-0.5"><MoreHorizontal size={13} /></button>
          <button className="hover:text-white p-0.5"><Columns size={13} /></button>
          <button className="hover:text-white p-0.5"><ChevronUp size={13} /></button>
          <button onClick={toggleBottomPanel} className="hover:text-white p-0.5"><X size={13} /></button>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Terminal Canvas */}
        <div className={`flex-1 h-full overflow-hidden relative p-1 ${bottomPanelTab === 'terminal' ? 'block' : 'hidden'}`}>
          <div ref={terminalRef} className="h-full w-full" />
        </div>

        {/* 2. Problems Panel */}
        {bottomPanelTab === 'problems' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#1e1e1e] font-mono text-[11px]">
            <div className="flex items-center justify-between p-2 rounded bg-[#252526] border border-[#333333]">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-[#f14c4c]" />
                <span className="text-white">Gemini API Model name fallback notice</span>
                <span className="text-[#858585] text-[10px]">backend/src/providers/gemini.ts:1</span>
              </div>
              <button 
                onClick={onOpenDebugger}
                className="px-2 py-0.5 rounded bg-[#007acc] text-white hover:bg-[#0062a3] text-[10px]"
              >
                Fix with AI Debugger
              </button>
            </div>
          </div>
        )}

        {/* 3. Output Panel */}
        {bottomPanelTab === 'output' && (
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-[#858585] space-y-1 bg-[#1e1e1e]">
            <p>[CodePilot IDE Engine] Workspace active at: C:\Users\dijol\OneDrive\Desktop\Shadity</p>
            <p>[Vite Server] Local dev server running on http://localhost:5173</p>
            <p>[Backend API] WebSocket terminal bridge listening on port 4000</p>
          </div>
        )}

        {/* 4. Debug Console */}
        {bottomPanelTab === 'debug' && (
          <div className="flex-1 p-3 font-mono text-[11px] text-[#858585] space-y-2 bg-[#1e1e1e]">
            <p>Debugger console connected. Type expressions to evaluate in local runtime.</p>
            <div className="flex items-center gap-2 text-white">
              <span className="text-[#007acc]">&gt;</span>
              <input 
                type="text" 
                placeholder="Evaluate expression..." 
                className="flex-1 bg-transparent border-none outline-none text-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* 5. Ports Panel */}
        {bottomPanelTab === 'ports' && (
          <div className="flex-1 p-3 font-mono text-[11px] bg-[#1e1e1e] space-y-2">
            <div className="text-[10px] uppercase text-[#777777] font-semibold">Active Local Ports</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-[#252526] border border-[#333333] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">5173</span>
                  <p className="text-[10px] text-[#858585]">Frontend (Vite UI)</p>
                </div>
                <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="text-[#007acc] hover:text-white">
                  <ExternalLink size={13} />
                </a>
              </div>
              <div className="p-2 rounded bg-[#252526] border border-[#333333] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">4000</span>
                  <p className="text-[10px] text-[#858585]">Backend (Agent API &amp; WS)</p>
                </div>
                <a href="http://localhost:4000/api/health" target="_blank" rel="noreferrer" className="text-[#007acc] hover:text-white">
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 6. Comments / Execution Logs */}
        {bottomPanelTab === 'comments' && (
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-[#858585] space-y-1 bg-[#1e1e1e]">
            <p className="text-white font-semibold mb-2">Agent Execution Traces &amp; Tool Logs:</p>
            {terminalLogs.map((log, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-[#007acc] font-bold">&gt;&gt;</span>
                <span className="text-[#cccccc]">{log}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sessions list on the right (Image 1: esbuild, powershell) */}
        {bottomPanelTab === 'terminal' && (
          <div className="w-36 border-l border-[#252526] bg-[#1e1e1e] flex flex-col p-1 text-[11px] text-[#858585]">
            <div 
              onClick={() => setActiveSession('esbuild')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                activeSession === 'esbuild' ? 'bg-[#2a2d2e] text-white' : 'hover:bg-[#252526] hover:text-white'
              }`}
            >
              <span>&gt;_</span>
              <span>esbuild</span>
            </div>

            <div 
              onClick={() => setActiveSession('powershell')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                activeSession === 'powershell' ? 'bg-[#2a2d2e] text-white' : 'hover:bg-[#252526] hover:text-white'
              }`}
            >
              <span>&gt;_</span>
              <span>powershell</span>
            </div>
          </div>
        )}
      </div>

      {/* Exact Antigravity Bottom Status Bar */}
      <div className="h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px]">
        {/* Left: branch & error badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
            <GitBranch size={11} />
            <span>main</span>
            <RefreshCw size={10} className="ml-0.5" />
          </div>

          <div 
            onClick={() => setBottomPanelTab('problems')}
            className="flex items-center gap-1 cursor-pointer hover:opacity-80"
          >
            <AlertCircle size={11} />
            <span>1</span>
            <AlertTriangle size={11} className="ml-1" />
            <span>0</span>
          </div>
        </div>

        {/* Right: Antigravity Settings */}
        <div className="flex items-center gap-4 text-[#e0e0e0]">
          <span className="hover:text-white cursor-pointer">Tab Settings</span>
          <span 
            onClick={onOpenDebugger}
            className="hover:text-white cursor-pointer"
          >
            Antigravity - Settings
          </span>
        </div>
      </div>
    </div>
  );
};
