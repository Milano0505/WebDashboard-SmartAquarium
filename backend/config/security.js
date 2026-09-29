import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured in production.");
}

function getDevelopmentSecret() {
    const secretPath = resolve(process.cwd(), ".dev-jwt-secret");
    if (existsSync(secretPath)) return readFileSync(secretPath, "utf8").trim();

    const secret = randomBytes(48).toString("hex");
    try {
        writeFileSync(secretPath, secret, { flag: "wx", mode: 0o600 });
        return secret;
    } catch (error) {
        if (error.code === "EEXIST") return readFileSync(secretPath, "utf8").trim();
        throw error;
    }
}

export const JWT_SECRET = process.env.JWT_SECRET || getDevelopmentSecret();
