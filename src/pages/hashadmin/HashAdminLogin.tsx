/**
 * Fundo: foto realista de ave de rapina (Unsplash). Pode trocar a URL em HAWK_BG_URL.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  HASHADMIN_BASE_PATH,
  isHashAdminConfigured,
  isHashAdminUnlocked,
  unlockHashAdmin,
} from '@/lib/hashadmin-config';

/** Gavião / falcão — imagem fotográfica (troque se quiser outra). */
const HAWK_BG_URL =
  'https://images.unsplash.com/photo-1549608276-5786777e65cd?w=1920&q=88&auto=format&fit=crop';

function LoginBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-zinc-900 px-4 py-12 text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.22]"
        style={{ backgroundImage: `url(${HAWK_BG_URL})` }}
        aria-hidden
      />
      {/* Leve véu para uniformizar e manter legibilidade */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-50/92 via-zinc-100/80 to-zinc-100/95"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">{children}</div>
    </div>
  );
}

export default function HashAdminLogin() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHashAdminConfigured() && isHashAdminUnlocked()) {
      navigate(HASHADMIN_BASE_PATH, { replace: true });
    }
  }, [navigate]);

  if (!isHashAdminConfigured()) {
    return (
      <LoginBackdrop>
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-white/95 p-8 text-center shadow-sm backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-zinc-600">
            Acesso não configurado. Defina{' '}
            <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
              VITE_HASHADMIN_SECRET
            </code>{' '}
            no <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">.env</code> da
            raiz e reinicie{' '}
            <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">npm run dev</code>.
          </p>
        </div>
      </LoginBackdrop>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (unlockHashAdmin(secret)) {
        toast.success('Acesso concedido.');
        navigate(HASHADMIN_BASE_PATH, { replace: true });
      } else {
        toast.error('Chave incorreta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginBackdrop>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-white/95 p-8 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
            <Lock className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
        </div>
        <h1 className="text-center font-display text-xl font-bold tracking-tight text-zinc-900">Área restrita</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">Introduza a senha que configurou no servidor (.env).</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Input
            type="password"
            autoComplete="off"
            placeholder="Senha"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="h-11 border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900/20"
          />
          <Button
            type="submit"
            className="h-11 w-full bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
            disabled={loading || !secret.trim()}
          >
            {loading ? 'A verificar…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </LoginBackdrop>
  );
}
