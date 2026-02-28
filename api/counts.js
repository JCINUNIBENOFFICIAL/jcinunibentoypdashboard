import supabase from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    const { count: nominations, error: nominationsError } = await supabase.from('nominations').select('id', { count: 'exact', head: true });
    const { count: votes, error: votesError } = await supabase.from('votes').select('id', { count: 'exact', head: true });
    const { count: categories, error: categoriesError } = await supabase.from('categories').select('id', { count: 'exact', head: true });

    if (nominationsError || votesError || categoriesError) return res.status(500).json({ success: false, error: 'Failed to fetch counts' });

    let verified = 0;
    let pending = nominations || 0;
    try {
      const { count: verifiedCount, error: verifiedErr } = await supabase.from('nominations').select('id', { count: 'exact', head: true }).eq('status', 'verified');
      if (!verifiedErr) verified = verifiedCount || 0;
      pending = (nominations || 0) - verified;
    } catch (e) {
      // ignore
    }

    return res.json({ success: true, data: { nominations, votes, categories, verified, pending } });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
}
