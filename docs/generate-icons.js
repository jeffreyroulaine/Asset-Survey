// Run once with: node generate-icons.js
// Generates icon-192.png and icon-512.png from canvas

const { createCanvas } = require('canvas');
const fs = require('fs');

function makeIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0f4c75');
  grad.addColorStop(1, '#1b6ca8');
  ctx.fillStyle = grad;
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();

  // Emoji
  ctx.font = `${size * 0.52}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏗️', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

try {
  fs.writeFileSync('icon-192.png', makeIcon(192));
  fs.writeFileSync('icon-512.png', makeIcon(512));
  console.log('Icons generated');
} catch (e) {
  console.log('canvas not available, skipping icon generation');
}
