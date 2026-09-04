/**
 * Photostrip Canvas Rendering Engine
 * Generates high-resolution vertical photostrip matching modern photobooth styles and custom uploaded templates.
 */

export async function renderPhotostrip({
  template,
  photos, // array of image URLs or Image objects
  coupleNames = "Adisty & Irsyad",
  weddingDate = "11 November 2026",
  guestName = "",
  filter = "normal", // 'normal', 'bw', 'vintage', 'warm', 'rose', 'cool'
  stickers = [], // array of { type, x, y, size }
  width = 600,
  height = 1800,
  showGuides = false, // if true, draws slot guideline borders (useful for template editor)
}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Helper to load image
  const loadImage = (src) => {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const customFrameImg = template?.customFrameUrl ? await loadImage(template.customFrameUrl) : null;
  const isCustomFrame = !!customFrameImg;
  const isBackgroundMode = template?.frameMode === 'background' || (!template?.frameMode && isCustomFrame);

  // 1. Draw Base Background
  ctx.fillStyle = template.bgColor || '#F6F4EE';
  ctx.fillRect(0, 0, width, height);

  if (isCustomFrame && isBackgroundMode) {
    // Draw Custom Frame as Background
    ctx.drawImage(customFrameImg, 0, 0, width, height);
  } else if (!isCustomFrame) {
    // Background patterns or gradients for presets
    if (template.theme === 'dark') {
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, template.bgColor || '#1a0f1d');
      bgGrad.addColorStop(1, '#0b060d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else if (template.id === 'korean-kawaii-pastel') {
      ctx.fillStyle = 'rgba(255, 182, 193, 0.25)';
      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 2. Draw Top Header Title (If enabled)
  const showText = template.showText !== false && (!isCustomFrame || template.showText === true);
  const textColor = template.textColor || '#263727';
  const accentColor = template.accentColor || '#c5a880';

  if (showText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.font = '600 20px "Cinzel", "Montserrat", sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillText((template.topTitle || "HAPPY").toUpperCase(), width / 2, 85);

    if (template.mainScript) {
      ctx.font = 'italic 54px "Alex Brush", "Great Vibes", cursive';
      ctx.letterSpacing = '1px';
      ctx.fillStyle = textColor;
      ctx.fillText(template.mainScript, width / 2, 145);

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, 165);
      ctx.lineTo(width / 2 + 80, 165);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  // 3. Grid Parameters for Photo Slots
  const slotCount = template.slotCount || 3;
  const marginX = template.startX ?? 42;
  const frameWidth = template.frameWidth ?? (width - marginX * 2);
  const frameHeight = template.frameHeight ?? (slotCount === 1 ? 950 : slotCount === 2 ? 620 : slotCount === 4 ? 270 : 360);
  const startY = template.startY ?? (showText ? 195 : 140);
  const gapY = template.gapY ?? (slotCount === 1 ? 0 : slotCount === 2 ? 50 : slotCount === 4 ? 22 : 32);
  const borderRadius = template.borderRadius ?? 6;

  const loadedImages = await Promise.all((photos || []).map(p => loadImage(p)));

  // Render each photo slot
  for (let i = 0; i < slotCount; i++) {
    let slotX = marginX;
    let slotY = startY + i * (frameHeight + gapY);
    let slotW = frameWidth;
    let slotH = frameHeight;

    if (template.slots && template.slots[i]) {
      slotX = template.slots[i].x;
      slotY = template.slots[i].y;
      slotW = template.slots[i].width;
      slotH = template.slots[i].height;
    }

    const img = loadedImages[i];

    // Frame Outer Borders & Shadows (when in Background mode or preset)
    if (!isCustomFrame || isBackgroundMode || showGuides) {
      // White inner card shadow / border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = template.frameBorderColor || '#ffffff';
      ctx.lineWidth = 4;
      roundRect(ctx, slotX, slotY, slotW, slotH, borderRadius);
      ctx.stroke();
    }

    // Clip inside slot for drawing photo or placeholder
    ctx.save();
    ctx.beginPath();
    const innerPad = isCustomFrame && !isBackgroundMode ? 0 : 4;
    roundRect(ctx, slotX + innerPad, slotY + innerPad, slotW - innerPad * 2, slotH - innerPad * 2, borderRadius);
    ctx.clip();

    if (img) {
      applyFilter(ctx, filter);

      const imgRatio = img.width / img.height;
      const targetRatio = (slotW - innerPad * 2) / (slotH - innerPad * 2);
      let renderW, renderH, renderX, renderY;

      if (imgRatio > targetRatio) {
        renderH = slotH - innerPad * 2;
        renderW = renderH * imgRatio;
        renderX = slotX + innerPad - (renderW - (slotW - innerPad * 2)) / 2;
        renderY = slotY + innerPad;
      } else {
        renderW = slotW - innerPad * 2;
        renderH = renderW / imgRatio;
        renderX = slotX + innerPad;
        renderY = slotY + innerPad - (renderH - (slotH - innerPad * 2)) / 2;
      }

      ctx.drawImage(img, renderX, renderY, renderW, renderH);
    } else {
      // Empty Photo Slot Placeholder
      ctx.fillStyle = template.theme === 'dark' ? 'rgba(38, 23, 42, 0.85)' : 'rgba(246, 244, 238, 0.88)';
      ctx.fillRect(slotX + innerPad, slotY + innerPad, slotW - innerPad * 2, slotH - innerPad * 2);
      
      ctx.fillStyle = template.textColor || '#263727';
      ctx.font = 'bold 22px "Plus Jakarta Sans", "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Foto #${i + 1}`, slotX + slotW / 2, slotY + slotH / 2 + 4);
    }

    ctx.restore();

    // In preset templates, render ornate borders if requested
    if (!isCustomFrame) {
      if (template.decorativeStyle === 'silver-bevel-frame') {
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 5;
        ctx.strokeRect(slotX, slotY, slotW, slotH);
      } else if (template.decorativeStyle === 'ornate-gold-border') {
        ctx.strokeStyle = '#c5a880';
        ctx.lineWidth = 4;
        ctx.strokeRect(slotX, slotY, slotW, slotH);
      }
    }
  }

  // 4. If Custom Frame Overlay Mode (PNG with transparent windows) -> Draw Frame on Top!
  if (isCustomFrame && !isBackgroundMode) {
    ctx.drawImage(customFrameImg, 0, 0, width, height);
  }

  // 5. Draw Footer Section (If enabled)
  if (showText) {
    const footerCenterY = height - 120;

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.font = 'italic 40px "Alex Brush", "Great Vibes", cursive';
    ctx.fillText(coupleNames, width / 2, footerCenterY);

    ctx.font = '500 18px "Cinzel", "Montserrat", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = accentColor;
    ctx.fillText(weddingDate, width / 2, footerCenterY + 45);

    if (guestName) {
      ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillStyle = template.theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
      ctx.fillText(`Memory by ${guestName}`, width / 2, footerCenterY + 80);
    }
  }

  // 6. Draw Custom Stickers
  if (stickers && stickers.length > 0) {
    for (const st of stickers) {
      ctx.font = `${st.size || 36}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(st.emoji, st.x, st.y);
    }
  }

  return canvas.toDataURL('image/png', 0.95);
}

function applyFilter(ctx, filter) {
  switch (filter) {
    case 'bw':
      ctx.filter = 'grayscale(100%) contrast(115%) brightness(105%)';
      break;
    case 'vintage':
      ctx.filter = 'sepia(45%) contrast(110%) brightness(102%) saturate(85%)';
      break;
    case 'warm':
      ctx.filter = 'sepia(20%) saturate(130%) brightness(108%) contrast(105%)';
      break;
    case 'rose':
      ctx.filter = 'hue-rotate(330deg) saturate(120%) brightness(105%)';
      break;
    case 'cool':
      ctx.filter = 'hue-rotate(180deg) saturate(95%) brightness(102%)';
      break;
    default:
      ctx.filter = 'none';
  }
}

function roundRect(ctx, x, y, width, height, radius = 0) {
  if (!radius) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
