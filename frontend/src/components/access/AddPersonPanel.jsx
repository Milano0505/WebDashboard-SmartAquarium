import { useState } from "react";
import { EmptyState, inputClass, PersonRow, SmallButton } from "./shared";

// Panel tambah orang: tombol membuka daftar kandidat dengan pencarian (nama atau email) dan tombol Add per baris
export default function AddPersonPanel({ label, candidates, busy, onAdd }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const term = search.trim().toLowerCase();
    const matches = candidates.filter(
        candidate =>
            !term ||
            (candidate.fullName || "").toLowerCase().includes(term) ||
            (candidate.email || "").toLowerCase().includes(term),
    );

    if (!open) {
        return (
            <SmallButton tone="primary" onClick={() => setOpen(true)}>
                + {label}
            </SmallButton>
        );
    }

    return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <SmallButton
                    onClick={() => {
                        setOpen(false);
                        setSearch("");
                    }}
                >
                    Close
                </SmallButton>
            </div>
            <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className={inputClass}
                aria-label="Search users"
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl bg-white px-3">
                {matches.length === 0 ? (
                    <EmptyState>
                        {candidates.length === 0 ? "Nobody is available to add." : "No users match your search."}
                    </EmptyState>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {matches.map(candidate => (
                            <PersonRow key={candidate.userId} person={candidate}>
                                <SmallButton tone="primary" disabled={busy} onClick={() => onAdd(candidate.userId)}>
                                    Add
                                </SmallButton>
                            </PersonRow>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
