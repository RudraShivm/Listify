import React from 'react';
import { useStore } from '../context/Store';
import { ViewType } from '../types';
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Settings, 
  Repeat, 
  Sun,
  Layout,
  List,
  X,
  LogOut,
  RefreshCw
} from 'lucide-react';

export const NAV_ITEMS = [
  { view: ViewType.NOTES, icon: BookOpen, label: "Notes" },
  { view: ViewType.TODAY, icon: Sun, label: "Today" },
  { view: ViewType.CALENDAR, icon: Calendar, label: "Calendar" },
  { view: ViewType.EVENTS, icon: List, label: "Events List" },
  { view: ViewType.TODOS, icon: CheckSquare, label: "Todos" },
  { view: ViewType.ROUTINES, icon: Repeat, label: "Routines" },
];

interface NavItemProps {
  view: ViewType;
  icon: any;
  label: string;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, icon: Icon, label, onClick }) => {
  const { currentView, setCurrentView } = useStore();
  const isActive = currentView === view;
  
  const handleClick = () => {
      setCurrentView(view);
      if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full group
        ${isActive 
          ? 'bg-primary/10 text-primary dark:text-primary-light font-medium' 
          : 'text-text-secondary dark:text-text-darkSecondary hover:bg-black/5 dark:hover:bg-white/5'
        }`}
    >
      <Icon size={20} className={isActive ? 'stroke-2' : 'stroke-1.5'} />
      <span className="text-sm">{label}</span>
    </button>
  );
};

export const Sidebar = () => {
  const { isFocusModeActive, user, signOut, isSyncing } = useStore();

  return (
    <div 
        className={`w-64 h-full bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-800 flex flex-col hidden md:flex transition-all duration-500 ease-in-out ${isFocusModeActive ? '-ml-64 opacity-50' : 'ml-0 opacity-100'}`}
    >
      <div className="p-6">
        <h1 className="text-xl font-semibold text-primary dark:text-primary-light flex items-center gap-2">
          <Layout className="w-6 h-6" />
          Listify
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map(item => (
            <NavItem 
              key={item.view} 
              view={item.view} 
              icon={item.icon} 
              label={item.label} 
            />
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <NavItem view={ViewType.SETTINGS} icon={Settings} label="Settings" />
        
        {user && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Synchronized as</span>
                        <span className="text-xs font-medium truncate w-32">{user.email}</span>
                    </div>
                    {isSyncing ? (
                        <RefreshCw size={14} className="animate-spin text-primary" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-green-500" title="Synced" />
                    )}
                </div>
                <button 
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 transition-colors w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"
                >
                    <LogOut size={14} />
                    Sign Out
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export const MobileNav = () => {
    const { setCurrentView, currentView, isFocusModeActive, settings } = useStore();
    const activeItems = settings.mobileBottomBarItems
        .map(view => NAV_ITEMS.find(item => item.view === view))
        .filter(item => item !== undefined) as typeof NAV_ITEMS;

    if (isFocusModeActive) return null;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-50 pb-safe">
            {activeItems.map(({ view, icon: Icon }) => (
                <button 
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`p-2 rounded-full ${currentView === view ? 'text-primary dark:text-primary-light bg-primary/10' : 'text-text-secondary'}`}
                >
                    <Icon size={24} />
                </button>
            ))}
        </div>
    );
};

export const MobileDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { user, signOut, isSyncing } = useStore();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
            <div className="relative w-72 h-full bg-surface-light dark:bg-surface-dark shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
                    <h1 className="text-xl font-semibold text-primary dark:text-primary-light flex items-center gap-2">
                        <Layout className="w-6 h-6" />
                        Listify
                    </h1>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => (
                        <NavItem key={item.view} view={item.view} icon={item.icon} label={item.label} onClick={onClose} />
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                    <NavItem view={ViewType.SETTINGS} icon={Settings} label="Settings" onClick={onClose} />
                    {user && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between">
                            <span className="text-xs truncate">{user.email}</span>
                            <button onClick={() => signOut()} className="text-red-500"><LogOut size={18} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
