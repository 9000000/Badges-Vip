const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

async function testDarpitDeluxe() {
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
  const totalFrames = 30; // 30 smooth frames @ 25fps = 1.2s loop

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

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    const rendered = [];

    for (let f = 0; f < totalFrames; f++) {
      const t = f / totalFrames;
      ctx.clearRect(0, 0, canvasW, canvasH); // Pure transparent

      // ==================== DARPIT DELUXE 3-PHASE LIFECYCLE ====================
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
        // Gentle floating bounce
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
        // Blank frame
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

      // ==================== 2. 3D CHISELED BADGE ====================
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

      // ==================== 3. SOFT SLOW SPECULAR SHEEN ====================
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
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
      ctx.restore();

      // ==================== 4. DARPIT-STYLE CORNER & HIGHLIGHT DIAMOND SPARKLES ====================
      if (t >= 0.20 && t <= 0.85) {
        const spkProg = ((t - 0.20) / 0.65) * 2 % 1;
        // Corner diamond glint
        drawDiamondSparkle(ctx, drawX + targetW * 0.96, drawY + targetH * 0.92, 11, spkProg, '#ffffff');
        // Letter highlight diamond glint
        drawDiamondSparkle(ctx, drawX + targetW * 0.18, drawY + targetH * 0.24, 13, (spkProg + 0.5) % 1, '#fde047');
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
  }, imgSrc, targetH, totalFrames);

  const { w, h } = frames[0];
  const gif = GIFEncoder();

  for (let f = 0; f < totalFrames; f++) {
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
      delay: 40,
      repeat: 0,
      transparent: true,
      transparentIndex: 0,
      dispose: 2
    });
  }

  gif.finish();
  const outPath = path.join(BADGES_DIR, 'test_darpit_4k.gif');
  fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
  console.log(`Saved test Darpit-style badge: ${outPath} (${w}x${h})`);

  await browser.close();
}

testDarpitDeluxe().catch(console.error);
