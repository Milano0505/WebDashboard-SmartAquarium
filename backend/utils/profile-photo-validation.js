// batas foto
const MAX_PHOTO_BYTES = 180 * 1024;
// batas url
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 32;
// pola jpeg
const JPEG_DATA_URL_PATTERN = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

// validasi foto
export function isValidProfilePhotoUrl(value) {
    if (value === null) return true;
    if (typeof value !== "string") return false;

    const dataUrlMatch = JPEG_DATA_URL_PATTERN.exec(value);
    if (dataUrlMatch) {
        if (value.length > MAX_DATA_URL_LENGTH) return false;
        const imageBytes = Buffer.from(dataUrlMatch[1], "base64");
        return (
            imageBytes.length > 0 &&
            imageBytes.length <= MAX_PHOTO_BYTES &&
            imageBytes[0] === 0xff &&
            imageBytes[1] === 0xd8 &&
            imageBytes[2] === 0xff
        );
    }

    if (value.length > 2048) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}
