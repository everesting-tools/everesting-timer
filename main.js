// main.js v2.5
// Кнопка "Таблица" переключает: скрыто → итоги → таблица кругов → скрыто
// main.js v2.6
// Умное восстановление сессии + синхронизация метронома

import Timer from './timer.js';
import * as data from './data.js';
import * as ui from './ui.js';
import * as ui_tables from './ui_tables.js';
import * as i18n from './i18n.js';
import audio from './audio.js';
import longPress from './longpress.js';
import { debounce, formatTime } from './utils.js';

const FLASH_DURATION = 150;

const elements = {
  startStopBtn: document.querySelector('#startStopBtn'),
  pauseBtn: document.querySelector('#pauseBtn'),
  lapBtn: document.querySelector('#lapBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  overlayStartStopBtn: document.querySelector('#overlayStartStopBtn'),
  overlayPauseBtn: document.querySelector('#overlayPauseBtn'),
  overlayLapBtn: document.querySelector('#overlayLapBtn'),
  overlayResetBtnMain: document.querySelector('#overlayResetBtnMain'),
  settingsBtn: document.querySelector('#settingsBtn'),
  tableBtn: document.querySelector('#tableBtn'),
  instructionsBtn: document.querySelector('#instructionsBtn'),
  settingsPanel: document.querySelector('#settingsPanel'),
  tablePanel: document.querySelector('#tablePanel'),
  instructionsPanel: document.querySelector('#instructionsPanel'),
  instructionsContent: document.querySelector('#instructionsContent'),
  themeToggle: document.querySelector('#themeToggle'),
  langToggle: document.querySelector('#langToggle'),
  audioToggle: document.querySelector('#audioToggle'),
  distanceInput: document.querySelector('#distance'),
  ascentInput: document.querySelector('#ascent'),
  userName: document.querySelector('#userName'),
  trackName: document.querySelector('#trackName'),
  goalLaps: document.querySelector('#goalLaps'),
  countdownOverlay: document.querySelector('#countdownOverlay'),
  countdownNumber: document.querySelector('#countdownNumber'),
  confirmModal: document.querySelector('#confirmModal'),
  confirmMessage: document.querySelector('#confirmMessage'),
  confirmYesBtn: document.querySelector('#confirmYesBtn'),
  confirmNoBtn: document.querySelector('#confirmNoBtn'),
};


const mainTimer = new Timer({ uiUpdateInterval: 100 });

let isCountdownActive = false;
let pendingLapData = null;



// ========== Глобальные функции для управления метрономом  ==========

window.stopMetronome = () => {
  const event = new CustomEvent('metronome:stop');
  document.dispatchEvent(event);
};

window.startMetronome = () => {
  const event = new CustomEvent('metronome:start');
  document.dispatchEvent(event);
};



// ========== HELPERS ==========

function flashButtons(...buttons) {
  const unique = [...new Set(buttons.filter(Boolean))];
  unique.forEach(btn => {
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), FLASH_DURATION);
  });
}


function showPanel(panelToShow) {
  if (elements.settingsPanel) elements.settingsPanel.classList.add('hidden');
  if (elements.tablePanel) elements.tablePanel.classList.add('hidden');
  if (panelToShow) panelToShow.classList.remove('hidden');
}


function showModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const firstFocusable = modal.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();
}


function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  modal.removeAttribute('role');
  modal.removeAttribute('aria-modal');
}


function closeAllPanels() {
  showPanel(null);
  closeModal(elements.instructionsPanel);
}


async function showCountdown() {
  if (!elements.countdownOverlay || !elements.countdownNumber) return;
  
  isCountdownActive = true;
  elements.countdownOverlay.classList.remove('hidden');
  
  const counts = [3, 2, 1, i18n.t('start').toUpperCase()];
  
  for (let i = 0; i < counts.length; i++) {
    elements.countdownNumber.textContent = counts[i];
    elements.countdownNumber.className = 'countdown-number';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    elements.countdownNumber.classList.add('show');
    
    if (i < counts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 950));
    }
  }
  
  elements.countdownOverlay.classList.add('hidden');
  isCountdownActive = false;
}


/**
 * Показывает модальное окно подтверждения.
 */
function showConfirmDialog(message) {
  return new Promise((resolve) => {
    if (!elements.confirmModal || !elements.confirmMessage) {
      resolve(false);
      return;
    }
    
    elements.confirmMessage.textContent = message;
    showModal(elements.confirmModal);
    
    const onYes = () => {
      cleanup();
      resolve(true);
    };
    
    const onNo = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      elements.confirmYesBtn.removeEventListener('click', onYes);
      elements.confirmNoBtn.removeEventListener('click', onNo);
      closeModal(elements.confirmModal);
    };
    
    elements.confirmYesBtn.addEventListener('click', onYes);
    elements.confirmNoBtn.addEventListener('click', onNo);
  });
}



// ========== LONG PRESS HANDLERS ==========

/**
 * Обработчик долгого нажатия на Старт/Стоп.
 */
const onStartStopLongPress = async (timestamp) => {
  if (isCountdownActive) return;
  
  flashButtons(elements.overlayStartStopBtn, elements.startStopBtn);
  audio.playClick();
  
/*  if (data.isFinished()) {
    alert(i18n.t('challengeFinished'));
    return;
  }
*/
  
  if (!data.isTimerRunning()) {
    // СТАРТ
    const [, actualStartTime] = await Promise.all([
      showCountdown(),
      audio.playStartCountdown()
    ]);
    
    data.startTimerWithTimestamp(actualStartTime);
    mainTimer.start();
    
    // Разрешить запуск метронома
    window.metronomeAllowed = true;
    
  } 
  
  else {
    // ФИНИШ
    const result = data.addLapForced(timestamp); //  Добавить круг
    
    mainTimer.stop();
    data.finishChallenge();
    audio.playFinish();
    
    // Остановить метроном
    window.metronomeAllowed = false;
    window.stopMetronome();
    
    const stats = data.calculateStatistics();
    ui.showSummary(stats); // Показать статистику.
    
//    ui_tables.showSummary(stats); // Показать статистику.
    
    closeAllPanels();
    showPanel(elements.tablePanel);
    
    ui.showResetButton();
  }
  
  ui.updateUI(data.getState());
};


/**
 * Обработчик долгого нажатия на Круг.
 */
const onLapLongPress = async (timestamp) => {
  if (!data.isTimerRunning() || data.isPaused()) return;
  
  flashButtons(elements.overlayLapBtn, elements.lapBtn);
  
  const result = data.addLapWithTimestamp(timestamp);
  
  if (!result.success) { // Короткий круг
    if (result.validation && !result.validation.isValid) {
      let message = '';
      
      if (result.validation.reason === 'tooShort') {
        message = i18n.t('lapTooShortWarning')
          .replace('{lapTime}', formatTime(result.lapTime))
          .replace('{avgTime}', formatTime(result.validation.avgTime));
      } else if (result.validation.reason === 'tooShortAbsolute') {
        message = i18n.t('lapTooShortAbsoluteWarning')
          .replace('{lapTime}', formatTime(result.lapTime));
      }
      
      const confirmed = await showConfirmDialog(message);
      
      if (confirmed) {
        data.addLapForced(timestamp);
        audio.playLap();
      } else {
        audio.playClick();
        return;
      }
    }
  } else {
    audio.playLap();
  }
  
  ui.updateUI(data.getState());
};


/**
 * Обработчик нажатия на паузу
 */
const onPauseClick = (event) => {
  flashButtons(event.currentTarget, elements.overlayPauseBtn, elements.pauseBtn);
  
  if (data.isPaused()) {
    data.endPause();
    audio.playResume();
    // Возобновить метроном
    if (window.metronomeAllowed) {
      window.startMetronome();
    }
  } else {
    data.startPause();
    audio.playPause();
    // Остановить метроном
    window.stopMetronome();
  }
  
  ui.updateUI(data.getState());
};

/**
 * Обработчик нажатия на кнопку сброса
 */
const onResetLongPress = async (timestamp) => {
  if (!data.isFinished()) return;
  
  flashButtons(elements.overlayResetBtnMain, elements.resetBtn);
  
  const message = i18n.t('confirmReset');
  const confirmed = await showConfirmDialog(message);
  
  if (!confirmed) {
    audio.playClick();  
    return;
  }
  
  mainTimer.stop();
  data.resetState(true);
  audio.playReset();
  
  // Сбросить флаг метронома
  window.metronomeAllowed = false;
  window.stopMetronome();
  
  ui.hideResetButton();
  ui.restoreLapsTableStructure();
  ui.forceRenderLaps();
  ui.updateUI(data.getState());
  closeAllPanels();
};



// ========== NAVIGATION ==========

const toggleSettings = () => {
  audio.playClick();
  closeModal(elements.instructionsPanel);
  const isHidden = elements.settingsPanel.classList.contains('hidden');
  showPanel(isHidden ? elements.settingsPanel : null);
};


/**
 * Smart toggle for table panel (summary ↔ laps ↔ hidden).
 */
const toggleTable = () => {
  audio.playClick();
  closeModal(elements.instructionsPanel);
  
  const isHidden = elements.tablePanel.classList.contains('hidden');
  const currentView = ui.getTablePanelView();
  const isFinished = data.isFinished();
  
  if (isHidden) {
    // Панель скрыта → показать
    if (isFinished) {
      // Если челлендж завершён → показать итоги
      const stats = data.calculateStatistics();
      ui.showSummary(stats);
      showPanel(elements.tablePanel);
    } else {
      // Если не завершён → показать таблицу кругов
      ui.showLapsTable();
      showPanel(elements.tablePanel);
    }
  } else {
    // Панель видна → переключить или скрыть
    if (isFinished) {
      // Челлендж завершён → переключать итоги ↔ таблица ↔ скрыть
      if (currentView === 'summary') {
        // Итоги → Таблица кругов
        ui.showLapsTable();
      } else if (currentView === 'laps') {
        // Таблица кругов → Скрыть
        showPanel(null);
      }
    } else {
      // Челлендж не завершён → просто скрыть таблицу
      showPanel(null);
    }
  }
};


const toggleInstructions = () => {
  audio.playClick();
  
  const isHidden = elements.instructionsPanel?.classList.contains('hidden');
  
  if (isHidden) {
    showPanel(null);
    showModal(elements.instructionsPanel);
    loadAndShowInstructions();
  } else {
    closeModal(elements.instructionsPanel);
  }
}; //закрытие инструкции


const onThemeChange = (e) => {
  const isDark = e.target.checked;
  document.body.classList.toggle('light-theme', !isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  audio.playClick();
};


const onLanguageChange = (e) => {
  const lang = e.target.checked ? 'ru' : 'en';
  i18n.setLanguage(lang);
  audio.playClick();
  
  if (elements.instructionsContent) {
    elements.instructionsContent.dataset.loadedFile = '';
    elements.instructionsContent.innerHTML = '';
  }
};


const onAudioChange = (e) => {
  const enabled = e.target.checked;
  audio.setEnabled(enabled);
  if (enabled) {
    audio.playClick();
  }
};


const onDistanceInput = (e) => {
  const value = Math.max(0, parseFloat(e.target.value) || 0);
  data.updateLapSettings(value, parseFloat(elements.ascentInput.value) || 0);
  ui.updateUI(data.getState());
};


const onAscentInput = (e) => {
  const value = Math.max(0, parseFloat(e.target.value) || 0);
  data.updateLapSettings(parseFloat(elements.distanceInput.value) || 0, value);
  ui.updateUI(data.getState());
};


const onUserNameInput = (e) => {
  data.updateReportData(e.target.value, elements.trackName.value);
};


const onTrackNameInput = (e) => {
  data.updateReportData(elements.userName.value, e.target.value);
};


const onGoalLapsInput = (e) => {
  const value = Math.max(1, parseInt(e.target.value) || 1);
  data.updateGoal(value);
  ui.updateUI(data.getState());
};


const onGlobalKeyDown = (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isCountdownActive) return;
  
  switch (e.key.toLowerCase()) {
    case 'escape':
      closeAllPanels();
      break;
  }
};



// ========== INSTRUCTIONS ==========

let instructionAbortController = null;


async function loadAndShowInstructions() {
  const preferredFile = i18n.getCurrentInstructionFile();
  
  if (elements.instructionsContent.dataset.loadedFile === preferredFile && 
      elements.instructionsContent.innerHTML.trim() !== '') {
    return;
  }
  
  if (instructionAbortController) {
    instructionAbortController.abort();
  }
  instructionAbortController = new AbortController();
  
  elements.instructionsContent.innerHTML = '<div class="loading" role="status"><span class="visually-hidden">Загрузка...</span></div>';
  
  try {
    const fallbackFile = preferredFile.includes('-RU') 
      ? './INSTRUCTIONS-EN.md' 
      : './INSTRUCTIONS-RU.md';
    
    let response = await fetch(preferredFile, { signal: instructionAbortController.signal });
    if (!response.ok) {
      response = await fetch(fallbackFile, { signal: instructionAbortController.signal });
    }
    if (!response.ok) {
      throw new Error('Instruction files not found');
    }
    
    const markdownText = await response.text();
    
    if (typeof showdown !== 'undefined' && showdown.Converter) {
      const converter = new showdown.Converter();
      const html = converter.makeHtml(markdownText);
      
      const temp = document.createElement('div');
      temp.innerHTML = html;
      temp.querySelectorAll('script, iframe, object, embed').forEach(el => el.remove());
      temp.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) {
            el.removeAttribute(attr.name);
          }
        });
      });
      
      elements.instructionsContent.innerHTML = temp.innerHTML;
    } else {
      elements.instructionsContent.textContent = markdownText;
    }
    
    elements.instructionsContent.dataset.loadedFile = preferredFile;
    
  } catch (error) {
    if (error.name === 'AbortError') return;
    
    console.error('Failed to load instructions:', error);
    elements.instructionsContent.innerHTML = `<p class="error">${i18n.t('errorLoading')}</p>`;
  } finally {
    instructionAbortController = null;
  }
}



// ========== SETUP ==========

function setupEventListeners() {
  longPress.setAudioManager(audio);
  
  // ДОЛГИЕ НАЖАТИЯ для критичных действий
  longPress.register(elements.overlayStartStopBtn, onStartStopLongPress, {
    showProgress: true,
    progressColor: '#4a90e2',
  });
  
  longPress.register(elements.startStopBtn, onStartStopLongPress, {
    showProgress: true,
    progressColor: '#4a90e2',
  });
  
  longPress.register(elements.overlayLapBtn, onLapLongPress, {
    showProgress: true,
    progressColor: '#4caf50',
  });
  
  longPress.register(elements.lapBtn, onLapLongPress, {
    showProgress: true,
    progressColor: '#4caf50',
  });
  
  // Долгое нажатие для сброса
  longPress.register(elements.overlayResetBtnMain, onResetLongPress, {
    showProgress: true,
    progressColor: '#f44336',
  });
  
  longPress.register(elements.resetBtn, onResetLongPress, {
    showProgress: true,
    progressColor: '#f44336',
  });
  
  // ОБЫЧНЫЕ КЛИКИ для паузы
  elements.pauseBtn?.addEventListener('click', onPauseClick);
  elements.overlayPauseBtn?.addEventListener('click', onPauseClick);
  
  // Навигация
  elements.settingsBtn?.addEventListener('click', toggleSettings);
  elements.tableBtn?.addEventListener('click', toggleTable);
  elements.instructionsBtn?.addEventListener('click', toggleInstructions);
  
  // Настройки
  elements.themeToggle?.addEventListener('change', onThemeChange);
  elements.langToggle?.addEventListener('change', onLanguageChange);
  elements.audioToggle?.addEventListener('change', onAudioChange);
  
  // Inputs
  elements.distanceInput?.addEventListener('input', debounce(onDistanceInput, 300));
  elements.ascentInput?.addEventListener('input', debounce(onAscentInput, 300));
  elements.userName?.addEventListener('input', debounce(onUserNameInput, 500));
  elements.trackName?.addEventListener('input', debounce(onTrackNameInput, 500));
  elements.goalLaps?.addEventListener('input', debounce(onGoalLapsInput, 300));
  
  // Глобальные
  document.addEventListener('keydown', onGlobalKeyDown);
  
  // Автосохранение
  setInterval(() => {
    if (data.isTimerRunning() || data.getLaps().length > 0) {
      data.saveToLocalStorage();
    }
  }, 10000);
  
  window.addEventListener('beforeunload', () => {
    data.saveToLocalStorage();
  });
}


function onTimerTick() {
  ui.updateUI(data.getState());
}


function restoreSettings() {
  const state = data.getState();
  
  if (elements.userName) elements.userName.value = state.userName || '';
  if (elements.trackName) elements.trackName.value = state.trackName || '';
  if (elements.distanceInput) elements.distanceInput.value = state.lapDistance || 10;
  if (elements.ascentInput) elements.ascentInput.value = state.lapAscent || 100;
  if (elements.goalLaps) elements.goalLaps.value = state.goalLaps || 100;
}


function initializeApp() {
  try {
    i18n.initLanguage();
    
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    if (elements.themeToggle) {
      elements.themeToggle.checked = isDark;
      document.body.classList.toggle('light-theme', !isDark);
    }
    
    if (elements.audioToggle) {
      elements.audioToggle.checked = audio.isEnabled();
    }
    
    mainTimer.setOnTick(onTimerTick);
    mainTimer.setOnError((error) => {
      console.error('Timer error:', error);
      alert('Ошибка таймера. Приложение будет перезагружено.');
      location.reload();
    });
    
    setupEventListeners();
    
    // Умное восстановление сессии
    const restored = data.restoreFromLocalStorage();
    if (restored) {
      const state = data.getState();
      
      if (state.isFinished) {
        // Сессия завершена — спросить
        const shouldContinue = confirm(i18n.t('sessionRestored'));
        if (!shouldContinue) {
          data.resetState(false);
          window.metronomeAllowed = false;
        } else {
          // Показать итоги и кнопку сброса
          ui.showResetButton();
          const stats = data.calculateStatistics();
          ui.showSummary(stats);
          showPanel(elements.tablePanel);
          window.metronomeAllowed = false;
        }
      } else {
        // Сессия не завершена — продолжить без вопросов
        if (state.isTimerRunning) {
          // Челлендж был в процессе — не перезапускать таймер,
          // только восстановить UI
          window.metronomeAllowed = true;
        }
      }
    } else {
      window.metronomeAllowed = false;
    }
    
    restoreSettings();
    ui.forceRenderLaps();
    ui.updateUI(data.getState());
    
  } catch (e) {
    console.error('Initialization error:', e);
    alert(`Ошибка при запуске: ${e.message}\n\nПопробуйте перезагрузить страницу.`);
  }
}


initializeApp();