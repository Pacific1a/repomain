// Simple Aviator game logic
// States: waiting -> flying

(function () {
  const gameEl = document.querySelector('.aviator .game');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const waitingRoot = document.getElementById('waitingRoot');
  const waitingPanel = document.getElementById('waitingPanel');
  const waitingText = document.getElementById('waitingText');
  const waitingBar = document.getElementById('waitingBar');
  const aviatorSplash = document.getElementById('aviatorSplash');

  const planeWrapper = document.getElementById('planeWrapper');
  const planeImg = document.getElementById('planeImg');

  const multiplierLayer = document.getElementById('multiplierLayer');
  const currentMultiplier = document.getElementById('currentMultiplier');
  const crashOverlay = document.getElementById('crashOverlay');

  // No reload lock: game always runs its normal cycle
  let gameLocked = false;

  // --- Persistence helpers ---
  const STORAGE_KEY = 'aviatorGameStateV1';
  function saveState(extra = {}) {
    try {
      const data = {
        state,
        // Epoch timestamps to allow cross-reload continuation
        waitStartEpoch: waitStartEpoch,
        flightStartEpoch: flightStartEpoch,
        hoverStartEpoch: hoverStartEpoch,
        crashStartEpoch: crashStartEpoch,
        // Gameplay values
        crashed,
        crashAt,
        crashValue,
        crashX,
        hoverX,
        centerLocked,
        // include any extras
        ...extra,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return null;
      return JSON.parse(s);
    } catch (e) { return null; }
  }

  // Create an up-to-date snapshot of timers and save to storage
  function snapshotAndSave() {
    try {
      // Recompute epoch anchors from current perf timers
      const nowEpoch = Date.now();
      // Update epoch baselines based on current state
      if (state === 'waiting') {
        // waitStart = perf time when waiting began
        const waitedMs = Math.max(0, performance.now() - waitStart);
        waitStartEpoch = nowEpoch - waitedMs;
      } else if (state === 'flying') {
        const flownMs = Math.max(0, performance.now() - flightStart);
        flightStartEpoch = nowEpoch - flownMs;
      } else if (state === 'hovering') {
        const flownMs = Math.max(0, performance.now() - flightStart);
        const hovMs = Math.max(0, performance.now() - hoverStart);
        flightStartEpoch = nowEpoch - flownMs;
        hoverStartEpoch = nowEpoch - hovMs;
      } else if (state === 'crashing') {
        const flownMs = (flightStart ? Math.max(0, performance.now() - flightStart) : 0);
        const crashMs = (crashStart ? Math.max(0, performance.now() - crashStart) : 0);
        if (flightStart) flightStartEpoch = nowEpoch - flownMs;
        if (crashStart) crashStartEpoch = nowEpoch - crashMs;
      }
      saveState();
    } catch (e) { /* ignore */ }
  }

  // Epoch mirrors for timers (Date.now-based); perf timers will be aligned
  let waitStartEpoch = Date.now();
  let flightStartEpoch = 0;
  let hoverStartEpoch = 0;
  let crashStartEpoch = 0;

  // Resize canvas to fit parent
  function resizeCanvas() {
    const rect = gameEl.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
  }

  function slopeAngleAtX(x) {
    // Angle of the tangent to the curve at x (screen coordinates, y downwards)
    const w = Math.max(1, canvas.width - leftMargin - rightMargin);
    const xn = Math.max(0, Math.min(1, x / w));
    const A = canvas.height * 0.62;
    const p = 2.2;
    // yTop = H - (base + A*xn^p) => dy/dx = -A*p/w * xn^(p-1)
    const dydx = - (A * p / w) * Math.pow(Math.max(1e-6, xn), p - 1);
    return Math.atan2(dydx, 1); // atan(dy/dx)
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Hide plane before the game starts (during waiting)
  planeWrapper.style.opacity = '0';

  // Waiting phase (slower)
  const WAIT_SECONDS = 5.0; // full red bar then empties to 0
  let state = 'waiting';
  let waitStart = performance.now();

  // If no saved state exists (first ever launch), persist initial waiting epoch
  try {
    const existing = loadState();
    if (!existing) {
      waitStartEpoch = Date.now();
      saveState();
    }
  } catch (e) {}

  // Flight parameters
  let flightStart = 0;
  let t = 0; // seconds since flight start
  
  // Параметры полета
  const speedX = 70; // px per second horizontally
  const baseYFromBottom = 40; // starting bottom padding
  const tailLength = 220; // pixels of visible trail length
  const leftMargin = 10; // start near left edge
  const minTop = 85; // keep curve/plane well away from the top edge
  const rightMargin = 20; // keep inside right edge
  const oscAmp = 0; // отключаем осцилляцию по вертикали
  const oscFreq = 0.45; // Hz oscillation frequency
  // Hover bobbing (active only in 'hovering' state)
  const hoverAmp = 10; // px amplitude for whole-curve bobbing during hovering
  const hoverFreq = 0.25; // Hz for whole-curve bobbing
  const planeAboveOffset = 8; // px to keep plane slightly above the curve
  
  // flight phases
  let centerLocked = false;
  
  // Параметры кривой линии и потопления
  const scale = 0.0009; // vertical growth для кривой
  const sinkStartDistance = 100; // расстояние от головы, после которого начинается потопление
  const sinkRate = 30; // скорость потопления в px/s
  const maxSink = 150; // максимальное потопление
  const riseRate = 20; // скорость поднятия после потопления
  let sinkAmount = 0;
  let lastNow = performance.now();

  // Crash settings
  let crashAt = null; // multiplier value where we crash this round
  let crashed = false;
  let crashValue = null;
  let crashStart = 0;
  let crashX = 0; // virtual X at crash moment
  let crashY = 0; // virtual Y at crash moment
  let crashTimeoutId = null;
  // Hovering (hold at max curve)
  let hoverX = null; // frozen virtual X when we stop extending the curve
  let hoverStart = 0;
  // Crash directional flight
  let crashStartScreenX = 0;
  let crashStartYTop = 0;
  let crashAngleRad = 0;
  let crashPrevScreenX = null;
  let crashPrevY = null;
  let currentAngleRad = 0; // plane's current visual angle (radians)

  function updateWaiting(now) {
    // Compute using epoch so it survives reloads
    const elapsed = Math.max(0, (Date.now() - waitStartEpoch) / 1000);
    const remain = Math.max(0, WAIT_SECONDS - elapsed);
    const pct = Math.max(0, Math.min(1, 1 - elapsed / WAIT_SECONDS));

    // No lock: allow normal flow

    // Set bar width proportionally inside its 170px container (CSS sets full width). We'll transform by scaleX.
    waitingBar.style.transformOrigin = 'left center';
    waitingBar.style.transform = `scaleX(${pct})`;

    // Optional countdown text
    const secondsLeft = Math.ceil(remain);
    waitingText.textContent = secondsLeft > 0 ? `Waiting... ${secondsLeft}` : 'Starting...';
    // During waiting, hide multiplier
    multiplierLayer.classList.add('hidden');

    // Throttled persist so reload continues the same countdown
    if (!updateWaiting._lastSave || (Date.now() - updateWaiting._lastSave) > 250) {
      try { saveState(); } catch (e) {}
      updateWaiting._lastSave = Date.now();
    }

    if (elapsed >= WAIT_SECONDS) {
      startFlight();
    }
  }

  function startFlight() {
    state = 'flying';
    flightStartEpoch = Date.now();
    flightStart = performance.now();
    crashed = false;
    crashAt = pickCrashMultiplier();
    crashValue = null;
    centerLocked = false;
    hoverX = null;
    hoverStartEpoch = 0;
    hoverStart = 0;
    sinkAmount = 0;
    lastNow = performance.now();
    // Hide splash and waiting panel
    aviatorSplash.classList.add('hidden');
    waitingPanel.classList.add('hidden');
    multiplierLayer.classList.remove('hidden');
    // Hide crash overlay when starting a new flight
    if (crashOverlay) crashOverlay.classList.remove('show');
    // Show plane when the game starts
    planeWrapper.style.opacity = '1';
    // Keep plane visible and start at initial position
    // Reset drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentMultiplier.classList.remove('crashed');
    currentMultiplier.textContent = '1.00x';
    saveState();
  }

  function pathAtX(x) {
    // Геометрическая выпуклая (вверх) кривая: h = A * xn^p
    // Начинаетcя почти плоско и становится всё круче (как на рефе)
    const w = Math.max(1, canvas.width - leftMargin - rightMargin);
    const xn = Math.max(0, Math.min(1, x / w));
    const A = canvas.height * 0.62; // максимальный подъём
    const p = 2.2; // показатель степени (>1 даёт старт плоским, далее круче)
    const h = A * Math.pow(xn, p);
    const yFromBottom = baseYFromBottom + h;
    let yTop = canvas.height - yFromBottom;
    // Не позволяем подходить слишком близко к верху
    yTop = Math.max(minTop, yTop);
    return yTop;
  }

  function drawCurvedTrail(virtualX, seconds, headScreenX, vOffset = 0) {
    ctx.save();
    
    // Trail line настройки
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#EA204F';
    ctx.shadowColor = 'rgba(234,32,79,0.45)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    
    const centerX = canvas.width / 2;
    let start, end;
    
    if (!centerLocked) {
      start = 0;
      end = virtualX;
    } else {
      start = Math.max(0, virtualX - centerX);
      end = virtualX;
    }
    
    // Рисуем чистую гладкую кривую без дополнительных искажений
    const step = 3;
    let x = start;
    let y = pathAtX(x) + vOffset;
    y = Math.min(canvas.height - 5, Math.max(minTop, y));
    let xs = !centerLocked ? (leftMargin + x) : (centerX + (x - virtualX));
    ctx.moveTo(xs, y);
    for (x = start + step; x <= end; x += step) {
      y = pathAtX(x) + vOffset;
      y = Math.min(canvas.height - 5, Math.max(minTop, y));
      xs = !centerLocked ? (leftMargin + x) : (centerX + (x - virtualX));
      if (xs < 0) continue;
      if (xs > canvas.width) break;
      ctx.lineTo(xs, y);
    }
    
    ctx.stroke();

    // Заливка под кривой
    const lastScreenX = Math.min(
      canvas.width,
      Math.max(0, !centerLocked ? (leftMargin + end) : (centerX + (end - virtualX)))
    );
    ctx.lineTo(lastScreenX, canvas.height);
    const firstScreenX = Math.max(0, !centerLocked ? (leftMargin + start) : (centerX + (start - virtualX)));
    ctx.lineTo(firstScreenX, canvas.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(234,32,79,0.15)';
    ctx.fill();

    ctx.restore();
  }

  function updatePlanePosition(virtualX, seconds, vOffset = 0) {
    // Самолет движется горизонтально как обычно
    const centerX = canvas.width / 2;
    let screenX = leftMargin + virtualX;
    if (screenX >= centerX) { screenX = centerX; centerLocked = true; }
    
    // Y позиция следует по кривой пути
    let y = pathAtX(virtualX) + vOffset - planeAboveOffset;
    // Gentle vertical oscillation (disabled in hovering, enabled in flying)
    const osc = (state === 'hovering') ? 0 : (oscAmp * Math.sin(2 * Math.PI * oscFreq * seconds));
    y = Math.max(minTop, Math.min(canvas.height - 45, y + osc));

    // Translate plane to screen position
    const tx = screenX - 10;
    const ty = y - (canvas.height - baseYFromBottom);
    planeWrapper.style.transform = `translate(${tx}px, ${ty}px)`;

    // Самолет смотрит горизонтально с маленьким покачиванием
    const angle = -6 + 1 * Math.sin(2 * Math.PI * (oscFreq / 2) * seconds);
    planeImg.style.transform = `rotate(${angle}deg) scale(1)`;
    currentAngleRad = (angle * Math.PI) / 180;
  }

  function updateMultiplier(seconds) {
    // Slower exponential growth
    const g = 0.12; // growth per second (slower)
    const m = Math.max(1, Math.exp(g * seconds));

    // Cap the multiplier at the crash value if crash is determined
    const cappedMultiplier = crashAt ? Math.min(m, crashAt) : m;

    // Do not update the displayed text after crash or while crashing
    if (!crashed && state !== 'crashing') {
      currentMultiplier.textContent = `${cappedMultiplier.toFixed(2)}x`;
    }
    return m;
  }

  function pickCrashMultiplier() {
    // Aggressive crash distribution: frequent losses at 1.5x and 2x, rare wins above 3x
    const r = Math.random();

    // 1.10x to 1.50x: 15% (some 1.5x losses)
    if (r < 0.15) {
      const rr = Math.random();
      const biased = Math.pow(rr, 1.5); // slight bias to lower values
      const val = 1.10 + (1.50 - 1.10) * biased;
      return +Math.min(1.50, Math.max(1.10, val)).toFixed(2);
    }
    // 1.50x to 2.00x: 70% (frequent 2x losses)
    else if (r < 0.85) {
      const rr = Math.random();
      const biased = Math.pow(rr, 2.0); // strong bias towards 2.00x
      const val = 1.50 + (2.00 - 1.50) * biased;
      return +Math.min(2.00, Math.max(1.50, val)).toFixed(2);
    }
    // 2.00x to 3.00x: 10% (rare higher losses)
    else if (r < 0.95) {
      const rr = Math.random();
      const biased = Math.pow(rr, 1.2); // slight bias to lower values
      const val = 2.00 + (3.00 - 2.00) * biased;
      return +Math.min(3.00, Math.max(2.00, val)).toFixed(2);
    }
    // 3.00x to 9.99x: 5% (very rare wins)
    else {
      const rr = Math.random();
      const biased = Math.pow(rr, 0.8); // bias towards higher values for excitement
      const val = 3.00 + (9.99 - 3.00) * biased;
      return +Math.min(9.99, Math.max(3.00, val)).toFixed(2);
    }
  }

  function tick(now) {
    if (state === 'waiting') {
      updateWaiting(now);
    } else if (state === 'flying') {
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      t = (now - flightStart) / 1000;
      
      // Virtual world position - горизонтальное движение
      const virtualX = speedX * t;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const headScreenX = centerLocked ? centerX : (leftMargin + virtualX);
      
      drawCurvedTrail(virtualX, t, headScreenX);
      updatePlanePosition(virtualX, t);
      const m = updateMultiplier(t);

      // Transition to hovering when reaching near top (stop extending curve)
      const headY = pathAtX(virtualX);
      if (hoverX === null && headY <= (minTop + 4)) {
        hoverX = virtualX;
        hoverStartEpoch = Date.now();
        hoverStart = now;
        state = 'hovering';
        saveState();
      }

      // Crash check
      if (!crashed && crashAt !== null && m >= crashAt) {
        crashed = true;
        currentMultiplier.classList.add('crashed');
        crashValue = m;
        crashStartEpoch = Date.now();
        crashStart = now;
        crashX = virtualX;
        // Determine current screen position and look angle
        const centerX2 = canvas.width / 2;
        crashStartScreenX = centerLocked ? centerX2 : (leftMargin + crashX);
        // Start from the plane's current visible Y (curve + osc - above offset)
        {
          const oscNow = oscAmp * Math.sin(2 * Math.PI * oscFreq * t);
          const yVis = pathAtX(crashX) + 0 /* vOffset in flying */ + oscNow - planeAboveOffset;
          crashStartYTop = Math.max(minTop, Math.min(canvas.height - 45, yVis));
        }
        // Aim to the top-right corner for a straight exit
        {
          const targetX = canvas.width + 80;
          const targetY = -80;
          crashAngleRad = Math.atan2(targetY - crashStartYTop, targetX - crashStartScreenX);
        }
        crashPrevScreenX = crashStartScreenX;
        crashPrevY = crashStartYTop;
        state = 'crashing';
        if (crashOverlay) crashOverlay.classList.add('show');
        // Freeze crash: keep plane visible and schedule reset
        planeWrapper.style.opacity = '0'; // hide point image on crash
        // Freeze multiplier at crash value
        if (typeof crashValue === 'number') {
          currentMultiplier.textContent = `${crashValue.toFixed(2)}x`;
        }
        // Do not persistently lock on crash; allow normal next rounds
        if (crashTimeoutId === null) {
          crashTimeoutId = setTimeout(() => {
            crashTimeoutId = null;
            resetCycle(performance.now());
          }, 4000);
        }
        saveState();
      }
    } else if (state === 'hovering') {
      // Freeze curve at hoverX; plane bobs up/down slightly but does not go higher
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const headScreenX = centerLocked ? centerX : (leftMargin + hoverX);
      const hovSec = (hoverStart ? (now - hoverStart) / 1000 : 0);
      const vOffset = hoverAmp * Math.sin(2 * Math.PI * hoverFreq * hovSec);
      drawCurvedTrail(hoverX, hovSec, headScreenX, vOffset);
      // Position plane at hoverX with whole-curve vertical offset
      updatePlanePosition(hoverX, hovSec, vOffset);
      const m = updateMultiplier((now - flightStart) / 1000);

      // Crash check while hovering
      if (!crashed && crashAt !== null && m >= crashAt) {
        crashed = true;
        currentMultiplier.classList.add('crashed');
        crashValue = m;
        crashStartEpoch = Date.now();
        crashStart = now;
        crashX = hoverX;
        // Starting position and angle while hovering
        const centerX2 = canvas.width / 2;
        crashStartScreenX = centerLocked ? centerX2 : (leftMargin + crashX);
        // Start from current visible Y in hovering (curve + hover bob - above offset)
        {
          const hovSec2 = (hoverStart ? (now - hoverStart) / 1000 : 0);
          const vOffset2 = hoverAmp * Math.sin(2 * Math.PI * hoverFreq * hovSec2);
          const yVis = pathAtX(crashX) + vOffset2 - planeAboveOffset;
          crashStartYTop = Math.max(minTop, Math.min(canvas.height - 45, yVis));
        }
        // Aim to the top-right corner for a straight exit
        {
          const targetX = canvas.width + 80;
          const targetY = -80;
          crashAngleRad = Math.atan2(targetY - crashStartYTop, targetX - crashStartScreenX);
        }
        crashPrevScreenX = crashStartScreenX;
        crashPrevY = crashStartYTop;
        state = 'crashing';
        if (crashOverlay) crashOverlay.classList.add('show');
        // Freeze multiplier at crash value
        if (typeof crashValue === 'number') {
          currentMultiplier.textContent = `${crashValue.toFixed(2)}x`;
        }
        // Hide point image on crash
        planeWrapper.style.opacity = '0';
      }
    } else if (state === 'crashing') {
      // Freeze at crash position: keep background clean to avoid artifacts
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Keep plane at crash start position (hidden)
      const screenX = crashStartScreenX;
      const y = crashStartYTop;
      const tx = screenX - 10;
      const ty = y - (canvas.height - baseYFromBottom);
      planeWrapper.style.transform = `translate(${tx}px, ${ty}px)`;
      // Remove crash rotation and any swimming effect
      planeImg.style.transform = `rotate(0deg) scale(1)`;
      // Ensure point stays hidden during crashing
      planeWrapper.style.opacity = '0';

      // Safety: ensure reset after 4s even if timeout failed
      if (crashStart && (now - crashStart) > 4000 && crashTimeoutId === null) {
        resetCycle(now);
      }
    }
    requestAnimationFrame(tick);
  }

  function resetCycle(now) {
    // Reset to waiting for next round
    state = 'waiting';
    waitStartEpoch = Date.now();
    waitStart = now;
    // Reset UI
    aviatorSplash.classList.remove('hidden');
    waitingPanel.classList.remove('hidden');
    waitingText.textContent = 'Waiting...';
    waitingBar.style.transform = 'scaleX(1)';

    // Reset plane position
    planeWrapper.style.transform = 'translate(0px, 0px)';
    planeImg.style.transform = 'rotate(0deg)';
    // Keep plane hidden during waiting phase
    planeWrapper.style.opacity = '0';
    // Hide crash overlay on reset
    if (crashOverlay) crashOverlay.classList.remove('show');

    // Reset multiplier
    currentMultiplier.textContent = '1.00x';
    currentMultiplier.classList.remove('crashed');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  }

  // Save the most recent snapshot on tab hide/refresh
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      snapshotAndSave();
    }
  });
  window.addEventListener('beforeunload', () => {
    snapshotAndSave();
  });

  // Restore state across reloads
  (function restore() {
    const s = loadState();
    if (!s) return;
    try {
      // Basic fields
      state = s.state || 'waiting';
      crashed = !!s.crashed;
      crashAt = s.crashAt ?? crashAt;
      crashValue = s.crashValue ?? null;
      crashX = s.crashX ?? 0;
      hoverX = s.hoverX ?? null;
      centerLocked = !!s.centerLocked;
      // Epochs
      waitStartEpoch = s.waitStartEpoch ?? Date.now();
      flightStartEpoch = s.flightStartEpoch ?? 0;
      hoverStartEpoch = s.hoverStartEpoch ?? 0;
      crashStartEpoch = s.crashStartEpoch ?? 0;

      // Align perf timers to epochs
      const nowPerf = performance.now();
      // If crashed flag is true, force crashing state to avoid multiplier drift
      if (crashed) {
        state = 'crashing';
      }
      if (state === 'waiting') {
        waitStart = nowPerf - Math.max(0, Date.now() - waitStartEpoch);
        aviatorSplash.classList.remove('hidden');
        waitingPanel.classList.remove('hidden');
        multiplierLayer.classList.add('hidden');
        planeWrapper.style.opacity = '0';
        // Update waiting bar and text immediately based on remaining time
        const elapsed = Math.max(0, (Date.now() - waitStartEpoch) / 1000);
        const pct = Math.max(0, Math.min(1, 1 - elapsed / WAIT_SECONDS));
        waitingBar.style.transformOrigin = 'left center';
        waitingBar.style.transform = `scaleX(${pct})`;
        const secondsLeft = Math.ceil(Math.max(0, WAIT_SECONDS - elapsed));
        waitingText.textContent = secondsLeft > 0 ? `Waiting... ${secondsLeft}` : 'Starting...';
      } else if (state === 'flying') {
        console.log('Restoring flying state');
        flightStart = nowPerf - Math.max(0, Date.now() - flightStartEpoch);
        aviatorSplash.classList.add('hidden');
        waitingPanel.classList.add('hidden');
        multiplierLayer.classList.remove('hidden');
        planeWrapper.style.opacity = '1';
        if (crashOverlay) crashOverlay.classList.remove('show');
        
        // Immediately reflect correct multiplier to avoid 1.00x flash
        if (!crashed) {
          const seconds = Math.max(0, (Date.now() - flightStartEpoch) / 1000);
          const g = 0.12;
          const mNow = Math.max(1, Math.exp(g * seconds));
          const cappedMNow = crashAt ? Math.min(mNow, crashAt) : mNow;
          currentMultiplier.classList.remove('crashed');
          currentMultiplier.textContent = `${cappedMNow.toFixed(2)}x`;
        }
        
      } else if (state === 'hovering') {
        console.log('Restoring hovering state');
        flightStart = nowPerf - Math.max(0, Date.now() - flightStartEpoch);
        hoverStart = nowPerf - Math.max(0, Date.now() - hoverStartEpoch);
        aviatorSplash.classList.add('hidden');
        waitingPanel.classList.add('hidden');
        multiplierLayer.classList.remove('hidden');
        planeWrapper.style.opacity = '1';
        if (crashOverlay) crashOverlay.classList.remove('show');
        
        // Immediately reflect correct multiplier to avoid 1.00x flash
        if (!crashed) {
          const seconds = Math.max(0, (Date.now() - flightStartEpoch) / 1000);
          const g = 0.12;
          const mNow = Math.max(1, Math.exp(g * seconds));
          const cappedMNow = crashAt ? Math.min(mNow, crashAt) : mNow;
          currentMultiplier.classList.remove('crashed');
          currentMultiplier.textContent = `${cappedMNow.toFixed(2)}x`;
        }
        
      } else if (state === 'crashing') {
        // If crash timeout already should have passed, reset directly
        const elapsedCrashMs = Math.max(0, Date.now() - crashStartEpoch);
        if (elapsedCrashMs > 4000) {
          resetCycle(nowPerf);
        } else {
          flightStart = nowPerf - Math.max(0, Date.now() - flightStartEpoch);
          crashStart = nowPerf - elapsedCrashMs;
          // Proper UI layering for crashing
          aviatorSplash.classList.add('hidden');
          waitingPanel.classList.add('hidden');
          multiplierLayer.classList.remove('hidden');
          if (crashOverlay) crashOverlay.classList.add('show');
          planeWrapper.style.opacity = '0';
          // Keep multiplier at crash value
          if (typeof crashValue === 'number') {
            currentMultiplier.classList.add('crashed');
            currentMultiplier.textContent = `${(+crashValue).toFixed(2)}x`;
          }
        }
      }
    } catch (e) {
      // ignore restore errors
    }
  })();

  requestAnimationFrame(tick);
})();