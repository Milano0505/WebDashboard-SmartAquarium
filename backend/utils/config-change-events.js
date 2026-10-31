import { randomUUID } from "node:crypto";

// id boot
const serverBootId = randomUUID().slice(0, 8);

// hub akuarium
const changeHubsByAquarium = new Map();

// ambil hub
function getChangeHub(aquariumId) {
    let changeHub = changeHubsByAquarium.get(aquariumId);
    if (!changeHub) {
        changeHub = { counter: 0, waiters: new Set() };
        changeHubsByAquarium.set(aquariumId, changeHub);
    }
    return changeHub;
}

// versi config
export const getConfigVersion = aquariumId => `${serverBootId}.${getChangeHub(aquariumId).counter}`;

// publikasi perubahan
export function publishConfigChange(aquariumId) {
    const changeHub = getChangeHub(aquariumId);
    changeHub.counter += 1;
    [...changeHub.waiters].forEach(wakeWaiter => wakeWaiter());
}

// tunggu perubahan
export function waitForConfigChange(aquariumId, knownVersion, timeoutMs, res) {
    return new Promise(resolve => {
        const changeHub = getChangeHub(aquariumId);
        if (getConfigVersion(aquariumId) !== knownVersion) return resolve();

        const wakeWaiter = () => {
            clearTimeout(timeoutTimer);
            changeHub.waiters.delete(wakeWaiter);
            res.off("close", wakeWaiter);
            resolve();
        };
        const timeoutTimer = setTimeout(wakeWaiter, timeoutMs);
        changeHub.waiters.add(wakeWaiter);
        res.once("close", wakeWaiter);
        return undefined;
    });
}
