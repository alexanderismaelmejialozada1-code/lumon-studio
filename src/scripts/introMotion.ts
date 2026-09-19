/** Finite typography entrance; readable defaults and immediate keyboard access. */
export function initIntroMotion() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const statement = document.querySelector<HTMLElement>('.statement');
  const statementHeading = statement?.querySelector('h2');
  if (!hero || hero.dataset.motionInitialized) return;
  hero.dataset.motionInitialized = 'true';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const tokens = getComputedStyle(document.documentElement);
  const easing = tokens.getPropertyValue('--ease').trim();
  const animations = new Set<Animation>();
  let statementRevealed = false;
  const animate = (element: Element | null, frames: Keyframe[], duration: number, delay = 0) => {
    if (!element || typeof element.animate !== 'function' || reduce.matches || document.visibilityState === 'hidden') return;
    const animation = element.animate(frames, { duration, delay, easing });
    animations.add(animation);
    const forget = () => animations.delete(animation);
    animation.finished.then(forget, forget);
    return animation;
  };
  const cancel = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
  const showStatement = () => {
    if (!statement || statementRevealed) return;
    statementRevealed = true; statement.dataset.revealed = 'true';
    statement.querySelectorAll('[data-statement-line]').forEach((line, index) => {
      animate(line, [{ opacity: .72, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], 600, index * 80);
    });
  };
  const statementObserver = statementHeading && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { showStatement(); statementObserver?.disconnect(); }
  }, { threshold: .15 }) : null;
  if (statementHeading && statementObserver) statementObserver.observe(statementHeading);
  else showStatement();
  const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) cancel();
  }) : null;
  visibilityObserver?.observe(hero);
  const rect = hero.getBoundingClientRect();
  if (rect.top < innerHeight && rect.bottom > 0 && !reduce.matches && document.visibilityState !== 'hidden') {
    const enter = (name: string, opacity: number, y: number, duration: number, delay: number) => animate(
      hero.querySelector(`[data-intro="${name}"]`), [{ opacity, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], duration, delay);
    enter('eyebrow', .72, 8, 460, 0);
    const lines = hero.querySelectorAll('.hero-title-line');
    if (innerWidth >= 768 && lines.length) lines.forEach((line, index) => animate(line,
      [{ opacity: .85, transform: 'translateY(105%)' }, { opacity: 1, transform: 'none' }], 700, 50 + index * 70));
    else enter('title', .8, 12, 700, 50);
    enter('copy', .84, 10, 580, 110); enter('actions', 1, 8, 520, 170); enter('microcopy', .85, 6, 520, 210);
  }
  const onPreference = () => { if (reduce.matches) { cancel(); showStatement(); statementObserver?.disconnect(); } };
  const onVisibility = () => { if (document.visibilityState === 'hidden') cancel(); };
  hero.addEventListener('focusin', cancel);
  reduce.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', event => {
    cancel();
    if (event.persisted) return;
    statementObserver?.disconnect(); visibilityObserver?.disconnect();
    hero.removeEventListener('focusin', cancel); reduce.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility);
  });
}
