/*
JCIN TOYP DATABASE

Comprise Nominees, Categories, Admins, and Content tables
*/
import postgres from 'postgres';

// Prefer DATABASE_URL (full connection string) in production.
// Fallback: build connection string from individual env vars.
const connectionString = (() => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD;
  const host = process.env.DATABASE_HOST || 'aws-1-eu-west-1.pooler.supabase.com';
  const port = process.env.DATABASE_PORT || '6543';
  const db = process.env.DATABASE_NAME || 'postgres';

  if (!password) {
    throw new Error('DATABASE_PASSWORD is not set. Provide DATABASE_URL or DATABASE_* env vars.');
  }

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
})();

const sql = postgres(connectionString);

export default sql;


