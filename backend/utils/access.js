// Peran: admin bersifat global (profiles.role), owner dan member berlaku per akuarium (aquarium_members.role).
// viewer = user yang belum punya peran apa pun; hanya melihat monitoring akuarium yang publik (aquariums.monitoring_public)
//   viewer : melihat dashboard (status, telemetry, notifikasi), tanpa mengubah apa pun
//   member : viewer + mengubah config, memberi pakan, riwayat/ekspor, status notifikasi
//   owner  : member + menambah dan menghapus member akuariumnya
//   admin  : semuanya, termasuk membuat akuarium, menentukan owner, dan mengelola perangkat
export const ASSIGNABLE_ROLES = ["owner", "member"];

const RANK = { viewer: 1, member: 2, owner: 3, admin: 4 };

export const hasRole = (role, minimum) => (RANK[role] || 0) >= RANK[minimum];

// ID akuarium dipakai di URL dan firmware; batasi karakternya
export const isValidAquariumId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);

export const isUuid = value =>
    typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Peran tertinggi seorang user dari daftar keanggotaannya, untuk ditampilkan: admin > owner > member > viewer
export function accessRoleOf(globalRole, membershipRoles) {
    if (globalRole === "admin") return "admin";
    if (membershipRoles.includes("owner")) return "owner";
    if (membershipRoles.includes("member")) return "member";
    return "viewer";
}
