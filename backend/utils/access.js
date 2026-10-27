// Peran: admin bersifat global (users/{uid}.role), owner dan member berlaku per akuarium (aquariums/{id}.members)
export const AQUARIUM_ROLES = ["owner", "member"];

const RANK = { member: 1, owner: 2, admin: 3 };

export const hasRole = (role, minimum) => (RANK[role] || 0) >= RANK[minimum];

// Peran user pada satu akuarium: admin selalu admin, lainnya dari peta `members`; null jika bukan anggota
export function roleInAquarium(auth, aquariumData) {
    if (auth.role === "admin") return "admin";
    return aquariumData.members?.[auth.userId] ?? null;
}

// ID akuarium dipakai sebagai ID dokumen; tolak yang berisi "/" atau terlalu panjang
export const isValidAquariumId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
