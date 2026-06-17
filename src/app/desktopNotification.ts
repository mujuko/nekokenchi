import type { Messages } from "../i18n";

const AUTO_CLOSE_MS = 10_000;
type MessagesProvider = () => Messages;

export function createDesktopNotifier(getMessages: MessagesProvider) {
  async function requestPermission() {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "default") return;

    await Notification.requestPermission();
  }

  function notifyBadPosture() {
    if (!document.hidden) return;
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;

    const t = getMessages();
    const notification = new Notification(t.notification.title, {
      body: t.notification.body,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    window.setTimeout(() => {
      notification.close();
    }, AUTO_CLOSE_MS);
  }

  return {
    notifyBadPosture,
    requestPermission,
  };
}

function isNotificationSupported() {
  return "Notification" in window;
}

export type DesktopNotifier = ReturnType<typeof createDesktopNotifier>;
