const { getSupabaseAdmin } = require('../lib/supabase');

async function createAdmin(req, res) {
  try {
    const supabase = getSupabaseAdmin();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Verificar se já existe algum usuário
    const { data: users } = await supabase.auth.admin.listUsers();
    if (users && users.users && users.users.length > 0) {
      return res.status(409).json({ error: 'Admin user already exists' });
    }

    // Criar usuário admin
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: 'Admin user created', user_id: data.user.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createAdmin };
