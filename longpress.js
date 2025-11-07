// longpress.js v1.4
// Исправлено: callback вызывается ТОЛЬКО после полного long-press

const LONG_PRESS_DURATION = 2000;

class LongPressManager {
  constructor() {
    this.activePress = null;
    this.progressInterval = null;
    this.audioManager = null;
  }
  
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }
  
  register(element, onTrigger, options = {}) {
    if (!element) return;
    
    const {
      showProgress = true,
      progressColor = '#4a90e2',
      hapticFeedback = true,
    } = options;
    
    let pressStartTime = 0;
    let progressElement = null;
    let isCompleted = false;
    
    const startPress = async (e) => {
      if (this.activePress) return;
      
      e.preventDefault();
      e.stopPropagation(); // ВАЖНО: предотвратить всплытие
      
      if (this.audioManager) {
        try {
          await this.audioManager.resumeContext();
        } catch (err) {
          console.warn('Failed to init audio:', err);
        }
      }
      
      pressStartTime = performance.now();
      isCompleted = false;
      
      this.activePress = {
        element,
        startTime: pressStartTime,
      };
      
      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      if (showProgress) {
        progressElement = createProgressRing(element, progressColor);
      }
      
      let elapsed = 0;
      this.progressInterval = setInterval(() => {
        elapsed = performance.now() - pressStartTime;
        const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
        
        if (progressElement) {
          updateProgressRing(progressElement, progress);
        }
        
        if (elapsed >= LONG_PRESS_DURATION && !isCompleted) {
          completePress();
        }
      }, 16);
    };
    
    const cancelPress = (e) => {
      if (!this.activePress) return;
      
// ВАЖНО: если отпустили раньше времени - НЕ вызывать callback
      const elapsed = performance.now() - this.activePress.startTime;
      
      if (elapsed < LONG_PRESS_DURATION && !isCompleted) {
// Отпущено раньше срока - отменить
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      clearInterval(this.progressInterval);
      this.progressInterval = null;
      
      if (progressElement && progressElement.overlay) {
        progressElement.overlay.remove();
        progressElement = null;
      }
      
      this.activePress = null;
    };
    
    const completePress = () => {
      if (isCompleted) return;
      isCompleted = true;
      
      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
      
      const timestamp = pressStartTime;
      
      cancelPress();
      
// ВАЖНО: вызвать callback ТОЛЬКО если прошло полное время
      onTrigger(timestamp);
    };
    
// ВАЖНО: использовать capture для перехвата до других обработчиков
    element.addEventListener('mousedown', startPress, { capture: true });
    element.addEventListener('touchstart', startPress, { passive: false, capture: true });
    
    element.addEventListener('mouseup', cancelPress, { capture: true });
    element.addEventListener('mouseleave', cancelPress, { capture: true });
    element.addEventListener('touchend', cancelPress, { capture: true });
    element.addEventListener('touchcancel', cancelPress, { capture: true });
    
// Блокировать клик, если был long-press
    element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { capture: true });
    
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  cancel() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.activePress = null;
  }
}


function createProgressRing(parentElement, color) {
  const overlay = document.createElement('div');
  overlay.className = 'longpress-overlay';
  
  if (color.includes('90e2')) {
    overlay.setAttribute('data-color', 'blue');
  } else if (color.includes('af50')) {
    overlay.setAttribute('data-color', 'green');
  } else if (color.includes('f44')) {
    overlay.setAttribute('data-color', 'red');
  }
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'longpress-progress');
  svg.setAttribute('viewBox', '0 0 100 100');
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', '42');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', color);
  circle.setAttribute('stroke-width', '14');
  circle.setAttribute('stroke-dasharray', '264');
  circle.setAttribute('stroke-dashoffset', '264');
  circle.setAttribute('stroke-linecap', 'round');
  circle.setAttribute('transform', 'rotate(-90 50 50)');
  
  svg.appendChild(circle);
  overlay.appendChild(svg);
  
  positionOverlay(overlay, parentElement);
  
  document.body.appendChild(overlay);
  
  return { overlay, circle };
}


function positionOverlay(overlay, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  
  const left = rect.left - 120;
  const top = rect.top + rect.height / 2 - 50;
  
  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
  
  if (left < 10) {
    overlay.style.left = `${rect.left + rect.width / 2 - 50}px`;
    overlay.style.top = `${rect.top - 110}px`;
  }
}


function updateProgressRing(progressElement, progress) {
  if (!progressElement || !progressElement.circle) return;
  
  const { circle } = progressElement;
  const circumference = 264;
  const offset = circumference * (1 - progress);
  circle.setAttribute('stroke-dashoffset', offset);
}


const longPressManager = new LongPressManager();


export default longPressManager;
