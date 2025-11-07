// audio.js v1.1
// Возвращает точный момент начала 4-го сигнала

const AUDIO_ENABLED_KEY = 'audio_enabled';


class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = this.loadEnabledState();
    this.initAudioContext();
  }
  
  
  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      this.enabled = false;
    }
  }
  
  
  async resumeContext() {
// Создать контекст если ещё нет
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
  }
  
  
  async playTone(frequency, duration, volume = 0.3) {
    if (!this.enabled || !this.audioContext) {
      return Promise.resolve();
    }
    
    await this.resumeContext();
    
    return new Promise((resolve) => {
      const currentTime = this.audioContext.currentTime;
      
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, currentTime);
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(volume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);
      
      oscillator.onended = () => resolve();
    });
  }
  
  /**
   * Обратный отсчёт для старта: 3 коротких + 1 длинный.
   * ВОЗВРАЩАЕТ timestamp начала 4-го сигнала.
   * @returns {Promise<number>} performance.now() момента начала 4-го сигнала
   */
  async playStartCountdown() {
    if (!this.enabled) {
      // Если звук выключен, всё равно вернуть корректный timestamp
      await this.delay(3000); // 3 секунды задержка
      return performance.now();
    }
    
    const BEEP_FREQ = 800;
    const START_FREQ = 1200;
    const BEEP_DURATION = 0.15;
    const START_DURATION = 0.5;
    const INTERVAL = 1000;
    
    // 1-й сигнал
    await this.playTone(BEEP_FREQ, BEEP_DURATION);
    await this.delay(INTERVAL - BEEP_DURATION * 1000);
    
    // 2-й сигнал
    await this.playTone(BEEP_FREQ, BEEP_DURATION);
    await this.delay(INTERVAL - BEEP_DURATION * 1000);
    
    // 3-й сигнал
    await this.playTone(BEEP_FREQ, BEEP_DURATION);
    await this.delay(INTERVAL - BEEP_DURATION * 1000);
    
    // ВАЖНО: Зафиксировать время ПЕРЕД запуском 4-го сигнала
    const startTimestamp = performance.now();
    
    // 4-й сигнал (не ждём окончания)
    this.playTone(START_FREQ, START_DURATION);
    
    // Вернуть точный момент начала
    return startTimestamp;
  }
  
  
  async playClick() {
    if (!this.enabled) return;
    await this.playTone(600, 0.05, 0.2);
  }
  
  
  async playLap() {
    if (!this.enabled) return;
    await this.playTone(800, 0.08, 0.25);
    await this.delay(50);
    await this.playTone(1000, 0.08, 0.25);
  }
  
  
  async playPause() {
    if (!this.enabled) return;
    await this.playTone(500, 0.2, 0.2);
  }
  
  
  async playResume() {
    if (!this.enabled) return;
    await this.playTone(700, 0.15, 0.2);
  }
  
  
  async playFinish() {
    if (!this.enabled) return;
    await this.playTone(600, 0.1, 0.3);
    await this.delay(50);
    await this.playTone(800, 0.1, 0.3);
    await this.delay(50);
    await this.playTone(1000, 0.3, 0.3);
  }
  
  
  async playReset() {
    if (!this.enabled) return;
    await this.playTone(800, 0.1, 0.2);
    await this.delay(50);
    await this.playTone(600, 0.15, 0.2);
  }
  
  
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem(AUDIO_ENABLED_KEY, enabled ? 'true' : 'false');
  }
  
  
  isEnabled() {
    return this.enabled;
  }
  
  loadEnabledState() {
    const saved = localStorage.getItem(AUDIO_ENABLED_KEY);
    return saved !== 'false';
  }
  
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


const audioManager = new AudioManager();


export default audioManager;