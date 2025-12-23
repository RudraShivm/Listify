import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

// Module-level alarm storage to avoid React hook issues in context
const scheduledAlarmsMap = new Map<string, { timeoutId: NodeJS.Timeout, alarmOffset: number, scheduledAt: number }>();
import { Event, Note, Routine, DailyTodoList, ThemeMode, TodoItem, ViewType, AppSettings, Tag, ToastMessage, ArchivedEvent, ArchivedNote } from '../types';
import { generateEventsFromRoutine, parseTime } from '../utils/appUtils';
import { addDays, addMinutes } from 'date-fns';
import { DEFAULT_TAGS, THEMES } from '../constants';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AppState {
  events: Event[];
  notes: Note[];
  routines: Routine[];
  dailyTodos: DailyTodoList[];
  tags: Tag[];
  archivedEvents: ArchivedEvent[];
  archivedNotes: ArchivedNote[];
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
  notificationPermission: NotificationPermission;
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
  archiveEvent: (id: string) => void;
  restoreEvent: (id: string) => void;
  permanentlyDeleteEvent: (id: string) => void;
  setDraftEvent: (event: Partial<Event> | null) => void;
  addTag: (tag: Tag) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
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
  clearLocalData: () => void;
  fetchMoodleEvents: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  signOut: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  scheduleAlarm: (event: Event) => void;
  cancelAlarm: (eventId: string) => void;
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
    themeId: 'notion',
    startOfWeek: 'saturday',
    timeFormat: '12h',
    defaultView: ViewType.NOTES,
    focusMode: false,
    mobileBottomBarItems: [ViewType.NOTES, ViewType.TODAY, ViewType.CALENDAR, ViewType.EVENTS, ViewType.TODOS, ViewType.ROUTINES],
    moodleEnabled: false,
    moodleUrl: '',
    moodleUsername: '',
    moodlePassword: ''
  };

  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [events, setEvents] = useState<Event[]>(() => load('events', []));
  const [notes, setNotes] = useState<Note[]>(() => load('notes', []));
  const [routines, setRoutines] = useState<Routine[]>(() => load('routines', []));
  const [dailyTodos, setDailyTodos] = useState<DailyTodoList[]>(() => load('dailyTodos', []));
  const [archivedEvents, setArchivedEvents] = useState<ArchivedEvent[]>(() => load('archivedEvents', []));
  const [archivedNotes, setArchivedNotes] = useState<ArchivedNote[]>(() => load('archivedNotes', []));
  const [archivedMoodleEventIds, setArchivedMoodleEventIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('archivedMoodleEventIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [permanentlyDeletedMoodleEventIds, setPermanentlyDeletedMoodleEventIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('permanentlyDeletedMoodleEventIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [tags, setTags] = useState<Tag[]>(() => load('tags', DEFAULT_TAGS));
  const [settings, setSettingsState] = useState<AppSettings>(() => load('settings', defaultSettings));
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  // Using module-level Map for synchronous access

  const setSettings = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };
  const [currentView, setCurrentViewState] = useState<ViewType>(() => {
    const savedView = localStorage.getItem('currentView');
    return savedView ? savedView as ViewType : load('settings', defaultSettings).defaultView;
  });
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

  // Register service worker and check notification permission
  useEffect(() => {

    // Register service worker for background alarms
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/Listify/sw.js')
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Check notification permission status
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Schedule alarms for existing events when permission is granted
  useEffect(() => {
    if (notificationPermission === 'granted') {
      events.forEach(event => {
        if (event.alarmOffset && event.alarmOffset !== -1) {
          scheduleAlarm(event, false); // Don't show toast for existing events
        }
      });
    } else if (notificationPermission === 'denied') {
      // Clear all scheduled alarms if permission is denied
      scheduledAlarmsMap.forEach(data => clearTimeout(data.timeoutId));
      scheduledAlarmsMap.clear();
    }
  }, [notificationPermission, events]);

  // Cleanup scheduled alarms on unmount
  useEffect(() => {
    return () => {
      scheduledAlarmsMap.forEach(data => clearTimeout(data.timeoutId));
      scheduledAlarmsMap.clear();
    };
  }, []);

  const clearLocalState = () => {
    // Cancel all scheduled alarms
    scheduledAlarmsMap.forEach(data => clearTimeout(data.timeoutId));
    scheduledAlarmsMap.clear();

    setEvents([]);
    setNotes([]);
    setRoutines([]);
    setDailyTodos([]);
    setArchivedEvents([]);
    setArchivedNotes([]);
    setArchivedMoodleEventIds(new Set()); // Reset archived Moodle event IDs
    setPermanentlyDeletedMoodleEventIds(new Set()); // Reset permanently deleted Moodle event IDs
    setCurrentViewState(defaultSettings.defaultView); // Reset to default view
    setViewHistory([]); // Clear navigation history
    setSearchQuery(''); // Clear search
    setSelectedEventId(null); // Clear selected event
    setSelectedNoteId(null); // Clear selected note
    setDraftEvent(null); // Clear draft event
    setFocusModeActive(false); // Reset focus mode
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

  // Sync Moodle events when settings change
  useEffect(() => {
    if (settings.moodleEnabled && settings.moodleUrl && settings.moodleUsername && settings.moodlePassword) {
      // Debounce Moodle sync to avoid excessive API calls
      const timer = setTimeout(() => {
        fetchMoodleEvents();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.moodleEnabled, settings.moodleUrl, settings.moodleUsername, settings.moodlePassword]);

  // --- Standard Logic ---
  const setCurrentView = (view: ViewType) => {
    if (view !== currentView) {
      setViewHistory(prev => [...prev, currentView]);
      setCurrentViewState(view);
      localStorage.setItem('currentView', view);
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

  const addEvent = (event: Event) => {
    setEvents(prev => [...prev, event]);
    if (event.alarmOffset && event.alarmOffset !== -1) {
      scheduleAlarm(event, true); // Show toast for newly created events
    }
  };
  const addEvents = (newEvents: Event[]) => {
    setEvents(prev => [...prev, ...newEvents]);
    newEvents.forEach(event => {
      if (event.alarmOffset && event.alarmOffset !== -1) {
        scheduleAlarm(event, true); // Show toast for newly created events
      }
    });
  };

  const updateEvent = (updatedEvent: Event, mode: 'single' | 'future' | 'all' = 'single') => {
    // Get the existing event to compare alarm settings
    const existingEvent = events.find(e => e.id === updatedEvent.id);

    if (updatedEvent.linkedNoteIds) {
      setNotes(prev => prev.map(n => {
        const isLinked = updatedEvent.linkedNoteIds?.includes(n.id);
        const hasRef = n.referencedEventIds.includes(updatedEvent.id);
        if (isLinked && !hasRef) return { ...n, referencedEventIds: [...n.referencedEventIds, updatedEvent.id] };
        if (!isLinked && hasRef) return { ...n, referencedEventIds: n.referencedEventIds.filter(id => id !== updatedEvent.id) };
        return n;
      }));
    }

    // Only cancel and reschedule alarm if alarm settings changed
    const existingAlarmOffset = existingEvent?.alarmOffset ?? -1;
    const newAlarmOffset = updatedEvent.alarmOffset ?? -1;

    if (existingAlarmOffset !== newAlarmOffset) {
      // Cancel existing alarm
      cancelAlarm(updatedEvent.id);
      // Schedule new alarm if needed
      if (newAlarmOffset !== -1) {
        scheduleAlarm(updatedEvent, true); // Show toast when alarm settings change
      }
    }

    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const deleteEvent = (id: string) => {
    cancelAlarm(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const archiveEvent = (id: string) => {
    cancelAlarm(id);
    const eventToArchive = events.find(e => e.id === id);
    if (eventToArchive) {
      // Remove from active events
      setEvents(prev => prev.filter(e => e.id !== id));
      // Add to archived events
      const archivedEvent: ArchivedEvent = {
        ...eventToArchive,
        archivedAt: new Date().toISOString()
      };
      const newArchivedEvents = [archivedEvent, ...archivedEvents];
      setArchivedEvents(newArchivedEvents);
      localStorage.setItem('archivedEvents', JSON.stringify(newArchivedEvents));

      // If it's a Moodle event, also add its ID to the archived set for persistence
      if (eventToArchive.moodleEventId) {
        setArchivedMoodleEventIds(prev => {
          const newSet = new Set(prev);
          newSet.add(eventToArchive.moodleEventId);
          localStorage.setItem('archivedMoodleEventIds', JSON.stringify([...newSet]));
          return newSet;
        });
      }
    }
  };

  const restoreEvent = (id: string) => {
    const eventToRestore = archivedEvents.find(e => e.id === id);
    if (eventToRestore) {
      // Remove from archived events
      const newArchivedEvents = archivedEvents.filter(e => e.id !== id);
      setArchivedEvents(newArchivedEvents);
      localStorage.setItem('archivedEvents', JSON.stringify(newArchivedEvents));

      // If it's a Moodle event, remove its ID from the archived set
      if (eventToRestore.moodleEventId) {
        setArchivedMoodleEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventToRestore.moodleEventId);
          localStorage.setItem('archivedMoodleEventIds', JSON.stringify([...newSet]));
          return newSet;
        });
      }

      // Add back to active events (without archivedAt)
      const { archivedAt, ...restoredEvent } = eventToRestore;
      setEvents(prev => [...prev, restoredEvent]);

      // Reschedule alarm if it exists and alarm time is still valid
      if (restoredEvent.alarmOffset && restoredEvent.alarmOffset !== -1) {
        const eventTime = new Date(restoredEvent.startTime);
        const alarmTime = new Date(eventTime.getTime() - (restoredEvent.alarmOffset * 60 * 1000));
        const now = new Date();

        if (alarmTime > now) {
          scheduleAlarm(restoredEvent, false); // Don't show toast for restored events
        }
      }
    }
  };

  const permanentlyDeleteEvent = (id: string) => {
    // Cancel any lingering alarms for this event
    cancelAlarm(id);

    const eventToDelete = archivedEvents.find(e => e.id === id);

    // Remove from archived events
    const newArchivedEvents = archivedEvents.filter(e => e.id !== id);
    setArchivedEvents(newArchivedEvents);
    localStorage.setItem('archivedEvents', JSON.stringify(newArchivedEvents));

    // If it's a Moodle event, remove from archived set and add to permanently deleted set
    if (eventToDelete?.moodleEventId) {
      // Remove from archived set
      setArchivedMoodleEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventToDelete.moodleEventId);
        localStorage.setItem('archivedMoodleEventIds', JSON.stringify([...newSet]));
        return newSet;
      });

      // Add to permanently deleted set
      setPermanentlyDeletedMoodleEventIds(prev => {
        const newSet = new Set(prev);
        newSet.add(eventToDelete.moodleEventId);
        localStorage.setItem('permanentlyDeletedMoodleEventIds', JSON.stringify([...newSet]));
        return newSet;
      });
    }

    // Update note references - remove this event from all notes (both active and archived)
    const currentNotes = JSON.parse(localStorage.getItem('notes') || '[]');

    const updatedNotes = currentNotes.map((note: any) => {
      // Remove event ID from referencedEventIds
      const updatedReferencedEventIds = (note.referencedEventIds || []).filter((eventId: string) => eventId !== id);

      // Also remove event links from HTML content
      let updatedContent = note.content;
      if (note.content) {
        // Remove spans with data-event-id matching the deleted event
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const eventLinks = tempDiv.querySelectorAll(`[data-event-id="${id}"]`);
        eventLinks.forEach(link => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        });
        updatedContent = tempDiv.innerHTML;
      }

      return {
        ...note,
        referencedEventIds: updatedReferencedEventIds,
        content: updatedContent
      };
    });

    localStorage.setItem('notes', JSON.stringify(updatedNotes));

    const currentArchivedNotes = JSON.parse(localStorage.getItem('archivedNotes') || '[]');
    const updatedArchivedNotes = currentArchivedNotes.map((note: any) => {
      // Remove event ID from referencedEventIds
      const updatedReferencedEventIds = (note.referencedEventIds || []).filter((eventId: string) => eventId !== id);

      // Also remove event links from HTML content
      let updatedContent = note.content;
      if (note.content) {
        // Remove spans with data-event-id matching the deleted event
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const eventLinks = tempDiv.querySelectorAll(`[data-event-id="${id}"]`);
        eventLinks.forEach(link => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        });
        updatedContent = tempDiv.innerHTML;
      }

      return {
        ...note,
        referencedEventIds: updatedReferencedEventIds,
        content: updatedContent
      };
    });
    localStorage.setItem('archivedNotes', JSON.stringify(updatedArchivedNotes));

    // Update state - make sure this triggers a re-render
    console.log('Calling setNotes with updated notes');
    setNotes(updatedNotes);
    console.log('setNotes called, notes should be updated');

    // Force a reload to ensure state is updated
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const addNote = (note: Note) => setNotes(prev => [note, ...prev]);
  const updateNote = (note: Note) => setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const archiveNote = (id: string) => {
    const noteToArchive = notes.find(n => n.id === id);
    if (noteToArchive) {
      // Remove from active notes
      setNotes(prev => prev.filter(n => n.id !== id));
      // Add to archived notes
      const archivedNote: ArchivedNote = {
        ...noteToArchive,
        archivedAt: new Date().toISOString()
      };
      const newArchivedNotes = [archivedNote, ...archivedNotes];
      setArchivedNotes(newArchivedNotes);
      localStorage.setItem('archivedNotes', JSON.stringify(newArchivedNotes));
    }
  };

  const restoreNote = (id: string) => {
    const noteToRestore = archivedNotes.find(n => n.id === id);
    if (noteToRestore) {
      // Remove from archived notes
      const newArchivedNotes = archivedNotes.filter(n => n.id !== id);
      setArchivedNotes(newArchivedNotes);
      localStorage.setItem('archivedNotes', JSON.stringify(newArchivedNotes));

      // Add back to active notes (without archivedAt)
      const { archivedAt, ...restoredNote } = noteToRestore;
      setNotes(prev => [...prev, restoredNote]);
    }
  };

  const permanentlyDeleteNote = (id: string) => {

    try {
      // Remove from archived notes
      const newArchivedNotes = archivedNotes.filter(n => n.id !== id);
      setArchivedNotes(newArchivedNotes);
      localStorage.setItem('archivedNotes', JSON.stringify(newArchivedNotes));

      // Update event references - remove this note from all events (both active and archived)

      const updatedEvents = events.map((event: any) => {
        const originalLinkedNoteIds = event.linkedNoteIds || [];
        const updatedLinkedNoteIds = originalLinkedNoteIds.filter((noteId: string) => noteId !== id);
        return {
          ...event,
          linkedNoteIds: updatedLinkedNoteIds
        };
      });


      // Update localStorage
      localStorage.setItem('events', JSON.stringify(updatedEvents));

      const currentArchivedEvents = JSON.parse(localStorage.getItem('archivedEvents') || '[]');

      const updatedArchivedEvents = currentArchivedEvents.map((event: any) => {
        const originalLinkedNoteIds = event.linkedNoteIds || [];
        const updatedLinkedNoteIds = originalLinkedNoteIds.filter((noteId: string) => noteId !== id);
        return {
          ...event,
          linkedNoteIds: updatedLinkedNoteIds
        };
      });
      localStorage.setItem('archivedEvents', JSON.stringify(updatedArchivedEvents));

      // Update state
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error in permanentlyDeleteNote:', error);
    }
  };

  const addRoutine = (routine: Routine) => {
    setRoutines(prev => [...prev, routine]);
    const newEvents = generateEventsFromRoutine(routine);
    setEvents(prev => [...prev, ...newEvents]);
  };

  const updateRoutine = (updatedRoutine: Routine) => {
    // Get all existing events for this routine (both active and archived)
    const existingEvents = events.filter(e => e.routineId === updatedRoutine.id);
    const existingArchivedEvents = archivedEvents.filter(e => e.routineId === updatedRoutine.id);

    // Create a map of dayOfWeek -> template for the updated routine
    const templateMap = new Map();
    updatedRoutine.eventsTemplate.forEach(template => {
      templateMap.set(template.dayOfWeek, template);
    });

    // Update existing events: change title based on dayOfWeek
    // Keep all other properties (including times and attachments) unchanged
    const updatedEvents = existingEvents.map(existingEvent => {
      // Calculate dayOfWeek from the event's start date
      const eventDate = new Date(existingEvent.startTime);
      const dayOfWeek = eventDate.getDay();

      const newTemplate = templateMap.get(dayOfWeek);
      if (newTemplate) {
        // Update title and recurringEventId, preserve everything else including attachments
        return {
          ...existingEvent,
          title: newTemplate.title,
          recurringEventId: `routine-${updatedRoutine.id}-${newTemplate.title}-${dayOfWeek}`,
        };
      } else {
        // This day of week no longer has a template - keep the event but remove routineId
        return {
          ...existingEvent,
          routineId: undefined,
          recurringEventId: undefined,
        };
      }
    }) as Event[];

    const updatedArchivedEvents = existingArchivedEvents.map(existingEvent => {
      const eventDate = new Date(existingEvent.startTime);
      const dayOfWeek = eventDate.getDay();

      const newTemplate = templateMap.get(dayOfWeek);
      if (newTemplate) {
        return {
          ...existingEvent,
          title: newTemplate.title,
          recurringEventId: `routine-${updatedRoutine.id}-${newTemplate.title}-${dayOfWeek}`,
        } as ArchivedEvent;
      } else {
        // This day of week no longer has a template - keep the event but remove routineId
        return {
          ...existingEvent,
          routineId: undefined,
          recurringEventId: undefined,
        } as ArchivedEvent;
      }
    }) as ArchivedEvent[];

    // For new templates (days that don't have existing events), create one event for the next occurrence
    const newEvents: Event[] = [];
    const existingDays = new Set<number>();

    // Mark which days already have events
    existingEvents.forEach(event => {
      const eventDate = new Date(event.startTime);
      existingDays.add(eventDate.getDay());
    });

    // Create one event per new template (next occurrence of that day)
    updatedRoutine.eventsTemplate.forEach(template => {
      if (!existingDays.has(template.dayOfWeek)) {
        // This is a new day - create one event for the next occurrence
        const today = new Date();
        const daysUntilTarget = (template.dayOfWeek - today.getDay() + 7) % 7;
        const targetDate = addDays(today, daysUntilTarget === 0 ? 7 : daysUntilTarget);

        let eventStart = parseTime(template.startTime, targetDate);
        let eventEnd;
        if (template.endTime) {
          eventEnd = parseTime(template.endTime, targetDate);
        } else {
          eventEnd = addMinutes(eventStart, 60);
        }

        newEvents.push({
          id: crypto.randomUUID(),
          title: template.title,
          startTime: eventStart.toISOString(),
          endTime: eventEnd.toISOString(),
          isAllDay: false,
          tags: [],
          routineId: updatedRoutine.id,
          recurrence: 'weekly',
          recurringEventId: `routine-${updatedRoutine.id}-${template.title}-${template.dayOfWeek}`
        });
      }
    });

    // Update state - remove all routine events and add back the updated versions
    setEvents(prev => {
      // Remove all existing routine events
      const nonRoutineEvents = prev.filter(event => event.routineId !== updatedRoutine.id);
      // Add back the updated events
      return [...nonRoutineEvents, ...updatedEvents, ...newEvents];
    });

    setArchivedEvents(prev => {
      // Remove all existing routine archived events
      const nonRoutineEvents = prev.filter(event => event.routineId !== updatedRoutine.id);
      // Add back the updated archived events
      return [...nonRoutineEvents, ...updatedArchivedEvents];
    });

    // Update the routine itself
    setRoutines(prev => prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));

    // Update the routine itself
    setRoutines(prev => prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));
  };

  const deleteRoutine = (id: string) => {
    const routineToDelete = routines.find(r => r.id === id);
    if (!routineToDelete) return;

    // Count events created by this routine (both active and archived)
    const eventsToDelete = events.filter(e => e.routineId === id);
    const archivedEventsToDelete = archivedEvents.filter(e => e.routineId === id);
    const totalEventsToDelete = eventsToDelete.length + archivedEventsToDelete.length;

    const message = `This will permanently delete the "${routineToDelete.name}" routine and all ${totalEventsToDelete} events it created (${eventsToDelete.length} active, ${archivedEventsToDelete.length} archived). This action cannot be undone. Are you sure?`;

    if (window.confirm(message)) {
      // Delete all events created by this routine (both active and archived)
      const activeBeforeCount = events.length;
      const archivedBeforeCount = archivedEvents.length;

      setEvents(prev => prev.filter(e => e.routineId !== id));
      setArchivedEvents(prev => prev.filter(e => e.routineId !== id));

      const activeAfterCount = events.length;
      const archivedAfterCount = archivedEvents.length;


      // Delete the routine itself
      setRoutines(prev => prev.filter(r => r.id !== id));
    }
  };

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
  const BACKEND_URL = process.env.VITE_BACKEND_URL || '';
  const fetchMoodleEvents = async () => {
    if (!settings.moodleEnabled || !settings.moodleUrl || !settings.moodleUsername || !settings.moodlePassword) {
      return;
    }

    try {
      setIsSyncing(true);

      const response = await fetch(`${BACKEND_URL}/api/moodle/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moodleUrl: settings.moodleUrl,
          username: settings.moodleUsername,
          password: settings.moodlePassword,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Moodle events');
      }

      // Convert Moodle events to our Event format and add them
      const moodleEvents: Event[] = result.data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        tags: event.tags || [],
        moodleEventId: event.moodleEventId,
        courseName: event.courseName,
        url: event.url
      }));

      // Filter out events that are archived or permanently deleted (don't re-add them)
      const activeMoodleEvents = moodleEvents.filter(event =>
        !archivedMoodleEventIds.has(event.moodleEventId) &&
        !permanentlyDeletedMoodleEventIds.has(event.moodleEventId)
      );

      // Remove existing Moodle events and add new ones (excluding archived ones)
      setEvents(prev => {
        const withoutMoodle = prev.filter(e => !e.moodleEventId);
        // Deduplicate by moodleEventId to prevent any remaining duplicates
        const existingMoodleIds = new Set(withoutMoodle.map(e => e.moodleEventId));
        const deduplicatedNewEvents = activeMoodleEvents.filter(e => !existingMoodleIds.has(e.moodleEventId));
        return [...withoutMoodle, ...deduplicatedNewEvents];
      });

    } catch (error: any) {
      console.error('Moodle sync error:', error);
      showToast(`Failed to sync Moodle events: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Function to clear only app-specific localStorage keys (not auth session or settings)
  const clearLocalDataOnly = () => {
    const appKeys = ['events', 'notes', 'routines', 'dailyTodos', 'tags', 'archivedEvents', 'archivedNotes', 'archivedMoodleEventIds', 'permanentlyDeletedMoodleEventIds', 'currentView'];
    appKeys.forEach(key => localStorage.removeItem(key));
    clearLocalState();
    showToast('Local data cleared successfully', 'success');
  };

  const clearData = async () => {
    if (!user) {
      // If not logged in, just clear local data
      if (window.confirm("This will permanently delete all your local data. Are you sure?")) {
        clearLocalDataOnly();
      }
      return;
    }

    // If logged in, clear account data from Supabase (but preserve settings)
    if (window.confirm("This will permanently delete all your account data from our servers, including events, notes, routines, and todos. Your settings will be preserved. This action cannot be undone. Are you sure?")) {
      try {
        setIsSyncing(true);
        showToast('Deleting account data...', 'info');

        // Clear data from Supabase but preserve settings
        const { error } = await supabase
          .from('user_data')
          .update({
            events: [],
            notes: [],
            routines: [],
            daily_todos: [],
            tags: [],
            updated_at: new Date().toISOString()
            // settings field is intentionally omitted to preserve it
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting user data:', error);
          showToast('Error deleting account data. Please try again.', 'error');
          return;
        }

        // Then clear local data (but not auth session)
        clearLocalDataOnly();

        showToast('All account data deleted successfully', 'success');

        // Small delay to show the success message before reload
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (error) {
        console.error('Error during data clearing:', error);
        showToast('Error clearing data. Please try again.', 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Notification permission management
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      showToast('Notifications are not supported in this browser', 'error');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      showToast('Failed to request notification permission', 'error');
      return 'denied';
    }
  };

  // Alarm scheduling
  const scheduleAlarm = async (event: Event, showToastNotification: boolean = true) => {

    // Verify the event is still active and not archived
    const isActive = events.some(e => e.id === event.id);
    const isArchived = archivedEvents.some(e => e.id === event.id);

    if (!isActive || isArchived) {
      return;
    }

    // Cancel any existing alarm for this event first
    cancelAlarm(event.id);

    if (!event.alarmOffset || event.alarmOffset === -1) {
      return;
    }

    if (notificationPermission !== 'granted') {
      return;
    }

    const eventTime = new Date(event.startTime);
    const alarmTime = new Date(eventTime.getTime() - (event.alarmOffset * 60 * 1000));
    const now = new Date();

    // For "at time of event" (alarmOffset = 0), don't show immediately unless very close to now
    // For other alarms, show immediately if within 30 seconds
    const timeDiff = Math.abs(alarmTime.getTime() - now.getTime());

    const shouldShowImmediately = event.alarmOffset === 0
      ? timeDiff < 10000  // Only for "at time of event" if within 10 seconds
      : timeDiff < 30000; // For other alarms, within 30 seconds

    if (shouldShowImmediately) {
      try {
        const notification = new Notification(`Event Reminder: ${event.title}`, {
          body: `Your event "${event.title}" is starting ${event.alarmOffset === 0 ? 'now' : `in ${event.alarmOffset} minutes`}`,
          tag: `event-${event.id}`,
          requireInteraction: true
        });

        setTimeout(() => {
          if (!notification.closed) {
            notification.close();
          }
        }, 10000);
      } catch (error) {
        console.error('Failed to show immediate notification:', error);
      }
      return;
    }

    // Only schedule if alarm time is in the future
    if (alarmTime <= now) {
      return;
    }

    const delay = alarmTime.getTime() - now.getTime();

    try {
      // Try to use service worker for background alarms
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_ALARM',
          event,
          delay
        });

        // Show success toast with formatted time
        if (showToastNotification) {
          const timeString = alarmTime.toLocaleDateString() + ' at ' + alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          showToast(`Alarm set for ${timeString}`, 'success');
        }
      } else {
        // Fallback to setTimeout for foreground alarms
        // Fallback to setTimeout for foreground alarms
        const timeoutId = setTimeout(() => {
          // Double-check that the event still exists and is active before showing notification
          const currentEvent = events.find(e => e.id === event.id);
          const isArchived = archivedEvents.some(e => e.id === event.id);

          if (!currentEvent || isArchived) {
            scheduledAlarmsMap.delete(event.id);
            return;
          }

          // Check if alarm settings have changed since scheduling
          const alarmData = scheduledAlarmsMap.get(event.id);
          if (!alarmData || alarmData.alarmOffset !== event.alarmOffset) {
            scheduledAlarmsMap.delete(event.id);
            return;
          }

          const notification = new Notification(`Event Reminder: ${event.title}`, {
            body: `Your event "${event.title}" is starting ${event.alarmOffset === 0 ? 'now' : `in ${event.alarmOffset} minutes`}`,
            tag: `event-${event.id}`,
            requireInteraction: true
          });

          // Remove from scheduled alarms synchronously
          scheduledAlarmsMap.delete(event.id);

          // Auto-close after 10 seconds if not interacted with
          setTimeout(() => {
            if (!notification.closed) {
              notification.close();
            }
          }, 10000);
        }, delay);

        // Store the timeout data synchronously
        scheduledAlarmsMap.set(event.id, {
          timeoutId,
          alarmOffset: event.alarmOffset,
          scheduledAt: Date.now()
        });

        // Show success toast with formatted time
        if (showToastNotification) {
          const timeString = alarmTime.toLocaleDateString() + ' at ' + alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          showToast(`Alarm set for ${timeString}`, 'success');
        }
      }
    } catch (error) {
      console.error('Failed to schedule alarm:', error);
    }
  };

  const cancelAlarm = (eventId: string) => {
    // Clear timeout synchronously using module-level map
    const alarmData = scheduledAlarmsMap.get(eventId);
    if (alarmData) {
      clearTimeout(alarmData.timeoutId);
      scheduledAlarmsMap.delete(eventId);
    }

    // Also cancel service worker alarm if possible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_ALARM',
        eventId
      });
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AppContext.Provider value={{
      events, notes, routines, dailyTodos, archivedEvents, archivedNotes, archivedMoodleEventIds, permanentlyDeletedMoodleEventIds, settings, currentView, searchQuery, tags, selectedEventId, selectedNoteId, toasts, isFocusModeActive, draftEvent, user, isSyncing, notificationPermission,
      setSettings, setCurrentView, goBack, setSearchQuery, setSelectedEventId, setSelectedNoteId, setFocusModeActive, setDraftEvent,
      addEvent, addEvents, updateEvent, deleteEvent, archiveEvent, restoreEvent, permanentlyDeleteEvent,
      addTag: (tag) => setTags([...tags, tag]),
      addNote, updateNote, deleteNote, archiveNote, restoreNote, permanentlyDeleteNote,
      addRoutine, updateRoutine, deleteRoutine,
      getTodosForDate, getArchivedTodos: () => dailyTodos, getReferencingTodos: (id) => [], addTodo, toggleTodo, reorderTodos,
      exportData, importBackup, clearData, clearLocalData: clearLocalDataOnly, fetchMoodleEvents, showToast, removeToast, signOut, requestNotificationPermission, scheduleAlarm, cancelAlarm
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
