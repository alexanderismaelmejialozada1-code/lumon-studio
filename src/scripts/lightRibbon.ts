/** Decorative local video. Content and the still image never depend on playback. */
export function initLightRibbon() {
  const ribbon = document.querySelector<HTMLElement>('[data-light-ribbon]');
  const hero = ribbon?.closest('section');
  const video = ribbon?.querySelector<HTMLVideoElement>('video');
  const toggle = hero?.querySelector<HTMLButtonElement>('[data-ribbon-toggle]');
  if (!ribbon || !hero || !video || !toggle || ribbon.dataset.initialized) return;
  ribbon.dataset.initialized = 'true';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & {
    connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
  }).connection;
  let manualPaused = false;
  let available = Boolean(video.canPlayType('video/webm; codecs="vp9"'));
  let inView = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;
  let scheduled = 0;
  let disposed = false;
  const constrained = () => Boolean(connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || ''));
  const enabled = () => available && !reduce.matches && !constrained();
  const updateControl = () => {
    const hidden = !enabled() || !ribbon.hasAttribute('data-ready');
    // Preserve the keyboard position when a preference or media error removes the control.
    if (hidden && document.activeElement === toggle) hero.focus({ preventScroll: true });
    toggle.hidden = hidden;
    toggle.setAttribute('aria-pressed', String(manualPaused));
    const label = manualPaused ? 'Reanudar animación de fondo' : 'Pausar animación de fondo';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  };
  const sync = () => {
    if (disposed) return;
    updateControl();
    if (!enabled() || !inView || manualPaused || document.visibilityState === 'hidden') {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      video.src = innerWidth < 768 ? video.dataset.mobileSrc! : video.dataset.desktopSrc!;
      video.muted = true;
    }
    // A browser autoplay policy can decline playback; the still image remains visible.
    void video.play().catch(() => { video.pause(); });
  };
  const onPlaying = () => { ribbon.setAttribute('data-ready', ''); updateControl(); };
  const onError = () => { available = false; ribbon.removeAttribute('data-ready'); updateControl(); };
  const onToggle = () => { manualPaused = !manualPaused; sync(); };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (scheduled) return;
    sync();
  }) : null;
  observer?.observe(hero);
  video.addEventListener('playing', onPlaying);
  video.addEventListener('error', onError);
  toggle.addEventListener('click', onToggle);
  reduce.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  // Give the original logo and text entrance first use of the network and decoder.
  scheduled = window.setTimeout(() => { scheduled = 0; sync(); }, 1250);
  window.addEventListener('pagehide', event => {
    video.pause();
    if (event.persisted) return;
    disposed = true;
    clearTimeout(scheduled);
    observer?.disconnect();
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('error', onError);
    toggle.removeEventListener('click', onToggle);
    reduce.removeEventListener('change', sync);
    connection?.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
}
