/** One service selection shared by pointer, touch and keyboard. */
export function initServiceGallery() {
  const root = document.querySelector<HTMLElement>('[data-service-gallery]');
  if (!root || root.hasAttribute('data-gallery-ready')) return;
  const cards = [...root.querySelectorAll<HTMLElement>('[data-service-card]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-service-select]')];
  const images = [...root.querySelectorAll<HTMLElement>('[data-service-image]')];
  const mobileDetails = [...root.querySelectorAll<HTMLAnchorElement>('[data-service-mobile-detail]')];
  const full = [...root.querySelectorAll<HTMLElement>('[data-service-full]')];
  const library = root.querySelector<HTMLElement>('[data-service-library]')!;
  const back = root.querySelector<HTMLButtonElement>('[data-service-return]')!;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let active = 0;
  const select = (index: number) => {
    active = index;
    cards.forEach((card, i) => {
      card.toggleAttribute('data-active', i === index);
      const preview = card.querySelector<HTMLElement>('[data-service-preview]')!;
      preview.inert = i !== index;
    });
    buttons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === index)));
    images.forEach((image, i) => image.toggleAttribute('data-active', i === index));
    mobileDetails.forEach((link, i) => link.toggleAttribute('data-active', i === index));
    if (library.hasAttribute('data-expanded')) full.forEach((article, i) => article.toggleAttribute('data-full-active', i === index));
  };
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('focus', () => select(i));
    cards[i].addEventListener('pointerenter', event => {
      if (!fine.matches || event.pointerType !== 'mouse') return;
      // Hover must not conceal the link that currently owns keyboard focus.
      if (document.activeElement?.matches(':focus-visible') && cards.some((card, j) => j !== i && card.contains(document.activeElement))) return;
      select(i);
    });
    button.addEventListener('keydown', event => {
      let next: number | undefined;
      if (event.key === 'ArrowRight') next = (i + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault(); buttons[next].focus();
    });
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-service-more]').forEach(link => {
    link.addEventListener('click', () => {
      const index = Number(link.dataset.serviceMore);
      select(index);
      library.setAttribute('data-expanded', '');
      full.forEach((article, i) => article.toggleAttribute('data-full-active', i === index));
      full[index].focus({ preventScroll: true });
    });
  });
  back.hidden = false;
  back.addEventListener('click', () => {
    library.removeAttribute('data-expanded');
    buttons[active].focus({ preventScroll: true });
    root.scrollIntoView({ block: 'start', behavior: 'instant' });
    history.replaceState(null, '', '#servicios');
  });
  const selectHash = () => {
    const index = cards.findIndex(card => `#${card.id}` === location.hash);
    const detail = full.findIndex(article => `#${article.id}` === location.hash);
    if (index >= 0) select(index);
    if (detail >= 0) {
      select(detail); library.setAttribute('data-expanded', '');
      full.forEach((article, i) => article.toggleAttribute('data-full-active', i === detail));
      full[detail].scrollIntoView({ block: 'start' });
    }
  };
  root.setAttribute('data-gallery-ready', ''); select(0); selectHash();
  window.addEventListener('hashchange', selectHash);
  window.addEventListener('pagehide', event => { if (!event.persisted) window.removeEventListener('hashchange', selectHash); });
}
