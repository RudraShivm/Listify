
import React, { useState } from 'react';
import { X, Clock, Calendar as CalendarIcon, Bell, Repeat, Tag as TagIcon, FileText, Link, AlertTriangle } from 'lucide-react';
import { Event } from '../types';
import { DEFAULT_TAGS } from '../constants';
import { format } from 'date-fns';
import { useStore } from '../context/Store';
import { DatePicker } from './DatePicker';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Event, mode?: 'single' | 'future' | 'all') => void;
    initialDate?: Date;
    existingEvent?: Event | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, initialDate, existingEvent }) => {
    if (!isOpen) return null;

    const { notes } = useStore();
    const [title, setTitle] = useState(existingEvent?.title || '');
    const [date, setDate] = useState(format(initialDate || new Date(existingEvent?.startTime || new Date()), 'yyyy-MM-dd'));
    const [time, setTime] = useState(existingEvent?.startTime ? format(new Date(existingEvent.startTime), 'HH:mm') : '09:00');
    const [endTime, setEndTime] = useState(existingEvent?.endTime ? format(new Date(existingEvent.endTime), 'HH:mm') : '');
    const [isAllDay, setIsAllDay] = useState(existingEvent?.isAllDay || false);
    const [selectedTags, setSelectedTags] = useState<string[]>(existingEvent?.tags || []);
    const [recurrence, setRecurrence] = useState<Event['recurrence']>(existingEvent?.recurrence || 'none');
    const [alarmEnabled, setAlarmEnabled] = useState<boolean>(!!existingEvent?.alarmOffset && existingEvent.alarmOffset > 0);
    const [alarmValue, setAlarmValue] = useState<string>(() => {
        const offset = existingEvent?.alarmOffset;
        if (!offset || offset <= 0) return '5';
        if (offset >= 1440) return Math.floor(offset / 1440).toString(); // days
        if (offset >= 60) return Math.floor(offset / 60).toString(); // hours
        return offset.toString(); // minutes
    });
    const [alarmUnit, setAlarmUnit] = useState<'minutes' | 'hours' | 'days'>(() => {
        const offset = existingEvent?.alarmOffset;
        if (!offset || offset <= 0) return 'minutes';
        if (offset >= 1440) return 'days';
        if (offset >= 60) return 'hours';
        return 'minutes';
    });

    // Recurrence Edit Modal State
    const [showRecurrencePrompt, setShowRecurrencePrompt] = useState(false);

    // Find notes referencing this event
    const referencingNotes = existingEvent
        ? notes.filter(n => n.referencedEventIds?.includes(existingEvent.id))
        : [];

    const handleSaveInit = () => {
        if (!title || !date) return;
        if (existingEvent?.recurringEventId) {
            setShowRecurrencePrompt(true);
        } else {
            handleFinalSave('single');
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
        if (date && time) {
            try {
                const eventDateTime = new Date(`${date}T${time}`);
                const alarmTime = new Date(eventDateTime.getTime() - (offsetMinutes * 60 * 1000));
                const now = new Date();

                if (alarmTime <= now) {
                    // Check if even 5 minutes would be in the past
                    const fiveMinAlarmTime = new Date(eventDateTime.getTime() - (5 * 60 * 1000));
                    if (fiveMinAlarmTime <= now) {
                        // Even 5 minutes would be in the past - don't schedule alarm
                        console.warn('Event time is in the past. No alarm scheduled.');
                        return -1; // Disable alarm
                    } else {
                        // Alarm would be in the past, default to 5 minutes
                        console.warn('Alarm time would be in the past. Setting to 5 minutes before event.');
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

    const handleFinalSave = (mode: 'single' | 'future' | 'all') => {
        const startDateTime = new Date(`${date}T${time}`);
        let endDateTime: Date | undefined;
        if (endTime) {
            endDateTime = new Date(`${date}T${endTime}`);
        }

        const newEvent: Event = {
            id: existingEvent?.id || crypto.randomUUID(),
            title,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime?.toISOString(),
            isAllDay,
            tags: selectedTags,
            recurrence,
            alarmOffset: calculateAlarmOffset() === -1 ? undefined : calculateAlarmOffset(),
            routineId: existingEvent?.routineId,
            recurringEventId: existingEvent?.recurringEventId
        };

        // If newly creating a recurring event, assign a recurrence ID
        if (!existingEvent && recurrence !== 'none') {
            newEvent.recurringEventId = crypto.randomUUID();
        }

        onSave(newEvent, mode);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-surface-light dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Recurrence Prompt Overlay */}
                {showRecurrencePrompt ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <AlertTriangle size={24} />
                            <h3>Edit Recurring Event</h3>
                        </div>
                        <p className="text-sm text-gray-500">This event is part of a series. How would you like to apply your changes?</p>
                        <div className="flex flex-col gap-2 pt-2">
                            <button onClick={() => handleFinalSave('single')} className="p-3 text-left rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5">
                                <span className="font-medium block">This event only</span>
                                <span className="text-xs text-gray-500">Changes apply to this specific date.</span>
                            </button>
                            <button onClick={() => handleFinalSave('future')} className="p-3 text-left rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5">
                                <span className="font-medium block">This and future events</span>
                                <span className="text-xs text-gray-500">Updates this and all following events.</span>
                            </button>
                            <button onClick={() => handleFinalSave('all')} className="p-3 text-left rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5">
                                <span className="font-medium block">All events</span>
                                <span className="text-xs text-gray-500">Updates the entire series.</span>
                            </button>
                        </div>
                        <button onClick={() => setShowRecurrencePrompt(false)} className="w-full py-2 text-gray-500 text-sm mt-2">Cancel</button>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-text-primary dark:text-text-darkPrimary">
                                {existingEvent ? 'Edit Event' : 'New Event'}
                            </h3>
                            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Event Title"
                                    className="w-full text-xl font-medium bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-primary px-0 py-2 focus:outline-none placeholder-gray-400"
                                    autoFocus
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon size={18} className="text-gray-400" />
                                    <DatePicker
                                        value={date}
                                        onChange={setDate}
                                        placeholder="Select date"
                                        className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg p-2 text-sm flex-1"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock size={18} className="text-gray-400" />
                                    <div className="flex gap-2 flex-1">
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                            className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg p-2 text-sm flex-1"
                                        />
                                        {!isAllDay && (
                                            <>
                                                <span className="self-center text-gray-400">-</span>
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    placeholder="End"
                                                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg p-2 text-sm flex-1"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-8">
                                    <input
                                        type="checkbox"
                                        id="allDay"
                                        checked={isAllDay}
                                        onChange={e => setIsAllDay(e.target.checked)}
                                        className="rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="allDay" className="text-sm text-gray-600 dark:text-gray-400">All Day</label>
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {/* Alarm */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Bell size={18} className="text-gray-400" />
                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${alarmEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${alarmEnabled ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-sm text-text-primary dark:text-text-darkPrimary">Alarm</span>
                                            <input
                                                type="checkbox"
                                                checked={alarmEnabled}
                                                onChange={e => setAlarmEnabled(e.target.checked)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Alarm Settings */}
                                    {alarmEnabled && (
                                        <div className="flex gap-2 items-end ml-7 animate-in fade-in">
                                            <div className="flex-1">
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
                                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                                    placeholder="5"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={alarmUnit}
                                                    onChange={e => setAlarmUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                                >
                                                    <option value="minutes">min</option>
                                                    <option value="hours">hrs</option>
                                                    <option value="days">days</option>
                                                </select>
                                            </div>
                                            {/* Alarm validation warning */}
                                            {(() => {
                                                if (!date || !time) return null;
                                                try {
                                                    const eventDateTime = new Date(`${date}T${time}`);
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
                                                            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 ml-2">
                                                                <AlertTriangle size={10} />
                                                                <span>→ 5min</span>
                                                            </div>
                                                        );
                                                    }
                                                } catch (error) {
                                                    return (
                                                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 ml-2">
                                                            <AlertTriangle size={10} />
                                                            <span>!</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Recurrence */}
                                <div className="flex items-center gap-3">
                                    <Repeat size={18} className="text-gray-400" />
                                    <select
                                        value={recurrence}
                                        onChange={e => setRecurrence(e.target.value as any)}
                                        className="bg-transparent text-sm text-text-primary dark:text-text-darkPrimary focus:outline-none flex-1"
                                    >
                                        <option value="none">Does not repeat</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>

                                {/* Tags */}
                                <div className="flex items-start gap-3">
                                    <TagIcon size={18} className="text-gray-400 mt-1" />
                                    <div className="flex flex-wrap gap-2 flex-1">
                                        {DEFAULT_TAGS.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    if (selectedTags.includes(tag.id)) {
                                                        setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                                    } else {
                                                        setSelectedTags([...selectedTags, tag.id]);
                                                    }
                                                }}
                                                className={`text-xs px-2 py-1 rounded-full border transition-all ${selectedTags.includes(tag.id)
                                                        ? 'border-transparent text-white'
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary'
                                                    }`}
                                                style={{
                                                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Referenced In */}
                            {referencingNotes.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                                        <Link size={14} /> Referenced In
                                    </h4>
                                    <div className="space-y-1">
                                        {referencingNotes.map(note => (
                                            <div key={note.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <FileText size={14} className="text-primary" />
                                                <span className="truncate">{note.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveInit}
                                className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl shadow-sm transition-colors"
                            >
                                Save Event
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
