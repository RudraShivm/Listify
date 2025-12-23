
export enum ViewType {
  NOTES = 'notes',
  TODAY = 'today',
  CALENDAR = 'calendar',
  EVENTS = 'events',
  TODOS = 'todos',
  ROUTINES = 'routines',
  SETTINGS = 'settings',
  EVENT_EDIT = 'event_edit',
  EVENT_ARCHIVE = 'event_archive',
  NOTE_ARCHIVE = 'note_archive'
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface RoutineBreakpoint {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String
  isAllDay: boolean;
  tags: string[]; // Tag IDs
  linkedNoteIds?: string[]; // IDs of attached notes
  alarmOffset?: number; // Minutes before
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
  recurrenceEnd?: string; // ISO String or null/undefined for forever
  routineId?: string; 
  recurringEventId?: string; // ID of the parent/group
  moodleEventId?: string; // Moodle event ID for external events
  courseName?: string; // Course name for Moodle events
  url?: string; // URL for Moodle events
  // For preserving recurrence rules if needed for regeneration
  breakpoints?: RoutineBreakpoint[]; 
}

export interface Note {
  id: string;
  title: string;
  content: string; // Stored as Markdown, rendered as HTML
  tags: string[];
  referencedEventIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  referencedEventId?: string;
}

export interface DailyTodoList {
  date: string; // YYYY-MM-DD
  items: TodoItem[];
  isArchived: boolean;
}

export interface Routine {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  createHolidayEvents: boolean; // Routine specific setting
  breakpoints: RoutineBreakpoint[];
  eventsTemplate: {
    id: string; // Added ID for editing templates
    dayOfWeek: number; // 0-6
    title: string;
    startTime: string; // HH:mm
    endTime?: string; // HH:mm
  }[];
}

export interface ArchivedEvent extends Event {
  archivedAt: string; // ISO string when archived
}

export interface ArchivedNote extends Note {
  archivedAt: string; // ISO string when archived
}

export interface AppSettings {
  moveCompletedTodosToBottom: boolean;
  upcomingWindow: number;
  defaultEventDuration: number; // in minutes
  apiKey?: string;
  theme: ThemeMode;
  themeId: string; // ID of the selected color theme
  createHolidayEvents: boolean;
  startOfWeek: 'sunday' | 'monday' | 'saturday';
  timeFormat: '12h' | '24h';
  defaultView: ViewType;
  focusMode: boolean; // Hide sidebar when typing in notes
  mobileBottomBarItems: ViewType[]; // Ordered list of views to show in mobile bottom bar
  moodleEnabled: boolean; // Whether to fetch Moodle events
  moodleUrl: string; // Moodle instance URL
  moodleUsername: string; // Moodle username
  moodlePassword: string; // Moodle password (stored encrypted)
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
