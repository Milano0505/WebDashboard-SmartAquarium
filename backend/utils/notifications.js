// Notifikasi disimpan di tabel notifications; status baca dan hapus per user di notification_states.
// Semua fungsi menerima `client` (koneksi transaksi atau { query }) agar ikut transaksi pemanggil

// Notifikasi bersama: terlihat semua anggota akuarium. dedupeKey (opsional) mencegah ganda untuk laporan yang
// dikirim ulang oleh perangkat
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

// Notifikasi privat: hanya untuk satu user (perubahan profil atau password), tampil di semua akuarium miliknya
export async function addUserNotification(client, userId, title, message) {
    await client.query(
        `insert into notifications (scope, recipient_id, actor_id, title, message, type)
         values ('user', $1, $1, $2, $3, 'info')`,
        [userId, title, message],
    );
}

// Syarat sebuah notifikasi terlihat oleh user pada akuarium tertentu: $1 = akuarium, $2 = user
export const VISIBLE_NOTIFICATION = `
    ((n.scope = 'aquarium' and n.aquarium_id = $1) or (n.scope = 'user' and n.recipient_id = $2))
    and s.dismissed_at is null`;
