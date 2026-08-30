/* Registriert den Service Worker (macht die Seite installierbar & offline-fähig). */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service-Worker-Registrierung fehlgeschlagen:', err);
    });
  });
}
