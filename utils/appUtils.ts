
import { Routine, Event, RoutineBreakpoint } from '../types';
import { addDays, format, isSameDay, addMinutes, differenceInDays, addWeeks, addMonths } from 'date-fns';

// --- Markdown / HTML Utilities for WYSIWYG ---

export const htmlToMarkdown = (html: string): string => {
    let md = html;
    md = md.replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    md = md.replace(/<i>(.*?)<\/i>/g, '*$1*').replace(/<em>(.*?)<\/em>/g, '*$1*');
    md = md.replace(/<h3>(.*?)<\/h3>/g, '\n### $1\n');
    md = md.replace(/<ul>(.*?)<\/ul>/gs, '$1');
    md = md.replace(/<li>(.*?)<\/li>/g, '- $1\n');
    md = md.replace(/<br\s*\/?>/g, '\n');
    md = md.replace(/<div>/g, '\n').replace(/<\/div>/g, '');
    return md.trim();
};

export const markdownToHtml = (md: string): string => {
    let html = md;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); 
    html = html.replace(/\n/g, '<br>');
    return html;
};

// --- Time Utilities ---

export const parseTime = (timeStr: string, baseDate: Date): Date => {
    try {
        const d = new Date(baseDate);
        d.setSeconds(0);
        d.setMilliseconds(0);
        
        let hours = 0;
        let minutes = 0;
        
        const normalize = timeStr.toLowerCase().trim();
        const isPM = normalize.includes('pm');
        const isAM = normalize.includes('am');
        
        const timePart = normalize.replace(/am|pm/g, '').trim();
        
        const parts = timePart.split(':');
        if (parts.length >= 2) {
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1], 10);
        } else {
            return baseDate; 
        }
        
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        
        d.setHours(hours, minutes);
        return d;
    } catch (e) {
        return baseDate;
    }
};

export const formatTime = (date: Date | string, format24h: boolean): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, format24h ? 'HH:mm' : 'h:mm a');
};

// --- Event Generation ---

export const generateHolidayEvents = (breakpoints: RoutineBreakpoint[], routineId?: string): Event[] => {
    const events: Event[] = [];
    breakpoints.forEach(bp => {
        const start = new Date(bp.startDate);
        const end = new Date(bp.endDate);
        const daysCount = differenceInDays(end, start) + 1;

        let current = start;
        for (let i = 0; i < daysCount; i++) {
            events.push({
                id: crypto.randomUUID(),
                title: `${bp.name} (Day ${i + 1})`,
                startTime: new Date(current.setHours(0,0,0,0)).toISOString(),
                endTime: new Date(current.setHours(23,59,59,999)).toISOString(),
                isAllDay: true,
                tags: ['holiday'],
                recurrence: 'none',
                routineId: routineId // Link holiday events to the routine
            });
            current = addDays(current, 1);
        }
    });
    return events;
};

export const generateEventsFromRoutine = (routine: Routine): Event[] => {
  const generatedEvents: Event[] = [];

  if (routine.createHolidayEvents) {
      generatedEvents.push(...generateHolidayEvents(routine.breakpoints, routine.id));
  }
  
  const startDateStr = routine.startDate;
  const endDateStr = routine.endDate || format(addDays(new Date(startDateStr), 120), 'yyyy-MM-dd'); 
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  let current = start;

  while (current <= end || isSameDay(current, end)) {
      const currentStr = format(current, 'yyyy-MM-dd');
      const isHoliday = routine.breakpoints.some(bp => {
          return currentStr >= bp.startDate && currentStr <= bp.endDate;
      });

      if (!isHoliday) {
          const dayOfWeek = current.getDay();
          const templates = routine.eventsTemplate.filter(t => t.dayOfWeek === dayOfWeek);

          templates.forEach(template => {
              let eventStart = parseTime(template.startTime, current);
              let eventEnd;
              if (template.endTime) {
                  eventEnd = parseTime(template.endTime, current);
              } else {
                  eventEnd = addMinutes(eventStart, 60);
              }

              generatedEvents.push({
                  id: crypto.randomUUID(),
                  title: template.title,
                  startTime: eventStart.toISOString(),
                  endTime: eventEnd.toISOString(),
                  isAllDay: false,
                  tags: [],
                  routineId: routine.id,
                  recurrence: 'weekly',
                  recurringEventId: `routine-${routine.id}-${template.title}-${dayOfWeek}`
              });
          });
      }
      current = addDays(current, 1);
  }

  return generatedEvents;
};

export const generateEventsFromRecurrence = (baseEvent: Event): Event[] => {
    const events: Event[] = [];
    
    // If no recurrence, just return the base event
    if (!baseEvent.recurrence || baseEvent.recurrence === 'none') {
        return [baseEvent];
    }

    const start = new Date(baseEvent.startTime);
    const end = baseEvent.endTime ? new Date(baseEvent.endTime) : undefined;
    const duration = end ? end.getTime() - start.getTime() : 0;
    
    // Determine limit (Default 1 year if not specified)
    let limitDate = addDays(start, 365); 
    if (baseEvent.recurrenceEnd) {
        limitDate = new Date(baseEvent.recurrenceEnd);
    }

    let current = start;
    const groupId = baseEvent.recurringEventId || crypto.randomUUID();

    // Safety brake for infinite loops
    let count = 0;
    const MAX_EVENTS = 365 * 2; 

    while (current <= limitDate && count < MAX_EVENTS) {
        // Check Breakpoints
        const currentStr = format(current, 'yyyy-MM-dd');
        const isHoliday = baseEvent.breakpoints?.some(bp => 
            currentStr >= bp.startDate && currentStr <= bp.endDate
        );

        if (!isHoliday) {
            const newStart = new Date(current);
            // Preserve time
            newStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
            
            const newEnd = new Date(newStart.getTime() + duration);

            events.push({
                ...baseEvent,
                id: count === 0 ? baseEvent.id : crypto.randomUUID(), // Keep original ID for first instance
                startTime: newStart.toISOString(),
                endTime: newEnd.toISOString(),
                recurringEventId: groupId,
                routineId: undefined // Standard recurrence isn't a routine
            });
        }

        // Advance
        count++;
        switch (baseEvent.recurrence) {
            case 'daily': current = addDays(current, 1); break;
            case 'weekly': current = addWeeks(current, 1); break;
            case 'monthly': current = addMonths(current, 1); break;
            case 'yearly': current = addMonths(current, 12); break;
            default: return events;
        }
    }
    
    return events;
};

export const getTagColors = (eventTags: string[], allTags: {id: string, color: string}[]) => {
    return eventTags.map(tId => allTags.find(t => t.id === tId)?.color).filter(Boolean) as string[];
};
