import supabase from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const { nomination_id, voter_email } = req.body || {};
  if (!nomination_id || !voter_email) return res.status(400).json({ success: false, error: 'nomination_id and voter_email required' });

  const { data, error } = await supabase.from('votes').insert([{ nomination_id, voter_email }]);
  if (error) return res.status(500).json({ success: false, error });
  return res.json({ success: true, data });
}
