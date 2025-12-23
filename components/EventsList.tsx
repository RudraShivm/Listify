
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/Store';
import { Event, ViewType } from '../types';
import { DEFAULT_TAGS } from '../constants';
import { format, isBefore, parseISO, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Search, Plus, Trash2, Repeat } from 'lucide-react';
import { DatePicker } from './DatePicker';

export const EventsList = () => {
    const { events, searchQuery, setSelectedEventId, setCurrentView, archiveEvent, archivedEvents, tags, settings, routines } = useStore();
    const [filterRecurrence, setFilterRecurrence] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const [selectedDate, setSelectedDate] = useState('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Scroll to today's events when component mounts
    useEffect(() => {
        // Small delay to ensure events are rendered
        const timer = setTimeout(() => {
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');

            // Find the first event that is today or the closest future event
            const eventElements = document.querySelectorAll('[data-event-date]');
            let targetElement: Element | null = null;

            // First try to find today's events
            targetElement = Array.from(eventElements).find(el =>
                el.getAttribute('data-event-date') === todayStr
            );

            // If no today's events, find the next future event
            if (!targetElement) {
                const futureEvents = Array.from(eventElements).filter(el => {
                    const eventDate = el.getAttribute('data-event-date');
                    return eventDate && eventDate >= todayStr;
                }).sort((a, b) => {
                    const dateA = a.getAttribute('data-event-date')!;
                    const dateB = b.getAttribute('data-event-date')!;
                    return dateA.localeCompare(dateB);
                });

                if (futureEvents.length > 0) {
                    targetElement = futureEvents[0];
                }
            }

            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [events]); // Re-run when events change

    // Grouping Logic
    const getDisplayedEvents = () => {
        let list = [...events];

        // Apply filter chips first
        if (activeFilters.has('moodle')) {
            list = list.filter(e => e.moodleEventId);
        }

        // Advanced Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();

            // Special search syntax: routine:[name] or routine:[name]:[event]
            if (query.startsWith('routine:')) {
                const routineQuery = query.substring(8); // Remove "routine:" prefix
                const [routineName, eventName] = routineQuery.split(':').map(s => s.trim());

                list = list.filter(e => {
                    if (!e.routineId) return false;

                    // Check if routine name matches
                    const routine = routines.find(r => r.id === e.routineId);
                    if (!routine || !routine.name.toLowerCase().includes(routineName)) return false;

                    // If event name is specified, also check event title
                    if (eventName) {
                        return e.title.toLowerCase().includes(eventName);
                    }

                    return true;
                });
            }
            // Moodle search: moodle:[event name]
            else if (query.startsWith('moodle:')) {
                const eventName = query.substring(7).trim(); // Remove "moodle:" prefix
                list = list.filter(e =>
                    e.moodleEventId && e.title.toLowerCase().includes(eventName)
                );
            }
            // Regular search (title, description, tags)
            else {
            const matchingTagIds = tags.filter(t => t.name.toLowerCase().includes(query)).map(t => t.id);
            
            list = list.filter(e => 
                e.title.toLowerCase().includes(query) || 
                e.description?.toLowerCase().includes(query) ||
                e.tags.some(tId => matchingTagIds.includes(tId))
            );
            }
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

        // Date filter - removed, now just scrolls to position

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
        if (window.confirm("Archive this event? It will be moved to archived events where you can restore or permanently delete it later.")) {
            archiveEvent(id);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">All Events</h2>
                    {/* Filter Chips */}
                    {settings.moodleEnabled && (
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    const newFilters = new Set(activeFilters);
                                    if (newFilters.has('moodle')) {
                                        newFilters.delete('moodle');
                                    } else {
                                        newFilters.add('moodle');
                                    }
                                    setActiveFilters(newFilters);
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    activeFilters.has('moodle')
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Moodle Events
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* Date Picker */}
                    <div className="relative">
                        <DatePicker
                            value={selectedDate}
                            onChange={(date) => {
                                if (!date) {
                                    setSelectedDate('');
                                    return;
                                }

                                // Clear any previous date filter
                                setSelectedDate('');

                                // Scroll to events of this date or closest before
                                setTimeout(() => {
                                    const eventElements = document.querySelectorAll('[data-event-date]');
                                    const targetDate = new Date(date);
                                    let closestElement: Element | null = null;
                                    let closestDateDiff = Infinity;

                                    // Find exact date match first
                                    const exactMatch = Array.from(eventElements).find(el =>
                                        el.getAttribute('data-event-date') === date
                                    );

                                    if (exactMatch) {
                                        exactMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        return;
                                    }

                                    // If no exact match, find closest event before the selected date
                                    Array.from(eventElements).forEach(el => {
                                        const eventDateStr = el.getAttribute('data-event-date');
                                        if (eventDateStr) {
                                            const eventDate = new Date(eventDateStr);
                                            const diff = targetDate.getTime() - eventDate.getTime();

                                            // Only consider events before or on the target date
                                            if (diff >= 0 && diff < closestDateDiff) {
                                                closestDateDiff = diff;
                                                closestElement = el;
                                            }
                                        }
                                    });

                                    if (closestElement) {
                                        closestElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }, 100);
                            }}
                            placeholder="Jump to date"
                            className="w-40 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentView(ViewType.EVENT_ARCHIVE)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                        >
                            <Trash2 size={18} />
                            <span className="hidden md:inline">Archived</span>
                        </button>
                <button 
                    onClick={() => { setSelectedEventId(null); setCurrentView(ViewType.EVENT_EDIT); }}
                            className="bg-primary hover:bg-primary-dark text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                >
                            <Plus size={18} />
                            <span className="hidden md:inline">New Event</span>
                </button>
                    </div>
                </div>
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
                                data-event-date={format(date, 'yyyy-MM-dd')}
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
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
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
