const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');

async function test3DAnimatedDeluxe() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const testFiles = [
    { png: '4k_ultra_hd.png', out: 'test_deluxe_4k.gif', effect: 'gold_green_sheen' },
    { png: 'remux.png', out: 'test_deluxe_remux.gif', effect: 'pure_silver_sheen' },
    { png: 'dolby_vision.png', out: 'test_deluxe_dv.gif', effect: 'rainbow_prism' },
    { png: 'dolby_atmos.png', out: 'test_deluxe_atmos.gif', effect: 'spatial_acoustic' }
  ];

  for (const item of testFiles) {
    const pngPath = path.join(BADGES_DIR, item.png);
    const pngBase64 = fs.readFileSync(pngPath).toString('base64');
    const imgSrc = `data:image/png;base64,${pngBase64}`;

    const targetH = 150;
    const totalFrames = 24; // 24 frames @ 20fps = 1.2s smooth seamless loop

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

      const rendered = [];

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        ctx.clearRect(0, 0, canvasW, canvasH); // Pure transparent

        // ==================== 1. FIXED 3D SHADOW (NO JUMPING, ALWAYS SOLID) ====================
        ctx.save();
        ctx.translate(cx, cy + targetH * 0.44);
        ctx.scale(1.0, 0.22);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, targetW * 0.46, targetH * 0.16, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // ==================== 2. FIXED 3D CHISELED BADGE ====================
        ctx.save();
        ctx.translate(cx, cy);

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

        // Front Face (100% Solid & Crisp)
        ctx.drawImage(offCanvas, minX, minY, cropW, cropH, drawX, drawY, targetW, targetH);

        // ==================== 3. 3D ANIMATED SURFACE ILLUMINATION / SHEEN ====================
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        if (effect === 'rainbow_prism') {
          const hueShift = (t * 360) % 360;
          const rainbowGrad = ctx.createLinearGradient(drawX, drawY, drawX + targetW, drawY + targetH);
          rainbowGrad.addColorStop(0, `hsla(${hueShift}, 100%, 75%, 0.45)`);
          rainbowGrad.addColorStop(0.25, `hsla(${(hueShift + 90) % 360}, 100%, 70%, 0.45)`);
          rainbowGrad.addColorStop(0.5, `hsla(${(hueShift + 180) % 360}, 100%, 70%, 0.45)`);
          rainbowGrad.addColorStop(0.75, `hsla(${(hueShift + 270) % 360}, 100%, 70%, 0.45)`);
          rainbowGrad.addColorStop(1, `hsla(${hueShift}, 100%, 75%, 0.45)`);
          ctx.fillStyle = rainbowGrad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        } else {
          // Continuous smooth light beam sweep
          const sheenProgress = (t * 1.2) % 1;
          const sheenX = drawX - targetW * 0.4 + sheenProgress * (targetW * 1.8);
          const sheenW = 100;
          const sheenGrad = ctx.createLinearGradient(sheenX, drawY, sheenX + sheenW, drawY + targetH);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
          sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.12)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(drawX - 20, drawY - 20, targetW + 40, targetH + 40);
        }
        ctx.restore();

        // ==================== 4. DARPIT SIGNATURE TWINKLING DIAMOND SPARKLES ====================
        // Star 1: Bottom Right Corner Diamond Glint (Continuous pulse & rotation)
        const star1Prog = (t * 2) % 1;
        drawDiamondSparkle(ctx, drawX + targetW * 0.96, drawY + targetH * 0.92, 11, star1Prog, '#ffffff');

        // Star 2: Accent Glint on Typography
        const star2Prog = (t * 2 + 0.5) % 1;
        drawDiamondSparkle(ctx, drawX + targetW * 0.20, drawY + targetH * 0.22, 13, star2Prog, '#fde047');

        // Special in-place effect
        if (effect === 'spatial_acoustic') {
          ctx.save();
          ctx.translate(drawX + targetW * 0.15, drawY + targetH * 0.5);
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
        if (prog >= 0.85) return;
        const alpha = Math.sin(prog / 0.85 * Math.PI);
        const s = size * alpha;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(prog * Math.PI * 0.5); // subtle rotation
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = glowColor;
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
    }, imgSrc, item.effect, targetH, totalFrames);

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
        delay: 50,
        repeat: 0,
        transparent: true,
        transparentIndex: 0,
        dispose: 2
      });
    }

    gif.finish();
    const outPath = path.join(BADGES_DIR, item.out);
    fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
    console.log(`Saved ${item.out} (${w}x${h})`);
  }

  await browser.close();
}

test3DAnimatedDeluxe().catch(console.error);
