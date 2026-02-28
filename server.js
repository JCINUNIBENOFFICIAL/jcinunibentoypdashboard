/**
 * JCIN TOYP 2026 Supabase API Server Setup
 *
 * Initializes a Supabase BaaS server to handle nominations, votes, updates, results and announcements on the TOYP page
 * Also runs an Express server exposing minimal endpoints.
 */
import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // load .env into process.env
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// create supabase client using environment variables
// use service role key for server-side operations (writing to database)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- simple Express app to expose APIs ---
const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow tools like curl/postman with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicitly handle preflight requests.
app.use(express.json());

// Serve static admin UI from the `static` folder (same origin)

// serve frontend
app.use(express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
});

// health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// nomination endpoint – the frontend will POST the nomination payload here
app.post('/api/nominations', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'invalid body' });
  }

  try {
    const { data, error } = await supabaseServer.from('nominations').insert([payload]);
    if (error) {
      console.error('supabase insert error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// vote endpoint – frontend submits a vote for a nomination
app.post('/api/votes', async (req, res) => {
  const { nomination_id, voter_email } = req.body || {};
  if (!nomination_id || !voter_email) {
    return res.status(400).json({ success: false, error: 'nomination_id and voter_email required' });
  }

  try {
    const { data, error } = await supabaseServer.from('votes').insert([{ nomination_id, voter_email }]);
    if (error) {
      console.error('supabase vote insert error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// nominations list endpoint
app.get('/api/nominations', async (_req, res) => {
  try {
    const { data, error } = await supabaseServer.from('nominations').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) {
      console.error('supabase nominations select error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// counts endpoint for overview statistics
app.get('/api/counts', async (_req, res) => {
  try {
    // total counts
    const { count: nominations, error: nominationsError } = await supabaseServer
      .from('nominations')
      .select('id', { count: 'exact', head: true });
    const { count: votes, error: votesError } = await supabaseServer
      .from('votes')
      .select('id', { count: 'exact', head: true });
    const { count: categories, error: categoriesError } = await supabaseServer
      .from('categories')
      .select('id', { count: 'exact', head: true });

    if (nominationsError || votesError || categoriesError) {
      console.error('counts query error', nominationsError || votesError || categoriesError);
      return res.status(500).json({ success: false, error: 'Failed to fetch counts' });
    }

    // try to compute verified/pending if 'status' column exists; otherwise return sensible defaults
    let verified = 0;
    let pending = nominations || 0;
    try {
      const { count: verifiedCount, error: verifiedErr } = await supabaseServer
        .from('nominations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'verified');
      if (!verifiedErr) verified = verifiedCount || 0;
      pending = (nominations || 0) - verified;
    } catch (e) {
      // if the 'status' column doesn't exist, leave verified=0 and pending=total
      console.warn('Could not compute verified/pending (maybe status column missing)', e.message || e);
    }

    return res.json({ success: true, data: { nominations, votes, categories, verified, pending } });
  } catch (err) {
    console.error('counts error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});


// Logs endpoint: combine recent nominations, votes and category events into a unified activity feed
app.get('/api/logs', async (_req, res) => {
  try {
    const limit = 50;
    const { data: noms } = await supabaseServer.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit);
    const { data: vts } = await supabaseServer.from('votes').select('id, nomination_id, voter_email, created_at').order('created_at', { ascending: false }).limit(limit);
    const { data: cats } = await supabaseServer.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit);

    const events = [];
    (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
    (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: v.voter_email || 'anonymous', status: 'Voted' }));
    (cats || []).forEach(c => events.push({ time: c.created_at, activity: `Category Added: ${c.name}`, user: 'Admin', status: 'Created' }));

    // sort by time desc and slice
    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({ success: true, data: events.slice(0, limit) });
  } catch (err) {
    console.error('logs error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});


// Update nomination (e.g., set status) - requires server-side auth
app.patch('/api/nominations/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  try {
    const { data, error } = await supabaseServer.from('nominations').update(updates).eq('id', id).select();
    if (error) {
      console.error('update nomination error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected update error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// categories endpoint – return list of categories
app.get('/api/categories', async (_req, res) => {
  try {
    const { data, error } = await supabaseServer.from('categories').select('*');
    if (error) {
      console.error('supabase categories select error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// create a new category
app.post('/api/categories', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name) return res.status(400).json({ success: false, error: 'name required' });
  try {
    const { data, error } = await supabaseServer.from('categories').insert([payload]).select();
    if (error) {
      console.error('supabase categories insert error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// update category
app.patch('/api/categories/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body || {};
  try {
    const { data, error } = await supabaseServer.from('categories').update(updates).eq('id', id).select();
    if (error) {
      console.error('supabase categories update error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// delete category
app.delete('/api/categories/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { data, error } = await supabaseServer.from('categories').delete().eq('id', id).select();
    if (error) {
      console.error('supabase categories delete error', error);
      return res.status(500).json({ success: false, error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('unexpected error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// additional routes (votes, categories, etc.) can be wired in the handlers folder later

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server listening on port ${PORT}`);
  console.log(`📝 API ready at http://localhost:${PORT}/api/nominations`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
});
