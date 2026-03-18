import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseClientConfigured } from '@/integrations/supabase/client';
import { mapSupabaseAuthError } from '@/lib/auth-errors';
import logoIcon from '@/assets/logo-icon.png';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseClientConfigured();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      toast.error('Supabase não configurado no site (URL/chave). Ajuste .env ou env.js e faça deploy de novo.');
      return;
    }
    setLoading(true);

    try {
      const trimmed = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão não gravou. Limpe o cache do site, atualize a página e tente de novo.');
        return;
      }
      toast.success('Login realizado com sucesso!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(mapSupabaseAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <img src={logoIcon} alt="Logo" className="h-14 w-14 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">Acesse sua conta para gerenciar o site</p>
        </div>

        {!configured && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">
            O site não está com URL/chave do Supabase. Sem isso o login admin não funciona.
          </p>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
