const state = {
  settings: JSON.parse(localStorage.getItem("flowwy_settings")) || {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStart: false,
    musicLink: false,
  },

  timeLeft: 25 * 60,
  currDuration: 25 * 60,
  isActive: false,
  mode: "timer",
  intervalId: null,

  player: null,
  isPlaying: false,
  currTrackIdx: 0,
  visualMode: "mesh",
  zenMode: false,

  playlists: [
    {
      name: "Lofi Study 1",
      url: "https://ia801506.us.archive.org/11/items/tvtunes_11602/Lofi%20hip%20hop%20mix%20-%20Beats%20to%20relax_study%20to%20%5BOFFICIAL%5D.mp3",
    },
    {
      name: "Lofi Study 2",
      url: "https://ia801404.us.archive.org/18/items/lofihiphop_202008/lofi%20hip%20hop.mp3",
    },
    {
      name: "Chill Beats",
      url: "https://ia601504.us.archive.org/27/items/lofi-study-beats/Lofi%20Study%20Beats.mp3",
    },
    {
      name: "Rainy Day",
      url: "https://ia600304.us.archive.org/30/items/rainy-day-lofi/Rainy%20Day%20Lofi.mp3",
    },
  ],

  snake: [],
  food: {},
  direction: "right",
  score: 0,
};

const motivations = [
  "Believe you can and you're halfway there.",
  "Your only limit is your mind.",
  "Do it now. Sometimes 'later' becomes 'never'.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It’s going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key to success is to focus on goals, not obstacles.",
  "Dream bigger. Do bigger.",
  "Don't tell people your plans. Show them your results.",
  "Small steps in the right direction can turn out to be the biggest step of your life.",
  "If it was easy, everyone would do it.",
  "Be the energy you want to attract.",
  "Focus on being productive instead of busy.",
];

// --- DOM References ---
const els = {
  body: document.body,
  timeText: document.querySelector(".time-text"),
  timerLabel: document.querySelector(".timer-label"),
  ringCircle: document.querySelector(".progress-ring__circle"),

  btns: {
    toggleTimer: document.getElementById("toggle-timer-btn"),
    reset: document.getElementById("reset-btn"),
    switchMode: document.getElementById("switch-mode-btn"),
    musicPlay: document.getElementById("music-toggle"),
    musicNext: document.getElementById("next-track"),
    musicPrev: document.getElementById("prev-track"),
    settings: document.getElementById("settings-trigger-btn"),

    visual: document.getElementById("visual-btn"),
    zenExit: document.getElementById("zen-exit-btn"),
    saveSettings: document.getElementById("save-settings"),
  },

  inputs: {
    pomo: document.getElementById("setting-pomo"),
    short: document.getElementById("setting-short"),
    long: document.getElementById("setting-long"),
    auto: document.getElementById("setting-autostart"),
    musicLink: document.getElementById("setting-musiclink"),
  },

  modals: {
    settings: document.getElementById("settings-modal"),
    help: document.getElementById("help-modal"),
  },

  trackName: document.getElementById("current-track-name"),

  bgVideo: document.querySelector(".background-video-container"),
  bgMesh: document.querySelector(".background-mesh"),
};

// --- Init ---
function init() {
  els.inputs.pomo.value = state.settings.pomodoro;
  els.inputs.short.value = state.settings.shortBreak;
  els.inputs.long.value = state.settings.longBreak;
  els.inputs.auto.checked = state.settings.autoStart;
  els.inputs.musicLink.checked = state.settings.musicLink;

  updateTimerDisplay();

  if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
  }

  // Handle PWA Shortcuts / URL Actions
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get("action");

  if (action === "start") {
    // Immediate start
    toggleTimer();
  }

  // Clear initial logs aggressively for first few seconds to hide YT errors
  const clearInt = setInterval(() => console.clear(), 200);
  setTimeout(() => clearInterval(clearInt), 3000);
}

// --- VISUAL / ZEN ---
function toggleZen() {
  state.zenMode = !state.zenMode;
  if (state.zenMode) {
    els.body.classList.add("zen-mode");
    // Ensure dock and sidebar are closed when entering Zen mode
    closeDock();
  } else {
    els.body.classList.remove("zen-mode");
  }
}

// --- TIMER ---
const CIRCUMFERENCE = 879;
els.ringCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

function updateTimerDisplay() {
  const min = Math.floor(state.timeLeft / 60);
  const sec = state.timeLeft % 60;
  const txt = `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;

  els.timeText.textContent = txt;
  document.title = `${txt} | Flowwy`;

  let percent = 0;
  if (state.mode === "timer") {
    percent = state.timeLeft / state.currDuration;
    els.ringCircle.style.strokeDashoffset =
      CIRCUMFERENCE - percent * CIRCUMFERENCE;
  } else {
    const maxStopwatch = 3600;
    percent = (state.timeLeft % maxStopwatch) / maxStopwatch;
    els.ringCircle.style.strokeDashoffset =
      CIRCUMFERENCE - percent * CIRCUMFERENCE;
  }
}

function toggleTimer() {
  if (state.isActive) {
    clearInterval(state.intervalId);
    state.isActive = false;
    els.btns.toggleTimer.innerHTML = '<i class="fa-solid fa-play"></i>';
    // Show Footer & Dock
    document.querySelector(".footer-links").style.opacity = "1";
    document.querySelector(".footer-links").style.pointerEvents = "auto";
    const dock = document.querySelector(".floating-dock-container");
    if (dock) {
      dock.style.opacity = "1";
      dock.style.pointerEvents = "auto";
    }

    // Music Link: Pause if linked and currently auto-playing
    if (state.settings.musicLink && state.player && state.isPlaying) {
      state.player.pauseVideo();
    }
  } else {
    state.isActive = true;
    els.btns.toggleTimer.innerHTML = '<i class="fa-solid fa-pause"></i>';
    // Hide Footer & Dock
    document.querySelector(".footer-links").style.opacity = "0";
    document.querySelector(".footer-links").style.pointerEvents = "none";
    const dock = document.querySelector(".floating-dock-container");
    if (dock) {
      closeDock(); // ensure closed first
      dock.style.opacity = "0";
      dock.style.pointerEvents = "none";
    }

    // Music Link: Play if linked and not playing
    if (state.settings.musicLink && state.player && !state.isPlaying) {
      state.player.playVideo();
    }

    state.intervalId = setInterval(tick, 1000);
  }
}

function tick() {
  if (state.mode === "timer") {
    if (state.timeLeft > 0) state.timeLeft--;
    else completeTimer();
  } else {
    state.timeLeft++;
  }
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(state.intervalId);
  state.isActive = false;
  els.btns.toggleTimer.innerHTML = '<i class="fa-solid fa-play"></i>';

  if (state.mode === "timer") {
    // Check label to determine which time to use
    if (els.timerLabel.textContent === "SHORT BREAK") {
      state.timeLeft = state.settings.shortBreak * 60;
    } else if (els.timerLabel.textContent === "LONG BREAK") {
      state.timeLeft = state.settings.longBreak * 60;
    } else {
      state.timeLeft = state.settings.pomodoro * 60;
    }
    state.currDuration = state.timeLeft;
  } else {
    state.timeLeft = 0;
  }
  updateTimerDisplay();
}

function switchTimerMode() {
  state.mode = state.mode === "timer" ? "stopwatch" : "timer";
  els.timerLabel.textContent = state.mode === "timer" ? "FOCUS" : "STOPWATCH";
  resetTimer();
}

function completeTimer() {
  clearInterval(state.intervalId);
  state.isActive = false;
  els.btns.toggleTimer.innerHTML = '<i class="fa-solid fa-play"></i>';
  alert("Time's Up!");
  if (state.settings.autoStart) {
    resetTimer();
  }
}

function saveSettings() {
  state.settings.pomodoro = parseInt(els.inputs.pomo.value) || 25;
  state.settings.shortBreak = parseInt(els.inputs.short.value) || 5;
  state.settings.longBreak = parseInt(els.inputs.long.value) || 15;
  state.settings.autoStart = els.inputs.auto.checked;
  state.settings.musicLink = els.inputs.musicLink.checked;
  localStorage.setItem("flowwy_settings", JSON.stringify(state.settings));

  // Show "Saved!" confirmation
  const msg = document.getElementById("settings-saved-msg");
  if (msg) {
    msg.style.opacity = "1";
    setTimeout(() => {
      msg.style.opacity = "0";
      // Close modal after a short delay so user sees the message
      setTimeout(() => {
        els.modals.settings.classList.remove("active");
        setTimeout(() => (els.modals.settings.style.display = ""), 300);
      }, 500);
    }, 800);
  } else {
    // Fallback if element missing
    els.modals.settings.classList.remove("active");
    setTimeout(() => (els.modals.settings.style.display = ""), 300);
  }

  if (state.mode === "timer" && !state.isActive) resetTimer();
}

// --- MUSIC ---
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function () {
  if (!navigator.onLine) {
    console.warn("Offline: YouTube player setup skipped");
    els.trackName.textContent = "Offline Mode - Music Unavailable";
    return;
  }

  state.player = new YT.Player("video-background-player", {
    height: "100%",
    width: "100%",
    videoId: state.playlists[0].id,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      origin: window.location.origin,
      enablejsapi: 1,
      widget_referrer: window.location.href,
    },
    events: {
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
};

function onPlayerStateChange(e) {
  const musicInfo = document.querySelector(".music-info");
  if (e.data == YT.PlayerState.PLAYING) {
    state.isPlaying = true;
    els.btns.musicPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    els.trackName.textContent = state.playlists[state.currTrackIdx].name;
    if (musicInfo) musicInfo.classList.add("playing");

    // Update Media Session Metadata
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.playlists[state.currTrackIdx].name,
        artist: "Flowwy LoFi",
        artwork: [
          {
            image: "img/logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
      navigator.mediaSession.playbackState = "playing";
    }
  } else if (e.data == YT.PlayerState.ENDED) {
    state.player.playVideo(); // Auto-loop
  } else {
    state.isPlaying = false;
    els.btns.musicPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (musicInfo) musicInfo.classList.remove("playing");

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }
}

// Register Media Session Actions once
if ("mediaSession" in navigator) {
  const actions = [
    ["play", () => state.player && state.player.playVideo()],
    ["pause", () => state.player && state.player.pauseVideo()],
    ["previoustrack", () => changeTrack(-1)],
    ["nexttrack", () => changeTrack(1)],
    [
      "seekbackward",
      () => {
        if (state.player && typeof state.player.getCurrentTime === "function") {
          state.player.seekTo(Math.max(state.player.getCurrentTime() - 10, 0));
        }
      },
    ],
    [
      "seekforward",
      () => {
        if (state.player && typeof state.player.getCurrentTime === "function") {
          state.player.seekTo(state.player.getCurrentTime() + 10);
        }
      },
    ],
  ];

  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      // Ignore unsupported actions
    }
  }
}

function onPlayerError(e) {
  console.warn("YouTube Error, skipping:", e.data);
  changeTrack(1);
}

function changeTrack(dir) {
  if (!state.player || !state.playlists || state.playlists.length === 0) return;

  state.currTrackIdx += dir;

  if (state.currTrackIdx >= state.playlists.length) {
    state.currTrackIdx = 0;
  } else if (state.currTrackIdx < 0) {
    state.currTrackIdx = state.playlists.length - 1;
  }

  const track = state.playlists[state.currTrackIdx];
  if (els.trackName) {
    els.trackName.textContent = "Loading: " + track.name;
  }

  if (state.player && typeof state.player.loadVideoById === "function") {
    state.player.loadVideoById(track.id);
  }
}

// --- Listeners ---
els.btns.settings.addEventListener("click", (e) => {
  e.preventDefault();
  closeDock();
  els.modals.settings.style.display = "flex"; // Force display
  setTimeout(() => els.modals.settings.classList.add("active"), 10);
});
document.getElementById("close-settings").addEventListener("click", () => {
  els.modals.settings.classList.remove("active");
  setTimeout(() => (els.modals.settings.style.display = ""), 300); // Reset after anim
});
els.btns.saveSettings.addEventListener("click", saveSettings);

// Help Modal
if (document.getElementById("close-help-btn")) {
  document.getElementById("close-help-btn").addEventListener("click", () => {
    els.modals.help.classList.remove("active");
    setTimeout(() => (els.modals.help.style.display = ""), 300);
  });
}

// Ensure Zen Exit is accessible on mobile (touch)
els.btns.zenExit.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent ghost clicks
  toggleZen();
});
// Show exit button on touch in Zen mode
els.body.addEventListener("touchstart", () => {
  if (state.zenMode) {
    els.btns.zenExit.style.opacity = "1";
    setTimeout(() => {
      if (state.zenMode) els.btns.zenExit.style.opacity = "";
    }, 3000);
  }
});

els.btns.visual.addEventListener("click", () => {
  state.visualMode = state.visualMode === "mesh" ? "video" : "mesh";
  els.body.classList.toggle("video-mode", state.visualMode === "video");

  // Update button icon/state if needed
  const icon = els.btns.visual.querySelector("i");
  if (icon) {
    icon.className =
      state.visualMode === "video"
        ? "fa-solid fa-border-none"
        : "fa-solid fa-video";
  }
});

els.btns.toggleTimer.addEventListener("click", toggleTimer);
els.btns.reset.addEventListener("click", resetTimer);
els.btns.switchMode.addEventListener("click", switchTimerMode);

// Music Controls
if (els.btns.musicPlay) {
  els.btns.musicPlay.addEventListener("click", () => {
    if (!state.player) return;
    if (state.isPlaying) state.player.pauseVideo();
    else state.player.playVideo();
  });
}
if (els.btns.musicNext) {
  els.btns.musicNext.addEventListener("click", () => changeTrack(1));
}
if (els.btns.musicPrev) {
  els.btns.musicPrev.addEventListener("click", () => changeTrack(-1));
}

// --- Mobile Toggles ---

// Floating Dock (Simplified)
function closeDock() {
  const dock = document.querySelector(".floating-dock-container");
  if (dock) dock.classList.remove("active");
}

// Remove complex dock toggle logic as it's now a single button

// Disable Ctrl+Shift+I (DevTools) and Add Custom Shortcuts
// Disable Ctrl+Shift+I (DevTools) and Add Custom Shortcuts
document.addEventListener("keydown", function (e) {
  // DevTools - Commented out for development
  // if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') e.preventDefault();

  // Safe check for inputs
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  // Shift + S (Toggle Settings)
  if (e.shiftKey && (e.key === "S" || e.key === "s")) {
    e.preventDefault();
    if (els.modals.settings.classList.contains("active")) {
      // Close
      els.modals.settings.classList.remove("active");
      setTimeout(() => (els.modals.settings.style.display = ""), 300);
    } else {
      // Open
      els.modals.settings.style.display = "flex";
      setTimeout(() => els.modals.settings.classList.add("active"), 10);
      closeDock();
    }
  }

  // Esc (Close Modals)
  if (e.key === "Escape") {
    if (els.modals.settings.classList.contains("active")) {
      e.preventDefault();
      els.modals.settings.classList.remove("active");
      setTimeout(() => (els.modals.settings.style.display = ""), 300);
    }
    if (els.modals.help && els.modals.help.classList.contains("active")) {
      e.preventDefault();
      els.modals.help.classList.remove("active");
      setTimeout(() => (els.modals.help.style.display = ""), 300);
    }
  }

  // Shift + R (Reset Timer)
  if (e.shiftKey && (e.key === "R" || e.key === "r")) {
    e.preventDefault();
    resetTimer();
  }

  // Shift + P (Pomodoro Mode)
  if (e.shiftKey && (e.key === "P" || e.key === "p")) {
    e.preventDefault();
    state.mode = "timer";
    els.timerLabel.textContent = "FOCUS";
    state.timeLeft = state.settings.pomodoro * 60;
    state.currDuration = state.timeLeft;
    resetTimer(); // Update display and stop any running timer
  }

  // Shift + B (Short Break)
  if (e.shiftKey && (e.key === "B" || e.key === "b")) {
    e.preventDefault();
    state.mode = "timer";
    els.timerLabel.textContent = "SHORT BREAK";
    state.timeLeft = state.settings.shortBreak * 60;
    state.currDuration = state.timeLeft;
    resetTimer();
  }

  // Shift + L (Long Break)
  if (e.shiftKey && (e.key === "L" || e.key === "l")) {
    e.preventDefault();
    state.mode = "timer";
    els.timerLabel.textContent = "LONG BREAK";
    state.timeLeft = state.settings.longBreak * 60;
    state.currDuration = state.timeLeft;
    resetTimer();
  }

  // Z (Toggle Zen Mode)
  if ((e.key === "z" || e.key === "Z") && !e.ctrlKey) {
    toggleZen();
  }

  // K (Play/Pause Music - Standard)
  if ((e.key === "k" || e.key === "K") && !e.ctrlKey) {
    if (state.player) {
      if (state.isPlaying) state.player.pauseVideo();
      else state.player.playVideo();
    }
  }

  // Ctrl + F (Fullscreen)
  if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Spacebar (Toggle Timer - Open/Close/Pause)
  if (e.code === "Space" && !e.shiftKey) {
    e.preventDefault();
    toggleTimer();
  }

  // Shift + Spacebar (Switch to Stopwatch & Start)
  if (e.code === "Space" && e.shiftKey) {
    e.preventDefault();
    if (state.mode === "timer") {
      switchTimerMode();
    }
    if (!state.isActive) {
      toggleTimer();
    }
  }

  // Next Track: > (Shift+.)
  if (e.key === ">" || (e.key === "." && e.shiftKey)) {
    changeTrack(1);
  }

  // Prev Track: < (Shift+,)
  if (e.key === "<" || (e.key === "," && e.shiftKey)) {
    changeTrack(-1);
  }

  // M: Mute/Unmute
  if (e.key === "m" || e.key === "M") {
    if (state.player && typeof state.player.isMuted === "function") {
      if (state.player.isMuted()) {
        state.player.unMute();
      } else {
        state.player.mute();
      }
    }
  }

  // V: Toggle Video Background
  if (e.key === "v" || e.key === "V") {
    els.btns.visual.click();
  }

  // J: Seek Backward 10s
  if (e.key === "j" || e.key === "J") {
    if (state.player && typeof state.player.getCurrentTime === "function") {
      const curr = state.player.getCurrentTime();
      state.player.seekTo(Math.max(0, curr - 10), true);
    }
  }

  // L: Seek Forward 10s
  if (e.key === "l" || e.key === "L") {
    if (state.player && typeof state.player.getCurrentTime === "function") {
      const curr = state.player.getCurrentTime();
      state.player.seekTo(curr + 10, true);
    }
  }
});

// Double Tap for Zen Mode
let lastTap = 0;
document.body.addEventListener("dblclick", (e) => {
  // Prevent if clicking on interactive elements
  if (
    e.target.closest("button") ||
    e.target.closest("input") ||
    e.target.closest(".modal-content")
  )
    return;
  toggleZen();
});
// Touch double tap support
document.body.addEventListener("touchend", (e) => {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  if (tapLength < 500 && tapLength > 0) {
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest(".modal-content")
    )
      return;
    e.preventDefault();
    toggleZen();
  }
  lastTap = currentTime;
});

// Global exposed functions for inline onclicks

function triggerMotivation() {
  const quote = motivations[Math.floor(Math.random() * motivations.length)];

  if (!("Notification" in window)) {
    alert(quote);
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("Daily Motivation", {
      body: quote,
      icon: "img/logo.png",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Daily Motivation", {
          body: quote,
          icon: "img/logo.png",
        });
      }
    });
  } else {
    alert(quote);
  }
}

// Automatic Motivation Scheduler (Web Parity)
// Checks every minute if 4 hours have passed since the last motivation
function startMotivationScheduler() {
  if (!("Notification" in window)) return;

  setInterval(() => {
    if (Notification.permission === "granted") {
      const lastRun = localStorage.getItem("flowwy_last_motivation");
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      const now = Date.now();

      if (!lastRun || now - parseInt(lastRun) > FOUR_HOURS) {
        triggerMotivation();
        localStorage.setItem("flowwy_last_motivation", now.toString());
      }
    }
  }, 60000); // Check every minute
}

// Start scheduler on load
startMotivationScheduler();

// Auto Year
const ySpan = document.getElementById("year-span");
if (ySpan) ySpan.textContent = new Date().getFullYear();

// Handle YT API Error Globally to prevent crash
window.onerror = function (msg, url, line, col, error) {
  if (msg.includes("postMessage") || msg.includes("origin")) {
    console.warn("Suppressing benign YouTube API message origin error");
    return true; // Suppress
  }
};

// PWA Install Prompt
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    deferredPrompt = null;
    installBtn.style.display = "none";
  }
});

init();

// Dedicated high-priority listener for Help Shortcut (Ctrl + /)
// Dedicated high-priority listener for Help Shortcut (Ctrl + /) - "Hold to Show"
let isHelpShortcutHeld = false;

window.addEventListener(
  "keydown",
  function (e) {
    // Check for Ctrl + / or Ctrl + ? (Shift + /)
    if (e.ctrlKey && (e.code === "Slash" || e.key === "/" || e.key === "?")) {
      e.preventDefault();
      e.stopPropagation();

      if (!isHelpShortcutHeld) {
        console.log("Help shortcut held down");
        isHelpShortcutHeld = true;

        const helpModal = document.getElementById("help-modal");
        if (helpModal) {
          // Force styles
          const style = helpModal.style;
          style.display = "flex";
          style.position = "fixed";
          style.top = "0";
          style.left = "0";
          style.width = "100%";
          style.height = "100%";
          style.opacity = "1";
          style.visibility = "visible";
          style.zIndex = "2147483647";

          helpModal.classList.add("active");

          const dock = document.querySelector(".floating-dock-container");
          if (dock) dock.classList.remove("active");
        }
      }
    }
  },
  true,
);

window.addEventListener(
  "keyup",
  function (e) {
    // If we were holding the shortcut, and now release Ctrl or Slash
    if (isHelpShortcutHeld) {
      if (
        e.key === "Control" ||
        e.key === "Meta" || // Mac Command
        e.code === "Slash" ||
        e.key === "/" ||
        e.key === "?"
      ) {
        console.log("Help shortcut released");
        isHelpShortcutHeld = false;

        const helpModal = document.getElementById("help-modal");
        if (helpModal) {
          helpModal.classList.remove("active");
          // Allow animation to play out or force clear after delay?
          // Since "hold" feels instant, maybe clear styles immediately or let CSS transition handle it?
          // The CSS has a transition on opacity/visibility.
          // But we set inline styles to force it open. We need to clear those to let it close.

          helpModal.style.display = "";
          helpModal.style.opacity = "";
          helpModal.style.visibility = "";
          helpModal.style.zIndex = "";
        }
      }
    }
  },
  true,
);

// --- Loading Screen ---
window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  if (loader) {
    loader.classList.add("hidden");
    setTimeout(() => {
      loader.style.display = "none";
    }, 800);
  }
});
