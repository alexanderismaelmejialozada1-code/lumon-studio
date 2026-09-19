/** Finite reveal and event-driven laptop tilt; no continuous render loop. */
export function initProjectMotion() {
  const root = document.querySelector<HTMLElement>('[data-onyx-project]');
  const visual = root?.querySelector<HTMLElement>('[data-project-visual]');
  const laptop = root?.querySelector<HTMLElement>('[data-project-laptop]');
  if (!root || !visual || !laptop || root.hasAttribute('data-project-ready')) return;
  root.setAttribute('data-project-ready', '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease').trim();
  const animations = new Set<Animation>();
  let visible = false, revealed = false, frame = 0, pointerX = 0, pointerY = 0;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const cancel = () => { animations.forEach(a => a.cancel()); animations.clear(); cancelAnimationFrame(frame); frame = 0; };
  const clear = () => { ['--laptop-y', '--laptop-x', '--laptop-turn'].forEach(name => laptop.style.removeProperty(name)); };
  const paint = () => {
    frame = 0;
    if (!visible || reduce.matches || document.hidden) return;
    const rect = visual.getBoundingClientRect();
    const progress = clamp((rect.top + rect.height / 2 - innerHeight / 2) / ((innerHeight + rect.height) / 2));
    laptop.style.setProperty('--laptop-y', `${(progress * -10).toFixed(2)}px`);
    laptop.style.setProperty('--laptop-x', `${(8 + progress * 2 - pointerY * 3).toFixed(2)}deg`);
    laptop.style.setProperty('--laptop-turn', `${(-12 + progress * 2 + pointerX * 4).toFixed(2)}deg`);
  };
  const schedule = () => { if (!frame && visible && !reduce.matches && !document.hidden) frame = requestAnimationFrame(paint); };
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (reduce.matches || document.hidden) return;
    const copy = [...root.querySelectorAll<HTMLElement>('[data-project-reveal]')];
    const entrance = root.querySelector<HTMLElement>('[data-laptop-entrance]');
    const enter = (element: HTMLElement, distance: number, duration: number, delay: number) => {
      if (typeof element.animate !== 'function') return;
      const animation = element.animate([{ opacity: .8, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'none' }], { duration, delay, easing: ease });
      animations.add(animation);
      const forget = () => animations.delete(animation);
      animation.finished.then(forget, forget);
    };
    copy.forEach((element, i) => enter(element, 12, 500, i * 55));
    if (entrance) enter(entrance, 22, 700, 80);
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { reveal(); schedule(); } else { pointerX = 0; pointerY = 0; cancel(); clear(); }
  }, { threshold: .08 }) : null;
  const move = (event: PointerEvent) => {
    if (!fine.matches || event.pointerType !== 'mouse' || reduce.matches) return;
    const rect = visual.getBoundingClientRect();
    pointerX = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
    pointerY = clamp((event.clientY - rect.top) / rect.height * 2 - 1); schedule();
  };
  const leave = () => { pointerX = 0; pointerY = 0; schedule(); };
  const preference = () => { pointerX = 0; pointerY = 0; cancel(); clear(); schedule(); };
  const visibility = () => { if (document.hidden) { cancel(); clear(); } else schedule(); };
  const focus = () => { pointerX = 0; pointerY = 0; cancel(); clear(); };
  observer?.observe(visual);
  if (!observer) { visible = true; reveal(); schedule(); }
  visual.addEventListener('pointermove', move, { passive: true });
  visual.addEventListener('pointerleave', leave);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reduce.addEventListener('change', preference); fine.addEventListener('change', preference);
  document.addEventListener('visibilitychange', visibility); root.addEventListener('focusin', focus);
  window.addEventListener('pagehide', event => {
    cancel(); clear();
    if (event.persisted) return;
    observer?.disconnect(); visual.removeEventListener('pointermove', move); visual.removeEventListener('pointerleave', leave);
    window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
    reduce.removeEventListener('change', preference); fine.removeEventListener('change', preference);
    document.removeEventListener('visibilitychange', visibility); root.removeEventListener('focusin', focus);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) schedule(); });
}
