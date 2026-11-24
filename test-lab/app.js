(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- particle field ---------- */
  const canvas = $("#field");
  const ctx = canvas && canvas.getContext("2d");
  let particles = [];
  let w = 0;
  let h = 0;
  let raf = null;
  let accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7cf6c8";
  const pointer = { x: -999, y: -999 };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
    ];
  }

  function sizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const target = Math.min(110, Math.max(36, Math.floor((w * h) / 16000)));
    particles = Array.from({ length: target }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.6,
    }));
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const [r, g, b] = hexToRgb(accent);
    const maxDist = 130;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const dxp = p.x - pointer.x;
      const dyp = p.y - pointer.y;
      const dp = Math.hypot(dxp, dyp);
      if (dp < 140) {
        p.x += (dxp / (dp || 1)) * 0.6;
        p.y += (dyp / (dp || 1)) * 0.6;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b2 = particles[j];
        const d = Math.hypot(a.x - b2.x, a.y - b2.y);
        if (d < maxDist) {
          const o = (1 - d / maxDist) * 0.16;
          ctx.strokeStyle = `rgba(${r},${g},${b},${o})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  if (canvas && ctx) {
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    window.addEventListener("pointermove", (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });
    window.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -999;
    });
    if (reduceMotion) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      draw();
    }
  }

  /* ---------- nav on scroll ---------- */
  const nav = $(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- card spotlight ---------- */
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
    });
  });

  /* ---------- live clock ---------- */
  const timeEl = $("#clock-time");
  const dateEl = $("#clock-date");
  const zoneEl = $("#clock-zone");
  const footerClock = $("#footer-clock");

  function tick() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    if (timeEl) timeEl.textContent = `${hh}:${mm}:${ss}`;
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (zoneEl) {
      const offset = -now.getTimezoneOffset() / 60;
      const sign = offset >= 0 ? "+" : "−";
      zoneEl.textContent = `UTC${sign}${String(Math.abs(offset)).replace(/\.5$/, ".5")}`;
    }
    if (footerClock) footerClock.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- counter ---------- */
  const counterEl = $("#counter-value");
  let count = 0;

  function paintCounter() {
    if (!counterEl) return;
    counterEl.textContent = count > 0 ? "+" + count : String(count);
    counterEl.style.color =
      count > 0
        ? "var(--accent)"
        : count < 0
        ? "#ff8a8a"
        : "var(--ink)";
  }

  function bump(step) {
    count += step;
    paintCounter();
  }

  $$("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => bump(Number(btn.dataset.step)));
  });
  const resetBtn = $("#counter-reset");
  if (resetBtn) resetBtn.addEventListener("click", () => { count = 0; paintCounter(); });

  window.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.key === "ArrowUp" || e.key === "+") bump(1);
    if (e.key === "ArrowDown" || e.key === "-") bump(-1);
  });

  /* ---------- accent switcher ---------- */
  const readout = $("#accent-readout");
  const swatches = $$(".swatch");

  function setAccent(hex) {
    accent = hex;
    const [r, g, b] = hexToRgb(hex);
    const root = document.documentElement;
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-dim", `rgba(${r},${g},${b},0.14)`);
    if (readout) readout.textContent = hex;
    swatches.forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.accent === hex)));
  }

  swatches.forEach((s) => s.addEventListener("click", () => setAccent(s.dataset.accent)));
  setAccent(accent);

  /* ---------- typewriter ---------- */
  const typer = $("#typer");
  const phrases = [
    "ship it, then look at it.",
    "no framework, no build step.",
    "the clock above is real time.",
    "the accent repaints the canvas.",
    "built in a sandbox, deployed live.",
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function loopType() {
    if (!typer) return;
    const phrase = phrases[phraseIndex];
    if (!deleting) {
      charIndex++;
      typer.textContent = phrase.slice(0, charIndex);
      if (charIndex === phrase.length) {
        deleting = true;
        return setTimeout(loopType, 1700);
      }
      return setTimeout(loopType, 55);
    }
    charIndex--;
    typer.textContent = phrase.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      return setTimeout(loopType, 320);
    }
    return setTimeout(loopType, 26);
  }
  loopType();

  /* ---------- password generator ---------- */
  const SETS = {
    lower: "abcdefghijkmnopqrstuvwxyz",
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
    digits: "23456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/",
  };

  const pwOut = $("#pw-out");
  const pwLen = $("#pw-len");
  const pwLenLabel = $("#pw-len-label");
  const pwUpper = $("#pw-upper");
  const pwDigits = $("#pw-digits");
  const pwSymbols = $("#pw-symbols");
  const pwGen = $("#pw-gen");
  const pwCopy = $("#pw-copy");

  function rand(max) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }

  function generatePassword() {
    let pool = SETS.lower;
    const required = [SETS.lower];
    if (pwUpper && pwUpper.checked) { pool += SETS.upper; required.push(SETS.upper); }
    if (pwDigits && pwDigits.checked) { pool += SETS.digits; required.push(SETS.digits); }
    if (pwSymbols && pwSymbols.checked) { pool += SETS.symbols; required.push(SETS.symbols); }

    const len = Math.max(Number(pwLen.value), required.length);
    const chars = required.map((set) => set[rand(set.length)]);

    while (chars.length < len) chars.push(pool[rand(pool.length)]);

    for (let i = chars.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    if (pwOut) pwOut.textContent = chars.join("");
  }

  function paintLen() {
    if (!pwLen) return;
    const min = Number(pwLen.min);
    const max = Number(pwLen.max);
    const val = Number(pwLen.value);
    if (pwLenLabel) pwLenLabel.textContent = val;
    const fill = ((val - min) / (max - min)) * 100;
    pwLen.style.setProperty("--fill", fill + "%");
  }

  if (pwLen) pwLen.addEventListener("input", paintLen);
  paintLen();
  if (pwGen) pwGen.addEventListener("click", generatePassword);
  generatePassword();

  if (pwCopy) {
    pwCopy.addEventListener("click", async () => {
      if (!pwOut) return;
      try {
        await navigator.clipboard.writeText(pwOut.textContent);
        const prev = pwCopy.textContent;
        pwCopy.textContent = "copied";
        setTimeout(() => (pwCopy.textContent = prev), 1200);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pwOut);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        pwCopy.textContent = "select+ctrl c";
      }
    });
  }

  /* ---------- stat: real weight ---------- */
  const statSize = $("#stat-size");
  if (statSize) {
    const sources = ["index.html", "style.css", "app.js"];
    Promise.all(
      sources.map((f) =>
        fetch(f)
          .then((r) => r.text())
          .then((t) => new Blob([t]).size)
          .catch(() => 0)
      )
    ).then((sizes) => {
      const total = sizes.reduce((a, b) => a + b, 0);
      if (total > 0) statSize.textContent = Math.round(total / 1024) + " KB";
    });
  }
})();
