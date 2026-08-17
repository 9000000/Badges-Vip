const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const TOTAL_FRAMES = 28;
const FPS = 24;
const DELAY = Math.round(1000 / FPS);
const TARGET_HEIGHT = 150; // 2X HD resolution

// 31 Darpit Deluxe-Inspired 3D Anime Badges on branch 'tet'
const BADGES = [
  // Source
  { png: 'remux.png', gif: 'remux.gif', effect: 'anime_katana_slash' },
  { png: 'blu_ray_disc.png', gif: 'blu_ray_disc.gif', effect: 'anime_magic_circle' },
  { png: 'WEBDL_transparent_4x.png', gif: 'WEBDL_transparent_4x.gif', effect: 'anime_cyber_lightning' },
  { png: 'WEBRip_transparent_4x.png', gif: 'WEBRip_transparent_4x.gif', effect: 'anime_void_equalizer' },
  { png: 'HDTV_transparent_4x.png', gif: 'HDTV_transparent_4x.gif', effect: 'anime_super_saiyan' },
  { png: 'DVD_RIP_transparent_4x.png', gif: 'DVD_RIP_transparent_4x.gif', effect: 'anime_fire_embers' },

  // Resolution
  { png: '4k_ultra_hd.png', gif: '4k_ultra_hd.gif', effect: 'anime_golden_god_flash' },
  { png: '1080p_full_hd.png', gif: '1080p_full_hd.gif', effect: 'anime_chidori_lightning' },
  { png: '720p_hd.png', gif: '720p_hd.gif', effect: 'anime_azure_spirit' },
  { png: '480p_sd.png', gif: '480p_sd.gif', effect: 'anime_wind_slash' },

  // Video Tech
  { png: 'dolby_vision.png', gif: 'dolby_vision.gif', effect: 'anime_magical_rainbow' },
  { png: 'hdr10_plus.png', gif: 'hdr10_plus.gif', effect: 'anime_supernova_burst' },
  { png: 'hdr10.png', gif: 'hdr10.gif', effect: 'anime_solar_corona' },
  { png: 'hdr.png', gif: 'hdr.gif', effect: 'anime_crimson_flame' },
  { png: 'SDR_transparent_4x.png', gif: 'SDR_transparent_4x.gif', effect: 'anime_mecha_hud' },
  { png: 'imax_enhanced.png', gif: 'imax_enhanced.gif', effect: 'anime_beam_saber' },
  { png: 'imax.png', gif: 'imax.gif', effect: 'anime_cosmic_widescreen' },

  // Video Codec
  { png: 'HEVC_transparent_4x.png', gif: 'HEVC_transparent_4x.gif', effect: 'anime_matrix_thunder' },
  { png: 'AVC_transparent_4x.png', gif: 'AVC_transparent_4x.gif', effect: 'anime_plasma_arc' },

  // Bit Depth
  { png: '10Bit_transparent_4x.png', gif: '10Bit_transparent_4x.gif', effect: 'anime_ultra_instinct_prism' },
  { png: '8Bit_transparent_4x.png', gif: '8Bit_transparent_4x.gif', effect: 'anime_pixel_thunder' },

  // Audio Tech
  { png: 'dolby_atmos.png', gif: 'dolby_atmos.gif', effect: 'anime_spatial_sky_barrier' },
  { png: 'truehd.png', gif: 'truehd.gif', effect: 'anime_water_dragon_surge' },
  { png: 'dolby_digital_plus.png', gif: 'dolby_digital_plus.gif', effect: 'anime_sonic_barrier' },
  { png: 'dolby_digital.png', gif: 'dolby_digital.gif', effect: 'anime_resonance_waves' },
  { png: 'dts_x.png', gif: 'dts_x.gif', effect: 'anime_explosive_shockwave' },
  { png: 'dts_hd_master_audio.png', gif: 'dts_hd_master_audio.gif', effect: 'anime_rhythm_game_bars' },
  { png: 'dts_hd.png', gif: 'dts_hd.gif', effect: 'anime_amber_dragon_aura' },
  { png: 'dts.png', gif: 'dts.gif', effect: 'anime_tremor_sparks' },

  // Audio Channels
  { png: '7_1_audio.png', gif: '7_1_audio.gif', effect: 'anime_8_orbital_summon' },
  { png: '5_1_audio.png', gif: '5_1_audio.gif', effect: 'anime_6_orbital_summon' }
];

async function generateAll() {
  console.log(`Starting generation of ${BADGES.length} DARPIT DELUXE 3D ANIME-STYLE animated GIF badges on branch 'tet'...`);

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

    console.log(`[${i + 1}/${BADGES.length}] Processing ${item.png} -> ${item.gif} (Darpit Deluxe Effect: ${item.effect})...`);
    const pngBase64 = fs.readFileSync(pngPath).toString('base64');
    const imgSrc = `data:image/png;base64,${pngBase64}`;

    const frames = await page.evaluate(async (src, effect, targetH, totalFrames) => {
      const img = new Image();
      img.src = src;
      await new Promise(r => img.onload = r);

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
      const padX = 40;
      const padY = 30;
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

      const rendered = [];

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        ctx.clearRect(0, 0, canvasW, canvasH); // Pure transparent

        // ==================== DARPIT DELUXE 3-PHASE LIFECYCLE (EMERGE -> LIVING 3D -> DISSOLVE) ====================
        let opacity = 0;
        let scale = 1.0;
        let jumpY = 0;

        if (t < 0.20) {
          // Phase 1: Emergence / Pop-in (0% -> 20%)
          const p = t / 0.20;
          opacity = p;
          scale = 0.85 + 0.15 * Math.sin(p * Math.PI / 2);
          jumpY = (1 - p) * 10;
        } else if (t < 0.80) {
          // Phase 2: Hold & Subtle Living Bounce (20% -> 80%)
          const p = (t - 0.20) / 0.60;
          opacity = 1.0;
          jumpY = -Math.sin(p * 2 * Math.PI) * 6;
          scale = 1.0 + Math.sin(p * 2 * Math.PI) * 0.03;
        } else {
          // Phase 3: Dissolve / Fade-out (80% -> 100%)
          const p = (t - 0.80) / 0.20;
          opacity = 1.0 - p;
          scale = 1.0 + p * 0.08;
          jumpY = -p * 6;
        }

        if (opacity <= 0.01) {
          const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
          rendered.push({
            data: Array.from(frameData.data),
            w: canvasW,
            h: canvasH
          });
          continue;
        }

        // ==================== 1. 3D DROP SHADOW ====================
        ctx.save();
        ctx.translate(cx, cy + targetH * 0.46);
        ctx.scale(scale, 0.25 * scale);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * opacity})`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, targetW * 0.44, targetH * 0.18, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // ==================== 2. ANIME BACKGROUND VFX ====================
        if (effect === 'anime_super_saiyan' || effect === 'anime_golden_god_flash' || effect === 'anime_amber_dragon_aura') {
          drawAnimeKiAura(ctx, cx - targetW / 2, cy - targetH / 2 + jumpY, targetW, targetH, t, '#fbbf24', '#f59e0b', opacity);
        } else if (effect === 'anime_crimson_flame' || effect === 'anime_fire_embers' || effect === 'anime_explosive_shockwave') {
          drawAnimeKiAura(ctx, cx - targetW / 2, cy - targetH / 2 + jumpY, targetW, targetH, t, '#f97316', '#ef4444', opacity);
        } else if (effect === 'anime_azure_spirit' || effect === 'anime_water_dragon_surge') {
          drawAnimeKiAura(ctx, cx - targetW / 2, cy - targetH / 2 + jumpY, targetW, targetH, t, '#38bdf8', '#0284c7', opacity);
        } else if (effect === 'anime_void_equalizer' || effect === 'anime_plasma_arc') {
          drawAnimeKiAura(ctx, cx - targetW / 2, cy - targetH / 2 + jumpY, targetW, targetH, t, '#c084fc', '#7c3aed', opacity);
        } else if (effect === 'anime_magic_circle') {
          drawAnimeMagicRunes(ctx, cx - targetW * 0.25, cy + jumpY, targetH * 0.45, t, opacity);
        } else if (effect === 'anime_rhythm_game_bars') {
          drawAnimeRhythmBars(ctx, cx - targetW / 2, cy - targetH / 2 + jumpY, targetW, targetH, t, opacity);
        }

        // ==================== 3. 3D CHISELED BADGE RENDERING ====================
        ctx.save();
        ctx.translate(cx, cy + jumpY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        const drawX = -targetW / 2;
        const drawY = -targetH / 2;

        // 3D Extruded Layers (Bottom-Right Chiseled Depth)
        const depthLevels = 4;
        for (let d = depthLevels; d >= 1; d--) {
          ctx.save();
          const bevelCanvas = document.createElement('canvas');
          bevelCanvas.width = canvasW;
          bevelCanvas.height = canvasH;
          const bctx = bevelCanvas.getContext('2d');
          bctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX + d + canvasW / 2, drawY + d + canvasH / 2, targetW, targetH);
          bctx.globalCompositeOperation = 'source-in';
          bctx.fillStyle = `rgba(10, 15, 26, ${0.8 + d * 0.05})`;
          bctx.fillRect(0, 0, canvasW, canvasH);
          ctx.drawImage(bevelCanvas, -canvasW / 2, -canvasH / 2);
          ctx.restore();
        }

        // Front Face
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

        // ==================== 4. SOFT SPECULAR SHEEN ====================
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        if (effect === 'anime_magical_rainbow' || effect === 'anime_ultra_instinct_prism') {
          const hueShift = (t * 360) % 360;
          const rainbowGrad = ctx.createLinearGradient(drawX, drawY, drawX + targetW, drawY + targetH);
          rainbowGrad.addColorStop(0, `hsla(${hueShift}, 100%, 75%, 0.65)`);
          rainbowGrad.addColorStop(0.25, `hsla(${(hueShift + 90) % 360}, 100%, 70%, 0.65)`);
          rainbowGrad.addColorStop(0.5, `hsla(${(hueShift + 180) % 360}, 100%, 70%, 0.65)`);
          rainbowGrad.addColorStop(0.75, `hsla(${(hueShift + 270) % 360}, 100%, 70%, 0.65)`);
          rainbowGrad.addColorStop(1, `hsla(${hueShift}, 100%, 75%, 0.65)`);
          ctx.fillStyle = rainbowGrad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        } else if (effect === 'anime_chidori_lightning' || effect === 'anime_cyber_lightning' || effect === 'anime_matrix_thunder' || effect === 'anime_pixel_thunder') {
          const lColor = (effect === 'anime_cyber_lightning' || effect === 'anime_matrix_thunder') ? '#34d399' : '#38bdf8';
          const flashPulse = (Math.sin(t * 4 * Math.PI) + 1) / 2;
          ctx.fillStyle = lColor;
          ctx.globalAlpha = 0.2 + 0.25 * flashPulse;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
          ctx.globalAlpha = 1.0;
        } else {
          const sheenX = drawX - targetW * 0.6 + ((t * 1.5) % 1) * (targetW * 2.2);
          const sheenW = 120;
          const sheenGrad = ctx.createLinearGradient(sheenX, drawY, sheenX + sheenW, drawY + targetH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
          sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        }
        ctx.restore();

        // ==================== 5. ANIME FOREFRONT FLASHES & DARPIT DIAMOND SPARKLES ====================
        if (effect === 'anime_katana_slash') {
          const slashProgress = (t * 1.3) % 1;
          const sx1 = drawX - 30 + slashProgress * (targetW + 60);
          const sy1 = drawY - 20;
          const sx2 = sx1 + 50;
          const sy2 = drawY + targetH + 20;
          drawAnimeSlashStreak(ctx, sx1, sy1, sx2, sy2, '#38bdf8', '#ffffff');
        } else if (effect === 'anime_chidori_lightning' || effect === 'anime_cyber_lightning' || effect === 'anime_matrix_thunder' || effect === 'anime_plasma_arc') {
          const lColor = (effect === 'anime_cyber_lightning' || effect === 'anime_matrix_thunder') ? '#10b981' : (effect === 'anime_plasma_arc' ? '#c084fc' : '#38bdf8');
          drawAnimeLightning(ctx, drawX + targetW * 0.1, drawY + targetH * 0.5, drawX + targetW * 0.9, drawY + targetH * 0.5, t, lColor);
        } else if (effect === 'anime_beam_saber' || effect === 'anime_cosmic_widescreen') {
          const beamX = drawX + t * targetW;
          const beamY = drawY + targetH * 0.5;
          const bGrad = ctx.createLinearGradient(beamX - 80, beamY, beamX + 80, beamY);
          bGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          bGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.4)');
          bGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
          bGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.4)');
          bGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = bGrad;
          ctx.fillRect(beamX - 80, beamY - 3, 160, 6);
        } else if (effect === 'anime_spatial_sky_barrier') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.15, drawY + targetH * 0.5);
          for (let arc = 1; arc <= 3; arc++) {
            const wave = (t + arc / 3) % 1;
            const r = 12 + wave * 30;
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.8 - wave * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 1.1 * Math.PI, 1.9 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === 'anime_explosive_shockwave') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.85, drawY + targetH * 0.5);
          for (let w = 1; w <= 3; w++) {
            const wp = (t + w / 3) % 1;
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.85 - wp * 0.85})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + wp * 32, 0, 2 * Math.PI);
            ctx.stroke();
          }
          ctx.restore();
        } else if (effect === 'anime_8_orbital_summon' || effect === 'anime_5_orbital_summon') {
          const spkCount = effect === 'anime_8_orbital_summon' ? 8 : 6;
          drawAnimeOrbitalOrbs(ctx, drawX + targetW * 0.18, drawY + targetH * 0.5, targetH * 0.36, spkCount, t);
        }

        // Darpit Signature Twinkling Diamond Star Sparkles (Corner & Key Letters)
        if (t >= 0.15 && t <= 0.85) {
          const spkProg = ((t - 0.15) / 0.70) * 2 % 1;
          drawDiamondSparkle(ctx, drawX + targetW * 0.96, drawY + targetH * 0.92, 11, spkProg, '#ffffff');
          drawDiamondSparkle(ctx, drawX + targetW * 0.18, drawY + targetH * 0.24, 13, (spkProg + 0.5) % 1, '#ffffff');
        }

        ctx.restore();

        const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
        rendered.push({
          data: Array.from(frameData.data),
          w: canvasW,
          h: canvasH
        });
      }

      return rendered;

      // ==================== ANIME VFX HELPER FUNCTIONS ====================
      function drawAnimeKiAura(ctx, x, y, w, h, t, color1, color2, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 10; i++) {
          const px = x + ((i * 37 + t * 40) % w);
          const pLife = (t * 1.6 + i * 0.18) % 1;
          const py = y + h - pLife * (h * 1.0);
          const pSize = (1 - pLife) * 5 + 2;
          ctx.fillStyle = (i % 2 === 0) ? color1 : color2;
          ctx.shadowColor = color1;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }

      function drawDiamondSparkle(ctx, x, y, size, prog, glowColor) {
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
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }

      function drawAnimeSlashStreak(ctx, x1, y1, x2, y2, color1, color2) {
        ctx.save();
        ctx.strokeStyle = color1;
        ctx.lineWidth = 5;
        ctx.shadowColor = color1;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = color2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      function drawAnimeLightning(ctx, x1, y1, x2, y2, t, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        const steps = 6;
        for (let s = 1; s < steps; s++) {
          const ratio = s / steps;
          const cx = x1 + (x2 - x1) * ratio;
          const cy = y1 + (y2 - y1) * ratio + Math.sin((t * 5 + s * 1.5) * Math.PI) * 12;
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      function drawAnimeMagicRunes(ctx, cx, cy, r, t, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);
        ctx.rotate(t * 2 * Math.PI);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.stroke();

        for (let tri = 0; tri < 2; tri++) {
          ctx.beginPath();
          const rot = tri * Math.PI;
          for (let p = 0; p < 3; p++) {
            const angle = rot + (p * 2 * Math.PI / 3);
            const px = Math.cos(angle) * (r * 0.85);
            const py = Math.sin(angle) * (r * 0.85);
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawAnimeRhythmBars(ctx, x, y, w, h, t, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const count = 8;
        const bW = 5;
        for (let b = 0; b < count; b++) {
          const ratio = Math.abs(Math.sin((t * 3.5 + b * 0.4) * Math.PI));
          const barH = 12 + ratio * (h * 0.45);
          ctx.fillStyle = b < 5 ? '#fbbf24' : '#f97316';
          ctx.shadowColor = b < 5 ? '#f59e0b' : '#ea580c';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(x + 10 + b * (bW + 4), y + h * 0.75 - barH / 2, bW, barH, 2.5);
          ctx.fill();
        }
        ctx.restore();
      }

      function drawAnimeOrbitalOrbs(ctx, cx, cy, r, count, t) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.stroke();

        for (let s = 0; s < count; s++) {
          const angle = (t * 2 * Math.PI) + (s * 2 * Math.PI / count);
          const sx = Math.cos(angle) * r;
          const sy = Math.sin(angle) * r;
          ctx.fillStyle = '#22d3ee';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }
    }, imgSrc, item.effect, TARGET_HEIGHT, TOTAL_FRAMES);

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

      const subPalette = opaque.length > 0 ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' }) : [[255, 255, 255]];
      const fullPalette = [[0, 0, 0], ...subPalette];

      const index = new Uint8Array(w * h);
      for (let p = 0, px = 0; p < data.length; p += 4, px++) {
        if (data[p + 3] < 16) {
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
  console.log(`\n🎉 All ${BADGES.length} Darpit Deluxe-style transparent animated GIF badges generated!`);
}

generateAll().catch(console.error);
