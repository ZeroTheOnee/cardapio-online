// Service worker do PedeEasy: mostra o aviso de pedido novo mesmo com o navegador fechado.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = { titulo: "PedeEasy", texto: "", url: "/admin" };
  try {
    d = { ...d, ...event.data.json() };
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(d.titulo, {
      body: d.texto,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [300, 150, 300, 150, 300],
      requireInteraction: true,
      data: { url: d.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
