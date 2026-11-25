const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (value) => String(value).replace(/\d/g, (d) => BN_DIGITS[d]);

const TYPED_LINES = [
  "যাকে ভালোবাসা হয়, তাকে বলা হয় না — তাকে মনে রাখা হয়।",
  "এক বছরের জমানো কথাগুলো, আজ একটু হালকা লাগছে।",
  "ভালোবাসা কারও অনুমতি নিয়ে আসে না।",
  "যা সত্যি, তা বলতে হয় — একবার হলেও।",
];

const QUOTES = [
  "ভালোবাসা কারও অনুমতি নিয়ে আসে না।",
  "যে কষ্ট পায় না, সে ভালোবাসেও না।",
  "চুপ করে থাকাটাও এক ধরনের উত্তর — শুধু শোনা যায় না।",
  "মিস করা মানে কেউ ভেতরে বাস করছে।",
];

const PETALS = ["♥", "✿", "❀", "✦"];

/* ── Dhaka clock ─────────────────────────────────────────────── */

function renderClock() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const pick = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  const clock = document.getElementById("clock");
  if (clock) clock.textContent = `${toBn(pick("hour"))}:${toBn(pick("minute"))} · ঢাকা`;

  const today = document.getElementById("today");
  if (today) {
    const date = new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    today.textContent = date;
  }
}

/* ── typewriter ──────────────────────────────────────────────── */

function startTyping() {
  const target = document.getElementById("typed");
  if (!target) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    target.textContent = TYPED_LINES[0];
    return;
  }

  let line = 0;
  let char = 0;
  let deleting = false;

  const tick = () => {
    const text = TYPED_LINES[line];
    char += deleting ? -1 : 1;
    target.textContent = text.slice(0, char);

    let delay = deleting ? 28 : 62;
    if (!deleting && char === text.length) {
      deleting = true;
      delay = 2400;
    } else if (deleting && char === 0) {
      deleting = false;
      line = (line + 1) % TYPED_LINES.length;
      delay = 420;
    }
    window.setTimeout(tick, delay);
  };

  tick();
}

/* ── scroll reveal ───────────────────────────────────────────── */

function startReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* ── starfield ───────────────────────────────────────────────── */

function startStars() {
  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stars = [];
  let width = 0;
  let height = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round((width * height) / 12000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.25,
      base: Math.random() * 0.45 + 0.2,
      speed: Math.random() * 0.9 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }));
  };

  const draw = (time) => {
    ctx.clearRect(0, 0, width, height);
    const t = time / 1000;
    stars.forEach((star) => {
      const twinkle = reduced ? star.base : star.base + Math.sin(t * star.speed + star.phase) * 0.32;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 226, 238, ${Math.max(twinkle, 0.05)})`;
      ctx.fill();
    });
    if (!reduced) requestAnimationFrame(draw);
  };

  resize();
  requestAnimationFrame(draw);
  window.addEventListener("resize", resize);
}

/* ── quote rotator ───────────────────────────────────────────── */

function startQuotes() {
  const node = document.getElementById("rotator");
  if (!node) return;

  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % QUOTES.length;
    node.style.opacity = "0";
    window.setTimeout(() => {
      node.textContent = QUOTES[index];
      node.style.opacity = "1";
    }, 420);
  }, 6200);
  node.style.transition = "opacity 0.42s ease";
}

/* ── petals on touch ─────────────────────────────────────────── */

function startPetals() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  document.addEventListener("pointerdown", (event) => {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    petal.style.left = `${event.clientX}px`;
    petal.style.top = `${event.clientY}px`;
    petal.style.color = Math.random() > 0.5 ? "#ff9ec4" : "#ffd6a5";
    document.body.appendChild(petal);
    window.setTimeout(() => petal.remove(), 1500);
  });
}

renderClock();
window.setInterval(renderClock, 15000);
startTyping();
startReveal();
startStars();
startQuotes();
startPetals();
