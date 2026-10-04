(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const config = window.ARISE_ARC_CONFIG || {};
  const paddleToken = typeof config.clientToken === "string" ? config.clientToken.trim() : "";
  const paddleEnvironment = paddleToken.startsWith("test_") ? "sandbox" : "production";
  const productId = typeof config.productId === "string" ? config.productId : "pro_01m428dqzbege0b6h8gh9rkv72";
  const priceId = typeof config.priceId === "string" ? config.priceId : "pri_01m428fdnrr9rza69pzqf5th0v";
  const basePriceLabel = typeof config.basePriceLabel === "string" ? config.basePriceLabel : "₹199";

  const tokenLooksValid = /^(live_|test_)[A-Za-z0-9_-]{8,}$/.test(paddleToken);
  const tokenConfigured = Boolean(paddleToken && tokenLooksValid);
  const priceLabels = [...document.querySelectorAll("[data-local-price]")];
  const priceNotes = [...document.querySelectorAll("[data-price-note]")];

  const setPrice = (label, note) => {
    priceLabels.forEach((element) => { element.textContent = label; });
    priceNotes.forEach((element) => { element.textContent = note; });
  };

  setPrice(
    basePriceLabel,
    tokenConfigured ? "Loading local currency…" : "Add your Paddle client-side token"
  );

  document.querySelectorAll("[data-purchase-label]").forEach((label) => {
    label.textContent = tokenConfigured ? "Buy the ebook" : "Purchase setup required";
  });

  let paddleReady = false;
  let paddleLoading = null;

  const loadPaddle = () => {
    if (window.Paddle && typeof window.Paddle.Initialize === "function") {
      return Promise.resolve(window.Paddle);
    }

    if (paddleLoading) return paddleLoading;

    paddleLoading = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-paddle-loader]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.Paddle), { once: true });
        existing.addEventListener("error", () => reject(new Error("Paddle.js failed to load.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.dataset.paddleLoader = "true";
      script.onload = () => resolve(window.Paddle);
      script.onerror = () => reject(new Error("Paddle.js failed to load."));
      document.head.appendChild(script);
    });

    return paddleLoading;
  };

  const initializePaddle = async () => {
    if (!tokenConfigured) return false;
    if (paddleReady) return true;

    try {
      const paddle = await loadPaddle();
      if (!paddle || typeof paddle.Initialize !== "function") {
        throw new Error("Paddle.js loaded without Paddle.Initialize.");
      }

      if (paddleEnvironment === "sandbox" && typeof paddle.Environment?.set === "function") {
        paddle.Environment.set("sandbox");
      }

      paddle.Initialize({
        token: paddleToken,
        checkout: {
          settings: {
            displayMode: "overlay",
            theme: "light",
            locale: "en"
          }
        }
      });

      paddleReady = true;

      paddle.PricePreview({
        items: [{ priceId, quantity: 1 }]
      }).then((result) => {
        const item = result?.data?.details?.lineItems?.[0];
        const localizedPrice = item?.formattedTotals?.subtotal;
        const countryCode = result?.data?.details?.address?.countryCode;

        if (!localizedPrice) throw new Error("Paddle returned no localized price.");

        setPrice(
          localizedPrice,
          countryCode ? "Local price · " + countryCode : "Local currency pricing"
        );
      }).catch((error) => {
        console.error("Paddle price preview failed.", error);
        setPrice(basePriceLabel, "Local price unavailable");
      });

      return true;
    } catch (error) {
      console.error("Paddle initialization failed.", error);
      setPrice(basePriceLabel, "Paddle checkout unavailable");
      document.querySelectorAll("[data-purchase-label]").forEach((label) => {
        label.textContent = "Checkout unavailable";
      });
      document.querySelectorAll("[data-purchase-cta], [data-purchase-button]").forEach((control) => {
        control.setAttribute("aria-disabled", "true");
        control.setAttribute("title", "Paddle checkout could not be initialized.");
      });
      return false;
    }
  };

  if (tokenConfigured) {
    initializePaddle();
  }

  const openCheckout = async () => {
    if (!(await initializePaddle())) return false;
    if (!window.Paddle?.Checkout?.open) return false;

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: "overlay",
        theme: "light",
        locale: "en"
      }
    });
    return true;
  };

  document.querySelectorAll("[data-purchase-cta]").forEach((link) => {
    link.removeAttribute("download");
    link.setAttribute("href", "#purchase");
    link.setAttribute("aria-label", "Buy THE ARISE ARC ebook");
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const opened = await openCheckout();
      if (opened) history.replaceState(null, "", "#purchase");
    });
  });

  document.querySelectorAll("[data-purchase-button]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openCheckout();
    });
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

  // The hero cover tracks the mouse with one tiny rAF loop, only while hovered.
  // All geometry is cached on pointerenter, so the frame callback never measures layout.
  document.querySelectorAll("[data-cover-control]").forEach((control) => {
    const book = control.querySelector("[data-cover-tilt]");
    if (!book) return;

    let frame = 0;
    let rect = null;
    let pointerX = 0;
    let pointerY = 0;
    let hovering = false;

    const renderHover = () => {
      frame = 0;
      if (!hovering || !rect) return;

      const x = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width)) - 0.5;
      const y = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height)) - 0.5;
      const baseY = control.dataset.turned === "true" ? 8 : 0;
      const baseX = control.dataset.turned === "true" ? -2 : 0;

      book.style.transform =
        "rotateX(" + (baseX - y * 7).toFixed(2) +
        "deg) rotateY(" + (baseY + x * 10).toFixed(2) +
        "deg) rotateZ(-2deg)";
      book.style.setProperty("--sheen-x", ((x + 0.5) * 100).toFixed(1) + "%");
      book.style.setProperty("--sheen-y", ((y + 0.5) * 100).toFixed(1) + "%");
    };

    const queueHover = () => {
      if (!frame) frame = requestAnimationFrame(renderHover);
    };

    control.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      rect = control.getBoundingClientRect();
      hovering = true;
      book.style.willChange = "transform";
      book.style.transition = "none";
      pointerX = event.clientX;
      pointerY = event.clientY;
      queueHover();
    }, { passive: true });

    control.addEventListener("pointermove", (event) => {
      if (!hovering || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      queueHover();
    }, { passive: true });

    control.addEventListener("pointerleave", () => {
      hovering = false;
      rect = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      book.style.willChange = "auto";
      book.style.transition = "";
      book.style.transform = "rotateX(-2deg) rotateY(" +
        (control.dataset.turned === "true" ? "8deg" : "0deg") + ") rotateZ(-2deg)";
      book.style.removeProperty("--sheen-x");
      book.style.removeProperty("--sheen-y");
    }, { passive: true });

    control.addEventListener("click", () => {
      const turned = control.getAttribute("aria-pressed") !== "true";
      control.dataset.turned = String(turned);
      control.removeAttribute("data-swipe");
      control.setAttribute("aria-pressed", String(turned));

      if (hovering) {
        queueHover();
      }

      const hint = control.closest("[data-cover-stage]")?.querySelector("[data-cover-hint]");
      if (hint && control.classList.contains("cover-control--hero")) {
        hint.textContent = turned
          ? "A new angle. Tap again to return."
          : "Move gently across the cover. The light will follow.";
      }
    });

    // Touch keeps its lightweight swipe/tap behavior without affecting vertical scroll.
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