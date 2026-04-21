/**
 * Gera magic link para login automático no /admin
 * Usa service_role do cliente (passado via header ou cai no .env)
 */
const { createClient } = require('@supabase/supabase-js');

async function adminMagicLink(req, res) {
  try {
    const supabaseUrl  = req.headers['x-supabase-url']  || process.env.SUPABASE_URL;
    const serviceKey   = req.headers['x-service-key']   || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteOrigin   = req.headers['x-site-origin']   || '';
    const adminEmail   = req.body?.email || 'admin@entulhohoje.com';

    if (!supabaseUrl || !serviceKey) {
      return res.status(400).json({ error: 'Credenciais Supabase não configuradas' });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const redirectTo = siteOrigin
      ? `${siteOrigin.replace(/\/$/, '')}/admin/dashboard`
      : `${req.headers.origin || ''}/admin/dashboard`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
      options: { redirectTo },
    });

    if (error) return res.status(400).json({ error: error.message });

    const props = data.properties ?? data;
    return res.json({
      url: props.action_link,
      token_hash: props.hashed_token ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { adminMagicLink };
