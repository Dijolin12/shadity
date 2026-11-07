import React from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { 
  Files, 
  Search, 
  GitBranch, 
  PlayCircle,
  LayoutGrid,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeSidebarView, setActiveSidebarView } = useIdeStore();

  const handleNav = (view: 'files' | 'search' | 'git' | 'settings') => {
    setActiveSidebarView(view);
  };

  return (
    <aside className="w-12 bg-[#181818] border-r border-[#252526] flex flex-col justify-between items-center py-2 shrink-0 select-none">
      <div className="flex flex-col gap-2">
        {/* Explorer */}
        <button
          onClick={() => handleNav('files')}
          className={`p-2.5 rounded transition relative group ${
            activeSidebarView === 'files' ? 'text-white' : 'text-[#858585] hover:text-white'
          }`}
          title="Explorer (Ctrl+Shift+E)"
        >
          <Files size={20} strokeWidth={1.5} />
          {activeSidebarView === 'files' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-white rounded-r" />
          )}
        </button>

        {/* Search */}
        <button
          onClick={() => handleNav('search')}
          className={`p-2.5 rounded transition relative group ${
            activeSidebarView === 'search' ? 'text-white' : 'text-[#858585] hover:text-white'
          }`}
          title="Search (Ctrl+Shift+F)"
        >
          <Search size={20} strokeWidth={1.5} />
          {activeSidebarView === 'search' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-white rounded-r" />
          )}
        </button>

        {/* Source Control */}
        <button
          onClick={() => handleNav('git')}
          className={`p-2.5 rounded transition relative group ${
            activeSidebarView === 'git' ? 'text-white' : 'text-[#858585] hover:text-white'
          }`}
          title="Source Control (Ctrl+Shift+G)"
        >
          <GitBranch size={20} strokeWidth={1.5} />
          {activeSidebarView === 'git' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-white rounded-r" />
          )}
        </button>

        {/* Run & Debug */}
        <button
          onClick={() => handleNav('search')}
          className="p-2.5 rounded text-[#858585] hover:text-white transition"
          title="Run & Debug"
        >
          <PlayCircle size={20} strokeWidth={1.5} />
        </button>

        {/* Extensions */}
        <button
          onClick={() => handleNav('settings')}
          className="p-2.5 rounded text-[#858585] hover:text-white transition"
          title="Extensions & Plugins"
        >
          <LayoutGrid size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div>
        {/* Settings */}
        <button
          onClick={() => handleNav('settings')}
          className={`p-2.5 rounded transition ${
            activeSidebarView === 'settings' 
              ? 'text-white' 
              : 'text-[#858585] hover:text-white'
          }`}
          title="Manage Settings"
        >
          <Settings size={20} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
};
