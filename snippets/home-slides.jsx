export const HomeSlides = () => {
  const SLIDES = [
    { id: 'overview', label: 'Overview' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'pro-and-enterprise', label: 'Pro and Enterprise' },
  ];
  const LAST = SLIDES.length - 1;
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(0);

  // Where a scroll is *heading*, and when to stop believing it. `activeRef` tracks where the
  // page is, and for the first half of an 800ms smooth scroll that is still the slide being
  // left -- so a second arrow press mid-animation recomputed the same destination and
  // re-issued the same trip, which reads as a keypress the page ignored.
  const targetRef = useRef(-1);
  const targetExpiry = useRef(0);
  const currentIndex = () =>
    (targetRef.current >= 0 && performance.now() < targetExpiry.current ? targetRef.current : activeRef.current);

  const goTo = (index) => {
    const slide = document.getElementById(SLIDES[index].id);
    if (!slide) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetRef.current = index;
    // Cleared on arrival below; this only bounds a trip that never lands.
    targetExpiry.current = performance.now() + 1200;
    slide.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  };

  useEffect(() => {
    const root = document.documentElement;
    const home = document.querySelector('.cr-home');
    if (!home) return;
    const sections = SLIDES.map(slide => document.getElementById(slide.id));
    let frame = 0;
    let headerHeight = 64;
    let wheelTimer;
    let wheelTotal = 0;
    let wheelHandled = false;
    let wheelLockedUntil = 0;

    const updateActive = () => {
      frame = 0;
      let best = 0;
      let visible = -1;
      sections.forEach((section, index) => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const amount = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, headerHeight));
        if (amount > visible) { visible = amount; best = index; }
      });
      activeRef.current = best;
      if (best === targetRef.current) { targetRef.current = -1; targetExpiry.current = 0; }
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    };
    const onResize = () => {
      headerHeight = Math.max(0, Math.round(home.getBoundingClientRect().top + window.scrollY));
      root.style.setProperty('--cr-slide-top', `${headerHeight}px`);
      root.style.setProperty('--cr-slide-height', `${Math.max(240, window.innerHeight - headerHeight)}px`);
      onScroll();
    };
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, video, a, [contenteditable], [role="dialog"], [role="slider"]')) return;
      if (target instanceof Element && target.closest('button') && !target.closest('.cr-slide-dots')) return;
      const current = currentIndex();
      let next;
      if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) next = Math.min(LAST, current + 1);
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) next = Math.max(0, current - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = LAST;
      else return;
      event.preventDefault();
      if (!event.repeat) goTo(next);
    };

    const onWheel = (event) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!window.matchMedia('(min-width: 801px)').matches) return;
      const direction = Math.sign(event.deltaY);
      if (!direction) return;
      // Preserve scrolling inside a code block or another independently scrollable control.
      let target = event.target instanceof Element ? event.target : null;
      while (target && target !== home && target !== document.body) {
        const style = getComputedStyle(target);
        if (/(auto|scroll)/.test(style.overflowY) && target.scrollHeight > target.clientHeight + 1) {
          const room = direction > 0 ? target.scrollTop + target.clientHeight < target.scrollHeight - 1 : target.scrollTop > 1;
          if (room) return;
        }
        target = target.parentElement;
      }
      const current = activeRef.current;
      const rect = sections[current].getBoundingClientRect();
      const withinTallSlide = direction > 0 ? rect.bottom > innerHeight + 2 : rect.top < headerHeight - 2;
      if (!wheelHandled && performance.now() >= wheelLockedUntil && withinTallSlide) return;
      event.preventDefault();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelHandled = false; wheelTotal = 0; }, 180);
      if (wheelHandled || performance.now() < wheelLockedUntil) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.sign(wheelTotal) !== direction) wheelTotal = 0;
      wheelTotal += delta;
      if (Math.abs(wheelTotal) < 36) return;
      const next = Math.max(0, Math.min(LAST, current + direction));
      wheelHandled = true;
      wheelLockedUntil = performance.now() + 700;
      if (next !== current) goTo(next);
    };

    onResize();
    root.classList.add('cr-slides-active');
    setReady(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: false });
    const header = document.getElementById('navbar');
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    if (header && observer) observer.observe(header);
    const hashIndex = SLIDES.findIndex(slide => `#${slide.id}` === window.location.hash);
    if (hashIndex >= 0) requestAnimationFrame(() => goTo(hashIndex));

    return () => {
      root.classList.remove('cr-slides-active');
      root.style.removeProperty('--cr-slide-top');
      root.style.removeProperty('--cr-slide-height');
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(wheelTimer);
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="cr-slide-dots" aria-label="Homepage sections" hidden={!ready}>
      {SLIDES.map((slide, index) => (
        <button key={slide.id} type="button" aria-label={`${index + 1}. ${slide.label}`}
          aria-controls={slide.id} aria-current={active === index ? 'step' : undefined}
          onClick={() => goTo(index)}>
          <span className="cr-slide-dot-label">{slide.label}</span>
          <span className="cr-slide-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
};
