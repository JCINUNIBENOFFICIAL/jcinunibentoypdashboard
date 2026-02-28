import supabase from '../_supabase.js';

export default async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  if (req.method === 'PATCH') {
    const updates = req.body || {};
    const { data, error } = await supabase.from('nominations').update(updates).eq('id', id).select();
    if (error) return res.status(500).json({ success: false, error });
    return res.json({ success: true, data });
  }

  res.setHeader('Allow', 'PATCH');
  res.status(405).end();
}
