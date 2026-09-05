/* Scroll-scrub image sequence (Apple-style flipbook).
   Progressive enhancement: if this module never runs, the poster
   <img> already in the HTML is the whole experience.
   Reduced-motion: bails, poster stays. */
(() => {
  "use strict";

  const section = document.querySelector(".seq-section");
  if (!section) return;
  const stage = section.querySelector(".seq-stage");
  const canvas = section.querySelector(".seq-canvas");
  const poster = section.querySelector(".seq-poster");
  if (!stage || !canvas || !poster) return;

  const N = 64;
  const PATH = poster.src.replace(/[^/]*$/, ""); // same directory as the poster

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const wide = window.innerWidth >= 700;
  if (reduced || !(finePointer && wide)) return; // poster-only on touch/small

  const ctx2d = canvas.getContext("2d");
  const frames = new Array(N).fill(null);
  let ready = false;
  let current = -1;

  function draw(i) {
    if (i === current || !frames[i]) return;
    current = i;
    ctx2d.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
  }

  function computeIndex() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    return Math.round((scrolled / total) * (N - 1));
  }

  function onScroll() {
    if (!ready) return;
    draw(computeIndex());
  }

  // progressive loading: keyframes first (10-point story), then the rest
  const KEY = [0, 8, 16, 24, 32, 40, 48, 56, 60, 63];
  const order = [...KEY, ...Array.from({ length: N }, (_, i) => i).filter(i => !KEY.includes(i))];

  let loadedCount = 0;
  function load(i) {
    const img = new Image();
    img.decoding = "async";
    img.src = `${PATH}f${String(i).padStart(3, "0")}.webp`;
    img.onload = () => {
      frames[i] = img;
      loadedCount++;
      if (!ready && loadedCount >= 1) {
        ready = true;
        canvas.classList.add("loaded");
        draw(computeIndex());
      } else if (ready) {
        // if the user is sitting on an index whose frame just arrived, refresh it
        if (computeIndex() === i) draw(i);
        onScroll();
      }
    };
  }
  // stagger decode over idle slices so the main thread stays free
  let cursor = 0;
  function pump(deadline) {
    const slice = deadline ? 4 : 2;
    for (let k = 0; k < slice && cursor < order.length; k++) load(order[cursor++]);
    if (cursor < order.length) {
      if ("requestIdleCallback" in window) requestIdleCallback(pump, { timeout: 1200 });
      else setTimeout(pump, 60);
    }
  }
  const startIo = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      startIo.disconnect();
      pump(null);
    }
  }, { rootMargin: "200px 0px" });
  startIo.observe(section);

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; onScroll(); });
    }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
})();
