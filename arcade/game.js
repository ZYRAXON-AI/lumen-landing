(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const canvas = $("#game");
  const ctx = canvas.getContext("2d");
  const stage = $("#stage");

  const el = {
    score: $("#score"),
    high: $("#high"),
    level: $("#level"),
    lives: $("#lives"),
    overlay: $("#overlay"),
    kicker: $("#ov-kicker"),
    title: $("#ov-title"),
    text: $("#ov-text"),
    ovScore: $("#ov-score"),
    playBtn: $("#ov-btn"),
    pauseBtn: $("#btn-pause"),
    restartBtn: $("#btn-restart"),
    soundBtn: $("#btn-sound"),
  };

  const COLORS = ["#ff3d9a", "#8b5cff", "#3ef0ff", "#b6ff5c", "#ffc247", "#ff7a45"];
  const HIGH_KEY = "neon-breakout-high";
  const SOUND_KEY = "neon-breakout-sound";

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let W = 800;
  let H = 600;

  const game = {
    mode: "ready",
    score: 0,
    level: 1,
    lives: 3,
    combo: 0,
    high: Number(localStorage.getItem(HIGH_KEY) || 0),
    banner: null,
    bannerTime: 0,
    paddle: { x: 0, y: 0, w: 110, h: 12, target: 0 },
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 7, stuck: true },
    bricks: [],
    particles: [],
    floats: [],
    shake: 0,
  };

  const keys = { left: false, right: false };

  /* ---------- audio ---------- */
  let audio = null;
  let soundOn = localStorage.getItem(SOUND_KEY) !== "off";

  function ensureAudio() {
    if (!soundOn) return null;
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio = new Ctx();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function blip(freq, dur = 0.07, type = "square", gain = 0.05) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.82, ac.currentTime + dur);
    amp.gain.setValueAtTime(gain, ac.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  function updateSoundBtn() {
    el.soundBtn.setAttribute("aria-pressed", String(soundOn));
    el.soundBtn.title = soundOn ? "Sound on" : "Sound off";
    el.soundBtn.textContent = soundOn ? "♪" : "♪";
  }

  /* ---------- sizing ---------- */
  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = W;
    const prevH = H;

    W = Math.max(280, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = prevW ? W / prevW : 1;
    const sy = prevH ? H / prevH : 1;

    if (game.bricks.length) {
      for (const b of game.bricks) {
        b.x *= sx; b.y *= sy; b.w *= sx; b.h *= sy;
      }
      game.paddle.x *= sx;
      game.paddle.w = paddleWidth();
      game.paddle.h = Math.max(10, H * 0.02);
      game.paddle.y = H - game.paddle.h - Math.max(16, H * 0.035);
      game.ball.r = Math.max(5.5, W * 0.0085);
      game.ball.x *= sx;
      game.ball.y *= sy;
    }
    layoutPaddle();
  }

  function paddleWidth() {
    return clamp(W * 0.15, 62, 150);
  }

  function layoutPaddle() {
    const p = game.paddle;
    p.w = paddleWidth();
    p.h = Math.max(10, H * 0.02);
    p.y = H - p.h - Math.max(16, H * 0.035);
    p.x = clamp(p.x, 0, W - p.w);
    p.target = p.x;
  }

  /* ---------- level ---------- */
  function buildLevel(level) {
    const cols = clamp(Math.round(W / 92), 6, 10);
    const rows = Math.min(4 + Math.floor(level / 2), 7);
    const padX = Math.max(14, W * 0.03);
    const top = Math.max(46, H * 0.1);
    const gap = Math.max(5, W * 0.007);
    const brickW = (W - padX * 2 - gap * (cols - 1)) / cols;
    const brickH = clamp(H * 0.045, 16, 30);

    game.bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hp = level >= 3 && r === 0 ? 2 : 1;
        game.bricks.push({
          x: padX + c * (brickW + gap),
          y: top + r * (brickH + gap),
          w: brickW,
          h: brickH,
          hp,
          maxHp: hp,
          color: COLORS[r % COLORS.length],
          alive: true,
        });
      }
    }
  }

  function resetBall(stuck = true) {
    const b = game.ball;
    const p = game.paddle;
    b.r = Math.max(5.5, W * 0.0085);
    b.x = p.x + p.w / 2;
    b.y = p.y - b.r - 2;
    b.vx = 0;
    b.vy = 0;
    b.stuck = stuck;
  }

  function ballSpeed() {
    return clamp(H * (0.52 + game.level * 0.045), 260, H * 1.15);
  }

  function launch() {
    const b = game.ball;
    if (!b.stuck || game.mode !== "playing") return;
    const speed = ballSpeed();
    const angle = (Math.random() * 0.5 - 0.25) + (-Math.PI / 2);
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.stuck = false;
    blip(520, 0.09, "triangle", 0.05);
  }

  /* ---------- flow ---------- */
  function setOverlay(state) {
    el.overlay.dataset.state = state;
    if (state === "playing") {
      el.overlay.hidden = true;
      return;
    }
    el.overlay.hidden = false;
  }

  function startGame() {
    game.mode = "playing";
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.combo = 0;
    game.particles.length = 0;
    game.floats.length = 0;
    game.banner = null;
    buildLevel(game.level);
    game.paddle.x = W / 2 - paddleWidth() / 2;
    layoutPaddle();
    resetBall(true);
    syncHud();
    setOverlay("playing");
    ensureAudio();
  }

  function pauseGame() {
    if (game.mode !== "playing") return;
    game.mode = "paused";
    el.kicker.textContent = "Paused";
    el.title.innerHTML = "TAKE A<br /><span>BREATH</span>";
    el.text.textContent = "The ball is waiting right where you left it.";
    el.ovScore.hidden = true;
    el.playBtn.textContent = "Resume";
    setOverlay("paused");
  }

  function resumeGame() {
    if (game.mode !== "paused") return;
    game.mode = "playing";
    setOverlay("playing");
  }

  function togglePause() {
    if (game.mode === "playing") pauseGame();
    else if (game.mode === "paused") resumeGame();
  }

  function gameOver() {
    game.mode = "over";
    if (game.score > game.high) {
      game.high = game.score;
      localStorage.setItem(HIGH_KEY, String(game.high));
    }
    syncHud();
    el.kicker.textContent = "Run ended";
    el.title.innerHTML = "GAME<br /><span>OVER</span>";
    el.text.textContent = game.score >= game.high && game.score > 0
      ? "That is a new high score. Well played."
      : "The bricks held. Try again — the paddle is yours.";
    el.ovScore.hidden = false;
    el.ovScore.innerHTML = `Score <b>${game.score}</b> · High <b>${game.high}</b>`;
    el.playBtn.textContent = "Play again";
    setOverlay("over");
    blip(180, 0.3, "sawtooth", 0.06);
  }

  function syncHud() {
    el.score.textContent = String(game.score);
    el.high.textContent = String(game.high);
    el.level.textContent = String(game.level);
    const filled = "♥".repeat(game.lives);
    const empty = "♥".repeat(Math.max(0, 3 - game.lives));
    el.lives.innerHTML = filled + (empty ? `<span class="lost">${empty}</span>` : "");
  }

  /* ---------- effects ---------- */
  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      if (game.particles.length > 260) break;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 190;
      game.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.4,
        max: 0.75,
        color,
        r: 1.2 + Math.random() * 2.2,
      });
    }
  }

  function floatText(x, y, text, color) {
    game.floats.push({ x, y, text, color, life: 0.85, max: 0.85 });
  }

  /* ---------- update ---------- */
  function update(dt) {
    const p = game.paddle;
    const b = game.ball;

    if (game.mode === "playing") {
      const keySpeed = 620;
      if (keys.left) p.x -= keySpeed * dt;
      if (keys.right) p.x += keySpeed * dt;
      p.x = clamp(p.x, 0, W - p.w);

      if (b.stuck) {
        b.x = p.x + p.w / 2;
        b.y = p.y - b.r - 2;
      } else {
        moveBall(dt);
      }
    }

    // particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const q = game.particles[i];
      q.life -= dt;
      if (q.life <= 0) { game.particles.splice(i, 1); continue; }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 420 * dt;
      q.vx *= 0.985;
    }

    for (let i = game.floats.length - 1; i >= 0; i--) {
      const f = game.floats[i];
      f.life -= dt;
      f.y -= 44 * dt;
      if (f.life <= 0) game.floats.splice(i, 1);
    }

    if (game.banner) {
      game.bannerTime -= dt;
      if (game.bannerTime <= 0) game.banner = null;
    }

    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 26);
  }

  function moveBall(dt) {
    const b = game.ball;
    const dist = Math.hypot(b.vx, b.vy) * dt;
    const steps = clamp(Math.ceil(dist / 4), 1, 24);
    const sub = dt / steps;

    for (let s = 0; s < steps; s++) {
      b.x += b.vx * sub;
      b.y += b.vy * sub;

      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); blip(300, 0.04, "square", 0.03); }
      else if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); blip(300, 0.04, "square", 0.03); }

      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); blip(340, 0.04, "square", 0.03); }

      if (b.y - b.r > H) { loseLife(); return; }

      collidePaddle();
      collideBricks();
      if (game.mode !== "playing") return;
    }
  }

  function collidePaddle() {
    const b = game.ball;
    const p = game.paddle;
    if (b.vy <= 0) return;
    const nx = clamp(b.x, p.x, p.x + p.w);
    const ny = clamp(b.y, p.y, p.y + p.h);
    const dx = b.x - nx;
    const dy = b.y - ny;
    if (dx * dx + dy * dy > b.r * b.r) return;

    b.y = p.y - b.r - 0.5;
    const rel = clamp((b.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
    const speed = clamp(Math.hypot(b.vx, b.vy), 200, H * 1.4);
    const angle = rel * 1.05;
    b.vx = Math.sin(angle) * speed;
    b.vy = -Math.cos(angle) * speed;
    game.combo = 0;
    blip(220 + Math.abs(rel) * 90, 0.06, "triangle", 0.05);
  }

  function collideBricks() {
    const b = game.ball;
    for (const brick of game.bricks) {
      if (!brick.alive) continue;
      const nx = clamp(b.x, brick.x, brick.x + brick.w);
      const ny = clamp(b.y, brick.y, brick.y + brick.h);
      const dx = b.x - nx;
      const dy = b.y - ny;
      if (dx * dx + dy * dy > b.r * b.r) continue;

      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      const overlapX = brick.w / 2 + b.r - Math.abs(b.x - cx);
      const overlapY = brick.h / 2 + b.r - Math.abs(b.y - cy);

      if (overlapX < overlapY) {
        b.vx = -b.vx;
        b.x += b.x < cx ? -overlapX : overlapX;
      } else {
        b.vy = -b.vy;
        b.y += b.y < cy ? -overlapY : overlapY;
      }

      brick.hp -= 1;
      game.combo += 1;
      if (brick.hp <= 0) {
        brick.alive = false;
        const points = 10 * game.level + Math.min(game.combo, 6) * 5;
        game.score += points;
        burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 14);
        floatText(brick.x + brick.w / 2, brick.y + brick.h / 2, "+" + points, brick.color);
        game.shake = 3;
        blip(420 + Math.min(game.combo, 8) * 55, 0.055, "square", 0.045);
        syncHud();
      } else {
        burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 5);
        blip(300, 0.04, "sine", 0.035);
      }

      if (game.bricks.every((x) => !x.alive)) nextLevel();
      return;
    }
  }

  function loseLife() {
    game.lives -= 1;
    game.combo = 0;
    syncHud();
    game.shake = 10;
    burst(game.ball.x, H - 6, "#ff3d9a", 22);
    blip(150, 0.25, "sawtooth", 0.06);
    if (game.lives <= 0) {
      gameOver();
      return;
    }
    game.paddle.x = W / 2 - game.paddle.w / 2;
    resetBall(true);
  }

  function nextLevel() {
    game.level += 1;
    game.banner = "LEVEL " + game.level;
    game.bannerTime = 1.4;
    syncHud();
    buildLevel(game.level);
    game.paddle.x = W / 2 - game.paddle.w / 2;
    layoutPaddle();
    resetBall(true);
    blip(660, 0.12, "triangle", 0.05);
    setTimeout(() => blip(880, 0.12, "triangle", 0.045), 110);
  }

  /* ---------- render ---------- */
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (game.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }

    // bricks
    for (const b of game.bricks) {
      if (!b.alive) continue;
      const alpha = b.maxHp > 1 && b.hp === 1 ? 0.45 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      roundRect(b.x, b.y, b.w, b.h, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // particles
    for (const q of game.particles) {
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * a + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // paddle
    const p = game.paddle;
    const grad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    grad.addColorStop(0, "#3ef0ff");
    grad.addColorStop(0.55, "#8b5cff");
    grad.addColorStop(1, "#ff3d9a");
    ctx.save();
    ctx.shadowColor = "rgba(139,92,255,0.9)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = grad;
    roundRect(p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
    ctx.restore();

    // ball
    const b = game.ball;
    ctx.save();
    ctx.shadowColor = "rgba(62,240,255,0.95)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(62,240,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // launch hint
    if (b.stuck && game.mode === "playing") {
      ctx.save();
      ctx.font = `600 ${Math.max(10, W * 0.016)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textAlign = "center";
      ctx.fillText("PRESS SPACE TO LAUNCH", W / 2, p.y - 44);
      ctx.restore();
    }

    // floating score
    for (const f of game.floats) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.max(11, W * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = f.color;
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // level banner
    if (game.banner) {
      const t = 1 - clamp(game.bannerTime / 1.4, 0, 1);
      const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.font = `700 ${Math.max(26, W * 0.06)}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(62,240,255,0.9)";
      ctx.shadowBlur = 30;
      ctx.fillText(game.banner, W / 2, H * 0.42);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.045);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */
  function pointerToPaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    game.paddle.x = clamp(x - game.paddle.w / 2, 0, W - game.paddle.w);
  }

  stage.addEventListener("pointermove", (e) => {
    if (game.mode !== "playing") return;
    pointerToPaddle(e.clientX);
  }, { passive: true });

  stage.addEventListener("pointerdown", (e) => {
    if (game.mode !== "playing") return;
    pointerToPaddle(e.clientX);
    launch();
    ensureAudio();
  });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") { keys.left = true; e.preventDefault(); }
    if (k === "arrowright" || k === "d") { keys.right = true; e.preventDefault(); }

    if (k === " " || e.code === "Space") {
      e.preventDefault();
      if (game.mode === "ready" || game.mode === "over") startGame();
      else if (game.mode === "playing") launch();
      else if (game.mode === "paused") resumeGame();
    }
    if (k === "p") togglePause();
    if (k === "r") startGame();
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keys.left = false;
    if (k === "arrowright" || k === "d") keys.right = false;
  });

  el.playBtn.addEventListener("click", () => {
    ensureAudio();
    if (game.mode === "paused") resumeGame();
    else startGame();
  });

  el.pauseBtn.addEventListener("click", togglePause);
  el.restartBtn.addEventListener("click", startGame);
  el.soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    updateSoundBtn();
    if (soundOn) blip(520, 0.08, "triangle", 0.05);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.mode === "playing") pauseGame();
  });

  /* ---------- boot ---------- */
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => resize()).observe(stage);
  } else {
    window.addEventListener("resize", resize);
  }

  W = Math.round(stage.getBoundingClientRect().width) || 800;
  H = Math.round(stage.getBoundingClientRect().height) || 600;
  resize();
  buildLevel(1);
  game.paddle.x = W / 2 - paddleWidth() / 2;
  layoutPaddle();
  resetBall(true);
  syncHud();
  updateSoundBtn();
  setOverlay("ready");
  requestAnimationFrame(frame);

  window.__neonBreakout = game;
})();
