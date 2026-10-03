(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const ebookUrl = "./The_Arise_Arc_Ebook.pdf";
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

  // Free for now. A future HTTPS checkout can take over these same links.
  const usingCheckout = Boolean(futurePurchaseUrl && isSafeHttps(futurePurchaseUrl));
  const ctaUrl = usingCheckout ? futurePurchaseUrl : ebookUrl;

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

  // Mobile navigation.
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
  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  // The cover remains tactile without a per-frame pointer animation.
  document.querySelectorAll("[data-cover-control]").forEach((control) => {
    const book = control.querySelector("[data-cover-tilt]");
    if (!book) return;

    control.addEventListener("click", () => {
      const turned = control.getAttribute("aria-pressed") !== "true";
      control.dataset.turned = String(turned);
      control.removeAttribute("data-swipe");
      control.setAttribute("aria-pressed", String(turned));

      const hint = control.closest("[data-cover-stage]")?.querySelector("[data-cover-hint]");
      if (hint && control.classList.contains("cover-control--hero")) {
        hint.textContent = turned
          ? "A new angle. Tap again to return."
          : "Move gently across the cover. The light will follow.";
      }
    });

    // Lightweight swipe recognition: no live dragging and no rAF.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let startX = 0;
      let startY = 0;
      let pointerId = null;

      control.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") return;
        startX = event.clientX;
        startY = event.clientY;
        pointerId = event.pointerId;
      }, { passive: true });

      control.addEventListener("pointerup", (event) => {
        if (pointerId !== event.pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        pointerId = null;
        if (Math.abs(dx) < 24 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

        control.dataset.swipe = dx < 0 ? "left" : "right";
        control.dataset.turned = "true";
        control.setAttribute("aria-pressed", "true");
        setTimeout(() => control.removeAttribute("data-swipe"), 260);
      }, { passive: true });

      control.addEventListener("pointercancel", () => {
        pointerId = null;
      }, { passive: true });
    }
  });

  // Only run reveal work once per element.
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -12px 0px" });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Keep each discovery group tidy without any global pointer/scroll work.
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

  // Highlight the active primary destination only when a section actually enters view.
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
    }, { rootMargin: "-25% 0px -65% 0px", threshold: 0 });

    navSections.forEach((section) => activeObserver.observe(section));
  }

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();