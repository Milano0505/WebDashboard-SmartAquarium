import { useEffect, useState } from "react";
import { adminCreateAquarium, adminGetUsers } from "../../api/backendApi";
import { INPUT_CLASS_NAME, SmallButton, StatusMessages, useApiAction } from "./AccessUiParts";

// new aquarium
export default function NewAquariumForm({ onAquariumCreated, onCancel }) {
    // form state
    const [aquariumName, setAquariumName] = useState("");
    const [customAquariumId, setCustomAquariumId] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [ownerCandidates, setOwnerCandidates] = useState([]);
    const { status, isBusy, runApiAction } = useApiAction();

    // owner candidates
    useEffect(() => {
        adminGetUsers()
            .then(result => setOwnerCandidates(result.users.filter(user => user.role !== "admin")))
            .catch(() => setOwnerCandidates([]));
    }, []);

    // create aquarium
    const handleCreateAquarium = async event => {
        event.preventDefault();
        const result = await runApiAction(
            () =>
                adminCreateAquarium({
                    name: aquariumName.trim(),
                    id: customAquariumId.trim() || undefined,
                    ownerId: ownerId || undefined,
                }),
            "Aquarium created.",
        );
        if (result) onAquariumCreated(result.id);
    };

    return (
        <form onSubmit={handleCreateAquarium} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="text-xs font-semibold text-slate-600">New aquarium</div>
            <StatusMessages status={status} />
            <input
                required
                maxLength={80}
                value={aquariumName}
                onChange={event => setAquariumName(event.target.value)}
                placeholder="Aquarium name"
                className={INPUT_CLASS_NAME}
                aria-label="Aquarium name"
            />
            <input
                value={customAquariumId}
                onChange={event => setCustomAquariumId(event.target.value)}
                placeholder="Aquarium ID (optional)"
                pattern="[A-Za-z0-9_\-]{1,64}"
                title="Letters, numbers, - and _ (up to 64 characters)"
                className={INPUT_CLASS_NAME}
                aria-label="Aquarium ID"
            />
            <select
                value={ownerId}
                onChange={event => setOwnerId(event.target.value)}
                className={INPUT_CLASS_NAME}
                aria-label="Owner"
            >
                <option value="">No owner yet (assign later)</option>
                {ownerCandidates.map(user => (
                    <option key={user.userId} value={user.userId}>
                        {user.fullName || user.email} · {user.email}
                    </option>
                ))}
            </select>
            <p className="text-xs text-slate-400">
                Use the same ID as AQUARIUM_ID in the device firmware if the ESP32 is already installed.
            </p>
            <div className="flex gap-2">
                <SmallButton type="submit" tone="primary" disabled={isBusy}>
                    Create
                </SmallButton>
                {onCancel && <SmallButton onClick={onCancel}>Cancel</SmallButton>}
            </div>
        </form>
    );
}
