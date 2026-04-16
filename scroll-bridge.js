(function initScrollBridge() {
  const selectors = [
    ".nav-tabs",
    ".sidebar-card",
    ".panel--main .content-card",
    ".dashboard-scroll-list",
  ];

  const bindScrollBridge = () => {
    document.querySelectorAll(selectors.join(", ")).forEach((element) => {
      if (element.dataset.scrollBridgeBound === "true") {
        return;
      }

      element.dataset.scrollBridgeBound = "true";
      element.addEventListener(
        "wheel",
        (event) => {
          if (!canElementScroll(element)) {
            return;
          }

          const scrollingDown = event.deltaY > 0;
          const scrollingUp = event.deltaY < 0;
          const atTop = element.scrollTop <= 0;
          const atBottom =
            element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

          if ((scrollingDown && atBottom) || (scrollingUp && atTop)) {
            event.preventDefault();
            event.stopPropagation();
            window.scrollBy({
              top: event.deltaY,
              left: event.deltaX,
              behavior: "auto",
            });
          }
        },
        { passive: false }
      );
    });
  };

  const canElementScroll = (element) => {
    const styles = window.getComputedStyle(element);
    const overflowY = styles.overflowY;
    return (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindScrollBridge, { once: true });
    return;
  }

  bindScrollBridge();
})();
