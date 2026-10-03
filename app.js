(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ebookUrl = "./The_Arise_Arc_Ebook.pdf";
  const supportEmail = "dewifystores@gmail.com";
  const config = window.ARISE_ARC_CONFIG || {};
  const futurePurchaseUrl = typeof config.purchaseUrl === "string" ? config.purchaseUrl.trim() : "";
  const isSafeHttps = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
    } catch {
      return false;
    }
  };

  // Free for now. A future HTTPS checkout can take over this same CTA.
  const ctaUrl = futurePurchaseUrl && isSafeHttps(futurePurchaseUrl) ? futurePurchaseUrl : ebookUrl;
  const usingCheckout = ctaUrl !== ebookUrl;

  document.querySelectorAll("[data-purchase-cta]").forEach((link) => {
    link.href = ctaUrl;
    if (usingCheckout) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.removeAttribute("download");
      link.setAttribute("aria-label", "Get THE ARISE ARC ebook; opens the purchase page in a new tab");
    } else {
      link.setAttribute("download", "");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.setAttribute("aria-label", "Download the free THE ARISE ARC ebook");
    }
    const label = link.querySelector("[data-purchase-label]");
    if (label) label.textContent = usingCheckout ? "Get the ebook" : "Download the free ebook";
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
    if (document.body.classList.contains("nav-open") && nav && menuButton &&
        !nav.contains(event.target) && !menuButton.contains(event.target)) {
      setMenu(false);
    }
  });
  window.matchMedia("(min-width: 821px)").addEventListener?.("change", (event) => {
    if (event.matches) setMenu(false);
  });

  // Covers: one lightweight rAF per actively used cover.
  document.querySelectorAll("[data-cover-control]").forEach((control) => {
    const book = control.querySelector("[data-cover-tilt]");
    if (!book) return;

    if (finePointer && !reduceMotion) {
      let frame = 0;
      let point = null;
      const render = () => {
        frame = 0;
        if (!point) return;
        const rect = control.getBoundingClientRect();
        const x = clamp((point.x - rect.left) / rect.width, 0, 1) - 0.5;
        const y = clamp((point.y - rect.top) / rect.height, 0, 1) - 0.5;
        book.style.setProperty("--tilt-x", (-y * 7).toFixed(2) + "deg");
        book.style.setProperty("--tilt-y", (x * 10).toFixed(2) + "deg");
        book.style.setProperty("--shadow-x", (20 + x * 7).toFixed(1) + "px");
        book.style.setProperty("--shadow-y", (27 + y * 8).toFixed(1) + "px");
        book.style.setProperty("--sheen-x", ((x + 0.5) * 100).toFixed(1) + "%");
        book.style.setProperty("--sheen-y", ((y + 0.5) * 100).toFixed(1) + "%");
        book.style.setProperty("--sheen-opacity", "0.30");
      };
      const reset = () => {
        point = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        book.style.setProperty("--tilt-x", "0deg");
        book.style.setProperty("--tilt-y", "0deg");
        book.style.setProperty("--shadow-x", "20px");
        book.style.setProperty("--shadow-y", "27px");
        book.style.setProperty("--sheen-opacity", "0.08");
      };
      control.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        point = { x: event.clientX, y: event.clientY };
        if (!frame) frame = requestAnimationFrame(render);
      }, { passive: true });
      control.addEventListener("pointerleave", reset, { passive: true });
    }

    if (!reduceMotion) {
      let start = null;
      const resetTouch = () => {
        start = null;
        book.style.setProperty("--tilt-x", "0deg");
        book.style.setProperty("--tilt-y", "0deg");
        book.style.setProperty("--shadow-x", "20px");
        book.style.setProperty("--shadow-y", "27px");
        book.style.setProperty("--sheen-opacity", "0.08");
      };
      control.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") start = { x: event.clientX, y: event.clientY, id: event.pointerId };
      }, { passive: true });
      control.addEventListener("pointerup", (event) => {
        if (!start || event.pointerId !== start.id) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const turned = Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy) * 1.2;
        resetTouch();
        if (!turned) return;
        control.dataset.swipe = dx < 0 ? "left" : "right";
        control.dataset.suppressClick = "true";
        control.setAttribute("aria-pressed", "true");
        setTimeout(() => delete control.dataset.suppressClick, 450);
      }, { passive: true });
      control.addEventListener("pointercancel", (event) => {
        if (start && event.pointerId === start.id) resetTouch();
      }, { passive: true });
    }

    control.addEventListener("click", () => {
      if (control.dataset.suppressClick === "true") {
        delete control.dataset.suppressClick;
        return;
      }
      const turned = control.getAttribute("aria-pressed") !== "true";
      control.dataset.turned = String(turned);
      control.removeAttribute("data-swipe");
      control.setAttribute("aria-pressed", String(turned));
      const hint = control.closest("[data-cover-stage]")?.querySelector("[data-cover-hint]");
      if (hint && control.classList.contains("cover-control--hero")) {
        hint.textContent = turned ? "A new angle. Tap again to return." :
          "Move gently across the cover. The light will follow.";
      }
    });
  });

  // Hero lighting only runs while the pointer is actually over the hero.
  const hero = document.querySelector(".hero");
  if (hero && finePointer && !reduceMotion) {
    const point = hero.querySelector(".hero-gilt-point");
    let frame = 0;
    let pointer = null;
    const render = () => {
      frame = 0;
      if (!pointer) return;
      const rect = hero.getBoundingClientRect();
      const x = (pointer.x - rect.left) / Math.max(rect.width, 1) - 0.5;
      const y = (pointer.y - rect.top) / Math.max(rect.height, 1) - 0.5;
      hero.style.setProperty("--halo-x", (x * 22).toFixed(1) + "px");
      hero.style.setProperty("--halo-y", (y * 16).toFixed(1) + "px");
      hero.style.setProperty("--product-light-x", (-x * 10).toFixed(1) + "px");
      hero.style.setProperty("--product-light-y", (-y * 7).toFixed(1) + "px");
      if (point) {
        const p = point.getBoundingClientRect();
        const distance = Math.hypot(pointer.x - (p.left + p.width / 2), pointer.y - (p.top + p.height / 2));
        const proximity = clamp(1 - distance / Math.max(rect.width * 0.42, 1), 0, 1);
        hero.style.setProperty("--gilt-opacity", (0.25 + proximity * 0.65).toFixed(2));
        hero.style.setProperty("--gilt-glow", (2 + proximity * 10).toFixed(1) + "px");
      }
    };
    hero.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(render);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      pointer = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      hero.style.setProperty("--halo-x", "0px");
      hero.style.setProperty("--halo-y", "0px");
      hero.style.setProperty("--product-light-x", "0px");
      hero.style.setProperty("--product-light-y", "0px");
      hero.style.setProperty("--gilt-opacity", "0.35");
      hero.style.setProperty("--gilt-glow", "2px");
    }, { passive: true });
  }

  // One delegated pointer effect covers all magnetic/proximity UI.
  if (finePointer && !reduceMotion) {
    let frame = 0;
    let lastPoint = null;
    let activeButton = null;
    const render = () => {
      frame = 0;
      if (!lastPoint || !activeButton) return;
      const rect = activeButton.getBoundingClientRect();
      if (activeButton.matches(".button-primary")) {
        const x = clamp((lastPoint.x - (rect.left + rect.width / 2)) * 0.055, -3, 3);
        const y = clamp((lastPoint.y - (rect.top + rect.height / 2)) * 0.055, -2, 2);
        activeButton.style.setProperty("--magnet-x", x.toFixed(1) + "px");
        activeButton.style.setProperty("--magnet-y", y.toFixed(1) + "px");
      } else {
        activeButton.style.setProperty("--proximity-x", clamp((lastPoint.x - rect.left) / rect.width, 0, 1) * 100 + "%");
        activeButton.style.setProperty("--proximity-y", clamp((lastPoint.y - rect.top) / rect.height, 0, 1) * 100 + "%");
      }
    };
    const handleMove = (event) => {
      const target = event.target.closest(".button-primary, .pattern-item summary, .point-note summary");
      if (!target) {
        if (activeButton) {
          activeButton.style.removeProperty("--magnet-x");
          activeButton.style.removeProperty("--magnet-y");
          activeButton.style.removeProperty("--proximity-x");
          activeButton.style.removeProperty("--proximity-y");
        }
        activeButton = null;
        return;
      }
      activeButton = target;
      lastPoint = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(render);
    };
    document.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerout", (event) => {
      if (activeButton && !event.relatedTarget?.closest?.(".button-primary, .pattern-item summary, .point-note summary")) {
        activeButton.style.removeProperty("--magnet-x");
        activeButton.style.removeProperty("--magnet-y");
        activeButton.style.removeProperty("--proximity-x");
        activeButton.style.removeProperty("--proximity-y");
        activeButton = null;
      }
    }, { passive: true });
  }

  // Only one discovery item stays open within each group.
  document.querySelectorAll(".discovery-group").forEach((group) => {
    group.querySelectorAll("details[data-discovery-item]").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        group.querySelectorAll("details[data-discovery-item][open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
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
    }, { threshold: 0.12, rootMargin: "0px 0px -20px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Scroll work is one rAF and only touches the two stages that actually use it.
  const meter = document.querySelector("[data-journey-meter]");
  const heroStage = document.querySelector('[data-scroll-stage="hero"]');
  const purchaseStage = document.querySelector('[data-scroll-stage="purchase"]');
  let scrollFrame = 0;
  const updateScrollEffects = () => {
    scrollFrame = 0;
    const viewport = Math.max(window.innerHeight, 1);
    const scrollable = Math.max(document.documentElement.scrollHeight - viewport, 1);
    if (meter) meter.style.setProperty("--reading-progress", clamp(window.scrollY / scrollable, 0, 1).toFixed(4));

    if (reduceMotion) return;
    if (heroStage) {
      const rect = heroStage.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + Math.max(rect.height, 1)), 0, 1);
      heroStage.style.setProperty("--hero-depth-y", (-progress * 18).toFixed(1) + "px");
      heroStage.style.setProperty("--hero-depth-scale", (1 - progress * 0.018).toFixed(4));
    }
    if (purchaseStage) {
      const rect = purchaseStage.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + Math.max(rect.height, 1)), 0, 1);
      purchaseStage.style.setProperty("--purchase-depth-y", ((1 - progress) * 22).toFixed(1) + "px");
      purchaseStage.style.setProperty("--purchase-depth-scale", (0.91 + progress * 0.09).toFixed(4));
      purchaseStage.style.setProperty("--purchase-light-level", (0.35 + progress * 0.45).toFixed(2));
    }
  };
  const queueScrollEffects = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollEffects);
  };
  window.addEventListener("scroll", queueScrollEffects, { passive: true });
  window.addEventListener("resize", queueScrollEffects, { passive: true });
  queueScrollEffects();

  // Purchase-stage highlight is pointer/focus driven, never a permanent loop.
  document.querySelectorAll("[data-purchase-cta]").forEach((cta) => {
    const stage = cta.closest(".purchase");
    if (!stage) return;
    const on = () => stage.setAttribute("data-cta-nearby", "true");
    const off = () => stage.removeAttribute("data-cta-nearby");
    cta.addEventListener("pointerenter", on, { passive: true });
    cta.addEventListener("pointerleave", off, { passive: true });
    cta.addEventListener("focus", on);
    cta.addEventListener("blur", off);
  });

  const navLinks = [...document.querySelectorAll("[data-nav-link]")];
  const navSections = [...document.querySelectorAll("[data-nav-section]")];
  if ("IntersectionObserver" in window && navSections.length) {
    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const active = link.hash === "#" + entry.target.id;
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