import "./style.css";
import { createPostureWatcher } from "./app/postureWatcher";
import { createSoundController } from "./app/sound";
import { createStatusView } from "./app/statusView";
import { bindMobileMenu } from "./app/mobileMenu";
import { getAppElements, renderApp } from "./ui";

const APP_VERSION = import.meta.env.VITE_APP_VERSION;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = renderApp(APP_VERSION);

const elements = getAppElements();
const statusView = createStatusView(elements);
const sound = createSoundController(elements);
const postureWatcher = createPostureWatcher(elements, statusView, sound);

elements.startButton.onclick = postureWatcher.startCamera;
elements.calibrateButton.onclick = postureWatcher.beginCalibration;

sound.bindControls();
bindMobileMenu(elements);
postureWatcher.showUnsupportedStateIfNeeded();
sound.loadSettings();
