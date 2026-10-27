// Cache memori sederhana untuk menekan baca Firestore (kuota gratis 50.000 baca/hari).
// Aman karena semua penulisan lewat proses backend ini: setiap penulisan memanggil delete/deletePrefix.
// ttlMs tetap jadi batas atas jika dokumen diubah dari luar (mis. skrip migrasi atau Firebase console).
// Catatan: bila backend dijalankan lebih dari satu instance, data bisa basi sampai ttlMs
export function createCache({ ttlMs, maxEntries = 500 }) {
    const entries = new Map();
    // Naik setiap invalidasi; load() tidak menyimpan hasil yang dibaca selagi ada invalidasi
    let generation = 0;

    const get = key => {
        const entry = entries.get(key);
        if (!entry || Date.now() - entry.cachedAt >= ttlMs) return undefined;
        return entry.value;
    };

    const set = (key, value) => {
        if (entries.size >= maxEntries) entries.clear();
        entries.set(key, { value, cachedAt: Date.now() });
    };

    return {
        get,
        set,
        delete(key) {
            generation += 1;
            entries.delete(key);
        },
        deletePrefix(prefix) {
            generation += 1;
            for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
        },
        clear() {
            generation += 1;
            entries.clear();
        },
        // Ambil dari cache, atau panggil loader dan simpan. Hasil null/undefined tidak disimpan
        async load(key, loader) {
            const cached = get(key);
            if (cached !== undefined) return cached;

            const startedAt = generation;
            const value = await loader();
            if (value !== null && value !== undefined && startedAt === generation) set(key, value);
            return value;
        },
    };
}
