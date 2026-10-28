import { useCallback, useEffect, useState } from "react";
import { adminGetUsers, adminSetUserRole } from "../../api/service";
import { useAuth } from "../../context/AuthContext";
import RoleBadge from "../RoleBadge";
import { Spinner } from "../ui";
import { EmptyState, inputClass, PersonRow, Section, SmallButton, StatusMessages, useAction } from "./shared";

// Semua user (admin): peran akses, akuarium mereka, dan tombol jadikan admin. Peran owner/member diatur
// per akuarium di tab Aquariums
export default function UsersTab() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const { status, busy, run } = useAction();

    const load = useCallback(
        () =>
            adminGetUsers()
                .then(result => {
                    setUsers(result.users);
                    setLoadError("");
                })
                .catch(error => setLoadError(error.message || "Could not load users.")),
        [],
    );

    useEffect(() => {
        load();
    }, [load]);

    const toggleAdmin = async user => {
        const role = user.role === "admin" ? "user" : "admin";
        const label = user.fullName || user.email;
        if (role === "admin" && !window.confirm(`Make ${label} an admin? Admins can manage everything.`)) return;
        if (
            await run(
                () => adminSetUserRole(user.userId, role),
                `${label} is now ${role === "admin" ? "an admin" : "a regular user"}.`,
            )
        ) {
            await load();
        }
    };

    const term = search.trim().toLowerCase();
    const shown = (users || []).filter(
        user =>
            !term ||
            (user.fullName || "").toLowerCase().includes(term) ||
            (user.email || "").toLowerCase().includes(term),
    );

    return (
        <Section title="All users" description="Users without any role can only watch public monitoring (viewer).">
            <StatusMessages status={status} extraError={loadError} />
            <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className={inputClass}
                aria-label="Search users"
            />
            {users === null && !loadError ? (
                <Spinner />
            ) : shown.length === 0 ? (
                <EmptyState>No users found.</EmptyState>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {shown.map(user => (
                        <PersonRow key={user.userId} person={user}>
                            <div className="hidden max-w-[220px] flex-wrap justify-end gap-1 md:flex">
                                {user.aquariums.map(item => (
                                    <span
                                        key={item.aquariumId}
                                        className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500"
                                    >
                                        {item.name} · {item.role}
                                    </span>
                                ))}
                            </div>
                            <RoleBadge role={user.accessRole || (user.role === "admin" ? "admin" : "viewer")} />
                            {user.userId !== currentUser?.id && (
                                <SmallButton disabled={busy} onClick={() => toggleAdmin(user)}>
                                    {user.role === "admin" ? "Remove admin" : "Make admin"}
                                </SmallButton>
                            )}
                        </PersonRow>
                    ))}
                </ul>
            )}
        </Section>
    );
}
