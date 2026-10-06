const MAX_PHOTO_BYTES = 180 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 32;
const jpegDataUrlPattern = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

// Valid: null, URL HTTP(S), atau data URL JPEG maks. 180 KB
export function isValidProfilePhotoUrl(value) {
    if (value === null) return true;
    if (typeof value !== "string") return false;

    const match = jpegDataUrlPattern.exec(value);
    if (match) {
        if (value.length > MAX_DATA_URL_LENGTH) return false;
        const image = Buffer.from(match[1], "base64");
        return (
            image.length > 0 &&
            image.length <= MAX_PHOTO_BYTES &&
            image[0] === 0xff &&
            image[1] === 0xd8 &&
            image[2] === 0xff
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
