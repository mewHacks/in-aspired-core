
// Service Worker for In-Aspired Push Notifications
// file runs even when app is closed

// Install and activate 
self.addEventListener('install', (event) => {
    // Skip waiting forces new service worker to activate immediately
    // Avoid stale sw versions
    self.skipWaiting();
    console.log('[SW] Installed');
});
self.addEventListener('activate', (event) => {
    // Claim clients to take control of all open tabs immediately
    event.waitUntil(self.clients.claim());
    console.log('[SW] Activated');
});

// Handle incoming push notification 
// Triggered when backend sends push, push service delivers message and browser wakes sw
self.addEventListener('push', (event) => {

    // Parse payload as JSON because it arrives as encrypted data
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'New Notification', body: event.data.text() };
        }
    }

    // Build notification title and options
    const title = data.title || 'In-Aspired';
    const options = {
        body: data.body || 'You have a new notification',
        icon: data.icon || '/assets/icons/logo_light.svg', // Fallback to SVG
        badge: data.badge || '/assets/icons/logo_light.svg',
        data: data.data || {},
        // Interaction settings
        requireInteraction: false, // Auto-close
        actions: data.actions || [] // Optional actions
    };

    // Show actual OS notification on lock screen
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {

    // Close the notification
    event.notification.close();

    // Get URL to open from notification data
    const urlToOpen = event.notification.data?.url || '/';

    // Focus existing window or open new one
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {

            // Check if there is already a window/tab open with the target URL
            for (const client of clientList) {

                // Determine if client is focusing on the same origin
                // Simple check: client.url matches origin
                if (client.url && 'focus' in client) {

                    // Optionally check if url matches explicitly, or just focus app
                    // Generally better to just focus the app and navigate
                    return client.focus().then(focusedClient => {

                        // Initiate navigation if supported/needed
                        if (focusedClient && 'navigate' in focusedClient) {
                            return focusedClient.navigate(urlToOpen);
                        }
                        return focusedClient;
                    });
                }
            }
            // If no window is open, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
