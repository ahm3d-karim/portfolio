/* v3 motion additions: blur-in reveals, tilt parallax, sweep statements.
   All progressive enhancement, gated on html.js, bails on reduced motion. */
(() => {
  "use strict";
  if (document.documentElement.classList.contains("js-nomotion")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  /* blur-in: mark all prose blocks, section heads, cards */
  const blurables = document.querySelectorAll(
    ".section-head, .flagship-info, .tool, .archive-item, .case-row, .machine-inner"
  );
  blurables.forEach((el) => {
    el.setAttribute("data-blur", "");
    el.classList.add("pre-b");
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
  document.querySelectorAll("[data-blur]").forEach((el) => io.observe(el));

  /* sweep statements: split h2 into words, ink them in sequence */
  document.querySelectorAll("h2[data-sweep]").forEach((h2) => {
    const words = h2.textContent.trim().split(/\s+/);
    h2.textContent = "";
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "sw";
      s.textContent = w;
      h2.appendChild(s);
      if (i < words.length - 1) h2.appendChild(document.createTextNode(" "));
    });
  });
  const ioS = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const h2 = en.target;
      h2.querySelectorAll(".sw").forEach((w, i) => {
        w.style.transitionDelay = `${i * 55}ms`;
      });
      h2.classList.add("in");
      ioS.unobserve(h2);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll("h2[data-sweep]").forEach((h2) => ioS.observe(h2));

  /* tilt + parallax on flagship media (pointer-fine only) */
  const fine = window.matchMedia("(pointer: fine)").matches;
  const media = document.querySelectorAll("[data-tilt]");
  if (fine && media.length) {
    let vh = window.innerHeight;
    window.addEventListener("resize", () => { vh = window.innerHeight; }, { passive: true });
    const update = () => {
      media.forEach((el) => {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - vh / 2;
        const par = parseFloat(el.dataset.speed) || 0;
        const tilt = parseFloat(el.dataset.tilt) || 0;
        el.style.transform = `perspective(900px) rotate(${tilt}deg) translateY(${(-mid * par).toFixed(1)}px)`;
      });
    };
    let tick = false;
    window.addEventListener("scroll", () => {
      if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; update(); }); }
    }, { passive: true });
    update();
  }
})();
