import { createCache } from "./cache.js";

// Riwayat suhu hanya bertambah saat perangkat menyimpan riwayat (sekitar tiap menit atau saat status berubah),
// sedangkan dashboard memintanya tiap beberapa detik. Hasil query disimpan per akuarium dan batas jumlah;
// invalidateTelemetry dipanggil setiap riwayat baru ditulis. Query dengan filter tanggal tidak disimpan
const telemetryCache = createCache({ ttlMs: 600_000, maxEntries: 100 });

export const invalidateTelemetry = aquariumId => telemetryCache.deletePrefix(`${aquariumId}|`);

export const cachedTelemetry = (aquariumId, limit, loader) => telemetryCache.load(`${aquariumId}|${limit}`, loader);
