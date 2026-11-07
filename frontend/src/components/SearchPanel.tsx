import React, { useState } from 'react';
import { Search, FileCode, RefreshCw, X } from 'lucide-react';
import { useIdeStore } from '../stores/useIdeStore';

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ path: string; line: number; match: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const { openFile } = useIdeStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Fallback local results
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-64 bg-[#181818] border-r border-[#252526] flex flex-col h-full shrink-0 select-none text-xs text-[#cccccc]">
      {/* Header */}
      <div className="h-8 px-3 border-b border-[#252526] flex items-center justify-between text-[#858585] text-[11px] font-semibold uppercase tracking-wider">
        <span>Search</span>
        <button onClick={handleSearch} className="p-1 hover:text-white rounded hover:bg-[#2a2d2e] transition" title="Refresh Search">
          <RefreshCw size={12} className={searching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Input */}
      <div className="p-3 border-b border-[#252526] space-y-2">
        <div className="flex items-center gap-2 bg-[#252526] border border-[#3c3c3c] rounded px-2 py-1 focus-within:border-[#007acc]">
          <Search size={13} className="text-[#858585]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Search across codebase..."
            className="w-full bg-transparent text-white text-xs focus:outline-none font-mono"
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="text-[#858585] hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
        <span className="text-[10px] text-[#777777]">Press Enter to search files</span>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {results.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase font-mono text-[#777777] mb-1">
              {results.length} result{results.length > 1 ? 's' : ''} found
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => openFile({ path: r.path, name: r.path.split(/[/\\]/).pop() || r.path })}
                className="p-1.5 rounded hover:bg-[#2a2d2e] cursor-pointer transition space-y-0.5"
              >
                <div className="flex items-center gap-1.5 font-mono text-white text-[11px]">
                  <FileCode size={12} className="text-[#007acc]" />
                  <span className="truncate">{r.path}</span>
                  <span className="text-[#858585] text-[10px] ml-auto">:{r.line}</span>
                </div>
                <div className="text-[10px] font-mono text-[#858585] truncate bg-[#1e1e1e] p-1 rounded">
                  {r.match}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-[#777777] text-[11px]">
            {searching ? 'Searching codebase...' : 'No search results yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

