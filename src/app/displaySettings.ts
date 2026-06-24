import type { AppElements } from "../ui";

const DISPLAY_SETTINGS_KEY = "nekokenchi:display-settings";

export type DisplaySettings = {
  video: boolean;
  poseGuide: boolean;
  uprightLine: boolean;
  slouchLine: boolean;
};

const DEFAULT_SETTINGS: DisplaySettings = {
  video: true,
  poseGuide: true,
  uprightLine: true,
  slouchLine: true,
};

export function createDisplaySettingsController(elements: AppElements) {
  let settings = { ...DEFAULT_SETTINGS };

  function loadSettings() {
    settings = loadSavedSettings();
    elements.displayChoices.forEach((choice) => {
      choice.checked = settings[choice.value as keyof DisplaySettings];
    });
    applyVideoVisibility();
  }

  function bindControls() {
    elements.displayChoices.forEach((choice) => {
      choice.addEventListener("change", () => {
        settings = getSettingsFromControls();
        applyVideoVisibility();
        localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(settings));
      });
    });
  }

  function getSettings() {
    return settings;
  }

  function getSettingsFromControls(): DisplaySettings {
    const nextSettings = { ...DEFAULT_SETTINGS };
    elements.displayChoices.forEach((choice) => {
      nextSettings[choice.value as keyof DisplaySettings] = choice.checked;
    });
    return nextSettings;
  }

  function applyVideoVisibility() {
    elements.video.classList.toggle("display-hidden", !settings.video);
  }

  return { bindControls, getSettings, loadSettings };
}

function loadSavedSettings(): DisplaySettings {
  const savedSettings = localStorage.getItem(DISPLAY_SETTINGS_KEY);
  if (!savedSettings) return { ...DEFAULT_SETTINGS };

  try {
    const parsedSettings = JSON.parse(savedSettings) as Partial<DisplaySettings>;
    return {
      video: parsedSettings.video !== false,
      poseGuide: parsedSettings.poseGuide !== false,
      uprightLine: parsedSettings.uprightLine !== false,
      slouchLine: parsedSettings.slouchLine !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export type DisplaySettingsController = ReturnType<
  typeof createDisplaySettingsController
>;
