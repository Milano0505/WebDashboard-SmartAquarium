import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AquariumPeople from "./AquariumPeople";
import { EmptyState, inputClass } from "./shared";

// Tampilan owner: hanya member dari akuarium miliknya. Owner lain, perangkat, dan pengaturan admin tidak terlihat
export default function OwnerAccess() {
    const { ownedAquariums } = useAuth();
    const [selectedId, setSelectedId] = useState(null);

    if (ownedAquariums.length === 0) return <EmptyState>You do not own an aquarium.</EmptyState>;
    const selected = ownedAquariums.find(item => item.id === selectedId) || ownedAquariums[0];

    return (
        <div className="space-y-4">
            {ownedAquariums.length > 1 ? (
                <select
                    value={selected.id}
                    onChange={event => setSelectedId(event.target.value)}
                    className={`${inputClass} sm:max-w-xs`}
                    aria-label="Select aquarium"
                >
                    {ownedAquariums.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    Managing members of <span className="font-semibold text-slate-800">{selected.name}</span>
                </div>
            )}
            <AquariumPeople key={selected.id} aquariumId={selected.id} isAdmin={false} />
        </div>
    );
}
