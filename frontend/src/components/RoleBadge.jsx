const STYLES = {
    admin: "bg-purple-100 text-purple-700",
    owner: "bg-blue-100 text-blue-700",
    member: "bg-sky-100 text-sky-700",
    viewer: "bg-slate-100 text-slate-600",
    user: "bg-slate-100 text-slate-600",
};

// Lencana peran (admin, owner, member, viewer) dengan warna yang sama di semua halaman
export default function RoleBadge({ role }) {
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STYLES[role] || STYLES.viewer}`}
        >
            {role}
        </span>
    );
}
