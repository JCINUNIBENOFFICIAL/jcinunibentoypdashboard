-- schema for JCIN UNIBEN TOYP project
-- run this via the Supabase SQL editor or CLI

-- nominations table stores each form submission
create table if not exists nominations (
  id serial primary key,
  nominee_name text not null,
  nominee_email text not null,
  nominator_email text not null,
  gender text,
  whatsapp_contact text,
  other_contact text,
  faculty text,
  department text,
  level int,
  category text,
  social_media_handle text,
  reason text,
  created_at timestamp with time zone default now()
);

-- votes table tracks individual votes (simple example)
create table if not exists votes (
  id serial primary key,
  nomination_id int references nominations(id) on delete cascade,
  voter_email text,
  created_at timestamp with time zone default now()
);

-- categories that may be used for filtering or display
create table if not exists categories (
  id serial primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default now()
);

-- announcements you can push to the dashboard
create table if not exists announcements (
  id serial primary key,
  title text not null,
  body text not null,
  posted_at timestamp with time zone default now()
);

-- optional admins table for dashboard authentication/roles
create table if not exists admins (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

-- you can extend this file later with finalists, results, etc.
