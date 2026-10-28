import { useCallback, useEffect, useState } from "react";
import { adminCreateDevice, adminGetDevices, adminRevokeDevice } from "../../api/service";
import { Spinner } from "../ui";
import { EmptyState, inputClass, Section, SmallButton, StatusMessages, useAction } from "./shared";

// Perangkat ESP32 pada satu akuarium (hanya admin). Kunci perangkat hanya ditampilkan sekali saat didaftarkan
export default function DevicesSection({ aquariumId, onChanged }) {
    const [devices, setDevices] = useState(null);
    const [name, setName] = useState("");
    const [newKey, setNewKey] = useState("");
    const [copied, setCopied] = useState(false);
    const [loadError, setLoadError] = useState("");
    const { status, busy, run } = useAction();

    const load = useCallback(
        () =>
            adminGetDevices(aquariumId)
                .then(result => {
                    setDevices(result.devices);
                    setLoadError("");
                })
                .catch(error => setLoadError(error.message || "Could not load devices.")),
        [aquariumId],
    );

    useEffect(() => {
        setDevices(null);
        setNewKey("");
        load();
    }, [load]);

    const handleCreate = async event => {
        event.preventDefault();
        const result = await run(() => adminCreateDevice(aquariumId, name), "Device registered.");
        if (result) {
            setNewKey(result.deviceKey);
            setCopied(false);
            setName("");
            await load();
            onChanged?.();
        }
    };

    const handleRevoke = async device => {
        if (!window.confirm(`Revoke ${device.name}? It will stop working until you register it again.`)) return;
        if (await run(() => adminRevokeDevice(device.id), "Device revoked.")) {
            await load();
            onChanged?.();
        }
    };

    const copyKey = async () => {
        try {
            await navigator.clipboard.writeText(newKey);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <Section
            title="Device"
            description="Each aquarium has exactly one ESP32. Its key only works for this aquarium."
        >
            <StatusMessages status={status} extraError={loadError} />

            {newKey && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="mb-1 font-semibold">Copy this key now. It will not be shown again.</div>
                    <code className="block break-all rounded bg-white px-2 py-1.5 text-xs">{newKey}</code>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SmallButton onClick={copyKey}>{copied ? "Copied" : "Copy key"}</SmallButton>
                        <span className="text-xs">Put it in device/include/secrets.h as DEVICE_KEY.</span>
                    </div>
                </div>
            )}

            {devices === null && !loadError ? (
                <Spinner />
            ) : devices?.length === 0 ? (
                <EmptyState>No device registered yet.</EmptyState>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {(devices || []).map(device => (
                        <li key={device.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">{device.name}</div>
                                <div className="truncate font-mono text-xs text-slate-400">{device.id}</div>
                            </div>
                            <SmallButton tone="danger" disabled={busy} onClick={() => handleRevoke(device)}>
                                Revoke
                            </SmallButton>
                        </li>
                    ))}
                </ul>
            )}

            {/* Satu akuarium hanya boleh punya satu perangkat: pendaftaran baru hanya setelah yang lama dicabut */}
            {devices?.length > 0 ? (
                <p className="text-xs text-slate-400">
                    This aquarium already has its device. To replace the ESP32, revoke this one first, then register the
                    new one and flash it with the new key.
                </p>
            ) : (
                <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
                    <input
                        required
                        maxLength={80}
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder="Device name"
                        className={inputClass}
                    />
                    <SmallButton type="submit" tone="primary" disabled={busy}>
                        Register device
                    </SmallButton>
                </form>
            )}
        </Section>
    );
}
