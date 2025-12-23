
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/Store';
import { Event, Tag, RoutineBreakpoint, ViewType } from '../types';
import { format, addMinutes } from 'date-fns';
import {
    X, Repeat, Tag as TagIcon, Link, AlertTriangle,
    ChevronLeft, Trash2, Plus, FileText, Search, Loader2, CheckSquare
} from 'lucide-react';
import { DatePicker } from './DatePicker';
import { generateHolidayEvents, generateEventsFromRecurrence } from '../utils/appUtils';

export const EventEditor = () => {
    const {
        selectedEventId, events, addEvent, addEvents, updateEvent,
        goBack, tags, addTag, deleteEvent, archiveEvent, settings, showToast,
        notes, addNote, setSelectedNoteId, setCurrentView,
        draftEvent, setDraftEvent, setSelectedEventId, getReferencingTodos,
        restoreNote
    } = useStore();

    const existingEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
    const [internalId] = useState(existingEvent?.id || crypto.randomUUID());

    // Form State
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('09:00');
    const [hasEndDate, setHasEndDate] = useState(false);
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');
    const [isAllDay, setIsAllDay] = useState(false);
    const [description, setDescription] = useState('');
    const [showDescription, setShowDescription] = useState(false);
    const [url, setUrl] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Recurrence State
    const [recurrence, setRecurrence] = useState<Event['recurrence']>('none');
    const [recurrenceEnd, setRecurrenceEnd] = useState('');

    // Breakpoints State
    const [breakpoints, setBreakpoints] = useState<RoutineBreakpoint[]>([]);
    const [createEventsForBreakpoints, setCreateEventsForBreakpoints] = useState(settings.createHolidayEvents);
    const [newBpName, setNewBpName] = useState('');
    const [newBpStart, setNewBpStart] = useState('');
    const [newBpEnd, setNewBpEnd] = useState('');

    const [alarmEnabled, setAlarmEnabled] = useState<boolean>(false);
    const [alarmValue, setAlarmValue] = useState<string>('5');
    const [alarmUnit, setAlarmUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
    const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);

    // UI Local State
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#4A5F7A');
    const [showNoteSearch, setShowNoteSearch] = useState(false);
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Don't render if we don't have valid data for editing
    if (selectedEventId && !existingEvent) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8 h-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Event Not Found</h2>
                    <p className="text-gray-500 mb-4">The event you're trying to edit doesn't exist.</p>
                    <button
                        onClick={() => goBack()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Initial Load
    useEffect(() => {
        if (existingEvent && existingEvent.startTime) {
            setTitle(existingEvent.title || 'Untitled Event');
            try {
                const start = new Date(existingEvent.startTime);
                if (!isNaN(start.getTime())) {
                    const formattedDate = format(start, 'yyyy-MM-dd');
                    const formattedTime = format(start, 'HH:mm');
                    setStartDate(formattedDate);
                    setStartTime(formattedTime);
                }
            } catch (error) {
                console.error('Error parsing start time:', error);
                // Set defaults
                const now = new Date();
                setStartDate(format(now, 'yyyy-MM-dd'));
                setStartTime('09:00');
            }

            // Always start with end date toggled off, even for existing events
            // User can toggle it on if they want to edit the end date
            setHasEndDate(false);
            if (existingEvent.endTime) {
                try {
                    const end = new Date(existingEvent.endTime);
                    if (!isNaN(end.getTime())) {
                        setEndDate(format(end, 'yyyy-MM-dd'));
                        setEndTime(format(end, 'HH:mm'));
                    }
                } catch (error) {
                    console.error('Error parsing end time:', error);
                }
            }

            setIsAllDay(existingEvent.isAllDay);
            setDescription(existingEvent.description || '');
            setShowDescription(!!existingEvent.description);
            setUrl(existingEvent.url || '');
            setShowUrlInput(false); // URL input should be hidden when editing existing event with URL
            setSelectedTags(existingEvent.tags);
            setRecurrence(existingEvent.recurrence || 'none');

            if (existingEvent.recurrenceEnd) {
                try {
                    const recurrenceEndDate = new Date(existingEvent.recurrenceEnd);
                    if (!isNaN(recurrenceEndDate.getTime())) {
                        setRecurrenceEnd(format(recurrenceEndDate, 'yyyy-MM-dd'));
                    }
                } catch (error) {
                    console.error('Error parsing recurrence end date:', error);
                }
            } else if (existingEvent.recurrence !== 'none') {
                // Set a default end date if recurrence is set but no end date exists
                try {
                    const defaultEnd = new Date(existingEvent.startTime);
                    if (!isNaN(defaultEnd.getTime())) {
                        defaultEnd.setMonth(defaultEnd.getMonth() + 3); // 3 months from start
                        setRecurrenceEnd(format(defaultEnd, 'yyyy-MM-dd'));
                    }
                } catch (error) {
                    console.error('Error creating default recurrence end date:', error);
                    // Set a fallback
                    const fallback = new Date();
                    fallback.setMonth(fallback.getMonth() + 3);
                    setRecurrenceEnd(format(fallback, 'yyyy-MM-dd'));
                }
            }

            // Convert alarmOffset to new format
            const existingAlarmOffset = existingEvent.alarmOffset ?? -1;
            if (existingAlarmOffset > 0) {
                setAlarmEnabled(true);
                if (existingAlarmOffset >= 1440) { // >= 24 hours
                    setAlarmValue(Math.floor(existingAlarmOffset / 1440).toString());
                    setAlarmUnit('days');
                } else if (existingAlarmOffset >= 60) { // >= 1 hour
                    setAlarmValue(Math.floor(existingAlarmOffset / 60).toString());
                    setAlarmUnit('hours');
                } else {
                    setAlarmValue(existingAlarmOffset.toString());
                    setAlarmUnit('minutes');
                }
            } else {
                setAlarmEnabled(false);
                setAlarmValue('5');
                setAlarmUnit('minutes');
            }
            setBreakpoints(existingEvent.breakpoints || []);
            setLinkedNoteIds(existingEvent.linkedNoteIds || []);
        } else if (draftEvent && !selectedEventId) {
            setTitle(draftEvent.title || '');
            if (draftEvent.startTime) {
                try {
                    const s = new Date(draftEvent.startTime);
                    if (!isNaN(s.getTime())) {
                        setStartDate(format(s, 'yyyy-MM-dd'));
                        setStartTime(format(s, 'HH:mm'));
                    }
                } catch (error) {
                    console.error('Error parsing draft start time:', error);
                }
            }
            if (draftEvent.endTime) {
                setHasEndDate(true);
                try {
                    const e = new Date(draftEvent.endTime);
                    if (!isNaN(e.getTime())) {
                        setEndDate(format(e, 'yyyy-MM-dd'));
                        setEndTime(format(e, 'HH:mm'));
                    }
                } catch (error) {
                    console.error('Error parsing draft end time:', error);
                }
            }
            setIsAllDay(!!draftEvent.isAllDay);
            setDescription(draftEvent.description || '');
            setShowDescription(!!draftEvent.description);
            setUrl(draftEvent.url || '');
            setShowUrlInput(false); // URL input should be hidden when loading draft with URL
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
            setDescription('');
            setShowDescription(false);
            setUrl('');
            setShowUrlInput(false);
            setHasEndDate(false);
            setRecurrence('none');
            setSelectedTags([]);
            setBreakpoints([]);
            setLinkedNoteIds([]);
            setCreateEventsForBreakpoints(settings.createHolidayEvents);
            setAlarmEnabled(false);
            setAlarmValue('5');
            setAlarmUnit('minutes');
        }
    }, [draftEvent, selectedEventId, settings.defaultEventDuration]);

    // Auto-Save Logic
    useEffect(() => {
        if (!title) return; // Don't save empty untitled events

        const timer = setTimeout(() => {
            handleAutoSave();
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, description, url, startDate, startTime, endDate, endTime, isAllDay, selectedTags, alarmEnabled, alarmValue, alarmUnit, linkedNoteIds, breakpoints, createEventsForBreakpoints, recurrence, recurrenceEnd]);

    // Adjust recurrence when event duration changes
    useEffect(() => {
        const allowedOptions = getAllowedRecurrenceOptions();
        if (!allowedOptions.includes(recurrence)) {
            setRecurrence('none');
        }
    }, [hasEndDate, startDate, endDate, startTime, endTime, recurrence]);

    // Calculate allowed recurrence options based on event duration
    const getAllowedRecurrenceOptions = (): Event['recurrence'][] => {
        if (!hasEndDate) return ['none', 'daily', 'weekly', 'monthly', 'yearly'];

        try {
            const start = new Date(`${startDate}T${startTime}`);
            const end = new Date(`${endDate}T${endTime}`);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return ['none', 'daily', 'weekly', 'monthly', 'yearly'];
            }

            const durationMs = end.getTime() - start.getTime();
            const durationDays = durationMs / (1000 * 60 * 60 * 24);
            const durationWeeks = durationDays / 7;
            const durationMonths = durationDays / 30; // Approximate
            const durationYears = durationDays / 365; // Approximate

            const allowed: Event['recurrence'][] = ['none'];

            if (durationDays <= 1) allowed.push('daily');
            if (durationDays <= 7) allowed.push('weekly');
            if (durationDays <= 30) allowed.push('monthly');
            if (durationDays <= 365) allowed.push('yearly');

            return allowed;
        } catch (error) {
            console.error('Error calculating recurrence restrictions:', error);
            return ['none', 'daily', 'weekly', 'monthly', 'yearly'];
        }
    };

    // Calculate alarm offset in minutes
    const calculateAlarmOffset = (): number => {
        if (!alarmEnabled) return -1;

        const value = parseInt(alarmValue) || 5; // Default to 5 if invalid

        let offsetMinutes: number;
        switch (alarmUnit) {
            case 'minutes':
                offsetMinutes = Math.max(1, Math.min(value, 1440)); // 1 min to 24 hours
                break;
            case 'hours':
                offsetMinutes = Math.max(1, Math.min(value * 60, 10080)); // 1 hour to 7 days
                break;
            case 'days':
                offsetMinutes = Math.max(1, Math.min(value * 1440, 43200)); // 1 day to 30 days
                break;
            default:
                offsetMinutes = 5;
        }

        // Validate that alarm time is in the future
        if (startDate && startTime) {
            try {
                const eventDateTime = new Date(`${startDate}T${startTime}`);
                const alarmTime = new Date(eventDateTime.getTime() - (offsetMinutes * 60 * 1000));
                const now = new Date();

                if (alarmTime <= now) {
                    // Check if even 5 minutes would be in the past
                    const fiveMinAlarmTime = new Date(eventDateTime.getTime() - (5 * 60 * 1000));
                    if (fiveMinAlarmTime <= now) {
                        // Even 5 minutes would be in the past - don't schedule alarm
                        showToast('Event time is in the past. No alarm scheduled.', 'error');
                        return -1; // Disable alarm
                    } else {
                        // Alarm would be in the past, default to 5 minutes
                        showToast('Alarm time would be in the past. Setting to 5 minutes before event.', 'info');
                        return 5;
                    }
                }
            } catch (error) {
                console.error('Error validating alarm time:', error);
                return -1; // Disable on error
            }
        }

        return offsetMinutes;
    };

    const handleAutoSave = () => {
        const currentAlarmOffset = calculateAlarmOffset();
        setIsSaving(true);

        let start: Date;
        let end: Date;

        try {
            start = new Date(`${startDate}T${startTime}`);
            if (isNaN(start.getTime())) {
                console.error('Invalid start date/time');
                setIsSaving(false);
                return;
            }

            if (hasEndDate) {
                end = new Date(`${endDate}T${endTime}`);
                if (isNaN(end.getTime())) {
                    console.error('Invalid end date/time');
                    setIsSaving(false);
                    return;
                }
            } else {
                end = addMinutes(start, settings.defaultEventDuration);
            }
        } catch (error) {
            console.error('Error parsing dates in auto-save:', error);
            setIsSaving(false);
            return;
        }

        // Check if this should be a multi-day event (different start and end dates)
        const isMultiDay = hasEndDate && format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd');

        if (isMultiDay) {
            // Create a single long multi-day event
            const singleEvent: Event = {
                id: internalId,
                title,
                description: description.trim() || undefined,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isAllDay,
                tags: selectedTags,
                linkedNoteIds,
                recurrence,
                recurrenceEnd: recurrence !== 'none' && recurrenceEnd ? new Date(recurrenceEnd).toISOString() : undefined,
                alarmOffset: currentAlarmOffset === -1 ? undefined : currentAlarmOffset,
                routineId: existingEvent?.routineId,
                recurringEventId: existingEvent?.recurringEventId,
                moodleEventId: existingEvent?.moodleEventId,
                courseName: existingEvent?.courseName,
                url: url.trim() || existingEvent?.url,
                breakpoints: breakpoints
            };

            // Handle recurrence for multi-day events
            if (recurrence !== 'none') {
                const groupId = existingEvent?.recurringEventId || crypto.randomUUID();
                singleEvent.recurringEventId = groupId;

                if (existingEvent?.recurringEventId) {
                    deleteEvent(existingEvent.id, 'all');
                } else if (existingEvent) {
                    deleteEvent(existingEvent.id, 'single');
                } else {
                    deleteEvent(internalId, 'single');
                }

                const newSeries = generateEventsFromRecurrence(singleEvent);
                newSeries.forEach(event => addEvent(event));

                if (!selectedEventId) {
                    setSelectedEventId(internalId);
                }
            } else {
                if (existingEvent) {
                    updateEvent(singleEvent, 'single');
                } else {
                    const exists = events.some(e => e.id === internalId);
                    if (exists) updateEvent(singleEvent, 'single');
                    else addEvent(singleEvent);

                    if (!selectedEventId) {
                        setSelectedEventId(internalId);
                    }
                }
            }
        } else {
            // Single day event - use existing logic
            const baseEvent: Event = {
                id: internalId,
                title,
                description: description.trim() || undefined,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isAllDay,
                tags: selectedTags,
                linkedNoteIds,
                recurrence,
                recurrenceEnd: recurrence !== 'none' && recurrenceEnd ? new Date(recurrenceEnd).toISOString() : undefined,
                alarmOffset: currentAlarmOffset === -1 ? undefined : currentAlarmOffset,
                routineId: existingEvent?.routineId,
                recurringEventId: existingEvent?.recurringEventId,
                moodleEventId: existingEvent?.moodleEventId,
                courseName: existingEvent?.courseName,
                url: url.trim() || existingEvent?.url,
                breakpoints: breakpoints
            };

            // If recurrence is active and this is NOT a routine-generated event, handle series generation
            // Routine events should be updated individually, not as recurring series
            if (recurrence !== 'none' && !existingEvent?.routineId) {
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


    try {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8 h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => { setDraftEvent(null); goBack(); }} className="flex items-center gap-2 text-gray-500 hover:text-primary">
                        <ChevronLeft size={20} /> Back
                    </button>
                    <div className="flex gap-2 items-center">
                        {isSaving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
                        {existingEvent && (
                            <button onClick={() => {
                                if (window.confirm("Archive this event? It will be moved to archived events where you can restore or permanently delete it later.")) {
                                    archiveEvent(existingEvent.id);
                                    goBack();
                                }
                            }} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-8">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Event Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="enter event name" className="w-full text-2xl font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-primary px-0 py-2 focus:outline-none placeholder-gray-500" />
                    </div>

                    {/* Description */}
                    <div>
                        {!showDescription ? (
                            <button
                                onClick={() => setShowDescription(true)}
                                className="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Description
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium text-gray-500">Description</label>
                                    <button
                                        onClick={() => { setShowDescription(false); setDescription(''); }}
                                        className="text-xs text-gray-400 hover:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add event details, notes, or instructions..."
                                    rows={3}
                                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* URL */}
                    <div>
                        {url ? (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-500">Link</label>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                        <Link size={14} />
                                        <span className="text-sm truncate max-w-xs">{url}</span>
                                    </a>
                                    <button
                                        onClick={() => { setUrl(''); setShowUrlInput(false); }}
                                        className="text-gray-400 hover:text-red-400 p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : !showUrlInput ? (
                            <button
                                onClick={() => setShowUrlInput(true)}
                                className="text-sm px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Link
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium text-gray-500">Link</label>
                                    <button
                                        onClick={() => { setShowUrlInput(false); setUrl(''); }}
                                        className="text-xs text-gray-400 hover:text-red-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        placeholder="https://example.com/meeting-link"
                                        className="flex-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setShowUrlInput(false)}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                        disabled={!url.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
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
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer">
                            <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">All Day Event</span>
                        </label>
                    </div>

                    {/* Recurrence Section */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"><Repeat size={16} /> Recurrence</label>
                        <div className="flex flex-col gap-4">

                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {getAllowedRecurrenceOptions().map(opt => (
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
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            End Date <span className="text-red-500">*</span>
                                        </label>
                                        <DatePicker
                                            value={recurrenceEnd}
                                            onChange={setRecurrenceEnd}
                                            placeholder="Select end date"
                                            className="p-1.5 rounded bg-gray-50 dark:bg-gray-800 border-none text-sm"
                                        />
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
                                const archivedNotes = JSON.parse(localStorage.getItem('archivedNotes') || '[]');
                                const archivedNote = archivedNotes.find((n: any) => n.id === noteId);
                                const displayNote = note || archivedNote;

                                if (!displayNote) return null;

                                const isArchived = !!archivedNote;

                                return (
                                    <div key={noteId} className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${isArchived
                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-primary/30'
                                        }`} onClick={() => {
                                            if (!isArchived) {
                                                // Note exists and is active
                                                setSelectedNoteId(noteId);
                                                setCurrentView(ViewType.NOTES);
                                            } else {
                                                // Note is archived, ask user if they want to restore
                                                const shouldRestore = window.confirm(`This note "${archivedNote.title}" is archived. Would you like to restore it and open it for editing?`);
                                                if (shouldRestore) {
                                                    // Restore the note using the store function
                                                    restoreNote(noteId);

                                                    // Navigate to the restored note
                                                    setSelectedNoteId(noteId);
                                                    setCurrentView(ViewType.NOTES);
                                                    showToast(`Note "${archivedNote.title}" restored`, 'success');
                                                }
                                            }
                                        }}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={14} className={isArchived ? "text-orange-500" : "text-primary"} />
                                            <span className={`text-sm font-medium truncate ${isArchived ? "text-orange-700 dark:text-orange-300" : ""}`}>{displayNote.title}</span>
                                            {isArchived && <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">Archived</span>}
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
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2"><AlertTriangle size={16} /> Alarm</label>
                            <div className="space-y-3">
                                {/* Alarm Toggle */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${alarmEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${alarmEnabled ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Enable alarm</span>
                                    <input
                                        type="checkbox"
                                        checked={alarmEnabled}
                                        onChange={e => setAlarmEnabled(e.target.checked)}
                                        className="hidden"
                                    />
                                </label>

                                {/* Alarm Settings */}
                                {alarmEnabled && (
                                    <div className="flex gap-2 items-end animate-in fade-in">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Time before event</label>
                                            <input
                                                type="number"
                                                value={alarmValue}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '' || (!isNaN(Number(val)) && Number(val) > 0)) {
                                                        setAlarmValue(val);
                                                    }
                                                }}
                                                min="1"
                                                max={alarmUnit === 'minutes' ? '1440' : alarmUnit === 'hours' ? '168' : '30'}
                                                className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                                placeholder="5"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                                            <select
                                                value={alarmUnit}
                                                onChange={e => setAlarmUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                                                className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                            >
                                                <option value="minutes">Minutes</option>
                                                <option value="hours">Hours</option>
                                                <option value="days">Days</option>
                                            </select>
                                        </div>
                                        {/* Alarm validation warning */}
                                        {(() => {
                                            if (!startDate || !startTime) return null;
                                            try {
                                                const eventDateTime = new Date(`${startDate}T${startTime}`);
                                                const value = parseInt(alarmValue) || 5;
                                                let offsetMinutes = 0;
                                                switch (alarmUnit) {
                                                    case 'minutes': offsetMinutes = value; break;
                                                    case 'hours': offsetMinutes = value * 60; break;
                                                    case 'days': offsetMinutes = value * 1440; break;
                                                }
                                                const alarmTime = new Date(eventDateTime.getTime() - (offsetMinutes * 60 * 1000));
                                                const now = new Date();
                                                if (alarmTime <= now) {
                                                    return (
                                                        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                                                            <AlertTriangle size={12} />
                                                            <span>Will default to 5 min</span>
                                                        </div>
                                                    );
                                                }
                                            } catch (error) {
                                                return (
                                                    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
                                                        <AlertTriangle size={12} />
                                                        <span>Invalid time</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error rendering EventEditor:', error);
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8 h-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Event Editor</h2>
                    <p className="text-gray-500 mb-4">There was an error loading the event editor. Please try again.</p>
                    <button
                        onClick={() => goBack()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                    <details className="mt-4 text-left">
                        <summary className="cursor-pointer text-sm text-gray-400">Error Details</summary>
                        <pre className="text-xs text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded overflow-auto">
                            {error instanceof Error ? error.message : 'Unknown error'}
                        </pre>
                    </details>
                </div>
            </div>
        );
    }
};
