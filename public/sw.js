// Service worker do PedeEasy: mostra o aviso de pedido novo mesmo com o navegador fechado.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = { titulo: "PedeEasy", texto: "", url: "/admin", icon: "", tag: "", fixa: true };
  try {
    d = { ...d, ...event.data.json() };
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(d.titulo, {
      body: d.texto,
      icon: d.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [300, 150, 300, 150, 300],
      // aviso ao cliente: fica na tela só se "fixa"; com tag, substitui o anterior do mesmo pedido
      requireInteraction: d.fixa !== false,
      tag: d.tag || undefined,
      renotify: !!d.tag,
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
