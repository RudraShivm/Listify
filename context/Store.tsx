import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Event, Note, Routine, DailyTodoList, ThemeMode, TodoItem, ViewType, AppSettings, Tag, ToastMessage } from '../types';
import { generateEventsFromRoutine } from '../utils/appUtils';
import { DEFAULT_TAGS, THEMES } from '../constants';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AppState {
  events: Event[];
  notes: Note[];
  routines: Routine[];
  dailyTodos: DailyTodoList[];
  tags: Tag[];
  settings: AppSettings;
  currentView: ViewType;
  searchQuery: string;
  selectedEventId: string | null;
  selectedNoteId: string | null;
  draftEvent: Partial<Event> | null;
  toasts: ToastMessage[];
  isFocusModeActive: boolean;
  user: User | null;
  isSyncing: boolean;
}

interface AppContextType extends AppState {
  setSettings: (settings: AppSettings) => void;
  setCurrentView: (view: ViewType) => void;
  goBack: () => void;
  setSearchQuery: (query: string) => void;
  setFocusModeActive: (active: boolean) => void;
  setSelectedEventId: (id: string | null) => void;
  addEvent: (event: Event) => void;
  addEvents: (events: Event[]) => void;
  updateEvent: (event: Event, mode?: 'single' | 'future' | 'all') => void;
  deleteEvent: (id: string, mode?: 'single' | 'future' | 'all') => void;
  setDraftEvent: (event: Partial<Event> | null) => void;
  addTag: (tag: Tag) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  addRoutine: (routine: Routine) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  getTodosForDate: (date: string) => TodoItem[];
  getArchivedTodos: () => DailyTodoList[];
  getReferencingTodos: (eventId: string) => { date: string, item: TodoItem }[];
  addTodo: (date: string, text: string) => void;
  toggleTodo: (date: string, id: string) => void;
  reorderTodos: (date: string, newItems: TodoItem[]) => void;
  exportData: () => void;
  importBackup: (jsonData: string) => void;
  clearData: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const load = <T,>(key: string, def: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : def;
    } catch (e) {
      return def;
    }
  };

  const defaultSettings: AppSettings = {
    moveCompletedTodosToBottom: false,
    upcomingWindow: 5,
    defaultEventDuration: 60,
    createHolidayEvents: true,
    theme: 'system',
    themeId: 'academic', 
    startOfWeek: 'monday',
    timeFormat: '12h',
    defaultView: ViewType.NOTES,
    focusMode: false,
    mobileBottomBarItems: [ViewType.NOTES, ViewType.TODAY, ViewType.CALENDAR, ViewType.EVENTS, ViewType.TODOS, ViewType.ROUTINES]
  };

  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [events, setEvents] = useState<Event[]>(() => load('events', []));
  const [notes, setNotes] = useState<Note[]>(() => load('notes', []));
  const [routines, setRoutines] = useState<Routine[]>(() => load('routines', []));
  const [dailyTodos, setDailyTodos] = useState<DailyTodoList[]>(() => load('dailyTodos', []));
  const [tags, setTags] = useState<Tag[]>(() => load('tags', DEFAULT_TAGS));
  const [settings, setSettings] = useState<AppSettings>(() => load('settings', defaultSettings));
  const [currentView, setCurrentViewState] = useState<ViewType>(() => load('settings', defaultSettings).defaultView);
  const [viewHistory, setViewHistory] = useState<ViewType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draftEvent, setDraftEvent] = useState<Partial<Event> | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFocusModeActive, setFocusModeActive] = useState(false);

  // --- Supabase Authentication ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      else clearLocalState(); // Clear UI state on logout
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearLocalState = () => {
    setEvents([]);
    setNotes([]);
    setRoutines([]);
    setDailyTodos([]);
  };

  const fetchUserData = async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);
    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userData) {
        if (userData.events) setEvents(userData.events);
        if (userData.notes) setNotes(userData.notes);
        if (userData.routines) setRoutines(userData.routines);
        if (userData.daily_todos) setDailyTodos(userData.daily_todos);
        if (userData.tags) setTags(userData.tags);
        if (userData.settings) setSettings(userData.settings);
      }
    } catch (e) {
      console.error("Sync fetch error", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = useCallback(async () => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);
    try {
      await supabase.from('user_data').upsert({
        user_id: user.id,
        events,
        notes,
        routines,
        daily_todos: dailyTodos,
        tags,
        settings,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Sync push error", e);
    } finally {
      setIsSyncing(false);
    }
  }, [user, events, notes, routines, dailyTodos, tags, settings]);

  // Debounced Sync to avoid slamming the DB
  useEffect(() => {
    const timer = setTimeout(() => {
      syncToCloud();
    }, 2000);
    return () => clearTimeout(timer);
  }, [events, notes, routines, dailyTodos, tags, settings, syncToCloud]);

  // --- Standard Logic ---
  const setCurrentView = (view: ViewType) => {
      if (view !== currentView) {
          setViewHistory(prev => [...prev, currentView]);
          setCurrentViewState(view);
          if (view !== ViewType.EVENT_EDIT && view !== ViewType.NOTES) setSearchQuery('');
      }
  };

  const goBack = () => {
      if (viewHistory.length > 0) {
          const newHistory = [...viewHistory];
          const prev = newHistory.pop();
          setViewHistory(newHistory);
          if (prev) setCurrentViewState(prev);
      } else {
          setCurrentViewState(settings.defaultView);
      }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const addEvent = (event: Event) => setEvents(prev => [...prev, event]);
  const addEvents = (newEvents: Event[]) => setEvents(prev => [...prev, ...newEvents]);
  
  const updateEvent = (updatedEvent: Event, mode: 'single' | 'future' | 'all' = 'single') => {
    if (updatedEvent.linkedNoteIds) {
        setNotes(prev => prev.map(n => {
            const isLinked = updatedEvent.linkedNoteIds?.includes(n.id);
            const hasRef = n.referencedEventIds.includes(updatedEvent.id);
            if (isLinked && !hasRef) return { ...n, referencedEventIds: [...n.referencedEventIds, updatedEvent.id] };
            if (!isLinked && hasRef) return { ...n, referencedEventIds: n.referencedEventIds.filter(id => id !== updatedEvent.id) };
            return n;
        }));
    }
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  const addNote = (note: Note) => setNotes(prev => [note, ...prev]);
  const updateNote = (note: Note) => setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const addRoutine = (routine: Routine) => {
    setRoutines(prev => [...prev, routine]);
    const newEvents = generateEventsFromRoutine(routine);
    setEvents(prev => [...prev, ...newEvents]);
  };

  const deleteRoutine = (id: string) => setRoutines(prev => prev.filter(r => r.id !== id));

  const getTodosForDate = (date: string) => {
    const list = dailyTodos.find(d => d.date === date);
    return list ? list.items : [];
  };

  const addTodo = (date: string, text: string) => {
    setDailyTodos(prev => {
      const existing = prev.find(d => d.date === date);
      const newItem = { id: crypto.randomUUID(), text, isCompleted: false, order: existing ? existing.items.length : 0 };
      if (existing) return prev.map(d => d.date === date ? { ...d, items: [...d.items, newItem] } : d);
      return [...prev, { date, items: [newItem], isArchived: false }];
    });
  };

  const toggleTodo = (date: string, id: string) => {
    setDailyTodos(prev => prev.map(d => d.date === date ? { ...d, items: d.items.map(i => i.id === id ? { ...i, isCompleted: !i.isCompleted } : i) } : d));
  };

  const reorderTodos = (date: string, newItems: TodoItem[]) => {
      setDailyTodos(prev => prev.map(d => d.date === date ? { ...d, items: newItems } : d));
  };

  const exportData = () => {
    const data = { events, notes, routines, dailyTodos, settings, tags };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `listify-export.json`;
    a.click();
  };

  const importBackup = (jsonData: string) => {
      try {
          const data = JSON.parse(jsonData);
          setEvents(data.events || []);
          setNotes(data.notes || []);
          setSettings(data.settings || settings);
          showToast('Data imported', 'success');
      } catch (e) {
          showToast('Import failed', 'error');
      }
  };

  const clearData = async () => {
    if (window.confirm("Delete all data?")) {
        clearLocalState();
        localStorage.clear();
        if (user && isSupabaseConfigured && supabase) {
          await supabase.from('user_data').delete().eq('user_id', user.id);
        }
        window.location.reload();
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AppContext.Provider value={{
      events, notes, routines, dailyTodos, settings, currentView, searchQuery, tags, selectedEventId, selectedNoteId, toasts, isFocusModeActive, draftEvent, user, isSyncing,
      setSettings, setCurrentView, goBack, setSearchQuery, setSelectedEventId, setSelectedNoteId, setFocusModeActive, setDraftEvent,
      addEvent, addEvents, updateEvent, deleteEvent,
      addTag: (tag) => setTags([...tags, tag]),
      addNote, updateNote, deleteNote,
      addRoutine, updateRoutine: (r) => setRoutines(routines.map(prev => prev.id === r.id ? r : prev)), deleteRoutine,
      getTodosForDate, getArchivedTodos: () => dailyTodos, getReferencingTodos: (id) => [], addTodo, toggleTodo, reorderTodos,
      exportData, importBackup, clearData, showToast, removeToast, signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};
