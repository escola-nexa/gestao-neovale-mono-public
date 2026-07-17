import os
import glob

supabase_dir = "supabase/migrations"
typeorm_dir = "backend/src/database/migrations"

# Remove old TypeORM migrations to clean up
for f in glob.glob(os.path.join(typeorm_dir, "*.ts")):
    os.remove(f)

for f in glob.glob(os.path.join(typeorm_dir, "*.sql")):
    os.remove(f)

# Get all .sql files in alphabetical order
sql_files = sorted(glob.glob(os.path.join(supabase_dir, "*.sql")))
sql_files = [f for f in sql_files if "consolidated" not in f]

all_sql = []

all_sql.append("""
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE supabase_admin; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $func$ SELECT '00000000-0000-0000-0000-000000000000'::uuid; $func$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $func$ SELECT 'authenticated'::text; $func$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $func$ SELECT 'test@example.com'::text; $func$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS auth.users (
    id uuid NOT NULL PRIMARY KEY,
    instance_id uuid, aud varchar(255), role varchar(255), email varchar(255),
    encrypted_password varchar(255), email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone, confirmation_token varchar(255),
    confirmation_sent_at timestamp with time zone, recovery_token varchar(255),
    recovery_sent_at timestamp with time zone, email_change_token_new varchar(255),
    email_change varchar(255), email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone, raw_app_meta_data jsonb,
    raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamp with time zone,
    updated_at timestamp with time zone, phone varchar(15), phone_confirmed_at timestamp with time zone,
    phone_change varchar(15), phone_change_token varchar(255), phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone, email_change_token_current varchar(255),
    email_change_confirm_status smallint, banned_until timestamp with time zone,
    reauthentication_token varchar(255), reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean default false, deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL PRIMARY KEY, name text NOT NULL, owner uuid,
    created_at timestamp with time zone, updated_at timestamp with time zone,
    public boolean default false, avif_autodetection boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL PRIMARY KEY, bucket_id text, name text, owner uuid,
    created_at timestamp with time zone, updated_at timestamp with time zone,
    last_accessed_at timestamp with time zone, metadata jsonb, path_tokens text[]
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
""")

for f in sql_files:
    with open(f, "r") as sql_file:
        content = sql_file.read()
        all_sql.append(f"\n-- FILE: {os.path.basename(f)}\n")
        all_sql.append(content)

full_script = "".join(all_sql)

sql_out_path = os.path.join(typeorm_dir, "all_supabase_migrations.sql")
with open(sql_out_path, "w") as out:
    out.write(full_script)

ts_content = f"""import {{ MigrationInterface, QueryRunner }} from "typeorm";
import * as fs from "fs";
import * as path from "path";

export class SupabaseOriginalMigrations1700000000000 implements MigrationInterface {{
    public async up(queryRunner: QueryRunner): Promise<void> {{
        const sqlPath = path.join(__dirname, 'all_supabase_migrations.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        await queryRunner.query(sqlContent);
    }}

    public async down(queryRunner: QueryRunner): Promise<void> {{
        // Manual rollback needed
    }}
}}
"""

out_path = os.path.join(typeorm_dir, "1700000000000-SupabaseOriginalMigrations.ts")
with open(out_path, "w") as out:
    out.write(ts_content)

print(f"Created {out_path} and all_supabase_migrations.sql with {len(sql_files)} SQL files combined.")
