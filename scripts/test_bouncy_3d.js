const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

async function testBouncy3D() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const pngPath = path.join(BADGES_DIR, '4k_ultra_hd.png');
  const pngBase64 = fs.readFileSync(pngPath).toString('base64');
  const imgSrc = `data:image/png;base64,${pngBase64}`;

  const targetH = 150;
  const totalFrames = 24;

  const frames = await page.evaluate(async (src, targetH, totalFrames) => {
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
    const padX = 45;
    const padY = 35;
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
      ctx.clearRect(0, 0, canvasW, canvasH);

      // ==================== 1. ANIME JUMP / BOUNCE & SQUASH/STRETCH ====================
      // 2 complete lively bounce cycles per loop
      const bouncePhase = (t * 2) % 1;
      // Parabolic jump arc with ground bounce
      const jumpY = -Math.sin(bouncePhase * Math.PI) * 14;
      // Squash on landing, stretch in midair
      const scaleY = 1.0 + Math.sin(bouncePhase * Math.PI) * 0.08 - (bouncePhase < 0.15 ? (0.15 - bouncePhase) * 0.4 : 0);
      const scaleX = 1.0 - Math.sin(bouncePhase * Math.PI) * 0.04 + (bouncePhase < 0.15 ? (0.15 - bouncePhase) * 0.3 : 0);
      // Subtle lively anime tilt (-2 deg to +2 deg)
      const tiltAngle = Math.sin(t * 2 * Math.PI) * 0.035;

      // ==================== 2. DRAW 3D CAST SHADOW (EXPANDS ON GROUND, SHRINKS MID-AIR) ====================
      ctx.save();
      const shadowScaleX = 1.0 + (1 - Math.sin(bouncePhase * Math.PI)) * 0.15;
      const shadowAlpha = 0.5 + (1 - Math.sin(bouncePhase * Math.PI)) * 0.4;
      ctx.translate(cx, cy + targetH * 0.48);
      ctx.scale(shadowScaleX, 0.3);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, targetW * 0.42, targetH * 0.18, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      // ==================== 3. DRAW 3D BOUNCING BADGE ====================
      ctx.save();
      ctx.translate(cx, cy + jumpY);
      ctx.rotate(tiltAngle);
      ctx.scale(scaleX, scaleY);

      const drawX = -targetW / 2;
      const drawY = -targetH / 2;

      // 3D Extruded Layers (Bottom-Right Depth)
      const depthLevels = 4;
      for (let d = depthLevels; d >= 1; d--) {
        ctx.save();
        const bevelCanvas = document.createElement('canvas');
        bevelCanvas.width = canvasW;
        bevelCanvas.height = canvasH;
        const bctx = bevelCanvas.getContext('2d');
        bctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX + d + canvasW / 2, drawY + d + canvasH / 2, targetW, targetH);
        bctx.globalCompositeOperation = 'source-in';
        bctx.fillStyle = `rgba(10, 15, 26, ${0.75 + d * 0.07})`;
        bctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(bevelCanvas, -canvasW / 2, -canvasH / 2);
        ctx.restore();
      }

      // Front Face
      ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

      // Subtle slow sheen sweep inside the 3D surface
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const sheenX = drawX - targetW * 0.5 + t * (targetW * 2.0);
      const sheenW = 120;
      const sheenGrad = ctx.createLinearGradient(sheenX, drawY, sheenX + sheenW, drawY + targetH);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
      ctx.restore();

      // Anime 8-Point Starburst Sparkles
      drawAnimeStarburst(ctx, drawX + targetW * 0.18, drawY + targetH * 0.22, 14, (t * 2) % 1, '#fde047');
      drawAnimeStarburst(ctx, drawX + targetW * 0.82, drawY + targetH * 0.78, 12, (t * 2 + 0.5) % 1, '#fde047');

      ctx.restore();

      const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
      rendered.push({
        data: Array.from(frameData.data),
        w: canvasW,
        h: canvasH
      });
    }

    return rendered;

    function drawAnimeStarburst(ctx, x, y, size, prog, glowColor) {
      if (prog >= 0.8) return;
      const alpha = Math.sin(prog / 0.8 * Math.PI);
      const s = size * alpha;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.3);
      ctx.quadraticCurveTo(0, 0, s * 1.3, 0);
      ctx.quadraticCurveTo(0, 0, 0, s * 1.3);
      ctx.quadraticCurveTo(0, 0, -s * 1.3, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s * 1.3);
      ctx.fill();
      const ds = s * 0.65;
      ctx.beginPath();
      ctx.moveTo(0, -ds);
      ctx.lineTo(ds, 0);
      ctx.lineTo(0, ds);
      ctx.lineTo(-ds, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }, imgSrc, targetH, totalFrames);

  const { w, h } = frames[0];
  const gif = GIFEncoder();

  for (let f = 0; f < totalFrames; f++) {
    const data = new Uint8Array(frames[f].data);
    const opaque = [];
    for (let p = 0; p < data.length; p += 4) {
      if (data[p + 3] >= 20) {
        opaque.push(Math.max(1, data[p]), Math.max(1, data[p + 1]), Math.max(1, data[p + 2]), 255);
      }
    }

    const subPalette = opaque.length > 0 ? quantize(new Uint8Array(opaque), 255, { format: 'rgb565' }) : [[255, 255, 255]];
    const fullPalette = [[0, 0, 0], ...subPalette];

    const index = new Uint8Array(w * h);
    for (let p = 0, px = 0; p < data.length; p += 4, px++) {
      if (data[p + 3] < 20) {
        index[px] = 0;
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
      delay: 41,
      repeat: 0,
      transparent: true,
      transparentIndex: 0,
      dispose: 2
    });
  }

  gif.finish();
  const outPath = path.join(BADGES_DIR, 'test_bouncy_3d.gif');
  fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
  console.log(`Saved test bouncy 3D Anime badge: ${outPath} (${w}x${h})`);

  await browser.close();
}

testBouncy3D().catch(console.error);
