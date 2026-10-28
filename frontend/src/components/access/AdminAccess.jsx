import { useCallback, useEffect, useState } from "react";
import { adminGetAquariums } from "../../api/service";
import { useAuth } from "../../context/AuthContext";
import { ErrorAlert, Spinner } from "../ui";
import AquariumPeople from "./AquariumPeople";
import AquariumSummary from "./AquariumSummary";
import DevicesSection from "./DevicesSection";
import NewAquariumForm from "./NewAquariumForm";
import { EmptyState, SmallButton } from "./shared";
import UsersTab from "./UsersTab";

const TABS = [
    { id: "aquariums", label: "Aquariums" },
    { id: "users", label: "Users" },
];

// Daftar akuarium di sisi kiri; tiap baris menampilkan owner dan jumlah anggota serta perangkat
function AquariumList({ aquariums, selectedId, onSelect }) {
    return (
        <ul className="space-y-2">
            {aquariums.map(item => {
                const selected = item.id === selectedId;
                return (
                    <li key={item.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(item.id)}
                            aria-current={selected}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                selected
                                    ? "border-blue-400 bg-blue-50"
                                    : "border-slate-200 bg-white hover:border-blue-200"
                            }`}
                        >
                            <div className="truncate text-sm font-semibold text-slate-800">{item.name}</div>
                            <div className="truncate font-mono text-[11px] text-slate-400">{item.id}</div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                                {item.owners.length > 0
                                    ? `Owner: ${item.owners.map(owner => owner.fullName || owner.email).join(", ")}`
                                    : "No owner yet"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                                {item.memberCount} {item.memberCount === 1 ? "person" : "people"} · {item.deviceCount}{" "}
                                {item.deviceCount === 1 ? "device" : "devices"}
                            </div>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

// Tampilan admin: master-detail akuarium (owner, member, perangkat) dan tab semua user
export default function AdminAccess() {
    const { refreshAquariums } = useAuth();
    const [tab, setTab] = useState("aquariums");
    const [aquariums, setAquariums] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [loadError, setLoadError] = useState("");

    const load = useCallback(
        () =>
            adminGetAquariums()
                .then(result => {
                    setAquariums(result.aquariums);
                    setLoadError("");
                    // Pertahankan pilihan jika masih ada, jika tidak pilih yang pertama
                    setSelectedId(current =>
                        result.aquariums.some(item => item.id === current)
                            ? current
                            : (result.aquariums[0]?.id ?? null),
                    );
                })
                .catch(error => setLoadError(error.message || "Could not load aquariums.")),
        [],
    );

    useEffect(() => {
        load();
    }, [load]);

    // Perubahan juga disegarkan ke daftar global agar pemilih akuarium di header ikut berubah
    const handleChanged = useCallback(() => {
        load();
        refreshAquariums().catch(() => {});
    }, [load, refreshAquariums]);

    const handleCreated = async newId => {
        setCreating(false);
        await load();
        setSelectedId(newId);
        refreshAquariums().catch(() => {});
    };

    const selected = aquariums?.find(item => item.id === selectedId) ?? null;
    const noAquariums = aquariums !== null && aquariums.length === 0;

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {TABS.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                            tab === item.id
                                ? "bg-blue-500 text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-600"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "users" && <UsersTab />}

            {tab === "aquariums" && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-bold text-slate-800">Aquariums</h2>
                            {!creating && !noAquariums && (
                                <SmallButton tone="primary" onClick={() => setCreating(true)}>
                                    + New aquarium
                                </SmallButton>
                            )}
                        </div>

                        {(creating || noAquariums) && (
                            <NewAquariumForm
                                onCreated={handleCreated}
                                onCancel={noAquariums ? undefined : () => setCreating(false)}
                            />
                        )}

                        <ErrorAlert message={loadError} />
                        {aquariums === null && !loadError ? (
                            <Spinner />
                        ) : noAquariums ? (
                            <EmptyState>No aquariums yet. Create the first one.</EmptyState>
                        ) : (
                            aquariums && (
                                <AquariumList aquariums={aquariums} selectedId={selectedId} onSelect={setSelectedId} />
                            )
                        )}
                    </div>

                    <div className="min-w-0 space-y-4">
                        {selected ? (
                            <>
                                <AquariumSummary key={selected.id} aquarium={selected} onChanged={handleChanged} />
                                <AquariumPeople
                                    key={`people-${selected.id}`}
                                    aquariumId={selected.id}
                                    isAdmin
                                    onChanged={handleChanged}
                                />
                                <DevicesSection
                                    key={`devices-${selected.id}`}
                                    aquariumId={selected.id}
                                    onChanged={handleChanged}
                                />
                            </>
                        ) : (
                            aquariums !== null &&
                            !noAquariums && <EmptyState>Select an aquarium to manage it.</EmptyState>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
