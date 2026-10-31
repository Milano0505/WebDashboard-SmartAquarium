import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AquariumPeople from "./AquariumPeople";
import { EmptyState, INPUT_CLASS_NAME } from "./AccessUiParts";

// owner access
export default function OwnerAccess() {
    const { ownedAquariums } = useAuth();
    // state
    const [selectedAquariumId, setSelectedAquariumId] = useState(null);

    if (ownedAquariums.length === 0) return <EmptyState>You do not own an aquarium.</EmptyState>;
    const selected = ownedAquariums.find(item => item.id === selectedAquariumId) || ownedAquariums[0];

    return (
        <div className="space-y-4">
            {ownedAquariums.length > 1 ? (
                <select
                    value={selected.id}
                    onChange={event => setSelectedAquariumId(event.target.value)}
                    className={`${INPUT_CLASS_NAME} sm:max-w-xs`}
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
