
// Updated model name to gemini-3-flash-preview as per guidelines for task-based selection
export const GEMINI_MODEL_ROUTINE = 'gemini-3-flash-preview';

// Moodle API constants
export const MOODLE_DEFAULT_TIMEOUT = 30000;
export const MOODLE_DEFAULT_SERVICE = 'moodle_mobile_app';

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
