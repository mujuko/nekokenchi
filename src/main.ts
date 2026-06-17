import "./style.css";
import { createPostureWatcher } from "./app/postureWatcher";
import { createSoundController } from "./app/sound";
import { createStatusView } from "./app/statusView";
import { bindMobileMenu } from "./app/mobileMenu";
import { getAppElements, renderApp, updateAppLocale } from "./ui";
import {
  getMessages,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./i18n";

const APP_VERSION = import.meta.env.VITE_APP_VERSION;
let locale = getInitialLocale();
let t = getMessages(locale);
const getCurrentMessages = () => t;

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
const statusView = createStatusView(elements, getCurrentMessages);
const sound = createSoundController(elements, getCurrentMessages);
const postureWatcher = createPostureWatcher(
  elements,
  statusView,
  sound,
  getCurrentMessages,
);

elements.startButton.onclick = postureWatcher.startCamera;
elements.calibrateButton.onclick = postureWatcher.beginCalibration;
elements.localeSelects.forEach((select) => {
  select.addEventListener("change", () => {
    const nextLocale = select.value;
    if (!isLocale(nextLocale) || nextLocale === locale) return;
    locale = nextLocale;
    t = getMessages(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    updateAppLocale(APP_VERSION, elements, t, locale);
    sound.updateControls();
    postureWatcher.refreshLocale();
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
