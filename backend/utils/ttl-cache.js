// cache TTL
export function createTtlCache({ ttlMs, maxEntries = 500 }) {
    const cacheEntries = new Map();
    // versi invalidasi
    let invalidationGeneration = 0;

    // ambil cache
    const get = key => {
        const entry = cacheEntries.get(key);
        if (!entry || Date.now() - entry.cachedAt >= ttlMs) return undefined;
        return entry.value;
    };

    // simpan cache
    const set = (key, value) => {
        if (cacheEntries.size >= maxEntries) cacheEntries.clear();
        cacheEntries.set(key, { value, cachedAt: Date.now() });
    };

    return {
        get,
        set,
        delete(key) {
            invalidationGeneration += 1;
            cacheEntries.delete(key);
        },
        deletePrefix(prefix) {
            invalidationGeneration += 1;
            for (const key of cacheEntries.keys()) if (key.startsWith(prefix)) cacheEntries.delete(key);
        },
        clear() {
            invalidationGeneration += 1;
            cacheEntries.clear();
        },
        // cache muat
        async getOrLoad(key, loadValue) {
            const cached = get(key);
            if (cached !== undefined) return cached;

            const generationAtStart = invalidationGeneration;
            const value = await loadValue();
            if (value !== null && value !== undefined && generationAtStart === invalidationGeneration) {
                set(key, value);
            }
            return value;
        },
    };
}
