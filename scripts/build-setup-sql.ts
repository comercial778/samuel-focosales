/**
 * Gera supabase/setup-completo.sql: um único script para colar no SQL Editor de um
 * projeto Supabase NOVO. Ele cria o schema (migrations), recria os usuários do dump
 * em auth.users com os MESMOS ids (senhas aleatórias — use "Esqueci minha senha"
 * ou defina depois) e importa todos os dados, sem precisar da secret key.
 *
 * Uso: npx tsx scripts/build-setup-sql.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseInserts, rowsFor } from './sql-values-parser'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const dumpPath = path.join(root, 'supabase', 'seed-data', 'focosales-dados.sql')
const outPath = path.join(root, 'supabase', 'setup-completo.sql')

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => `-- ===== ${f} =====\n${readFileSync(path.join(migrationsDir, f), 'utf-8')}`)

const dump = readFileSync(dumpPath, 'utf-8')
const profiles = rowsFor(parseInserts(dump), 'profiles')

const users = profiles.map((p) => {
  const id = lit(String(p.id))
  const email = lit(String(p.email))
  const name = p.display_name == null ? 'null' : lit(String(p.display_name))
  const createdAt = p.created_at == null ? 'now()' : `${lit(String(p.created_at))}::timestamptz`
  return `select public._focosales_create_user(${id}::uuid, ${email}, gen_random_uuid()::text, ${name}, ${createdAt});`
})

const ON_CONFLICT: Record<string, string> = {
  profiles:
    'on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, created_at = excluded.created_at',
  user_roles: 'on conflict (user_id, role) do nothing',
  user_settings:
    'on conflict (user_id) do update set base_salary = excluded.base_salary, share_enabled = excluded.share_enabled, updated_at = excluded.updated_at',
}

const data = dump
  .split('\n')
  .filter((line) => !/^\s*(BEGIN|COMMIT);\s*$/i.test(line))
  .map((line) => {
    const m = /^INSERT INTO public\.(\w+) /.exec(line)
    const clause = m ? ON_CONFLICT[m[1]] : undefined
    return clause ? line.replace(/;\s*$/, ` ${clause};`) : line
  })
  .join('\n')

const createUserFn = `
-- Cria (ou atualiza a senha de) um usuário de login já confirmado.
create or replace function public._focosales_create_user(
  _id uuid, _email text, _password text, _display_name text, _created_at timestamptz default now()
) returns uuid
language plpgsql
security definer set search_path = public, auth, extensions
as $$
declare
  _uid uuid;
begin
  select id into _uid from auth.users where lower(email) = lower(_email);
  if _uid is not null then
    update auth.users
      set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = _uid;
    return _uid;
  end if;

  _uid := coalesce(_id, gen_random_uuid());

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated', _email,
    extensions.crypt(_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', coalesce(_display_name, split_part(_email, '@', 1))),
    _created_at, now(), '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    _uid::text, _uid,
    jsonb_build_object('sub', _uid::text, 'email', _email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return _uid;
end;
$$;
revoke all on function public._focosales_create_user(uuid, text, text, text, timestamptz) from public, anon, authenticated;
`

const out = [
  '-- FocoSales CRM — setup completo para um projeto Supabase novo.',
  '-- Gerado por scripts/build-setup-sql.ts. Cole tudo no SQL Editor e clique em Run.',
  'begin;',
  ...migrations,
  createUserFn,
  '-- ===== usuários importados (mesmos ids; senhas aleatórias) =====',
  ...users,
  '',
  '-- ===== dados importados =====',
  data,
  'commit;',
  '',
].join('\n')

writeFileSync(outPath, out)
console.log(`Gerado ${path.relative(root, outPath)} (${profiles.length} usuários).`)
