// max file
const MAX_PHOTO_FILE_BYTES = 10 * 1024 * 1024;
// max dimension
const MAX_PHOTO_DIMENSION_PX = 256;
// max compressed
const MAX_COMPRESSED_PHOTO_BYTES = 180 * 1024;

// photo url
export function createProfilePhotoDataUrl(file) {
    if (!file?.type?.startsWith("image/")) {
        return Promise.reject(new Error("Choose a valid image file."));
    }
    if (file.size > MAX_PHOTO_FILE_BYTES) {
        return Promise.reject(new Error("Profile photos must be smaller than 10 MB."));
    }

    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(1, MAX_PHOTO_DIMENSION_PX / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => {
                    if (!blob) {
                        reject(new Error("Could not process the selected profile photo."));
                        return;
                    }
                    if (blob.size > MAX_COMPRESSED_PHOTO_BYTES) {
                        reject(new Error("The processed profile photo is too large. Choose a simpler image."));
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("Could not read the processed profile photo."));
                    reader.readAsDataURL(blob);
                },
                "image/jpeg",
                0.82,
            );
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not load the selected profile photo."));
        };
        image.src = objectUrl;
    });
}
