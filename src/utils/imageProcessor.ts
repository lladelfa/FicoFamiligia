export async function processImageFile(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        return reject(new Error("Failed to read file"));
      }

      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to get canvas context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP if supported by the browser, otherwise JPEG
        const dataUrl = canvas.toDataURL("image/webp", quality);

        // Fallback to jpeg if webp results in image/png (some browsers don't support webp encoding)
        if (dataUrl.startsWith("data:image/png") && file.type !== "image/png") {
            resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
            resolve(dataUrl);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = result;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
