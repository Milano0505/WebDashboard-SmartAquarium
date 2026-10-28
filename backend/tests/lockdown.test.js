// Membuktikan bahwa database hanya bisa diakses backend: role anon dan authenticated (dipakai Data API Supabase
// dengan kunci publik di browser) tidak boleh membaca, menulis, atau memanggil fungsi apa pun. Dijalankan pada
// PostgreSQL asli (PGlite) dengan meniru hak bawaan platform Supabase sebelum migrasi diterapkan.
// Jalankan: npm test
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const MIGRATIONS_DIR = new URL("../supabase/migrations/", import.meta.url);
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith(".sql"))
    .sort()
    .map(file => readFileSync(new URL(file, MIGRATIONS_DIR), "utf8"));

const PERMISSION_DENIED = "42501";

// Meniru project Supabase baru: role, schema auth, dan hak bawaan yang dibuka untuk anon dan authenticated
async function supabaseLikeDatabase(migrations) {
    const db = new PGlite();
    await db.exec(`
        create role anon nologin; create role authenticated nologin; create role supabase_auth_admin nologin;
        create schema auth;
        create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
        grant usage on schema auth to supabase_auth_admin;
        grant insert on auth.users to supabase_auth_admin;
        grant usage on schema public to anon, authenticated;
        alter default privileges in schema public grant all on tables to anon, authenticated;
        alter default privileges in schema public grant all on sequences to anon, authenticated;
        alter default privileges in schema public grant all on functions to anon, authenticated;
    `);
    for (const sql of migrations) await db.exec(sql);
    return db;
}

// Jalankan sql sebagai role tertentu. Hasil { ok, rows } atau { ok: false, code } saat ditolak
async function runAs(db, role, sql) {
    await db.exec(`set role ${role}`);
    try {
        return { ok: true, rows: (await db.query(sql)).rows };
    } catch (error) {
        return { ok: false, code: error.code };
    } finally {
        await db.exec("reset role");
    }
}

const db = await supabaseLikeDatabase(MIGRATIONS);
const tables = (await db.query("select tablename from pg_tables where schemaname = 'public' order by 1")).rows.map(
    row => row.tablename,
);

test("ada tabel di schema public yang diperiksa", () => {
    assert.ok(tables.length > 0);
});

for (const role of ["anon", "authenticated"]) {
    test(`${role}: semua tabel public menolak baca dan hapus`, async () => {
        for (const table of tables) {
            const read = await runAs(db, role, `select * from public.${table} limit 1`);
            const write = await runAs(db, role, `delete from public.${table}`);
            assert.deepEqual([read.ok, read.code], [false, PERMISSION_DENIED], `${role} membaca ${table}`);
            assert.deepEqual([write.ok, write.code], [false, PERMISSION_DENIED], `${role} menghapus ${table}`);
        }
    });

    test(`${role}: semua fungsi public tidak bisa dipanggil (RPC Data API)`, async () => {
        const functions = (
            await db.query(
                `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
            )
        ).rows;
        assert.ok(functions.length > 0);
        for (const { proname } of functions) {
            const result = await runAs(db, role, `select public.${proname}()`);
            assert.deepEqual([result.ok, result.code], [false, PERMISSION_DENIED], `${role} memanggil ${proname}`);
        }
    });

    test(`${role}: tabel dan fungsi yang ditambahkan nanti otomatis tertutup`, async () => {
        await db.exec("create table public.zz_future (id int primary key)");
        await db.exec("create function public.zz_future_fn() returns int language sql as 'select 1'");
        assert.equal((await runAs(db, role, "select * from public.zz_future")).ok, false);
        assert.equal((await runAs(db, role, "select public.zz_future_fn()")).ok, false);
        await db.exec("drop table public.zz_future; drop function public.zz_future_fn()");
    });
}

test("trigger pembuat profil tetap berjalan untuk Supabase Auth", async () => {
    const insert = await runAs(
        db,
        "supabase_auth_admin",
        `insert into auth.users (email, raw_user_meta_data) values ('Baru@Test.dev', '{"full_name":"Orang Baru"}')`,
    );
    assert.equal(insert.ok, true);
    const { rows } = await db.query("select full_name, email, role from public.profiles");
    assert.deepEqual(rows, [{ full_name: "Orang Baru", email: "baru@test.dev", role: "user" }]);
});

test("RLS tanpa policy tetap menahan walau ada GRANT yang keliru", async () => {
    await db.exec("grant all on public.profiles, public.devices to anon, authenticated");
    try {
        const read = await runAs(db, "anon", "select * from public.profiles");
        assert.deepEqual([read.ok, read.rows.length], [true, 0]);

        const insert = await runAs(
            db,
            "authenticated",
            "insert into public.devices (aquarium_id, name, key_hash) values ('x', 'x', 'x')",
        );
        assert.equal(insert.ok, false);

        const update = await runAs(db, "authenticated", "update public.profiles set role = 'admin' returning id");
        assert.deepEqual([update.ok, update.rows.length], [true, 0]);
        assert.equal((await db.query("select role from public.profiles")).rows[0].role, "user");
    } finally {
        await db.exec("revoke all on public.profiles, public.devices from anon, authenticated");
    }
});

test("kontrol: tanpa pencabutan hak bawaan, tabel baru memang bocor (uji ini bermakna)", async () => {
    const weakened = MIGRATIONS.map(sql => sql.replace(/alter default privileges[^;]*;/g, ""));
    const weak = await supabaseLikeDatabase(weakened);
    await weak.exec("create table public.zz_future (id int primary key)");
    assert.equal((await runAs(weak, "anon", "select * from public.zz_future")).ok, true);
});
