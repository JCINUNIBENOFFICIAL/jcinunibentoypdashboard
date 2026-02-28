import supabase from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    const limit = 50;
    const { data: noms } = await supabase.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit);
    const { data: vts } = await supabase.from('votes').select('id, nomination_id, voter_email, created_at').order('created_at', { ascending: false }).limit(limit);
    const { data: cats } = await supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit);

    const events = [];
    (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
    (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: v.voter_email || 'anonymous', status: 'Voted' }));
    (cats || []).forEach(c => events.push({ time: c.created_at, activity: `Category Added: ${c.name}`, user: 'Admin', status: 'Created' }));

    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({ success: true, data: events.slice(0, limit) });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
}
