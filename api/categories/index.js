import supabase from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(500).json({ success: false, error });
    return res.json({ success: true, data });
  }

  if (req.method === 'POST') {
    const payload = req.body;
    if (!payload || !payload.name) return res.status(400).json({ success: false, error: 'name required' });
    const { data, error } = await supabase.from('categories').insert([payload]).select();
    if (error) return res.status(500).json({ success: false, error });
    return res.json({ success: true, data });
  }

  res.setHeader('Allow', 'GET,POST');
  res.status(405).end();
}
