const sharp = require('sharp');

class ImageProcessor {
  static async transform(buffer, transformations) {
    let image = sharp(buffer);
    
    // ...existing code...
    
    if (transformations.flip) {
      image = image.flip();
    }
    
    if (transformations.flop) {
      image = image.flop(); // mirror effect
    }
    
    if (transformations.watermark) {
      const { text, position = 'center' } = transformations.watermark;
      const svg = `
        <svg width="500" height="50">
          <text x="50%" y="50%" font-family="Arial" font-size="24" fill="rgba(255,255,255,0.5)" text-anchor="middle">${text}</text>
        </svg>
      `;
      image = image.composite([{
        input: Buffer.from(svg),
        gravity: position
      }]);
    }
    
    if (transformations.compress) {
      image = image.jpeg({ quality: transformations.compress.quality || 80 });
    }
    
    if (transformations.blur) {
      image = image.blur(transformations.blur);
    }
    
    if (transformations.sharpen) {
      image = image.sharpen();
    }
    
    if (transformations.median) {
      image = image.median(transformations.median);
    }
    
    if (transformations.tint) {
      image = image.tint(transformations.tint);
    }
    
    if (transformations.normalize) {
      image = image.normalize();
    }
    
    if (transformations.threshold) {
      image = image.threshold(transformations.threshold);
    }

    return image.toBuffer();
  }

  static validateMetadata(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    if (file.size > maxSize) {
      throw new Error('File too large');
    }
  }
}

module.exports = ImageProcessor;
