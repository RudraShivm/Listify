// Service Worker for Listify Alarms
// This allows alarms to work even when the browser tab is not active

const CACHE_NAME = 'listify-v1';

// Track scheduled alarms for cancellation
const scheduledAlarms = new Map();

// Install event - cache resources
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_ALARM') {
    const { event: eventData, delay } = event.data;

    // Mark this alarm as scheduled
    scheduledAlarms.set(eventData.id, true);

    const timeoutId = setTimeout(() => {
      // Check if this alarm was cancelled
      if (!scheduledAlarms.get(eventData.id)) {
        return;
      }

      // Remove from scheduled alarms
      scheduledAlarms.delete(eventData.id);

      self.registration.showNotification(`Event Reminder: ${eventData.title}`, {
        body: `Your event "${eventData.title}" is starting ${eventData.alarmOffset === 0 ? 'now' : `in ${eventData.alarmOffset} minutes`}`,
        tag: `event-${eventData.id}`,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Event'
          }
        ]
      });
    }, delay);

    // Store the timeout ID for potential cancellation
    scheduledAlarms.set(eventData.id, timeoutId);
  }

  if (event.data && event.data.type === 'CANCEL_ALARM') {
    const { eventId } = event.data;

    const timeoutId = scheduledAlarms.get(eventId);
    if (timeoutId && typeof timeoutId === 'number') {
      clearTimeout(timeoutId);
    }
    scheduledAlarms.delete(eventId);
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});
