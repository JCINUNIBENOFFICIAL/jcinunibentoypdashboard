/*
JCIN TOYP DATABASE

Comprise Nominees, Categories, Admins, and Content tables
 */
import postgres from 'postgres';
import credentials from './databaseCredentials.json' with { type: json };


const pword = credentials.password;
const connectionString = `postgresql://postgres.wyjgdrmizodsosgnduda:${pword}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`;
const sql = postgres(connectionString);

export default sql;


