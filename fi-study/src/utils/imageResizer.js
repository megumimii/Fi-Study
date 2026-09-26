export async function resizeImage(file, maxWidth, maxHeight, quality = 0.9) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = e => {
            img.src = e.target.result;
        };
        reader.onerror = reject;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Maintain aspect ratio
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                blob => {
                    resolve(new File([blob], file.name, { type: file.type }));
                },
                file.type,
                quality
            );
        };

        reader.readAsDataURL(file);
    });
}
