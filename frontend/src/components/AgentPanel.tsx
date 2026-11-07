import React, { useState, useEffect, useRef } from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { api, AgentStreamEvent } from '../services/api';
import { 
  Plus, 
  ArrowUp, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Columns, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  Check,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AgentPanelProps {
  onOpenReview?: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ onOpenReview }) => {
  const [input, setInput] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  const { 
    messages, 
    addMessage, 
    updateLastMessage,
    isAgentRunning, 
    setIsAgentRunning, 
    modelConfig, 
    setModelConfig, 
    addTerminalLog, 
    loadWorkspaceFiles 
  } = useIdeStore();

  // Real live timer that counts actual thinking seconds
  useEffect(() => {
    if (isAgentRunning) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAgentRunning]);

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

    console.log('[CodePilot Agent] Sending prompt:', userPrompt, 'with model:', modelConfig.model);

    api.streamAgentPrompt(
      {
        prompt: userPrompt,
        provider: modelConfig.provider,
        apiKey: modelConfig.apiKey,
        modelName: modelConfig.model,
        endpointUrl: modelConfig.endpointUrl,
      },
      (event: AgentStreamEvent) => {
        console.log('[CodePilot Agent Event]:', event);
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
          loadWorkspaceFiles();
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
            content: event.error ? msg.content + `\n\n*(Error: ${event.error})*` : (msg.content || event.payload?.finalResponse || ''),
          }));
        }
      },
      (err) => {
        console.error('[CodePilot Connection Error]:', err);
        setIsAgentRunning(false);
        updateLastMessage((msg) => ({
          ...msg,
          isStreaming: false,
          content: msg.content + `\n\n*(Connection error: ${err.message || 'Make sure backend is running on port 4000'})*`,
        }));
      }
    );
  };

  return (
    <div className="w-[420px] bg-[#181818] border-l border-[#252526] flex flex-col h-full shrink-0 select-none text-[13px] text-[#cccccc]">
      {/* Antigravity Agent Tab Header */}
      <div className="h-9 px-2 border-b border-[#252526] flex items-center justify-between text-xs bg-[#181818]">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Search size={13} className="text-[#858585] shrink-0" />
          <span className="text-[#858585] truncate">S... /</span>
          <span className="text-white font-medium truncate">CodePilot Agent</span>
          <button className="text-[#858585] hover:text-white px-1">
            <Plus size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1 text-[#858585]">
          <button className="p-1 hover:text-white rounded hover:bg-[#2a2d2e] transition" title="Split Panel">
            <Columns size={13} />
          </button>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const changedFiles = msg.toolCalls?.filter(t => t.toolName === 'write_file' || t.toolName === 'edit_file') || [];
          return (
            <div key={msg.id} className="space-y-2">
              {msg.role === 'user' ? (
                /* User Bubble */
                <div className="bg-[#2a2d2e]/80 border border-[#383b3d] p-3 rounded-lg text-white">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ) : (
                /* Agent Response */
                <div className="space-y-2 text-[#cccccc] leading-relaxed">
                  {/* Real Live Elapsed Stopwatch when running */}
                  {msg.isStreaming && (
                    <div className="flex items-center gap-1 text-xs text-[#858585]">
                      <Clock size={12} className="animate-spin text-[#007acc]" />
                      <span>Thinking... ({elapsedSeconds}s)</span>
                    </div>
                  )}

                  {/* Real Markdown Text */}
                  {msg.content && (
                    <div className="whitespace-pre-wrap text-[13px] space-y-2">
                      {msg.content}
                    </div>
                  )}

                  {/* Real Tool Calls Badges (Shown ONLY when actual tools are run) */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[10px] font-mono text-[#858585] uppercase tracking-wider">
                        Autonomous Actions ({msg.toolCalls.length})
                      </div>
                      {msg.toolCalls.map((tool, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-[#252526] p-1.5 rounded font-mono text-[11px] border border-[#333333]">
                          {tool.status === 'running' && <Clock size={12} className="text-[#007acc] animate-spin" />}
                          {tool.status === 'completed' && <CheckCircle2 size={12} className="text-green-400" />}
                          {tool.status === 'failed' && <AlertCircle size={12} className="text-red-400" />}
                          <span className="text-white font-semibold">{tool.toolName}</span>
                          <span className="text-[#858585] truncate">{JSON.stringify(tool.args)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review Drawer - Shown ONLY if actual files were modified */}
                  {changedFiles.length > 0 && (
                    <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-white font-medium">
                          {changedFiles.length} file{changedFiles.length > 1 ? 's' : ''} modified
                        </span>
                        <ChevronRight size={13} className="text-[#858585]" />
                      </div>
                      <button 
                        onClick={onOpenReview}
                        className="px-2.5 py-1 rounded bg-[#2a2d2e] text-white text-xs font-medium hover:bg-[#383b3d] border border-[#3c3c3c] transition"
                      >
                        Review
                      </button>
                    </div>
                  )}

                  {/* Feedback icons */}
                  {!msg.isStreaming && msg.content && (
                    <div className="flex items-center justify-end gap-3 pt-1 text-[#666666] text-xs">
                      <span>just now</span>
                      <button className="hover:text-white transition"><ThumbsUp size={12} /></button>
                      <button className="hover:text-white transition"><ThumbsDown size={12} /></button>
                      <button className="hover:text-white transition"><RotateCcw size={12} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Antigravity Input Box */}
      <div className="p-3 bg-[#181818]">
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] focus-within:border-[#404040] rounded-xl p-3 shadow-lg flex flex-col justify-between min-h-[95px]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything, @ to mention, / for actions"
            rows={2}
            className="w-full bg-transparent text-[13px] text-white placeholder-[#666666] focus:outline-none resize-none font-sans"
          />

          <div className="flex items-center justify-between pt-2 text-xs relative">
            <button className="text-[#858585] hover:text-white p-1 rounded hover:bg-[#2a2d2e] transition" title="Add Context">
              <Plus size={15} />
            </button>

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(prev => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-transparent hover:bg-[#2a2d2e] text-[#999999] hover:text-white transition text-xs font-medium"
              >
                <span>{modelConfig.model === 'antigravity-local' ? 'Antigravity Local AI (Zero API)' : modelConfig.model === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash Low' : modelConfig.model}</span>
                <ChevronDown size={12} />
              </button>

              {showModelMenu && (
                <div className="absolute bottom-8 left-0 w-64 bg-[#252526] border border-[#383838] rounded-lg shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-[10px] uppercase font-mono text-[#007acc] font-bold">Built-in (Zero API Required)</div>
                  <button
                    onClick={() => {
                      setModelConfig({ provider: 'gemini', model: 'antigravity-local' });
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#094771] flex items-center justify-between ${
                      modelConfig.model === 'antigravity-local' ? 'text-white font-medium bg-[#094771]/50' : 'text-[#cccccc]'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">Antigravity Local AI</span>
                      <div className="text-[10px] text-[#858585]">100% Free • Unlimited • No API key</div>
                    </div>
                    {modelConfig.model === 'antigravity-local' && <Check size={12} />}
                  </button>

                  <div className="px-3 py-1 text-[10px] uppercase font-mono text-[#777777] border-t border-[#383838] mt-1">Google Gemini Cloud</div>
                  <button
                    onClick={() => {
                      setModelConfig({ provider: 'gemini', model: 'gemini-3.8-flash' });
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#094771] flex items-center justify-between ${
                      modelConfig.model === 'gemini-3.8-flash' ? 'text-white font-medium' : 'text-[#cccccc]'
                    }`}
                  >
                    <span>Gemini 3.8 Flash Low</span>
                    {modelConfig.model === 'gemini-3.8-flash' && <Check size={12} />}
                  </button>

                  <button
                    onClick={() => {
                      setModelConfig({ provider: 'gemini', model: 'gemini-2.0-flash' });
                      setShowModelMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#094771] text-[#cccccc]"
                  >
                    <span>Gemini 2.0 Flash</span>
                  </button>

                  <div className="px-3 py-1 text-[10px] uppercase font-mono text-[#777777] border-t border-[#383838] mt-1">Ollama Local</div>
                  <button
                    onClick={() => {
                      setModelConfig({ provider: 'ollama', model: 'deepseek-r1:latest' });
                      setShowModelMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#094771] text-[#cccccc]"
                  >
                    <span>DeepSeek-R1 (Local)</span>
                  </button>
                  <button
                    onClick={() => {
                      setModelConfig({ provider: 'ollama', model: 'qwen2.5-coder:latest' });
                      setShowModelMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#094771] text-[#cccccc]"
                  >
                    <span>Qwen 2.5 Coder (Local)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Circular Send Arrow */}
            <button
              onClick={handleSend}
              disabled={isAgentRunning || !input.trim()}
              className="w-6 h-6 rounded-full bg-[#2d2d2d] hover:bg-[#404040] disabled:opacity-40 text-white flex items-center justify-center transition"
            >
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
