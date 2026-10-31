import { useState } from "react";
import { EmptyState, INPUT_CLASS_NAME, PersonRow, SmallButton } from "./AccessUiParts";

// add person
export default function AddPersonPanel({ label, candidates, isBusy, onAddPerson }) {
    // panel state
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    // filter candidates
    const searchTerm = searchText.trim().toLowerCase();
    const matchingCandidates = candidates.filter(
        candidate =>
            !searchTerm ||
            (candidate.fullName || "").toLowerCase().includes(searchTerm) ||
            (candidate.email || "").toLowerCase().includes(searchTerm),
    );

    if (!isOpen) {
        return (
            <SmallButton tone="primary" onClick={() => setIsOpen(true)}>
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
                        setIsOpen(false);
                        setSearchText("");
                    }}
                >
                    Close
                </SmallButton>
            </div>
            <input
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                placeholder="Search by name or email"
                className={INPUT_CLASS_NAME}
                aria-label="Search users"
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl bg-white px-3">
                {matchingCandidates.length === 0 ? (
                    <EmptyState>
                        {candidates.length === 0 ? "Nobody is available to add." : "No users match your search."}
                    </EmptyState>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {matchingCandidates.map(candidate => (
                            <PersonRow key={candidate.userId} person={candidate}>
                                <SmallButton
                                    tone="primary"
                                    disabled={isBusy}
                                    onClick={() => onAddPerson(candidate.userId)}
                                >
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
