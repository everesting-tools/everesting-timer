// data.js v2.3
// Добавлены startDateTime, finishDateTime, улучшены имена файлов
// data.js v2.2
// Время круга = полное время от старта до отсечки (включая паузы)
// Паузы учитываются только для статистики

import { formatTime } from './utils.js';
import * as i18n from './i18n.js';


const STORAGE_KEY = 'everesting_state';
const STORAGE_KEY_SESSIONS = 'everesting_completed_sessions';


const state = {
// Настройки
  userName: '',
  trackName: '',
  goalLaps: 20,
  lapDistance: 10,
  lapAscent: 100,
  
// Состояние таймера
  isTimerRunning: false,
  isPaused: false,
  isFinished: false,
  
// Временные метки (performance.now())
  startTime: 0,
  lapStartTime: 0,
  pauseStartTime: 0,
  totalPausedTime: 0, // Суммарное время всех пауз (для статистики)
  
// Круги и статистика
  laps: [],
  lapCounter: 0,
  averageLapTime: 0,
  
// История пауз
  pauses: [],
  
// Временные метки для отчёта
  startDateTime: null,   // ISO timestamp момента старта
  finishDateTime: null,  // ISO timestamp момента финиша
};


// ========== GETTERS ==========

export const isTimerRunning = () => state.isTimerRunning;
export const isPaused = () => state.isPaused;
export const isFinished = () => state.isFinished;


export function getState() {
  return {
    ...state,
    laps: state.laps.map(lap => ({ ...lap })),
    pauses: state.pauses.map(p => ({ ...p })),
  };
}


/**
 * Gets current elapsed time (total from start).
 */
export function getElapsedTime() {
  if (!state.isTimerRunning || state.startTime === 0) return 0;
  return performance.now() - state.startTime;
}

/**
 * Gets current lap time (от начала круга, ВКЛЮЧАЯ паузы).
 */
export function getLapElapsedTime() {
  if (!state.isTimerRunning || state.lapStartTime === 0) return 0;
  return performance.now() - state.lapStartTime;
}


/**
 * Gets current pause duration.
 */
export function getCurrentPauseDuration() {
  if (!state.isPaused) return 0;
  return performance.now() - state.pauseStartTime;
}


/**
 * Gets total paused time (accumulated).
 */
export function getTotalPausedTime() {
  let total = state.totalPausedTime;
  if (state.isPaused) {
    total += getCurrentPauseDuration();
  }
  return total;
}


export const getLaps = () => state.laps.map(lap => ({ ...lap }));
export const getPauses = () => state.pauses.map(p => ({ ...p }));

export const getTotalDistance = () => state.lapCounter * state.lapDistance;
export const getTotalAscent = () => state.lapCounter * state.lapAscent; // Общий подъем

export const getAverageLapTime = () => state.averageLapTime;
export const getLapCounter = () => state.lapCounter;
export const getGoalLaps = () => state.goalLaps;


export function getProgress() {
  return state.goalLaps > 0 
    ? Math.min(100, (state.lapCounter / state.goalLaps) * 100) 
    : 0;
}


export function getETA() {
  if (state.lapCounter === 0 || state.averageLapTime === 0) return null;
  const remainingLaps = Math.max(0, state.goalLaps - state.lapCounter);
  return remainingLaps * state.averageLapTime;
}



// ========== TIMER CONTROL ==========

export function startTimer() {
  if (state.isTimerRunning) {
    console.warn('Timer already running');
    return false;
  }
  
  const now = performance.now();
  state.isTimerRunning = true;
  state.startTime = now;
  state.lapStartTime = now;
  state.totalPausedTime = 0;
  state.isPaused = false;
  state.isFinished = false;
  
  // Записать момент старта
  state.startDateTime = new Date().toISOString();
  
  return true;
}


export function startTimerWithTimestamp(timestamp) {
  if (state.isTimerRunning) {
    console.warn('Timer already running');
    return false;
  }
  
  state.isTimerRunning = true;
  state.startTime = timestamp;
  state.lapStartTime = timestamp;
  state.totalPausedTime = 0;
  state.isPaused = false;
  state.isFinished = false;
  
// Записать момент старта
  state.startDateTime = new Date().toISOString();
  
  return true;
}


export function stopTimer() {
  if (!state.isTimerRunning) return false;
  
  if (state.isPaused) {
    endPause();
  }
  
  state.isTimerRunning = false;
  return true;
}


/**
 * Starts a pause (только для статистики).
 */
export function startPause() {
  if (state.isPaused || !state.isTimerRunning) return false;
  
  state.isPaused = true;
  state.pauseStartTime = performance.now();
  
  return true;
}


/**
 * Ends a pause (сохраняет в историю).
 */
export function endPause() {
  if (!state.isPaused) return false;
  
  const now = performance.now();
  const pauseDuration = now - state.pauseStartTime;
  
// Сохранить паузу в историю
  state.pauses.push({
    start: state.pauseStartTime,
    end: now,
    duration: pauseDuration,
    lapNumber: state.lapCounter + 1,
  });
  
  state.totalPausedTime += pauseDuration;
  state.isPaused = false;
  state.pauseStartTime = 0;
  
  return true;
}


export function finishChallenge() {
  if (!state.isTimerRunning) return false;
  
  stopTimer();
  state.isFinished = true;
  
// Записать момент финиша
  state.finishDateTime = new Date().toISOString();
  
  saveToLocalStorage();
  
  return true;
}



// ========== LAP MANAGEMENT ==========

/**
 * Добавление круга
 */
export function addLapWithTimestamp_(timestamp) {
  if (!state.isTimerRunning) {
    console.warn('Cannot add lap: timer not running');
    return { success: false, reason: 'timerNotRunning' };
  }
  
// Время круга = полное время от начала круга включая паузы)
  const lapTime = timestamp - state.lapStartTime;

// Валидация
  const validation = validateLapTime(lapTime);


// Влияет на финишный круг!
  if (!validation.isValid) {
    return {
      success: false,
      validation: validation,
      lapTime: lapTime,
    };
  }


// Дельта от среднего
  const delta = state.lapCounter > 0 ? lapTime - state.averageLapTime : 0;

// Паузы на этом круге (только для информации)
  const lapPauses = state.pauses
    .filter(p => p.lapNumber === state.lapCounter + 1)
    .reduce((sum, p) => sum + p.duration, 0);
  
  const lapData = {
    lap: state.lapCounter + 1,
    time: lapTime, // Полное время круга (с паузами)
    totalTime: timestamp - state.startTime,
    pauseDuration: lapPauses, // Только для статистики
    delta: delta,
    totalDistance: (state.lapCounter + 1) * state.lapDistance,
    totalAscent: (state.lapCounter + 1) * state.lapAscent,
  };
  
  state.laps.push(lapData);
  state.lapCounter++;
  
  const totalLapTime = state.averageLapTime * (state.lapCounter - 1) + lapTime;
  state.averageLapTime = totalLapTime / state.lapCounter;
  
  state.lapStartTime = timestamp;

  saveToLocalStorage();
  
  return { success: true, validation: { isValid: true } };
}



export function addLapWithTimestamp(timestamp) {
  if (!state.isTimerRunning) {
    console.warn('Cannot add lap: timer not running');
    return { success: false, reason: 'timerNotRunning' };
  }
  
// Время круга = полное время от начала круга
  const lapTime = timestamp - state.lapStartTime;
  
  const validation = validateLapTime(lapTime);
  
  if (!validation.isValid) {
    return {
      success: false,
      validation: validation,
      lapTime: lapTime,
    };
  }
  
  const delta = state.lapCounter > 0 ? lapTime - state.averageLapTime : 0;
  
  const lapPauses = state.pauses
    .filter(p => p.lapNumber === state.lapCounter + 1)
    .reduce((sum, p) => sum + p.duration, 0);
  
  const lapData = {
    lap: state.lapCounter + 1,
    time: lapTime,
    totalTime: timestamp - state.startTime,
    pauseDuration: lapPauses,
    delta: delta,
    totalDistance: (state.lapCounter + 1) * state.lapDistance,
    totalAscent: (state.lapCounter + 1) * state.lapAscent,
  };
  
  state.laps.push(lapData);
  state.lapCounter++;
  
  const totalLapTime = state.averageLapTime * (state.lapCounter - 1) + lapTime;
  state.averageLapTime = totalLapTime / state.lapCounter;
  
  state.lapStartTime = timestamp;
  
  
  if (state.lapCounter >= state.goalLaps) {
    finishChallenge();
  }
  
  saveToLocalStorage();
  
  return { success: true, validation: { isValid: true } };
}



/**
 * Добавление короткого круга
 */
export function addLapForced(timestamp) {
  const lapTime = timestamp - state.lapStartTime;
  
  const delta = state.lapCounter > 0 ? lapTime - state.averageLapTime : 0;
  
  const lapPauses = state.pauses
    .filter(p => p.lapNumber === state.lapCounter + 1)
    .reduce((sum, p) => sum + p.duration, 0);
  
  const lapData = {
    lap: state.lapCounter + 1,
    time: lapTime,
    totalTime: timestamp - state.startTime,
    pauseDuration: lapPauses,
    delta: delta,
    totalDistance: (state.lapCounter + 1) * state.lapDistance,
    totalAscent: (state.lapCounter + 1) * state.lapAscent,
    isForced: true,
  };
  
  state.laps.push(lapData);
  state.lapCounter++;
  
  const totalLapTime = state.averageLapTime * (state.lapCounter - 1) + lapTime;
  state.averageLapTime = totalLapTime / state.lapCounter;
  
  state.lapStartTime = timestamp;


  saveToLocalStorage();
  return true;
}


/**
 * Валидация времени круга
 */
export function validateLapTime(lapTime) {
  if (state.lapCounter === 0) {
    return { isValid: true };
  }
  
  const avgTime = state.averageLapTime;
  
  if (avgTime === 0) {
    return { isValid: true };
  }

  const threshold = avgTime * 0.5;
  
  if (lapTime < threshold) {
    return {
      isValid: false,
      reason: 'tooShort',
      lapTime: lapTime,
      avgTime: avgTime,
      threshold: threshold,
    };
  }
  
  if (lapTime < 10000) {
    return {
      isValid: false,
      reason: 'tooShortAbsolute',
      lapTime: lapTime,
    };
  }
  
  return { isValid: true };
}



// ========== SETTINGS ==========

export function updateGoal(goal) {
  const parsed = parseInt(goal, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.warn('Invalid goal:', goal);
    return false;
  }
  state.goalLaps = parsed;
  saveToLocalStorage();
  return true;
}


export function updateLapSettings(dist, asc) {
  const parsedDist = parseFloat(dist);
  const parsedAsc = parseFloat(asc);
  
  if (!Number.isFinite(parsedDist) || parsedDist < 0) {
    console.warn('Invalid distance:', dist);
    return false;
  }
  if (!Number.isFinite(parsedAsc) || parsedAsc < 0) {
    console.warn('Invalid ascent:', asc);
    return false;
  }
  
  state.lapDistance = parsedDist;
  state.lapAscent = parsedAsc;
  saveToLocalStorage();
  return true;
}


export function updateReportData(user, track) {
  state.userName = String(user || '').trim();
  state.trackName = String(track || '').trim();
  saveToLocalStorage();
}



// ========== PERSISTENCE ==========


export function saveToLocalStorage() {
  try {
    const data = {
      userName: state.userName,
      trackName: state.trackName,
      goalLaps: state.goalLaps,
      lapDistance: state.lapDistance,
      lapAscent: state.lapAscent,
      isFinished: state.isFinished,
      laps: state.laps,
      pauses: state.pauses,
      lapCounter: state.lapCounter,
      averageLapTime: state.averageLapTime,
      totalPausedTime: state.totalPausedTime,
      startDateTime: state.startDateTime,
      finishDateTime: state.finishDateTime,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
}


export function restoreFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    const data = JSON.parse(saved);
    
    Object.assign(state, {
      userName: data.userName || '',
      trackName: data.trackName || '',
      goalLaps: data.goalLaps || 100,
      lapDistance: data.lapDistance || 10,
      lapAscent: data.lapAscent || 100,
      isFinished: data.isFinished || false,
      laps: data.laps || [],
      pauses: data.pauses || [],
      lapCounter: data.lapCounter || 0,
      averageLapTime: data.averageLapTime || 0,
      totalPausedTime: data.totalPausedTime || 0,
      startDateTime: data.startDateTime || null,
      finishDateTime: data.finishDateTime || null,
    });
    return true;
  } catch (e) {
    console.error('Failed to restore from localStorage:', e);
    return false;
  }
}


export function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
}


export function resetState(saveHistory = true) {
  if (saveHistory && state.laps.length > 0) {
    try {
      const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '[]');
      sessions.push({
        date: new Date().toISOString(),
        userName: state.userName,
        trackName: state.trackName,
        laps: state.laps,
        pauses: state.pauses,
        totalDistance: getTotalDistance(),
        totalAscent: getTotalAscent(),
        averageLapTime: state.averageLapTime,
      });
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save session history:', e);
    }
  }
  
  const { goalLaps, lapDistance, lapAscent, userName, trackName } = state;
  
  Object.assign(state, {
    userName,
    trackName,
    goalLaps,
    lapDistance,
    lapAscent,
    isTimerRunning: false,
    isPaused: false,
    isFinished: false,
    startTime: 0,
    lapStartTime: 0,
    pauseStartTime: 0,
    totalPausedTime: 0,
    laps: [],
    lapCounter: 0,
    averageLapTime: 0,
    pauses: [],
  });
  
  clearLocalStorage();
}



// ========== STATISTICS ==========

export function calculateStatistics() {
  if (state.laps.length === 0) {
    return null;
  }
  
// Круги
  const lapTimes = state.laps.map(lap => lap.time);
  const pauseDurations = state.pauses.map(p => p.duration);
  
  const maxLapTime = Math.max(...lapTimes);
  const minLapTime = Math.min(...lapTimes);
  const avgLapTime = state.averageLapTime;
  
  const variance = lapTimes.reduce((sum, time) => {
    return sum + Math.pow(time - avgLapTime, 2);
  }, 0) / lapTimes.length;
  const stdDeviation = Math.sqrt(variance); // СК отклонение
  
// Паузы
  const totalPauses = state.pauses.length;
  const totalPauseTime = state.totalPausedTime;
  const maxPauseTime = pauseDurations.length > 0 ? Math.max(...pauseDurations) : 0;
  const avgPausePerLap = state.lapCounter > 0 ? totalPauseTime / state.lapCounter : 0; // Ср вр паузы на круг
  
  const totalLapTime = lapTimes.reduce((sum, time) => sum + time, 0); // Вр кругов

  const totalAscent = getTotalAscent();
  const totalDistance = getTotalDistance();
  
// Градиент дистанции (м/км)
  const distanceGradient = totalDistance > 0 ? (totalAscent / totalDistance) : 0;
  
  const totalElapsed = state.laps[state.laps.length - 1]?.totalTime || 0;
  
  const totalHours = totalElapsed / 3600000;


// Средняя скорость подъёма (м/ч)
  const ascentSpeed = totalHours > 0 ? (totalAscent / totalHours) : 0;


  const totalMovTime = totalLapTime - totalPauseTime; // Общее время движения, без пауз.

  return {
    date: new Date().toISOString(),
    startDateTime: state.startDateTime,
    finishDateTime: state.finishDateTime,
// Заданные
    userName: state.userName,
    trackName: state.trackName,
    goalLaps: state.goalLaps,
    lapAscent: state.lapAscent,
    
    totalElapsedTime: totalElapsed, // = totalMovingTime?!
    
    totalMovTime: totalMovTime, // Время в движении
    
    totalMovingTime: totalLapTime, // Сумма времён кругов (с паузами)
    
    totalLaps: state.lapCounter, // Количество кругов
    totalDistance: getTotalDistance(), // Общая дистанция

    totalHours: totalHours,

    totalAscent: getTotalAscent(), // Общий подъем
    
    ascentSpeed: ascentSpeed, // Средняя скорость подъёма (м/ч)
    distanceGradient: distanceGradient, // Градиент дистанции (м/км)
    
// Круги
    maxLapTime: maxLapTime,
    minLapTime: minLapTime,
    avgLapTime: avgLapTime,
    stdDeviationLapTime: stdDeviation,
    laps: state.laps,
    
// Паузы
    totalPauses: totalPauses,
    totalPauseTime: totalPauseTime,
    maxPauseTime: maxPauseTime,
    avgPausePerLap: avgPausePerLap,
    pauses: state.pauses,
  };
}




export function exportSummaryText(stats) {
  if (!stats) return '';
  
  const date = new Date(stats.date).toLocaleString();
  const startTime = stats.startDateTime ? new Date(stats.startDateTime).toLocaleString() : 'N/A';
  const finishTime = stats.finishDateTime ? new Date(stats.finishDateTime).toLocaleString() : 'N/A';

  
/*

Средняя скорость подъёма:  м/ч
Градиент дистанции: ${stats.distanceGradient} м/км

Distance Gradient: ${stats.distanceGradient.toFixed(1)} m/km

*/
  
  
  return `

EVERESTING SESSION SUMMARY
ОТЧЕТ ЧЕЛЛЕНДЖА ЭВЕРЕСТИНГ
${i18n.t('sessionComplete')}

Date: ${date}
Start Time: ${startTime}
Finish Time: ${finishTime}
Athlete: ${stats.userName || 'N/A'}
Track: ${stats.trackName || 'N/A'}


GENERAL

Total Time: ${formatTime(stats.totalElapsedTime)}
Laps Completed: ${stats.totalLaps} / ${stats.goalLaps}
Total Distance: ${stats.totalDistance.toFixed(2)} km
Total Ascent: ${stats.totalAscent} m
Distance Gradient: ${stats.distanceGradient} m/km
Ascent Speed_r: ${Math.round(stats.ascentSpeed)} m/h

${state.lapCounter > 1 ? // Не показывать панель, если один круг.
`
LAP TIMES

Average: ${formatTime(stats.avgLapTime)}
Fastest: ${formatTime(stats.minLapTime)}
Slowest: ${formatTime(stats.maxLapTime)}
Std. Deviation: ${formatTime(stats.stdDeviationLapTime)}


` : ''}

${stats.totalPauses > 0 ? // Не показывать панель, если пауз нет.
`

PAUSES

Total Pauses: ${stats.totalPauses}
Total Pause Time: ${formatTime(stats.totalPauseTime)}
Max Pause: ${formatTime(stats.maxPauseTime)}
Avg Pause per Lap: ${formatTime(stats.avgPausePerLap)}
` : ''}

`.trim();
}

/**
 * Отчет csv
 */
export function exportFullCSV(stats) {
  if (!stats) return '';
  
  const date = new Date(stats.date).toLocaleString();
  const startTime = stats.startDateTime ? new Date(stats.startDateTime).toLocaleString() : '';
  const finishTime = stats.finishDateTime ? new Date(stats.finishDateTime).toLocaleString() : '';
  
  let csv = '';
  
  csv += `${i18n.t('sesRep')}\n`;
  csv += `${i18n.t('dateRep')},${date}\n`;
  
  csv += `\n`;
  csv += `\n`;
  csv += `${i18n.t('startTime')},${startTime}\n`;
  csv += `${i18n.t('finishTime')},${finishTime}\n`;
  csv += `${i18n.t('userNameLabel')},${stats.userName || '---'}\n`;
  csv += `${i18n.t('trackNameLabel')},${stats.trackName || '---'}\n`;
  
  csv += `\n`;
  csv += `\n`;
  csv += `${i18n.t('summ')}\n`; // Общие итоги
  csv += `\n`;
  csv += `${i18n.t('metVal')}\n`;
  csv += `--------,-----\n`;
  csv += `${i18n.t('totalTimeLabel')},${formatTime(stats.totalElapsedTime)}\n`; // Общее время, с паузами
  csv += `${i18n.t('totalMovTime')},${formatTime(stats.totalMovTime)}\n`; // Время в движении
csv += `\n`;
  
  csv += `${i18n.t('lapsCompleted')},${stats.totalLaps}\n`;
  csv += `${i18n.t('goalLapsLabel')},${stats.goalLaps}\n`;
  csv += `${i18n.t('totalDistanceLabel')},${stats.totalDistance.toFixed(2)} ${i18n.t('km')}\n`;
  csv += `${i18n.t('totalAscentLabel')},${stats.totalAscent} m\n`;
  csv += `${i18n.t('distanceGradient')},${stats.distanceGradient.toFixed(1)} ${i18n.t('mKm')}\n`;
  csv += `${i18n.t('ascentSpeed')},${Math.round(stats.ascentSpeed)}${i18n.t('mH')}\n`;
  
  csv += `\n`;
  if (state.lapCounter > 1) { // Круги
    csv += `${i18n.t('avgLapTime')},${formatTime(stats.avgLapTime)}\n`;
    csv += `${i18n.t('fastestLap')},${formatTime(stats.minLapTime)}\n`;
    csv += `${i18n.t('slowestLap')},${formatTime(stats.maxLapTime)}\n`;
    csv += `${i18n.t('stdDeviation')},${formatTime(stats.stdDeviationLapTime)}\n`;
  }
  csv += `\n`;
  if (stats.totalPauses > 0) { // Паузы
    csv += `${i18n.t('totalPauses')},${stats.totalPauses}\n`;
    csv += `${i18n.t('totalPauseTime')},${formatTime(stats.totalPauseTime)}\n`;
    csv += `${i18n.t('maxPauseTime')},${formatTime(stats.maxPauseTime)}\n`;
    csv += `${i18n.t('avgPausePerLap')},${formatTime(stats.avgPausePerLap)}\n`;
  }
  
  csv += `\n`;
  csv += `\n`;
  csv += `${i18n.t('laps')}\n`;
  csv += `\n`;
  
  csv += `${i18n.t('tableLaps')}\n`; // Шапка таблицы кругов
  csv += `${i18n.t('delta')}\n`;
  csv += `${i18n.t('puraLT')}\n`;
  csv += `---------------\n`;

  csv += `\n`;
  stats.laps.forEach(lap => { // Данные таблицы кругов
    csv += `${lap.lap},`; // Номер круга
    csv += `${formatTime(lap.totalTime)},`; // Общее время круга
    csv += `${formatTime(lap.time)},`; // Время круга
    csv += `${lap.delta >= 0 ? '+' : ''}${formatTime(Math.abs(lap.delta))},`; // Абсолютное отклонение
    csv += `${formatTime(lap.pauseDuration)},`; // Длительность паузы
    csv += `${formatTime(lap.time - lap.pauseDuration)},`; // Время круга без паузы
    
    
    
    csv += `${Math.round(stats.lapAscent * 3600000 / lap.time)}\n`; // Скорость подъема м/ч
    
  });
  
  return csv;
}


export function downloadSummary() {
  const stats = calculateStatistics();
  if (!stats) return;
  
  const text = exportSummaryText(stats);

  const filename = generateFilename('everesting_summary', 'txt');
  
  downloadFile('\uFEFF' + text, filename, 'text/plain;charset=utf-8');
}


export function downloadFullReport() {
  const stats = calculateStatistics();
  if (!stats) return;
  
  const csv = exportFullCSV(stats);
  
  const filename = generateFilename('everesting_full', 'csv');
  
  downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}


// Генерация имени файла с датой и временем
function generateFilename(prefix, extension) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // 2025-01-15
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // 14-30-25
  const track = state.trackName ? `_${state.trackName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}` : '';
  
  return `${prefix}${track}_${date}_${time}.${extension}`;
}


function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}


