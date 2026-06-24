import type { Locale, Messages } from "./i18n";

export function renderApp(appVersion: string, t: Messages, locale: Locale) {
  return `
    <main class="app-shell">
      <header class="topbar">
        <a class="brand" href="#" aria-label="${t.header.homeLabel}">
          <span class="brand-mark" aria-hidden="true">
            <span class="ear ear-left"></span><span class="ear ear-right"></span>
            <span class="face-dot face-dot-left"></span><span class="face-dot face-dot-right"></span>
          </span>
          <span>${t.common.brand}</span>
          <span class="brand-version" aria-label="${t.header.versionLabel(appVersion)}">${appVersion}</span>
        </a>
        <div class="topbar-actions desktop-only">
          ${languageSelect(t, locale, "desktop")}
          <a class="github-button" href="https://github.com/mujuko/nekokenchi" target="_blank" rel="noreferrer" aria-label="${t.common.github}" title="${t.common.github}">
            ${githubIcon()}
          </a>
          <div class="privacy"><span class="privacy-dot"></span>${t.header.privacy}</div>
        </div>
        <button class="menu-button mobile-only" id="menu-button" type="button" aria-label="${t.header.openMenu}" aria-controls="mobile-menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </header>

      <section class="hero desktop-only">
        <div>
          <h1>${t.hero.titleLine1}<br><em>${t.hero.titleEmphasis}</em></h1>
        </div>
        <p class="hero-copy">${t.hero.copy}</p>
      </section>

      <section class="workspace">
        <div class="camera-card">
          <div class="camera-stage" id="camera-stage">
            <video id="video" playsinline muted></video>
            <canvas id="overlay"></canvas>
            <div class="camera-placeholder" id="camera-placeholder">
              <div class="cat-orbit">
                <div class="cat-head"><i></i><i></i><b></b><span></span></div>
              </div>
              <h2>${t.camera.placeholderTitle}</h2>
              <p>${t.camera.placeholderCopy}</p>
            </div>
            <div class="calibration-overlay" id="calibration-overlay" hidden>
              <div class="countdown-ring"><span id="countdown">3</span></div>
              <strong id="calibration-title">${t.calibration.goodTitle}</strong>
              <small id="calibration-help">${t.calibration.goodHelp}</small>
            </div>
            <div class="status-pill" id="status-pill" hidden>
              <span></span><b id="status-label">${t.camera.statusMeasuring}</b>
            </div>
            ${posturePanel("mobile-posture", true)}
            <div class="alert-flash" id="alert-flash" hidden>${t.camera.alert}</div>
          </div>
          <div class="camera-actions">
            <button class="button primary" id="start-button">
              <svg class="button-icon camera-icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M14.5 4.5 16.2 7H20a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.8l1.7-2.5h5Z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span id="start-button-label">${t.camera.start}</span>
            </button>
            <button class="button secondary" id="pause-button" type="button" disabled>${t.camera.pause}</button>
            <button class="button secondary" id="calibrate-button" disabled>${t.camera.recalibrate}</button>
          </div>
        </div>

        <div class="menu-scrim mobile-only" id="menu-scrim" hidden></div>
        <aside class="side-panel" id="mobile-menu" aria-label="${t.settings.panelAria}">
          <div class="drawer-head mobile-only">
            <div>
              <h2>${t.settings.menuTitle}</h2>
            </div>
            <button class="close-button" id="close-menu-button" type="button" aria-label="${t.header.closeMenu}">×</button>
          </div>
          <div class="mobile-only">${languageSelect(t, locale, "mobile")}</div>
          ${posturePanel("desktop-posture", false)}
          ${settingsPanel()}
          <div class="tip">
            <span class="tip-icon">i</span>
            <p><b>${t.tip.title}</b>${t.tip.body}</p>
          </div>
          <nav class="menu-links mobile-only" aria-label="${t.common.brand}">
            <a href="https://github.com/mujuko/nekokenchi" target="_blank" rel="noreferrer">${githubIcon()}<span>${t.common.sourceCode}</span></a>
            <a href="https://pocket-se.info/" target="_blank" rel="noreferrer">${t.common.soundCredit}</a>
            <span>${t.common.copyright}</span>
          </nav>
        </aside>
      </section>

      <footer class="app-footer desktop-only">
        <span>${t.common.copyright}</span>
        <a href="https://pocket-se.info/" target="_blank" rel="noreferrer">${t.common.soundCredit}</a>
      </footer>
    </main>
  `;
  function posturePanel(extraClass: string, mobile: boolean) {
    return `
      <div class="metric-card ${extraClass} ${mobile ? "mobile-only" : "desktop-metric"}" data-mobile-title="${t.posture.mobileTitle}">
        <div class="metric-heading">
          <div>
            <h2>${t.posture.title}</h2>
          </div>
          <div class="posture-badge idle" data-posture-badge>${t.posture.idleBadge}</div>
        </div>
        <div class="meter">
          <div class="meter-track"><div class="meter-fill" data-meter-fill></div></div>
          <div class="meter-labels"><span>${t.posture.goodMeter}</span><span>${t.posture.badMeter}</span></div>
        </div>
        <p class="metric-message" data-metric-message>${t.posture.idleMessage}</p>
      </div>
    `;
  }

  function settingsPanel() {
    return `
      <div class="settings-card">
        <h2>${t.settings.panelTitle}</h2>
        <label class="setting-row">
          <span><b>${t.settings.sensitivity}</b><small>${t.settings.sensitivityHelp}</small></span>
          <select id="sensitivity">
            <option value="0.9">${t.settings.sensitivityLoose}</option>
            <option value="0.75" selected>${t.settings.sensitivityNormal}</option>
            <option value="0.6">${t.settings.sensitivitySensitive}</option>
          </select>
        </label>
        <label class="setting-row">
          <span><b>${t.settings.duration}</b><small>${t.settings.durationHelp}</small></span>
          <select id="duration">
            <option value="2000">${t.settings.seconds(2)}</option>
            <option value="3000" selected>${t.settings.seconds(3)}</option>
            <option value="5000">${t.settings.seconds(5)}</option>
          </select>
        </label>
        <div class="setting-row sound-setting">
          <span><b>${t.settings.sound}</b><small>${t.settings.soundHelp}</small></span>
          <div class="sound-controls">
            <div class="sound-choice-list" aria-label="${t.settings.soundKindLabel}">
              <label><input type="checkbox" value="tone" data-sound-choice checked>${t.settings.soundTone}</label>
              <label><input type="checkbox" value="cat10" data-sound-choice>${t.settings.soundCat(1)}</label>
              <label><input type="checkbox" value="cat11" data-sound-choice>${t.settings.soundCat(2)}</label>
              <label><input type="checkbox" value="cat15" data-sound-choice>${t.settings.soundCat(3)}</label>
              <label><input type="checkbox" value="cat30" data-sound-choice>${t.settings.soundCat(4)}</label>
            </div>
            <div class="sound-volume">
              <button class="sound-button mute-button" id="mute-button" type="button" aria-pressed="false" aria-label="${t.settings.muteLabel}">${t.settings.mute}</button>
              <input id="sound-volume" type="range" min="0" max="100" step="5" value="50" aria-label="${t.settings.volumeLabel}">
            </div>
            <button class="sound-button sound-test-button" id="sound-button" type="button" aria-label="${t.settings.testSoundLabel}">${t.settings.testSound}</button>
          </div>
        </div>
      </div>
    `;
  }
}

export type AppElements = ReturnType<typeof getAppElements>;

export function updateAppLocale(
  appVersion: string,
  elements: AppElements,
  t: Messages,
  locale: Locale,
) {
  document.documentElement.lang = locale;
  document.title = t.meta.title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t.meta.description);

  setText(".brand .brand-mark + span", t.common.brand);
  document
    .querySelector(".brand")
    ?.setAttribute("aria-label", t.header.homeLabel);
  document
    .querySelector(".brand-version")
    ?.setAttribute("aria-label", t.header.versionLabel(appVersion));
  const privacy = document.querySelector(".privacy");
  if (privacy) {
    const dot = document.createElement("span");
    dot.className = "privacy-dot";
    privacy.replaceChildren(dot, t.header.privacy);
  }
  document
    .querySelector(".github-button")
    ?.setAttribute("aria-label", t.common.github);
  document.querySelector(".github-button")?.setAttribute("title", t.common.github);
  elements.menuButton?.setAttribute("aria-label", t.header.openMenu);

  document.querySelectorAll<HTMLSelectElement>("[data-locale-select]").forEach((select) => {
    select.value = locale;
    const jaOption = select.querySelector<HTMLOptionElement>('option[value="ja"]');
    const enOption = select.querySelector<HTMLOptionElement>('option[value="en"]');
    if (jaOption) jaOption.textContent = t.common.japanese;
    if (enOption) enOption.textContent = t.common.english;
  });
  document
    .querySelectorAll<HTMLSpanElement>(".language-select > span")
    .forEach((label) => {
      label.textContent = t.common.language;
    });

  setText(".hero h1", "");
  const heroTitle = document.querySelector<HTMLHeadingElement>(".hero h1");
  if (heroTitle) {
    heroTitle.append(t.hero.titleLine1, document.createElement("br"));
    const emphasis = document.createElement("em");
    emphasis.textContent = t.hero.titleEmphasis;
    heroTitle.append(emphasis);
  }
  setText(".hero-copy", t.hero.copy);

  setText("#camera-placeholder h2", t.camera.placeholderTitle);
  setText("#camera-placeholder p", t.camera.placeholderCopy);
  elements.pauseButton.textContent = t.camera.pause;
  elements.calibrateButton.textContent = t.camera.recalibrate;
  elements.alertFlash.textContent = t.camera.alert;

  elements.mobileMenu.setAttribute("aria-label", t.settings.panelAria);
  setText(".drawer-head h2", t.settings.menuTitle);
  elements.closeMenuButton?.setAttribute("aria-label", t.header.closeMenu);
  document
    .querySelectorAll<HTMLElement>(".metric-card")
    .forEach((card) => {
      card.dataset.mobileTitle = t.posture.mobileTitle;
      card.querySelector("h2")!.textContent = t.posture.title;
      const meterLabels = card.querySelectorAll(".meter-labels span");
      meterLabels[0].textContent = t.posture.goodMeter;
      meterLabels[1].textContent = t.posture.badMeter;
    });

  setText(".settings-card h2", t.settings.panelTitle);
  updateSettingRow("#sensitivity", t.settings.sensitivity, t.settings.sensitivityHelp);
  updateSelectOption(elements.sensitivity, "0.9", t.settings.sensitivityLoose);
  updateSelectOption(elements.sensitivity, "0.75", t.settings.sensitivityNormal);
  updateSelectOption(elements.sensitivity, "0.6", t.settings.sensitivitySensitive);
  updateSettingRow("#duration", t.settings.duration, t.settings.durationHelp);
  updateSelectOption(elements.duration, "2000", t.settings.seconds(2));
  updateSelectOption(elements.duration, "3000", t.settings.seconds(3));
  updateSelectOption(elements.duration, "5000", t.settings.seconds(5));

  const soundSetting = document.querySelector(".sound-setting");
  soundSetting?.querySelector("b")?.replaceChildren(t.settings.sound);
  soundSetting?.querySelector("small")?.replaceChildren(t.settings.soundHelp);
  document
    .querySelector(".sound-choice-list")
    ?.setAttribute("aria-label", t.settings.soundKindLabel);
  const soundLabels = [
    t.settings.soundTone,
    t.settings.soundCat(1),
    t.settings.soundCat(2),
    t.settings.soundCat(3),
    t.settings.soundCat(4),
  ];
  elements.soundChoices.forEach((choice, index) => {
    const label = choice.parentElement;
    if (!label) return;

    label.lastChild!.textContent = soundLabels[index];
  });
  elements.soundVolume.setAttribute("aria-label", t.settings.volumeLabel);
  elements.soundButton.textContent = t.settings.testSound;
  elements.soundButton.setAttribute("aria-label", t.settings.testSoundLabel);

  const tipParagraph = document.querySelector<HTMLParagraphElement>(".tip p");
  if (tipParagraph) {
    tipParagraph.replaceChildren();
    const title = document.createElement("b");
    title.textContent = t.tip.title;
    tipParagraph.append(title, t.tip.body);
  }

  document
    .querySelector(".menu-links")
    ?.setAttribute("aria-label", t.common.brand);
  setText(".menu-links > a:first-child span", t.common.sourceCode);
  setText(".menu-links > a:nth-child(2)", t.common.soundCredit);
  setText(".menu-links > span:last-child", t.common.copyright);
  setText(".app-footer span", t.common.copyright);
  setText(".app-footer a", t.common.soundCredit);
}

export function getAppElements() {
  return {
    video: query<HTMLVideoElement>("#video"),
    canvas: query<HTMLCanvasElement>("#overlay"),
    cameraStage: query<HTMLDivElement>("#camera-stage"),
    placeholder: query<HTMLDivElement>("#camera-placeholder"),
    calibrationOverlay: query<HTMLDivElement>("#calibration-overlay"),
    countdown: query<HTMLSpanElement>("#countdown"),
    calibrationTitle: query<HTMLElement>("#calibration-title"),
    calibrationHelp: query<HTMLElement>("#calibration-help"),
    startButton: query<HTMLButtonElement>("#start-button"),
    startButtonLabel: query<HTMLSpanElement>("#start-button-label"),
    pauseButton: query<HTMLButtonElement>("#pause-button"),
    calibrateButton: query<HTMLButtonElement>("#calibrate-button"),
    statusPill: query<HTMLDivElement>("#status-pill"),
    statusLabel: query<HTMLElement>("#status-label"),
    postureBadges: queryAll<HTMLDivElement>("[data-posture-badge]"),
    meterFills: queryAll<HTMLDivElement>("[data-meter-fill]"),
    metricMessages: queryAll<HTMLParagraphElement>("[data-metric-message]"),
    sensitivity: query<HTMLSelectElement>("#sensitivity"),
    duration: query<HTMLSelectElement>("#duration"),
    soundChoices: queryAll<HTMLInputElement>("[data-sound-choice]"),
    soundVolume: query<HTMLInputElement>("#sound-volume"),
    muteButton: query<HTMLButtonElement>("#mute-button"),
    soundButton: query<HTMLButtonElement>("#sound-button"),
    alertFlash: query<HTMLDivElement>("#alert-flash"),
    menuButton: document.querySelector<HTMLButtonElement>("#menu-button"),
    closeMenuButton:
      document.querySelector<HTMLButtonElement>("#close-menu-button"),
    menuScrim: document.querySelector<HTMLDivElement>("#menu-scrim"),
    mobileMenu: query<HTMLElement>("#mobile-menu"),
    localeSelects: queryAll<HTMLSelectElement>("[data-locale-select]"),
  };
}

function setText(selector: string, text: string) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function updateSettingRow(selectSelector: string, title: string, help: string) {
  const row = document.querySelector(selectSelector)?.closest(".setting-row");
  row?.querySelector("b")?.replaceChildren(title);
  row?.querySelector("small")?.replaceChildren(help);
}

function updateSelectOption(select: HTMLSelectElement, value: string, text: string) {
  const option = select.querySelector<HTMLOptionElement>(
    `option[value="${value}"]`,
  );
  if (option) option.textContent = text;
}

function query<T extends Element>(selector: string): T {
  return document.querySelector<T>(selector)!;
}

function queryAll<T extends Element>(selector: string): NodeListOf<T> {
  return document.querySelectorAll<T>(selector);
}

function languageSelect(t: Messages, locale: Locale, placement: string) {
  return `
    <label class="language-select language-select-${placement}">
      <span>${t.common.language}</span>
      <select data-locale-select>
        <option value="ja"${locale === "ja" ? " selected" : ""}>${t.common.japanese}</option>
        <option value="en"${locale === "en" ? " selected" : ""}>${t.common.english}</option>
      </select>
    </label>
  `;
}

function githubIcon() {
  return `
    <svg class="github-icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.07c-3.13.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.73 1.16 1.73 1.16 1 .1 2.64-.89 3.28-.68.1-.73.4-1.23.72-1.52-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.99 0 0 .95-.3 3.1 1.16a10.7 10.7 0 0 1 5.64 0c2.15-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.71.11 2.99.72.79 1.16 1.8 1.16 3.03 0 4.33-2.63 5.28-5.14 5.56.41.35.77 1.04.77 2.09v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"></path>
    </svg>
  `;
}
