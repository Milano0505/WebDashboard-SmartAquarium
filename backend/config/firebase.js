import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Urutan kredensial: FIREBASE_SERVICE_ACCOUNT_JSON, file FIREBASE_SERVICE_ACCOUNT_PATH
// (default ./serviceAccountKey.json), lalu Application Default Credentials
function getCredential() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
        } catch {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
        }
    }

    const keyPath = resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "serviceAccountKey.json");
    if (existsSync(keyPath)) {
        try {
            return cert(JSON.parse(readFileSync(keyPath, "utf8")));
        } catch {
            throw new Error(`Unable to load Firebase service-account credentials from ${keyPath}.`);
        }
    }

    return applicationDefault();
}

const app = getApps()[0] || initializeApp({ credential: getCredential() });

export const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

export const admin = { firestore: { FieldValue, Timestamp } };
