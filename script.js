/**
 * <minimal-video-player>
 *
 * A brutalist, black-and-white video player built as an HTML Custom Element.
 * Zero external dependencies — all icons are inline SVGs.
 *
 * Attributes:
 *   src       – video source URL
 *   poster    – poster image URL
 *   autoplay  – boolean
 *   muted     – boolean
 *   loop      – boolean
 *   width     – CSS width  (default: 100%)
 *   height    – CSS height (default: auto)
 */
class MinimalVideoPlayer extends HTMLElement {

  /* ------------------------------------------------------------------ */
  /*  SVG Icons (sharp, geometric, brutalist)                            */
  /* ------------------------------------------------------------------ */
  static ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`,
    volumeUp: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="2,8 2,16 6,16 12,21 12,3 6,8"/><path d="M15.5 12c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4z"/><path d="M18 12c0-3.2-1.8-5.9-4.5-7.2v2.1c1.5 1 2.5 2.8 2.5 4.8 0 2-.9 3.6-2.5 4.8v2.3C16.2 18.1 18 15.3 18 12z"/></svg>`,
    volumeDown: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="2,8 2,16 6,16 12,21 12,3 6,8"/><path d="M15.5 12c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4z"/></svg>`,
    volumeOff: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="2,8 2,16 6,16 12,21 12,3 6,8"/><line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" stroke-width="2"/><line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" stroke-width="2"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h6v2H5v4H3V3zM15 3h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zM19 19h-4v2h6v-6h-2v4z"/></svg>`,
    fullscreenExit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H8v4H4v2h6V4zM14 4h2v4h4v2h-6V4zM10 20H8v-4H4v-2h6v6zM14 20h2v-4h4v-2h-6v6z"/></svg>`,
  };

  /* ------------------------------------------------------------------ */
  /*  Observed attributes                                                */
  /* ------------------------------------------------------------------ */
  static get observedAttributes() {
    return ['src', 'poster', 'autoplay', 'muted', 'loop', 'width', 'height'];
  }

  /* ------------------------------------------------------------------ */
  /*  Constructor – attach Shadow DOM                                    */
  /* ------------------------------------------------------------------ */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isUserSeeking = false;
    this._controlsTimeout = null;
    this._controlsVisible = true;
  }

  /* ------------------------------------------------------------------ */
  /*  Connected callback                                                 */
  /* ------------------------------------------------------------------ */
  connectedCallback() {
    this._render();
    this._cacheDOM();
    this._bindEvents();
    this._applyAttributes();
    this._showControls();
  }

  /* ------------------------------------------------------------------ */
  /*  Attribute changed callback                                         */
  /* ------------------------------------------------------------------ */
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.shadowRoot.querySelector('video') || oldVal === newVal) return;
    this._applyAttributes();
    
    // If source changed, reset playback state and UI
    if (name === 'src') {
      this._video.currentTime = 0;
      this._onPlayState(false);
      
      // Explicitly reset UI elements immediately
      this._currentTime.textContent = '0:00';
      this._duration.textContent = '0:00';
      this._seek.value = 0;
      this._seekFill.style.width = '0%';
      this._seekBuffer.style.width = '0%';
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render the internal Shadow DOM                                     */
  /* ------------------------------------------------------------------ */
  _render() {
    const I = MinimalVideoPlayer.ICONS;
    this.shadowRoot.innerHTML = `
      <style>${MinimalVideoPlayer._styles()}</style>

      <div class="wrapper" part="wrapper">
        <!-- Big centre play overlay -->
        <button class="big-play" aria-label="Play video">
          <span class="big-play-icon">${I.play}</span>
        </button>

        <video playsinline></video>

        <!-- Controls bar -->
        <div class="controls">
          <button class="btn play-pause" aria-label="Play">
            <span class="icon icon-play-pause">${I.play}</span>
          </button>

          <span class="time current-time">0:00</span>

          <div class="seek-container">
            <input type="range" class="seek" min="0" max="1000" value="0" step="1" aria-label="Seek">
            <div class="seek-fill"></div>
            <div class="seek-buffer"></div>
          </div>

          <span class="time duration">0:00</span>

          <div class="volume-group">
            <button class="btn volume-btn" aria-label="Mute">
              <span class="icon icon-volume">${I.volumeUp}</span>
            </button>
            <div class="volume-slider-wrap">
              <input type="range" class="volume-slider" min="0" max="100" value="100" step="1" aria-label="Volume">
              <div class="volume-fill"></div>
            </div>
          </div>

          <button class="btn fullscreen-btn" aria-label="Fullscreen">
            <span class="icon icon-fullscreen">${I.fullscreen}</span>
          </button>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Cache internal elements                                            */
  /* ------------------------------------------------------------------ */
  _cacheDOM() {
    const $ = s => this.shadowRoot.querySelector(s);
    this._wrapper         = $('.wrapper');
    this._video           = $('video');
    this._bigPlay         = $('.big-play');
    this._bigPlayIcon     = $('.big-play-icon');
    this._controls        = $('.controls');
    this._playPause       = $('.play-pause');
    this._iconPlayPause   = $('.icon-play-pause');
    this._currentTime     = $('.current-time');
    this._duration        = $('.duration');
    this._seek            = $('.seek');
    this._seekFill        = $('.seek-fill');
    this._seekBuffer      = $('.seek-buffer');
    this._volBtn          = $('.volume-btn');
    this._iconVolume      = $('.icon-volume');
    this._volSlider       = $('.volume-slider');
    this._volFill         = $('.volume-fill');
    this._fsBtn           = $('.fullscreen-btn');
    this._iconFullscreen  = $('.icon-fullscreen');
    this._seekContainer   = $('.seek-container');
    this._volumeGroup     = $('.volume-group');
  }

  /* ------------------------------------------------------------------ */
  /*  Bind all events                                                    */
  /* ------------------------------------------------------------------ */
  _bindEvents() {
    const v = this._video;

    /* play / pause */
    this._bigPlay.addEventListener('click', () => this._togglePlay());
    this._playPause.addEventListener('click', () => this._togglePlay());
    this._wrapper.addEventListener('click', e => {
      if (e.target === this._wrapper || e.target === v) this._togglePlay();
    });

    /* keyboard shortcuts */
    this._wrapper.setAttribute('tabindex', '0');
    this._wrapper.addEventListener('keydown', e => this._onKey(e));

    /* time update */
    v.addEventListener('timeupdate', () => this._onTimeUpdate());
    v.addEventListener('loadedmetadata', () => {
      this._duration.textContent = this._fmt(v.duration);
      this._seek.max = 1000;
    });
    v.addEventListener('progress', () => this._updateBuffer());

    /* play state */
    v.addEventListener('play',  () => this._onPlayState(true));
    v.addEventListener('pause', () => this._onPlayState(false));
    v.addEventListener('ended', () => this._onPlayState(false));

    /* seek */
    this._seek.addEventListener('input', () => {
      this._isUserSeeking = true;
      const pct = this._seek.value / 1000;
      this._seekFill.style.width = `${pct * 100}%`;
      v.currentTime = pct * v.duration;
    });
    this._seek.addEventListener('change', () => { this._isUserSeeking = false; });

    /* volume */
    this._volSlider.addEventListener('input', () => {
      v.volume = this._volSlider.value / 100;
      v.muted = v.volume === 0;
      this._updateVolUI();
    });
    this._volBtn.addEventListener('click', () => {
      if (v.muted || v.volume === 0) {
        v.muted = false;
        if (v.volume === 0) v.volume = 0.5;
      } else {
        v.muted = true;
      }
      this._updateVolUI();
    });

    /* fullscreen */
    this._fsBtn.addEventListener('click', () => this._toggleFS());
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
      document.addEventListener(event, () => this._updateFSUI());
    });

    /* auto-hide controls on mouse activity */
    this._wrapper.addEventListener('mousemove',  () => this._showControls());
    this._wrapper.addEventListener('mouseleave', () => this._scheduleHide());
    this._controls.addEventListener('mouseenter', () => this._showControls());

    /* double-click for fullscreen */
    this._wrapper.addEventListener('dblclick', e => {
      if (e.target.closest('.controls')) return;
      this._toggleFS();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Apply observed attributes to the video element                     */
  /* ------------------------------------------------------------------ */
  _applyAttributes() {
    const v = this._video;
    if (this.getAttribute('src'))     v.src     = this.getAttribute('src');
    if (this.getAttribute('poster'))  v.poster  = this.getAttribute('poster');
    v.autoplay = this.hasAttribute('autoplay');
    v.muted    = this.hasAttribute('muted');
    v.loop     = this.hasAttribute('loop');

    const w = this.getAttribute('width')  || '100%';
    const h = this.getAttribute('height') || 'auto';
    this.style.width  = w;
    this.style.height = h;
  }

  /* ------------------------------------------------------------------ */
  /*  Playback helpers                                                   */
  /* ------------------------------------------------------------------ */
  _togglePlay() {
    const v = this._video;
    if (v.paused || v.ended) v.play(); else v.pause();
  }

  _onPlayState(playing) {
    const I = MinimalVideoPlayer.ICONS;
    this._iconPlayPause.innerHTML = playing ? I.pause : I.play;
    this._bigPlayIcon.innerHTML   = playing ? I.pause : I.play;
    this._bigPlay.style.opacity       = playing ? '0' : '';
    this._bigPlay.style.pointerEvents = playing ? 'none' : '';
    
    this._wrapper.classList.toggle('is-playing', playing);

    if (playing) this._scheduleHide(); else this._showControls();
  }

  /* ------------------------------------------------------------------ */
  /*  Time / seek helpers                                                */
  /* ------------------------------------------------------------------ */
  _onTimeUpdate() {
    const v = this._video;
    if (this._isUserSeeking || !v.duration) return;
    const pct = v.currentTime / v.duration;
    this._seek.value = Math.round(pct * 1000);
    this._seekFill.style.width = `${pct * 100}%`;
    this._currentTime.textContent = this._fmt(v.currentTime);
  }

  _updateBuffer() {
    const v = this._video;
    if (v.buffered.length && v.duration) {
      const end = v.buffered.end(v.buffered.length - 1);
      this._seekBuffer.style.width = `${(end / v.duration) * 100}%`;
    }
  }

  _fmt(sec) {
    if (sec === null || sec === undefined || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /* ------------------------------------------------------------------ */
  /*  Volume helpers                                                     */
  /* ------------------------------------------------------------------ */
  _updateVolUI() {
    const v = this._video;
    const I = MinimalVideoPlayer.ICONS;
    const muted = v.muted || v.volume === 0;
    if (muted) {
      this._iconVolume.innerHTML = I.volumeOff;
    } else if (v.volume < 0.5) {
      this._iconVolume.innerHTML = I.volumeDown;
    } else {
      this._iconVolume.innerHTML = I.volumeUp;
    }
    const pct = muted ? 0 : v.volume * 100;
    this._volSlider.value = pct;
    this._volFill.style.width = `${pct}%`;
  }

  /* ------------------------------------------------------------------ */
  /*  Fullscreen helpers                                                 */
  /* ------------------------------------------------------------------ */
  _isFS() {
    const el = document.fullscreenElement || 
               document.webkitFullscreenElement || 
               document.mozFullScreenElement || 
               document.msFullscreenElement;
    return el === this || el === this._wrapper;
  }

  _toggleFS() {
    if (this._isFS()) {
      const exit = document.exitFullscreen || 
                   document.webkitExitFullscreen || 
                   document.mozCancelFullScreen || 
                   document.msExitFullscreen;
      if (exit) exit.call(document);
    } else {
      const request = this._wrapper.requestFullscreen || 
                      this._wrapper.webkitRequestFullscreen || 
                      this._wrapper.mozRequestFullScreen || 
                      this._wrapper.msRequestFullscreen;
      if (request) request.call(this._wrapper);
    }
  }

  _updateFSUI() {
    const I = MinimalVideoPlayer.ICONS;
    const isFS = this._isFS();
    const label = isFS ? 'Exit Fullscreen' : 'Fullscreen';

    this._wrapper.classList.toggle('is-fullscreen', isFS);
    this._iconFullscreen.innerHTML = isFS ? I.fullscreenExit : I.fullscreen;
    this._fsBtn.setAttribute('aria-label', label);
    this._fsBtn.setAttribute('title', label);
  }

  /* ------------------------------------------------------------------ */
  /*  Controls auto-hide                                                 */
  /* ------------------------------------------------------------------ */
  _showControls() {
    clearTimeout(this._controlsTimeout);
    this._controls.classList.add('visible');
    this._wrapper.style.cursor = '';
    this._controlsVisible = true;
    if (!this._video.paused) this._scheduleHide();
  }

  _scheduleHide() {
    clearTimeout(this._controlsTimeout);
    this._controlsTimeout = setTimeout(() => {
      if (!this._video.paused) {
        this._controls.classList.remove('visible');
        this._wrapper.style.cursor = 'none';
        this._controlsVisible = false;
      }
    }, 2500);
  }

  /* ------------------------------------------------------------------ */
  /*  Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */
  _onKey(e) {
    const v = this._video;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this._togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        v.currentTime = Math.min(v.duration, v.currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        v.muted = false;
        v.volume = Math.min(1, v.volume + 0.1);
        this._updateVolUI();
        break;
      case 'ArrowDown':
        e.preventDefault();
        v.volume = Math.max(0, v.volume - 0.1);
        if (v.volume === 0) v.muted = true;
        this._updateVolUI();
        break;
      case 'f':
        e.preventDefault();
        this._toggleFS();
        break;
      case 'm':
        e.preventDefault();
        if (v.muted || v.volume === 0) {
          v.muted = false;
          if (v.volume === 0) v.volume = 0.5;
        } else {
          v.muted = true;
        }
        this._updateVolUI();
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Styles (Shadow DOM scoped)                                         */
  /* ------------------------------------------------------------------ */
  static _styles() {
    return /* css */`
      :host {
        display: block;
        width: 100%;
        contain: content;
        font-family: 'Space Mono', monospace, system-ui;
        aspect-ratio: 16 / 9;

        /* ---- Design Tokens ---- */
        --mvp-bg: #fff;
        --mvp-fg: #000;
        --mvp-accent: #000;
        --mvp-video-bg: #000;
        --mvp-controls-bg: #fff;
        --mvp-controls-bg-translucent: #ffffffdb;
        --mvp-overlay-bg: rgba(0, 0, 0, 0.5);
        --mvp-track: rgba(0, 0, 0, 0.15);
        --mvp-buffer: rgba(0, 0, 0, 0.3);
        --mvp-border-color: #000;
        --mvp-border-width: 2px;
        --mvp-transition: 150ms linear;
        --mvp-controls-height: 52px;
        --mvp-focus-outline: 3px solid #000;
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ---- Accessibility: Focus states ---- */
      :focus-visible {
        outline: var(--mvp-focus-outline);
        outline-offset: -3px;
      }

      /* ---- Icon spans ---- */
      .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--mvp-fg);
        user-select: none;
      }
      .icon svg {
        width: 100%;
        height: 100%;
      }

      .wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--mvp-video-bg);
        border-radius: 0;
        overflow: hidden;
        outline: none;
      }

      /* ---- Video ---- */
      video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: var(--mvp-video-bg);
      }

      /* ---- Big play button ---- */
      .big-play {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: var(--mvp-controls-height);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--mvp-overlay-bg);
        border: none;
        cursor: pointer;
        transition: opacity 0.3s linear;
      }
      .big-play-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        border: 3px solid #fff;
        background: rgba(0,0,0,0.7);
        padding: 18px;
        transition: background 0.15s linear, color 0.15s linear;
      }
      .big-play-icon svg {
        width: 56px;
        height: 56px;
      }
      .big-play:hover .big-play-icon {
        background: #fff;
        color: #000;
      }
      .big-play:focus-visible .big-play-icon {
        outline: 3px solid #fff;
        outline-offset: 4px;
      }

      /* ---- Controls bar ---- */
      .controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--mvp-controls-bg);
        border-top: var(--mvp-border-width) solid var(--mvp-border-color);
        opacity: 0;
        transition: opacity var(--mvp-transition), background var(--mvp-transition);
        pointer-events: none;
      }
      .wrapper.is-playing .controls {
        background: var(--mvp-controls-bg-translucent);
      }
      .controls.visible {
        opacity: 1;
        pointer-events: all;
      }

      /* ---- Buttons ---- */
      .btn {
        background: none;
        border: var(--mvp-border-width) solid transparent;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0;
        transition: border-color var(--mvp-transition), background var(--mvp-transition);
      }
      .btn:hover {
        border-color: var(--mvp-border-color);
      }
      .btn:active {
        background: var(--mvp-fg);
      }
      .btn:active .icon {
        color: var(--mvp-bg);
      }

      /* ---- Time labels ---- */
      .time {
        font-family: 'Space Mono', monospace;
        font-size: 11px;
        color: var(--mvp-fg);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.05em;
        min-width: 38px;
        text-align: center;
        user-select: none;
        text-transform: uppercase;
      }

      /* ---- Seek bar ---- */
      .seek-container {
        flex: 1;
        position: relative;
        height: 20px;
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      .seek-buffer, .seek-fill {
        position: absolute;
        left: 0;
        top: 50%;
        height: 4px;
        transform: translateY(-50%);
        border-radius: 0;
        pointer-events: none;
        transition: height 0.1s linear;
      }
      .seek-buffer { background: var(--mvp-buffer); width: 0; z-index: 1; }
      .seek-fill   { background: var(--mvp-accent); width: 0; z-index: 2; }
      .seek-container:hover .seek-buffer,
      .seek-container:hover .seek-fill { height: 8px; }

      /* range reset */
      input[type=range] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 20px;
        background: transparent;
        position: relative;
        z-index: 3;
        font-size: 16px;
      }
      input[type=range]::-webkit-slider-runnable-track {
        height: 4px;
        background: var(--mvp-track);
        border-radius: 0;
        transition: height 0.1s linear;
      }
      .seek-container:hover input[type=range]::-webkit-slider-runnable-track { height: 8px; }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 0;
        background: var(--mvp-accent);
        border: var(--mvp-border-width) solid var(--mvp-border-color);
        margin-top: -5px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.1s linear;
      }
      .seek-container:hover input[type=range]::-webkit-slider-thumb {
        opacity: 1;
      }
      input[type=range]::-moz-range-track {
        height: 4px;
        background: var(--mvp-track);
        border-radius: 0;
        border: none;
      }
      input[type=range]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 0;
        background: var(--mvp-accent);
        border: var(--mvp-border-width) solid var(--mvp-border-color);
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.1s linear;
      }
      .seek-container:hover input[type=range]::-moz-range-thumb { opacity: 1; }

      /* ---- Volume ---- */
      .volume-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .volume-slider-wrap {
        position: relative;
        width: 0;
        height: 14px;
        overflow: hidden;
        transition: width var(--mvp-transition);
        display: flex;
        align-items: center;
      }
      @media (hover: hover) {
        .volume-group:hover .volume-slider-wrap,
        .volume-group:focus-within .volume-slider-wrap { 
          width: 72px; 
        }
      }
      
      @media (hover: none) {
        .volume-slider-wrap { width: 60px; }
      }
      .volume-slider {
        width: 72px;
        height: 14px;
        position: relative;
        z-index: 2;
      }
      .volume-slider::-webkit-slider-runnable-track {
        height: 4px;
        background: var(--mvp-track);
        border-radius: 0;
      }
      .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 0;
        background: var(--mvp-accent);
        border: var(--mvp-border-width) solid var(--mvp-controls-bg);
        margin-top: -4px;
        cursor: pointer;
      }
      .volume-slider::-moz-range-track {
        height: 4px;
        background: var(--mvp-track);
        border-radius: 0;
        border: none;
      }
      .volume-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 0;
        background: var(--mvp-accent);
        border: var(--mvp-border-width) solid var(--mvp-controls-bg);
        cursor: pointer;
      }
      .volume-fill {
        position: absolute;
        left: 0;
        top: 50%;
        height: 4px;
        transform: translateY(-50%);
        background: var(--mvp-accent);
        border-radius: 0;
        pointer-events: none;
        z-index: 1;
        width: 100%;
      }

      /* ---- Fullscreen ---- */
      .wrapper:fullscreen video { height: 100vh; }
      .wrapper.is-fullscreen { border: none; }
    `;
  }
}

/* Register the custom element */
customElements.define('minimal-video-player', MinimalVideoPlayer);
