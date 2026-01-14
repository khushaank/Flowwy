const state = {
  settings: JSON.parse(localStorage.getItem("focusflow_settings")) || {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStart: false,
  },
  tasks: JSON.parse(localStorage.getItem("focusflow_tasks")) || [],

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
    { name: "Zelda & Chill", id: "GdzrrWA8e7A" },
    { name: "Lofi Girl 1 A.M Logic", id: "TURbeWK2wwg" },
    { name: "Nintendo Lofi Mix", id: "jJ765acWecc" },
    { name: "Synthwave Radio", id: "4xDzrJKXOOY" },
    { name: "Studio Ghibli Lofi", id: "p26m_7P5NIs" },
    { name: "Coffee Shop Jazz", id: "5vS0_FOnO9Q" },
    { name: "Minecraft & Chill", id: "S48SviAsT18" },
    { name: "Persona 5 Lofi Mix", id: "88Xv_7Yf418" },
    { name: "Rainy Day Ramen Shop", id: "fpxv_Y_q6Sg" },
  ],

  gameActive: false,
  gameAuto: false,
  gameInterval: null,
  snake: [{ x: 10, y: 10 }],
  food: { x: 5, y: 5 },
  direction: "right",
  score: 0,

  dragItem: null,
};

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
    settings: document.getElementById("settings-btn"),
    fullscreen: document.getElementById("fullscreen-btn"),
    visual: document.getElementById("visual-btn"),
    zen: document.getElementById("zen-btn"),
    zenExit: document.getElementById("zen-exit-btn"),
    game: document.getElementById("game-btn"),
    saveSettings: document.getElementById("save-settings"),
    addTask: document.getElementById("add-task-btn"),
    menuToggle: document.getElementById("menu-toggle"),
    clearDone: document.getElementById("clear-done-btn"),
  },

  inputs: {
    task: document.getElementById("task-input"),
    pomo: document.getElementById("setting-pomo"),
    short: document.getElementById("setting-short"),
    long: document.getElementById("setting-long"),
    auto: document.getElementById("setting-autostart"),
  },

  modals: {
    settings: document.getElementById("settings-modal"),
    game: document.getElementById("game-modal"),
  },

  trackName: document.getElementById("current-track-name"),
  taskList: document.getElementById("task-list"),
  bgVideo: document.querySelector(".background-video-container"),
  bgMesh: document.querySelector(".background-mesh"),
  gameCanvas: document.getElementById("game-canvas"),
  gameAutoBtn: document.getElementById("game-autoplay-btn"),
};

// --- Init ---
function init() {
  els.inputs.pomo.value = state.settings.pomodoro;
  els.inputs.short.value = state.settings.shortBreak;
  els.inputs.long.value = state.settings.longBreak;
  els.inputs.auto.checked = state.settings.autoStart;

  renderTasks();
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
  } else if (action === "tasks") {
    // Expand task panel
    document.querySelector(".task-sidebar-area").classList.add("force-open");
    // Optional: Auto-focus input
    setTimeout(() => els.inputs.task.focus(), 500);
    // Close sidebar logic could be added if user clicks away, depending on Sidebar logic
    // Currently sidebar is hover-based, so 'force-open' might need a way to close.
    // Let's rely on standard hover behavior but maybe just flash it open or simulate hover.
    // Better: Helper class to force open until interaction?
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
    const taskArea = document.querySelector(".task-sidebar-area");
    if (taskArea) {
      taskArea.classList.remove("force-open");
      const taskIcon = taskArea.querySelector(".task-sidebar-trigger i");
      if (taskIcon) taskIcon.className = "fa-solid fa-list-check";
    }
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
  document.title = `${txt} | FocusFlow`;

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
  } else {
    state.isActive = true;
    els.btns.toggleTimer.innerHTML = '<i class="fa-solid fa-pause"></i>';
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
    state.timeLeft = state.settings.pomodoro * 60;
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
  localStorage.setItem("focusflow_settings", JSON.stringify(state.settings));

  // Close modal naturally
  els.modals.settings.classList.remove("active");

  if (state.mode === "timer" && !state.isActive) resetTimer();
}

// --- MUSIC ---
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
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
}

function onPlayerStateChange(e) {
  const musicInfo = document.querySelector(".music-info");
  if (e.data == YT.PlayerState.PLAYING) {
    state.isPlaying = true;
    els.btns.musicPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    els.trackName.textContent = state.playlists[state.currTrackIdx].name;
    if (musicInfo) musicInfo.classList.add("playing");
  } else if (e.data == YT.PlayerState.ENDED) {
    state.player.playVideo(); // Auto-loop
  } else {
    state.isPlaying = false;
    els.btns.musicPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (musicInfo) musicInfo.classList.remove("playing");
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

// --- TASKS (Sorted: Starred -> Active -> Done) ---
function addTask() {
  const val = els.inputs.task.value.trim();
  if (!val) return;
  state.tasks.unshift({
    id: Date.now(),
    text: val,
    done: false,
    starred: false,
  });
  saveAndRender();
  els.inputs.task.value = "";
}

function saveAndRender() {
  localStorage.setItem("focusflow_tasks", JSON.stringify(state.tasks));
  renderTasks();
}

function clearDoneTasks() {
  state.tasks = state.tasks.filter((t) => !t.done);
  saveAndRender();
}

function toggleStar(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (t) {
    t.starred = !t.starred;
    saveAndRender();
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveAndRender();
}

// --- TASKS (Manual Drag & Drop) ---
function renderTasks() {
  els.taskList.innerHTML = "";

  state.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.starred ? "star-active" : ""} ${
      task.done ? "done-task" : ""
    }`;
    li.draggable = true; // Always draggable
    li.dataset.id = task.id;

    // Drag Events
    li.addEventListener("dragstart", (e) => {
      state.dragItem = task;
      li.classList.add("dragging");
      // Keep sidebar open while dragging
      document.querySelector(".task-sidebar-area").classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    li.addEventListener("dragend", (e) => {
      li.classList.remove("dragging");
      // Allow sidebar to close (with slight delay if needed, but CSS delay handles visual)
      document
        .querySelector(".task-sidebar-area")
        .classList.remove("is-dragging");
      state.dragItem = null;

      // Drag Out to Delete Logic
      const panel = document.querySelector(".task-panel");
      const rect = panel.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      // If dropped outside the panel
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        deleteTask(task.id);
        // Visual feedback could be added here (sound/puff)
      }
    });

    li.innerHTML = `
            <button class="task-btn star" onclick="event.stopPropagation(); toggleStar(${
              task.id
            })">
                <i class="${
                  task.starred ? "fa-solid" : "fa-regular"
                } fa-star"></i>
            </button>
            <span>${task.text}</span>
            <div class="task-actions">
                <button class="task-btn del" onclick="event.stopPropagation(); deleteTask(${
                  task.id
                })"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

    li.addEventListener("click", (e) => {
      e.stopPropagation(); // Stop bubble so menu doesn't close
      if (e.target.tagName !== "BUTTON" && e.target.tagName !== "I") {
        const original = state.tasks.find((t) => t.id === task.id);
        if (original) {
          original.done = !original.done;
          saveAndRender();
        }
      }
    });

    els.taskList.appendChild(li);
  });
}

// Drag Over Logic for Reordering
els.taskList.addEventListener("dragover", (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(els.taskList, e.clientY);
  const dragging = document.querySelector(".dragging");
  if (afterElement == null) {
    els.taskList.appendChild(dragging);
  } else {
    els.taskList.insertBefore(dragging, afterElement);
  }
});

// Update State on Drop (Reorder)
els.taskList.addEventListener("drop", (e) => {
  e.preventDefault();
  updateTaskOrderFromDOM();
});

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task-item:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function updateTaskOrderFromDOM() {
  const newOrderIds = [...els.taskList.querySelectorAll(".task-item")].map(
    (li) => parseInt(li.dataset.id)
  );

  // Reconstruct state.tasks based on DOM order
  const newTasks = [];
  newOrderIds.forEach((id) => {
    const t = state.tasks.find((x) => x.id === id);
    if (t) newTasks.push(t);
  });

  // Add backend any missing ones (safety)
  if (newTasks.length === state.tasks.length) {
    state.tasks = newTasks;
    saveAndRender();
  }
}

// --- GAME ---
const ctx = els.gameCanvas.getContext("2d");
const GRID = 15;

function startGame() {
  els.modals.game.classList.add("active");
  state.gameActive = true;
  state.gameInterval = setInterval(gameLoop, 100);
  window.addEventListener("keydown", gameKey);
}
function stopGame() {
  els.modals.game.classList.remove("active");
  state.gameActive = false;
  clearInterval(state.gameInterval);
  window.removeEventListener("keydown", gameKey);
}
function gameKey(e) {
  if (state.gameAuto) return;
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      if (state.direction != "down") state.direction = "up";
      break;
    case "ArrowDown":
    case "s":
    case "S":
      if (state.direction != "up") state.direction = "down";
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      if (state.direction != "right") state.direction = "left";
      break;
    case "ArrowRight":
    case "d":
    case "D":
      if (state.direction != "left") state.direction = "right";
      break;
  }
}
function gameLoop() {
  if (state.gameAuto) {
    // Simple bot
    const head = state.snake[0];
    const food = state.food;
    if (head.x < food.x) state.direction = "right";
    else if (head.x > food.x) state.direction = "left";
    else if (head.y < food.y) state.direction = "down";
    else if (head.y > food.y) state.direction = "up";
  }

  let head = { ...state.snake[0] };
  if (state.direction == "up") head.y--;
  if (state.direction == "down") head.y++;
  if (state.direction == "left") head.x--;
  if (state.direction == "right") head.x++;

  // Bounds wrap
  if (head.x < 0) head.x = 20 - 1;
  if (head.x >= 20) head.x = 0;
  if (head.y < 0) head.y = 20 - 1;
  if (head.y >= 20) head.y = 0;

  state.snake.unshift(head);
  if (head.x == state.food.x && head.y == state.food.y) {
    state.score++;
    state.food = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20),
    };
  } else {
    state.snake.pop();
  }

  ctx.fillStyle = "#1e1b4b"; // dark blue bg matching theme
  ctx.fillRect(0, 0, 300, 300);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(state.food.x * GRID, state.food.y * GRID, GRID - 2, GRID - 2);
  ctx.fillStyle = state.gameAuto ? "#a855f7" : "#818cf8";
  state.snake.forEach((p) =>
    ctx.fillRect(p.x * GRID, p.y * GRID, GRID - 2, GRID - 2)
  );
}

// --- Listeners ---
els.btns.settings.addEventListener("click", () => {
  closeDock();
  els.modals.settings.classList.add("active");
});
document
  .getElementById("close-settings")
  .addEventListener("click", () =>
    els.modals.settings.classList.remove("active")
  );
els.btns.saveSettings.addEventListener("click", saveSettings);

els.btns.fullscreen.addEventListener("click", () => {
  closeDock();
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});
els.btns.zen.addEventListener("click", () => {
  closeDock();
  toggleZen();
});
els.btns.zenExit.addEventListener("click", toggleZen);

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

els.btns.game.addEventListener("click", () => {
  closeDock();
  startGame();
});
document.getElementById("close-game-btn").addEventListener("click", stopGame);
els.gameAutoBtn.addEventListener("click", () => {
  state.gameAuto = !state.gameAuto;
  els.gameAutoBtn.classList.toggle("active");
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

els.btns.addTask.addEventListener("click", addTask);
els.inputs.task.addEventListener(
  "keypress",
  (e) => e.key === "Enter" && addTask()
);

// --- Mobile Toggles ---

// Floating Dock (Hamburger)
function closeDock() {
  const dock = document.querySelector(".floating-dock-container");
  if (dock && dock.classList.contains("active")) {
    dock.classList.remove("active");
    const icon = els.btns.menuToggle.querySelector("i");
    if (icon) icon.className = "fa-solid fa-bars";
  }
}

els.btns.menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const dock = document.querySelector(".floating-dock-container");
  const isActive = dock.classList.toggle("active");

  // Icon Swap
  const icon = els.btns.menuToggle.querySelector("i");
  if (isActive) {
    icon.className = "fa-solid fa-xmark";
  } else {
    icon.className = "fa-solid fa-bars";
  }
});

// Task Sidebar
const taskSidebarArea = document.querySelector(".task-sidebar-area");
const taskTrigger = document.querySelector(".task-sidebar-trigger");
const taskIcon = taskTrigger.querySelector("i");

// Prevent clicks INSIDE the panel from closing it
document.querySelector(".task-panel").addEventListener("click", (e) => {
  e.stopPropagation();
});

taskTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = taskSidebarArea.classList.toggle("force-open");

  // Icon Swap
  if (isOpen) {
    taskIcon.className = "fa-solid fa-xmark";
  } else {
    taskIcon.className = "fa-solid fa-list-check";
  }
});

// Close menus when clicking outside
document.addEventListener("click", (e) => {
  const dock = document.querySelector(".floating-dock-container");

  // Close Dock if clicked outside
  if (dock.classList.contains("active") && !dock.contains(e.target)) {
    dock.classList.remove("active");
    // Reset Icon
    const icon = els.btns.menuToggle.querySelector("i");
    icon.className = "fa-solid fa-bars";
  }

  // Close Sidebar if clicked outside (and not dragging)
  if (
    taskSidebarArea.classList.contains("force-open") &&
    !taskSidebarArea.contains(e.target) &&
    !taskSidebarArea.classList.contains("is-dragging")
  ) {
    taskSidebarArea.classList.remove("force-open");
    // Reset Icon
    taskIcon.className = "fa-solid fa-list-check";
  }
});

els.btns.clearDone.addEventListener("click", clearDoneTasks);

// Global exposed functions for inline onclicks
window.toggleStar = toggleStar;
window.deleteTask = deleteTask;

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

// Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Ignore if typing in an input
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      toggleTimer();
      break;
    case "KeyM":
      if (state.player) {
        if (state.isPlaying) state.player.pauseVideo();
        else state.player.playVideo();
      }
      break;
    case "KeyN":
      changeTrack(1);
      break;
  }
});

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
