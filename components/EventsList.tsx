
import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { Event, ViewType } from '../types';
import { DEFAULT_TAGS } from '../constants';
import { format, isBefore } from 'date-fns';
import { Calendar as CalendarIcon, Search, Plus, Trash2, Repeat } from 'lucide-react';

export const EventsList = () => {
    const { events, searchQuery, setSelectedEventId, setCurrentView, deleteEvent, tags } = useStore();
    const [filterRecurrence, setFilterRecurrence] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

    // Grouping Logic
    const getDisplayedEvents = () => {
        let list = [...events];

        // Search Filter (Title or Tags)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchingTagIds = tags.filter(t => t.name.toLowerCase().includes(query)).map(t => t.id);
            
            list = list.filter(e => 
                e.title.toLowerCase().includes(query) || 
                e.description?.toLowerCase().includes(query) ||
                e.tags.some(tId => matchingTagIds.includes(tId))
            );
        }

        // Recurrence Filter
        if (filterRecurrence !== 'all') {
            list = list.filter(e => e.recurrence === filterRecurrence);
            
            // Deduplicate for view
            const seenGroups = new Set();
            list = list.filter(e => {
                if (e.recurringEventId) {
                    if (seenGroups.has(e.recurringEventId)) return false;
                    seenGroups.add(e.recurringEventId);
                    return true;
                }
                return true;
            });
        }

        // Sort by date
        return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    };

    const displayedEvents = getDisplayedEvents();

    const handleEdit = (ev: Event) => {
        setSelectedEventId(ev.id);
        setCurrentView(ViewType.EVENT_EDIT);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this event?")) {
            deleteEvent(id);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">All Events</h2>
                <button 
                    onClick={() => { setSelectedEventId(null); setCurrentView(ViewType.EVENT_EDIT); }}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                >
                    <Plus size={18} /> New Event
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {(['all', 'daily', 'weekly', 'monthly'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilterRecurrence(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors
                            ${filterRecurrence === f 
                                ? 'bg-primary text-white border-primary' 
                                : 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {displayedEvents.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No events found.</p>
                    </div>
                ) : (
                    displayedEvents.map(ev => {
                        const date = new Date(ev.startTime);
                        const isPast = isBefore(date, new Date());
                        
                        return (
                            <div 
                                key={ev.id} 
                                onClick={() => handleEdit(ev)}
                                className={`flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary/50 cursor-pointer transition-colors group ${isPast ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-xs uppercase font-bold text-gray-500">{format(date, 'MMM')}</span>
                                    <span className="text-xl font-bold text-primary">{format(date, 'd')}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary">{ev.title}</h3>
                                        {ev.recurringEventId && filterRecurrence !== 'all' && (
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded font-medium">SERIES</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <span>{format(date, 'EEEE, h:mm a')}</span>
                                        {ev.recurrence !== 'none' && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 px-1.5 rounded capitalize flex items-center gap-1">
                                                <Repeat size={10}/> {ev.recurrence}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 items-center">
                                    <div className="flex gap-1">
                                        {ev.tags.map(tId => {
                                            const tag = tags.find(t => t.id === tId);
                                            return tag ? <div key={tId} className="w-3 h-3 rounded-full" style={{backgroundColor: tag.color}} title={tag.name}/> : null;
                                        })}
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(e, ev.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
