// Peran: admin bersifat global (profiles.role), owner dan member berlaku per akuarium (aquarium_members.role)
export const AQUARIUM_ROLES = ["owner", "member"];

const RANK = { member: 1, owner: 2, admin: 3 };

export const hasRole = (role, minimum) => (RANK[role] || 0) >= RANK[minimum];

// ID akuarium dipakai di URL dan firmware; batasi karakternya
export const isValidAquariumId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);

export const isUuid = value =>
    typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
