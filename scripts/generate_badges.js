const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, applyPalette, quantize } = require('gifenc');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

// Darpit Animated Deluxe V1.0 uses 150 frames at 30 ms per frame.
// The opening follows the reference cadence, followed by a stronger animated hold.
const TOTAL_FRAMES = 150;
const DELAY = 30;
const TARGET_HEIGHT = 150;
const HOLD_FRAMES = 30;

const INTRO_FRAMES = {
  glitch: 22, // 0.63 s: RGB/liquid glitch, used by source badges
  burst: 16,  // 0.45 s: fast light burst, used by HDR/DTS badges
  scan: 33,   // 0.96 s: directional cinematic scan
  wave: 33,   // 0.96 s: audio-wave distortion
  ink: 76     // 2.25 s: ink/smoke materialisation, used by resolution badges
};

const BADGES = [
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

async function generateAll() {
  const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
  const only = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map(name => name.trim()).filter(Boolean))
    : null;
  const queue = only
    ? BADGES.filter(item => only.has(item.gif) || only.has(item.png))
    : BADGES;

  if (queue.length === 0) {
    throw new Error('No badges matched --only');
  }

  console.log(
    `Generating ${queue.length} Darpit Animated Deluxe-style badges ` +
    `(${TOTAL_FRAMES} frames, ${DELAY} ms, ${(TOTAL_FRAMES * DELAY / 1000).toFixed(1)} s loop)...`
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

      const activeFrames = INTRO_FRAMES[item.intro];
      console.log(
        `[${i + 1}/${queue.length}] ${item.png} -> ${item.gif} ` +
        `(${item.intro}, ${(activeFrames * DELAY / 1000).toFixed(2)} s intro)...`
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
            if (intro === 'ink') {
              drawInkReveal(ctx, workCtx, maskCtx, badgeCanvas, canvasW, canvasH, targetW, targetH, p, f, accent);
            } else if (intro === 'scan') {
              drawScanReveal(ctx, badgeCanvas, canvasW, canvasH, p, accent);
            } else if (intro === 'burst') {
              drawBurstReveal(ctx, badgeCanvas, canvasW, canvasH, p, accent);
            } else if (intro === 'wave') {
              drawWaveReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
            } else {
              drawGlitchReveal(ctx, badgeCanvas, canvasW, canvasH, p, f, accent);
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
            rainbow: '#f472b6'
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
      }, imgSrc, item.intro, item.effect, TARGET_HEIGHT, activeFrames, HOLD_FRAMES);

      const { w, h } = frames[0];
      const encodedFrames = frames.map(frame => palettizeFrame(new Uint8Array(frame.data), w, h));
      const introFrames = encodedFrames.slice(0, activeFrames);
      const holdFrames = encodedFrames.slice(activeFrames);
      const gif = GIFEncoder();

      for (let f = 0; f < TOTAL_FRAMES; f++) {
        const frame = f < activeFrames
          ? introFrames[f]
          : holdFrames[(f - activeFrames) % holdFrames.length];
        gif.writeFrame(frame.index, w, h, {
          palette: frame.palette,
          delay: DELAY,
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

  console.log(`\nAll ${queue.length} Darpit Animated Deluxe-style badges generated.`);
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
