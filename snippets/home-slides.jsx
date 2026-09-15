// Slides are a desktop presentation. Below this query the page is a plain document: on a
// phone the sections are taller than the screen, and `scroll-snap-stop: always` together with
// a slide height pinned to `innerHeight` (which moves every time the address bar collapses)
// made each flick re-snap mid-scroll.
export const HomeSlides = () => {
  const SLIDE_MEDIA = '(min-width: 801px) and (hover: hover)';
  const SLIDES = [
    { id: 'overview', label: 'Overview' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'updates', label: 'What comes next' },
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

  // Scrolling is the browser's: `scroll-snap-type` in style.css does the snapping, for wheel,
  // trackpad and touch alike. This adds keyboard navigation and the dots, and tracks which
  // section is in view. Nothing here intercepts a scroll -- a wheel handler that stepped one
  // slide per gesture fought every scroll it did not recognise.
  useEffect(() => {
    const root = document.documentElement;
    const home = document.querySelector('.cr-home');
    if (!home) return;
    const sections = SLIDES.map(slide => document.getElementById(slide.id));
    let frame = 0;
    let headerHeight = 64;
    const media = window.matchMedia(SLIDE_MEDIA);

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
      if (media.matches) {
        root.style.setProperty('--cr-slide-top', `${headerHeight}px`);
        root.style.setProperty('--cr-slide-height', `${Math.max(240, window.innerHeight - headerHeight)}px`);
      }
      onScroll();
    };
    const onKeyDown = (event) => {
      if (!media.matches) return;
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

    const applyMedia = () => {
      if (media.matches) {
        onResize();
        root.classList.add('cr-slides-active');
      } else {
        root.classList.remove('cr-slides-active');
        root.style.removeProperty('--cr-slide-top');
        root.style.removeProperty('--cr-slide-height');
      }
      setReady(media.matches);
    };
    applyMedia();
    media.addEventListener('change', applyMedia);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
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
      media.removeEventListener('change', applyMedia);
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
