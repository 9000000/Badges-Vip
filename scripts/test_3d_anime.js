const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

async function test3DAnimeBadge() {
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

    const drawX = padX;
    const drawY = padY;

    const rendered = [];

    for (let f = 0; f < totalFrames; f++) {
      const t = f / totalFrames;
      ctx.clearRect(0, 0, canvasW, canvasH);

      // ==================== 1. ANIME 3D DEPTH EXTRUSION & SHADOW ====================
      // 1a. Ambient deep drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX + 3, drawY + 6, targetW, targetH);
      ctx.restore();

      // 1b. 3D Extruded Layers (Chiseled bevel depth)
      const depthLevels = 4;
      for (let d = depthLevels; d >= 1; d--) {
        ctx.save();
        ctx.fillStyle = '#05070d';
        // Dark silhouette mask for 3D bevel side
        const bevelCanvas = document.createElement('canvas');
        bevelCanvas.width = canvasW;
        bevelCanvas.height = canvasH;
        const bctx = bevelCanvas.getContext('2d');
        bctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX + d, drawY + d, targetW, targetH);
        bctx.globalCompositeOperation = 'source-in';
        bctx.fillStyle = `rgba(10, 15, 26, ${0.7 + d * 0.08})`;
        bctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(bevelCanvas, 0, 0);
        ctx.restore();
      }

      // ==================== 2. CRISP FRONT FACE WITH 3D TOP RIM HIGHLIGHT ====================
      // Base front face
      ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

      // ==================== 3. SLOW & SOFT (SUBTLE) SPECULAR SHEEN SWEEP ====================
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      // Slower sweep: wide stroke moving across full width softly
      const sheenX = -canvasW * 0.6 + t * (canvasW * 2.2);
      const sheenW = 120; // Wide feathered band
      const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + sheenW, canvasH);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)'); // Softer, subtler opacity
      sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();

      // ==================== 4. ANIME 3D HIGHLIGHT SPARKLES ====================
      drawAnimeStarburst(ctx, drawX + targetW * 0.18, drawY + targetH * 0.22, 13, (t * 2) % 1, '#fde047');
      drawAnimeStarburst(ctx, drawX + targetW * 0.82, drawY + targetH * 0.78, 11, (t * 2 + 0.5) % 1, '#fde047');

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
  const outPath = path.join(BADGES_DIR, 'test_3d_anime_4k.gif');
  fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
  console.log(`Saved test 3D Anime badge: ${outPath} (${w}x${h})`);

  await browser.close();
}

test3DAnimeBadge().catch(console.error);
