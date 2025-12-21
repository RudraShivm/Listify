
import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { 
  addDays, 
  addMonths, 
  addWeeks, 
  endOfMonth, 
  format, 
  isSameDay, 
  isSameMonth, 
  subMonths, 
  isAfter,
  isBefore
} from 'date-fns';
import { Event, ViewType } from '../types';
import { DEFAULT_TAGS } from '../constants';
import { getTagColors, formatTime } from '../utils/appUtils';
import { Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, CheckSquare, BookOpen, List, Grid } from 'lucide-react';

const getStartOfWeek = (date: Date, weekStartsOn: number) => {
    const day = date.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
};

export const CalendarViews = ({ view }: { view: 'today' | 'week' | 'month' | 'year' }) => {
    const { events, dailyTodos, toggleTodo, getTodosForDate, setSelectedEventId, setCurrentView, settings, searchQuery, tags } = useStore();
    
    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentViewMode, setCurrentViewMode] = useState<'month' | 'week'>('month');
    const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    // Helpers based on settings
    const weekStartMap = { 'sunday': 0, 'monday': 1, 'saturday': 6 };
    const weekStartIndex = weekStartMap[settings.startOfWeek];
    const is24h = settings.timeFormat === '24h';

    // Filter events by search query if present
    const filteredEvents = events.filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        
        // Find matching tag IDs
        const matchingTagIds = tags.filter(t => t.name.toLowerCase().includes(q)).map(t => t.id);

        return e.title.toLowerCase().includes(q) || 
               e.description?.toLowerCase().includes(q) ||
               e.tags.some(tId => matchingTagIds.includes(tId));
    });

    const openEditPage = (event: Event) => {
        setSelectedEventId(event.id);
        setCurrentView(ViewType.EVENT_EDIT);
    };

    const handleCreate = (type: 'event' | 'note' | 'todo') => {
        if (type === 'event') {
            setSelectedEventId(null);
            setCurrentView(ViewType.EVENT_EDIT);
        }
        if (type === 'note') setCurrentView(ViewType.NOTES);
        if (type === 'todo') setCurrentView(ViewType.TODOS);
        setShowCreateMenu(false);
    };

    const renderToday = () => {
        const today = new Date();
        const dateKey = format(today, 'yyyy-MM-dd');
        // Use filteredEvents
        const todaysEvents = filteredEvents.filter(e => isSameDay(new Date(e.startTime), today));
        const todaysTodos = getTodosForDate(dateKey);
        
        const upcomingLimit = addDays(today, settings.upcomingWindow);
        const upcomingEvents = filteredEvents.filter(e => {
            const date = new Date(e.startTime);
            return isAfter(date, today) && isBefore(date, upcomingLimit);
        }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return (
            <div className="max-w-3xl mx-auto h-full flex flex-col relative">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">
                        Today, {format(today, 'MMMM do')}
                    </h2>
                    <div className="relative">
                        <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <Plus size={20} />
                        </button>
                        {showCreateMenu && (
                            <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-48 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => handleCreate('event')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><CalendarIcon size={16}/> Event</button>
                                <button onClick={() => handleCreate('note')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><BookOpen size={16}/> Note</button>
                                <button onClick={() => handleCreate('todo')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><CheckSquare size={16}/> Task</button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-8 pb-20">
                    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                         <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider mb-4 flex items-center gap-2"><CheckSquare size={14}/> Today's Tasks</h3>
                         {todaysTodos.length === 0 ? (
                             <p className="text-sm text-gray-400 italic">No tasks for today.</p>
                         ) : (
                             <div className="space-y-2">
                                 {todaysTodos.map(todo => (
                                     <div key={todo.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                         <button onClick={() => toggleTodo(dateKey, todo.id)} className={`text-gray-400 hover:text-primary ${todo.isCompleted ? 'text-primary' : ''}`}>
                                             {todo.isCompleted ? <CheckSquare size={20}/> : <div className="w-5 h-5 border-2 border-gray-300 rounded"/>}
                                         </button>
                                         <span className={todo.isCompleted ? 'line-through text-gray-400' : ''}>{todo.text}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider ml-2 flex items-center gap-2"><CalendarIcon size={14}/> Schedule</h3>
                        {todaysEvents.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                {searchQuery ? 'No matching events today.' : 'Nothing scheduled today.'}
                            </div>
                        ) : (
                            todaysEvents.map(ev => (
                                <div key={ev.id} onClick={() => openEditPage(ev)} className="flex gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="text-center w-16">
                                        <div className="text-lg font-bold text-text-primary dark:text-text-darkPrimary">
                                            {is24h ? format(new Date(ev.startTime), 'HH:mm') : format(new Date(ev.startTime), 'h:mm')}
                                        </div>
                                        {!is24h && <div className="text-xs text-text-secondary">{format(new Date(ev.startTime), 'a')}</div>}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg text-text-primary dark:text-text-darkPrimary">{ev.title}</h3>
                                        <div className="flex gap-1 mt-1">
                                            {ev.tags.map(tId => {
                                                const tag = tags.find(t => t.id === tId);
                                                return tag ? <span key={tId} className="w-2 h-2 rounded-full" style={{backgroundColor: tag.color}} /> : null;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                         <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider ml-2 flex items-center gap-2"><List size={14}/> Upcoming ({settings.upcomingWindow} Days)</h3>
                         {upcomingEvents.length === 0 ? (
                             <p className="ml-2 text-sm text-gray-400 italic">No upcoming events.</p>
                         ) : (
                             upcomingEvents.map(ev => (
                                <div key={ev.id} onClick={() => openEditPage(ev)} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                                    <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-gray-500">
                                        <span className="text-[10px] uppercase font-bold">{format(new Date(ev.startTime), 'MMM')}</span>
                                        <span className="text-sm font-bold text-primary">{format(new Date(ev.startTime), 'd')}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{ev.title}</h4>
                                        <p className="text-xs text-gray-400">{format(new Date(ev.startTime), 'EEEE')} at {formatTime(ev.startTime, is24h)}</p>
                                    </div>
                                </div>
                             ))
                         )}
                    </div>
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        // Calculate dynamic week start using local helper
        const dynamicStartOfWeek = (date: Date) => getStartOfWeek(date, weekStartIndex);

        return (
            <div className="h-full flex flex-col relative">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setCurrentDate(currentViewMode === 'month' ? subMonths(currentDate, 1) : addWeeks(currentDate, -1))} 
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            <button 
                                onClick={() => setCurrentDate(currentViewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} 
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
                            >
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                        <h2 className="text-xl font-semibold">
                            {currentViewMode === 'month' ? format(currentDate, 'MMMM yyyy') : `Week of ${format(dynamicStartOfWeek(currentDate), 'MMM do')}`}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <button onClick={() => setCurrentViewMode('month')} className={`px-3 py-1 text-xs font-medium rounded ${currentViewMode === 'month' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Month</button>
                            <button onClick={() => setCurrentViewMode('week')} className={`px-3 py-1 text-xs font-medium rounded ${currentViewMode === 'week' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Week</button>
                        </div>
                        <button onClick={() => { setSelectedEventId(null); setCurrentView(ViewType.EVENT_EDIT); }} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {currentViewMode === 'month' ? renderMonthGrid() : renderWeekGrid()}

                {/* Detail Modal for Day (Shared) */}
                {dayViewDate && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex justify-center items-center z-10 p-4">
                        <div className="bg-surface-light dark:bg-surface-dark w-full max-w-md max-h-[80%] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-semibold">{format(dayViewDate, 'EEEE, MMMM do')}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedEventId(null); setCurrentView(ViewType.EVENT_EDIT); }} className="p-1 hover:bg-gray-100 rounded text-primary"><Plus size={20}/></button>
                                    <button onClick={() => setDayViewDate(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><X size={20}/></button>
                                </div>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 space-y-2">
                                {filteredEvents.filter(e => isSameDay(new Date(e.startTime), dayViewDate)).length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">No matching events on this day.</p>
                                ) : (
                                    filteredEvents.filter(e => isSameDay(new Date(e.startTime), dayViewDate))
                                    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                    .map(ev => (
                                        <div key={ev.id} onClick={() => openEditPage(ev)} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-primary">
                                            <div className="flex justify-between">
                                                <span className="font-medium">{ev.title}</span>
                                                <span className="text-xs text-gray-500">{formatTime(ev.startTime, is24h)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMonthGrid = () => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonthDate = endOfMonth(currentDate);
        const days = [];
        // Calculate start based on user setting using local helper
        let day = getStartOfWeek(startOfMonth, weekStartIndex);

        // Fill grid
        while (day <= endOfMonthDate || days.length % 7 !== 0) {
            days.push(day);
            day = addDays(day, 1);
        }

        // Generate day headers based on start day
        const dayHeaders = Array.from({length: 7}, (_, i) => format(addDays(days[0], i), 'EEE'));

        return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 flex-1">
                {dayHeaders.map(d => (
                    <div key={d} className="bg-surface-light dark:bg-surface-dark p-2 text-center text-xs font-semibold text-gray-500">
                        {d}
                    </div>
                ))}
                {days.map((d, i) => {
                    const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.startTime), d));
                    const colors = [...new Set(dayEvents.flatMap(e => getTagColors(e.tags, tags)))];
                    const isToday = isSameDay(d, new Date());
                    
                    let backgroundStyle = {};
                    if (colors.length > 0) {
                        backgroundStyle = { background: colors.length === 1 ? `${colors[0]}20` : `linear-gradient(135deg, ${colors.map(c => `${c}30`).join(', ')})` };
                    }

                    return (
                        <div 
                            key={i} 
                            onClick={() => setDayViewDate(d)}
                            className={`min-h-[80px] bg-surface-light dark:bg-surface-dark p-2 relative transition-colors hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer ${!isSameMonth(d, currentDate) ? 'opacity-40' : ''}`}
                            style={backgroundStyle}
                        >
                            <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary font-bold bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                                {format(d, 'd')}
                            </div>
                            {dayEvents.length > 0 && (
                                <div className="absolute bottom-2 right-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shadow-sm">
                                        {dayEvents.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    const renderWeekGrid = () => {
        // Use local helper
        const start = getStartOfWeek(currentDate, weekStartIndex);
        const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

        return (
            <div className="flex-1 bg-surface-light dark:bg-surface-dark rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
                    {days.map(d => {
                        const isToday = isSameDay(d, new Date());
                        return (
                            <div key={d.toString()} className={`p-3 text-center border-r border-gray-100 dark:border-gray-800 last:border-0 ${isToday ? 'bg-primary/5' : ''}`}>
                                <div className="text-xs text-gray-500 font-medium">{format(d, 'EEE')}</div>
                                <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>{format(d, 'd')}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-7 gap-2 h-full min-h-[300px]">
                        {days.map(d => {
                            const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.startTime), d))
                                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                            
                            return (
                                <div key={d.toString()} className="space-y-2 py-2 border-r border-gray-100 dark:border-gray-800 last:border-0 h-full">
                                    {dayEvents.map(ev => (
                                        <div 
                                            key={ev.id} 
                                            onClick={() => openEditPage(ev)}
                                            className="p-2 rounded bg-primary/10 border-l-2 border-primary text-xs cursor-pointer hover:opacity-80 truncate"
                                        >
                                            <div className="font-semibold truncate">{ev.title}</div>
                                            <div className="opacity-70">{formatTime(ev.startTime, is24h)}</div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'today') return renderToday();
    return renderCalendar();
};
