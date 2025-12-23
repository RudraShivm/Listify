import express from 'express';
import axios from 'axios';
import { MOODLE_DEFAULT_TIMEOUT, MOODLE_DEFAULT_SERVICE } from '../constants.js';

const router = express.Router();

// Moodle API Client
class MoodleClient {
  constructor(private baseUrl: string, private token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async authenticate(username: string, password: string, service: string = MOODLE_DEFAULT_SERVICE) {
    try {
      const url = `${this.baseUrl}/login/token.php`;
      const response = await axios.get(url, {
        params: { username, password, service },
        timeout: MOODLE_DEFAULT_TIMEOUT
      });

      const data = response.data;

      if (data.token) {
        this.token = data.token;
        return { success: true, token: data.token };
      } else if (data.error) {
        return { success: false, error: data.error };
      } else {
        return { success: false, error: 'Unexpected response from Moodle' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async callAPI(functionName: string, params: any = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const url = `${this.baseUrl}/webservice/rest/server.php`;

      const data = {
        wstoken: this.token,
        wsfunction: functionName,
        moodlewsrestformat: 'json',
        ...params
      };

      const response = await axios.post(url, null, {
        params: data,
        timeout: MOODLE_DEFAULT_TIMEOUT
      });

      const result = response.data;

      if (result && typeof result === 'object' && result.exception) {
        throw new Error(result.message || 'API error');
      }

      return result;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  async getCalendarEvents() {
    const allEvents = {
      actionEvents: [],
      upcomingEvents: [],
      standardEvents: [],
      monthlyView: null
    };

    // Method 1: Action events by timesort
    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await this.callAPI('core_calendar_get_action_events_by_timesort', {
        timesortfrom: now,
        limitnum: 50
      });
      if (result?.events) {
        allEvents.actionEvents = result.events;
      }
    } catch (error) {
      console.log('Action events failed:', (error as Error).message);
    }

    // Method 2: Upcoming view
    try {
      const result = await this.callAPI('core_calendar_get_calendar_upcoming_view');
      if (result?.events) {
        allEvents.upcomingEvents = result.events;
      }
    } catch (error) {
      console.log('Upcoming view failed:', (error as Error).message);
    }

    // Method 3: Standard calendar events
    try {
      const now = Math.floor(Date.now() / 1000);
      const sixMonthsLater = now + (180 * 24 * 60 * 60);

      const result = await this.callAPI('core_calendar_get_calendar_events', {
        'options[userevents]': 1,
        'options[siteevents]': 1,
        'options[timestart]': now,
        'options[timeend]': sixMonthsLater
      });

      if (result?.events) {
        allEvents.standardEvents = result.events;
      }
    } catch (error) {
      console.log('Standard events failed:', (error as Error).message);
    }

    // Method 4: Monthly view
    try {
      const now = new Date();
      const result = await this.callAPI('core_calendar_get_calendar_monthly_view', {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      });
      allEvents.monthlyView = result;
    } catch (error) {
      console.log('Monthly view failed:', (error as Error).message);
    }

    return allEvents;
  }
}

// Extract and normalize all events from various sources
function extractAllEvents(calendarData: any) {
  const events: any[] = [];
  const seenIds = new Set();

  // From action events
  if (calendarData.actionEvents) {
    for (const event of calendarData.actionEvents) {
      if (event.id && !seenIds.has(event.id)) {
        events.push(normalizeMoodleEvent(event, 'action'));
        seenIds.add(event.id);
      }
    }
  }

  // From upcoming events
  if (calendarData.upcomingEvents) {
    for (const event of calendarData.upcomingEvents) {
      if (event.id && !seenIds.has(event.id)) {
        events.push(normalizeMoodleEvent(event, 'upcoming'));
        seenIds.add(event.id);
      }
    }
  }

  // From standard events
  if (calendarData.standardEvents) {
    for (const event of calendarData.standardEvents) {
      if (event.id && !seenIds.has(event.id)) {
        events.push(normalizeMoodleEvent(event, 'standard'));
        seenIds.add(event.id);
      }
    }
  }

  // From monthly view - get events that might not be in other arrays
  if (calendarData.monthlyView?.weeks) {
    for (const week of calendarData.monthlyView.weeks) {
      if (week.days) {
        for (const day of week.days) {
          if (day.events && Array.isArray(day.events)) {
            for (const event of day.events) {
              if (event.id && !seenIds.has(event.id)) {
                events.push(normalizeMoodleEvent(event, 'monthly'));
                seenIds.add(event.id);
              }
            }
          }
        }
      }
    }
  }

  return events;
}

// Normalize Moodle event to our Event format
function normalizeMoodleEvent(event: any, source: string = 'unknown') {
  const timestamp = event.timesort || event.timestart || 0;
  const dueDate = new Date(timestamp * 1000);

  return {
    id: `moodle-${event.id}`,
    title: event.name || 'Untitled Event',
    description: event.description || '',
    startTime: dueDate.toISOString(),
    endTime: event.timestart ? new Date((event.timestart + (event.timeduration || 3600)) * 1000).toISOString() : undefined,
    isAllDay: event.isallday || false,
    tags: ['moodle'],
    recurrence: 'none', // Moodle events are not recurring
    moodleEventId: event.id,
    courseId: event.course?.id || null,
    courseName: event.course?.shortname || event.course?.fullname || null,
    url: event.url || '',
    source: source,
    moodleData: event
  };
}

// Routes
router.post('/events', async (req, res) => {
  try {
    const { moodleUrl, username, password } = req.body;

    if (!moodleUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: moodleUrl, username, password'
      });
    }

    const client = new MoodleClient(moodleUrl);
    const authResult = await client.authenticate(username, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Authentication failed'
      });
    }

    const calendarData = await client.getCalendarEvents();
    const normalizedEvents = extractAllEvents(calendarData);

    res.json({
      success: true,
      data: {
        events: normalizedEvents,
        count: normalizedEvents.length,
        statistics: {
          totalEvents: normalizedEvents.length,
          actionEvents: calendarData.actionEvents?.length || 0,
          upcomingEvents: calendarData.upcomingEvents?.length || 0,
          standardEvents: calendarData.standardEvents?.length || 0
        },
        raw: calendarData
      }
    });

  } catch (error: any) {
    console.error('Moodle API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { moodleUrl, username, password } = req.body;

    if (!moodleUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const client = new MoodleClient(moodleUrl);
    const authResult = await client.authenticate(username, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        message: 'Moodle credentials are valid'
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;