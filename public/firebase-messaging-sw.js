/*
 * Compatibility service worker for browsers that previously registered
 * Firebase Messaging on localhost. Pesaby does not currently initialize
 * Firebase Messaging, so this worker intentionally does not intercept fetches.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
