/**
 * StudyTrace - Cyber Wave Plexus Background Engine
 * Renders an undulating 3D-perspective cyan/teal particle wave mesh
 * exactly matching the digital cyber aesthetic.
 */

(function () {
  const canvas = document.getElementById('cyber-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let animationFrameId;

  // Configuration matching the user's cyan digital mesh
  const CONFIG = {
    rows: 16,
    cols: 42,
    baseYRatio: 0.62, // Center of the wave is at ~62% screen height
    waveHeight: 85,
    speed: 0.0018,
    primaryColor: 'rgba(6, 182, 212, ', // Cyan / teal
    glowColor: '#00f0ff',
    particleCount: 50
  };

  // Ambient floating particles
  const particles = [];
  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -Math.random() * 0.4 - 0.1,
        opacity: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        glow: Math.random() > 0.75
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }

  window.addEventListener('resize', resize);
  resize();

  // Mouse interaction
  let mouseX = width / 2;
  let mouseY = height / 2;
  let targetMouseX = mouseX;
  let targetMouseY = mouseY;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  });

  let time = 0;

  function draw() {
    time += CONFIG.speed;

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;
    const mouseOffsetX = ((mouseX / width) - 0.5) * 40;
    const mouseOffsetY = ((mouseY / height) - 0.5) * 30;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw ambient floating particles (stars/sparks)
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += Math.sin(time * 30 * p.pulseSpeed) * 0.01;

      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const alpha = Math.max(0.15, Math.min(0.9, p.opacity));
      ctx.fillStyle = CONFIG.primaryColor + alpha + ')';
      
      if (p.glow) {
        ctx.shadowColor = CONFIG.glowColor;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Compute 3D Mesh Grid Points
    const grid = [];
    const baseY = height * CONFIG.baseYRatio + mouseOffsetY;
    const stepX = (width * 1.3) / (CONFIG.cols - 1);
    const startX = -width * 0.15 + mouseOffsetX;

    for (let r = 0; r < CONFIG.rows; r++) {
      grid[r] = [];
      const rowProgress = r / (CONFIG.rows - 1); // 0 (back) to 1 (front)
      const depthScale = 0.55 + rowProgress * 0.7; // Perspective scaling
      const zOffset = (rowProgress - 0.5) * 160;

      for (let c = 0; c < CONFIG.cols; c++) {
        const colProgress = c / (CONFIG.cols - 1);
        const x = startX + c * stepX;

        // Complex undulating wave calculation
        const wave1 = Math.sin(time * 3 + colProgress * 6.5 + rowProgress * 2.8);
        const wave2 = Math.cos(time * 2.2 - colProgress * 4.2 + rowProgress * 3.5) * 0.6;
        const wave3 = Math.sin(time * 1.5 + colProgress * 10) * 0.35;
        const combinedWave = (wave1 + wave2 + wave3) * CONFIG.waveHeight * depthScale;

        // Crest shaping: higher elevation in the right-middle, tapering at edges
        const envelope = Math.sin(colProgress * Math.PI) * 1.25;
        const y = baseY + combinedWave * envelope + zOffset;

        grid[r][c] = { x, y, depthScale, rowProgress };
      }
    }

    // 3. Draw Mesh Lines (Horizontal and Diagonal)
    for (let r = 0; r < CONFIG.rows; r++) {
      for (let c = 0; c < CONFIG.cols; c++) {
        const pt = grid[r][c];
        const nextCol = c + 1 < CONFIG.cols ? grid[r][c + 1] : null;
        const nextRow = r + 1 < CONFIG.rows ? grid[r + 1][c] : null;
        const diagPt = (r + 1 < CONFIG.rows && c + 1 < CONFIG.cols) ? grid[r + 1][c + 1] : null;

        // Depth based alpha & line width
        const baseAlpha = 0.12 + pt.rowProgress * 0.32;

        // Horizontal line
        if (nextCol) {
          ctx.strokeStyle = CONFIG.primaryColor + baseAlpha + ')';
          ctx.lineWidth = 0.8 * pt.depthScale;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(nextCol.x, nextCol.y);
          ctx.stroke();
        }

        // Vertical line
        if (nextRow) {
          ctx.strokeStyle = CONFIG.primaryColor + (baseAlpha * 0.75) + ')';
          ctx.lineWidth = 0.6 * pt.depthScale;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(nextRow.x, nextRow.y);
          ctx.stroke();
        }

        // Diagonal connecting mesh
        if (diagPt && (r + c) % 2 === 0) {
          ctx.strokeStyle = CONFIG.primaryColor + (baseAlpha * 0.45) + ')';
          ctx.lineWidth = 0.5 * pt.depthScale;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(diagPt.x, diagPt.y);
          ctx.stroke();
        }
      }
    }

    // 4. Draw Glowing Mesh Nodes & Peaks
    ctx.save();
    for (let r = 0; r < CONFIG.rows; r += 2) {
      for (let c = 0; c < CONFIG.cols; c += 2) {
        const pt = grid[r][c];
        const isPeak = pt.y < baseY - 35; // Luminous peak nodes
        
        if (isPeak || (r % 4 === 0 && c % 4 === 0)) {
          const nodeRadius = isPeak ? 2.5 * pt.depthScale : 1.4 * pt.depthScale;
          
          if (isPeak) {
            ctx.shadowColor = CONFIG.glowColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.shadowColor = CONFIG.glowColor;
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#22d3ee';
          }

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, nodeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    animationFrameId = requestAnimationFrame(draw);
  }

  // Start Animation
  draw();
})();
