(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const config = window.ARISE_ARC_CONFIG || {};
  const paddleToken = typeof config.clientToken === "string" ? config.clientToken.trim() : "";
  const paddleEnvironment = paddleToken.startsWith("test_") ? "sandbox" : "production";
  const productId = typeof config.productId === "string" ? config.productId : "pro_01m428dqzbege0b6h8gh9rkv72";
  const priceId = typeof config.priceId === "string" ? config.priceId : "pri_01m428fdnrr9rza69pzqf5th0v";
  const basePriceLabel = typeof config.basePriceLabel === "string" ? config.basePriceLabel : "₹199";

  const isSafeToken = (value) => /^(live_|test_)[A-Za-z0-9_-]{8,}$/.test(value);
  const canUsePaddle = Boolean(
    paddleToken &&
    isSafeToken(paddleToken) &&
    window.Paddle &&
    typeof window.Paddle.Initialize === "function"
  );

  const priceLabels = [...document.querySelectorAll("[data-local-price]")];
  const priceNotes = [...document.querySelectorAll("[data-price-note]")];
  const setPrice = (label, note) => {
    priceLabels.forEach((element) => { element.textContent = label; });
    priceNotes.forEach((element) => { element.textContent = note; });
  };

  setPrice(
    basePriceLabel,
    canUsePaddle ? "Local currency pricing" : "Add your Paddle client-side token"
  );

  document.querySelectorAll("[data-purchase-label]").forEach((label) => {
    if (!canUsePaddle) label.textContent = "Purchase setup required";
  });
  document.querySelectorAll("[data-purchase-cta], [data-purchase-button]").forEach((control) => {
    if (!canUsePaddle) {
      control.setAttribute("aria-disabled", "true");
      control.setAttribute("title", "Add a Paddle client-side token in site-config.js to enable checkout.");
    }
  });

  let paddleReady = false;

  if (canUsePaddle) {
    try {
      if (paddleEnvironment === "sandbox" && typeof window.Paddle.Environment?.set === "function") {
        window.Paddle.Environment.set("sandbox");
      }

      window.Paddle.Initialize({
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

      window.Paddle.PricePreview({
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
    } catch (error) {
      console.error("Paddle initialization failed.", error);
    }
  }

  const openCheckout = () => {
    if (!paddleReady || !window.Paddle?.Checkout?.open) return false;

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
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (!openCheckout()) {
        setPrice(basePriceLabel, "Checkout setup needed");
        return;
      }
      history.replaceState(null, "", "#purchase");
    });
  });

  document.querySelectorAll("[data-purchase-button]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!openCheckout()) setPrice(basePriceLabel, "Checkout setup needed");
    });
  });

  // Motion-design layer: one pointer rAF drives the cursor lens, hero depth, and magnetic controls.
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (finePointer && !reduceMotion) {
    const cursorFx = document.querySelector(".cursor-fx");
    const hero = document.querySelector(".hero");
    const depthNodes = [...document.querySelectorAll("[data-depth]")].filter((node) => !node.classList.contains("hero-product"));
    const magneticNodes = [...document.querySelectorAll("[data-magnetic]")];

    let motionFrame = 0;
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    let hoverMagnetic = null;

    const renderMotion = () => {
      motionFrame = 0;
      const nx = pointerX / Math.max(1, window.innerWidth) - 0.5;
      const ny = pointerY / Math.max(1, window.innerHeight) - 0.5;

      if (cursorFx) {
        cursorFx.style.transform = "translate3d(" + pointerX.toFixed(1) + "px," + pointerY.toFixed(1) + "px,0)";
      }

      if (hero) {
        hero.style.setProperty("--scene-x", nx.toFixed(4));
        hero.style.setProperty("--scene-y", ny.toFixed(4));
      }

      depthNodes.forEach((node) => {
        const depth = Number(node.dataset.depth) || 0;
        const x = nx * depth;
        const y = ny * depth * 0.72;
        node.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0)";
      });

      if (hoverMagnetic) {
        const rect = hoverMagnetic.getBoundingClientRect();
        const strength = Number(hoverMagnetic.dataset.magnetic) || 0.2;
        const mx = ((pointerX - rect.left) / Math.max(1, rect.width) - 0.5) * 18 * strength;
        const my = ((pointerY - rect.top) / Math.max(1, rect.height) - 0.5) * 14 * strength;
        hoverMagnetic.style.transform = "translate3d(" + mx.toFixed(2) + "px," + my.toFixed(2) + "px,0)";
        hoverMagnetic.classList.add("is-magnetic");
      }
    };

    const queueMotion = () => {
      if (!motionFrame) motionFrame = requestAnimationFrame(renderMotion);
    };

    document.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (cursorFx) cursorFx.classList.add("is-active");
      queueMotion();
    }, { passive: true });

    magneticNodes.forEach((node) => {
      node.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        hoverMagnetic = node;
        node.classList.add("is-magnetic");
        queueMotion();
      }, { passive: true });

      node.addEventListener("pointerleave", () => {
        if (hoverMagnetic === node) hoverMagnetic = null;
        node.style.transform = "";
        node.classList.remove("is-magnetic");
      }, { passive: true });

      node.addEventListener("pointerdown", () => {
        node.classList.remove("motion-click");
        void node.offsetWidth;
        node.classList.add("motion-click");
      }, { passive: true });

      node.addEventListener("animationend", () => node.classList.remove("motion-click"), { passive: true });
    });

    queueMotion();
  }

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