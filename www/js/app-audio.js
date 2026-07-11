import { state, saveSettings } from "./app-state.js";

// --- Audio System (Background Music Only) ---
window.playSound = function (type) {
    // Button sounds disabled completely as requested
    return;
};

export const updateBgMusic = () => {
    if (!state.sounds.bg) return;
    
    // Apply Volume
    state.sounds.bg.volume = (state.appSettings.bgMusicVolume !== undefined ? state.appSettings.bgMusicVolume : 50) / 100;
    
    if (state.appSettings.musicEnabled) {
        state.sounds.bg.play().catch(e => {
            console.log("Audio blocked, waiting for click/touch.", e);
            const startAudio = () => {
                if (state.appSettings.musicEnabled) {
                    state.sounds.bg.play().catch(err => console.error(err));
                }
                document.removeEventListener('click', startAudio);
                document.removeEventListener('touchstart', startAudio);
            };
            document.addEventListener('click', startAudio);
            document.addEventListener('touchstart', startAudio);
        });
    } else {
        state.sounds.bg.pause();
    }
};

const pauseAudioGlobally = () => {
    console.log("Antiko Audio: Pausing all audio (app hidden/minimized)");
    Object.values(state.sounds).forEach(s => {
        if (s && typeof s.pause === 'function') s.pause();
    });
};

const resumeAudioGlobally = () => {
    console.log("Antiko Audio: Resuming audio (app visible)");
    if (state.appSettings.musicEnabled && state.sounds.bg) {
        state.sounds.bg.play().catch(() => { });
    }
};

// Initialize listeners when DOM is loaded
const initAudioControls = () => {
    const bgVolumeSlider = document.getElementById('bg-sound-volume');
    const bgSoundToggle = document.getElementById('bg-sound-toggle');
    const bgVolumeLabel = document.getElementById('bg-volume-label');

    // Initialize UI from settings
    if (bgVolumeSlider) {
        bgVolumeSlider.value = state.appSettings.bgMusicVolume;
        if (bgVolumeLabel) bgVolumeLabel.textContent = `${state.appSettings.bgMusicVolume}%`;
        
        bgVolumeSlider.addEventListener('input', (e) => {
            state.appSettings.bgMusicVolume = parseInt(e.target.value);
            if (bgVolumeLabel) bgVolumeLabel.textContent = `${state.appSettings.bgMusicVolume}%`;
            saveSettings();
            updateBgMusic();
        });
    }
    
    if (bgSoundToggle) {
        bgSoundToggle.checked = state.appSettings.musicEnabled;
        bgSoundToggle.addEventListener('change', (e) => {
            state.appSettings.musicEnabled = e.target.checked;
            saveSettings();
            updateBgMusic();
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioControls);
} else {
    initAudioControls();
}

// Background / Visibility / Minimize support
(async () => {
    try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
                    if (!isActive) pauseAudioGlobally();
                    else resumeAudioGlobally();
                });
                console.log("Antiko Audio: Capacitor App listener registered.");
            }
        }
    } catch (e) {
        console.warn("Capacitor App listener failed:", e);
    }
})();

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pauseAudioGlobally();
    } else {
        resumeAudioGlobally();
    }
});

window.addEventListener("blur", () => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    pauseAudioGlobally();
});
window.addEventListener("focus", () => {
    resumeAudioGlobally();
});

window.addEventListener("pagehide", () => {
    pauseAudioGlobally();
});
window.addEventListener("pageshow", () => {
    resumeAudioGlobally();
});

// Try starting on load (blocking possible)
updateBgMusic();

// Interaction fallback
const initMusicOnInteraction = () => {
    if (state.appSettings.musicEnabled) {
        updateBgMusic();
    }
};
document.addEventListener('click', initMusicOnInteraction, { once: true });
document.addEventListener('touchstart', initMusicOnInteraction, { once: true });
