/* ============================================================
   The continuous world — one fixed canvas behind the whole page.
   Scroll drives the timeline: cream dust → the machine (river,
   gates A/B/C, ring) → cream dust → convergence at the footer.
   - No JS: canvas never paints, page is plain cream. Fully readable.
   - Reduced motion: engine bails entirely.
   - Ambient mode (case pages): cream only, faint dust, no machine.
   ============================================================ */
(() => {
  "use strict";

  const canvas = document.getElementById("world");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const AMBIENT = document.body.dataset.world === "ambient";
  const ctx = canvas.getContext("2d", { alpha: false });

  const CREAM = { r: 250, g: 248, b: 245 };
  const DARK = { r: 14, g: 16, b: 14 };

  let W = 0, H = 0, DPR = 1, mobile = false;
  const parts = [];

  function seed() {
    parts.length = 0;
    const N = mobile ? 60 : 110;
    for (let i = 0; i < N; i++) {
      parts.push({
        hx: Math.random(),
        hy: Math.random(),
        ph: Math.random() * Math.PI * 2,
        lane: Math.random() * 2 - 1,
        s: Math.random(),
        sp: 0.6 + Math.random() * 0.8,
        sz: 0.7 + Math.random() * 1.0,
        big: Math.random() < 0.10,
      });
    }
  }

  /* ---------- timeline (measured from the real layout) ---------- */
  const T = {};
  function yOf(el) {
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }
  function measure() {
    mobile = window.innerWidth < 700;
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();

    const q = (s) => document.querySelector(s);
    const foot = q("#footer");
    const vh = window.innerHeight;
    const doc = document.documentElement.scrollHeight;
    if (AMBIENT) {
      T.tailStart = Math.max(0, yOf(foot) - vh * 1.2);
      T.tailEnd = Math.max(1, doc - vh);
    } else {
      const flags = q("#flagships"), stats = q(".stats"), band = q(".machine-band"),
            descentBand = q(".descent-band"),
            proof = q(".proof-strip"), cases = q("#case-studies"),
            archive = q("#archive");
      const dTop = yOf(descentBand), dH = descentBand ? descentBand.offsetHeight : vh * 1.6;
      // the fade lives ENTIRELY inside the empty descent band. The band is
      // taller than the viewport, so there is a scroll window where it alone
      // fills the screen: the fade completes inside that window, so no cream
      // text is ever in frame while the background is mid-fade.
      const dSpan = Math.max(10, dH - vh);
      T.descentStart = dTop - vh * 0.03;
      T.descentEnd = dTop + dSpan * 0.7;
      const bandTop = yOf(band), bandH = band ? band.offsetHeight : vh * 1.6;
      const span = Math.max(10, bandH - vh);   // scroll distance while the band alone fills the screen
      T.machineStart = yOf(proof) + proof.offsetHeight * 0.15; // river + gates wake behind the proof card
      T.machineEnd = bandTop + span * 0.58;    // ring draws, check completes and holds
      T.ascentStart = T.machineEnd;            // ascent completes while the band still fills
      T.ascentEnd = bandTop + span;            // cream returns before case-studies text enters
      T.tailStart = Math.max(0, yOf(archive) - vh * 0.5);
      T.tailEnd = Math.max(1, doc - vh);
    }
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);

  /* ---------- scene render ---------- */
  function render(now) {
    const sy = window.scrollY;
    let dark = 0, machineT = 0, tailT = 0, ascend = 0;

    if (AMBIENT) {
      tailT = clamp01((sy - T.tailStart) / (T.tailEnd - T.tailStart));
    } else {
      const descent = ease((sy - T.descentStart) / (T.descentEnd - T.descentStart));
      ascend = clamp01((sy - T.ascentStart) / (T.ascentEnd - T.ascentStart));
      dark = clamp01(descent * (1 - ease(ascend)));
      machineT = clamp01((sy - T.machineStart) / (T.machineEnd - T.machineStart));
      tailT = clamp01((sy - T.tailStart) / (T.tailEnd - T.tailStart));
    }

    const bg = {
      r: CREAM.r + (DARK.r - CREAM.r) * dark,
      g: CREAM.g + (DARK.g - CREAM.g) * dark,
      b: CREAM.b + (DARK.b - CREAM.b) * dark,
    };
    ctx.fillStyle = `rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})`;
    ctx.fillRect(0, 0, W, H);

    if (!AMBIENT) document.body.classList.toggle("world-dark", dark > 0.6);

    const flow = now * 0.00004;
    const span = 1.24;

    for (const p of parts) {
      // home drift (cream phases)
      let x = p.hx * W + Math.sin(p.ph + now * 0.00035 * p.sp) * 14;
      let y = p.hy * H + Math.cos(p.ph * 1.3 + now * 0.00028 * p.sp) * 14;
      let alpha = 0.34 + 0.14 * Math.sin(p.ph + now * 0.001);
      let sz = (p.big ? 3.4 : 2.2) * p.sz;
      let green = 0;

      // river blend inside the machine
      if (dark > 0.02) {
        const rx = ((p.s * span + flow * p.sp) % span) - 0.12;
        const ry = 0.40 * H + 0.085 * H * Math.sin(rx * 3.1 + 0.5) + p.lane * 0.045 * H;
        x = x + (rx * W - x) * dark;
        y = y + (ry - y) * dark;
        green = dark;
        alpha = 0.14 + 0.5 * dark;
        sz = 1.6 * p.sz + 1.8 * dark;
      }

      // tail convergence toward the contact point
      if (tailT > 0) {
        const tx = W * 0.62, ty = H * 0.62;
        x = x + (tx - x) * 0.62 * tailT;
        y = y + (ty - y) * 0.62 * tailT;
        alpha *= 1 - 0.6 * tailT;
      }

      // soft edge fade
      alpha *= 0.35 + 0.65 * clamp01(Math.min(x / 60, (W - x) / 60, 1));

      const col = green > 0.5
        ? `rgba(111,207,151,${alpha.toFixed(3)})`
        : dark > 0.5
          ? `rgba(233,228,218,${(alpha * 0.8).toFixed(3)})`
          : `rgba(27,23,18,${(alpha * 0.55).toFixed(3)})`;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, 6.283);
      ctx.fill();

      if (dark > 0.35) {
        ctx.strokeStyle = `rgba(111,207,151,${(0.16 * dark).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 26 * p.sp, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    if (!AMBIENT && dark > 0.12) {
      const fade = 1 - clamp01(ascend * 1.4); // visuals dissolve early in the ascent
      if (fade > 0) {
        drawGates(dark * fade, machineT);
        if (dark > 0.5 && machineT > 0.05) drawRing(ease(machineT) * 359.9, machineT, dark * fade);
      }
    }
  }

  function drawGates(dark, machineT) {
    const labels = ["A", "B", "C"];
    const xs = [0.44, 0.58, 0.72];
    const h = H * 0.36, cy = H * 0.40;
    ctx.font = "500 22px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const x = xs[i] * W;
      const lit = 0.30 + 0.45 * clamp01((machineT - 0.15 - i * 0.18) * 4);
      ctx.fillStyle = `rgba(111,207,151,${(lit * dark).toFixed(3)})`;
      ctx.fillRect(x - 2.5, cy - h / 2, 5, h);
      ctx.fillStyle = `rgba(111,207,151,${(Math.min(1, lit + 0.4) * dark).toFixed(3)})`;
      ctx.fillText(labels[i], x, cy - h / 2 - 16);
    }
  }

  function drawRing(sweep, machineT, dark) {
    const cx = W * 0.855, cy = H * 0.34, r = H * 0.17;
    if (sweep > 1) {
      ctx.strokeStyle = `rgba(233,228,218,${(0.45 * dark).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI / 180);
      ctx.stroke();
    }
    if (machineT > 0.86) {
      const cp = ease((machineT - 0.86) / 0.14);
      const pts = [
        [cx - 0.34 * r, cy + 0.04 * r],
        [cx - 0.09 * r, cy + 0.30 * r],
        [cx + 0.40 * r, cy - 0.28 * r],
      ];
      const segs = [
        Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]),
        Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]),
      ];
      let target = cp * (segs[0] + segs[1]);
      ctx.strokeStyle = `rgba(111,207,151,${(0.9 * dark).toFixed(3)})`;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
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

  /* ---------- loop (throttles when idle, stops when hidden) ---------- */
  let raf = 0, fc = 0, lastY = -1, lastActive = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const y = window.scrollY;
    if (y !== lastY) { lastY = y; lastActive = now; }
    fc++;
    if (now - lastActive > 2500 && fc % 3 !== 0) return; // idle: ~20fps
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
