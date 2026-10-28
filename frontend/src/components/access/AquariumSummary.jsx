import { useState } from "react";
import { adminUpdateAquarium } from "../../api/service";
import { Toggle } from "../ui";
import { inputClass, Section, SmallButton, StatusMessages, useAction } from "./shared";

// Ringkasan akuarium untuk admin: ganti nama dan atur apakah viewer boleh melihat monitoringnya
export default function AquariumSummary({ aquarium, onChanged }) {
    const [name, setName] = useState(aquarium.name);
    const { status, busy, run } = useAction();

    const saveName = async event => {
        event.preventDefault();
        if (name.trim() === aquarium.name) return;
        if (await run(() => adminUpdateAquarium(aquarium.id, { name: name.trim() }), "Name saved.")) onChanged?.();
    };

    const togglePublic = async checked => {
        const message = checked ? "Viewers can now see this aquarium." : "Monitoring is now hidden from viewers.";
        if (await run(() => adminUpdateAquarium(aquarium.id, { monitoringPublic: checked }), message)) onChanged?.();
    };

    return (
        <Section title="Overview" description={`ID: ${aquarium.id}`}>
            <StatusMessages status={status} />
            <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row">
                <input
                    required
                    maxLength={80}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    className={inputClass}
                    aria-label="Aquarium name"
                />
                <SmallButton type="submit" tone="primary" disabled={busy || name.trim() === aquarium.name}>
                    Save name
                </SmallButton>
            </form>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">Public monitoring for viewers</div>
                    <div className="text-xs text-slate-400">
                        Users without a role can see this aquarium on the dashboard (read-only).
                    </div>
                </div>
                <Toggle
                    checked={Boolean(aquarium.monitoringPublic)}
                    onChange={togglePublic}
                    disabled={busy}
                    label="Public monitoring for viewers"
                />
            </div>
        </Section>
    );
}
