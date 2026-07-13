// Dynamic Configuration and Global State for Antiko App
export const state = {
    currentUser: null,
    selectedGameOrder: { game: null, option: null },
    adminWhatsApp: "",
    adminEmails: [
        "karemkoko257koko@gmail.com",
        "omaranter.abdallah@gmail.com",
        "antiko.cb40b@gmail.com",
        "admin257@gmail.com",
        "kareem9989193@gmail.com",
        "zyadwzyry0@gmail.com",
        "b35435573@gmail.com",
        "rsam64833@gmail.com",
        "faresmanee3@gmail.com",
        "ferrohq1@gmail.com"
    ],
    appFlags: {
        aiVisible: true,
        protectionEnabled: true,
        maintenanceMode: false
    },
    sounds: {
        bg: (window.top !== window.self) ? {
            play: () => Promise.resolve(),
            pause: () => {},
            load: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            volume: 0,
            currentTime: 0
        } : new Audio('assets/audio/bg.mp3')
    },
    appSettings: JSON.parse(localStorage.getItem('antiko_settings')) || {
        musicEnabled: true,
        theme: 'dark',
        bgMusicVolume: 50
    }
};

// Initialize State Sounds
if (state.appSettings.musicEnabled === undefined) state.appSettings.musicEnabled = true;
if (state.appSettings.bgMusicVolume === undefined) state.appSettings.bgMusicVolume = 50;

state.sounds.bg.preload = 'auto';
state.sounds.bg.load();
state.sounds.bg.loop = true;
state.sounds.bg.volume = state.appSettings.bgMusicVolume / 100;

export const saveSettings = () => {
    localStorage.setItem('antiko_settings', JSON.stringify(state.appSettings));
};
