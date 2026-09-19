/** Section-aware navigation, independent of decorative project motion. */
export function initSurfaceMotion() {
  const main = document.querySelector('main');
  if (!main || main.hasAttribute('data-surface-enhanced')) return;
  main.setAttribute('data-surface-enhanced', '');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Principal"] a')];
  const ratios = new Map<Element, number>();
  const navigation = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
    const current = [...ratios].filter(([, ratio]) => ratio > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
    links.forEach(link => {
      if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-18% 0px -55% 0px', threshold: [0, .01, .1, .25, .5, 1] }) : null;
  links.forEach(link => { const section = document.getElementById(link.hash.slice(1)); if (section) navigation?.observe(section); });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    navigation?.disconnect();
  });
}
