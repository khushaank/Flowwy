// HTML5 Audio Player for Archive.org Streaming
// This replaces the YouTube player with a simpler, more reliable solution

function initArchiveAudioPlayer() {
  const audioPlayer = document.getElementById("audio-player");
  const trackNameEl = document.getElementById("current-track-name");
  const musicPlayBtn = document.getElementById("music-toggle");
  const nextBtn = document.getElementById("next-track");
  const prevBtn = document.getElementById("prev-track");

  if (!audioPlayer) {
    console.error("Audio player element not found");
    return;
  }

  // Initial setup
  state.player = audioPlayer;
  loadTrack(state.currTrackIdx);

  // Play event
  audioPlayer.addEventListener("play", () => {
    state.isPlaying = true;
    if (musicPlayBtn)
      musicPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (trackNameEl)
      trackNameEl.textContent = state.playlists[state.currTrackIdx].name;

    const musicInfo = document.querySelector(".music-info");
    if (musicInfo) musicInfo.classList.add("playing");

    updateMediaSession();
  });

  // Pause event
  audioPlayer.addEventListener("pause", () => {
    state.isPlaying = false;
    if (musicPlayBtn)
      musicPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

    const musicInfo = document.querySelector(".music-info");
    if (musicInfo) musicInfo.classList.remove("playing");

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  });

  // Track ended - loop
  audioPlayer.addEventListener("ended", () => {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  });

  // Error handling
  audioPlayer.addEventListener("error", (e) => {
    console.error("Audio error:", e);
    if (trackNameEl) trackNameEl.textContent = "Error - Trying next track";
    setTimeout(() => nextTrack(), 2000);
  });

  // Button listeners
  if (musicPlayBtn) {
    musicPlayBtn.addEventListener("click", toggleMusic);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", nextTrack);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", prevTrack);
  }

  // Setup Media Session
  setupMediaSession();
}

function loadTrack(index) {
  const track = state.playlists[index];
  const audioPlayer = state.player;
  const trackNameEl = document.getElementById("current-track-name");

  if (!audioPlayer || !track) return;

  audioPlayer.src = track.url;
  audioPlayer.load();

  if (trackNameEl) {
    trackNameEl.textContent = track.name;
  }

  updateMediaSession();
}

function toggleMusic() {
  const audioPlayer = state.player;
  if (!audioPlayer) return;

  if (state.isPlaying) {
    audioPlayer.pause();
  } else {
    audioPlayer.play().catch((err) => {
      console.error("Playback failed:", err);
    });
  }
}

function nextTrack() {
  state.currTrackIdx = (state.currTrackIdx + 1) % state.playlists.length;
  loadTrack(state.currTrackIdx);
  if (state.isPlaying) {
    state.player.play();
  }
}

function prevTrack() {
  state.currTrackIdx =
    (state.currTrackIdx - 1 + state.playlists.length) % state.playlists.length;
  loadTrack(state.currTrackIdx);
  if (state.isPlaying) {
    state.player.play();
  }
}

function updateMediaSession() {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.playlists[state.currTrackIdx].name,
      artist: "Flowwy LoFi",
      artwork: [
        {
          src: "img/logo.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });
    navigator.mediaSession.playbackState = state.isPlaying
      ? "playing"
      : "paused";
  }
}

function setupMediaSession() {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => {
      if (state.player) state.player.play();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (state.player) state.player.pause();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prevTrack();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextTrack();
    });

    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      if (state.player) {
        state.player.currentTime = Math.max(
          state.player.currentTime - (details.seekOffset || 10),
          0,
        );
      }
    });

    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      if (state.player) {
        state.player.currentTime = Math.min(
          state.player.currentTime + (details.seekOffset || 10),
          state.player.duration,
        );
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchiveAudioPlayer);
} else {
  initArchiveAudioPlayer();
}
