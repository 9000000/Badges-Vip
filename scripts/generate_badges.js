const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const TOTAL_FRAMES = 24;
const DELAY = 50; // 50ms per frame = 20fps, smooth 1.2s seamless loop
const TARGET_HEIGHT = 150;

// ============================================================
// DARPIT DELUXE 3D ANIMATED STYLE
// - Badge is STATIONARY (no jumping, no bouncing, no pop-in/out)
// - Badge is ALWAYS VISIBLE (no fade in/out)
// - 3D chiseled depth (extruded layers)
// - Animated specular light sheen sweeps across the surface
// - Darpit-signature twinkling diamond sparkles
// - Per-badge unique surface animation (rainbow, lightning, etc.)
// ============================================================

const BADGES = [
  // Source
  { png: 'remux.png', gif: 'remux.gif', effect: 'silver_sheen' },
  { png: 'blu_ray_disc.png', gif: 'blu_ray_disc.gif', effect: 'silver_sheen' },
  { png: 'WEBDL_transparent_4x.png', gif: 'WEBDL_transparent_4x.gif', effect: 'silver_sheen' },
  { png: 'WEBRip_transparent_4x.png', gif: 'WEBRip_transparent_4x.gif', effect: 'silver_sheen' },
  { png: 'HDTV_transparent_4x.png', gif: 'HDTV_transparent_4x.gif', effect: 'silver_sheen' },
  { png: 'DVD_RIP_transparent_4x.png', gif: 'DVD_RIP_transparent_4x.gif', effect: 'silver_sheen' },

  // Resolution
  { png: '4k_ultra_hd.png', gif: '4k_ultra_hd.gif', effect: 'gold_sheen' },
  { png: '1080p_full_hd.png', gif: '1080p_full_hd.gif', effect: 'silver_sheen' },
  { png: '720p_hd.png', gif: '720p_hd.gif', effect: 'silver_sheen' },
  { png: '480p_sd.png', gif: '480p_sd.gif', effect: 'silver_sheen' },

  // Video Tech
  { png: 'dolby_vision.png', gif: 'dolby_vision.gif', effect: 'rainbow_prism' },
  { png: 'hdr10_plus.png', gif: 'hdr10_plus.gif', effect: 'gold_sheen' },
  { png: 'hdr10.png', gif: 'hdr10.gif', effect: 'gold_sheen' },
  { png: 'hdr.png', gif: 'hdr.gif', effect: 'rainbow_prism' },
  { png: 'SDR_transparent_4x.png', gif: 'SDR_transparent_4x.gif', effect: 'silver_sheen' },
  { png: 'imax_enhanced.png', gif: 'imax_enhanced.gif', effect: 'blue_sheen' },
  { png: 'imax.png', gif: 'imax.gif', effect: 'blue_sheen' },

  // Video Codec
  { png: 'HEVC_transparent_4x.png', gif: 'HEVC_transparent_4x.gif', effect: 'green_sheen' },
  { png: 'AVC_transparent_4x.png', gif: 'AVC_transparent_4x.gif', effect: 'silver_sheen' },

  // Bit Depth
  { png: '10Bit_transparent_4x.png', gif: '10Bit_transparent_4x.gif', effect: 'rainbow_prism' },
  { png: '8Bit_transparent_4x.png', gif: '8Bit_transparent_4x.gif', effect: 'silver_sheen' },

  // Audio Tech
  { png: 'dolby_atmos.png', gif: 'dolby_atmos.gif', effect: 'spatial_waves' },
  { png: 'truehd.png', gif: 'truehd.gif', effect: 'silver_sheen' },
  { png: 'dolby_digital_plus.png', gif: 'dolby_digital_plus.gif', effect: 'silver_sheen' },
  { png: 'dolby_digital.png', gif: 'dolby_digital.gif', effect: 'silver_sheen' },
  { png: 'dts_x.png', gif: 'dts_x.gif', effect: 'orange_sheen' },
  { png: 'dts_hd_master_audio.png', gif: 'dts_hd_master_audio.gif', effect: 'gold_sheen' },
  { png: 'dts_hd.png', gif: 'dts_hd.gif', effect: 'orange_sheen' },
  { png: 'dts.png', gif: 'dts.gif', effect: 'orange_sheen' },

  // Audio Channels
  { png: '7_1_audio.png', gif: '7_1_audio.gif', effect: 'silver_sheen' },
  { png: '5_1_audio.png', gif: '5_1_audio.gif', effect: 'silver_sheen' }
];

async function generateAll() {
  console.log(`Starting generation of ${BADGES.length} DARPIT DELUXE 3D ANIMATED badges (stationary, sheen+sparkles)...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();

  for (let i = 0; i < BADGES.length; i++) {
    const item = BADGES[i];
    const pngPath = path.join(BADGES_DIR, item.png);
    if (!fs.existsSync(pngPath)) {
      console.error(`Missing PNG: ${pngPath}`);
      continue;
    }

    console.log(`[${i + 1}/${BADGES.length}] ${item.png} -> ${item.gif} (${item.effect})...`);
    const pngBase64 = fs.readFileSync(pngPath).toString('base64');
    const imgSrc = `data:image/png;base64,${pngBase64}`;

    const frames = await page.evaluate(async (src, effect, targetH, totalFrames) => {
      const img = new Image();
      img.src = src;
      await new Promise(r => img.onload = r);

      // Render source PNG to offscreen canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(img, 0, 0);

      // Auto-crop to content bounding box
      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      let minX = offCanvas.width, minY = offCanvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < offCanvas.height; y++) {
        for (let x = 0; x < offCanvas.width; x++) {
          if (data[(y * offCanvas.width + x) * 4 + 3] > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);
      const aspect = cropW / cropH;
      const targetW = Math.round(targetH * aspect);
      const padX = 25;
      const padY = 20;
      const canvasW = targetW + padX * 2;
      const canvasH = targetH + padY * 2;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cx = canvasW / 2;
      const cy = canvasH / 2;
      const drawX = -targetW / 2;
      const drawY = -targetH / 2;

      const rendered = [];

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames; // 0..1 seamless loop progress
        ctx.clearRect(0, 0, canvasW, canvasH);

        ctx.save();
        ctx.translate(cx, cy);

        // ========== 1. STATIC 3D DROP SHADOW ==========
        ctx.save();
        ctx.translate(0, targetH * 0.44);
        ctx.scale(1.0, 0.22);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, targetW * 0.46, targetH * 0.16, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // ========== 2. 3D CHISELED DEPTH EXTRUSION ==========
        for (let d = 4; d >= 1; d--) {
          const bCanvas = document.createElement('canvas');
          bCanvas.width = canvasW;
          bCanvas.height = canvasH;
          const bCtx = bCanvas.getContext('2d');
          bCtx.drawImage(offCanvas, minX, minY, cropW, cropH,
            drawX + d + cx, drawY + d + cy, targetW, targetH);
          bCtx.globalCompositeOperation = 'source-in';
          bCtx.fillStyle = `rgba(8, 12, 22, ${0.82 + d * 0.04})`;
          bCtx.fillRect(0, 0, canvasW, canvasH);
          ctx.drawImage(bCanvas, -cx, -cy);
        }

        // ========== 3. FRONT FACE (CRISP, 100% SOLID) ==========
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

        // ========== 4. ANIMATED SURFACE ILLUMINATION ==========
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        if (effect === 'rainbow_prism') {
          // Smooth rotating rainbow gradient overlay
          const hue = (t * 360) % 360;
          const grad = ctx.createLinearGradient(drawX, drawY, drawX + targetW, drawY + targetH);
          grad.addColorStop(0, `hsla(${hue}, 100%, 75%, 0.4)`);
          grad.addColorStop(0.25, `hsla(${(hue + 90) % 360}, 100%, 70%, 0.4)`);
          grad.addColorStop(0.5, `hsla(${(hue + 180) % 360}, 100%, 70%, 0.4)`);
          grad.addColorStop(0.75, `hsla(${(hue + 270) % 360}, 100%, 70%, 0.4)`);
          grad.addColorStop(1, `hsla(${hue}, 100%, 75%, 0.4)`);
          ctx.fillStyle = grad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        } else {
          // Specular light beam sweep (Darpit signature)
          const sheenProgress = (t * 1.2) % 1;
          const sheenX = drawX - targetW * 0.4 + sheenProgress * (targetW * 1.8);
          const sheenW = 100;

          // Tint color based on effect
          let sheenR = 255, sheenG = 255, sheenB = 255;
          if (effect === 'gold_sheen') { sheenR = 255; sheenG = 220; sheenB = 140; }
          else if (effect === 'blue_sheen') { sheenR = 140; sheenG = 200; sheenB = 255; }
          else if (effect === 'green_sheen') { sheenR = 140; sheenG = 255; sheenB = 180; }
          else if (effect === 'orange_sheen') { sheenR = 255; sheenG = 180; sheenB = 100; }

          const sGrad = ctx.createLinearGradient(sheenX, drawY, sheenX + sheenW, drawY + targetH);
          sGrad.addColorStop(0, `rgba(${sheenR}, ${sheenG}, ${sheenB}, 0)`);
          sGrad.addColorStop(0.3, `rgba(${sheenR}, ${sheenG}, ${sheenB}, 0.12)`);
          sGrad.addColorStop(0.5, `rgba(${sheenR}, ${sheenG}, ${sheenB}, 0.42)`);
          sGrad.addColorStop(0.7, `rgba(${sheenR}, ${sheenG}, ${sheenB}, 0.12)`);
          sGrad.addColorStop(1, `rgba(${sheenR}, ${sheenG}, ${sheenB}, 0)`);
          ctx.fillStyle = sGrad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        }
        ctx.restore();

        // ========== 5. DARPIT DIAMOND SPARKLES ==========
        const s1 = (t * 2) % 1;
        drawDiamond(ctx, drawX + targetW * 0.95, drawY + targetH * 0.90, 11, s1, '#ffffff');
        const s2 = (t * 2 + 0.5) % 1;
        drawDiamond(ctx, drawX + targetW * 0.18, drawY + targetH * 0.20, 12, s2, '#fde047');

        // ========== 6. OPTIONAL SPATIAL WAVES (Atmos) ==========
        if (effect === 'spatial_waves') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.14, drawY + targetH * 0.5);
          for (let arc = 1; arc <= 3; arc++) {
            const wave = (t + arc / 3) % 1;
            const r = 10 + wave * 25;
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 - wave * 0.7})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 1.1 * Math.PI, 1.9 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore(); // end translate(cx, cy)

        const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
        rendered.push({
          data: Array.from(frameData.data),
          w: canvasW,
          h: canvasH
        });
      }

      return rendered;

      function drawDiamond(ctx, x, y, size, prog, glow) {
        if (prog >= 0.85) return;
        const a = Math.sin(prog / 0.85 * Math.PI);
        const s = size * a;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(prog * Math.PI * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.22, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }, imgSrc, item.effect, TARGET_HEIGHT, TOTAL_FRAMES);

    // Encode GIF
    const { w, h } = frames[0];
    const gif = GIFEncoder();

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const data = new Uint8Array(frames[f].data);
      const opaque = [];
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] >= 16) {
          opaque.push(Math.max(1, data[p]), Math.max(1, data[p + 1]), Math.max(1, data[p + 2]), 255);
        }
      }

      const subPalette = opaque.length > 0
        ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' })
        : [[255, 255, 255]];
      const fullPalette = [[0, 0, 0], ...subPalette];

      const index = new Uint8Array(w * h);
      for (let p = 0, px = 0; p < data.length; p += 4, px++) {
        if (data[p + 3] < 16) {
          index[px] = 0;
        } else {
          const r = Math.max(1, data[p]);
          const g = Math.max(1, data[p + 1]);
          const b = Math.max(1, data[p + 2]);
          let bestDist = Infinity, bestIdx = 1;
          for (let c = 0; c < subPalette.length; c++) {
            const dr = r - subPalette[c][0];
            const dg = g - subPalette[c][1];
            const db = b - subPalette[c][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) { bestDist = dist; bestIdx = c + 1; }
          }
          index[px] = bestIdx;
        }
      }

      gif.writeFrame(index, w, h, {
        palette: fullPalette,
        delay: DELAY,
        repeat: 0,
        transparent: true,
        transparentIndex: 0,
        dispose: 2
      });
    }

    gif.finish();
    const outPath = path.join(BADGES_DIR, item.gif);
    const buffer = Buffer.from(gif.bytes());
    fs.writeFileSync(outPath, buffer);
    console.log(` -> ${item.gif} (${w}x${h}, ${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log(`\n🎉 All ${BADGES.length} Darpit Deluxe 3D Animated badges generated!`);
}

generateAll().catch(console.error);
