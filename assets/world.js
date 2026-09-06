/* ============================================================
   The world v3 — committed light theme, no mode switching.
   One fixed canvas, ALWAYS cream:
   - ink dust drifts behind every page (visible, alive)
   - particles converge toward the contact links at the footer
   - inside .machine-chapter: the machine animates live (river,
     gates A/B/C lighting in sequence, ring drawing, check)
     over the dark chapter background
   No JS / reduced motion: the static SVG diagram + cream page.
   ============================================================ */
(() => {
  "use strict";

  const canvas = document.getElementById("world");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const AMBIENT = document.body.dataset.world === "ambient";
  const ctx = canvas.getContext("2d", { alpha: false });

  let W = 0, H = 0, DPR = 1, mobile = false;
  const parts = [];
  const CREAM = "rgb(250, 248, 245)";
  const INK = [27, 23, 18];
  const GREEN = [111, 207, 151];

  function seed() {
    parts.length = 0;
    const N = mobile ? 60 : 110;
    for (let i = 0; i < N; i++) {
      parts.push({
        hx: Math.random(), hy: Math.random(),
        ph: Math.random() * Math.PI * 2,
        lane: Math.random() * 2 - 1,
        s: Math.random(),
        sp: 0.6 + Math.random() * 0.8,
        sz: 0.7 + Math.random() * 1.0,
        big: Math.random() < 0.10,
      });
    }
  }

  const T = { chapTop: 0, chapH: 0, tailStart: 0, tailEnd: 1 };
  function yOf(el) { return el ? el.getBoundingClientRect().top + window.scrollY : 0; }
  function measure() {
    mobile = window.innerWidth < 700;
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
    const chap = document.querySelector(".machine-chapter");
    const foot = document.querySelector("#footer");
    const doc = document.documentElement.scrollHeight;
    if (chap && !AMBIENT) {
      T.chapTop = yOf(chap); T.chapH = chap.offsetHeight;
    } else { T.chapTop = 1e9; T.chapH = 0; }
    T.tailStart = Math.max(0, yOf(foot) - H * 1.2);
    T.tailEnd = Math.max(1, doc - H);
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);

  function render(now) {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);

    const sy = window.scrollY;
    // machine strength = how much of the viewport the chapter covers right now
    let machine = 0, tMachine = 0;
    if (!AMBIENT && T.chapH > 0) {
      const top = T.chapTop - sy, bot = top + T.chapH;
      const overlap = Math.max(0, Math.min(bot, H) - Math.max(top, 0));
      machine = clamp01(overlap / H) * 1.15;    // slightly overdrive so it's fully alive while chapter fills the screen
      machine = clamp01(machine);
      tMachine = clamp01((H * 0.9 - top) / Math.max(1, T.chapH + H * 0.4));
    }
    const tailT = clamp01((sy - T.tailStart) / (T.tailEnd - T.tailStart));

    const flow = now * 0.00004;
    const span = 1.24;

    for (const p of parts) {
      // ink dust home position
      let x = p.hx * W + Math.sin(p.ph + now * 0.00035 * p.sp) * 14;
      let y = p.hy * H + Math.cos(p.ph * 1.3 + now * 0.00028 * p.sp) * 14;
      let alpha = (0.34 + 0.14 * Math.sin(p.ph + now * 0.001)) * (1 - machine);
      let sz = (p.big ? 3.4 : 2.2) * p.sz;
      let green = 0;

      // river positions while the machine chapter owns the screen
      if (machine > 0.02) {
        const rx = ((p.s * span + flow * p.sp) % span) - 0.12;
        const ry = 0.5 * H + 0.085 * H * Math.sin(rx * 3.1 + 0.5) + p.lane * 0.045 * H;
        x = x + (rx * W - x) * machine;
        y = y + (ry - y) * machine;
        alpha = Math.max(alpha, machine * 0.75);
        sz += machine * 1.4;
        green = machine;
      }

      // footer convergence
      if (tailT > 0) {
        const tx = W * 0.62, ty = H * 0.62;
        x = x + (tx - x) * 0.62 * tailT;
        y = y + (ty - y) * 0.62 * tailT;
        alpha *= 1 - 0.55 * tailT;
      }

      alpha *= 0.35 + 0.65 * clamp01(Math.min(x / 60, (W - x) / 60, 1));
      if (alpha <= 0.01) continue;

      const col = green > 0.4
        ? `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${alpha.toFixed(3)})`
        : `rgba(${INK[0]},${INK[1]},${INK[2]},${alpha.toFixed(3)})`;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, 6.283);
      ctx.fill();

      if (machine > 0.35) {
        ctx.strokeStyle = `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${(0.16 * machine).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 26 * p.sp, y); ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    if (machine > 0.02) drawMachine(tMachine, machine, now);
  }

  function drawMachine(t, strength, now) {
    const xs = [0.40, 0.545, 0.69], labels = ["A", "B", "C"];
    const h = H * 0.42, cy = H * 0.52;
    ctx.font = "500 24px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const x = xs[i] * W;
      const lit = 0.35 + 0.5 * clamp01((t - 0.12 - i * 0.16) * 4);
      ctx.fillStyle = `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${(lit * strength).toFixed(3)})`;
      ctx.fillRect(x - 3, cy - h / 2, 6, h);
      ctx.fillText(labels[i], x, cy - h / 2 - 18);
    }
    // ring + check to the right of gate C
    const cx = W * 0.85, rcy = H * 0.50, r = H * 0.17;
    const sweep = ease((t - 0.42) / 0.16) * 359.9;
    if (sweep > 1) {
      ctx.strokeStyle = `rgba(233,228,218,${(0.5 * strength).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, rcy, r, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI / 180);
      ctx.stroke();
    }
    if (t > 0.60) {
      const cp = ease((t - 0.60) / 0.12);
      const pts = [
        [cx - 0.34 * r, rcy + 0.04 * r],
        [cx - 0.09 * r, rcy + 0.30 * r],
        [cx + 0.40 * r, rcy - 0.28 * r],
      ];
      const segs = [
        Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]),
        Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]),
      ];
      let target = cp * (segs[0] + segs[1]);
      ctx.strokeStyle = `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${(0.95 * strength).toFixed(3)})`;
      ctx.lineWidth = 5;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < 2 && target > 0; i++) {
        const f = Math.min(1, target / segs[i]);
        ctx.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
                   pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f);
        target -= segs[i];
      }
      ctx.stroke();
    }
  }

  /* ---------- loop (idle throttle, hidden pause) ---------- */
  let raf = 0, fc = 0, lastY = -1, lastActive = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const y = window.scrollY;
    if (y !== lastY) { lastY = y; lastActive = now; }
    fc++;
    if (now - lastActive > 2500 && fc % 3 !== 0) return;
    render(now);
  }
  function start() {
    measure();
    lastActive = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  window.addEventListener("resize", start);
  window.addEventListener("load", start);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  start();
})();
