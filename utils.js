// utils.js v2.0
// Формат времени: HH:MM:SS (целые секунды)
// Внутренняя точность: 100ms (десятые доли)


/**
 * Formats milliseconds as time string HH:MM:SS or MM:SS.
 * @param {number} milliseconds - Time in milliseconds
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.alwaysShowHours=false] - Always show hours even if 0
 * @returns {string} Formatted time
 * @example
 * formatTime(5000)      // "00:05"
 * formatTime(3665000)   // "01:01:05"
 * formatTime(90005000)  // "25:00:05"
 */
export function formatTime(milliseconds, options = {}) {
  const { alwaysShowHours = false } = options;
  
// Validation
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`Invalid time value: ${milliseconds}`);
    }
    return alwaysShowHours ? '00:00:00' : '00:00';
  }
  
// Round to nearest second
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0 || alwaysShowHours) {
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
  }
  
  return `${pad(minutes, 2)}:${pad(seconds, 2)}`;
}


/**
 * Parses time string to milliseconds.
 * @param {string} timeString - Time in format "MM:SS" or "HH:MM:SS"
 * @returns {number} Milliseconds
 * @throws {Error} If format is invalid
 */
export function parseTime(timeString) {
  if (typeof timeString !== 'string') {
    throw new Error(`Invalid time string: ${timeString}`);
  }
  
  const parts = timeString.split(':').map(s => s.trim());
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid time format: ${timeString}. Expected "MM:SS" or "HH:MM:SS"`);
  }
  
  let hours = 0, minutes = 0, seconds = 0;
  
  try {
    if (parts.length === 3) {
      [hours, minutes, seconds] = parts.map(Number);
    } else {
      [minutes, seconds] = parts.map(Number);
    }
    
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      throw new Error('Non-numeric values');
    }
    
    if (hours < 0 || minutes < 0 || seconds < 0 || minutes >= 60 || seconds >= 60) {
      throw new Error('Invalid time components');
    }
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
    
  } catch (e) {
    throw new Error(`Failed to parse time: ${timeString} (${e.message})`);
  }
}


/**
 * Formats distance with locale-aware number formatting.
 * @param {number} kilometers - Distance in kilometers
 * @param {string} [locale='en-US'] - Locale code
 * @returns {string} Formatted distance
 */
export function formatDistance(kilometers, locale = 'en-US') {
  if (!Number.isFinite(kilometers)) return '0.00';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kilometers);
}


/**
 * Formats elevation/ascent.
 * @param {number} meters - Elevation in meters
 * @param {string} [locale='en-US'] - Locale code
 * @returns {string} Formatted elevation
 */
export function formatAscent(meters, locale = 'en-US') {
  if (!Number.isFinite(meters)) return '0';
  
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(meters));
}


/**
 * Converts milliseconds to human-readable duration.
 * @param {number} milliseconds - Duration in milliseconds
 * @param {string} [locale='en-US'] - Locale code
 * @returns {string} Human-readable duration
 */
export function formatDuration(milliseconds, locale = 'en-US') {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return locale === 'ru-RU' ? '0 мин' : '0m';
  }
  
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  
  if (locale === 'ru-RU') {
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  }
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}


/**
 * Calculates pace (min/km).
 * @param {number} milliseconds - Time in milliseconds
 * @param {number} kilometers - Distance in kilometers
 * @returns {string} Pace in format "MM:SS /km"
 */
export function formatPace(milliseconds, kilometers) {
  if (!Number.isFinite(milliseconds) || !Number.isFinite(kilometers) || kilometers <= 0) {
    return '--:-- /km';
  }
  
  const paceMs = milliseconds / kilometers;
  const minutes = Math.floor(paceMs / 60000);
  const seconds = Math.floor((paceMs % 60000) / 1000);
  
  return `${pad(minutes, 2)}:${pad(seconds, 2)} /km`;
}


/**
 * Calculates speed (km/h).
 * @param {number} milliseconds - Time in milliseconds
 * @param {number} kilometers - Distance in kilometers
 * @returns {number} Speed in km/h
 */
export function calculateSpeed(milliseconds, kilometers) {
  if (!Number.isFinite(milliseconds) || !Number.isFinite(kilometers) || milliseconds <= 0) {
    return 0;
  }
  
  const hours = milliseconds / 3600000;
  return kilometers / hours;
}


/**
 * Debounces a function.
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}


/**
 * Throttles a function.
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum interval in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


/**
 * Clamps a value between min and max.
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}



// ========== PRIVATE HELPERS ==========

/**
 * Pads a number with leading zeros.
 * @private
 */
function pad(num, width) {
  return String(num).padStart(width, '0');
}

