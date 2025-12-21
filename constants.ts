
import { Tag } from './types';

export const APP_NAME = "Listify";

export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Academic', color: '#6B7FA0' }, // Muted Blue
  { id: '2', name: 'Personal', color: '#52796F' }, // Soft Green
  { id: '3', name: 'Urgent', color: '#C1666B' },   // Muted Red
  { id: '4', name: 'Work', color: '#D4A574' },     // Soft Amber
];

// Updated model name to gemini-3-flash-preview as per guidelines for task-based selection
export const GEMINI_MODEL_ROUTINE = 'gemini-3-flash-preview';

export const MOCK_USER = {
  name: "Student User",
  email: "student@university.edu",
  avatar: "https://picsum.photos/200"
};

export const ROUTINE_PROMPT = `
Analyze this image of a schedule or timetable. 
Extract the routine information into a structured JSON format.

CRITICAL RULES:
1. Return ONLY valid JSON.
2. 'startTime' and 'endTime' should be in 12-hour format with AM/PM (e.g., "09:00 AM", "01:30 PM").
3. If a time range is given (e.g., 9-10am), set both startTime and endTime.
4. 'dayOfWeek': 0=Sunday, 1=Monday, ..., 6=Saturday.

JSON Structure:
{
  "events": [
    { "title": "Math", "dayOfWeek": 1, "startTime": "09:00 AM", "endTime": "10:00 AM" }
  ]
}
`;

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;      // RGB triplet
    bgLight: string;      // RGB triplet
    bgDark: string;       // RGB triplet
    surfaceLight: string; // RGB triplet
    surfaceDark: string;  // RGB triplet
  }
}

export const THEMES: AppTheme[] = [
  {
    id: 'academic',
    name: 'Academic',
    colors: {
      primary: '74 95 122',      // #4A5F7A (Calm Blue-Grey)
      bgLight: '248 249 250',    // #F8F9FA
      bgDark: '26 29 35',        // #1A1D23
      surfaceLight: '255 255 255',
      surfaceDark: '34 38 46',
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      primary: '94 129 172',     // #5E81AC (Polarnight Blue)
      bgLight: '236 239 244',    // #ECEFF4 (Snow Storm)
      bgDark: '46 52 64',        // #2E3440 (Polar Night)
      surfaceLight: '255 255 255',
      surfaceDark: '59 66 82',   // #3B4252
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      primary: '189 147 249',    // #BD93F9 (Purple)
      bgLight: '248 248 242',    // #F8F8F2 (Off-white)
      bgDark: '40 42 54',        // #282A36 (Dracula BG)
      surfaceLight: '255 255 255',
      surfaceDark: '68 71 90',   // #44475A
    }
  },
  {
    id: 'solarized',
    name: 'Solarized',
    colors: {
      primary: '38 139 210',     // #268BD2 (Blue)
      bgLight: '253 246 227',    // #FDF6E3 (Base3)
      bgDark: '0 43 54',         // #002B36 (Base03)
      surfaceLight: '238 232 213', // #EEE8D5 (Base2)
      surfaceDark: '7 54 66',    // #073642 (Base02)
    }
  },
  {
    id: 'github',
    name: 'GitHub',
    colors: {
      primary: '9 105 218',      // #0969DA (Blue)
      bgLight: '255 255 255',    // #FFFFFF
      bgDark: '13 17 23',        // #0D1117 (Dimmed)
      surfaceLight: '246 248 250', // #F6F8FA
      surfaceDark: '22 27 34',   // #161B22
    }
  },
  {
    id: 'sage',
    name: 'Sage',
    colors: {
      primary: '95 133 117',     // #5F8575 (Pastel Sage Green)
      bgLight: '244 247 245',    // #F4F7F5 (Mint White)
      bgDark: '35 43 43',        // #232B2B (Deep Green Grey)
      surfaceLight: '255 255 255',
      surfaceDark: '47 58 58',   // #2F3A3A
    }
  }
];
