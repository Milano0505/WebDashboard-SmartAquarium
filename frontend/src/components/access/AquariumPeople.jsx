import { useCallback, useEffect, useState } from "react";
import { getCandidates, getMembers, removeMember, saveMember } from "../../api/service";
import RoleBadge from "../RoleBadge";
import { Spinner } from "../ui";
import AddPersonPanel from "./AddPersonPanel";
import { EmptyState, PersonRow, Section, SmallButton, StatusMessages, useAction } from "./shared";

// Daftar orang pada satu akuarium. Admin mengelola owner dan member; owner hanya melihat dan mengelola member
// (owner lain tidak ditampilkan dan tidak ada tombol mengangkat owner)
export default function AquariumPeople({ aquariumId, isAdmin, onChanged }) {
    const [members, setMembers] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loadError, setLoadError] = useState("");
    const { status, busy, run } = useAction();

    const load = useCallback(async () => {
        try {
            const [memberResult, candidateResult] = await Promise.all([
                getMembers(aquariumId),
                getCandidates(aquariumId),
            ]);
            setMembers(memberResult.members);
            setCandidates(candidateResult.candidates);
            setLoadError("");
        } catch (error) {
            setLoadError(error.message || "Could not load people.");
        }
    }, [aquariumId]);

    useEffect(() => {
        setMembers(null);
        load();
    }, [load]);

    const handleAdd = async (userId, role) => {
        if (
            await run(
                () => saveMember(aquariumId, { userId, role }),
                role === "owner" ? "Owner added." : "Member added.",
            )
        ) {
            await load();
            onChanged?.();
        }
    };

    const handleRemove = async person => {
        const label = person.fullName || person.email;
        if (!window.confirm(`Remove ${label} from this aquarium?`)) return;
        if (await run(() => removeMember(aquariumId, person.userId), `${label} was removed.`)) {
            await load();
            onChanged?.();
        }
    };

    if (members === null && !loadError) return <Spinner />;

    const owners = (members || []).filter(person => person.role === "owner");
    const plainMembers = (members || []).filter(person => person.role === "member");

    const renderList = (list, emptyText) =>
        list.length === 0 ? (
            <EmptyState>{emptyText}</EmptyState>
        ) : (
            <ul className="divide-y divide-slate-100">
                {list.map(person => (
                    <PersonRow key={person.userId} person={person}>
                        <RoleBadge role={person.role} />
                        <SmallButton tone="danger" disabled={busy} onClick={() => handleRemove(person)}>
                            Remove
                        </SmallButton>
                    </PersonRow>
                ))}
            </ul>
        );

    return (
        <>
            <StatusMessages status={status} extraError={loadError} />

            {isAdmin && (
                <Section title="Owners" description="Owners control this aquarium and can add or remove its members.">
                    {renderList(owners, "No owner yet. Add an owner so someone can manage members.")}
                    <AddPersonPanel
                        label="Add owner"
                        candidates={candidates}
                        busy={busy}
                        onAdd={userId => handleAdd(userId, "owner")}
                    />
                </Section>
            )}

            <Section
                title="Members"
                description="Members can monitor and control this aquarium, but cannot manage people."
            >
                {renderList(plainMembers, "No members yet.")}
                <AddPersonPanel
                    label="Add member"
                    candidates={candidates}
                    busy={busy}
                    onAdd={userId => handleAdd(userId, "member")}
                />
            </Section>
        </>
    );
}
