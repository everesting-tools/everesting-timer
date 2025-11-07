// metronome.js v1.1
// Синхронизация с челленджем: не звучать до старта, при финише и паузах
// Метроном для каденса


document.addEventListener('DOMContentLoaded', () => {
// --- Получение элементов DOM ---
    const metronomePanel = document.getElementById('metronome-panel');
    const panelHandle = document.getElementById('panel-handle');
    const playPauseButton = document.getElementById('play-pause-button');
    const decreaseBpmButton = document.getElementById('decrease-bpm');
    const increaseBpmButton = document.getElementById('increase-bpm');
    const bpmValueOnButton = document.getElementById('bpm-value');
    const playPauseLabel = document.getElementById('play-pause-label');
    
// Элементы настроек
    const minBpmInput = document.getElementById('min-bpm');
    const maxBpmInput = document.getElementById('max-bpm');
    const modeToggle = document.getElementById('mode-toggle');
    const sound1Label = document.getElementById('sound1-label');
    const sound1Select = document.getElementById('sound1-select');
    const secondSoundSetting = document.getElementById('second-sound-setting');
    const sound2Select = document.getElementById('sound2-select');


// Проверка существования элементов
    if (!metronomePanel || !playPauseButton) {
        console.warn('Metronome elements not found');
        return;
    }


// --- Состояние метронома ---
    let isPlaying = false;
    let bpm = 90;
    let minBpm = 60;
    let maxBpm = 120;
    let isPairedMode = false;
    let soundIds = ['sound1'];
    let beatCounter = 0;
    let metronomeIntervalId = null;
    let panelTimeoutId = null;
    const PANEL_HIDE_DELAY = 10000;


// --- Переменные для удержания кнопки ---
    let holdTimeout = null;
    let repeatInterval = null;
    const HOLD_DELAY = 400;
    let repeatSpeed = 150;


// Флаг разрешения метронома
    window.metronomeAllowed = false;



// --- Функции ---

    const updateBpmDisplay = () => {
        if (bpmValueOnButton) {
            bpmValueOnButton.textContent = bpm;
        }
    };

    const playSound = () => {
        const currentSoundId = soundIds[beatCounter % soundIds.length];
        const audio = document.getElementById(currentSoundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Ошибка воспроизведения звука метронома:", e));
        }
        beatCounter++;
    };

    const startMetronome = () => {
        if (metronomeIntervalId) clearInterval(metronomeIntervalId);
        const effectiveBpm = isPairedMode ? bpm * 2 : bpm;
        const intervalMs = 60000 / effectiveBpm;
        metronomeIntervalId = setInterval(playSound, intervalMs);
    };

    const stopMetronome = () => {
        clearInterval(metronomeIntervalId);
        metronomeIntervalId = null;
    };
    
    
// togglePlayPause проверяет флаг
    const togglePlayPause = () => {

/*
// Если метроном запрещён — не даём запустить
        if (!isPlaying && !window.metronomeAllowed) {
            alert('Метроном доступен только во время челленджа.');
            return;
        }
*/
        
        isPlaying = !isPlaying;
        playPauseButton.classList.toggle('playing', isPlaying);
        if (isPlaying) {
            if (playPauseLabel) playPauseLabel.textContent = 'Стоп';
            beatCounter = 0;
            startMetronome();
        } else {
            if (playPauseLabel) playPauseLabel.textContent = 'Старт';
            stopMetronome();
        }
        resetPanelTimer();
    };
    
    
    const changeBpm = (amount) => {
        let newBpm = bpm + amount;
        if (newBpm < minBpm) newBpm = minBpm;
        if (newBpm > maxBpm) newBpm = maxBpm;
        if (bpm !== newBpm) {
            bpm = newBpm;
            updateBpmDisplay();
            if (isPlaying) {
                startMetronome();
            }
        }
    };

    const startChangingBpm = (direction) => {
        changeBpm(direction);
        resetPanelTimer();
        holdTimeout = setTimeout(() => {
            repeatSpeed = 150;
            repeatInterval = setInterval(() => {
                changeBpm(direction);
                clearInterval(repeatInterval);
                repeatSpeed = Math.max(30, repeatSpeed * 0.9);
                repeatInterval = setInterval(() => changeBpm(direction), repeatSpeed);
            }, repeatSpeed);
        }, HOLD_DELAY);
    };

    const stopChangingBpm = () => {
        clearTimeout(holdTimeout);
        clearInterval(repeatInterval);
        resetPanelTimer();
    };

// --- Управление панелью ---
    const showPanel = () => {
        if (metronomePanel) {
            metronomePanel.classList.add('visible');
            resetPanelTimer();
        }
    };

    const hidePanel = () => {
        if (metronomePanel) {
            metronomePanel.classList.remove('visible');
        }
    };

    const resetPanelTimer = () => {
        if (panelTimeoutId) clearTimeout(panelTimeoutId);
        panelTimeoutId = setTimeout(hidePanel, PANEL_HIDE_DELAY);
    };
    
    const applySettings = () => {
        minBpm = parseInt(minBpmInput?.value, 10) || 30;
        maxBpm = parseInt(maxBpmInput?.value, 10) || 200;
        isPairedMode = modeToggle?.checked || false;
        
// Обновляем UI
        if (secondSoundSetting) {
            secondSoundSetting.classList.toggle('visible', isPairedMode);
        }
        if (sound1Label) {
            sound1Label.textContent = isPairedMode ? 'Звук (левая нога):' : 'Звук (1 оборот):';
        }
        
// Собираем массив звуков
        if (isPairedMode) {
            soundIds = [sound1Select?.value || 'sound1', sound2Select?.value || 'sound4'];
        } else {
            soundIds = [sound1Select?.value || 'sound1'];
        }
        
        changeBpm(0);
        if (isPlaying) {
            startMetronome();
        }
        resetPanelTimer();
    };


// --- Назначение обработчиков ---
    if (panelHandle) {
        panelHandle.addEventListener('click', () => {
            if (metronomePanel.classList.contains('visible')) {
                hidePanel();
                if (panelTimeoutId) clearTimeout(panelTimeoutId);
            } else {
                showPanel();
            }
        });
    }
    
    if (playPauseButton) {
        playPauseButton.addEventListener('click', togglePlayPause);
    }
    
    if (increaseBpmButton) {
        increaseBpmButton.addEventListener('mousedown', () => startChangingBpm(1));
        increaseBpmButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startChangingBpm(1);
        });
    }
    
    if (decreaseBpmButton) {
        decreaseBpmButton.addEventListener('mousedown', () => startChangingBpm(-1));
        decreaseBpmButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startChangingBpm(-1);
        });
    }

    document.addEventListener('mouseup', stopChangingBpm);
    document.addEventListener('mouseleave', stopChangingBpm);
    document.addEventListener('touchend', stopChangingBpm);
    
// Слушатели событий от секундомера
    document.addEventListener('metronome:stop', () => {
        if (isPlaying) {
            togglePlayPause(); // Остановить
        }
    });

    document.addEventListener('metronome:start', () => {
        if (window.metronomeAllowed && !isPlaying) {
// Можно автоматически запустить, если хотите
// togglePlayPause();
        }
    });
    
    
// Слушатели настроек
    minBpmInput?.addEventListener('change', applySettings);
    maxBpmInput?.addEventListener('change', applySettings);
    modeToggle?.addEventListener('change', applySettings);
    sound1Select?.addEventListener('change', applySettings);
    sound2Select?.addEventListener('change', applySettings);


// Остановка при закрытии страницы
    window.addEventListener('pagehide', () => {
        if (isPlaying) {
            stopMetronome();
        }
    });
    
    
// --- Инициализация ---
    applySettings();
    updateBpmDisplay();
});

