const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const TOTAL_FRAMES = 24;
const FPS = 24;
const DELAY = Math.round(1000 / FPS);
const TARGET_HEIGHT = 150; // 2x Crisp HD Resolution for razor-sharp antialiased edges

// 31 Authentic Badges using original PNG artwork with rich, multi-layered animations
const BADGES = [
  // Source
  { png: 'remux.png', gif: 'remux.gif', effect: 'remux_master' },
  { png: 'blu_ray_disc.png', gif: 'blu_ray_disc.gif', effect: 'bluray_hologram' },
  { png: 'WEBDL_transparent_4x.png', gif: 'WEBDL_transparent_4x.gif', effect: 'webdl_stream' },
  { png: 'WEBRip_transparent_4x.png', gif: 'WEBRip_transparent_4x.gif', effect: 'webrip_equalizer' },
  { png: 'HDTV_transparent_4x.png', gif: 'HDTV_transparent_4x.gif', effect: 'hdtv_broadcast' },
  { png: 'DVD_RIP_transparent_4x.png', gif: 'DVD_RIP_transparent_4x.gif', effect: 'dvd_laser' },

  // Resolution
  { png: '4k_ultra_hd.png', gif: '4k_ultra_hd.gif', effect: '4k_gold_sparkle' },
  { png: '1080p_full_hd.png', gif: '1080p_full_hd.gif', effect: '1080p_laser_streak' },
  { png: '720p_hd.png', gif: '720p_hd.gif', effect: '720p_blue_sparkle' },
  { png: '480p_sd.png', gif: '480p_sd.gif', effect: '480p_silver_pulse' },

  // Video Tech
  { png: 'dolby_vision.png', gif: 'dolby_vision.gif', effect: 'dolby_vision_prism' },
  { png: 'hdr10_plus.png', gif: 'hdr10_plus.gif', effect: 'hdr10_plus_sunburst' },
  { png: 'hdr10.png', gif: 'hdr10.gif', effect: 'hdr10_solar_corona' },
  { png: 'hdr.png', gif: 'hdr.gif', effect: 'hdr_gold_sparkle' },
  { png: 'SDR_transparent_4x.png', gif: 'SDR_transparent_4x.gif', effect: 'sdr_laser_scan' },
  { png: 'imax_enhanced.png', gif: 'imax_enhanced.gif', effect: 'imax_enhanced_flare' },
  { png: 'imax.png', gif: 'imax.gif', effect: 'imax_anamorphic_flare' },

  // Video Codec
  { png: 'HEVC_transparent_4x.png', gif: 'HEVC_transparent_4x.gif', effect: 'hevc_matrix_stream' },
  { png: 'AVC_transparent_4x.png', gif: 'AVC_transparent_4x.gif', effect: 'avc_neon_pulse' },

  // Bit Depth
  { png: '10Bit_transparent_4x.png', gif: '10Bit_transparent_4x.gif', effect: '10bit_liquid_rainbow' },
  { png: '8Bit_transparent_4x.png', gif: '8Bit_transparent_4x.gif', effect: '8bit_digital_stepping' },

  // Audio Tech
  { png: 'dolby_atmos.png', gif: 'dolby_atmos.gif', effect: 'atmos_spatial_dome' },
  { png: 'truehd.png', gif: 'truehd.gif', effect: 'truehd_sine_waves' },
  { png: 'dolby_digital_plus.png', gif: 'dolby_digital_plus.gif', effect: 'dolby_plus_surround' },
  { png: 'dolby_digital.png', gif: 'dolby_digital.gif', effect: 'dolby_digital_surround' },
  { png: 'dts_x.png', gif: 'dts_x.gif', effect: 'dts_x_sonic_shockwave' },
  { png: 'dts_hd_master_audio.png', gif: 'dts_hd_master_audio.gif', effect: 'master_audio_bars' },
  { png: 'dts_hd.png', gif: 'dts_hd.gif', effect: 'dts_hd_amber_sweep' },
  { png: 'dts.png', gif: 'dts.gif', effect: 'dts_sonic_vibe' },

  // Audio Channels
  { png: '7_1_audio.png', gif: '7_1_audio.gif', effect: '71_orbital_radar' },
  { png: '5_1_audio.png', gif: '5_1_audio.gif', effect: '51_orbital_radar' }
];

async function generateAll() {
  console.log(`Starting generation of ${BADGES.length} HD Crisp, Pure-Transparent animated GIF badges with rich visual effects...`);

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

      // Auto-crop to content bounding box with subpixel precision
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(img, 0, 0);

      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      let minX = offCanvas.width, minY = offCanvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < offCanvas.height; y++) {
        for (let x = 0; x < offCanvas.width; x++) {
          const a = data[(y * offCanvas.width + x) * 4 + 3];
          if (a > 10) {
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
      const padX = 36;
      const padY = 24;
      const canvasW = targetW + padX * 2;
      const canvasH = targetH + padY * 2;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const drawX = padX;
      const drawY = padY;

      const rendered = [];

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        ctx.clearRect(0, 0, canvasW, canvasH); // 100% transparent

        // 1. Background particle / wave layers (behind artwork)
        if (effect === 'webdl_stream' || effect === 'hevc_matrix_stream') {
          ctx.save();
          for (let p = 0; p < 8; p++) {
            const px = (drawX + (t * 2 + p / 8) * targetW) % (targetW + 40) + drawX - 20;
            const py = drawY + (Math.sin((t * 4 + p) * Math.PI) * 0.4 + 0.5) * targetH;
            ctx.fillStyle = effect === 'webdl_stream' ? 'rgba(52, 211, 153, 0.6)' : 'rgba(16, 185, 129, 0.6)';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.restore();
        } else if (effect === 'webrip_equalizer' || effect === 'master_audio_bars') {
          ctx.save();
          const barCount = effect === 'webrip_equalizer' ? 6 : 8;
          const barW = 4;
          const startX = drawX + targetW * 0.05;
          for (let b = 0; b < barCount; b++) {
            const hRatio = Math.abs(Math.sin((t * 3 + b * 0.35) * Math.PI));
            const barH = 12 + hRatio * (targetH * 0.5);
            ctx.fillStyle = effect === 'webrip_equalizer' ? 'rgba(168, 85, 247, 0.7)' : (b < 5 ? 'rgba(251, 191, 36, 0.75)' : 'rgba(249, 115, 22, 0.85)');
            ctx.beginPath();
            ctx.roundRect(startX + b * (barW + 3), drawY + targetH * 0.75 - barH / 2, barW, barH, 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (effect === 'truehd_sine_waves') {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let x = drawX; x <= drawX + targetW; x += 4) {
            const y = drawY + targetH * 0.85 + Math.sin((x * 0.08) - (t * 2 * Math.PI)) * 8;
            if (x === drawX) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 2. High-precision antialiased ambient contour/shadow behind artwork for universal contrast
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);
        ctx.restore();

        // 3. Crisp base artwork rendering
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

        // 4. Multi-Layer Dynamic Light Animations Masked to Artwork
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        if (effect === 'dolby_vision_prism' || effect === '10bit_liquid_rainbow') {
          const hueShift = (t * 360) % 360;
          const rainbowGrad = ctx.createLinearGradient(drawX, drawY, drawX + targetW, drawY + targetH);
          rainbowGrad.addColorStop(0, `hsla(${hueShift}, 100%, 75%, 0.85)`);
          rainbowGrad.addColorStop(0.25, `hsla(${(hueShift + 90) % 360}, 100%, 70%, 0.85)`);
          rainbowGrad.addColorStop(0.5, `hsla(${(hueShift + 180) % 360}, 100%, 70%, 0.85)`);
          rainbowGrad.addColorStop(0.75, `hsla(${(hueShift + 270) % 360}, 100%, 70%, 0.85)`);
          rainbowGrad.addColorStop(1, `hsla(${hueShift}, 100%, 75%, 0.85)`);
          ctx.fillStyle = rainbowGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (effect === 'bluray_hologram') {
          const laserAngle = t * 2 * Math.PI;
          const conic = ctx.createConicGradient(laserAngle, drawX + targetH * 0.4, drawY + targetH * 0.5);
          conic.addColorStop(0, 'rgba(56, 189, 248, 0)');
          conic.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
          conic.addColorStop(0.4, 'rgba(236, 72, 153, 0.9)');
          conic.addColorStop(0.6, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = conic;
          ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (effect === '1080p_laser_streak' || effect === '8bit_digital_stepping' || effect === 'sdr_laser_scan') {
          const scanX = drawX + t * targetW;
          const laserGrad = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0);
          laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          laserGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          laserGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = laserGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (effect === 'hdr10_solar_corona') {
          const flareR = targetH * (0.35 + 0.25 * Math.sin(t * 2 * Math.PI));
          const flareGrad = ctx.createRadialGradient(drawX + targetW * 0.75, drawY + targetH * 0.5, 6, drawX + targetW * 0.75, drawY + targetH * 0.5, flareR);
          flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          flareGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.85)');
          flareGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = flareGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);
        } else {
          // Standard / Master dual specular light sweep
          const sheenX = -canvasW * 0.5 + t * (canvasW * 2.2);
          const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 80, canvasH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
          sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, 0, canvasW, canvasH);

          // Secondary trailing sheen beam
          const sheen2X = sheenX - 60;
          const sheen2Grad = ctx.createLinearGradient(sheen2X, 0, sheen2X + 30, canvasH);
          sheen2Grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheen2Grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
          sheen2Grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheen2Grad;
          ctx.fillRect(0, 0, canvasW, canvasH);
        }
        ctx.restore();

        // 5. Forefront specialized lighting accents & flare bursts
        if (effect === 'imax_anamorphic_flare' || effect === 'imax_enhanced_flare') {
          const flareX = drawX + t * targetW;
          const flareY = drawY + targetH * 0.5;
          const beamGrad = ctx.createLinearGradient(flareX - 90, flareY, flareX + 90, flareY);
          beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          beamGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.5)');
          beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          beamGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.5)');
          beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(flareX - 90, flareY - 3, 180, 6);
          drawSparkle(ctx, flareX, flareY, 12, (t * 2) % 1, '#38bdf8');
        } else if (effect === 'atmos_spatial_dome') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.15, drawY + targetH * 0.5);
          for (let arc = 1; arc <= 3; arc++) {
            const wave = (t + arc / 3) % 1;
            const r = 12 + wave * 32;
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - wave})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 1.1 * Math.PI, 1.9 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === 'dts_x_sonic_shockwave') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.85, drawY + targetH * 0.5);
          for (let w = 1; w <= 3; w++) {
            const wp = (t + w / 3) % 1;
            ctx.strokeStyle = `rgba(249, 115, 22, ${1 - wp})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 12 + wp * 34, 0, 2 * Math.PI);
            ctx.stroke();
          }
          drawSparkle(ctx, 0, 0, 10, (t * 2) % 1, '#f97316');
          ctx.restore();
        } else if (effect === 'hdtv_broadcast') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.12, drawY + targetH * 0.25);
          for (let arc = 1; arc <= 3; arc++) {
            const wp = (t + arc / 3) % 1;
            ctx.strokeStyle = `rgba(245, 158, 11, ${1 - wp})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + wp * 24, -0.6 * Math.PI, 0.6 * Math.PI);
            ctx.stroke();
          }
          drawSparkle(ctx, 0, 0, 8, (t * 2) % 1, '#fbbf24');
          ctx.restore();
        } else if (effect === 'dolby_plus_surround' || effect === 'dolby_digital_surround') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.14, drawY + targetH * 0.5);
          for (let arc = 1; arc <= 3; arc++) {
            const wave = (t + arc / 3) % 1;
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - wave})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + wave * 26, 0.6 * Math.PI, 1.4 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 10 + wave * 26, -0.4 * Math.PI, 0.4 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === '71_orbital_radar' || effect === '51_orbital_radar') {
          ctx.save();
          const spkCount = effect === '71_orbital_radar' ? 8 : 6;
          const activeSpk = Math.floor(t * spkCount);
          ctx.translate(drawX + targetW * 0.18, drawY + targetH * 0.5);
          const radarR = targetH * 0.36;
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, radarR, 0, 2 * Math.PI);
          ctx.stroke();
          for (let s = 0; s < spkCount; s++) {
            const a = (s * 2 * Math.PI / spkCount) - Math.PI / 2;
            const sx = Math.cos(a) * radarR;
            const sy = Math.sin(a) * radarR;
            ctx.fillStyle = (s === activeSpk) ? '#22d3ee' : 'rgba(6, 182, 212, 0.4)';
            if (s === activeSpk) {
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 10;
            } else {
              ctx.shadowBlur = 0;
            }
            ctx.beginPath();
            ctx.arc(sx, sy, s === activeSpk ? 5.5 : 3.5, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.restore();
        } else if (effect === 'hdr10_plus_sunburst') {
          const plusPulse = 1 + Math.sin(t * 2 * Math.PI) * 0.3;
          drawSparkle(ctx, drawX + targetW * 0.93, drawY + targetH * 0.35, 14 * plusPulse, 1, '#f59e0b');
        }

        // Diamond sparkles for premium badges
        if (effect.includes('sparkle') || effect === 'remux_master' || effect === 'dolby_vision_prism') {
          drawSparkle(ctx, drawX + targetW * 0.16, drawY + targetH * 0.22, 12, (t * 2) % 1, '#ffffff');
          drawSparkle(ctx, drawX + targetW * 0.84, drawY + targetH * 0.78, 10, (t * 2 + 0.5) % 1, '#ffffff');
        }

        const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
        rendered.push({
          data: Array.from(frameData.data),
          w: canvasW,
          h: canvasH
        });
      }

      return rendered;

      function drawSparkle(ctx, x, y, size, prog, glowColor = '#ffffff') {
        if (prog >= 0.8) return;
        const alpha = Math.sin(prog / 0.8 * Math.PI);
        const s = size * alpha;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s * 1.2, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s * 1.2, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }, imgSrc, item.effect, TARGET_HEIGHT, TOTAL_FRAMES);

    const { w, h } = frames[0];
    const gif = GIFEncoder();

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const data = new Uint8Array(frames[f].data);
      const opaque = [];
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] >= 24) {
          opaque.push(Math.max(1, data[p]), Math.max(1, data[p + 1]), Math.max(1, data[p + 2]), 255);
        }
      }

      const subPalette = opaque.length > 0 ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' }) : [[255, 255, 255]];
      const fullPalette = [[0, 0, 0], ...subPalette];

      const index = new Uint8Array(w * h);
      for (let p = 0, px = 0; p < data.length; p += 4, px++) {
        if (data[p + 3] < 24) {
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
  console.log(`\n🎉 All ${BADGES.length} HD Crisp authentic transparent animated GIF badges generated!`);
}

generateAll().catch(console.error);
