import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set (Supabase: tombol Connect > Session pooler, contoh di backend/.env.example).");
}

// numeric (suhu) dibaca sebagai angka; bigint (id riwayat) dibiarkan string agar tidak kehilangan presisi
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

// Supabase mewajibkan SSL. Database lokal tanpa SSL: DATABASE_SSL=false
export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 5,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    idleTimeoutMillis: 30_000,
});

pool.on("error", error => console.error("Database pool error:", error.message));

export const query = (text, params) => pool.query(text, params);

// Jalankan work(client) dalam satu transaksi: commit jika berhasil, rollback jika melempar error.
// Di dalam work hanya pakai `client`, bukan query()/pool, agar tidak butuh koneksi kedua
export async function transaction(work) {
    const client = await pool.connect();
    try {
        await client.query("begin");
        const result = await work(client);
        await client.query("commit");
        return result;
    } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}
