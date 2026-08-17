const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const TOTAL_FRAMES = 24;
const FPS = 24;
const DELAY = Math.round(1000 / FPS);

// 31 Authentic Badges using the original PNG artwork with universal contrast & smooth animations
const BADGES = [
  // Source
  { png: 'remux.png', gif: 'remux.gif', effect: 'ice_sheen_sparkle', targetHeight: 80 },
  { png: 'blu_ray_disc.png', gif: 'blu_ray_disc.gif', effect: 'bluray_laser', targetHeight: 80 },
  { png: 'WEBDL_transparent_4x.png', gif: 'WEBDL_transparent_4x.gif', effect: 'emerald_stream', targetHeight: 80 },
  { png: 'WEBRip_transparent_4x.png', gif: 'WEBRip_transparent_4x.gif', effect: 'violet_sheen', targetHeight: 80 },
  { png: 'HDTV_transparent_4x.png', gif: 'HDTV_transparent_4x.gif', effect: 'gold_broadcast', targetHeight: 80 },
  { png: 'DVD_RIP_transparent_4x.png', gif: 'DVD_RIP_transparent_4x.gif', effect: 'amber_sheen', targetHeight: 80 },

  // Resolution
  { png: '4k_ultra_hd.png', gif: '4k_ultra_hd.gif', effect: 'gold_sheen_sparkle', targetHeight: 80 },
  { png: '1080p_full_hd.png', gif: '1080p_full_hd.gif', effect: 'cyan_laser_streak', targetHeight: 80 },
  { png: '720p_hd.png', gif: '720p_hd.gif', effect: 'blue_sheen', targetHeight: 80 },
  { png: '480p_sd.png', gif: '480p_sd.gif', effect: 'silver_sheen', targetHeight: 80 },

  // Video Tech
  { png: 'dolby_vision.png', gif: 'dolby_vision.gif', effect: 'rainbow_prism', targetHeight: 80 },
  { png: 'hdr10_plus.png', gif: 'hdr10_plus.gif', effect: 'hdr10_plus_flare', targetHeight: 80 },
  { png: 'hdr10.png', gif: 'hdr10.gif', effect: 'solar_flare', targetHeight: 80 },
  { png: 'hdr.png', gif: 'hdr.gif', effect: 'gold_sheen_sparkle', targetHeight: 80 },
  { png: 'SDR_transparent_4x.png', gif: 'SDR_transparent_4x.gif', effect: 'silver_sheen', targetHeight: 80 },
  { png: 'imax_enhanced.png', gif: 'imax_enhanced.gif', effect: 'anamorphic_flare', targetHeight: 80 },
  { png: 'imax.png', gif: 'imax.gif', effect: 'anamorphic_flare', targetHeight: 80 },

  // Video Codec
  { png: 'HEVC_transparent_4x.png', gif: 'HEVC_transparent_4x.gif', effect: 'emerald_stream', targetHeight: 80 },
  { png: 'AVC_transparent_4x.png', gif: 'AVC_transparent_4x.gif', effect: 'violet_sheen', targetHeight: 80 },

  // Bit Depth
  { png: '10Bit_transparent_4x.png', gif: '10Bit_transparent_4x.gif', effect: 'rainbow_prism', targetHeight: 80 },
  { png: '8Bit_transparent_4x.png', gif: '8Bit_transparent_4x.gif', effect: 'cyan_laser_streak', targetHeight: 80 },

  // Audio Tech
  { png: 'dolby_atmos.png', gif: 'dolby_atmos.gif', effect: 'spatial_atmos_dome', targetHeight: 80 },
  { png: 'truehd.png', gif: 'truehd.gif', effect: 'blue_sine_wave', targetHeight: 80 },
  { png: 'dolby_digital_plus.png', gif: 'dolby_digital_plus.gif', effect: 'surround_arcs', targetHeight: 80 },
  { png: 'dolby_digital.png', gif: 'dolby_digital.gif', effect: 'surround_arcs', targetHeight: 80 },
  { png: 'dts_x.png', gif: 'dts_x.gif', effect: 'dts_x_shockwave', targetHeight: 80 },
  { png: 'dts_hd_master_audio.png', gif: 'dts_hd_master_audio.gif', effect: 'master_audio_equalizer', targetHeight: 80 },
  { png: 'dts_hd.png', gif: 'dts_hd.gif', effect: 'amber_sheen', targetHeight: 80 },
  { png: 'dts.png', gif: 'dts.gif', effect: 'amber_sheen', targetHeight: 80 },

  // Audio Channels
  { png: '7_1_audio.png', gif: '7_1_audio.gif', effect: '71_radar', targetHeight: 80 },
  { png: '5_1_audio.png', gif: '5_1_audio.gif', effect: '51_radar', targetHeight: 80 }
];

async function generateAll() {
  console.log(`Starting generation of ${BADGES.length} authentic, pure-transparent animated GIF badges...`);

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
      console.error(`Missing PNG file: ${pngPath}`);
      continue;
    }

    console.log(`[${i + 1}/${BADGES.length}] Processing ${item.png} -> ${item.gif} (Effect: ${item.effect})...`);
    const pngBase64 = fs.readFileSync(pngPath).toString('base64');
    const imgSrc = `data:image/png;base64,${pngBase64}`;

    const frames = await page.evaluate(async (src, effect, targetH, totalFrames) => {
      const img = new Image();
      img.src = src;
      await new Promise(r => img.onload = r);

      // Auto-crop to content bounding box
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);

      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      let minX = offCanvas.width, minY = offCanvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < offCanvas.height; y++) {
        for (let x = 0; x < offCanvas.width; x++) {
          const a = data[(y * offCanvas.width + x) * 4 + 3];
          if (a > 15) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);

      // Target canvas dimensions
      const aspect = cropW / cropH;
      const targetW = Math.round(targetH * aspect);
      const canvasW = targetW + 28;
      const canvasH = targetH + 18;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      const drawX = (canvasW - targetW) / 2;
      const drawY = (canvasH - targetH) / 2;

      const rendered = [];

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        ctx.clearRect(0, 0, canvasW, canvasH); // 100% transparent

        // 1. Draw subtle ambient dark halo behind artwork for universal contrast on light backgrounds
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);
        ctx.restore();

        // 2. Draw crisp base original artwork
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

        // 3. Specialized modern animation effects masked to artwork
        if (effect === 'ice_sheen_sparkle' || effect === 'gold_sheen_sparkle' || effect === 'silver_sheen' || effect === 'blue_sheen' || effect === 'amber_sheen' || effect === 'violet_sheen') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();

          if (effect.includes('sparkle')) {
            drawSparkle(ctx, drawX + targetW * 0.15, drawY + targetH * 0.25, 7, (t * 2) % 1);
            drawSparkle(ctx, drawX + targetW * 0.85, drawY + targetH * 0.75, 6, (t + 0.5) % 1);
          }
        } else if (effect === 'rainbow_prism') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const hueShift = (t * 360) % 360;
          const rainbowGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
          rainbowGrad.addColorStop(0, `hsla(${hueShift}, 100%, 75%, 0.85)`);
          rainbowGrad.addColorStop(0.33, `hsla(${(hueShift + 120) % 360}, 100%, 70%, 0.85)`);
          rainbowGrad.addColorStop(0.66, `hsla(${(hueShift + 240) % 360}, 100%, 70%, 0.85)`);
          rainbowGrad.addColorStop(1, `hsla(${hueShift}, 100%, 75%, 0.85)`);
          ctx.fillStyle = rainbowGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else if (effect === 'bluray_laser') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const laserAngle = t * 2 * Math.PI;
          const conic = ctx.createConicGradient(laserAngle, drawX + targetH * 0.4, drawY + targetH * 0.5);
          conic.addColorStop(0, 'rgba(56, 189, 248, 0)');
          conic.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
          conic.addColorStop(0.4, 'rgba(236, 72, 153, 0.9)');
          conic.addColorStop(0.6, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = conic;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else if (effect === 'cyan_laser_streak') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const scanX = drawX + t * targetW;
          const laserGrad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
          laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          laserGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          laserGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = laserGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else if (effect === 'anamorphic_flare') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const flareX = drawX + t * targetW;
          const flareGrad = ctx.createLinearGradient(flareX - 40, 0, flareX + 40, 0);
          flareGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          flareGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = flareGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();

          // External horizontal lens flare beam
          const beamX = drawX + t * targetW;
          const beamGrad = ctx.createLinearGradient(beamX - 50, drawY + targetH / 2, beamX + 50, drawY + targetH / 2);
          beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
          beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(beamX - 50, drawY + targetH / 2 - 2, 100, 4);
        } else if (effect === 'hdr10_plus_flare') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();

          // Glowing pulse on the '+'
          const plusPulse = 1 + Math.sin(t * 2 * Math.PI) * 0.3;
          drawSparkle(ctx, drawX + targetW * 0.92, drawY + targetH * 0.35, 8 * plusPulse, 1);
        } else if (effect === 'solar_flare') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const flareR = targetH * (0.3 + 0.2 * Math.sin(t * 2 * Math.PI));
          const flareGrad = ctx.createRadialGradient(drawX + targetW * 0.4, drawY + targetH * 0.5, 4, drawX + targetW * 0.4, drawY + targetH * 0.5, flareR);
          flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          flareGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.8)');
          flareGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = flareGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else if (effect === 'spatial_atmos_dome') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();

          // 3D Spatial Audio Dome Arcs
          ctx.save();
          ctx.translate(drawX + targetW * 0.15, drawY + targetH * 0.5);
          for (let arc = 1; arc <= 3; arc++) {
            const wave = (t + arc / 3) % 1;
            const r = 8 + wave * 18;
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - wave})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 1.1 * Math.PI, 1.9 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === 'dts_x_shockwave') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();

          // Sonic shockwaves around ':X'
          ctx.save();
          ctx.translate(drawX + targetW * 0.85, drawY + targetH * 0.5);
          for (let w = 1; w <= 3; w++) {
            const wp = (t + w / 3) % 1;
            ctx.strokeStyle = `rgba(249, 115, 22, ${1 - wp})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 8 + wp * 20, 0, 2 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === 'master_audio_equalizer') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else if (effect === '71_radar' || effect === '51_radar') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const sheenX = -canvasW + t * (canvasW * 2.5);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 50, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
          ctx.restore();
        }

        const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
        rendered.push({
          data: Array.from(frameData.data),
          w: canvasW,
          h: canvasH
        });
      }

      return rendered;

      function drawSparkle(ctx, x, y, size, prog) {
        if (prog >= 0.8) return;
        const alpha = Math.sin(prog / 0.8 * Math.PI);
        const s = size * alpha;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
        ctx.restore();
      }
    }, imgSrc, item.effect, item.targetHeight, TOTAL_FRAMES);

    const { w, h } = frames[0];
    const gif = GIFEncoder();

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const data = new Uint8Array(frames[f].data);
      const opaque = [];
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] >= 32) {
          opaque.push(Math.max(1, data[p]), Math.max(1, data[p + 1]), Math.max(1, data[p + 2]), 255);
        }
      }

      const subPalette = opaque.length > 0 ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' }) : [[255, 255, 255]];
      const fullPalette = [[0, 0, 0], ...subPalette];

      const index = new Uint8Array(w * h);
      for (let p = 0, px = 0; p < data.length; p += 4, px++) {
        if (data[p + 3] < 32) {
          index[px] = 0; // Transparent
        } else {
          const r = Math.max(1, data[p]), g = Math.max(1, data[p + 1]), b = Math.max(1, data[p + 2]);
          let bestDist = Infinity;
          let bestIdx = 1;
          for (let c = 0; c < subPalette.length; c++) {
            const pr = subPalette[c][0], pg = subPalette[c][1], pb = subPalette[c][2];
            const dr = r - pr, dg = g - pg, db = b - pb;
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = c + 1;
            }
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
        dispose: 2 // Restore to transparent background
      });
    }

    gif.finish();
    const outPath = path.join(BADGES_DIR, item.gif);
    const buffer = Buffer.from(gif.bytes());
    fs.writeFileSync(outPath, buffer);
    console.log(` -> Successfully saved ${item.gif} (${w}x${h}, ${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log(`\n🎉 All ${BADGES.length} authentic transparent animated GIF badges generated!`);
}

generateAll().catch(console.error);
