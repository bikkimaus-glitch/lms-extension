import { test, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const shared = (name: string) =>
  readFileSync(new URL('../../src/plugins/_shared/' + name, import.meta.url), 'utf8');
let shape: any;
beforeEach(() => {
  const window: any = {};
  runInNewContext(shared('button_shape.js'), { window });
  shape = window.cuLmsButtonShape;
});
test('profile geometry cannot escape CSS or exceed UI limits', () => {
  const s = shape.normalize({
    enabled: true,
    radius: 999,
    paddingX: -3,
    points: [
      [0, 0],
      [100, 0],
      [');color:red', 1],
    ],
  });
  expect(s.radius).toBe(64);
  expect(s.paddingX).toBe(4);
  expect(s.points.length).toBe(4);
  expect(shape.buildCss(s)).not.toContain('color:red');
});
test('custom polygons are bounded and limited to 16 vertices', () => {
  const s = shape.normalize({
    custom: true,
    points: [
      [-20, 0],
      [120, 0],
      [50, 140],
    ],
  });
  expect(JSON.stringify(s.points)).toBe('[[0,0],[100,0],[50,100]]');
  expect(shape.normalize({ points: Array(17).fill([0, 0]) }).points.length).toBe(4);
});
test('disabled shape leaves existing themes untouched', () => {
  expect(shape.buildCss({ enabled: false, custom: true })).toBe('');
  expect(shape.buildCss({ enabled: true })).toContain('button:not([role="tab"])');
});
test('video input rejects remote/script URLs and malformed media', () => {
  const window: any = {};
  runInNewContext(shared('background_video.js'), {
    window,
    document: { addEventListener: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  });
  const video = window.cuLmsBackgroundVideo;
  expect(video.isVideo('data:video/mp4;base64,AAAA')).toBe(true);
  expect(video.isVideo('data:video/webm;base64,AAAA')).toBe(true);
  for (const value of [
    'https://example.com/x.mp4',
    'javascript:alert(1)',
    'data:text/html;base64,AAAA',
    'data:video/mp4;base64,<script>',
  ])
    expect(video.isVideo(value)).toBe(false);
});
test('theme profiles accept geometry; appearance profiles accept playback controls', () => {
  const window: any = {};
  runInNewContext(shared('settings_registry.js'), { window, chrome: {} });
  const profile = {
    format: 'cu-lms-extension/profile',
    version: 1,
    kind: 'theme',
    values: {
      customThemeButtonShape: { enabled: true },
      backgroundVideoPlayback: false,
      backgroundVideoSpeed: 0.5,
    },
  };
  const result = window.cuLmsSettings.inspect(profile);
  expect(result.ok).toBe(true);
  expect(result.rejected).toHaveLength(0);
});
