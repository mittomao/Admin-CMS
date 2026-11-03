/**
 * Image Compressor Utility (Client-side HTML5 Canvas)
 * Nén ảnh trực tiếp trên trình duyệt trước khi upload để tiết kiệm 70-85% băng thông.
 */

/**
 * Nén tệp tin ảnh trên canvas
 * @param {File|Blob} file
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {number} quality (0.0 -> 1.0)
 * @returns {Promise<Blob>}
 */
export function compressImageClient(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    // Không nén file gif (để giữ animation) hoặc svg
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return resolve(file);
    }

    // Không nén nếu không phải là image
    if (!file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;

        // Tính toán tỷ lệ co giãn giữ nguyên aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        // Vẽ ảnh lên canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất blob
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              // Nếu nén mà dung lượng không giảm thì dùng file gốc
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

// Hỗ trợ gán vào window cho non-module scripts
if (typeof window !== 'undefined') {
  window.compressImageClient = compressImageClient;
}

