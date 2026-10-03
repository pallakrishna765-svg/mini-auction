/**
 * Canvas Image Cropper Utility
 * Provides 1:1 profile image cropping, scaling, panning, and base64 export.
 */
class CanvasCropper {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.outputWidth = options.outputWidth || 300;
    this.outputHeight = options.outputHeight || 300;
    
    this.img = new Image();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.scale = 1;
    this.minScale = 0.5;
    this.maxScale = 3;
    this.posX = 0;
    this.posY = 0;
    
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="cropper-container">
        <canvas class="cropper-canvas"></canvas>
        <div class="cropper-mask"></div>
      </div>
      <div class="cropper-controls">
        <button type="button" class="btn btn-secondary btn-sm" id="cropperZoomOut">🔍 -</button>
        <button type="button" class="btn btn-secondary btn-sm" id="cropperReset">Reset</button>
        <button type="button" class="btn btn-secondary btn-sm" id="cropperZoomIn">🔍 +</button>
      </div>
    `;

    this.canvasEl = this.container.querySelector('canvas');
    this.canvasCtx = this.canvasEl.getContext('2d');
    this.viewportEl = this.container.querySelector('.cropper-container');

    this.attachEvents();
  }

  attachEvents() {
    const viewport = this.viewportEl;

    viewport.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.posX;
      this.startY = e.clientY - this.posY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.posX = e.clientX - this.startX;
      this.posY = e.clientY - this.startY;
      this.draw();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch events for mobile responsiveness
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX - this.posX;
        this.startY = e.touches[0].clientY - this.posY;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      this.posX = e.touches[0].clientX - this.startX;
      this.posY = e.touches[0].clientY - this.startY;
      this.draw();
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Controls
    this.container.querySelector('#cropperZoomIn').addEventListener('click', () => {
      this.scale = Math.min(this.scale + 0.15, this.maxScale);
      this.draw();
    });

    this.container.querySelector('#cropperZoomOut').addEventListener('click', () => {
      this.scale = Math.max(this.scale - 0.15, this.minScale);
      this.draw();
    });

    this.container.querySelector('#cropperReset').addEventListener('click', () => {
      this.resetPosition();
    });
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      this.img.crossOrigin = 'anonymous';
      this.img.onload = () => {
        this.canvasEl.width = this.viewportEl.clientWidth || 320;
        this.canvasEl.height = this.viewportEl.clientHeight || 320;
        this.resetPosition();
        resolve();
      };
      this.img.onerror = reject;
      this.img.src = src;
    });
  }

  resetPosition() {
    const vw = this.canvasEl.width;
    const vh = this.canvasEl.height;
    this.scale = Math.max(vw / this.img.width, vh / this.img.height);
    this.posX = (vw - this.img.width * this.scale) / 2;
    this.posY = (vh - this.img.height * this.scale) / 2;
    this.draw();
  }

  draw() {
    if (!this.img.complete || !this.img.width) return;
    const ctx = this.canvasCtx;
    ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    ctx.drawImage(
      this.img,
      this.posX,
      this.posY,
      this.img.width * this.scale,
      this.img.height * this.scale
    );
  }

  getCroppedBase64() {
    // Crop center 220px region matching the mask
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = this.outputWidth;
    cropCanvas.height = this.outputHeight;
    const ctx = cropCanvas.getContext('2d');

    const vw = this.canvasEl.width;
    const vh = this.canvasEl.height;
    const maskSize = 220;
    const maskX = (vw - maskSize) / 2;
    const maskY = (vh - maskSize) / 2;

    // Draw portion onto output canvas
    ctx.drawImage(
      this.canvasEl,
      maskX, maskY, maskSize, maskSize,
      0, 0, this.outputWidth, this.outputHeight
    );

    return cropCanvas.toDataURL('image/jpeg', 0.85);
  }
}

window.CanvasCropper = CanvasCropper;
