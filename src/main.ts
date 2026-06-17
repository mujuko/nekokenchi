import "./style.css";
import { createPostureWatcher } from "./app/postureWatcher";
import { createSoundController } from "./app/sound";
import { createStatusView } from "./app/statusView";
import { bindMobileMenu } from "./app/mobileMenu";
import { getAppElements, renderApp } from "./ui";
import {
  getMessages,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./i18n";

const APP_VERSION = import.meta.env.VITE_APP_VERSION;
const locale = getInitialLocale();
const t = getMessages(locale);

document.documentElement.lang = locale;
document.title = t.meta.title;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", t.meta.description);
document.querySelector<HTMLDivElement>("#app")!.innerHTML = renderApp(
  APP_VERSION,
  t,
  locale,
);

const elements = getAppElements();
const statusView = createStatusView(elements, t);
const sound = createSoundController(elements, t);
const postureWatcher = createPostureWatcher(elements, statusView, sound, t);

elements.startButton.onclick = postureWatcher.startCamera;
elements.calibrateButton.onclick = postureWatcher.beginCalibration;
elements.localeSelects.forEach((select) => {
  select.addEventListener("change", () => {
    const nextLocale = select.value;
    if (!isLocale(nextLocale) || nextLocale === locale) return;
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    window.location.reload();
  });
});

sound.bindControls();
bindMobileMenu(elements);
postureWatcher.showUnsupportedStateIfNeeded();
sound.loadSettings();

function getInitialLocale(): Locale {
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(savedLocale) ? savedLocale : "ja";
}
