import React, { useState, useEffect } from 'react';
import { useStore } from '../context/Store';
import { analyzeRoutineImage } from '../services/geminiService';
import { Upload, Loader2, Plus, Trash2, Clock, X, Check, AlertCircle, Calendar as CalendarIcon, Save, Edit2, ChevronLeft, ArrowRight } from 'lucide-react';
import { Routine, RoutineBreakpoint } from '../types';
import { format } from 'date-fns';
import { supabase } from '../services/supabaseClient';
import { DatePicker } from './DatePicker';

export const RoutineBuilder = () => {
    const { addRoutine, updateRoutine, deleteRoutine, routines, settings, showToast, searchQuery } = useStore();

    // View State
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

    // Filter routines
    const filteredRoutines = routines.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Editor State
    const [mode, setMode] = useState<'manual' | 'ai'>('ai');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [routineName, setRoutineName] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 4)), 'yyyy-MM-dd'));
    const [createHolidayEvents, setCreateHolidayEvents] = useState(true);

    const [eventsTemplate, setEventsTemplate] = useState<any[]>([]);
    const [breakpoints, setBreakpoints] = useState<RoutineBreakpoint[]>([]);

    // UI State for forms
    const [showEventForm, setShowEventForm] = useState<{ day: number } | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');
    const [newEventEndTime, setNewEventEndTime] = useState('');

    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayStart, setNewHolidayStart] = useState('');
    const [newHolidayEnd, setNewHolidayEnd] = useState('');

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Load Routine for Editing
    useEffect(() => {
        if (editingRoutineId) {
            const routine = routines.find(r => r.id === editingRoutineId);
            if (routine) {
                setRoutineName(routine.name);
                setStartDate(routine.startDate);
                setEndDate(routine.endDate || '');
                setBreakpoints(routine.breakpoints);
                setEventsTemplate([...routine.eventsTemplate]);
                setCreateHolidayEvents(routine.createHolidayEvents !== undefined ? routine.createHolidayEvents : true);
                setView('editor');
                setMode('manual');
            }
        }
    }, [editingRoutineId, routines]);

    const resetForm = () => {
        setRoutineName('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate(format(new Date(new Date().setMonth(new Date().getMonth() + 4)), 'yyyy-MM-dd'));
        setEventsTemplate([]);
        setBreakpoints([]);
        setCreateHolidayEvents(true);
        setErrorMsg(null);
        setEditingRoutineId(null);
    };
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setErrorMsg(null);

        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setErrorMsg("You are not logged in.");
                    showToast("You are not logged in.", "error");
                    return;
                }
                const accessToken = session.access_token;
                const base64data = reader.result?.toString().split(',')[1];
                if (base64data) {
                    try {
                        const extracted = await analyzeRoutineImage(base64data, file.type, accessToken);
                        const withIds = extracted.map(e => ({ ...e, id: crypto.randomUUID() }));
                        setEventsTemplate(withIds);
                        showToast('Schedule analyzed successfully', 'success');
                    } catch (apiError: any) {
                        setErrorMsg(apiError.message || "Failed to analyze image.");
                        showToast("Failed to analyze image", "error");
                    }
                }
                setIsAnalyzing(false);
            };
        } catch (err) {
            setErrorMsg("Failed to read image file.");
            setIsAnalyzing(false);
        }
    };

    const handleSaveRoutine = () => {
        if (!routineName.trim()) return showToast("Routine name is required", 'error');
        if (eventsTemplate.length === 0) return showToast("Please add at least one event to the routine", 'error');
        if (!startDate) return showToast("Start date is required", 'error');

        const routineData: Routine = {
            id: editingRoutineId || crypto.randomUUID(),
            name: routineName,
            startDate,
            endDate,
            breakpoints: breakpoints,
            eventsTemplate: eventsTemplate,
            createHolidayEvents: createHolidayEvents
        };

        if (editingRoutineId) {
            updateRoutine(routineData);
        } else {
            addRoutine(routineData);
        }

        resetForm();
        setView('list');
    };

    const confirmAddEvent = () => {
        if (!newEventTitle || !newEventTime || showEventForm === null) {
            showToast("Title and Start Time are required", 'error');
            return;
        }
        setEventsTemplate([...eventsTemplate, {
            id: crypto.randomUUID(),
            title: newEventTitle,
            dayOfWeek: showEventForm.day,
            startTime: newEventTime,
            endTime: newEventEndTime || undefined
        }]);
        setNewEventTitle('');
        setShowEventForm(null);
    };

    const updateTemplateEvent = (id: string, field: string, value: any) => {
        setEventsTemplate(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const deleteTemplateEvent = (id: string) => {
        setEventsTemplate(prev => prev.filter(e => e.id !== id));
    };

    const confirmAddHoliday = () => {
        if (!newHolidayName || !newHolidayStart || !newHolidayEnd) {
            showToast("All holiday fields are required", 'error');
            return;
        }
        setBreakpoints([...breakpoints, {
            id: crypto.randomUUID(),
            name: newHolidayName,
            startDate: newHolidayStart,
            endDate: newHolidayEnd
        }]);
        setNewHolidayName(''); setNewHolidayStart(''); setNewHolidayEnd('');
    };

    if (view === 'list') {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">Routines</h2>
                    <button onClick={() => { resetForm(); setView('editor'); }} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
                        <Plus size={18} /> New Routine
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRoutines.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-400">
                            <p>{searchQuery ? 'No matching routines.' : 'No routines created yet.'}</p>
                        </div>
                    )}
                    {filteredRoutines.map(routine => (
                        <div key={routine.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{routine.name}</h3>
                                    <p className="text-sm text-gray-500">{routine.startDate} - {routine.endDate || 'Forever'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingRoutineId(routine.id)} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteRoutine(routine.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase text-gray-400">Schedule Preview</div>
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS.map((d, i) => {
                                        const count = routine.eventsTemplate.filter(e => e.dayOfWeek === i).length;
                                        return count > 0 ? (
                                            <span key={d} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                {d.slice(0, 3)}: {count}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ... (Editor View remains same)
    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 h-full overflow-y-auto pb-20">
            <button onClick={() => setView('list')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-primary">
                <ChevronLeft size={20} /> Back to Routines
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-text-primary dark:text-text-darkPrimary">{editingRoutineId ? 'Edit Routine' : 'New Routine'}</h2>

            <div className="flex gap-4 mb-8">
                <button onClick={() => setMode('ai')} className={`px-4 py-2 rounded-lg font-medium ${mode === 'ai' ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700'}`}>AI Scan</button>
                <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-lg font-medium ${mode === 'manual' ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700'}`}>Manual</button>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Routine Name <span className="text-red-500">*</span></label>
                        <input type="text" value={routineName} onChange={(e) => setRoutineName(e.target.value)} placeholder="e.g. Fall Semester 2024" className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary/20 text-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Start Date <span className="text-red-500">*</span></label>
                        <DatePicker value={startDate} onChange={setStartDate} placeholder="Select start date" className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">End Date</label>
                        <DatePicker value={endDate} onChange={setEndDate} placeholder="Select end date" className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none" />
                    </div>
                </div>

                {/* Holidays */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Holidays & Breaks</h3>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={createHolidayEvents}
                                onChange={e => setCreateHolidayEvents(e.target.checked)}
                                className="rounded text-primary focus:ring-primary"
                            />
                            Create calendar events for these holidays
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {breakpoints.map(bp => (
                            <div key={bp.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-1.5 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
                                <span>{bp.name} ({bp.startDate} to {bp.endDate})</span>
                                <button onClick={() => setBreakpoints(breakpoints.filter(b => b.id !== bp.id))}><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 mb-1 block">Name</label>
                            <input type="text" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Start</label>
                            <DatePicker value={newHolidayStart} onChange={setNewHolidayStart} placeholder="Start date" className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">End</label>
                            <DatePicker value={newHolidayEnd} onChange={setNewHolidayEnd} placeholder="End date" className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm" />
                        </div>
                        <button onClick={confirmAddHoliday} className="p-2 bg-primary text-white rounded hover:bg-primary-dark"><Plus size={20} /></button>
                    </div>
                </div>

                {/* AI Import */}
                {mode === 'ai' && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center text-primary">
                                    <Loader2 className="animate-spin mb-4" size={48} />
                                    <p>Analyzing schedule with Gemini...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="text-gray-400 mb-4" size={48} />
                                    <p className="text-lg font-medium mb-2">Upload Schedule Image</p>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                </>
                            )}
                            {errorMsg && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{errorMsg}</div>}
                        </div>
                    </div>
                )}

                {/* Weekly Schedule Editor */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <h3 className="font-semibold mb-4">Weekly Template <span className="text-red-500">*</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DAYS.map((dayName, index) => {
                            const dayEvents = eventsTemplate.filter(e => e.dayOfWeek === index);
                            return (
                                <div key={dayName} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-medium text-primary">{dayName}</span>
                                        <button onClick={() => setShowEventForm({ day: index })} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"><Plus size={16} /></button>
                                    </div>

                                    {showEventForm?.day === index && (
                                        <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-primary/30 shadow-sm space-y-2">
                                            <input autoFocus type="text" placeholder="Title" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full p-1.5 text-sm bg-gray-50 dark:bg-gray-900 rounded border-none focus:ring-1 focus:ring-primary" />
                                            <div className="flex gap-2">
                                                <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-1/2 p-1.5 text-xs bg-gray-50 dark:bg-gray-900 rounded" />
                                                <input type="time" value={newEventEndTime} onChange={e => setNewEventEndTime(e.target.value)} className="w-1/2 p-1.5 text-xs bg-gray-50 dark:bg-gray-900 rounded" />
                                            </div>
                                            <div className="flex justify-end gap-2 mt-1">
                                                <button onClick={() => setShowEventForm(null)} className="p-1 text-gray-400"><X size={14} /></button>
                                                <button onClick={confirmAddEvent} className="p-1 text-primary"><Check size={14} /></button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {dayEvents.map((ev) => (
                                            <div key={ev.id} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm text-sm border border-gray-100 dark:border-gray-700 group space-y-1">
                                                <input
                                                    type="text"
                                                    value={ev.title}
                                                    onChange={(e) => updateTemplateEvent(ev.id, 'title', e.target.value)}
                                                    className="w-full bg-transparent font-medium border-none p-0 focus:ring-0 text-sm"
                                                />
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        <input
                                                            type="text"
                                                            value={ev.startTime}
                                                            onChange={(e) => updateTemplateEvent(ev.id, 'startTime', e.target.value)}
                                                            className="w-12 bg-transparent p-0 border-none text-xs"
                                                        />
                                                        -
                                                        <input
                                                            type="text"
                                                            value={ev.endTime || ''}
                                                            onChange={(e) => updateTemplateEvent(ev.id, 'endTime', e.target.value)}
                                                            placeholder="End"
                                                            className="w-12 bg-transparent p-0 border-none text-xs"
                                                        />
                                                    </div>
                                                    <button onClick={() => deleteTemplateEvent(ev.id)} className="opacity-0 group-hover:opacity-100 text-red-400 p-1"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-6">
                    <button onClick={handleSaveRoutine} className="bg-primary text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/20"><Save size={20} /> {editingRoutineId ? 'Update Routine' : 'Create Routine'}</button>
                </div>
            </div>
        </div>
    );
};