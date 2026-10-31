// notifikasi akuarium
export async function addAquariumNotification(
    client,
    { aquariumId, actorId = null, actorName, title, message, type = "info", dedupeKey = null },
) {
    await client.query(
        `insert into notifications (scope, aquarium_id, actor_id, actor_name, title, message, type, dedupe_key)
         values ('aquarium', $1, $2, $3, $4, $5, $6, $7)
         on conflict (aquarium_id, dedupe_key) where dedupe_key is not null do nothing`,
        [aquariumId, actorId, actorName, title, message, type, dedupeKey],
    );
}

// notifikasi user
export async function addUserNotification(client, userId, title, message) {
    await client.query(
        `insert into notifications (scope, recipient_id, actor_id, title, message, type)
         values ('user', $1, $1, $2, $3, 'info')`,
        [userId, title, message],
    );
}

// notifikasi terlihat
export const VISIBLE_NOTIFICATION_CONDITION = `
    ((n.scope = 'aquarium' and n.aquarium_id = $1) or (n.scope = 'user' and n.recipient_id = $2))
    and s.dismissed_at is null`;
