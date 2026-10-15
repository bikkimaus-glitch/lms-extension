// Shared, validated geometry for the theme editor, content script and profiles.
if (!window.cuLmsButtonShape) {
  const PRESETS = {
    rectangle: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    bevel: [
      [10, 0],
      [90, 0],
      [100, 25],
      [100, 75],
      [90, 100],
      [10, 100],
      [0, 75],
      [0, 25],
    ],
    parallelogram: [
      [12, 0],
      [100, 0],
      [88, 100],
      [0, 100],
    ],
    ticket: [
      [0, 0],
      [100, 0],
      [100, 35],
      [94, 50],
      [100, 65],
      [100, 100],
      [0, 100],
      [0, 65],
      [6, 50],
      [0, 35],
    ],
  };
  const number = (v, fallback, min, max) =>
    Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
  function normalize(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const points =
      Array.isArray(s.points) &&
      s.points.length >= 3 &&
      s.points.length <= 16 &&
      s.points.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 2 &&
          p.every((n) => typeof n === 'number' && Number.isFinite(n))
      )
        ? s.points.map((p) => p.map((n) => Math.round(number(n, 0, 0, 100))))
        : PRESETS.rectangle.map((p) => [...p]);
    return {
      enabled: s.enabled === true,
      custom: s.custom === true,
      radius: number(s.radius, 8, 0, 64),
      paddingX: number(s.paddingX, 18, 4, 48),
      paddingY: number(s.paddingY, 10, 2, 30),
      points,
    };
  }
  const polygon = (s) =>
    `polygon(${normalize(s)
      .points.map((p) => p.map((n) => n + '%').join(' '))
      .join(',')})`;
  function buildCss(raw) {
    const s = normalize(raw);
    if (!s.enabled) return '';
    // Never alter role=tab or all links: their geometry also controls navigation.
    return `html body :is(button:not([role="tab"]),a[tuiButton],a[tuiIconButton],input[type="submit"],input[type="button"]):not(#culms-shape-original):not([data-culms-shape-exempt]) {
      border-radius:${s.custom ? 0 : s.radius}px!important;
      clip-path:${s.custom ? polygon(s) : 'none'}!important;
      padding-inline:${s.paddingX}px!important;padding-block:${s.paddingY}px!important;
      height:auto!important;min-height:32px!important;max-width:100%;box-sizing:border-box!important;
      white-space:normal!important;overflow-wrap:anywhere;
    }
    html body :is(button,a[tuiButton],a[tuiIconButton]):focus-visible {outline:3px solid var(--accent,#477df9)!important;outline-offset:3px;box-shadow:inset 0 0 0 3px var(--accent,#477df9)!important;}
    `;
  }
  window.cuLmsButtonShape = { PRESETS, normalize, polygon, buildCss };
}
