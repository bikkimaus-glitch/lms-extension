// Native SVG surface distortion for the optional SLIME LAB example theme.
// Only painted surfaces use the filters; labels and layout are left intact.
if (!window.cuLmsSlimeEffects) {
  (() => {
    const NS = 'http://www.w3.org/2000/svg',
      ID = 'culms-slime-effects';
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let root = null,
      observer = null;
    const node = (tag, attrs = {}) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
      return n;
    };
    function animation(attributeName, values, dur) {
      return node('animate', {
        attributeName,
        values,
        dur,
        repeatCount: 'indefinite',
        calcMode: 'spline',
        keyTimes: '0;.5;1',
        keySplines: '.45 0 .55 1;.45 0 .55 1',
      });
    }
    function filter(id, scale, frequency) {
      const f = node('filter', {
        id,
        x: '-50%',
        y: '-80%',
        width: '200%',
        height: '260%',
        'color-interpolation-filters': 'sRGB',
      });
      const noise = node('feTurbulence', {
        type: 'fractalNoise',
        baseFrequency: frequency,
        numOctaves: 2,
        seed: 8,
        result: 'noise',
      });
      noise.append(animation('baseFrequency', frequency + ';0.028 0.014;' + frequency, '9s'));
      const displace = node('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'noise',
        scale,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      });
      displace.append(animation('scale', scale + ';' + scale * 1.45 + ';' + scale, '7s'));
      f.append(noise, displace, node('feGaussianBlur', { stdDeviation: 1.1 }));
      return f;
    }
    function updateMotion() {
      if (!root) return;
      if (
        motion.matches ||
        document.hidden ||
        document.documentElement.classList.contains('slime-paused')
      )
        root.pauseAnimations();
      else root.unpauseAnimations();
    }
    function setSpeed(value) {
      if (!root) return;
      const speed = Math.min(1.5, Math.max(0.15, Number(value) || 0.35));
      root
        .querySelectorAll('animate')
        .forEach((a) =>
          a.setAttribute('dur', (a.getAttribute('attributeName') === 'scale' ? 7 : 9) / speed + 's')
        );
    }
    function setActive(active) {
      if (!active) {
        root?.remove();
        root = null;
        observer?.disconnect();
        observer = null;
        return;
      }
      if (root) return;
      root = node('svg', { id: ID, 'aria-hidden': 'true', width: 0, height: 0 });
      root.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
      const defs = node('defs');
      defs.append(
        filter('culms-slime-button-filter', 48, '0.018 0.032'),
        filter('culms-slime-window-filter', 65, '0.012 0.018')
      );
      root.append(defs);
      (document.body || document.documentElement).append(root);
      observer = new MutationObserver(updateMotion);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      setSpeed(
        Number(getComputedStyle(document.documentElement).getPropertyValue('--slime-speed')) || 0.35
      );
      updateMotion();
    }
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    window.cuLmsSlimeEffects = { setActive, setSpeed };
  })();
}
