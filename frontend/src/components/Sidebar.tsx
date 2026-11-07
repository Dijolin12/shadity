import React from 'react';
import { useIdeStore } from '../stores/useIdeStore';
import { 
  Files, 
  Search, 
  GitBranch, 
  Clock, 
  Sliders
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeSidebarView, setActiveSidebarView } = useIdeStore();

  const navItems = [
    { id: 'files', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'history', icon: Clock, label: 'Timeline & History' },
  ] as const;

  return (
    <aside className="w-12 bg-ide-sidebar border-r border-ide-border flex flex-col justify-between items-center py-2 shrink-0">
      <div className="flex flex-col gap-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSidebarView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarView(item.id)}
              className={`p-2.5 rounded-lg transition relative group ${
                isActive ? 'text-white bg-ide-active' : 'text-ide-muted hover:text-white hover:bg-ide-hover'
              }`}
              title={item.label}
            >
              <Icon size={18} />
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-accent rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      <div>
        <button
          onClick={() => setActiveSidebarView('settings')}
          className={`p-2.5 rounded-lg transition ${
            activeSidebarView === 'settings' 
              ? 'text-white bg-ide-active' 
              : 'text-ide-muted hover:text-white hover:bg-ide-hover'
          }`}
          title="Settings"
        >
          <Sliders size={18} />
        </button>
      </div>
    </aside>
  );
};

