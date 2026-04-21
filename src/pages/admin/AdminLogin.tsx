import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error('Credenciais inválidas.');
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Lock className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
        </div>
        <h1 className="text-center font-display text-xl font-bold tracking-tight text-foreground">
          Painel Administrativo
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Entre com o seu e-mail e senha de administrador.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Input
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="h-11 w-full font-semibold"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
