const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BADGES_DIR = path.resolve(__dirname, '..', 'Badges');
const TOTAL_FRAMES = 24;
const FPS = 24;
const DELAY = Math.round(1000 / FPS);
const WIDTH = 380;
const HEIGHT = 130;

// List of all 31 badge definitions
const BADGE_DEFS = [
  // --- Source Group ---
  {
    id: 'remux',
    filename: 'remux.gif',
    groupId: 'source',
    title: 'REMUX',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#6366f1',
        bg1: '#090d16',
        bg2: '#111827'
      });
      // Icon: Dual circular sync arrows
      ctx.save();
      ctx.translate(56, h / 2);
      ctx.rotate(t * 2 * Math.PI);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0.2 * Math.PI, 1.2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 16, 1.4 * Math.PI, 2.4 * Math.PI);
      ctx.stroke();
      // Arrow heads
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(16, 0, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-16, 0, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      // Title & Subtitle centered in remaining space
      drawGradientText(ctx, 'REMUX', 215, h / 2 - 12, 'bold 44px sans-serif', ['#f0f9ff', '#38bdf8', '#818cf8']);
      drawSubPill(ctx, 'LOSSLESS DIRECT STREAM', 215, h / 2 + 28, '#0284c7', '#e0f2fe');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'blu-ray-disc',
    filename: 'blu_ray_disc.gif',
    groupId: 'source',
    title: 'Blu-ray Disc',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#0ea5e9',
        secondary: '#38bdf8',
        bg1: '#070f1e',
        bg2: '#0b1b36'
      });
      // Blu-ray Disc laser optical disc animation on the left
      ctx.save();
      ctx.translate(60, h / 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, 2 * Math.PI);
      ctx.stroke();
      const angle = t * 2 * Math.PI;
      const laserGrad = ctx.createConicGradient(angle, 0, 0);
      laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      laserGrad.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
      laserGrad.addColorStop(0.2, 'rgba(14, 165, 233, 0.9)');
      laserGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0)');
      laserGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.8)');
      laserGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = laserGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'Blu-ray', 215, h / 2 - 12, 'italic 900 40px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8']);
      drawSubPill(ctx, 'DISC MASTER', 215, h / 2 + 28, '#0369a1', '#f0f9ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'webdl',
    filename: 'WEBDL_transparent_4x.gif',
    groupId: 'source',
    title: 'WEB-DL',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#10b981',
        secondary: '#06b6d4',
        bg1: '#061311',
        bg2: '#0b201d'
      });
      // Cloud download icon with animated arrow
      ctx.save();
      ctx.translate(56, h / 2 - 4);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-8, 2, 10, 0.8 * Math.PI, 1.8 * Math.PI);
      ctx.arc(4, -6, 12, 1.2 * Math.PI, 2.1 * Math.PI);
      ctx.arc(14, 2, 9, 1.6 * Math.PI, 0.4 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const arrowY = ((t * 20) % 20) - 6;
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.moveTo(3, arrowY - 4);
      ctx.lineTo(3, arrowY + 6);
      ctx.lineTo(8, arrowY + 6);
      ctx.lineTo(3, arrowY + 12);
      ctx.lineTo(-2, arrowY + 6);
      ctx.lineTo(3, arrowY + 6);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'WEB-DL', 215, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#a7f3d0', '#10b981']);
      drawSubPill(ctx, 'BIT-FOR-BIT STREAM', 215, h / 2 + 28, '#059669', '#ecfdf5');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'webrip',
    filename: 'WEBRip_transparent_4x.gif',
    groupId: 'source',
    title: 'WEBRip',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#8b5cf6',
        secondary: '#06b6d4',
        bg1: '#100b1e',
        bg2: '#1b1233'
      });
      // Waveform stream animation
      ctx.save();
      ctx.translate(38, h / 2);
      for (let bar = 0; bar < 5; bar++) {
        const barH = 10 + Math.sin((t + bar * 0.2) * 2 * Math.PI) * 16;
        ctx.fillStyle = bar % 2 === 0 ? '#a78bfa' : '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(bar * 9, -barH / 2, 5, barH, 2);
        ctx.fill();
      }
      ctx.restore();

      drawGradientText(ctx, 'WEBRip', 215, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#ddd6fe', '#8b5cf6']);
      drawSubPill(ctx, 'DIGITAL CAPTURE', 215, h / 2 + 28, '#7c3aed', '#f5f3ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'hdtv',
    filename: 'HDTV_transparent_4x.gif',
    groupId: 'source',
    title: 'HDTV',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f59e0b',
        secondary: '#38bdf8',
        bg1: '#161007',
        bg2: '#241a0b'
      });
      // Antenna broadcast signal
      ctx.save();
      ctx.translate(56, h / 2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, -6);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -6, 4, 0, 2 * Math.PI);
      ctx.fill();
      for (let arcIdx = 1; arcIdx <= 3; arcIdx++) {
        const waveProgress = (t + arcIdx / 3) % 1;
        const waveRadius = 8 + waveProgress * 16;
        const alpha = 1 - waveProgress;
        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, -6, waveRadius, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -6, waveRadius, 0.4 * Math.PI, 1.6 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();

      drawGradientText(ctx, 'HDTV', 215, h / 2 - 12, '900 44px sans-serif', ['#ffffff', '#fde68a', '#f59e0b']);
      drawSubPill(ctx, 'BROADCAST STREAM', 215, h / 2 + 28, '#d97706', '#fffbeb');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dvd-rip',
    filename: 'DVD_RIP_transparent_4x.gif',
    groupId: 'source',
    title: 'DVD RIP',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f97316',
        secondary: '#e11d48',
        bg1: '#180c07',
        bg2: '#2a140c'
      });
      ctx.save();
      ctx.translate(56, h / 2);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, 2 * Math.PI);
      ctx.stroke();
      const angle = t * 2 * Math.PI;
      ctx.fillStyle = 'rgba(255, 237, 213, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 18, angle, angle + 0.5 * Math.PI);
      ctx.arc(0, 0, 10, angle + 0.5 * Math.PI, angle, true);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'DVD RIP', 215, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#fed7aa', '#f97316']);
      drawSubPill(ctx, 'STANDARD MASTER', 215, h / 2 + 28, '#ea580c', '#fff7ed');
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Resolution Group (Centered, perfectly framed) ---
  {
    id: '4k-ultra-hd',
    filename: '4k_ultra_hd.gif',
    groupId: 'resolution',
    title: '4K Ultra HD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#eab308',
        secondary: '#f59e0b',
        bg1: '#120f04',
        bg2: '#1f1a07'
      });
      
      // Centered Balanced Layout
      drawGradientText(ctx, '4K ULTRA HD', w / 2, h / 2 - 12, '900 38px sans-serif', ['#ffffff', '#fef08a', '#eab308', '#ca8a04']);
      drawSubPill(ctx, '3840 × 2160 • 2160p', w / 2, h / 2 + 28, '#ca8a04', '#fefce8');
      
      // Sparkling star flares on left and right
      const star1 = (t * 3) % 1;
      drawSparkle(ctx, 42, 38, 7, star1);
      drawSparkle(ctx, w - 42, h - 38, 7, (t + 0.5) % 1);
      
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: '1080p-full-hd',
    filename: '1080p_full_hd.gif',
    groupId: 'resolution',
    title: '1080p Full HD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#0284c7',
        bg1: '#070f1a',
        bg2: '#0d1e33'
      });
      
      drawGradientText(ctx, '1080p FULL HD', w / 2, h / 2 - 12, '900 36px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8', '#0284c7']);
      drawSubPill(ctx, '1920 × 1080 • FHD', w / 2, h / 2 + 28, '#0284c7', '#f0f9ff');
      
      // Scanning line
      const scanX = 20 + t * (w - 40);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 20);
      ctx.lineTo(scanX, h - 20);
      ctx.stroke();

      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: '720p-hd',
    filename: '720p_hd.gif',
    groupId: 'resolution',
    title: '720p HD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#60a5fa',
        secondary: '#3b82f6',
        bg1: '#070e1a',
        bg2: '#0e1c36'
      });
      drawGradientText(ctx, '720p HD', w / 2, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#bfdbfe', '#60a5fa', '#3b82f6']);
      drawSubPill(ctx, '1280 × 720 • HD READY', w / 2, h / 2 + 28, '#2563eb', '#eff6ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: '480p-sd',
    filename: '480p_sd.gif',
    groupId: 'resolution',
    title: '480p SD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#94a3b8',
        secondary: '#64748b',
        bg1: '#0e1117',
        bg2: '#181d28'
      });
      drawGradientText(ctx, '480p SD', w / 2, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#e2e8f0', '#94a3b8', '#64748b']);
      drawSubPill(ctx, '854 × 480 • STANDARD DEFINITION', w / 2, h / 2 + 28, '#475569', '#f8fafc');
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Video Tech Group ---
  {
    id: 'dolby-vision',
    filename: 'dolby_vision.gif',
    groupId: 'video-tech',
    title: 'Dolby Vision',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#ec4899',
        secondary: '#8b5cf6',
        bg1: '#0d0714',
        bg2: '#180e25'
      });
      // Dolby Double-D Logo with rainbow prism shift
      ctx.save();
      ctx.translate(65, h / 2);
      const hueShift = (t * 360) % 360;
      const logoGrad = ctx.createLinearGradient(-30, -25, 30, 25);
      logoGrad.addColorStop(0, `hsl(${hueShift}, 100%, 70%)`);
      logoGrad.addColorStop(0.33, `hsl(${(hueShift + 120) % 360}, 100%, 65%)`);
      logoGrad.addColorStop(0.66, `hsl(${(hueShift + 240) % 360}, 100%, 65%)`);
      logoGrad.addColorStop(1, `hsl(${hueShift}, 100%, 70%)`);
      ctx.fillStyle = logoGrad;
      
      // Left D
      ctx.beginPath();
      ctx.arc(-8, 0, 20, 0.5 * Math.PI, 1.5 * Math.PI);
      ctx.lineTo(-8, 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0d0714';
      ctx.beginPath();
      ctx.arc(-8, 0, 10, 0.5 * Math.PI, 1.5 * Math.PI);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();

      // Right D
      ctx.fillStyle = logoGrad;
      ctx.beginPath();
      ctx.arc(8, 0, 20, 1.5 * Math.PI, 0.5 * Math.PI);
      ctx.lineTo(8, -20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0d0714';
      ctx.beginPath();
      ctx.arc(8, 0, 10, 1.5 * Math.PI, 0.5 * Math.PI);
      ctx.lineTo(8, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'VISION', 220, h / 2 - 12, '900 38px sans-serif', ['#ffffff', '#f472b6', '#c084fc']);
      drawSubPill(ctx, 'DYNAMIC HDR • 12-BIT', 220, h / 2 + 28, '#db2777', '#fdf2f8');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'hdr10-plus',
    filename: 'hdr10_plus.gif',
    groupId: 'video-tech',
    title: 'HDR10+',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#ec4899',
        secondary: '#eab308',
        bg1: '#14080e',
        bg2: '#240f1a'
      });
      // HDR 10+ title
      drawGradientText(ctx, 'HDR10', 145, h / 2 - 12, '900 46px sans-serif', ['#ffffff', '#f472b6', '#fbbf24']);
      
      // Animated Glowing Plus Symbol
      const plusScale = 1 + Math.sin(t * 2 * Math.PI) * 0.2;
      ctx.save();
      ctx.translate(245, h / 2 - 14);
      ctx.scale(plusScale, plusScale);
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.fillRect(-4, -14, 8, 28);
      ctx.fillRect(-14, -4, 28, 8);
      ctx.restore();

      drawSubPill(ctx, 'DYNAMIC METADATA', 190, h / 2 + 28, '#db2777', '#fff1f2');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'hdr10',
    filename: 'hdr10.gif',
    groupId: 'video-tech',
    title: 'HDR10',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f59e0b',
        secondary: '#06b6d4',
        bg1: '#140d04',
        bg2: '#241708'
      });
      // Dynamic solar pulse flare on left
      const flareR = 25 + Math.sin(t * 2 * Math.PI) * 10;
      ctx.save();
      ctx.translate(56, h / 2);
      const flareGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, flareR);
      flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      flareGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.6)');
      flareGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(0, 0, flareR, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'HDR 10', 215, h / 2 - 12, '900 48px sans-serif', ['#ffffff', '#fde68a', '#f59e0b']);
      drawSubPill(ctx, 'STATIC HDR • BT.2020', 215, h / 2 + 28, '#d97706', '#fffbeb');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'hdr',
    filename: 'hdr.gif',
    groupId: 'video-tech',
    title: 'HDR',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f97316',
        secondary: '#fbbf24',
        bg1: '#140a04',
        bg2: '#241308'
      });
      ctx.save();
      ctx.translate(60, h / 2);
      for (let ray = 0; ray < 8; ray++) {
        const rayAngle = (t * 2 * Math.PI) + (ray * Math.PI / 4);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * 12, Math.sin(rayAngle) * 12);
        ctx.lineTo(Math.cos(rayAngle) * 26, Math.sin(rayAngle) * 26);
        ctx.stroke();
      }
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'HDR', 215, h / 2 - 12, '900 52px sans-serif', ['#ffffff', '#fed7aa', '#f97316']);
      drawSubPill(ctx, 'HIGH DYNAMIC RANGE', 215, h / 2 + 28, '#ea580c', '#fff7ed');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'sdr',
    filename: 'SDR_transparent_4x.gif',
    groupId: 'video-tech',
    title: 'SDR',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#94a3b8',
        secondary: '#64748b',
        bg1: '#0e1118',
        bg2: '#181e2b'
      });
      drawGradientText(ctx, 'SDR', w / 2, h / 2 - 12, '900 52px sans-serif', ['#ffffff', '#cbd5e1', '#94a3b8']);
      drawSubPill(ctx, 'STANDARD DYNAMIC RANGE', w / 2, h / 2 + 28, '#475569', '#f8fafc');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'imax-enhanced',
    filename: 'imax_enhanced.gif',
    groupId: 'video-tech',
    title: 'IMAX Enhanced',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#eab308',
        secondary: '#0284c7',
        bg1: '#08101e',
        bg2: '#0e1d38'
      });
      drawGradientText(ctx, 'IMAX', w / 2, h / 2 - 14, '900 48px sans-serif', ['#ffffff', '#fef08a', '#eab308']);
      drawSubPill(ctx, 'ENHANCED CINEMA', w / 2, h / 2 + 28, '#ca8a04', '#fefce8');
      
      const flareY = h / 2 - 14;
      const flareX = 20 + t * (w - 40);
      const streakGrad = ctx.createLinearGradient(flareX - 60, flareY, flareX + 60, flareY);
      streakGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      streakGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
      streakGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(flareX - 60, flareY - 2, 120, 4);

      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'imax',
    filename: 'imax.gif',
    groupId: 'video-tech',
    title: 'IMAX',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#0284c7',
        bg1: '#070f1e',
        bg2: '#0c1d3b'
      });
      drawGradientText(ctx, 'IMAX', w / 2, h / 2 - 12, '900 52px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8']);
      drawSubPill(ctx, 'THEATRICAL RATIO', w / 2, h / 2 + 28, '#0284c7', '#f0f9ff');
      
      const laserX = 30 + t * (w - 60);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.fillRect(laserX - 20, h / 2 - 20, 40, 2);
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Video Codec Group ---
  {
    id: 'hevc',
    filename: 'HEVC_transparent_4x.gif',
    groupId: 'video-codec',
    title: 'HEVC',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#10b981',
        secondary: '#059669',
        bg1: '#05140e',
        bg2: '#0b261b'
      });
      // Digital matrix circuit dots
      ctx.save();
      ctx.translate(42, h / 2 - 25);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const dotAlpha = (Math.sin((t * 4 + r + c) * Math.PI) + 1) / 2;
          ctx.fillStyle = `rgba(16, 185, 129, ${dotAlpha})`;
          ctx.fillRect(c * 10, r * 16, 6, 6);
        }
      }
      ctx.restore();

      drawGradientText(ctx, 'HEVC', 215, h / 2 - 12, '900 46px sans-serif', ['#ffffff', '#a7f3d0', '#10b981']);
      drawSubPill(ctx, 'H.265 • HIGH EFFICIENCY', 215, h / 2 + 28, '#059669', '#ecfdf5');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'avc',
    filename: 'AVC_transparent_4x.gif',
    groupId: 'video-codec',
    title: 'AVC',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#a855f7',
        secondary: '#7c3aed',
        bg1: '#12081e',
        bg2: '#201036'
      });
      ctx.save();
      ctx.translate(45, h / 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = -15; x <= 15; x++) {
        const y = Math.sin((x * 0.2) + (t * 2 * Math.PI)) * 12;
        if (x === -15) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      drawGradientText(ctx, 'AVC', 215, h / 2 - 12, '900 46px sans-serif', ['#ffffff', '#e9d5ff', '#a855f7']);
      drawSubPill(ctx, 'H.264 • ADVANCED VIDEO', 215, h / 2 + 28, '#7e22ce', '#faf5ff');
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Bit Depth Group ---
  {
    id: '10bit',
    filename: '10Bit_transparent_4x.gif',
    groupId: 'bit-depth',
    title: '10Bit',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#ec4899',
        secondary: '#06b6d4',
        bg1: '#0e0b1c',
        bg2: '#1a1433'
      });
      ctx.save();
      ctx.translate(38, h / 2 - 20);
      for (let bar = 0; bar < 10; bar++) {
        const hue = ((bar * 36) + (t * 360)) % 360;
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.beginPath();
        ctx.roundRect(bar * 7, 0, 4.5, 40, 2);
        ctx.fill();
      }
      ctx.restore();

      drawGradientText(ctx, '10 BIT', 215, h / 2 - 12, '900 44px sans-serif', ['#ffffff', '#f472b6', '#38bdf8']);
      drawSubPill(ctx, '1.07 BILLION COLORS', 215, h / 2 + 28, '#db2777', '#fdf2f8');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: '8bit',
    filename: '8Bit_transparent_4x.gif',
    groupId: 'bit-depth',
    title: '8Bit',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#94a3b8',
        bg1: '#0a101d',
        bg2: '#132038'
      });
      ctx.save();
      ctx.translate(38, h / 2 - 16);
      for (let step = 0; step < 8; step++) {
        const active = ((t * 8) | 0) === step;
        ctx.fillStyle = active ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)';
        ctx.fillRect(step * 8, 32 - step * 4, 6, step * 4 + 4);
      }
      ctx.restore();

      drawGradientText(ctx, '8 BIT', 215, h / 2 - 12, '900 44px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8']);
      drawSubPill(ctx, '16.7 MILLION COLORS', 215, h / 2 + 28, '#0284c7', '#f0f9ff');
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Audio Tech Group ---
  {
    id: 'dolby-atmos',
    filename: 'dolby_atmos.gif',
    groupId: 'audio-tech',
    title: 'Dolby Atmos',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#6366f1',
        bg1: '#070b16',
        bg2: '#0e172e'
      });
      ctx.save();
      ctx.translate(60, h / 2);
      for (let arc = 1; arc <= 3; arc++) {
        const wave = (t + arc / 3) % 1;
        const r = 10 + wave * 22;
        const alpha = 1 - wave;
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, 0, 14, 0.5 * Math.PI, 1.5 * Math.PI);
      ctx.lineTo(-6, 14);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, 0, 14, 1.5 * Math.PI, 0.5 * Math.PI);
      ctx.lineTo(6, -14);
      ctx.fill();
      ctx.restore();

      drawGradientText(ctx, 'ATMOS', 215, h / 2 - 12, '900 40px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8']);
      drawSubPill(ctx, 'SPATIAL AUDIO • 3D SOUND', 215, h / 2 + 28, '#0284c7', '#f0f9ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'truehd',
    filename: 'truehd.gif',
    groupId: 'audio-tech',
    title: 'TrueHD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#1d4ed8',
        bg1: '#060d1e',
        bg2: '#0c1b3d'
      });
      ctx.save();
      ctx.translate(48, h / 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -20; x <= 20; x++) {
        const y = Math.sin((x * 0.15) + (t * 2 * Math.PI)) * 14;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      drawGradientText(ctx, 'TrueHD', 215, h / 2 - 12, '900 42px sans-serif', ['#ffffff', '#bfdbfe', '#38bdf8']);
      drawSubPill(ctx, 'LOSSLESS MASTER AUDIO', 215, h / 2 + 28, '#1d4ed8', '#eff6ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dolby-digital-plus',
    filename: 'dolby_digital_plus.gif',
    groupId: 'audio-tech',
    title: 'Dolby Digital Plus',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#0ea5e9',
        secondary: '#38bdf8',
        bg1: '#070f1c',
        bg2: '#0e1f3a'
      });
      drawGradientText(ctx, 'DOLBY DIGITAL +', w / 2, h / 2 - 12, '900 30px sans-serif', ['#ffffff', '#bae6fd', '#38bdf8']);
      drawSubPill(ctx, 'E-AC-3 ENHANCED SURROUND', w / 2, h / 2 + 28, '#0284c7', '#f0f9ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dolby-digital',
    filename: 'dolby_digital.gif',
    groupId: 'audio-tech',
    title: 'Dolby Digital',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#38bdf8',
        secondary: '#64748b',
        bg1: '#070e18',
        bg2: '#0e1d30'
      });
      drawGradientText(ctx, 'DOLBY DIGITAL', w / 2, h / 2 - 12, '900 32px sans-serif', ['#ffffff', '#e2e8f0', '#38bdf8']);
      drawSubPill(ctx, 'AC-3 5.1 SURROUND', w / 2, h / 2 + 28, '#0369a1', '#f0f9ff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dts-x',
    filename: 'dts_x.gif',
    groupId: 'audio-tech',
    title: 'DTS:X',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f97316',
        secondary: '#ea580c',
        bg1: '#180a03',
        bg2: '#2b1207'
      });
      drawGradientText(ctx, 'dts', 115, h / 2 - 8, 'italic 900 48px sans-serif', ['#ffffff', '#fed7aa', '#f97316']);
      ctx.save();
      ctx.translate(225, h / 2 - 14);
      for (let wave = 1; wave <= 3; wave++) {
        const wp = (t + wave / 3) % 1;
        ctx.strokeStyle = `rgba(249, 115, 22, ${1 - wp})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + wp * 24, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.font = '900 58px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(':X', 20, 0);
      ctx.restore();

      drawSubPill(ctx, 'OBJECT-BASED IMMERSIVE AUDIO', w / 2, h / 2 + 28, '#ea580c', '#fff7ed');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dts-hd-master-audio',
    filename: 'dts_hd_master_audio.gif',
    groupId: 'audio-tech',
    title: 'DTS-HD Master Audio',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f59e0b',
        secondary: '#f97316',
        bg1: '#160d03',
        bg2: '#291807'
      });
      ctx.save();
      ctx.translate(38, h / 2);
      for (let bar = 0; bar < 6; bar++) {
        const barH = 8 + Math.abs(Math.sin((t * 3 + bar * 0.4) * Math.PI)) * 26;
        ctx.fillStyle = bar < 4 ? '#fbbf24' : '#f97316';
        ctx.beginPath();
        ctx.roundRect(bar * 7, -barH / 2, 4.5, barH, 2);
        ctx.fill();
      }
      ctx.restore();

      drawGradientText(ctx, 'dts-HD', 215, h / 2 - 14, '900 42px sans-serif', ['#ffffff', '#fde68a', '#f59e0b']);
      drawSubPill(ctx, 'MASTER AUDIO LOSSLESS', 215, h / 2 + 28, '#d97706', '#fffbeb');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dts-hd',
    filename: 'dts_hd.gif',
    groupId: 'audio-tech',
    title: 'DTS-HD',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f59e0b',
        secondary: '#f97316',
        bg1: '#160d04',
        bg2: '#281708'
      });
      drawGradientText(ctx, 'dts-HD', w / 2, h / 2 - 12, '900 48px sans-serif', ['#ffffff', '#fde68a', '#f59e0b']);
      drawSubPill(ctx, 'HIGH RESOLUTION AUDIO', w / 2, h / 2 + 28, '#d97706', '#fffbeb');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: 'dts',
    filename: 'dts.gif',
    groupId: 'audio-tech',
    title: 'DTS',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#f97316',
        secondary: '#fbbf24',
        bg1: '#160b03',
        bg2: '#291407'
      });
      drawGradientText(ctx, 'dts', w / 2, h / 2 - 12, 'italic 900 56px sans-serif', ['#ffffff', '#fed7aa', '#f97316']);
      drawSubPill(ctx, 'DIGITAL SURROUND', w / 2, h / 2 + 28, '#ea580c', '#fff7ed');
      drawSheen(ctx, w, h, t);
    }
  },

  // --- Audio Channels Group ---
  {
    id: '71-audio',
    filename: '7_1_audio.gif',
    groupId: 'audio-channels',
    title: '7.1 Audio',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#06b6d4',
        secondary: '#3b82f6',
        bg1: '#07121c',
        bg2: '#0e2338'
      });
      ctx.save();
      ctx.translate(65, h / 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      const activeSpk = Math.floor(t * 8);
      for (let spk = 0; spk < 8; spk++) {
        const a = (spk * 2 * Math.PI / 8) - Math.PI / 2;
        const sx = Math.cos(a) * 24;
        const sy = Math.sin(a) * 24;
        ctx.fillStyle = (spk === activeSpk) ? '#22d3ee' : 'rgba(6, 182, 212, 0.4)';
        if (spk === activeSpk) {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, spk === activeSpk ? 4.5 : 3, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();

      drawGradientText(ctx, '7.1', 215, h / 2 - 12, '900 50px sans-serif', ['#ffffff', '#a5f3fc', '#06b6d4']);
      drawSubPill(ctx, '8 DISCRETE CHANNELS', 215, h / 2 + 28, '#0891b2', '#ecfeff');
      drawSheen(ctx, w, h, t);
    }
  },
  {
    id: '51-audio',
    filename: '5_1_audio.gif',
    groupId: 'audio-channels',
    title: '5.1 Audio',
    render: (ctx, w, h, t) => {
      drawBaseCard(ctx, w, h, t, {
        primary: '#10b981',
        secondary: '#06b6d4',
        bg1: '#061412',
        bg2: '#0b2622'
      });
      ctx.save();
      ctx.translate(65, h / 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      const activeSpk = Math.floor(t * 6);
      for (let spk = 0; spk < 6; spk++) {
        const a = (spk * 2 * Math.PI / 6) - Math.PI / 2;
        const sx = Math.cos(a) * 24;
        const sy = Math.sin(a) * 24;
        ctx.fillStyle = (spk === activeSpk) ? '#34d399' : 'rgba(16, 185, 129, 0.4)';
        if (spk === activeSpk) {
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, spk === activeSpk ? 4.5 : 3, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();

      drawGradientText(ctx, '5.1', 215, h / 2 - 12, '900 50px sans-serif', ['#ffffff', '#a7f3d0', '#10b981']);
      drawSubPill(ctx, '6 SURROUND CHANNELS', 215, h / 2 + 28, '#059669', '#ecfdf5');
      drawSheen(ctx, w, h, t);
    }
  }
];

// Main generation pipeline
async function generateAll() {
  console.log(`Starting generation of ${BADGE_DEFS.length} animated GIF badges...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  for (let bIndex = 0; bIndex < BADGE_DEFS.length; bIndex++) {
    const badge = BADGE_DEFS[bIndex];
    console.log(`[${bIndex + 1}/${BADGE_DEFS.length}] Generating ${badge.title} -> ${badge.filename}...`);

    const renderedFrames = await page.evaluate(async (bDefString, w, h, totalFrames) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const fn = new Function('ctx', 'w', 'h', 't', 'drawBaseCard', 'drawGradientText', 'drawSubPill', 'drawSheen', 'drawSparkle', bDefString);

      const frames = [];
      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        ctx.clearRect(0, 0, w, h);
        fn(ctx, w, h, t, drawBaseCard, drawGradientText, drawSubPill, drawSheen, drawSparkle);
        const imgData = ctx.getImageData(0, 0, w, h);
        frames.push(Array.from(imgData.data));
      }
      return frames;

      function drawBaseCard(ctx, w, h, t, opts) {
        const margin = 8;
        const cardW = w - margin * 2;
        const cardH = h - margin * 2;
        const r = 18;
        const bgGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + cardH);
        bgGrad.addColorStop(0, opts.bg1);
        bgGrad.addColorStop(1, opts.bg2);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, cardW, cardH, r);
        ctx.fillStyle = bgGrad;
        ctx.fill();
        const borderGrad = ctx.createLinearGradient(
          margin + Math.cos(t * 2 * Math.PI) * cardW,
          margin,
          margin + cardW,
          margin + cardH
        );
        borderGrad.addColorStop(0, opts.primary);
        borderGrad.addColorStop(0.5, opts.secondary);
        borderGrad.addColorStop(1, opts.primary);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.clip();
        const innerGlow = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = innerGlow;
        ctx.fillRect(margin, margin, cardW, cardH);
        ctx.restore();
      }

      function drawGradientText(ctx, text, x, y, font, colors) {
        ctx.save();
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textGrad = ctx.createLinearGradient(x, y - 25, x, y + 25);
        colors.forEach((c, i) => textGrad.addColorStop(i / (colors.length - 1), c));
        ctx.shadowColor = colors[colors.length - 1];
        ctx.shadowBlur = 14;
        ctx.fillStyle = textGrad;
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      function drawSubPill(ctx, text, x, y, pillColor, textColor) {
        ctx.save();
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textW = ctx.measureText(text).width;
        const pillW = textW + 18;
        const pillH = 18;
        ctx.fillStyle = pillColor + '33';
        ctx.strokeStyle = pillColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      function drawSheen(ctx, w, h, t) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(8, 8, w - 16, h - 16, 18);
        ctx.clip();
        const sheenX = -w + t * (w * 3);
        const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + 80, h);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
        sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(8, 8, w - 16, h - 16);
        ctx.restore();
      }

      function drawSparkle(ctx, x, y, size, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(0, 0, size, 0);
        ctx.quadraticCurveTo(0, 0, 0, size);
        ctx.quadraticCurveTo(0, 0, -size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -size);
        ctx.fill();
        ctx.restore();
      }
    }, `(${badge.render.toString()})(ctx, w, h, t);`, WIDTH, HEIGHT, TOTAL_FRAMES);

    const gif = GIFEncoder();
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const data = new Uint8Array(renderedFrames[f]);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, WIDTH, HEIGHT, {
        palette,
        delay: DELAY,
        repeat: 0
      });
    }
    gif.finish();

    const buffer = Buffer.from(gif.bytes());
    const outPath = path.join(BADGES_DIR, badge.filename);
    fs.writeFileSync(outPath, buffer);
    console.log(` -> Successfully saved ${badge.filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log(`\n🎉 All ${BADGE_DEFS.length} GIF badges successfully re-generated!`);
}

generateAll().catch(console.error);
