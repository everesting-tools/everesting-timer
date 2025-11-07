// i18n.js v2.0
// Система интернационализации с поддержкой aria-атрибутов

const STORAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['en', 'ru'];
const DEFAULT_LANGUAGE = 'en';

const translations = {
  en: {
// Navigation
    settings: 'Settings',
    instructions: 'Instructions',
    table: 'Table',
    
// Actions
    start: 'Start',
    stop: 'Stop',
    finish: 'Finish',
    lap: 'Lap',
    reset: 'Reset',
    pause: 'Pause',
    resume: 'Resume',
    
// Labels
    startTime: 'Start Time',
    finishTime: 'Finish Time',

    totalTimeLabel: 'Total Time:',
    totalDistanceLabel: 'Total Distance:',
    totalAscentLabel: 'Total Ascent:',
    avgLapTimeLabel: 'Average Lap Time:',
    goalLapsLabel: 'Goal (laps):',
    distancePerLap: 'Distance per Lap (km):',
    ascentPerLap: 'Ascent per Lap (m):',
    userNameLabel: 'Name:',
    trackNameLabel: 'Track:',
    
// Table
    laps: 'Laps',
    lapColumn: 'Lap',
    lapTimeColumn: 'Lap Time',
    totalTimeColumn: 'Total Time',
    pausesColumn: 'Pause Time',
    noLapsYet: 'No laps yet.',
    
// Settings
    theme: 'Theme:',
    light: 'Light',
    dark: 'Dark',
    language: 'Language:',
    
// Instructions
    instr_title: 'Instructions',
    instructionFile: './INSTRUCTIONS-EN.md',
    
// Messages
    appTitle: 'Everesting Stopwatch',
    confirmReset: 'Reset all data?',
    challengeFinished: 'Challenge finished!',
    sessionRestored: 'Previous session found. Continue?',
    errorLoading: 'Failed to load',
    confirmReset: 'Reset all data?',
    
// Export
    exportCSV: 'Export CSV',
    exportJSON: 'Export JSON',
    
    
// Звук
    audioLabel: 'Sound:',
    on: 'On',
    off: 'Off',
    
// Итоги
    summ: 'SUMMARY',
    metVal: 'Metric,Value',
    sessionComplete: 'Session Complete!',
    date: 'Date',
    generalStats: 'General',
    totalTimeWithPauses: 'Total Time (with pauses)',
    movingTime: 'Moving Time',
    totalMovTime: 'Moving Time:',
    lapsCompleted: 'Laps Completed',
    lapStats: 'Lap Times:',
    fastestLap: 'Fastest Lap:',
    slowestLap: 'Slowest Lap:',
    stdDeviation: 'Std. Deviation',
    avgLapTime: 'Avg Lap Time',

    pauseStats: 'Pauses:',
    totalPauses: 'Total Pauses:',
    totalPauseTime: 'Total Pause Time:',
    maxPause: 'Max Pause:',
    avgPausePerLap: 'Avg Pause per Lap:',
    
    distanceGradient: 'Distance Gradient:',
    ascentSpeed: 'Ascent Speed:',
    totalTimeLabel: 'Total Time:',
    startTime: 'Start Time:',
    finishTime: 'Finish Time:',
    
    downloadSummary: 'Download Summary (TXT)',
    downloadFullReport: 'Download Full Report (CSV)',
    viewLapsTable: 'View Laps Table',
    backToSummary: 'Back to Summary',
    confirmDownload: 'Save report to device?',
    summaryHint: 'Tap "Table" button to view laps',
    
    
// Проверки
    yes: 'Yes',
    no: 'No',
    lapTooShortWarning: 'This lap ({lapTime}) is much shorter than average ({avgTime}). Confirm?',
    lapTooShortAbsoluteWarning: 'This lap ({lapTime}) is too short. Confirm?',
  },


// Отчёт
    sesRep: 'Everesting Session Report',
    dateRep: 'Date:',
    mH: 'm/h',
    mKm: 'm/km',
    km: 'km',
    tableLaps: 'Lap,Total Time,Lap Time,Delta,Pause Duration,Pura Lap Time',

  





  ru: {
// Навигация
    settings: 'Настройки',
    instructions: 'Инструкция',
    table: 'Таблица',
    
// Действия
    start: 'Старт',
    stop: 'Стоп',
    finish: 'Финиш',
    lap: 'Круг',
    reset: 'Сброс',
    pause: 'Пауза',
    resume: 'Продолжить',
    
// Метки
    startTime: 'Время старта:',
    finishTime: 'Время финиша:',

    totalTimeLabel: 'Общее время:',
    totalDistanceLabel: 'Пройденная дистанция:',
    totalAscentLabel: 'Пройденный подъем:',
    
    goalLapsLabel: 'Цель по кругам:',
    distancePerLap: 'Дистанция круга (км):',
    ascentPerLap: 'Подъем круга (м):',
    userNameLabel: 'Имя:',
    trackNameLabel: 'Трасса:',
    
// Таблица
    laps: 'Круги',
    lapColumn: 'Круг',
    lapTimeColumn: 'Время круга',
    totalTimeColumn: 'Общее время',
    pausesColumn: 'Время пауз',
    noLapsYet: 'Кругов еще нет.',
    
// Настройки
    theme: 'Тема:',
    light: 'Светлая',
    dark: 'Темная',
    language: 'Язык:',
    
// Инструкция
    instr_title: 'Инструкция',
    instructionFile: './INSTRUCTIONS-RU.md',
    
// Сообщения
    appTitle: 'Секундомер для Эверестинга',
    confirmReset: 'Сбросить все данные?',
    challengeFinished: 'Челлендж завершён!',
    sessionRestored: 'Найдена сохранённая сессия. Продолжить?',
    errorLoading: 'Не удалось загрузить',
    confirmReset: 'Сбросить все данные?',
    
// Экспорт
    exportCSV: 'Экспорт CSV',
    exportJSON: 'Экспорт JSON',
    
// Звук
    audioLabel: 'Звук:',
    on: 'Вкл.',
    off: 'Выкл.',
    
    
// Итоги
    summ: 'Общие итоги',
    metVal: 'Параметр, Значение',
    sessionComplete: 'Сессия завершена!',
    date: 'Дата',
    generalStats: 'Общее',
    totalTimeWithPauses: 'Общее время (с паузами):',
    movingTime: 'Время движения:',
    totalMovTime: 'Время в движении:',
    lapsCompleted: 'Кругов пройдено:',
    lapStats: 'Времена кругов',
    fastestLap: 'Самый быстрый круг:',
    slowestLap: 'Самый медленный круг:',
    stdDeviation: 'Стандартное отклонение:',
    avgLapTime: 'Среднее время круга:',
    avgLapTimeLabel: 'Среднее время круга:',

    pauseStats: 'Паузы',
    totalPauses: 'Всего пауз:',
    totalPauseTime: 'Общее время пауз:',
    maxPause: 'Максимальная пауза:',
    avgPausePerLap: 'Время паузы в расчете на один круг:',

    distanceGradient: 'Градиент дистанции:',
    ascentSpeed: 'Скорость подъёма:',
    totalTimeLabel: 'Общее время:',
    startTime: 'Время начала:',
    finishTime: 'Время окончания:',
    
    downloadSummary: 'Скачать итоги (TXT)',
    downloadFullReport: 'Скачать полный отчёт (CSV)',
    viewLapsTable: 'Посмотреть таблицу кругов',
    backToSummary: 'Назад к итогам',
    confirmDownload: 'Сохранить отчёт на устройство?',
    summaryHint: 'Нажмите "Таблица" для просмотра кругов',
    
    
// Проверки
    yes: 'Да',
    no: 'Нет',
    lapTooShortWarning: 'Этот круг ({lapTime}) намного короче среднего ({avgTime}). Подтвердить?',
    lapTooShortAbsoluteWarning: 'Этот круг ({lapTime}) слишком короткий. Подтвердить?',

// Отчёт
    sesRep: 'Отчет челленджа эверестинг',
    dateRep: 'Дата отчёта:',
    mH: 'м/час',
    mKm: 'м/км',
    km: 'км',
    tableLaps: 'Номер круга,Общее время,Время круга,Дельта*,Длительность паузы,Чистое время круга**, Скорость подъёма (м/ч)',
   delta: '* Дельта - разница между реальным и средним временем круга.',
    puraLT: '** Чистое время круга - полное время круга за вычетом времени пауз, если таковые на этом круге были.',





  }
};

// Форматтеры чисел
const numberFormatters = {
  decimal: {
    en: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ru: new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
  integer: {
    en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
    ru: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }),
  },
};

let cachedElements = null;
let currentLanguage = DEFAULT_LANGUAGE;



// ========== PUBLIC API ==========

/**
 * Translates a key.
 * @param {string} key - Translation key
 * @returns {string} Translated string
 */
export function t(key) {
  const translation = translations[currentLanguage]?.[key];
  
  if (translation === undefined) {
    console.warn(`Missing translation: '${key}' (${currentLanguage})`);
    return key;
  }
  
  return translation;
}


/**
 * Alias for backward compatibility.
 */
export const getTranslation = t;


/**
 * Formats a number according to current locale.
 * @param {number} value - Number to format
 * @param {'decimal'|'integer'} [type='decimal'] - Format type
 * @returns {string} Formatted number
 */
export function formatNumber(value, type = 'decimal') {
  const formatter = numberFormatters[type]?.[currentLanguage];
  return formatter ? formatter.format(value) : String(value);
}


/**
 * Sets the current language and updates the UI.
 * @param {string} lang - Language code
 * @returns {boolean} True if successful
 */
export function setLanguage(lang) {
  if (!translations[lang]) {
    console.warn(`Unsupported language: ${lang}`);
    return false;
  }
  
  currentLanguage = lang;
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem(STORAGE_KEY, lang);
  translatePage();
  
  return true;
}


/**
 * Translates all elements with data-i18n attributes.
 */
export function translatePage() {
  const elements = getCachedElements();
  
  
  // Translate text content
  elements.text.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    
    // Безопасная замена (только если нет вложенных элементов)
    if (element.children.length === 0) {
      element.textContent = translation;
    }
  });
  
  
  // Translate aria-label
  elements.ariaLabel.forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label');
    element.setAttribute('aria-label', t(key));
  });
  
  
  // Translate placeholder
  elements.placeholder.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.setAttribute('placeholder', t(key));
  });
  
  
  // Translate title
  elements.title.forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.setAttribute('title', t(key));
  });
}


/**
 * Initializes i18n system with saved/detected language.
 */
export function initLanguage() {
  const savedLang = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language.split('-')[0];
  const detectedLang = savedLang || (translations[browserLang] ? browserLang : DEFAULT_LANGUAGE);
  
  setLanguage(detectedLang);
  
  // Sync UI toggle
  const langToggle = document.querySelector('#langToggle');
  if (langToggle) {
    langToggle.checked = detectedLang === 'ru';
  }
}


/**
 * Gets the current instruction file path.
 */
export function getCurrentInstructionFile() {
  return t('instructionFile');
}


/**
 * Gets current language code.
 */
export function getCurrentLanguage() {
  return currentLanguage;
}


/**
 * Resets element cache.
 */
export function resetCache() {
  cachedElements = null;
}



// ========== PRIVATE ==========

function getCachedElements() {
  if (!cachedElements) {
    cachedElements = {
      text: document.querySelectorAll('[data-i18n]'),
      ariaLabel: document.querySelectorAll('[data-i18n-aria-label]'),
      placeholder: document.querySelectorAll('[data-i18n-placeholder]'),
      title: document.querySelectorAll('[data-i18n-title]'),
    };
  }
  return cachedElements;
}

