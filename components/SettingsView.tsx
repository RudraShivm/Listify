
import React, { useRef, useState } from 'react';
import { useStore } from '../context/Store';
import { Download, Upload, Monitor, Database, Trash2, Calendar, Coffee, Layout, Smartphone, GripVertical, Palette, AlertCircle, Check } from 'lucide-react';
import { ViewType } from '../types';
import { NAV_ITEMS } from './Sidebar';
import { THEMES } from '../constants';

export const SettingsView = () => {
    const { settings, setSettings, exportData, importBackup, clearData, user, isSyncing } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                importBackup(ev.target.result as string);
            }
        };
        reader.readAsText(file);
    };

    const handleToggleMobileItem = (view: ViewType) => {
        let newItems = [...settings.mobileBottomBarItems];
        if (newItems.includes(view)) {
            newItems = newItems.filter(v => v !== view);
        } else {
            newItems.push(view);
        }
        setSettings({ ...settings, mobileBottomBarItems: newItems });
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag styling hack
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItemIndex(null);
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;

        const newItems = [...settings.mobileBottomBarItems];
        const draggedItem = newItems[draggedItemIndex];
        newItems.splice(draggedItemIndex, 1);
        newItems.splice(index, 0, draggedItem);

        setSettings({ ...settings, mobileBottomBarItems: newItems });
        setDraggedItemIndex(index);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-10 pb-32 animate-in fade-in duration-500">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-text-primary dark:text-text-darkPrimary">Settings</h2>
                <p className="text-gray-500 mt-2">Personalize your workspace and manage your data.</p>
            </header>

            {/* Visuals & Theme */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Palette size={20} className="text-primary"/> Personalization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Mode */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <label className="block text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Appearance</label>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            {(['light', 'dark', 'system'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setSettings({...settings, theme: mode})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                                        settings.theme === mode 
                                        ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Theme Picker */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <label className="block text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Color Theme</label>
                        <div className="grid grid-cols-3 gap-3">
                            {THEMES.map(theme => {
                                const isActive = settings.themeId === theme.id;
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSettings({ ...settings, themeId: theme.id })}
                                        className={`relative h-12 rounded-lg overflow-hidden flex items-center justify-center transition-all ${isActive ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-105' : 'hover:scale-105'}`}
                                        title={theme.name}
                                    >
                                        <div className="absolute inset-0 flex">
                                            <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${theme.colors.bgLight})` }}></div>
                                            <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${theme.colors.bgDark})` }}></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: `rgb(${theme.colors.primary})` }}></div>
                                        </div>
                                        {isActive && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-white/10">
                                                <Check size={16} className="text-white drop-shadow-md"/>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

             {/* Workflow Configuration */}
             <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Layout size={20} className="text-primary"/> Workflow
                </h3>
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Default View */}
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">Default Launch View</label>
                            <p className="text-xs text-gray-500 mb-3">Which screen should open first?</p>
                            <select 
                                value={settings.defaultView} 
                                onChange={(e) => setSettings({...settings, defaultView: e.target.value as ViewType})}
                                className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm"
                            >
                                <option value={ViewType.NOTES}>Notes</option>
                                <option value={ViewType.TODAY}>Today (Dashboard)</option>
                                <option value={ViewType.CALENDAR}>Calendar</option>
                                <option value={ViewType.TODOS}>Todos</option>
                            </select>
                        </div>

                         {/* Upcoming Window */}
                         <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">Upcoming Events Window</label>
                            <p className="text-xs text-gray-500 mb-3">Show events for the next {settings.upcomingWindow} days.</p>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="14" 
                                    value={settings.upcomingWindow}
                                    onChange={(e) => setSettings({...settings, upcomingWindow: Number(e.target.value)})}
                                    className="flex-1 accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <span className="font-mono font-bold text-primary w-8 text-center bg-primary/10 rounded px-1">{settings.upcomingWindow}</span>
                            </div>
                        </div>

                        {/* Start of Week */}
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 block">Start of Week</label>
                            <div className="flex gap-2">
                                {(['sunday', 'monday', 'saturday'] as const).map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSettings({...settings, startOfWeek: day})}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-colors ${
                                            settings.startOfWeek === day 
                                            ? 'bg-primary/10 text-primary border-primary' 
                                            : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Format */}
                        <div>
                             <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 block">Time Format</label>
                             <div className="flex gap-2">
                                <button
                                    onClick={() => setSettings({...settings, timeFormat: '12h'})}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium ${settings.timeFormat === '12h' ? 'bg-primary/10 text-primary border-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                    12h (1:00 PM)
                                </button>
                                <button
                                    onClick={() => setSettings({...settings, timeFormat: '24h'})}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium ${settings.timeFormat === '24h' ? 'bg-primary/10 text-primary border-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                    24h (13:00)
                                </button>
                             </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 space-y-3">
                         {/* Switches */}
                         <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${settings.focusMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.focusMode ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={settings.focusMode} onChange={(e) => setSettings({...settings, focusMode: e.target.checked})} />
                            <div className="flex-1">
                                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Auto-Focus Mode</span>
                                <span className="block text-xs text-gray-500">Hide navigation sidebar when typing in notes.</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${settings.createHolidayEvents ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.createHolidayEvents ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={settings.createHolidayEvents} onChange={(e) => setSettings({...settings, createHolidayEvents: e.target.checked})} />
                            <div className="flex-1">
                                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Holiday Events</span>
                                <span className="block text-xs text-gray-500">Create actual calendar events for routine holidays.</span>
                            </div>
                        </label>

                         <label className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${settings.moveCompletedTodosToBottom ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.moveCompletedTodosToBottom ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={settings.moveCompletedTodosToBottom} onChange={(e) => setSettings({...settings, moveCompletedTodosToBottom: e.target.checked})} />
                            <div className="flex-1">
                                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Organize Todos</span>
                                <span className="block text-xs text-gray-500">Automatically move completed tasks to the bottom.</span>
                            </div>
                        </label>
                    </div>
                </div>
            </section>

            {/* Mobile Navigation (Only visible on mobile) */}
            <section className="md:hidden space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Smartphone size={20} className="text-primary"/> Mobile Menu
                </h3>
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <p className="text-sm text-gray-500 mb-4">Customize your bottom bar (Drag to reorder).</p>
                    
                    {/* Active Items */}
                    <div className="space-y-2 mb-6">
                        {settings.mobileBottomBarItems.map((viewType, index) => {
                            const item = NAV_ITEMS.find(i => i.view === viewType);
                            if (!item) return null;
                            return (
                                <div 
                                    key={viewType}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-move ${draggedItemIndex === index ? 'opacity-50 border-dashed border-primary' : ''}`}
                                >
                                    <GripVertical size={16} className="text-gray-400"/>
                                    <div className="p-1 bg-white dark:bg-gray-700 rounded shadow-sm">
                                        <item.icon size={16} className="text-primary"/>
                                    </div>
                                    <span className="text-sm font-medium flex-1">{item.label}</span>
                                    <button 
                                        onClick={() => handleToggleMobileItem(viewType)}
                                        className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Inactive Items */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                         <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Available Items</p>
                         <div className="space-y-2">
                            {NAV_ITEMS.filter(i => !settings.mobileBottomBarItems.includes(i.view)).map(item => (
                                <div key={item.view} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 opacity-70 hover:opacity-100">
                                    <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded">
                                        <item.icon size={16} className="text-gray-500"/>
                                    </div>
                                    <span className="text-sm font-medium flex-1 text-gray-500">{item.label}</span>
                                    <button 
                                        onClick={() => handleToggleMobileItem(item.view)}
                                        className="text-xs text-primary px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Data Management */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Database size={20} className="text-primary"/> Data Management
                </h3>
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex flex-col gap-4">
                        {/* Redesigned Import/Export Buttons */}
                        <div className="grid grid-cols-1 gap-4">
                            <button 
                                onClick={exportData}
                                className="group flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
                            >
                                <div className="text-primary mb-1">
                                    <Download size={28}/>
                                </div>
                                <div>
                                    <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">Export Data</div>
                                    <div className="text-sm text-gray-500">Download JSON backup</div>
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="group flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
                            >
                                <div className="text-primary mb-1">
                                    <Upload size={28}/>
                                </div>
                                <div>
                                    <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">Import Data</div>
                                    <div className="text-sm text-gray-500">Restore from JSON</div>
                                </div>
                            </button>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileImport} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                        {/* Clear All Data - deletes from Supabase */}
                        {user && (
                            <div>
                                <button
                                    type="button"
                                    onClick={clearData}
                                    disabled={isSyncing}
                                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={20} />
                                    <span className="font-semibold text-lg">
                                        {isSyncing ? 'Deleting...' : 'Clear All Account Data'}
                                    </span>
                                </button>
                                <p className="text-center text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                                    <AlertCircle size={12}/>
                                    Permanently delete all account data from our servers.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};
