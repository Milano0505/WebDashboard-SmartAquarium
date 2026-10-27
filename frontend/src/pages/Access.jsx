import { useCallback, useEffect, useState } from "react";
import {
    adminCreateAquarium,
    adminCreateDevice,
    adminGetDevices,
    adminGetUsers,
    adminRevokeDevice,
    adminSetUserRole,
    getMembers,
    removeMember,
    saveMember,
} from "../api/service";
import { Trash } from "../components/Icons";
import { Card, ErrorAlert, PrimaryBtn, Spinner, SuccessAlert } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const ROLE_STYLES = {
    admin: "bg-purple-100 text-purple-700",
    owner: "bg-blue-100 text-blue-700",
    member: "bg-slate-100 text-slate-600",
    user: "bg-slate-100 text-slate-600",
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400";

function RoleBadge({ role }) {
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_STYLES[role] || ROLE_STYLES.member}`}
        >
            {role}
        </span>
    );
}

// Menjalankan aksi API dengan status error/sukses yang seragam
function useAction() {
    const [status, setStatus] = useState({ error: "", saved: "" });
    const [busy, setBusy] = useState(false);

    const run = async (action, successMessage) => {
        setStatus({ error: "", saved: "" });
        setBusy(true);
        try {
            const result = await action();
            setStatus({ error: "", saved: successMessage });
            return result ?? true;
        } catch (error) {
            setStatus({ error: error.message || "Request failed.", saved: "" });
            return false;
        } finally {
            setBusy(false);
        }
    };

    return { status, busy, run };
}

// ---------- Anggota akuarium (owner dan admin) ----------

function MembersSection({ aquariumId, isAdmin }) {
    const [members, setMembers] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const { status, busy, run } = useAction();

    const load = useCallback(
        () =>
            getMembers(aquariumId)
                .then(result => setMembers(result.members))
                .catch(error => setLoadError(error.message || "Could not load members.")),
        [aquariumId],
    );

    useEffect(() => {
        load();
    }, [load]);

    const handleAdd = async event => {
        event.preventDefault();
        if (await run(() => saveMember(aquariumId, { email, role }), "Member saved.")) {
            setEmail("");
            await load();
        }
    };

    const handleRemove = async member => {
        if (await run(() => removeMember(aquariumId, member.userId), "Member removed.")) await load();
    };

    return (
        <Card className="space-y-4">
            <div>
                <h2 className="text-base font-bold text-slate-800">Members of this aquarium</h2>
                <p className="text-xs text-slate-400">
                    Members can view data. Owners can also change settings and manage members.
                </p>
            </div>
            <ErrorAlert message={loadError || status.error} />
            <SuccessAlert message={status.saved} />

            {members === null && !loadError ? (
                <Spinner />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {(members || []).map(member => (
                        <li key={member.userId} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {member.fullName || member.userId}
                                </div>
                                <div className="truncate text-xs text-slate-400">{member.email}</div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                                <RoleBadge role={member.role} />
                                {(isAdmin || member.role !== "owner") && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(member)}
                                        disabled={busy}
                                        aria-label={`Remove ${member.email}`}
                                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                    >
                                        <Trash />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                    {members?.length === 0 && <li className="py-3 text-sm text-slate-400">No members yet.</li>}
                </ul>
            )}

            <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="User email"
                    className={inputClass}
                />
                <select
                    value={role}
                    onChange={event => setRole(event.target.value)}
                    className={`${inputClass} sm:w-36`}
                >
                    <option value="member">member</option>
                    {isAdmin && <option value="owner">owner</option>}
                </select>
                <PrimaryBtn type="submit" disabled={busy} className="sm:w-28">
                    Add
                </PrimaryBtn>
            </form>
        </Card>
    );
}

// ---------- Perangkat (admin) ----------

function DevicesSection({ aquariumId }) {
    const [devices, setDevices] = useState(null);
    const [name, setName] = useState("");
    const [newKey, setNewKey] = useState("");
    const { status, busy, run } = useAction();

    const load = useCallback(
        () =>
            adminGetDevices(aquariumId)
                .then(result => setDevices(result.devices))
                .catch(() => setDevices([])),
        [aquariumId],
    );

    useEffect(() => {
        setNewKey("");
        load();
    }, [load]);

    const handleCreate = async event => {
        event.preventDefault();
        const result = await run(() => adminCreateDevice(aquariumId, name), "Device registered.");
        if (result) {
            setNewKey(result.deviceKey);
            setName("");
            await load();
        }
    };

    const handleRevoke = async device => {
        if (await run(() => adminRevokeDevice(device.id), "Device revoked.")) await load();
    };

    return (
        <Card className="space-y-4">
            <div>
                <h2 className="text-base font-bold text-slate-800">Devices</h2>
                <p className="text-xs text-slate-400">
                    Each ESP32 gets its own key and can only send data to this aquarium.
                </p>
            </div>
            <ErrorAlert message={status.error} />
            <SuccessAlert message={status.saved} />
            {newKey && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="mb-1 font-semibold">Copy this key now. It will not be shown again.</div>
                    <code className="block break-all rounded bg-white px-2 py-1.5 text-xs">{newKey}</code>
                    <div className="mt-1 text-xs">Put it in device/include/secrets.h as DEVICE_KEY.</div>
                </div>
            )}

            {devices === null ? (
                <Spinner />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {devices.map(device => (
                        <li key={device.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">{device.name}</div>
                                <div className="truncate text-xs text-slate-400">{device.id}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRevoke(device)}
                                disabled={busy}
                                aria-label={`Revoke ${device.name}`}
                                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                                <Trash />
                            </button>
                        </li>
                    ))}
                    {devices.length === 0 && <li className="py-3 text-sm text-slate-400">No devices registered.</li>}
                </ul>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
                <input
                    required
                    maxLength={80}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Device name"
                    className={inputClass}
                />
                <PrimaryBtn type="submit" disabled={busy} className="sm:w-40">
                    Register device
                </PrimaryBtn>
            </form>
        </Card>
    );
}

// ---------- Akuarium baru (admin) ----------

function CreateAquariumSection() {
    const { refreshAquariums, selectAquarium } = useAuth();
    const [name, setName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const { status, busy, run } = useAction();

    const handleCreate = async event => {
        event.preventDefault();
        const result = await run(
            () => adminCreateAquarium({ name, ownerEmail: ownerEmail || undefined }),
            "Aquarium created.",
        );
        if (result) {
            setName("");
            setOwnerEmail("");
            await refreshAquariums();
            selectAquarium(result.id);
        }
    };

    return (
        <Card className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">Create aquarium</h2>
            <ErrorAlert message={status.error} />
            <SuccessAlert message={status.saved} />
            <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
                <input
                    required
                    maxLength={80}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Aquarium name"
                    className={inputClass}
                />
                <input
                    type="email"
                    value={ownerEmail}
                    onChange={event => setOwnerEmail(event.target.value)}
                    placeholder="Owner email (optional)"
                    className={inputClass}
                />
                <PrimaryBtn type="submit" disabled={busy} className="sm:w-28">
                    Create
                </PrimaryBtn>
            </form>
        </Card>
    );
}

// ---------- Semua user (admin) ----------

function UsersSection() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState(null);
    const [loadError, setLoadError] = useState("");
    const { status, busy, run } = useAction();

    const load = useCallback(
        () =>
            adminGetUsers()
                .then(result => setUsers(result.users))
                .catch(error => setLoadError(error.message || "Could not load users.")),
        [],
    );

    useEffect(() => {
        load();
    }, [load]);

    const toggleAdmin = async user => {
        const role = user.role === "admin" ? "user" : "admin";
        if (await run(() => adminSetUserRole(user.userId, role), `${user.email} is now ${role}.`)) await load();
    };

    return (
        <Card className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">All users</h2>
            <ErrorAlert message={loadError || status.error} />
            <SuccessAlert message={status.saved} />
            {users === null && !loadError ? (
                <Spinner />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {(users || []).map(user => (
                        <li key={user.userId} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                    {user.fullName || user.userId}
                                </div>
                                <div className="truncate text-xs text-slate-400">{user.email}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {user.aquariums.map(item => (
                                        <span
                                            key={item.aquariumId}
                                            className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500"
                                        >
                                            {item.name} · {item.role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                                <RoleBadge role={user.role} />
                                {user.userId !== currentUser?.id && (
                                    <button
                                        type="button"
                                        onClick={() => toggleAdmin(user)}
                                        disabled={busy}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 disabled:opacity-50"
                                    >
                                        {user.role === "admin" ? "Remove admin" : "Make admin"}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

// ---------- Halaman ----------

export default function AccessPage() {
    const { activeAquariumId, isAdmin, aquariums } = useAuth();
    const activeName = aquariums.find(item => item.id === activeAquariumId)?.name;

    return (
        <div className="space-y-4 px-4 py-5">
            <div>
                <h1 className="text-2xl font-bold leading-tight text-slate-800">Access</h1>
                <p className="mt-0.5 text-sm text-slate-400">
                    {activeName ? `Managing ${activeName}` : "No aquarium selected"}
                </p>
            </div>

            {activeAquariumId && (
                <MembersSection key={activeAquariumId} aquariumId={activeAquariumId} isAdmin={isAdmin} />
            )}
            {isAdmin && activeAquariumId && <DevicesSection aquariumId={activeAquariumId} />}
            {isAdmin && <CreateAquariumSection />}
            {isAdmin && <UsersSection />}
        </div>
    );
}
