// T051: extra service-worker code, loaded by the generated worker (workbox importScripts).
// It only handles taps on the lock-screen card (a notification tagged "rafiq-step"). The card holds
// no personal data; the open app decides what to do with the action.
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  if (!notification.data || notification.data.card !== "rafiq-step") return;
  notification.close();
  const action = event.action === "prev" || event.action === "next" ? event.action : "open";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((c) => c.visibilityState === "visible") || windows[0];
      if (client) {
        client.postMessage({ type: "rafiq-step-action", action });
        // focus() needs a user gesture, which a notification click provides; it can still be refused.
        if ("focus" in client) await client.focus().catch(() => undefined);
        return;
      }
      await self.clients.openWindow(new URL("./?open=guide", self.registration.scope).href);
    })(),
  );
});
