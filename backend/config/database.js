import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL must be set (Supabase: tombol Connect > Session pooler, contoh di backend/.env.example).",
    );
}

// parser numeric
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

// pool database
export const databasePool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 5,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    idleTimeoutMillis: 30_000,
});

databasePool.on("error", error => console.error("Database pool error:", error.message));

// query database
export const queryDatabase = (sqlText, params) => databasePool.query(sqlText, params);

// transaksi database
export async function runInTransaction(transactionWork) {
    const client = await databasePool.connect();
    try {
        await client.query("begin");
        const result = await transactionWork(client);
        await client.query("commit");
        return result;
    } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}
