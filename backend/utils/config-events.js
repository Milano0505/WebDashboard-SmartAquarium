import { randomUUID } from "node:crypto";

// Long polling untuk perangkat: GET /api/hardware/{id}/config?wait=20&v=<versi> ditahan sampai config berubah.
// Versi = "<id server>.<hitungan>". Id server berganti saat backend restart, sehingga perangkat yang membawa
// versi lama langsung mendapat jawaban (tidak ada perubahan yang terlewat)
const bootId = randomUUID().slice(0, 8);

// aquariumId -> { counter, waiters: Set<() => void> }
const hubs = new Map();

function hubOf(aquariumId) {
    let hub = hubs.get(aquariumId);
    if (!hub) {
        hub = { counter: 0, waiters: new Set() };
        hubs.set(aquariumId, hub);
    }
    return hub;
}

export const configVersion = aquariumId => `${bootId}.${hubOf(aquariumId).counter}`;

// Dipanggil SETELAH config akuarium berhasil ditulis dan cache dibatalkan; semua perangkat yang menunggu dibangunkan
export function publishConfigChange(aquariumId) {
    const hub = hubOf(aquariumId);
    hub.counter += 1;
    // Salinan karena setiap waiter menghapus dirinya sendiri dari set
    [...hub.waiters].forEach(wake => wake());
}

// Selesai saat versi berubah, waktu habis, atau koneksi perangkat putus (res "close")
export function waitForConfigChange(aquariumId, knownVersion, timeoutMs, res) {
    return new Promise(resolve => {
        const hub = hubOf(aquariumId);
        if (configVersion(aquariumId) !== knownVersion) return resolve();

        const wake = () => {
            clearTimeout(timer);
            hub.waiters.delete(wake);
            res.off("close", wake);
            resolve();
        };
        const timer = setTimeout(wake, timeoutMs);
        hub.waiters.add(wake);
        res.once("close", wake);
        return undefined;
    });
}
