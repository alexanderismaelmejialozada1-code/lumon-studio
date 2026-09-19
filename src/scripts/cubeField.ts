/** One cube simulation for mouse, finger movement and recent native touch scroll. */
export function initCubeField() {
  const field = document.querySelector<HTMLElement>('[data-cube-field]');
  const hero = field?.closest<HTMLElement>('.hero');
  const canvas = field?.querySelector<HTMLCanvasElement>('canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  if (!field || !hero || !canvas || !context || field.hasAttribute('data-cube-ready')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  type Point = { x: number; y: number };
  type Tile = Point & { height: number; target: number; glow: number; seed: number };
  const palette = [[0, 246, 255], [36, 160, 255], [181, 118, 255]];
  let tiles: Tile[] = [];
  let width = 0, height = 0, halfWidth = 36, halfDepth = 20;
  let frame = 0, lastTime = 0, lastDraw = 0, visible = true;
  let mode: 'mouse' | 'touch' | null = null;
  let pendingPointer: Point | null = null;
  let touchOrigin: Point | null = null, lastTouch: Point | null = null;
  let touchMoved = false, touchHeld = false, gestureUntil = 0, recentTouchUntil = 0;
  let previousScroll = scrollY;
  const colorEpoch = performance.now();
  const setState = (value: string) => { if (field.dataset.cubeState !== value) field.dataset.cubeState = value; };
  const color = (tile: Tile, time: number) => {
    const rawPhase = (time - colorEpoch) / 14000 + tile.y / 720 * .35 + tile.x / Math.max(1, width) * .2;
    const phase = ((rawPhase % 1) + 1) % 1;
    const position = phase * palette.length, index = Math.floor(position);
    const blend = (1 - Math.cos((position - index) * Math.PI)) / 2;
    return palette[index].map((channel, i) => Math.round(channel + (palette[(index + 1) % palette.length][i] - channel) * blend));
  };
  const rgba = (rgb: number[], alpha: number) => `rgba(${rgb.join(',')},${alpha})`;
  const diamond = (x: number, y: number, w: number, d: number) => {
    context.beginPath(); context.moveTo(x, y - d); context.lineTo(x + w, y);
    context.lineTo(x, y + d); context.lineTo(x - w, y); context.closePath();
  };
  const draw = (time = performance.now()) => {
    context.globalAlpha = 1; context.fillStyle = '#000'; context.fillRect(0, 0, width, height);
    // Four fixed ground marks per cell make the surface visible before interaction.
    for (const tile of tiles) {
      context.fillStyle = tile.seed % 4 === 0 ? '#315b70' : '#204251';
      for (const dx of [-3, 3]) for (const dy of [-2, 2]) context.fillRect(tile.x + dx, tile.y + dy, 1.2, 1.2);
    }
    // Draw the whole floor first: colored traces cannot paint over black cube faces.
    for (const tile of tiles) {
      if (tile.glow < .004) continue;
      const rgb = color(tile, time);
      diamond(tile.x, tile.y, halfWidth + 24, halfDepth + 20);
      context.fillStyle = rgba(rgb, tile.glow * .16); context.fill();
      diamond(tile.x, tile.y, halfWidth + 16, halfDepth + 14);
      context.fillStyle = rgba(rgb, tile.glow * .96); context.fill();
      context.lineWidth = .8; context.strokeStyle = rgba(rgb, tile.glow * .5); context.stroke();
    }
    for (const tile of tiles) {
      const lift = tile.height;
      if (lift < 1) continue;
      const { x, y } = tile, top = y - lift;
      const rgb = color(tile, time), strength = Math.min(1, lift / 34);
      context.globalAlpha = Math.min(1, lift / 14);
      const edge = context.createLinearGradient(x, top - halfDepth, x, y + halfDepth);
      edge.addColorStop(0, rgba(rgb, .44 + strength * .40));
      edge.addColorStop(1, rgba(rgb, .4 + strength * .6));
      context.lineWidth = 1.25; context.lineJoin = 'miter'; context.strokeStyle = edge;
      context.beginPath(); context.moveTo(x - halfWidth, top); context.lineTo(x, top + halfDepth);
      context.lineTo(x, y + halfDepth); context.lineTo(x - halfWidth, y); context.closePath();
      context.fillStyle = '#030609'; context.fill(); context.stroke();
      context.beginPath(); context.moveTo(x, top + halfDepth); context.lineTo(x + halfWidth, top);
      context.lineTo(x + halfWidth, y); context.lineTo(x, y + halfDepth); context.closePath();
      context.fillStyle = '#010204'; context.fill(); context.stroke();
      const surface = context.createLinearGradient(x - halfWidth, top - halfDepth, x + halfWidth, top + halfDepth);
      surface.addColorStop(0, '#020306'); surface.addColorStop(1, `rgb(${rgb.map(c => Math.round(c * .055)).join(',')})`);
      diamond(x, top, halfWidth, halfDepth); context.fillStyle = surface; context.fill(); context.stroke();
      // Inset bevel and one cool leading rim, not a solid neon face.
      diamond(x, top, halfWidth - 3, halfDepth - 2);
      context.lineWidth = .65; context.strokeStyle = rgba(rgb, .12 + strength * .17); context.stroke();
      const rim = context.createLinearGradient(x - halfWidth, top, x + halfWidth, top);
      rim.addColorStop(0, rgba(rgb, strength * .25)); rim.addColorStop(.52, `rgba(195,226,245,${strength * .84})`);
      rim.addColorStop(1, rgba(rgb, strength * .7));
      context.beginPath(); context.moveTo(x - halfWidth, top); context.lineTo(x, top - halfDepth); context.lineTo(x + halfWidth, top);
      context.strokeStyle = rim; context.lineWidth = .8; context.stroke();
    }
    context.globalAlpha = 1;
  };
  const updateTargets = (position: Point | null) => {
    const radius = width < 768 ? 132 : Math.min(205, Math.max(175, width * .14));
    for (const tile of tiles) {
      const distance = position ? Math.hypot(tile.x - position.x, tile.y - position.y) : radius;
      const proximity = Math.max(0, 1 - distance / radius);
      tile.target = (width < 768 ? 48 : 66) * proximity * proximity * (3 - 2 * proximity);
    }
  };
  const tick = (time: number) => {
    frame = 0;
    if (!visible || document.visibilityState === 'hidden' || reduce.matches) { reset(true); return; }
    if (mode === 'mouse' && !finePointer.matches) { reset(true); return; }
    if (mode === 'touch' && time > gestureUntil) { mode = null; pendingPointer = null; updateTargets(null); }
    if (pendingPointer) {
      const bounds = field.getBoundingClientRect();
      updateTargets({ x: pendingPointer.x - bounds.left, y: pendingPointer.y - bounds.top }); pendingPointer = null;
    }
    const dt = Math.min(.05, Math.max(.001, (time - lastTime) / 1000)); lastTime = time;
    const blend = 1 - Math.exp(-dt / .075);
    let changing = false;
    for (const tile of tiles) {
      if (Math.abs(tile.target - tile.height) > .06) { tile.height += (tile.target - tile.height) * blend; changing = true; }
      else tile.height = tile.target;
      const glowTarget = Math.min(1, tile.target / (width < 768 ? 38 : 48));
      const glowBlend = 1 - Math.exp(-dt / (glowTarget > tile.glow ? .09 : .32));
      if (Math.abs(glowTarget - tile.glow) > .003) { tile.glow += (glowTarget - tile.glow) * glowBlend; changing = true; }
      else tile.glow = glowTarget;
    }
    // Height changes render at display rate; settled color uses at most 20 paints/s.
    if (changing || time - lastDraw >= 50 || mode === null) { draw(time); lastDraw = time; }
    if (changing || mode !== null) { setState(mode === 'mouse' ? 'hover' : mode === 'touch' ? 'gesture' : 'settling'); frame = requestAnimationFrame(tick); }
    else setState('rest');
  };
  const start = () => {
    if (!frame && visible && document.visibilityState !== 'hidden' && !reduce.matches) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
  };
  const reset = (immediate = false) => {
    pendingPointer = null; mode = null; updateTargets(null);
    if (immediate || reduce.matches || !visible || document.visibilityState === 'hidden') {
      cancelAnimationFrame(frame); frame = 0;
      touchOrigin = null; lastTouch = null; touchHeld = false; touchMoved = false; recentTouchUntil = 0;
      tiles.forEach(tile => { tile.height = 0; tile.glow = 0; }); setState('rest');
      if (document.visibilityState !== 'hidden') draw();
    } else start();
  };
  const activate = (point: Point, source: 'mouse' | 'touch') => {
    if (reduce.matches || !visible || document.visibilityState === 'hidden') { reset(true); return; }
    mode = source; pendingPointer = point;
    if (source === 'touch') gestureUntil = performance.now() + 240;
    start();
  };
  const resize = () => {
    const bounds = field.getBoundingClientRect(), nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
    if (!nextWidth || !nextHeight || nextWidth === width && nextHeight === height) return;
    cancelAnimationFrame(frame); frame = 0; mode = null; pendingPointer = null;
    width = nextWidth; height = nextHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); context.setTransform(dpr, 0, 0, dpr, 0, 0);
    halfWidth = width < 768 ? 25 : 36; halfDepth = halfWidth * .56;
    const pitchX = halfWidth * 3.4, pitchY = halfDepth * 2.35;
    tiles = [];
    for (let row = -2; row <= Math.ceil(height / pitchY) + 2; row++) for (let col = -1; col <= Math.ceil(width / pitchX) + 1; col++) {
      tiles.push({ x: col * pitchX + (Math.abs(row) % 2) * pitchX / 2, y: row * pitchY, height: 0, target: 0, glow: 0, seed: Math.abs((row * 73856093 ^ col * 19349663) >>> 0) });
    }
    setState('rest'); draw();
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (reduce.matches || !finePointer.matches) { reset(true); return; }
    activate({ x: event.clientX, y: event.clientY }, 'mouse');
  };
  const onLeave = () => { if (mode === 'mouse') reset(); };
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || reduce.matches) return;
    const touch = event.touches[0]; touchOrigin = lastTouch = { x: touch.clientX, y: touch.clientY };
    touchHeld = true; touchMoved = false; recentTouchUntil = 0;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (!touchOrigin || event.touches.length !== 1) return;
    const touch = event.touches[0]; lastTouch = { x: touch.clientX, y: touch.clientY };
    if (Math.hypot(lastTouch.x - touchOrigin.x, lastTouch.y - touchOrigin.y) < 4) return;
    touchMoved = true; activate(lastTouch, 'touch');
  };
  const onTouchEnd = () => {
    touchHeld = false; touchOrigin = null;
    if (touchMoved) recentTouchUntil = performance.now() + 650;
  };
  const onTouchCancel = () => { touchHeld = false; touchOrigin = null; recentTouchUntil = 0; if (mode === 'touch') reset(); };
  const onPreference = () => reset(true);
  const onVisibility = () => { reset(true); if (document.visibilityState !== 'hidden') draw(); };
  const onScroll = () => {
    const delta = scrollY - previousScroll; previousScroll = scrollY;
    if (Math.abs(delta) < .5) return;
    if (lastTouch && touchMoved && (touchHeld || performance.now() < recentTouchUntil)) {
      activate({ x: lastTouch.x, y: lastTouch.y + Math.sign(delta) * 16 }, 'touch');
    } else if (mode === 'mouse') reset();
  };
  const observer = new ResizeObserver(resize); observer.observe(field);
  const intersection = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; if (!visible) reset(true);
  }) : null;
  intersection?.observe(hero);
  hero.addEventListener('pointermove', onMove, { passive: true }); hero.addEventListener('pointerleave', onLeave);
  hero.addEventListener('touchstart', onTouchStart, { passive: true }); hero.addEventListener('touchmove', onTouchMove, { passive: true });
  hero.addEventListener('touchend', onTouchEnd, { passive: true }); hero.addEventListener('touchcancel', onTouchCancel, { passive: true });
  hero.addEventListener('focusin', onPreference);
  reduce.addEventListener('change', onPreference); finePointer.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('scroll', onScroll, { passive: true });
  resize(); field.setAttribute('data-cube-ready', '');
  window.addEventListener('pagehide', event => {
    reset(true);
    if (event.persisted) return;
    observer.disconnect(); intersection?.disconnect();
    hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave);
    hero.removeEventListener('touchstart', onTouchStart); hero.removeEventListener('touchmove', onTouchMove);
    hero.removeEventListener('touchend', onTouchEnd); hero.removeEventListener('touchcancel', onTouchCancel);
    hero.removeEventListener('focusin', onPreference);
    reduce.removeEventListener('change', onPreference); finePointer.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('scroll', onScroll);
  });
}
