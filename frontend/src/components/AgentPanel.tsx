import React, { useState } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { api, AgentStreamEvent } from '../services/api';
import { ArtifactView } from './ArtifactView';
import { 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip,
  Check,
  X,
  Bot
} from 'lucide-react';

export const AgentPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const { 
    messages, 
    addMessage, 
    updateLastMessage,
    isAgentRunning, 
    setIsAgentRunning, 
    pendingApprovals,
    resolveApproval,
    agentMode,
    modelConfig,
    addTerminalLog,
    loadWorkspaceFiles
  } = useIdeStore();

  const handleSend = () => {
    if (!input.trim() || isAgentRunning) return;

    const userPrompt = input;
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: userPrompt,
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    setInput('');
    setIsAgentRunning(true);

    const assistantMsgId = `msg-${Date.now() + 1}`;
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      toolCalls: [],
      plan: [],
    });

    api.streamAgentPrompt(
      {
        prompt: userPrompt,
        provider: modelConfig.provider,
        apiKey: modelConfig.apiKey,
        modelName: modelConfig.model,
        endpointUrl: modelConfig.endpointUrl,
      },
      (event: AgentStreamEvent) => {
        if (event.type === 'stream_chunk') {
          updateLastMessage((msg) => ({
            ...msg,
            content: msg.content + (event.payload || ''),
          }));
        } else if (event.type === 'tool_execution_start') {
          const tool = event.payload;
          addTerminalLog(`[AGENT TOOL START]: ${tool.name} with ${JSON.stringify(tool.args)}`);
          updateLastMessage((msg) => ({
            ...msg,
            toolCalls: [
              ...(msg.toolCalls || []),
              {
                id: `tool-${Date.now()}`,
                toolName: tool.name,
                args: tool.args,
                status: 'running',
                timestamp: Date.now(),
              },
            ],
          }));
        } else if (event.type === 'tool_execution_end') {
          const { toolCall, result } = event.payload;
          addTerminalLog(`[AGENT TOOL RESULT]: ${toolCall.name} -> ${result?.success ? 'Success' : 'Failed'}`);
          loadWorkspaceFiles(); // Refresh file tree in case files were created/edited
          updateLastMessage((msg) => ({
            ...msg,
            toolCalls: (msg.toolCalls || []).map((t) =>
              t.toolName === toolCall.name && t.status === 'running'
                ? { ...t, status: result?.success ? 'completed' : 'failed', result: result?.output || result?.error }
                : t
            ),
          }));
        } else if (event.type === 'task_complete' || event.type === 'error') {
          setIsAgentRunning(false);
          updateLastMessage((msg) => ({
            ...msg,
            isStreaming: false,
            content: event.error ? msg.content + `\n\n*(Error: ${event.error})*` : msg.content,
          }));
          addTerminalLog('[AGENT TASK FINISHED]');
        }
      },
      (err) => {
        setIsAgentRunning(false);
        updateLastMessage((msg) => ({
          ...msg,
          isStreaming: false,
          content: msg.content + `\n\n*(Connection error: ${err.message || 'Make sure the backend is running on port 4000'})*`,
        }));
      }
    );
  };

  return (
    <div className="w-80 bg-ide-panel border-l border-ide-border flex flex-col h-full shrink-0 select-none">
      {/* Agent Panel Header */}
      <div className="h-9 px-3 border-b border-ide-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-white">
          <Sparkles size={14} className="text-ide-agent" />
          <span>Antigravity Agent</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ide-agent/20 text-ide-agent border border-ide-agent/30 font-mono">
          {agentMode.toUpperCase()}
        </span>
      </div>

      {/* Pending Approvals Gate */}
      {pendingApprovals.length > 0 && (
        <div className="p-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
            <AlertCircle size={13} />
            <span>Action Requires User Approval</span>
          </div>
          {pendingApprovals.map(app => (
            <div key={app.id} className="bg-ide-bg p-2 rounded border border-ide-border text-xs flex flex-col gap-1.5">
              <span className="font-mono text-ide-text text-[11px]">Tool: {app.toolName}</span>
              <pre className="text-[10px] text-ide-muted bg-ide-panel p-1 rounded overflow-x-auto">
                {JSON.stringify(app.args, null, 2)}
              </pre>
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={() => resolveApproval(app.id, true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-success/20 text-ide-success border border-ide-success/30 hover:bg-ide-success/30 text-[10px]"
                >
                  <Check size={11} /> Allow
                </button>
                <button
                  onClick={() => resolveApproval(app.id, false)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-error/20 text-ide-error border border-ide-error/30 hover:bg-ide-error/30 text-[10px]"
                >
                  <X size={11} /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message & Tool Calling Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-ide-muted font-medium text-[11px]">
              {msg.role === 'assistant' ? (
                <>
                  <Bot size={13} className="text-ide-agent" />
                  <span className="text-ide-agent">CodePilot</span>
                </>
              ) : (
                <span className="text-ide-text">You</span>
              )}
            </div>

            <div className={`p-2.5 rounded-lg leading-relaxed ${
              msg.role === 'assistant' 
                ? 'bg-ide-bg border border-ide-border text-ide-text' 
                : 'bg-ide-accent/15 border border-ide-accent/30 text-white ml-2'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content || (msg.isStreaming ? 'Thinking...' : '')}</div>

              {/* Artifact Card rendering */}
              {msg.artifact && (
                <ArtifactView
                  artifact={msg.artifact}
                  onApply={() => {
                    msg.artifact?.files.forEach(f => {
                      api.writeFile(f.path, f.content);
                    });
                    loadWorkspaceFiles();
                  }}
                />
              )}

              {/* Tool calls indicator badges */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-ide-border space-y-1">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-ide-muted">
                    Autonomous Actions
                  </span>
                  {msg.toolCalls.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] bg-ide-panel p-1.5 rounded font-mono border border-ide-border">
                      {t.status === 'running' && <Clock size={12} className="text-ide-agent animate-spin" />}
                      {t.status === 'completed' && <CheckCircle2 size={12} className="text-ide-success" />}
                      {t.status === 'failed' && <AlertCircle size={12} className="text-ide-error" />}
                      <span className="text-ide-accent font-semibold">{t.toolName}</span>
                      <span className="truncate text-ide-muted">{JSON.stringify(t.args)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-2 border-t border-ide-border bg-ide-sidebar">
        <div className="bg-ide-bg border border-ide-border focus-within:border-ide-agent rounded-lg p-2 transition">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask CodePilot to create components, edit files, or debug..."
            rows={3}
            className="w-full bg-transparent text-xs text-white placeholder-ide-muted focus:outline-none resize-none font-sans"
          />
          <div className="flex items-center justify-between pt-1 border-t border-ide-border/50 text-ide-muted">
            <button className="hover:text-white p-1 rounded transition" title="Attach file context">
              <Paperclip size={13} />
            </button>
            <button
              onClick={handleSend}
              disabled={isAgentRunning || !input.trim()}
              className="px-2.5 py-1 rounded bg-ide-agent text-white text-[11px] font-medium flex items-center gap-1 hover:bg-ide-agent/90 disabled:opacity-40 transition"
            >
              <Send size={11} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
