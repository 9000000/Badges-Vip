const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, applyPalette, quantize } = require('gifenc');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const REFERENCE_MANIFEST_PATH = path.resolve(__dirname, 'reference_badges_manifest.json');

// Luxury Motion v2 keeps the transparent badge silhouette but replaces the old
// repeated intro cadence with a larger palette of cinematic, premium treatments.
const TOTAL_FRAMES = 150;
const DELAY = 30;
const TARGET_HEIGHT = 150;
const HOLD_FRAMES = 30;

// The expanded catalogue contains many more labels. It keeps the same 4.5-second
// loop and visual language while using fewer unique frames to keep the repository
// and client downloads at a practical size.
const REFERENCE_PROFILE = {
  totalFrames: 90,
  delay: 50,
  targetHeight: 112,
  holdFrames: 24,
  introScale: 0.78
};

const INTRO_FRAMES = {
  prism: 48,
  silk: 64,
  crystal: 54,
  orbit: 42,
  halo: 50,
  particles: 62,
  ribbon: 48,
  shatter: 38,
  aurora: 58,
  chrome: 50,
  glow: 56,
  matrix: 54
};

const LUXURY_STYLES = Object.keys(INTRO_FRAMES);
const LUXURY_COLORS = [
  'champagne',
  'rose',
  'emerald',
  'sapphire',
  'amethyst',
  'ice',
  'copper',
  'platinum',
  'teal',
  'ruby',
  'indigo',
  'lime'
];

const CORE_BADGES = [
  // Source
  { png: 'remux.png', gif: 'remux.gif', effect: 'silver', intro: 'glitch' },
  { png: 'blu_ray_disc.png', gif: 'blu_ray_disc.gif', effect: 'blue', intro: 'glitch' },
  { png: 'WEBDL_transparent_4x.png', gif: 'WEBDL_transparent_4x.gif', effect: 'cyan', intro: 'glitch' },
  { png: 'WEBRip_transparent_4x.png', gif: 'WEBRip_transparent_4x.gif', effect: 'purple', intro: 'glitch' },
  { png: 'HDTV_transparent_4x.png', gif: 'HDTV_transparent_4x.gif', effect: 'cyan', intro: 'glitch' },
  { png: 'DVD_RIP_transparent_4x.png', gif: 'DVD_RIP_transparent_4x.gif', effect: 'gold', intro: 'glitch' },

  // Resolution
  { png: '4k_ultra_hd.png', gif: '4k_ultra_hd.gif', effect: 'green', intro: 'ink' },
  { png: '1080p_full_hd.png', gif: '1080p_full_hd.gif', effect: 'blue', intro: 'ink' },
  { png: '720p_hd.png', gif: '720p_hd.gif', effect: 'cyan', intro: 'ink' },
  { png: '480p_sd.png', gif: '480p_sd.gif', effect: 'silver', intro: 'ink' },

  // Video technology
  { png: 'dolby_vision.png', gif: 'dolby_vision.gif', effect: 'rainbow', intro: 'scan' },
  { png: 'hdr10_plus.png', gif: 'hdr10_plus.gif', effect: 'gold', intro: 'burst' },
  { png: 'hdr10.png', gif: 'hdr10.gif', effect: 'gold', intro: 'burst' },
  { png: 'hdr.png', gif: 'hdr.gif', effect: 'orange', intro: 'burst' },
  { png: 'SDR_transparent_4x.png', gif: 'SDR_transparent_4x.gif', effect: 'silver', intro: 'burst' },
  { png: 'imax_enhanced.png', gif: 'imax_enhanced.gif', effect: 'blue', intro: 'scan' },
  { png: 'imax.png', gif: 'imax.gif', effect: 'blue', intro: 'scan' },

  // Video codec
  { png: 'HEVC_transparent_4x.png', gif: 'HEVC_transparent_4x.gif', effect: 'green', intro: 'glitch' },
  { png: 'AVC_transparent_4x.png', gif: 'AVC_transparent_4x.gif', effect: 'purple', intro: 'glitch' },

  // Bit depth
  { png: '10Bit_transparent_4x.png', gif: '10Bit_transparent_4x.gif', effect: 'rainbow', intro: 'burst' },
  { png: '8Bit_transparent_4x.png', gif: '8Bit_transparent_4x.gif', effect: 'cyan', intro: 'burst' },

  // Audio technology
  { png: 'dolby_atmos.png', gif: 'dolby_atmos.gif', effect: 'cyan', intro: 'wave' },
  { png: 'truehd.png', gif: 'truehd.gif', effect: 'blue', intro: 'wave' },
  { png: 'dolby_digital_plus.png', gif: 'dolby_digital_plus.gif', effect: 'purple', intro: 'wave' },
  { png: 'dolby_digital.png', gif: 'dolby_digital.gif', effect: 'blue', intro: 'wave' },
  { png: 'dts_x.png', gif: 'dts_x.gif', effect: 'orange', intro: 'burst' },
  { png: 'dts_hd_master_audio.png', gif: 'dts_hd_master_audio.gif', effect: 'gold', intro: 'burst' },
  { png: 'dts_hd.png', gif: 'dts_hd.gif', effect: 'orange', intro: 'burst' },
  { png: 'dts.png', gif: 'dts.gif', effect: 'orange', intro: 'burst' },

  // Audio channels
  { png: '7_1_audio.png', gif: '7_1_audio.gif', effect: 'cyan', intro: 'wave' },
  { png: '5_1_audio.png', gif: '5_1_audio.gif', effect: 'cyan', intro: 'wave' }
];

const REFERENCE_BADGES = fs.existsSync(REFERENCE_MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(REFERENCE_MANIFEST_PATH, 'utf8')).badges
  : [];
const BADGES = [...CORE_BADGES, ...REFERENCE_BADGES];

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function visualStyleFor(item) {
  const seed = hashString(item.gif);
  return {
    intro: LUXURY_STYLES[seed % LUXURY_STYLES.length],
    effect: LUXURY_COLORS[hashString(`${item.gif}:color`) % LUXURY_COLORS.length]
  };
}

async function generateAll() {
  const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
  const importedOnly = process.argv.includes('--imported');
  const only = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map(name => name.trim()).filter(Boolean))
    : null;
  const queue = importedOnly
    ? REFERENCE_BADGES
    : only
      ? BADGES.filter(item => only.has(item.gif) || only.has(item.png))
      : BADGES;

  if (queue.length === 0) {
    throw new Error('No badges matched --only');
  }

  console.log(
    `Generating ${queue.length} Luxury Motion v2 animated badges ` +
    `(core: ${TOTAL_FRAMES} frames; expanded: ${REFERENCE_PROFILE.totalFrames} frames; 4.5 s loop)...`
  );

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();

  try {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const pngPath = path.join(BADGES_DIR, item.png);
      if (!fs.existsSync(pngPath)) {
        throw new Error(`Missing PNG source: ${pngPath}`);
      }

      const profile = item.collection === 'reference'
        ? REFERENCE_PROFILE
        : {
            totalFrames: TOTAL_FRAMES,
            delay: DELAY,
            targetHeight: TARGET_HEIGHT,
            holdFrames: HOLD_FRAMES,
            introScale: 1
          };
      const visualStyle = visualStyleFor(item);
      const activeFrames = Math.min(
        profile.totalFrames - profile.holdFrames,
        Math.max(8, Math.round(INTRO_FRAMES[visualStyle.intro] * profile.introScale))
      );
      console.log(
        `[${i + 1}/${queue.length}] ${item.png} -> ${item.gif} ` +
        `(${visualStyle.intro}/${visualStyle.effect}, ${(activeFrames * profile.delay / 1000).toFixed(2)} s intro)...`
      );

      const pngBase64 = fs.readFileSync(pngPath).toString('base64');
      const imgSrc = `data:image/png;base64,${pngBase64}`;

      // Render the unique opening plus a short reusable hold cycle. This keeps the
      // 4.5-second loop active without rendering 150 unrelated frames per badge.
      const frames = await page.evaluate(async (src, intro, effect, targetH, frameCount, holdFrameCount) => {
        const img = new Image();
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Unable to decode PNG source'));
        });

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = img.naturalWidth;
        sourceCanvas.height = img.naturalHeight;
        const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        sourceCtx.imageSmoothingEnabled = true;
        sourceCtx.imageSmoothingQuality = 'high';
        sourceCtx.drawImage(img, 0, 0);

        const sourcePixels = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
        let minX = sourceCanvas.width;
        let minY = sourceCanvas.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < sourceCanvas.height; y++) {
          for (let x = 0; x < sourceCanvas.width; x++) {
            if (sourcePixels[(y * sourceCanvas.width + x) * 4 + 3] > 10) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        if (maxX < minX || maxY < minY) {
          throw new Error('PNG source is fully transparent');
        }

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const targetW = Math.max(1, Math.round(targetH * cropW / cropH));
        const padX = 25;
        const padY = 20;
        const canvasW = targetW + padX * 2;
        const canvasH = targetH + padY * 2;

        const badgeCanvas = document.createElement('canvas');
        badgeCanvas.width = canvasW;
        badgeCanvas.height = canvasH;
        const badgeCtx = badgeCanvas.getContext('2d');
        badgeCtx.imageSmoothingEnabled = true;
        badgeCtx.imageSmoothingQuality = 'high';
        badgeCtx.drawImage(
          sourceCanvas,
          minX, minY, cropW, cropH,
          padX, padY, targetW, targetH
        );

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const workCanvas = document.createElement('canvas');
        workCanvas.width = canvasW;
        workCanvas.height = canvasH;
        const workCtx = workCanvas.getContext('2d');

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvasW;
        maskCanvas.height = canvasH;
        const maskCtx = maskCanvas.getContext('2d');

        const accent = accentColor(effect);
        const rendered = [];

        const uniqueFrameCount = frameCount + holdFrameCount;
        for (let f = 0; f < uniqueFrameCount; f++) {
          ctx.clearRect(0, 0, canvasW, canvasH);

          if (f > 0 && f < frameCount) {
            const p = frameCount === 1 ? 1 : f / (frameCount - 1);
            if (intro === 'prism') {
              drawPrismReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'silk') {
              drawSilkReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'crystal') {
              drawCrystalReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'orbit') {
              drawOrbitReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'halo') {
              drawHaloReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'particles') {
              drawParticlesReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'ribbon') {
              drawRibbonReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'shatter') {
              drawShatterReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'aurora') {
              drawAuroraReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'chrome') {
              drawChromeReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else if (intro === 'glow') {
              drawGlowReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else {
              drawMatrixReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            }

            drawSignatureDiamond(
              ctx,
              canvasW - Math.max(9, padX * 0.42),
              canvasH - Math.max(9, padY * 0.48),
              9,
              smoothstep(0.28, 0.72, p)
            );
          }

          if (f === frameCount - 1) {
            ctx.clearRect(0, 0, canvasW, canvasH);
            ctx.drawImage(badgeCanvas, 0, 0);
            drawSignatureDiamond(
              ctx,
              canvasW - Math.max(9, padX * 0.42),
              canvasH - Math.max(9, padY * 0.48),
              9,
              1
            );
          } else if (f >= frameCount) {
            const phase = (f - frameCount) / holdFrameCount;
            drawHoldFrame(ctx, workCtx, badgeCanvas, canvasW, canvasH, phase, intro, accent);
          }

          const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
          rendered.push({ data: Array.from(frameData.data), w: canvasW, h: canvasH });
        }

        return rendered;

        function drawPrismReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.02, 0.28, p);
          const lift = (1 - eased) * h * 0.1;

          out.save();
          out.translate(w / 2, h / 2 + lift);
          out.rotate((1 - eased) * -0.045 + Math.sin(frame * 0.12) * 0.004);
          out.scale(0.9 + eased * 0.1, 0.9 + eased * 0.1);
          out.translate(-w / 2, -h / 2);
          out.globalAlpha = alpha;
          out.filter = `blur(${(1 - eased) * 5}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          const beamX = -w * 0.25 + eased * w * 1.5;
          out.save();
          out.globalCompositeOperation = 'screen';
          const beam = out.createLinearGradient(beamX - 75, 0, beamX + 75, h);
          beam.addColorStop(0, 'rgba(255,255,255,0)');
          beam.addColorStop(0.38, rgba(color, 0.08 + (1 - p) * 0.3));
          beam.addColorStop(0.5, `rgba(255,255,255,${0.24 + (1 - p) * 0.55})`);
          beam.addColorStop(0.62, rgba(color, 0.08 + (1 - p) * 0.3));
          beam.addColorStop(1, 'rgba(255,255,255,0)');
          out.fillStyle = beam;
          out.fillRect(beamX - 90, -20, 180, h + 40);
          out.strokeStyle = rgba(color, 0.38 * (1 - p));
          out.lineWidth = 1.5;
          for (let i = -1; i <= 1; i++) {
            out.beginPath();
            out.moveTo(beamX + i * 18 - 55, 0);
            out.lineTo(beamX + i * 18 + 35, h);
            out.stroke();
          }
          out.restore();

          if (p > 0.78) {
            out.save();
            out.globalAlpha = smoothstep(0.78, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawSilkReveal(out, badge, w, h, p, frame, color) {
          const eased = easeInOutCubic(p);
          const alpha = smoothstep(0.03, 0.22, p);
          const slices = 30;
          const sliceH = h / slices;

          out.save();
          out.globalAlpha = alpha;
          for (let i = 0; i < slices; i++) {
            const y = i * sliceH;
            const wave = Math.sin(i * 0.54 + frame * 0.22) * (1 - eased) * w * 0.09;
            const drift = Math.sin(frame * 0.11 + i * 0.17) * (1 - eased) * 8;
            out.save();
            out.beginPath();
            out.rect(0, y, w, sliceH + 1);
            out.clip();
            out.drawImage(badge, wave + drift, 0);
            out.restore();
          }
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          out.lineWidth = 2.2;
          for (let ribbon = 0; ribbon < 4; ribbon++) {
            const y = h * (0.2 + ribbon * 0.19);
            out.globalAlpha = (1 - p) * (0.28 - ribbon * 0.035);
            out.strokeStyle = ribbon % 2 ? '#ffffff' : color;
            out.beginPath();
            out.moveTo(-30, y);
            out.bezierCurveTo(w * 0.26, y - 25, w * 0.42, y + 25, w * 0.66, y - 8);
            out.bezierCurveTo(w * 0.82, y - 25, w * 0.94, y + 14, w + 30, y - 4);
            out.stroke();
          }
          out.restore();

          if (p > 0.84) {
            out.save();
            out.globalAlpha = smoothstep(0.84, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawCrystalReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutBack(p);
          const alpha = smoothstep(0.04, 0.3, p);
          const scale = 0.62 + eased * 0.38;

          out.save();
          out.translate(w / 2, h / 2);
          out.scale(scale, scale);
          out.rotate(Math.sin(frame * 0.08) * (1 - p) * 0.04);
          out.translate(-w / 2, -h / 2);
          out.globalAlpha = alpha;
          out.filter = `blur(${Math.max(0, (1 - p) * 4)}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.translate(w / 2, h / 2);
          out.globalCompositeOperation = 'screen';
          out.lineWidth = 1.4;
          for (let i = 0; i < 12; i++) {
            const angle = i / 12 * Math.PI * 2 + frame * 0.018;
            const radius = Math.min(w, h) * (0.16 + (1 - p) * 0.42);
            out.globalAlpha = (1 - p) * (0.24 + (i % 3) * 0.06);
            out.strokeStyle = i % 3 === 0 ? '#ffffff' : color;
            out.beginPath();
            out.moveTo(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3);
            out.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            out.stroke();
          }
          out.restore();

          if (p > 0.82) {
            out.save();
            out.globalAlpha = smoothstep(0.82, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawOrbitReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.04, 0.26, p);
          const floatY = Math.sin(frame * 0.14) * (1 - p) * 7;

          out.save();
          out.translate(w / 2, h / 2 + floatY);
          out.rotate((1 - eased) * 0.08);
          out.scale(0.72 + eased * 0.28, 0.72 + eased * 0.28);
          out.translate(-w / 2, -h / 2);
          out.globalAlpha = alpha;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.translate(w / 2, h / 2);
          out.globalCompositeOperation = 'screen';
          for (let ring = 0; ring < 3; ring++) {
            out.globalAlpha = (1 - p) * (0.45 - ring * 0.1);
            out.strokeStyle = ring === 1 ? '#ffffff' : color;
            out.lineWidth = 1.6;
            out.beginPath();
            out.ellipse(0, 0, Math.min(w, h) * (0.3 + ring * 0.16), Math.min(w, h) * (0.09 + ring * 0.045), ring * 0.18, 0, Math.PI * 2);
            out.stroke();
          }
          for (let i = 0; i < 8; i++) {
            const angle = frame * 0.08 + i / 8 * Math.PI * 2;
            const x = Math.cos(angle) * Math.min(w, h) * (0.34 + (i % 2) * 0.11);
            const y = Math.sin(angle) * Math.min(w, h) * (0.1 + (i % 2) * 0.04);
            out.globalAlpha = (1 - p) * (0.45 + 0.2 * Math.sin(angle));
            out.fillStyle = i % 3 ? color : '#ffffff';
            out.beginPath();
            out.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2);
            out.fill();
          }
          out.restore();

          if (p > 0.86) {
            out.save();
            out.globalAlpha = smoothstep(0.86, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawHaloReveal(out, badge, w, h, p, frame, color) {
          const eased = easeInOutCubic(p);
          const alpha = smoothstep(0.02, 0.34, p);
          const pulse = 0.5 + 0.5 * Math.sin(frame * 0.17);

          out.save();
          const halo = out.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
          halo.addColorStop(0, rgba(color, (1 - p) * 0.34));
          halo.addColorStop(0.48, rgba(color, (1 - p) * 0.1));
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          out.globalCompositeOperation = 'screen';
          out.fillStyle = halo;
          out.fillRect(0, 0, w, h);
          out.restore();

          out.save();
          out.globalAlpha = alpha;
          out.filter = `drop-shadow(0 0 ${8 + pulse * 8}px ${rgba(color, 0.65)})`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.translate(w / 2, h / 2);
          out.globalCompositeOperation = 'screen';
          for (let ring = 0; ring < 4; ring++) {
            const radius = Math.min(w, h) * (0.16 + eased * 0.48 + ring * 0.1);
            out.globalAlpha = (1 - p) * (0.5 - ring * 0.09);
            out.strokeStyle = ring % 2 ? '#ffffff' : color;
            out.lineWidth = 1.5 + pulse;
            out.beginPath();
            out.arc(0, 0, radius, -Math.PI * 0.16, Math.PI * 1.16);
            out.stroke();
          }
          out.restore();

          if (p > 0.86) {
            out.save();
            out.globalAlpha = smoothstep(0.86, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawParticlesReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.02, 0.45, p);

          out.save();
          out.globalAlpha = alpha;
          out.filter = `blur(${(1 - eased) * 2.2}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let i = 0; i < 48; i++) {
            const originX = w * noise(i * 17 + 5);
            const originY = h * noise(i * 23 + 8);
            const targetX = w * (0.18 + 0.64 * noise(i * 29 + 3));
            const targetY = h * (0.2 + 0.58 * noise(i * 31 + 9));
            const q = clamp((p - (i % 9) * 0.035) / 0.82);
            const x = originX + (targetX - originX) * q;
            const y = originY + (targetY - originY) * q - q * (1 - q) * h * 0.16;
            out.globalAlpha = (1 - q) * 0.68;
            out.fillStyle = i % 4 ? color : '#ffffff';
            out.beginPath();
            out.arc(x, y, 0.7 + (i % 4) * 0.55, 0, Math.PI * 2);
            out.fill();
          }
          out.restore();

          if (p > 0.88) {
            out.save();
            out.globalAlpha = smoothstep(0.88, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawRibbonReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const edge = -w * 0.35 + eased * w * 1.7;

          out.save();
          out.beginPath();
          out.moveTo(-30, -20);
          out.lineTo(edge + 65, -20);
          out.bezierCurveTo(edge - 30, h * 0.32, edge + 95, h * 0.68, edge - 20, h + 20);
          out.lineTo(-30, h + 20);
          out.closePath();
          out.clip();
          out.globalAlpha = smoothstep(0.02, 0.25, p);
          out.filter = `blur(${(1 - eased) * 3}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let i = 0; i < 4; i++) {
            out.globalAlpha = (1 - p) * (0.48 - i * 0.08);
            out.strokeStyle = i % 2 ? '#ffffff' : color;
            out.lineWidth = 2 + i * 0.5;
            out.beginPath();
            out.moveTo(edge - 90 + i * 22, -20);
            out.bezierCurveTo(edge + 25 + i * 22, h * 0.25, edge - 42 + i * 22, h * 0.72, edge + 92 + i * 22, h + 20);
            out.stroke();
          }
          out.restore();

          if (p > 0.85) {
            out.save();
            out.globalAlpha = smoothstep(0.85, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawShatterReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.08, 0.5, p);
          const cx = w / 2;
          const cy = h / 2;
          const pieces = 14;

          out.save();
          out.globalAlpha = alpha;
          for (let i = 0; i < pieces; i++) {
            const a0 = i / pieces * Math.PI * 2;
            const a1 = (i + 1) / pieces * Math.PI * 2;
            const r = Math.max(w, h) * 0.75;
            const force = (1 - eased) * (18 + noise(i * 19) * 38);
            const dx = Math.cos((a0 + a1) / 2) * force;
            const dy = Math.sin((a0 + a1) / 2) * force;
            out.save();
            out.beginPath();
            out.moveTo(cx, cy);
            out.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
            out.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
            out.closePath();
            out.clip();
            out.drawImage(badge, dx, dy);
            out.restore();
          }
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let i = 0; i < 12; i++) {
            const angle = i / 12 * Math.PI * 2;
            const length = (1 - p) * Math.max(w, h) * (0.22 + noise(i * 23) * 0.45);
            out.globalAlpha = (1 - p) * 0.4;
            out.strokeStyle = i % 3 ? color : '#ffffff';
            out.lineWidth = 1 + (i % 2);
            out.beginPath();
            out.moveTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
            out.lineTo(cx + Math.cos(angle) * (15 + length), cy + Math.sin(angle) * (15 + length));
            out.stroke();
          }
          out.restore();

          if (p > 0.88) {
            out.save();
            out.globalAlpha = smoothstep(0.88, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawAuroraReveal(out, badge, w, h, p, frame, color) {
          const eased = easeInOutCubic(p);
          const alpha = smoothstep(0.03, 0.34, p);

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let band = 0; band < 5; band++) {
            const baseY = h * (0.18 + band * 0.16);
            const gradient = out.createLinearGradient(0, baseY - 28, w, baseY + 28);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, rgba(color, (1 - p) * 0.14));
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            out.strokeStyle = gradient;
            out.lineWidth = 14 + band * 3;
            out.globalAlpha = (1 - p) * 0.75;
            out.beginPath();
            out.moveTo(-30, baseY);
            for (let x = 0; x <= w + 30; x += 22) {
              const y = baseY + Math.sin(x * 0.025 + frame * 0.12 + band) * (10 + (1 - eased) * 22);
              out.lineTo(x, y);
            }
            out.stroke();
          }
          out.restore();

          out.save();
          out.globalAlpha = alpha;
          out.filter = `drop-shadow(0 0 ${4 + (1 - p) * 10}px ${rgba(color, 0.55)})`;
          out.drawImage(badge, 0, 0);
          out.restore();

          if (p > 0.86) {
            out.save();
            out.globalAlpha = smoothstep(0.86, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawChromeReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutBack(p);
          const alpha = smoothstep(0.02, 0.3, p);
          const sheenX = -w * 0.4 + eased * w * 1.8;

          out.save();
          out.translate(w / 2, h / 2);
          out.scale(0.72 + eased * 0.28, 0.72 + eased * 0.28);
          out.rotate(Math.sin(frame * 0.07) * (1 - p) * 0.03);
          out.translate(-w / 2, -h / 2);
          out.globalAlpha = alpha;
          out.filter = `drop-shadow(0 0 ${5 + (1 - p) * 7}px ${rgba(color, 0.65)})`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          const sheen = out.createLinearGradient(sheenX - 90, 0, sheenX + 90, h);
          sheen.addColorStop(0, 'rgba(255,255,255,0)');
          sheen.addColorStop(0.42, rgba(color, 0.14));
          sheen.addColorStop(0.5, `rgba(255,255,255,${0.65 * (1 - p)})`);
          sheen.addColorStop(0.58, rgba(color, 0.14));
          sheen.addColorStop(1, 'rgba(255,255,255,0)');
          out.fillStyle = sheen;
          out.fillRect(sheenX - 100, -20, 200, h + 40);
          out.restore();

          if (p > 0.82) {
            out.save();
            out.globalAlpha = smoothstep(0.82, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawGlowReveal(out, badge, w, h, p, frame, color) {
          const eased = easeInOutCubic(p);
          const alpha = smoothstep(0.02, 0.34, p);
          const pulse = 0.5 + 0.5 * Math.sin(frame * 0.2);
          const radius = Math.max(w, h) * (0.32 + pulse * 0.1);

          out.save();
          const gradient = out.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius * 1.7);
          gradient.addColorStop(0, rgba(color, (1 - p) * 0.32));
          gradient.addColorStop(0.36, rgba(color, (1 - p) * 0.12));
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          out.globalCompositeOperation = 'screen';
          out.fillStyle = gradient;
          out.fillRect(0, 0, w, h);
          out.restore();

          out.save();
          out.globalAlpha = alpha;
          out.filter = `drop-shadow(0 0 ${7 + pulse * 8}px ${rgba(color, 0.72)}) blur(${(1 - eased) * 2}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          out.globalAlpha = (1 - p) * 0.4;
          out.strokeStyle = '#ffffff';
          out.lineWidth = 1.2;
          out.beginPath();
          out.arc(w / 2, h / 2, Math.min(w, h) * (0.25 + eased * 0.46), frame * 0.03, frame * 0.03 + Math.PI * 1.7);
          out.stroke();
          out.restore();

          if (p > 0.86) {
            out.save();
            out.globalAlpha = smoothstep(0.86, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawMatrixReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.04, 0.4, p);
          const columns = Math.max(18, Math.round(w / 20));

          out.save();
          out.globalAlpha = alpha;
          const sliceW = w / columns;
          for (let i = 0; i < columns; i++) {
            const x = i * sliceW;
            const drift = Math.sin(frame * 0.15 + i * 1.6) * (1 - eased) * 11;
            out.save();
            out.beginPath();
            out.rect(x, 0, sliceW + 1, h);
            out.clip();
            out.drawImage(badge, drift, 0);
            out.restore();
          }
          out.restore();

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let i = 0; i < columns; i++) {
            const x = i * sliceW + sliceW * 0.5;
            const travel = ((frame * (1.5 + noise(i * 13) * 2.5) + i * 23) % (h + 40)) - 20;
            out.globalAlpha = (1 - p) * (0.18 + noise(i * 31) * 0.3);
            out.fillStyle = i % 5 === 0 ? '#ffffff' : color;
            out.fillRect(x, travel, Math.max(1, sliceW * 0.08), 4 + (i % 4) * 3);
            if (i % 3 === 0) out.fillRect(x, travel + 12, Math.max(1, sliceW * 0.05), 1);
          }
          for (let y = 0; y < h; y += 5) {
            out.globalAlpha = (1 - p) * 0.08;
            out.fillRect(0, y, w, 1);
          }
          out.restore();

          if (p > 0.88) {
            out.save();
            out.globalAlpha = smoothstep(0.88, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawGlitchReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const reveal = smoothstep(0.02, 0.32, p);
          const amplitude = (1 - eased) * Math.max(24, w * 0.16);
          const slices = 20;
          const sliceH = h / slices;

          out.save();
          out.globalAlpha = reveal;
          out.filter = `blur(${Math.max(0, (1 - eased) * 2.8)}px)`;
          for (let i = 0; i < slices; i++) {
            const y = i * sliceH;
            const jitter = (noise(i * 31 + frame * 17) - 0.5) * amplitude;
            const wave = Math.sin(i * 1.71 + frame * 0.82) * amplitude * 0.52;
            out.save();
            out.beginPath();
            out.rect(0, y, w, sliceH + 1);
            out.clip();
            out.drawImage(badge, jitter + wave, 0);
            out.restore();
          }
          out.restore();

          const split = (1 - eased) * Math.max(6, w * 0.035);
          if (split > 0.4) {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = reveal * (1 - eased) * 0.9;
            out.filter = 'hue-rotate(120deg) saturate(4)';
            out.drawImage(badge, split, 0);
            out.filter = 'hue-rotate(260deg) saturate(4)';
            out.drawImage(badge, -split, 0);
            out.restore();

            out.save();
            out.globalAlpha = (1 - eased) * 0.95;
            out.fillStyle = color;
            for (let i = 0; i < 9; i++) {
              const y = noise(frame * 19 + i * 43) * h;
              const lineW = w * (0.12 + noise(i * 67 + frame) * 0.38);
              const x = noise(i * 97 + frame * 3) * (w - lineW);
              out.fillRect(x, y, lineW, 1 + (i % 3));
            }
            out.restore();
          }

          if (p > 0.84) {
            out.save();
            out.globalAlpha = smoothstep(0.84, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawInkReveal(out, work, mask, badge, w, h, targetWidth, targetHeight, p, frame, color) {
          const eased = easeInOutCubic(p);
          const smokeFade = 1 - smoothstep(0.38, 0.86, p);

          if (smokeFade > 0.01) {
            out.save();
            out.filter = `blur(${8 + (1 - eased) * 13}px)`;
            out.globalCompositeOperation = 'screen';
            for (let i = 0; i < 28; i++) {
              const delay = (i % 7) * 0.035;
              const life = clamp((p - delay) / Math.max(0.01, 1 - delay));
              const x = w * (0.08 + 0.84 * noise(i * 41 + 7));
              const drift = Math.sin(frame * 0.16 + i * 1.9) * targetWidth * 0.025;
              const y = h * (0.25 + 0.62 * noise(i * 73 + 11)) - life * h * 0.12;
              const radius = targetHeight * (0.08 + 0.3 * life + 0.1 * noise(i * 29));
              const alpha = smokeFade * (0.12 + 0.24 * noise(i * 53));
              out.fillStyle = i % 3 === 0
                ? `rgba(255,255,255,${alpha})`
                : rgba(color, alpha * 0.82);
              out.beginPath();
              out.arc(x + drift, y, radius, 0, Math.PI * 2);
              out.fill();
            }
            out.restore();
          }

          mask.clearRect(0, 0, w, h);
          mask.save();
          mask.filter = `blur(${Math.max(1, (1 - eased) * 9)}px)`;
          mask.fillStyle = '#fff';
          for (let i = 0; i < 22; i++) {
            const delay = (i % 8) * 0.045;
            const q = clamp((p - delay) / Math.max(0.01, 0.72 - delay));
            if (q <= 0) continue;
            const x = w * (0.05 + 0.9 * noise(i * 47 + 3));
            const y = h * (0.12 + 0.76 * noise(i * 83 + 5));
            const radius = Math.max(w, h) * (0.045 + q * 0.28);
            mask.beginPath();
            mask.arc(x, y, radius, 0, Math.PI * 2);
            mask.fill();
          }
          mask.restore();

          work.clearRect(0, 0, w, h);
          work.globalCompositeOperation = 'source-over';
          work.drawImage(badge, 0, 0);
          work.globalCompositeOperation = 'destination-in';
          work.drawImage(maskCanvas, 0, 0);
          work.globalCompositeOperation = 'source-over';
          out.drawImage(workCanvas, 0, 0);

          if (p < 0.12) {
            const flash = (1 - p / 0.12) * 0.5;
            const glow = out.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.58);
            glow.addColorStop(0, `rgba(255,255,255,${flash})`);
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            out.fillStyle = glow;
            out.fillRect(0, 0, w, h);
          }

          if (p > 0.82) {
            out.save();
            out.globalAlpha = smoothstep(0.82, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawScanReveal(out, badge, w, h, p, color) {
          const eased = easeOutCubic(p);
          const edgeX = -w * 0.18 + eased * w * 1.36;
          const skew = h * 0.24 * (1 - eased);

          out.save();
          out.beginPath();
          out.moveTo(-20, -20);
          out.lineTo(edgeX + skew, -20);
          out.lineTo(edgeX - skew, h + 20);
          out.lineTo(-20, h + 20);
          out.closePath();
          out.clip();
          out.globalAlpha = smoothstep(0.02, 0.24, p);
          out.filter = `blur(${(1 - eased) * 2.5}px)`;
          out.drawImage(badge, -(1 - eased) * w * 0.035, 0);
          out.restore();

          if (p < 0.9) {
            out.save();
            out.globalCompositeOperation = 'screen';
            const beam = out.createLinearGradient(edgeX - 45, 0, edgeX + 45, 0);
            beam.addColorStop(0, 'rgba(255,255,255,0)');
            beam.addColorStop(0.36, rgba(color, 0.72 * (1 - p)));
            beam.addColorStop(0.5, `rgba(255,255,255,${1.0 * (1 - p)})`);
            beam.addColorStop(0.64, rgba(color, 0.72 * (1 - p)));
            beam.addColorStop(1, 'rgba(255,255,255,0)');
            out.fillStyle = beam;
            out.fillRect(edgeX - 48, 0, 96, h);
            out.globalAlpha = (1 - p) * 0.5;
            out.fillStyle = '#22d3ee';
            out.fillRect(edgeX - 9, 0, 3, h);
            out.fillStyle = '#f472b6';
            out.fillRect(edgeX + 7, 0, 3, h);
            out.restore();
          }

          if (p > 0.86) {
            out.save();
            out.globalAlpha = smoothstep(0.86, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawBurstReveal(out, badge, w, h, p, color) {
          const eased = easeOutBack(p);
          const alpha = smoothstep(0.02, 0.34, p);
          const scale = 0.58 + 0.42 * eased;

          out.save();
          out.translate(w / 2, h / 2);
          out.scale(scale, scale);
          out.translate(-w / 2, -h / 2);
          out.globalAlpha = alpha;
          out.filter = `blur(${Math.max(0, (1 - p) * 7)}px)`;
          out.drawImage(badge, 0, 0);
          out.restore();

          if (p < 0.78) {
            out.save();
            out.translate(w / 2, h / 2);
            out.globalCompositeOperation = 'screen';
            out.strokeStyle = color;
            out.lineWidth = 2;
            out.globalAlpha = (1 - p) * 0.85;
            for (let i = 0; i < 24; i++) {
              const angle = i / 24 * Math.PI * 2 + p * 0.7;
              const inner = Math.min(w, h) * (0.12 + p * 0.18);
              const outer = Math.max(w, h) * (0.24 + p * 0.42) * (0.72 + noise(i * 91) * 0.28);
              out.beginPath();
              out.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
              out.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
              out.stroke();
            }
            for (let ring = 0; ring < 3; ring++) {
              const radius = Math.min(w, h) * (0.1 + p * (0.55 + ring * 0.13));
              out.globalAlpha = (1 - p) * (0.55 - ring * 0.1);
              out.beginPath();
              out.arc(0, 0, radius, 0, Math.PI * 2);
              out.stroke();
            }
            out.restore();
          }

          if (p > 0.82) {
            out.save();
            out.globalAlpha = smoothstep(0.82, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawWaveReveal(out, badge, w, h, p, frame, color) {
          const eased = easeOutCubic(p);
          const alpha = smoothstep(0.02, 0.3, p);
          const amplitude = (1 - eased) * Math.max(14, w * 0.08);
          const slices = 24;
          const sliceH = h / slices;

          out.save();
          out.globalAlpha = alpha;
          for (let i = 0; i < slices; i++) {
            const y = i * sliceH;
            const offset = Math.sin(i * 0.82 + frame * 0.72) * amplitude;
            out.save();
            out.beginPath();
            out.rect(0, y, w, sliceH + 1);
            out.clip();
            out.drawImage(badge, offset, 0);
            out.restore();
          }
          out.restore();

          if (p < 0.82) {
            out.save();
            out.strokeStyle = color;
            out.lineWidth = 2.6;
            out.globalAlpha = (1 - p) * 0.85;
            for (let ring = 0; ring < 5; ring++) {
              const radius = (p + ring * 0.11) * Math.min(w, h) * 0.78;
              out.beginPath();
              out.ellipse(w / 2, h / 2, radius * 1.9, radius * 0.7, 0, 0, Math.PI * 2);
              out.stroke();
            }
            out.restore();
          }

          if (p > 0.84) {
            out.save();
            out.globalAlpha = smoothstep(0.84, 1, p);
            out.drawImage(badge, 0, 0);
            out.restore();
          }
        }

        function drawHoldFrame(out, work, badge, w, h, phase, introType, color) {
          const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
          const sheenX = -w * 0.35 + phase * w * 1.7;

          work.clearRect(0, 0, w, h);
          work.globalCompositeOperation = 'source-over';
          work.globalAlpha = 1;
          work.filter = 'none';
          work.drawImage(badge, 0, 0);
          work.globalCompositeOperation = 'source-atop';
          const sheen = work.createLinearGradient(sheenX - 70, 0, sheenX + 70, h);
          sheen.addColorStop(0, 'rgba(255,255,255,0)');
          sheen.addColorStop(0.38, rgba(color, 0.08));
          sheen.addColorStop(0.5, `rgba(255,255,255,${0.48 + pulse * 0.22})`);
          sheen.addColorStop(0.62, rgba(color, 0.12));
          sheen.addColorStop(1, 'rgba(255,255,255,0)');
          work.fillStyle = sheen;
          work.fillRect(sheenX - 90, -20, 180, h + 40);
          work.globalCompositeOperation = 'source-over';

          out.save();
          out.filter = `drop-shadow(0 0 ${2 + pulse * 4}px ${rgba(color, 0.42)})`;
          out.drawImage(workCanvas, 0, 0);
          out.restore();

          if (introType === 'glitch' && phase < 0.18) {
            const micro = Math.sin(phase / 0.18 * Math.PI) * 3.5;
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.26;
            out.filter = 'hue-rotate(120deg) saturate(4)';
            out.drawImage(badge, micro, 0);
            out.filter = 'hue-rotate(260deg) saturate(4)';
            out.drawImage(badge, -micro, 0);
            out.restore();
          } else if (introType === 'wave') {
            out.save();
            out.strokeStyle = color;
            out.lineWidth = 1.4;
            out.globalAlpha = 0.12 + pulse * 0.12;
            for (let ring = 0; ring < 2; ring++) {
              const radius = Math.min(w, h) * (0.36 + ring * 0.18 + pulse * 0.035);
              out.beginPath();
              out.ellipse(w / 2, h / 2, radius * 1.9, radius * 0.62, 0, 0, Math.PI * 2);
              out.stroke();
            }
            out.restore();
          } else if (introType === 'scan') {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.28;
            out.fillStyle = color;
            out.fillRect(sheenX, h * 0.12, 2, h * 0.76);
            out.restore();
          } else if (introType === 'prism' || introType === 'chrome') {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.22 + pulse * 0.12;
            out.strokeStyle = introType === 'chrome' ? '#ffffff' : color;
            out.lineWidth = introType === 'chrome' ? 1.8 : 1.2;
            for (let line = -1; line < 3; line++) {
              out.beginPath();
              out.moveTo(sheenX + line * 24 - 70, 0);
              out.lineTo(sheenX + line * 24 + 35, h);
              out.stroke();
            }
            out.restore();
          } else if (introType === 'silk' || introType === 'ribbon') {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.12 + pulse * 0.1;
            out.strokeStyle = introType === 'silk' ? color : '#ffffff';
            out.lineWidth = 1.4;
            for (let ribbon = 0; ribbon < 3; ribbon++) {
              const y = h * (0.27 + ribbon * 0.22);
              out.beginPath();
              out.moveTo(-20, y);
              out.bezierCurveTo(w * 0.28, y - 18, w * 0.46, y + 18, w * 0.68, y - 6);
              out.bezierCurveTo(w * 0.84, y - 18, w + 20, y + 10, w + 30, y);
              out.stroke();
            }
            out.restore();
          } else if (introType === 'crystal' || introType === 'shatter') {
            out.save();
            out.translate(w / 2, h / 2);
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.13 + pulse * 0.1;
            out.strokeStyle = color;
            out.lineWidth = 1;
            for (let facet = 0; facet < 8; facet++) {
              const angle = facet / 8 * Math.PI * 2 + phase * 0.5;
              const radius = Math.min(w, h) * (0.28 + pulse * 0.18);
              out.beginPath();
              out.moveTo(0, 0);
              out.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
              out.stroke();
            }
            out.restore();
          } else if (introType === 'orbit' || introType === 'halo') {
            out.save();
            out.translate(w / 2, h / 2);
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.16 + pulse * 0.1;
            out.strokeStyle = introType === 'halo' ? '#ffffff' : color;
            out.lineWidth = 1.2;
            for (let ring = 0; ring < 2; ring++) {
              out.beginPath();
              out.ellipse(0, 0, Math.min(w, h) * (0.38 + ring * 0.16), Math.min(w, h) * (0.12 + ring * 0.04), ring * 0.2 + phase * 0.2, 0, Math.PI * 2);
              out.stroke();
            }
            out.restore();
          } else if (introType === 'particles' || introType === 'glow' || introType === 'aurora') {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.1 + pulse * 0.12;
            out.strokeStyle = color;
            out.lineWidth = 1.2;
            out.beginPath();
            out.arc(w / 2, h / 2, Math.min(w, h) * (0.3 + pulse * 0.12), phase * Math.PI * 2, phase * Math.PI * 2 + Math.PI * 1.35);
            out.stroke();
            out.restore();
          } else if (introType === 'matrix') {
            out.save();
            out.globalCompositeOperation = 'screen';
            out.globalAlpha = 0.1 + pulse * 0.05;
            out.fillStyle = color;
            for (let y = 0; y < h; y += 7) out.fillRect(0, y, w, 1);
            out.restore();
          }

          out.save();
          out.globalCompositeOperation = 'screen';
          for (let i = 0; i < 7; i++) {
            const motePhase = (phase + i / 7) % 1;
            const x = w * (0.08 + 0.84 * noise(i * 59 + 17));
            const y = h * (0.88 - motePhase * 0.7);
            const radius = 0.7 + 1.4 * Math.sin(motePhase * Math.PI);
            out.globalAlpha = Math.sin(motePhase * Math.PI) * 0.55;
            out.fillStyle = i % 2 ? color : '#fff';
            out.beginPath();
            out.arc(x, y, radius, 0, Math.PI * 2);
            out.fill();
          }
          out.restore();

          drawSignatureDiamond(out, w - 11, h - 10, 8 + pulse * 2.5, 0.72 + pulse * 0.28);
          drawSignatureDiamond(out, w * (0.2 + phase * 0.58), h * 0.23, 3.2 + pulse * 1.4, 0.32 + pulse * 0.42);
        }

        function drawSignatureDiamond(out, x, y, size, alpha) {
          if (alpha <= 0) return;
          out.save();
          out.translate(x, y);
          out.globalAlpha = alpha;
          out.fillStyle = '#e5e7eb';
          out.shadowColor = 'rgba(255,255,255,0.65)';
          out.shadowBlur = 8;
          out.beginPath();
          out.moveTo(0, -size);
          out.quadraticCurveTo(0, 0, size, 0);
          out.quadraticCurveTo(0, 0, 0, size);
          out.quadraticCurveTo(0, 0, -size, 0);
          out.quadraticCurveTo(0, 0, 0, -size);
          out.fill();
          out.restore();
        }

        function accentColor(name) {
          const colors = {
            silver: '#f8fafc',
            blue: '#38bdf8',
            cyan: '#22d3ee',
            purple: '#c084fc',
            gold: '#facc15',
            green: '#4ade80',
            orange: '#fb923c',
            rainbow: '#f472b6',
            champagne: '#f7d794',
            rose: '#fb7185',
            emerald: '#34d399',
            sapphire: '#60a5fa',
            amethyst: '#c084fc',
            ice: '#bae6fd',
            copper: '#f59e0b',
            platinum: '#e2e8f0',
            teal: '#2dd4bf',
            ruby: '#f43f5e',
            indigo: '#818cf8',
            lime: '#a3e635'
          };
          return colors[name] || colors.silver;
        }

        function rgba(hex, alpha) {
          const value = Number.parseInt(hex.slice(1), 16);
          const r = value >> 16;
          const g = value >> 8 & 255;
          const b = value & 255;
          return `rgba(${r},${g},${b},${alpha})`;
        }

        function noise(seed) {
          const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
          return x - Math.floor(x);
        }

        function clamp(value) {
          return Math.max(0, Math.min(1, value));
        }

        function smoothstep(a, b, value) {
          const x = clamp((value - a) / Math.max(0.0001, b - a));
          return x * x * (3 - 2 * x);
        }

        function easeOutCubic(value) {
          return 1 - Math.pow(1 - value, 3);
        }

        function easeInOutCubic(value) {
          return value < 0.5
            ? 4 * value * value * value
            : 1 - Math.pow(-2 * value + 2, 3) / 2;
        }

        function easeOutBack(value) {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
        }
      }, imgSrc, visualStyle.intro, visualStyle.effect, profile.targetHeight, activeFrames, profile.holdFrames);

      const { w, h } = frames[0];
      const encodedFrames = frames.map(frame => palettizeFrame(new Uint8Array(frame.data), w, h));
      const introFrames = encodedFrames.slice(0, activeFrames);
      const holdFrames = encodedFrames.slice(activeFrames);
      const gif = GIFEncoder();

      for (let f = 0; f < profile.totalFrames; f++) {
        const frame = f < activeFrames
          ? introFrames[f]
          : holdFrames[(f - activeFrames) % holdFrames.length];
        gif.writeFrame(frame.index, w, h, {
          palette: frame.palette,
          delay: profile.delay,
          repeat: 0,
          transparent: true,
          transparentIndex: 0,
          dispose: 2
        });
      }

      gif.finish();
      const buffer = Buffer.from(gif.bytes());
      fs.writeFileSync(path.join(BADGES_DIR, item.gif), buffer);
      console.log(` -> ${item.gif} (${w}x${h}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nAll ${queue.length} Luxury Motion v2 animated badges generated.`);
}

function palettizeFrame(data, w, h) {
  const opaque = [];

  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 16) {
      data[p] = 0;
      data[p + 1] = 0;
      data[p + 2] = 0;
      data[p + 3] = 0;
    } else {
      data[p] = Math.max(1, data[p]);
      data[p + 1] = Math.max(1, data[p + 1]);
      data[p + 2] = Math.max(1, data[p + 2]);
      data[p + 3] = 255;
      opaque.push(data[p], data[p + 1], data[p + 2], 255);
    }
  }

  const subPalette = opaque.length > 0
    ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' })
    : [[255, 255, 255]];
  const palette = [[0, 0, 0], ...subPalette];
  const index = applyPalette(data, palette, 'rgb565');

  for (let p = 0, px = 0; p < data.length; p += 4, px++) {
    if (data[p + 3] < 16) {
      index[px] = 0;
    } else if (index[px] === 0) {
      index[px] = 1;
    }
  }

  if (index.length !== w * h) {
    throw new Error('Indexed frame dimensions are invalid');
  }

  return { index, palette };
}

generateAll().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
