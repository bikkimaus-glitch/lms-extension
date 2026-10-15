// Videos are local data URLs in the same scoped keys as images. Each opaque
// canvas owns a fixed, isolated media layer: mobile navigation is not exposed.
if (!window.cuLmsBackgroundVideo) {
  const layers = new Map();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let source = null,
    objectUrl = null,
    playback = true;
  let failed = false;
  const isVideo = (value) =>
    typeof value === 'string' && /^data:video\/(mp4|webm);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
  function destroy() {
    layers.forEach(({ host, video }, canvas) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      host.remove();
      canvas.classList.remove('culms-video-canvas');
    });
    layers.clear();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    source = null;
  }
  function updatePlayback() {
    layers.forEach(({ video }) => {
      if (document.hidden || motion.matches || !playback) video.pause();
      else
        video.play().catch(() => {
          video.dataset.playback = 'blocked';
        });
    });
  }
  function sync(canvases, data, options) {
    if (!isVideo(data)) {
      destroy();
      return;
    }
    if (source !== data) {
      destroy();
      failed = false;
      source = data;
      const [header, payload] = data.split(',');
      const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
      objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: header.slice(5, header.indexOf(';')) })
      );
    }
    playback = options.playback !== false;
    const wanted = new Set([document.body, ...canvases].filter(Boolean));
    layers.forEach(({ host, video }, canvas) => {
      if (!wanted.has(canvas)) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        host.remove();
        canvas.classList.remove('culms-video-canvas');
        layers.delete(canvas);
      }
    });
    wanted.forEach((canvas) => {
      let layer = layers.get(canvas);
      if (!layer) {
        const host = document.createElement('div');
        host.className = 'culms-video-layer';
        host.setAttribute('aria-hidden', 'true');
        const video = document.createElement('video');
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.tabIndex = -1;
        video.src = objectUrl;
        video.addEventListener('error', () => {
          failed = true;
          window.dispatchEvent(new Event('culms-video-status'));
        });
        video.addEventListener('timeupdate', () => {
          if (layers.values().next().value?.video !== video) return;
          layers.forEach((other) => {
            if (
              other.video !== video &&
              other.video.readyState >= 2 &&
              Math.abs(other.video.currentTime - video.currentTime) > 0.12
            )
              other.video.currentTime = video.currentTime;
          });
        });
        video.addEventListener('loadeddata', () => {
          const leader = layers.values().next().value?.video;
          if (leader && leader !== video && leader.readyState >= 2)
            video.currentTime = leader.currentTime;
          // Reduced motion still has a still frame, not a black rectangle.
          if (motion.matches || !playback) video.currentTime = Math.min(0.1, video.duration || 0.1);
        });
        const shade = document.createElement('div');
        host.append(video, shade);
        canvas.prepend(host);
        canvas.classList.add('culms-video-canvas');
        layer = { host, video, shade };
        layers.set(canvas, layer);
      }
      layer.video.style.objectFit = ['contain', 'fill', 'none'].includes(options.fit)
        ? options.fit
        : 'cover';
      layer.video.playbackRate = options.speed || 1;
      layer.shade.style.background = `rgba(${options.color},${options.veil / 100})`;
    });
    updatePlayback();
  }
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', updatePlayback);
  window.cuLmsBackgroundVideo = {
    isVideo,
    sync,
    destroy,
    status: () => ({ failed, reducedMotion: motion.matches, paused: !playback }),
  };
}
