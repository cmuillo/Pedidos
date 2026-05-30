// Browser-only side effects for the admin "new order" alerts: a bell sound, a
// system notification and the app-icon badge. All functions are defensive and
// no-op when the relevant API is unavailable (e.g. during SSR or on browsers
// without support). Audio must be unlocked from a user gesture before it can play.

let audioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    }
    void audioCtx?.resume();
  } catch {
    /* ignore */
  }
}

/** Plays a short two-tone "campanita" (bell) using the Web Audio API. */
export function playBell(): void {
  try {
    if (!audioCtx) return;
    const ctx = audioCtx;
    void ctx.resume();
    const start = ctx.currentTime;
    const tones = [
      { freq: 988, at: 0 }, // B5
      { freq: 1319, at: 0.14 }, // E6
    ];
    for (const { freq, at } of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = start + at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    }
  } catch {
    /* ignore */
  }
}

/** Reflects the pending-order count on the installed app icon (Android badge). */
export function setOrderBadge(count: number): void {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) void nav.setAppBadge(count);
    else if (nav.clearAppBadge) void nav.clearAppBadge();
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

/** Shows a system notification for newly arrived orders, if permitted. */
export async function showOrderNotification(newCount: number): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title = "🔔 Nuevo pedido";
  const body = newCount === 1 ? "Llegó 1 pedido nuevo" : `Llegaron ${newCount} pedidos nuevos`;
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "nuevo-pedido",
    renotify: true,
    data: { url: "/admin/pedidos" },
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    /* ignore */
  }
}
