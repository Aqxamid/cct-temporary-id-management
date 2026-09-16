/**
 * SignatureEngine — Touch/Pointer-enabled signature pad
 * with automatic white-background to transparent PNG conversion
 */
export class SignatureEngine {
  constructor(canvasId, width = 620, height = 210) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.isDrawing = false;
    this.hasContent = false;

    this.canvas.width = width;
    this.canvas.height = height;
    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw guide lines
    this.ctx.strokeStyle = '#dfe5eb';
    this.ctx.lineWidth = 1;
    [70, 140].forEach(y => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    });

    // Reset pen settings
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2.3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const start = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      e.preventDefault();
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.hasContent = true;
    };

    const stop = () => { this.isDrawing = false; };

    this.canvas.addEventListener('pointerdown', start);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointerleave', stop);
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    this.canvas.addEventListener('touchend', stop);
  }

  clear() {
    this.hasContent = false;
    this.initCanvas();
  }

  isEmpty() {
    return !this.hasContent;
  }

  /**
   * Converts white background pixels to transparent — returns PNG data URL
   */
  getTransparentPNG() {
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Threshold: pixels close to white become transparent
      if (r > 210 && g > 210 && b > 210) {
        data[i + 3] = 0;
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imgData, 0, 0);

    return tempCanvas.toDataURL('image/png');
  }

  /**
   * Load an image file into the canvas
   */
  loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

          const scale = Math.min(
            this.canvas.width / img.width,
            this.canvas.height / img.height
          );
          const x = (this.canvas.width / 2) - (img.width / 2) * scale;
          const y = (this.canvas.height / 2) - (img.height / 2) * scale;

          this.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          this.hasContent = true;
          resolve();
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
