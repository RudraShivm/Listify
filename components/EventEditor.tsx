
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/Store';
import { Event, ViewType, Tag, RoutineBreakpoint, Note } from '../types';
import { format, addDays, isBefore, addMinutes, differenceInDays } from 'date-fns';
import {
    X, Clock, Calendar as CalendarIcon, Bell, Repeat,
    Tag as TagIcon, Link, AlertTriangle,
    ChevronLeft, Trash2, Plus, FileText, Search, ArrowRight, Loader2, CheckSquare
} from 'lucide-react';
import { DatePicker } from './DatePicker';
import { generateHolidayEvents, generateEventsFromRecurrence } from '../utils/appUtils';

export const EventEditor = () => {
    const {
        selectedEventId, events, addEvent, addEvents, updateEvent,
        goBack, tags, addTag, deleteEvent, settings, showToast,
        notes, addNote, setSelectedNoteId, setCurrentView,
        draftEvent, setDraftEvent, setSelectedEventId, getReferencingTodos
    } = useStore();

    const existingEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
    const [internalId] = useState(existingEvent?.id || crypto.randomUUID());

    // Form State
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('09:00');
    const [hasEndDate, setHasEndDate] = useState(false);
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endTime, setEndTime] = useState('10:00');
    const [isAllDay, setIsAllDay] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Recurrence State
    const [recurrence, setRecurrence] = useState<Event['recurrence']>('none');
    const [isForever, setIsForever] = useState(true);
    const [recurrenceEnd, setRecurrenceEnd] = useState('');

    // Breakpoints State
    const [breakpoints, setBreakpoints] = useState<RoutineBreakpoint[]>([]);
    const [createEventsForBreakpoints, setCreateEventsForBreakpoints] = useState(settings.createHolidayEvents);
    const [newBpName, setNewBpName] = useState('');
    const [newBpStart, setNewBpStart] = useState('');
    const [newBpEnd, setNewBpEnd] = useState('');

    const [alarmOffset, setAlarmOffset] = useState<number>(-1);
    const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);

    // UI Local State
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#4A5F7A');
    const [showNoteSearch, setShowNoteSearch] = useState(false);
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        if (existingEvent) {
            setTitle(existingEvent.title);
            const start = new Date(existingEvent.startTime);
            setStartDate(format(start, 'yyyy-MM-dd'));
            setStartTime(format(start, 'HH:mm'));

            if (existingEvent.endTime) {
                setHasEndDate(true);
                const end = new Date(existingEvent.endTime);
                setEndDate(format(end, 'yyyy-MM-dd'));
                setEndTime(format(end, 'HH:mm'));
            }

            setIsAllDay(existingEvent.isAllDay);
            setSelectedTags(existingEvent.tags);
            setRecurrence(existingEvent.recurrence || 'none');

            if (existingEvent.recurrenceEnd) {
                setIsForever(false);
                setRecurrenceEnd(format(new Date(existingEvent.recurrenceEnd), 'yyyy-MM-dd'));
            } else {
                setIsForever(true);
            }

            setAlarmOffset(existingEvent.alarmOffset ?? -1);
            setBreakpoints(existingEvent.breakpoints || []);
            setLinkedNoteIds(existingEvent.linkedNoteIds || []);
        } else if (draftEvent && !selectedEventId) {
            setTitle(draftEvent.title || '');
            if (draftEvent.startTime) {
                const s = new Date(draftEvent.startTime);
                setStartDate(format(s, 'yyyy-MM-dd'));
                setStartTime(format(s, 'HH:mm'));
            }
            if (draftEvent.endTime) {
                setHasEndDate(true);
                const e = new Date(draftEvent.endTime);
                setEndDate(format(e, 'yyyy-MM-dd'));
                setEndTime(format(e, 'HH:mm'));
            }
            setIsAllDay(!!draftEvent.isAllDay);
            setSelectedTags(draftEvent.tags || []);
            setRecurrence(draftEvent.recurrence || 'none');
            setLinkedNoteIds(draftEvent.linkedNoteIds || []);
            setDraftEvent(null);
        } else {
            // New defaults
            setTitle('');
            const now = new Date();
            setStartDate(format(now, 'yyyy-MM-dd'));
            setStartTime(format(now, 'HH:mm'));
            setEndDate(format(now, 'yyyy-MM-dd'));
            setEndTime(format(addMinutes(now, settings.defaultEventDuration), 'HH:mm'));
            setHasEndDate(false);
            setRecurrence('none');
            setIsForever(true);
            setSelectedTags([]);
            setBreakpoints([]);
            setLinkedNoteIds([]);
            setCreateEventsForBreakpoints(settings.createHolidayEvents);
        }
    }, [existingEvent, selectedEventId]);

    // Auto-Save Logic
    useEffect(() => {
        if (!title) return; // Don't save empty untitled events

        const timer = setTimeout(() => {
            handleAutoSave();
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, startDate, startTime, endDate, endTime, isAllDay, selectedTags, alarmOffset, linkedNoteIds, breakpoints, createEventsForBreakpoints, recurrence, isForever, recurrenceEnd]);

    const handleAutoSave = () => {
        setIsSaving(true);
        const start = new Date(`${startDate}T${startTime}`);
        let end: Date;
        if (hasEndDate) {
            end = new Date(`${endDate}T${endTime}`);
        } else {
            end = addMinutes(start, settings.defaultEventDuration);
        }

        const baseEvent: Event = {
            id: internalId,
            title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            isAllDay,
            tags: selectedTags,
            linkedNoteIds,
            recurrence,
            recurrenceEnd: !isForever && recurrenceEnd ? new Date(recurrenceEnd).toISOString() : undefined,
            alarmOffset: alarmOffset === -1 ? undefined : alarmOffset,
            routineId: existingEvent?.routineId,
            recurringEventId: existingEvent?.recurringEventId,
            breakpoints: breakpoints
        };

        // If recurrence is active, we need to handle series generation
        if (recurrence !== 'none') {
            const groupId = existingEvent?.recurringEventId || crypto.randomUUID();
            baseEvent.recurringEventId = groupId;

            // Generating series is a heavy operation, doing it on every keystroke (even debounced) is risky.
            // BUT user requested it. We will regenerate the series.
            // First, remove old series events to prevent duplicates.
            // We use deleteEvent logic in store but adapted for bulk.
            if (existingEvent?.recurringEventId) {
                deleteEvent(existingEvent.id, 'all');
            } else if (existingEvent) {
                // Was single, now recurring
                deleteEvent(existingEvent.id, 'single');
            } else {
                // New event, first save might have created a single instance?
                // If internalId exists in events list, delete it.
                deleteEvent(internalId, 'single');
            }

            // Generate new series
            const newSeries = generateEventsFromRecurrence(baseEvent);

            // Also generate holidays if requested
            if (breakpoints.length > 0 && createEventsForBreakpoints) {
                const holidays = generateHolidayEvents(breakpoints);
                addEvents(holidays);
            }

            addEvents(newSeries);

            // Ensure we keep editing the "master" or the first instance
            // If we deleted the old event, we need to make sure we don't lose focus
            if (!selectedEventId) {
                setSelectedEventId(internalId);
            }
        } else {
            // Single Event Update
            if (existingEvent) {
                // If it WAS recurring but now NONE, we should technically break it out or update just this one?
                // Auto-save simplifying assumption: If editing a recurring event and setting recurrence to none,
                // it detaches this event.
                updateEvent(baseEvent, 'single');
            } else {
                // Check if already added via auto-save (internalId in events)
                const exists = events.some(e => e.id === internalId);
                if (exists) {
                    updateEvent(baseEvent, 'single');
                } else {
                    addEvent(baseEvent);
                    setSelectedEventId(internalId);
                }
            }
        }
        setIsSaving(false);
    };

    const handleCreateTag = () => {
        if (!newTagName) return;
        const tag: Tag = { id: crypto.randomUUID(), name: newTagName, color: newTagColor };
        addTag(tag);
        setSelectedTags([...selectedTags, tag.id]);
        setNewTagName('');
        setShowTagInput(false);
    };

    const addBreakpoint = () => {
        if (!newBpName || !newBpStart || !newBpEnd) {
            showToast("All holiday fields are required", 'error');
            return;
        }
        setBreakpoints([...breakpoints, { id: crypto.randomUUID(), name: newBpName, startDate: newBpStart, endDate: newBpEnd }]);
        setNewBpName(''); setNewBpStart(''); setNewBpEnd('');
    };

    // Get referencing todos
    const referencingTodos = existingEvent ? getReferencingTodos(existingEvent.id) : [];

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => { setDraftEvent(null); goBack(); }} className="flex items-center gap-2 text-gray-500 hover:text-primary">
                    <ChevronLeft size={20} /> Back
                </button>
                <div className="flex gap-2 items-center">
                    {isSaving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
                    {existingEvent && (
                        <button onClick={() => { deleteEvent(existingEvent.id, 'all'); goBack(); }} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-8">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Physics Final Exam" className="w-full text-2xl font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-primary px-0 py-2 focus:outline-none placeholder-gray-300" />
                </div>

                {/* Time & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-500">Starts</label>
                        <div className="flex gap-3">
                            <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm" />
                            {!isAllDay && <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-32 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm" />}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <label className="block text-sm font-medium text-gray-500">Ends</label>
                            <button onClick={() => setHasEndDate(!hasEndDate)} className="text-xs text-primary hover:underline">{hasEndDate ? 'Remove End Date' : 'Add End Date'}</button>
                        </div>
                        {hasEndDate ? (
                            <div className="flex gap-3 animate-in fade-in">
                                <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm" />
                                {!isAllDay && <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-32 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm" />}
                            </div>
                        ) : (
                            <div className="p-2.5 text-sm text-gray-400 italic">Defaults to {settings.defaultEventDuration} mins</div>
                        )}
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                        <span className="text-sm">All Day Event</span>
                    </label>
                </div>

                {/* Recurrence Section */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"><Repeat size={16} /> Recurrence</label>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setRecurrence(opt)}
                                    className={`px-3 py-1.5 rounded-full text-sm capitalize border transition-colors whitespace-nowrap
                                        ${recurrence === opt
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {opt === 'none' ? 'Does not repeat' : opt}
                                </button>
                            ))}
                        </div>

                        {recurrence !== 'none' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" checked={isForever} onChange={() => setIsForever(true)} className="text-primary focus:ring-primary" />
                                        Forever
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" checked={!isForever} onChange={() => setIsForever(false)} className="text-primary focus:ring-primary" />
                                        Until
                                    </label>
                                    {!isForever && (
                                        <DatePicker value={recurrenceEnd} onChange={setRecurrenceEnd} placeholder="End date" className="p-1.5 rounded bg-gray-50 dark:bg-gray-800 border-none text-sm" />
                                    )}
                                </div>

                                {/* Holiday Breakpoints for Events */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-medium">Holiday Breaks</span>
                                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                                            <input
                                                type="checkbox"
                                                checked={createEventsForBreakpoints}
                                                onChange={e => setCreateEventsForBreakpoints(e.target.checked)}
                                                className="rounded text-primary focus:ring-primary"
                                            />
                                            Create events for holidays
                                        </label>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {breakpoints.map(bp => (
                                            <div key={bp.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-1 rounded text-xs">
                                                <span>{bp.name}: {bp.startDate}</span>
                                                <button onClick={() => setBreakpoints(breakpoints.filter(b => b.id !== bp.id))}><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-2 items-end">
                                        <input type="text" placeholder="Name" value={newBpName} onChange={e => setNewBpName(e.target.value)} className="w-full p-1.5 text-xs rounded bg-white dark:bg-gray-800 border-none" />
                                        <DatePicker value={newBpStart} onChange={setNewBpStart} placeholder="Start" className="p-1.5 text-xs rounded bg-white dark:bg-gray-800 border-none" />
                                        <DatePicker value={newBpEnd} onChange={setNewBpEnd} placeholder="End" className="p-1.5 text-xs rounded bg-white dark:bg-gray-800 border-none" />
                                        <button onClick={addBreakpoint} className="p-1.5 bg-primary text-white rounded text-xs">Add</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes Attachment */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"><FileText size={16} /> Attached Notes</label>
                    <div className="space-y-2">
                        {linkedNoteIds.map(noteId => {
                            const note = notes.find(n => n.id === noteId);
                            if (!note) return null;
                            return (
                                <div key={noteId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { }}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={14} className="text-primary" />
                                        <span className="text-sm font-medium truncate">{note.title}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setLinkedNoteIds(linkedNoteIds.filter(id => id !== noteId)); }}
                                        className="text-gray-400 hover:text-red-400 p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}

                        {!showNoteSearch ? (
                            <div className="flex gap-2">
                                <button onClick={() => setShowNoteSearch(true)} className="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary flex items-center gap-1">
                                    <Search size={14} /> Attach Existing Note
                                </button>
                            </div>
                        ) : (
                            <div className="relative animate-in fade-in">
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-primary/30">
                                    <Search size={16} className="text-gray-400 ml-2" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search notes..."
                                        className="bg-transparent border-none focus:ring-0 text-sm flex-1"
                                        value={noteSearchQuery}
                                        onChange={e => setNoteSearchQuery(e.target.value)}
                                    />
                                    <button onClick={() => setShowNoteSearch(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={14} /></button>
                                </div>
                                {noteSearchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-40 overflow-y-auto z-10">
                                        {notes.filter(n => n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) && !linkedNoteIds.includes(n.id)).map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => {
                                                    setLinkedNoteIds([...linkedNoteIds, n.id]);
                                                    setShowNoteSearch(false);
                                                    setNoteSearchQuery('');
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 truncate"
                                            >
                                                {n.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Referencing Todos (Read-Only) */}
                {referencingTodos.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"><CheckSquare size={16} /> Referenced in Tasks</label>
                        <div className="space-y-2">
                            {referencingTodos.map(({ date, item }) => (
                                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{date}</span>
                                    <span className={item.isCompleted ? 'line-through opacity-50' : ''}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags & Alarm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"><TagIcon size={16} /> Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => selectedTags.includes(tag.id) ? setSelectedTags(selectedTags.filter(id => id !== tag.id)) : setSelectedTags([...selectedTags, tag.id])}
                                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${selectedTags.includes(tag.id) ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary'}`}
                                    style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent' }}
                                >
                                    {tag.name}
                                </button>
                            ))}
                            <button onClick={() => setShowTagInput(!showTagInput)} className="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary">+ New Tag</button>
                        </div>
                        {showTagInput && (
                            <div className="mt-3 flex gap-2 items-center">
                                <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Tag Name" className="p-1.5 text-sm border rounded bg-transparent dark:border-gray-700" />
                                <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-none" />
                                <button onClick={handleCreateTag} className="p-1.5 bg-primary text-white rounded text-xs">Add</button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2"><Bell size={16} /> Alarm</label>
                        <select value={alarmOffset} onChange={e => setAlarmOffset(Number(e.target.value))} className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
                            <option value={-1}>No Alarm</option>
                            <option value={0}>At time of event</option>
                            <option value={10}>10 minutes before</option>
                            <option value={60}>1 hour before</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
