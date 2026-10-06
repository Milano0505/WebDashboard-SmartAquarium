import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import { JWT_SECRET } from "../config/security.js";

// Request dashboard: header "Authorization: Bearer <JWT>", mengisi req.auth.userId
export function requireAuth(req, res, next) {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentication is required." });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET, { issuer: "smart-aquarium-api" });
        req.auth = { userId: payload.sub };
        return next();
    } catch {
        return res.status(401).json({ message: "The session token is invalid or expired." });
    }
}

// Request ESP32: header "x-device-key" harus sama dengan HARDWARE_API_KEY
export function requireDeviceKey(req, res, next) {
    const expectedKey = process.env.HARDWARE_API_KEY;
    if (!expectedKey) {
        return res.status(503).json({ message: "Hardware API authentication is not configured." });
    }

    const expected = Buffer.from(expectedKey);
    const received = Buffer.from(req.get("x-device-key") || "");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        return res.status(401).json({ message: "A valid device key is required." });
    }
    return next();
}
