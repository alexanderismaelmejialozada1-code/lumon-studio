/** A fixed-size phrase track with static alternatives and no live-region churn. */
export function initRotatingPhrases() {
  const root = document.querySelector<HTMLElement>('[data-hero-rotator]');
  const hero = root?.closest<HTMLElement>('.hero');
  const phrases = root ? [...root.querySelectorAll<HTMLElement>('[data-hero-phrase]')] : [];
  if (!root || !hero || phrases.length < 2 || root.hasAttribute('data-phrases-ready')) return;
  root.setAttribute('data-phrases-ready', '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease').trim();
  let index = 0, timer = 0, generation = 0;
  let animation: Animation | null = null;
  const rect = root.getBoundingClientRect();
  let visible = rect.top < innerHeight && rect.bottom > 0;
  const allowed = () => !reduce.matches && visible && document.visibilityState !== 'hidden';
  const stop = () => { clearTimeout(timer); timer = 0; generation++; animation?.cancel(); animation = null; };
  const render = (next: number) => { index = next; phrases.forEach((phrase, i) => phrase.toggleAttribute('data-current', i === index)); };
  const updateState = () => { root.dataset.phraseState = reduce.matches ? 'static' : allowed() ? 'playing' : 'paused'; };
  const schedule = () => { if (allowed() && !timer) timer = window.setTimeout(rotate, 3600); updateState(); };
  const transition = async (phrase: HTMLElement, frames: Keyframe[], duration: number) => {
    if (typeof phrase.animate !== 'function') return;
    animation = phrase.animate(frames, { duration, easing });
    await animation.finished;
    animation = null;
  };
  const rotate = async () => {
    timer = 0;
    if (!allowed()) { stop(); updateState(); return; }
    const currentGeneration = generation;
    try {
      await transition(phrases[index], [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], 160);
      if (currentGeneration !== generation || !allowed()) return;
      render((index + 1) % phrases.length);
      await transition(phrases[index], [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 300);
      if (currentGeneration === generation) schedule();
    } catch { /* Interrupted transitions restore CSS-visible text and never reject globally. */ }
  };
  const refresh = () => { stop(); if (reduce.matches) render(0); schedule(); };
  const onVisibility = () => refresh();
  const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) refresh(); };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    const next = entries[0].isIntersecting;
    if (visible !== next) { visible = next; refresh(); }
  }) : null;
  observer?.observe(root);
  reduce.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  schedule();
  window.addEventListener('pagehide', event => {
    stop();
    if (event.persisted) return;
    observer?.disconnect();
    reduce.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
  });
}
