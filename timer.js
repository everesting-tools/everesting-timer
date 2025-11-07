// timer.js v2.0
// Высокоточный таймер на основе performance.now() и requestAnimationFrame
// Обновление UI: каждые 100ms (для десятых долей секунды)


/**
 * Precision timer using performance.now() and requestAnimationFrame.
 */
class Timer {
  constructor(options = {}) {
    this.uiUpdateInterval = options.uiUpdateInterval || 100; // 100ms для десятых долей
    this.rafId = null;
    this.lastUIUpdate = 0;
    this.onTick = null;
    this.onError = null;
  }
  
  
  /**
   * Starts the timer.
   */
  start() {
    if (this.rafId !== null) {
      console.warn('Timer already running');
      return false;
    }
    
    this.lastUIUpdate = performance.now();
    this._tick();
    return true;
  }
  
  
  /**
   * Internal tick function.
   * @private
   */
  _tick() {
    try {
      const now = performance.now();
      
      // Обновлять UI только раз в N миллисекунд
      if (now - this.lastUIUpdate >= this.uiUpdateInterval) {
        if (this.onTick) {
          this.onTick();
        }
        this.lastUIUpdate = now;
      }
      
      this.rafId = requestAnimationFrame(() => this._tick());
      
    } catch (error) {
      console.error('Timer tick error:', error);
      this.stop();
      if (this.onError) {
        this.onError(error);
      }
    }
  }
  
  
  /**
   * Stops the timer.
   */
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    return true;
  }
  
  
  /**
   * Checks if timer is running.
   */
  isRunning() {
    return this.rafId !== null;
  }
  
  
  /**
   * Sets the tick callback.
   * @param {Function} callback
   */
  setOnTick(callback) {
    this.onTick = callback;
  }
  
  
  /**
   * Sets the error callback.
   * @param {Function} callback
   */
  setOnError(callback) {
    this.onError = callback;
  }
}


export default Timer;

