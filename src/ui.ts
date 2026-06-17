export function renderApp(appVersion: string) {
  return `
    <main class="app-shell">
      <header class="topbar">
        <a class="brand" href="#" aria-label="ねこ検知 ホーム">
          <span class="brand-mark" aria-hidden="true">
            <span class="ear ear-left"></span><span class="ear ear-right"></span>
            <span class="face-dot face-dot-left"></span><span class="face-dot face-dot-right"></span>
          </span>
          <span>ねこ検知</span>
          <span class="brand-version" aria-label="バージョン ${appVersion}">${appVersion}</span>
        </a>
        <div class="topbar-actions desktop-only">
          <a class="github-button" href="https://github.com/mujuko/nekokenchi" target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
            ${githubIcon()}
          </a>
          <div class="privacy"><span class="privacy-dot"></span>映像は端末内だけで処理</div>
        </div>
        <button class="menu-button mobile-only" id="menu-button" type="button" aria-label="メニューを開く" aria-controls="mobile-menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </header>

      <section class="hero desktop-only">
        <div>
          <p class="eyebrow">POSTURE WATCHER</p>
          <h1>背すじが丸まったら、<br><em>そっとお知らせ。</em></h1>
        </div>
        <p class="hero-copy">カメラで頭の高さを見守り、猫背が続いたときだけ音で知らせます。まずは正面から、目線に近い高さで映してください。</p>
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
              <h2>カメラを起動しましょう</h2>
              <p>姿勢の判定はこの端末内で行われます</p>
            </div>
            <div class="calibration-overlay" id="calibration-overlay" hidden>
              <div class="countdown-ring"><span id="countdown">3</span></div>
              <strong id="calibration-title">背すじを伸ばして、そのまま</strong>
              <small id="calibration-help">良い姿勢の頭の高さを覚えています</small>
            </div>
            <div class="status-pill" id="status-pill" hidden>
              <span></span><b id="status-label">計測中</b>
            </div>
            ${posturePanel("mobile-posture", true)}
            <div class="alert-flash" id="alert-flash" hidden>背すじを伸ばそう</div>
          </div>
          <div class="camera-actions">
            <button class="button primary" id="start-button">
              <svg class="button-icon camera-icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M14.5 4.5 16.2 7H20a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.8l1.7-2.5h5Z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span id="start-button-label">カメラを起動</span>
            </button>
            <button class="button secondary" id="calibrate-button" disabled>姿勢を登録しなおす</button>
          </div>
        </div>

        <div class="menu-scrim mobile-only" id="menu-scrim" hidden></div>
        <aside class="side-panel" id="mobile-menu" aria-label="見守り設定">
          <div class="drawer-head mobile-only">
            <div>
              <span class="section-label">MENU</span>
              <h2>設定</h2>
            </div>
            <button class="close-button" id="close-menu-button" type="button" aria-label="メニューを閉じる">×</button>
          </div>
          ${posturePanel("desktop-posture", false)}
          ${settingsPanel()}
          <div class="tip">
            <span class="tip-icon">i</span>
            <p><b>うまく測るコツ</b>顔と肩が正面から映る距離で、極端な見下ろしや見上げの画角を避けると安定します。</p>
          </div>
          <nav class="menu-links mobile-only" aria-label="アプリ情報">
            <a href="https://github.com/mujuko/nekokenchi" target="_blank" rel="noreferrer">${githubIcon()}<span>ソースコード</span></a>
            <span>© 第一無重工</span>
          </nav>
        </aside>
      </section>

      <footer class="app-footer desktop-only">
        <span>© 第一無重工</span>
      </footer>
    </main>
  `;
}

function posturePanel(extraClass: string, mobile: boolean) {
  return `
    <div class="metric-card ${extraClass} ${mobile ? "mobile-only" : "desktop-metric"}">
      <div class="metric-heading">
        <div>
          <span class="section-label">NOW</span>
          <h2>いまの姿勢</h2>
        </div>
        <div class="posture-badge idle" data-posture-badge>待機中</div>
      </div>
      <div class="meter">
        <div class="meter-track"><div class="meter-fill" data-meter-fill></div></div>
        <div class="meter-labels"><span>GOOD</span><span>ROUND</span></div>
      </div>
      <p class="metric-message" data-metric-message>カメラを起動すると、ここに姿勢の状態が表示されます。</p>
    </div>
  `;
}

function settingsPanel() {
  return `
    <div class="settings-card">
      <span class="section-label">SENSITIVITY</span>
      <h2>見守り設定</h2>
      <label class="setting-row">
        <span><b>感度</b><small>頭がどれくらい下がったら検知するか</small></span>
        <select id="sensitivity">
          <option value="0.9">ゆるめ</option>
          <option value="0.75" selected>ふつう</option>
          <option value="0.6">敏感</option>
        </select>
      </label>
      <label class="setting-row">
        <span><b>お知らせまで</b><small>悪い姿勢が続く時間</small></span>
        <select id="duration">
          <option value="2000">2秒</option>
          <option value="3000" selected>3秒</option>
          <option value="5000">5秒</option>
        </select>
      </label>
      <label class="setting-row">
        <span><b>通知音</b><small>一旦は電子音でお知らせ</small></span>
        <button class="sound-button" id="sound-button" aria-label="通知音を試す">試す ♪</button>
      </label>
    </div>
  `;
}

function githubIcon() {
  return `
    <svg class="github-icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.07c-3.13.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.73 1.16 1.73 1.16 1 .1 2.64-.89 3.28-.68.1-.73.4-1.23.72-1.52-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.99 0 0 .95-.3 3.1 1.16a10.7 10.7 0 0 1 5.64 0c2.15-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.71.11 2.99.72.79 1.16 1.8 1.16 3.03 0 4.33-2.63 5.28-5.14 5.56.41.35.77 1.04.77 2.09v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"></path>
    </svg>
  `;
}
