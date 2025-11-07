// ui.js v2.2
// Исправлен рендер таблицы после итогов + убрана лишняя кнопка

import * as data from './data.js';
import { formatTime, formatDistance, formatAscent } from './utils.js';
import * as i18n from './i18n.js';
import audio from './audio.js';



const PROGRESS_THRESHOLDS = {
  GOOD: 85,
  WARNING_YELLOW: 90,
  WARNING_ORANGE: 95,
  CRITICAL: 100,
};

const elements = {
  timerDisplay: document.querySelector('#timer'),
  lapTimerDisplay: document.querySelector('#lapTimer'),
  pauseTimer: document.querySelector('#pauseTimer'),
  lapProgressBar: document.querySelector('#lapProgressBar'),
  totalProgressBar: document.querySelector('#totalProgressBar'),
  startStopBtn: document.querySelector('#startStopBtn'),
  overlayStartStopBtn: document.querySelector('#overlayStartStopBtn'),
  lapBtn: document.querySelector('#lapBtn'),
  overlayLapBtn: document.querySelector('#overlayLapBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  overlayResetBtn: document.querySelector('#overlayResetBtn'),
  pauseBtn: document.querySelector('#pauseBtn'),
  overlayPauseBtn: document.querySelector('#overlayPauseBtn'),
  lapsBody: document.querySelector('#laps'),
  noLapsMessage: document.querySelector('#noLapsMessage'),
  tableContainer: document.querySelector('.table-container'),
  totalDistanceDisplay: document.querySelector('#totalDistance'),
  totalAscentDisplay: document.querySelector('#totalAscent'),
  avgLapTime: document.querySelector('#avgLapTime'),
  lapsDone: document.querySelector('#lapsDone'),
  lapsGoal: document.querySelector('#lapsGoal'),
  currentLapNumber: document.querySelector('#currentLapNumber'),
  avgTimeForBar: document.querySelector('#avgTimeForBar'),
};

// Кеш для предотвращения лишних обновлений
let lastRenderedLapsCount = 0;
let lastMinuteAnnounced = -1;



// ========== HELPERS ==========

/**
 * Updates element text only if value changed.
 */
function updateTextIfChanged(element, newValue) {
  if (!element) return;
  const newText = String(newValue);
  if (element.textContent !== newText) {
    element.textContent = newText;
  }
}


/**
 * Updates timer element with semantic attributes.
 */
function updateTimer(element, milliseconds, shouldAnnounce = false) {
  if (!element) return;
  
  const formatted = formatTime(milliseconds);
  if (element.textContent === formatted) return;
  
  element.textContent = formatted;
  
// Обновить datetime для семантики
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let datetime;
  if (hours > 0) {
    datetime = `PT${hours}H${minutes}M${seconds}S`;
  } else {
    datetime = `PT${minutes}M${seconds}S`;
  }
  element.setAttribute('datetime', datetime);
  
// Анонсировать только важные моменты (каждую минуту)
  if (shouldAnnounce) {
    element.setAttribute('aria-live', 'polite');
    setTimeout(() => element.setAttribute('aria-live', 'off'), 1000);
  }
}


/**
 * Updates progress bar with status classes.
 */
function updateProgressBar(barElement, textElement, currentValue, targetValue, isActive = true) {
  if (!barElement) return;
  
  if (!isActive || targetValue === 0) {
    barElement.style.width = '0%';
    barElement.className = 'progress-bar-fill';
    if (textElement) {
      textElement.classList.remove('good-pace', 'warning-yellow', 'warning-orange', 'critical');
    }
    return;
  }
  
  const progressPercent = (currentValue / targetValue) * 100;
  const displayWidth = Math.min(progressPercent, 100);
  
  barElement.style.width = `${displayWidth}%`;
  
// Определить класс статуса
  let statusClass = '';
  if (progressPercent >= PROGRESS_THRESHOLDS.CRITICAL) {
    statusClass = 'critical';
  } else if (progressPercent >= PROGRESS_THRESHOLDS.WARNING_ORANGE) {
    statusClass = 'warning-orange';
  } else if (progressPercent >= PROGRESS_THRESHOLDS.WARNING_YELLOW) {
    statusClass = 'warning-yellow';
  } else if (progressPercent >= PROGRESS_THRESHOLDS.GOOD) {
    statusClass = 'good-pace';
  }
  
// Обновить классы только если изменились
  const allClasses = ['good-pace', 'warning-yellow', 'warning-orange', 'critical'];
  const currentClass = allClasses.find(cls => barElement.classList.contains(cls));
  
  if (currentClass !== statusClass) {
    barElement.classList.remove(...allClasses);
    if (statusClass) barElement.classList.add(statusClass);
    
    if (textElement) {
      textElement.classList.remove(...allClasses);
      if (statusClass) textElement.classList.add(statusClass);
    }
  }
  
// Обновить aria для скринридеров
  barElement.setAttribute('aria-valuenow', Math.round(progressPercent));
  barElement.setAttribute('aria-valuemin', '0');
  barElement.setAttribute('aria-valuemax', '100');
}


/**
 * Creates a single lap row element.
 */
function createLapRow(lap) {
  const row = document.createElement('tr');
  
  let deltaCell = '<td>-</td>';
  if (lap.delta !== undefined && lap.lap > 1) {
    const deltaClass = lap.delta >= 0 ? 'delta-negative' : 'delta-positive';
    const sign = lap.delta >= 0 ? '+' : '';
    deltaCell = `<td class="${deltaClass}">${sign}${formatTime(Math.abs(lap.delta))}</td>`;
  }
  
  const pauseCell = (lap.pauseDuration && lap.pauseDuration > 0) 
    ? `<td>${formatTime(lap.pauseDuration)}</td>` 
    : '<td>-</td>';
  
  row.innerHTML = `
    <td>${lap.lap}</td>
    <td>${formatTime(lap.totalTime)}</td>
    <td>${formatTime(lap.time)}</td>
    ${deltaCell}
    ${pauseCell}
  `;
  
  return row;
}


/**
 * Incrementally renders new laps without full table rebuild.
 */
function renderLaps(laps) {
  if (!elements.lapsBody) return;
  
// Полный сброс если кругов стало меньше
  if (laps.length < lastRenderedLapsCount) {
    elements.lapsBody.innerHTML = '';
    lastRenderedLapsCount = 0;
  }
  
// Добавить только новые круги
  if (laps.length > lastRenderedLapsCount) {
    const newLaps = laps.slice(lastRenderedLapsCount);
    const fragment = document.createDocumentFragment();
    
// Новые круги в начало таблицы (reverse order)
    newLaps.reverse().forEach(lap => {
      const row = createLapRow(lap);
      fragment.appendChild(row);
    });
    
// Вставить новые круги в начало
    if (elements.lapsBody.firstChild) {
      elements.lapsBody.insertBefore(fragment, elements.lapsBody.firstChild);
    } else {
      elements.lapsBody.appendChild(fragment);
    }
    
    lastRenderedLapsCount = laps.length;
  }
  
// Показать/скрыть сообщение о пустой таблице
  const isEmpty = laps.length === 0;
  if (elements.noLapsMessage) {
    elements.noLapsMessage.style.display = isEmpty ? 'block' : 'none';
  }
  if (elements.tableContainer) {
    elements.tableContainer.style.display = isEmpty ? 'none' : 'block';
  }
}


/**
 * Updates button states and labels.
 */
function updateButtons(isRunning, isPaused, isFinished, lapsCount) {
  const startStopText = i18n.t(
    isFinished ? 'finish' : (isRunning ? 'finish' : 'start')
  );
  const startStopDisabled = isFinished;
  
  const pauseText = i18n.t(isPaused ? 'resume' : 'pause');
  const pauseDisabled = !isRunning || isFinished;
  
  const lapText = i18n.t('lap');
  const lapDisabled = !isRunning || isPaused;
  
  const resetText = i18n.t('reset');
  const resetDisabled = !isFinished && lapsCount === 0;
  
  const applyState = (element, disabled, text) => {
    if (!element) return;
    element.disabled = disabled;
    if (text && element.textContent !== text) {
      element.textContent = text;
    }
    element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  };
  
  applyState(elements.startStopBtn, startStopDisabled, startStopText);
  applyState(elements.overlayStartStopBtn, startStopDisabled, '');
  
  applyState(elements.pauseBtn, pauseDisabled, pauseText);
  applyState(elements.overlayPauseBtn, pauseDisabled, '');
  
  applyState(elements.lapBtn, lapDisabled, lapText);
  applyState(elements.overlayLapBtn, lapDisabled, '');
  
  applyState(elements.resetBtn, resetDisabled, resetText);
  applyState(elements.overlayResetBtn, resetDisabled, '');
}



// ========== MAIN UPDATE ==========

/**
 * Updates all UI elements based on current state.
 */
export function updateUI(state) {
  if (!state) return;
  
// Получить время через геттеры
  const totalElapsedTime = data.getElapsedTime();
  const currentLapTime = data.getLapElapsedTime(); // Полное время круга (с паузами)
  const pauseDuration = data.getCurrentPauseDuration();
  
// Обновить таймеры (с анонсом каждую минуту)
  const currentMinute = Math.floor(totalElapsedTime / 60000);
  const shouldAnnounce = currentMinute !== lastMinuteAnnounced && currentMinute > 0;
  if (shouldAnnounce) lastMinuteAnnounced = currentMinute;
  
// Главный таймер
  updateTimer(elements.timerDisplay, totalElapsedTime, shouldAnnounce);
  
// Таймер круга (включает паузы, всегда растёт)
  updateTimer(elements.lapTimerDisplay, currentLapTime, false);
  
// Таймер паузы (показывает текущую паузу для информации)
  if (elements.pauseTimer) {
    if (state.isPaused) {
      elements.pauseTimer.classList.add('active');
      updateTextIfChanged(elements.pauseTimer, formatTime(pauseDuration));
    } else {
      elements.pauseTimer.classList.remove('active');
      if (elements.pauseTimer.textContent !== '') {
        elements.pauseTimer.textContent = '';
      }
    }
  }
  
// Обновить прогресс-бары
  const isLapActive = state.lapCounter > 0 && state.isTimerRunning && !state.isPaused;
  
  updateProgressBar(
    elements.lapProgressBar,
    elements.lapTimerDisplay,
    currentLapTime,
    state.averageLapTime,
    isLapActive && state.averageLapTime > 0
  );
  
  updateProgressBar(
    elements.totalProgressBar,
    null,
    state.lapCounter,
    state.goalLaps,
    true
  );
  
// Обновить счётчики кругов
  updateTextIfChanged(elements.lapsDone, state.lapCounter);
  updateTextIfChanged(elements.lapsGoal, state.goalLaps);
  updateTextIfChanged(elements.currentLapNumber, state.lapCounter + 1);
  
// Обновить среднее время
  const avgFormatted = formatTime(state.averageLapTime);
  updateTextIfChanged(elements.avgLapTime, avgFormatted);
  updateTextIfChanged(elements.avgTimeForBar, avgFormatted);
  
// Обновить итоги (с учётом локали)
  const locale = i18n.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US';
  updateTextIfChanged(elements.totalDistanceDisplay, formatDistance(data.getTotalDistance(), locale));
  updateTextIfChanged(elements.totalAscentDisplay, formatAscent(data.getTotalAscent(), locale));
  
// Обновить кнопки
  updateButtons(state.isTimerRunning, state.isPaused, state.isFinished, state.laps.length);
  
// Обновить таблицу кругов (ТОЛЬКО если добавились новые)
  if (state.laps.length !== lastRenderedLapsCount) {
    renderLaps(state.laps);
  }
}


/**
 * Forces full re-render of laps table.
 */
export function forceRenderLaps() {
  lastRenderedLapsCount = 0;
  const laps = data.getLaps();
  renderLaps(laps);
}


export function setCountdownMode(isActive) {
  const buttons = [
    elements.startStopBtn,
    elements.overlayStartStopBtn,
    elements.pauseBtn,
    elements.lapBtn,
  ];
  
  buttons.forEach(btn => {
    if (btn) {
      btn.disabled = isActive;
      btn.setAttribute('aria-busy', isActive ? 'true' : 'false');
    }
  });
}



// ========== SUMMARY SCREEN ==========

/**
 * Shows summary screen with detailed statistics.
 */
export function showSummary(stats) {
  if (!stats) return;
  
  const startTime = stats.startDateTime ? formatDate(stats.startDateTime) : '';
  const finishTime = stats.finishDateTime ? formatDate(stats.finishDateTime) : '';
  
  const summaryHTML = `
    <div class="summary-screen">
      <h2 class="summary-title">${i18n.t('sessionComplete')}</h2>
      
      <div class="summary-meta">
        ${startTime ? `<p><strong>${i18n.t('startTime')}:</strong> ${startTime}</p>` : ''}
        ${finishTime ? `<p><strong>${i18n.t('finishTime')}:</strong> ${finishTime}</p>` : ''}
        ${stats.userName ? `<p><strong>${i18n.t('userNameLabel')}</strong> ${escapeHtml(stats.userName)}</p>` : ''}
        ${stats.trackName ? `<p><strong>${i18n.t('trackNameLabel')}</strong> ${escapeHtml(stats.trackName)}</p>` : ''}
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <h3 data-i18n="generalStats">${i18n.t('generalStats')}</h3>
          <div class="stat-row">
            <span data-i18n="totalTimeLabel">${i18n.t('totalTimeLabel')}</span>
            <span class="stat-value">${formatTime(stats.totalElapsedTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="lapsCompleted">${i18n.t('lapsCompleted')}:</span>
            <span class="stat-value">${stats.totalLaps} / ${stats.goalLaps}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="totalDistanceLabel">${i18n.t('totalDistanceLabel')}</span>
            <span class="stat-value">${formatDistance(stats.totalDistance, i18n.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US')} км</span>
          </div>
          <div class="stat-row">
            <span data-i18n="totalAscentLabel">${i18n.t('totalAscentLabel')}</span>
            <span class="stat-value">${formatAscent(stats.totalAscent, i18n.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US')} м</span>
          </div>
          <div class="stat-row">
            <span data-i18n="distanceGradient">${i18n.t('distanceGradient')}:</span>
            <span class="stat-value">${stats.distanceGradient.toFixed(1)} м/км</span>
          </div>
          <div class="stat-row">
            <span data-i18n="ascentSpeed">${i18n.t('ascentSpeed')}:</span>
            <span class="stat-value">${Math.round(stats.ascentSpeed)} м/ч</span>
          </div>
        </div>
        
        
${stats.totalLaps > 1 ?  // Не показывать панель, если один круг.
        `<div class="summary-card">
          <h3 data-i18n="lapStats">${i18n.t('lapStats')}</h3>
          <div class="stat-row">
            <span data-i18n="avgLapTimeLabel">${i18n.t('avgLapTimeLabel')}</span>
            <span class="stat-value">${formatTime(stats.avgLapTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="fastestLap">${i18n.t('fastestLap')}:</span>
            <span class="stat-value stat-best">${formatTime(stats.minLapTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="slowestLap">${i18n.t('slowestLap')}:</span>
            <span class="stat-value stat-worst">${formatTime(stats.maxLapTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="stdDeviation">${i18n.t('stdDeviation')}:</span>
            <span class="stat-value">${formatTime(stats.stdDeviationLapTime)}</span>
          </div>
        </div>` : ''
}
        
${stats.totalPauses > 0 ? // Не показывать панель, если нет пауз
        `<div class="summary-card">
          <h3 data-i18n="pauseStats">${i18n.t('pauseStats')}</h3>
          <div class="stat-row">
            <span data-i18n="totalPauses">${i18n.t('totalPauses')}:</span>
            <span class="stat-value">${stats.totalPauses}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="totalPauseTime">${i18n.t('totalPauseTime')}:</span>
            <span class="stat-value">${formatTime(stats.totalPauseTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="maxPause">${i18n.t('maxPause')}:</span>
            <span class="stat-value">${formatTime(stats.maxPauseTime)}</span>
          </div>
          <div class="stat-row">
            <span data-i18n="avgPausePerLap">${i18n.t('avgPausePerLap')}:</span>
            <span class="stat-value">${formatTime(stats.avgPausePerLap)}</span>
          </div>
        </div>
        ` : ''
}
      </div>
      
      <div class="summary-actions">
        <button id="downloadSummaryBtn" class="btn btn-primary" type="button">
          <span data-i18n="downloadSummary">${i18n.t('downloadSummary')}</span>
        </button>
        <button id="downloadFullReportBtn" class="btn btn-secondary" type="button">
          <span data-i18n="downloadFullReport">${i18n.t('downloadFullReport')}</span>
        </button>
      </div>
    </div>
  `;
  
  const tablePanel = document.querySelector('#tablePanel');
  if (tablePanel) {
    tablePanel.innerHTML = summaryHTML;
    tablePanel.dataset.view = 'summary';
    
    document.querySelector('#downloadSummaryBtn')?.addEventListener('click', handleDownloadSummary);
    document.querySelector('#downloadFullReportBtn')?.addEventListener('click', handleDownloadFullReport);
  }
}


/**
 * ИСПРАВЛЕНО: Restores laps table view and renders actual laps.
 */
export function showLapsTable() {
  const tablePanel = document.querySelector('#tablePanel');
  if (!tablePanel) return;
  
  tablePanel.innerHTML = `
    <h2 data-i18n="laps">Круги</h2>
    <div class="table-container">
      <table class="laps-table no-select">
        <caption class="visually-hidden" data-i18n="laps">Круги</caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="lapColumn">Круг</th>
            <th scope="col" data-i18n="totalTimeColumn">Общее время</th>
            <th scope="col" data-i18n="lapTimeColumn">Время круга</th>
            <th scope="col">+/-</th>
            <th scope="col" data-i18n="pausesColumn">Время пауз</th>
          </tr>
        </thead>
        <tbody id="laps"></tbody>
      </table>
    </div>
    <div id="noLapsMessage" class="no-laps-message" data-i18n="noLapsYet">Кругов еще нет.</div>
  `;
  
  tablePanel.dataset.view = 'laps'; // Отметить что сейчас показана таблица
  
// ВАЖНО: Обновить ссылки на элементы (они были пересозданы)
  elements.lapsBody = document.querySelector('#laps');
  elements.noLapsMessage = document.querySelector('#noLapsMessage');
  elements.tableContainer = document.querySelector('.table-container');
  
// Сбросить счётчик и принудительно отрисовать ВСЕ круги
  lastRenderedLapsCount = 0;
  const laps = data.getLaps();
  renderLaps(laps);
  
  i18n.translatePage();
}


// ========== HANDLERS ==========

function handleDownloadSummary() {
  const proceed = confirm(i18n.t('confirmDownload'));
  if (!proceed) return;
  
  data.downloadSummary();
  audio.playClick();
}


/**
 * Restores original laps table structure (removes summary, clears table).
 * Used after reset.
 */
export function restoreLapsTableStructure() {
  const tablePanel = document.querySelector('#tablePanel');
  if (!tablePanel) return;
  
  tablePanel.innerHTML = `
    <h2 data-i18n="laps">Круги</h2>
    <div class="table-container">
      <table class="laps-table no-select">
        <caption class="visually-hidden" data-i18n="laps">Круги</caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="lapColumn">Круг</th>
            <th scope="col" data-i18n="totalTimeColumn">Общее время</th>
            <th scope="col" data-i18n="lapTimeColumn">Время круга</th>
            <th scope="col">+/-</th>
            <th scope="col" data-i18n="pausesColumn">Время пауз</th>
          </tr>
        </thead>
        <tbody id="laps"></tbody>
      </table>
    </div>
    <div id="noLapsMessage" class="no-laps-message" data-i18n="noLapsYet">Кругов еще нет.</div>
  `;
  
  tablePanel.dataset.view = 'laps';
  
  lastRenderedLapsCount = 0;
  
  elements.lapsBody = document.querySelector('#laps');
  elements.noLapsMessage = document.querySelector('#noLapsMessage');
  elements.tableContainer = document.querySelector('.table-container');
  
  i18n.translatePage();
}


function handleDownloadFullReport() {
  const proceed = confirm(i18n.t('confirmDownload'));
  if (!proceed) return;
  
  data.downloadFullReport();
  audio.playClick();
}


function handleViewLaps() {
  showLapsTable();
  audio.playClick();
}


/**
 * НОВОЕ: Checks current view of table panel.
 */
export function getTablePanelView() {
  const tablePanel = document.querySelector('#tablePanel');
  return tablePanel?.dataset.view || 'laps';
}



// ========== HELPERS ==========

function formatDate(isoString) {
  const date = new Date(isoString);
  const locale = i18n.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


/**
 * Shows overlay reset button on main timer.
 */
export function showResetButton() {
  const btn = document.querySelector('#overlayResetBtnMain');
  const startStopBtn = document.querySelector('#overlayStartStopBtn');
  
  if (btn) {
    btn.classList.remove('hidden');
  }
  
// Скрыть кнопку старт/стоп
  if (startStopBtn) {
    startStopBtn.classList.add('hidden');
  }
}


/**
 * Hides overlay reset button on main timer.
 */
export function hideResetButton() {
  const btn = document.querySelector('#overlayResetBtnMain');
  const startStopBtn = document.querySelector('#overlayStartStopBtn');
  
  if (btn) {
    btn.classList.add('hidden');
  }
  
// Показать кнопку старт/стоп
  if (startStopBtn) {
    startStopBtn.classList.remove('hidden');
  }
}
