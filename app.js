(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const supportEmail = "dewifystores@gmail.com";
  const config = window.ARISE_ARC_CONFIG || {};
  const purchaseUrl = typeof config.purchaseUrl === "string" ? config.purchaseUrl.trim() : "";

  const isHttpsUrl = (value) => {
    if (!/^https:\/\/\S+$/i.test(value)) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  };

  const hasPurchaseUrl = Boolean(purchaseUrl && isHttpsUrl(purchaseUrl));
  const purchaseFallback = `mailto:${supportEmail}?subject=${encodeURIComponent("I'd like to purchase THE ARISE ARC")}`;

  document.querySelectorAll("[data-purchase-cta]").forEach((link) => {
    const label = link.querySelector("[data-purchase-label]");
    if (hasPurchaseUrl) {
      link.href = purchaseUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (label) label.textContent = "Get the ebook";
      link.setAttribute("aria-label", "Get THE ARISE ARC ebook; opens the purchase page in a new tab");
    } else {
      link.href = purchaseFallback;
      link.removeAttribute("target");
      link.removeAttribute("rel");
      if (label) label.textContent = link.dataset.defaultLabel || "Ask about the ebook";
      link.setAttribute("aria-label", "Email dewifystores@gmail.com to ask about purchasing THE ARISE ARC");
    }
  });

  document.querySelectorAll("[data-purchase-note]").forEach((note) => {
    if (hasPurchaseUrl) note.hidden = true;
  });

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  const setMenu = (open) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    document.body.classList.toggle("nav-open", open);
  };

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
  document.addEventListener("click", (event) => {
    if (document.body.classList.contains("nav-open") && nav && menuButton && !nav.contains(event.target) && !menuButton.contains(event.target)) {
      setMenu(false);
    }
  });
  window.matchMedia("(min-width: 821px)").addEventListener?.("change", (event) => {
    if (event.matches) setMenu(false);
  });

  const coverHint = document.querySelector("[data-cover-hint]");
  const touchLayout = !finePointer || window.innerWidth <= 620 || navigator.maxTouchPoints > 0;
  if (coverHint && touchLayout) coverHint.textContent = coverHint.dataset.touchCopy || "Swipe lightly to turn the cover.";

  document.querySelectorAll("[data-cover-control]").forEach((control) => {
    const book = control.querySelector("[data-cover-tilt]");
    if (!book) return;

    if (finePointer && !reduceMotion) {
      let frame = 0;
      let pointer = null;
      const renderTilt = () => {
        frame = 0;
        if (!pointer) return;
        const rect = control.getBoundingClientRect();
        const x = clamp((pointer.x - rect.left) / rect.width, 0, 1) - 0.5;
        const y = clamp((pointer.y - rect.top) / rect.height, 0, 1) - 0.5;
        book.style.setProperty("--tilt-x", `${(-y * 7).toFixed(2)}deg`);
        book.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
        book.style.setProperty("--shadow-x", `${(21 + x * 8).toFixed(1)}px`);
        book.style.setProperty("--shadow-y", `${(30 + y * 10).toFixed(1)}px`);
        book.style.setProperty("--sheen-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        book.style.setProperty("--sheen-y", `${((y + 0.5) * 100).toFixed(1)}%`);
        book.style.setProperty("--sheen-opacity", "0.34");
      };

      control.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        pointer = { x: event.clientX, y: event.clientY };
        if (!frame) frame = window.requestAnimationFrame(renderTilt);
      }, { passive: true });

      const resetTilt = () => {
        pointer = null;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        book.style.setProperty("--tilt-x", "0deg");
        book.style.setProperty("--tilt-y", "0deg");
        book.style.setProperty("--shadow-x", "21px");
        book.style.setProperty("--shadow-y", "30px");
        book.style.setProperty("--sheen-opacity", "0.08");
      };
      control.addEventListener("pointerleave", resetTilt, { passive: true });
      control.addEventListener("blur", resetTilt);
    }

    if (!reduceMotion) {
      let touchStart = null;
      let touchPoint = null;
      let touchFrame = 0;
      const renderTouchTilt = () => {
        touchFrame = 0;
        if (!touchStart || !touchPoint) return;
        const dx = touchPoint.x - touchStart.x;
        const dy = touchPoint.y - touchStart.y;
        if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        const rect = control.getBoundingClientRect();
        const positionX = clamp((touchPoint.x - rect.left) / rect.width, 0, 1);
        const positionY = clamp((touchPoint.y - rect.top) / rect.height, 0, 1);
        book.style.setProperty("--tilt-y", `${clamp(dx / rect.width * 25, -13, 13).toFixed(2)}deg`);
        book.style.setProperty("--tilt-x", `${clamp(-dy / rect.height * 8, -4, 4).toFixed(2)}deg`);
        book.style.setProperty("--shadow-x", `${(21 - dx / rect.width * 12).toFixed(1)}px`);
        book.style.setProperty("--shadow-y", `${(30 + dy / rect.height * 9).toFixed(1)}px`);
        book.style.setProperty("--sheen-x", `${(positionX * 100).toFixed(1)}%`);
        book.style.setProperty("--sheen-y", `${(positionY * 100).toFixed(1)}%`);
        book.style.setProperty("--sheen-opacity", "0.3");
      };
      const resetTouchTilt = () => {
        if (touchFrame) window.cancelAnimationFrame(touchFrame);
        touchFrame = 0;
        touchPoint = null;
        book.style.setProperty("--tilt-x", "0deg");
        book.style.setProperty("--tilt-y", "0deg");
        book.style.setProperty("--shadow-x", "21px");
        book.style.setProperty("--shadow-y", "30px");
        book.style.setProperty("--sheen-opacity", "0.08");
      };
      control.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") return;
        touchStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        touchPoint = { x: event.clientX, y: event.clientY };
      }, { passive: true });
      control.addEventListener("pointermove", (event) => {
        if (!touchStart || event.pointerType !== "touch" || event.pointerId !== touchStart.pointerId) return;
        touchPoint = { x: event.clientX, y: event.clientY };
        if (!touchFrame) touchFrame = window.requestAnimationFrame(renderTouchTilt);
      }, { passive: true });
      control.addEventListener("pointerup", (event) => {
        if (!touchStart || event.pointerId !== touchStart.pointerId) return;
        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        const hasTurned = Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy) * 1.2;
        touchStart = null;
        resetTouchTilt();
        if (!hasTurned) return;
        control.dataset.swipe = dx < 0 ? "left" : "right";
        control.dataset.turned = "false";
        control.dataset.suppressClick = "true";
        control.setAttribute("aria-pressed", "true");
        window.setTimeout(() => { delete control.dataset.suppressClick; }, 500);
        if (coverHint && control.classList.contains("cover-control--hero")) {
          coverHint.textContent = "A small turn, by hand. Your vertical scroll stays yours.";
        }
      }, { passive: true });
      control.addEventListener("pointercancel", (event) => {
        if (!touchStart || event.pointerId !== touchStart.pointerId) return;
        touchStart = null;
        resetTouchTilt();
      }, { passive: true });
    }

    control.addEventListener("click", () => {
      if (control.dataset.suppressClick === "true") {
        delete control.dataset.suppressClick;
        return;
      }
      const turned = control.getAttribute("aria-pressed") !== "true";
      delete control.dataset.swipe;
      control.dataset.turned = String(turned);
      control.setAttribute("aria-pressed", String(turned));
      if (coverHint && control.classList.contains("cover-control--hero")) {
        const hint = control.closest("[data-cover-stage]")?.querySelector("[data-cover-hint]");
        coverHint.textContent = turned ? "A new angle. Tap again to return." : (touchLayout ? hint?.dataset.touchCopy : hint?.dataset.pointerCopy) || "Turn the cover at your own pace.";
      }
    });
  });

  const hero = document.querySelector(".hero");
  const giltPoint = hero?.querySelector(".hero-gilt-point");
  if (hero && finePointer && !reduceMotion) {
    let frame = 0;
    let pointer = null;
    const renderAtmosphere = () => {
      frame = 0;
      if (!pointer) return;
      const rect = hero.getBoundingClientRect();
      const px = clamp((pointer.x - rect.left) / rect.width, 0, 1);
      const py = clamp((pointer.y - rect.top) / rect.height, 0, 1);
      const offsetX = (px - 0.5) * 22;
      const offsetY = (py - 0.5) * 16;
      hero.style.setProperty("--halo-x", `${offsetX.toFixed(1)}px`);
      hero.style.setProperty("--halo-y", `${offsetY.toFixed(1)}px`);
      hero.style.setProperty("--product-light-x", `${(-offsetX * 0.45).toFixed(1)}px`);
      hero.style.setProperty("--product-light-y", `${(-offsetY * 0.45).toFixed(1)}px`);

      if (giltPoint) {
        const point = giltPoint.getBoundingClientRect();
        const distance = Math.hypot(pointer.x - (point.left + point.width / 2), pointer.y - (point.top + point.height / 2));
        const proximity = clamp(1 - distance / Math.max(rect.width * 0.42, 1), 0, 1);
        hero.style.setProperty("--gilt-opacity", (0.25 + proximity * 0.65).toFixed(2));
        hero.style.setProperty("--gilt-glow", `${(2 + proximity * 12).toFixed(1)}px`);
      }
    };

    hero.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(renderAtmosphere);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      pointer = null;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      hero.style.setProperty("--halo-x", "0px");
      hero.style.setProperty("--halo-y", "0px");
      hero.style.setProperty("--product-light-x", "0px");
      hero.style.setProperty("--product-light-y", "0px");
      hero.style.setProperty("--gilt-opacity", "0.35");
      hero.style.setProperty("--gilt-glow", "2px");
    }, { passive: true });
  }

  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".button-primary").forEach((button) => {
      let frame = 0;
      let point = null;
      const update = () => {
        frame = 0;
        if (!point) return;
        const rect = button.getBoundingClientRect();
        const x = (point.x - (rect.left + rect.width / 2)) * 0.055;
        const y = (point.y - (rect.top + rect.height / 2)) * 0.055;
        button.style.setProperty("--magnet-x", `${clamp(x, -3, 3).toFixed(1)}px`);
        button.style.setProperty("--magnet-y", `${clamp(y, -2, 2).toFixed(1)}px`);
      };
      button.addEventListener("pointermove", (event) => {
        point = { x: event.clientX, y: event.clientY };
        if (!frame) frame = window.requestAnimationFrame(update);
      }, { passive: true });
      button.addEventListener("pointerleave", () => {
        point = null;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        button.style.setProperty("--magnet-x", "0px");
        button.style.setProperty("--magnet-y", "0px");
      }, { passive: true });
    });

    document.querySelectorAll(".pattern-item summary, .point-note summary, .margin-note summary").forEach((target) => {
      let frame = 0;
      let point = null;
      const render = () => {
        frame = 0;
        if (!point) return;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--proximity-x", `${clamp((point.x - rect.left) / rect.width, 0, 1) * 100}%`);
        target.style.setProperty("--proximity-y", `${clamp((point.y - rect.top) / rect.height, 0, 1) * 100}%`);
      };
      target.addEventListener("pointermove", (event) => {
        point = { x: event.clientX, y: event.clientY };
        if (!frame) frame = window.requestAnimationFrame(render);
      }, { passive: true });
      target.addEventListener("pointerleave", () => {
        point = null;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        target.style.setProperty("--proximity-x", "50%");
        target.style.setProperty("--proximity-y", "50%");
      }, { passive: true });
    });
  }

  document.querySelectorAll(".discovery-group").forEach((group) => {
    group.querySelectorAll("details[data-discovery-item]").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        group.querySelectorAll("details[data-discovery-item][open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
        const index = [...group.querySelectorAll("details[data-discovery-item]")].indexOf(item) + 1;
        group.style.setProperty("--active-note", String(index));
      });
    });
  });

  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const meter = document.querySelector("[data-journey-meter]");
  const stages = [...document.querySelectorAll("[data-scroll-stage]")];
  const visibleStages = new Set();
  let scrollFrame = 0;
  const updateJourney = () => {
    scrollFrame = 0;
    const viewport = Math.max(window.innerHeight, 1);
    const scrollable = Math.max(document.documentElement.scrollHeight - viewport, 1);
    if (meter) meter.style.setProperty("--reading-progress", clamp(window.scrollY / scrollable, 0, 1).toFixed(4));

    visibleStages.forEach((stage) => {
      const rect = stage.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + Math.max(rect.height, 1)), 0, 1);
      stage.style.setProperty("--stage-progress", progress.toFixed(3));
      if (reduceMotion) return;

      if (stage.dataset.scrollStage === "hero") {
        stage.style.setProperty("--hero-depth-y", `${(-progress * 18).toFixed(1)}px`);
        stage.style.setProperty("--hero-depth-scale", (1 - progress * 0.018).toFixed(4));
      } else if (stage.dataset.scrollStage === "book") {
        stage.style.setProperty("--book-depth-y", `${((0.5 - progress) * 16).toFixed(1)}px`);
        stage.style.setProperty("--book-depth-scale", (0.97 + progress * 0.04).toFixed(4));
      } else if (stage.dataset.scrollStage === "purchase") {
        stage.style.setProperty("--purchase-depth-y", `${((1 - progress) * 22).toFixed(1)}px`);
        stage.style.setProperty("--purchase-depth-scale", (0.91 + progress * 0.09).toFixed(4));
        stage.style.setProperty("--purchase-light-level", (0.35 + progress * 0.45).toFixed(2));
      }
    });
  };
  const queueJourneyUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateJourney);
  };

  if ("IntersectionObserver" in window) {
    const stageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleStages.add(entry.target);
        else visibleStages.delete(entry.target);
        entry.target.classList.toggle("is-in-view", entry.isIntersecting);
      });
      queueJourneyUpdate();
    }, { rootMargin: "12% 0px 12% 0px", threshold: 0 });
    stages.forEach((stage) => stageObserver.observe(stage));
  } else {
    stages.forEach((stage) => visibleStages.add(stage));
  }

  window.addEventListener("scroll", queueJourneyUpdate, { passive: true });
  window.addEventListener("resize", queueJourneyUpdate, { passive: true });
  queueJourneyUpdate();

  document.querySelectorAll("[data-purchase-cta]").forEach((cta) => {
    const purchaseStage = cta.closest(".purchase");
    if (!purchaseStage) return;
    const showApproach = () => purchaseStage.setAttribute("data-cta-nearby", "true");
    const resetApproach = () => purchaseStage.removeAttribute("data-cta-nearby");
    cta.addEventListener("pointerenter", showApproach);
    cta.addEventListener("pointerleave", resetApproach);
    cta.addEventListener("focus", showApproach);
    cta.addEventListener("blur", resetApproach);
  });

  const navLinks = [...document.querySelectorAll("[data-nav-link]")];
  const navSections = [...document.querySelectorAll("[data-nav-section]")];
  if ("IntersectionObserver" in window && navSections.length) {
    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const active = link.hash === `#${entry.target.id}`;
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    navSections.forEach((section) => activeObserver.observe(section));
  }

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
