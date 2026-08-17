const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

async function testResolutionQuality() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  
  const pngPath = path.join(BADGES_DIR, '4k_ultra_hd.png');
  const pngBase64 = fs.readFileSync(pngPath).toString('base64');
  const imgSrc = `data:image/png;base64,${pngBase64}`;

  // Test targetHeight = 160 (2x Crisp HD resolution)
  const targetHeight = 150;

  const frames = await page.evaluate(async (src, targetH, totalFrames) => {
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
      ctx.clearRect(0, 0, canvasW, canvasH);

      // 1. Crisp anti-aliased dark halo/contour for 100% sharp edges on all backgrounds
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);
      ctx.restore();

      // 2. Base crisp artwork
      ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

      // 3. Rich dual specular sheen
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const sheenX = -canvasW * 0.5 + t * (canvasW * 2.2);
      const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 80, canvasH);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
      sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Second trailing thin sheen
      const sheen2X = sheenX - 60;
      const sheen2Grad = ctx.createLinearGradient(sheen2X, 0, sheen2X + 25, canvasH);
      sheen2Grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheen2Grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
      sheen2Grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen2Grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();

      // 4. Sparkling Diamond Star flares
      drawSparkle(ctx, drawX + targetW * 0.16, drawY + targetH * 0.22, 12, (t * 2) % 1);
      drawSparkle(ctx, drawX + targetW * 0.84, drawY + targetH * 0.78, 10, (t * 2 + 0.5) % 1);
      drawSparkle(ctx, drawX + targetW * 0.52, drawY + targetH * 0.35, 8, (t * 2 + 0.25) % 1);

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
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s * 1.2, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s * 1.2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
      // Center hot spot
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }, imgSrc, targetHeight, 24);

  const { w, h } = frames[0];
  const gif = GIFEncoder();

  for (let f = 0; f < frames.length; f++) {
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
  const outPath = path.join(BADGES_DIR, 'test_crisp_4k.gif');
  fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
  console.log(`Saved test HD crisp GIF: ${outPath} (${w}x${h})`);

  await browser.close();
}

testResolutionQuality().catch(console.error);
