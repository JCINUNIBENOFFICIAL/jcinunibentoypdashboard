import supabase from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ success: false, error: 'invalid body' });
    const { data, error } = await supabase.from('nominations').insert([payload]);
    if (error) return res.status(500).json({ success: false, error });
    return res.json({ success: true, data });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('nominations').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ success: false, error });
    return res.json({ success: true, data });
  }

  res.setHeader('Allow', 'GET,POST');
  res.status(405).end();
}
