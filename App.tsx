import React, { useState, useEffect } from 'react';
import { AppProvider, useStore } from './context/Store';
import { Sidebar, MobileNav, MobileDrawer } from './components/Sidebar';
import { NotesList } from './components/NoteEditor';
import { CalendarViews } from './components/CalendarViews';
import { TodoView } from './components/TodoView';
import { RoutineBuilder } from './components/RoutineBuilder';
import { SettingsView } from './components/SettingsView';
import { EventsList } from './components/EventsList';
import { EventEditor } from './components/EventEditor';
import { ToastContainer } from './components/ToastContainer';
import { Auth } from './components/Auth';
import { ViewType } from './types';
import { Search, Menu } from 'lucide-react';
import { THEMES } from './constants';

const MainContent = () => {
  const { currentView, searchQuery, setSearchQuery, user } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <Auth />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewType.NOTES: return <NotesList />;
      case ViewType.TODAY: return <CalendarViews view="today" />;
      case ViewType.CALENDAR: return <CalendarViews view="month" />;
      case ViewType.EVENTS: return <EventsList />;
      case ViewType.TODOS: return <TodoView />;
      case ViewType.ROUTINES: return <RoutineBuilder />;
      case ViewType.SETTINGS: return <SettingsView />;
      case ViewType.EVENT_EDIT: return <EventEditor />;
      default: return <div className="p-10">View not found</div>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden relative">
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 md:px-8 bg-surface-light dark:bg-surface-dark gap-4">
         <button className="md:hidden p-2 -ml-2 text-text-secondary hover:text-primary" onClick={() => setIsMobileMenuOpen(true)}>
             <Menu size={24} />
         </button>
         <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentView}...`}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
         </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {renderView()}
      </main>
      
      <MobileNav />
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="flex h-screen w-screen overflow-hidden text-text-primary dark:text-text-darkPrimary">
        <MainContentWrapper />
      </div>
    </AppProvider>
  );
}

const MainContentWrapper = () => {
    const { user, settings } = useStore();

    // Apply Theme Effect
    useEffect(() => {
        const theme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];
        const root = document.documentElement;
        
        // Update CSS Variables
        const isDark = settings.theme === 'dark' ||
                      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.style.setProperty('--color-primary', isDark ? theme.colors.primaryDark : theme.colors.primary);
        root.style.setProperty('--color-bg-light', theme.colors.bgLight);
        root.style.setProperty('--color-bg-dark', theme.colors.bgDark);
        root.style.setProperty('--color-surface-light', theme.colors.surfaceLight);
        root.style.setProperty('--color-surface-dark', theme.colors.surfaceDark);
        
        // Handle Dark Mode Class
        const updateDarkMode = () => {
            const isDark = settings.theme === 'dark' || 
                          (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            
            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        updateDarkMode();

        // Listen for system theme changes if in system mode
        if (settings.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateDarkMode();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [settings.themeId, settings.theme]);

    if (!user) return <Auth />;
    return (
        <>
            <Sidebar />
            <MainContent />
        </>
    );
};