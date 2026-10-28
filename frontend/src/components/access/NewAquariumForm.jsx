import { useEffect, useState } from "react";
import { adminCreateAquarium, adminGetUsers } from "../../api/service";
import { inputClass, SmallButton, StatusMessages, useAction } from "./shared";

// Form akuarium baru (admin): nama, ID opsional, dan owner opsional yang dipilih dari daftar user
export default function NewAquariumForm({ onCreated, onCancel }) {
    const [name, setName] = useState("");
    const [id, setId] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [users, setUsers] = useState([]);
    const { status, busy, run } = useAction();

    // Calon owner: user biasa (admin sudah punya akses penuh)
    useEffect(() => {
        adminGetUsers()
            .then(result => setUsers(result.users.filter(user => user.role !== "admin")))
            .catch(() => setUsers([]));
    }, []);

    const handleSubmit = async event => {
        event.preventDefault();
        const result = await run(
            () => adminCreateAquarium({ name: name.trim(), id: id.trim() || undefined, ownerId: ownerId || undefined }),
            "Aquarium created.",
        );
        if (result) onCreated(result.id);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="text-xs font-semibold text-slate-600">New aquarium</div>
            <StatusMessages status={status} />
            <input
                required
                maxLength={80}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Aquarium name"
                className={inputClass}
                aria-label="Aquarium name"
            />
            <input
                value={id}
                onChange={event => setId(event.target.value)}
                placeholder="Aquarium ID (optional)"
                pattern="[A-Za-z0-9_\-]{1,64}"
                title="Letters, numbers, - and _ (up to 64 characters)"
                className={inputClass}
                aria-label="Aquarium ID"
            />
            <select
                value={ownerId}
                onChange={event => setOwnerId(event.target.value)}
                className={inputClass}
                aria-label="Owner"
            >
                <option value="">No owner yet (assign later)</option>
                {users.map(user => (
                    <option key={user.userId} value={user.userId}>
                        {user.fullName || user.email} · {user.email}
                    </option>
                ))}
            </select>
            <p className="text-xs text-slate-400">
                Use the same ID as AQUARIUM_ID in the device firmware if the ESP32 is already installed.
            </p>
            <div className="flex gap-2">
                <SmallButton type="submit" tone="primary" disabled={busy}>
                    Create
                </SmallButton>
                {onCancel && <SmallButton onClick={onCancel}>Cancel</SmallButton>}
            </div>
        </form>
    );
}
