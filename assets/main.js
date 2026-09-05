/* ============================================================
   Ahmad Karim — portfolio animation layer
   Progressive enhancement: this file ADDS all hiding. If it
   never runs, the page is fully visible and static.
   Bails out entirely on prefers-reduced-motion.
   ============================================================ */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;
  if (REDUCED || !hasIO) return; // static page, everything visible

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- smooth scroll (Lenis via CDN, guarded) ---------- */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    document.documentElement.style.scrollBehavior = "auto";
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);

    document.querySelectorAll('a[href*="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return;
        const el = document.querySelector(url.hash);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -64 });
        history.pushState(null, "", url.hash);
      });
    });
  }

  /* ---------- reveal plumbing ---------- */
  const reveal = (el, delay) => setTimeout(() => el.classList.add("in"), delay || 0);

  /* ---------- hero entrance: masked name + staggered copy ---------- */
  const h1 = document.querySelector(".hero h1");
  if (h1) {
    const inner = document.createElement("span");
    inner.className = "mask-line";
    while (h1.firstChild) inner.appendChild(h1.firstChild);
    const wrap = document.createElement("span");
    wrap.className = "mask-wrap";
    wrap.appendChild(inner);
    h1.textContent = "";
    h1.appendChild(wrap);
    requestAnimationFrame(() => h1.classList.add("in-mask"));
  }

  const heroItems = document.querySelectorAll(".hero .anim[data-anim]");
  heroItems.forEach((el, i) => {
    el.classList.add("pre");
    reveal(el, 320 + i * 120);
  });

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      reveal(el, (parseInt(el.dataset.delay, 10) || 0) * 100);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".anim[data-anim]").forEach((el) => {
    if (el.closest(".hero")) return;
    el.classList.add("pre");
    io.observe(el);
  });

  /* ---------- word-by-word mask on section headings ---------- */
  document.querySelectorAll(".section-head h2").forEach((h2) => {
    const words = h2.textContent.trim().split(/\s+/);
    h2.textContent = "";
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word pre";
      s.textContent = w;
      h2.appendChild(s);
      if (i < words.length - 1) h2.appendChild(document.createTextNode(" "));
    });
  });
  const ioW = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll(".word").forEach((w, i) => {
        setTimeout(() => w.classList.add("in"), i * 45);
      });
      ioW.unobserve(en.target);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".section-head h2").forEach((h2) => ioW.observe(h2));

  /* ---------- count-up stats ---------- */
  const stats = document.querySelector(".stats");
  if (stats) {
    const ioC = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.querySelectorAll("[data-count]").forEach((el) => {
          const target = parseInt(el.dataset.count, 10);
          const dur = 1300;
          const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            el.textContent = Math.round(easeOut(p) * target);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        ioC.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    ioC.observe(stats);
  }

  /* ---------- terminal typing (data-type blocks) ---------- */
  function buildSegments(lineEl) {
    const segs = [];
    lineEl.childNodes.forEach((n) => {
      if (n.nodeType === 3) { if (n.textContent) segs.push({ text: n.textContent, cls: null }); }
      else if (n.nodeType === 1) segs.push({ text: n.textContent, cls: n.className });
    });
    return segs;
  }

  function typeTerm(term) {
    if (term.dataset.typed) return;
    term.dataset.typed = "1";
    const original = Array.from(term.children).map(buildSegments);
    term.innerHTML = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "▌";
    let li = 0;

    (function typeLine() {
      if (li >= original.length) return;
      const segs = original[li];
      const line = document.createElement("div");
      if (segs.every((s) => !s.text.trim())) {
        line.innerHTML = "&nbsp;";
        term.appendChild(line);
        li++;
        setTimeout(typeLine, 130);
        return;
      }
      const spans = segs.map((s) => {
        const sp = document.createElement("span");
        if (s.cls) sp.className = s.cls;
        line.appendChild(sp);
        return { el: sp, text: s.text };
      });
      line.appendChild(caret);
      term.appendChild(line);
      let si = 0, ci = 0;
      (function step() {
        if (si >= spans.length) {
          caret.remove();
          li++;
          setTimeout(typeLine, 160);
          return;
        }
        const cur = spans[si];
        ci++;
        cur.el.textContent = cur.text.slice(0, ci);
        if (ci >= cur.text.length) { si++; ci = 0; }
        setTimeout(step, 9 + Math.random() * 16);
      })();
    })();
  }

  const ioT = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      typeTerm(en.target);
      ioT.unobserve(en.target);
    });
  }, { threshold: 0.3 });

  document.querySelectorAll("[data-type]").forEach((t) => {
    if (t.closest(".hero")) setTimeout(() => typeTerm(t), 1000);
    else ioT.observe(t);
  });
})();
