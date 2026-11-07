import React, { useEffect, useRef } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal, AlertTriangle, ScrollText, Cpu, X, Bug } from 'lucide-react';
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
    terminalLogs 
  } = useIdeStore();

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!isBottomPanelOpen || !terminalRef.current || xtermInstance.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Fira Code, Consolas, monospace',
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#1f242c',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddonRef.current = fitAddon;

    // Safely fit only after container has real dimensions
    const safeFit = () => {
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
          fitAddon.fit();
        }
      } catch {
        // Suppress fit race condition
      }
    };

    requestAnimationFrame(() => {
      safeFit();
    });

    term.writeln('\x1b[1;34mCodePilot AI Integrated Terminal\x1b[0m');
    term.writeln('Powered by Native PTY & WebSocket Bridge.\r\n');
    term.write('$ ');

    // Connect to backend WebSocket
    terminalSocket.connect((data) => {
      term.write(data);
    });

    let currLine = '';
    term.onData(data => {
      if (data === '\r') {
        term.writeln('');
        if (currLine.trim() === 'clear') {
          term.clear();
          term.write('$ ');
        } else if (currLine.trim().length > 0) {
          terminalSocket.sendCommand(currLine.trim());
        } else {
          term.write('$ ');
        }
        currLine = '';
      } else if (data === '\u007F') { // Backspace
        if (currLine.length > 0) {
          currLine = currLine.slice(0, -1);
          term.write('\b \b');
        }
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
      fitAddonRef.current = null;
    };
  }, [isBottomPanelOpen]);

  // When switching back to the terminal tab, re-fit safely
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

  return (
    <div className="h-48 bg-ide-bg border-t border-ide-border flex flex-col select-none shrink-0">
      {/* Header Tabs */}
      <div className="h-8 bg-ide-sidebar border-b border-ide-border px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBottomPanelTab('terminal')}
            className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition ${
              bottomPanelTab === 'terminal'
                ? 'border-ide-accent text-white'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            <Terminal size={13} />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setBottomPanelTab('problems')}
            className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition ${
              bottomPanelTab === 'problems'
                ? 'border-ide-accent text-white'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            <AlertTriangle size={13} className="text-amber-400" />
            <span>Problems (0)</span>
          </button>

          <button
            onClick={() => setBottomPanelTab('agent-logs')}
            className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition ${
              bottomPanelTab === 'agent-logs'
                ? 'border-ide-accent text-white'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            <Cpu size={13} className="text-ide-agent" />
            <span>Agent Logs</span>
          </button>

          <button
            onClick={() => setBottomPanelTab('output')}
            className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition ${
              bottomPanelTab === 'output'
                ? 'border-ide-accent text-white'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            <ScrollText size={13} />
            <span>Output</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDebugger}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-error/15 text-ide-error border border-ide-error/30 hover:bg-ide-error/25 transition text-[11px] font-medium"
            title="Open AI Debugger Engine"
          >
            <Bug size={12} />
            <span>AI Debugger</span>
          </button>

          <button 
            onClick={toggleBottomPanel}
            className="text-ide-muted hover:text-white p-1 rounded hover:bg-ide-hover"
            title="Close Panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <div 
          ref={terminalRef} 
          className={`h-full w-full ${bottomPanelTab === 'terminal' ? 'block' : 'hidden'}`} 
        />

        {bottomPanelTab === 'agent-logs' && (
          <div className="h-full overflow-y-auto p-3 font-mono text-xs space-y-1 bg-ide-bg text-ide-muted">
            {terminalLogs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-ide-agent font-bold">&gt;&gt;</span>
                <span className="text-ide-text">{log}</span>
              </div>
            ))}
          </div>
        )}

        {bottomPanelTab === 'problems' && (
          <div className="h-full flex items-center justify-center text-xs text-ide-muted">
            <span>No problems detected in the project workspace.</span>
          </div>
        )}

        {bottomPanelTab === 'output' && (
          <div className="h-full p-3 font-mono text-xs text-ide-muted bg-ide-bg">
            <span>Build output ready.</span>
          </div>
        )}
      </div>
    </div>
  );
};
