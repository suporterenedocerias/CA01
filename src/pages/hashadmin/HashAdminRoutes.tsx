import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  HASHADMIN_BASE_PATH,
  HASHADMIN_LOGIN_PATH,
  isHashAdminConfigured,
  isHashAdminUnlocked,
} from '@/lib/hashadmin-config';
import { HashAdminClientFilterProvider } from '@/contexts/HashAdminClientContext';

/** Redireciona `/hashadmin` (antigo) para `HASHADMIN_BASE_PATH`. */
export function HashAdminLegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const tail = pathname.replace(/^\/hashadmin(?=\/|$)/i, '') || '/';
  const to =
    HASHADMIN_BASE_PATH + (tail === '/' ? '' : tail) + search + hash;
  return <Navigate to={to} replace />;
}

/**
 * Protege todas as rotas do painel mestre exceto a página de entrada.
 */
export function HashAdminProtectedOutlet() {
  const location = useLocation();

  if (!isHashAdminConfigured()) {
    return <Navigate to={HASHADMIN_LOGIN_PATH} replace state={{ from: location }} />;
  }

  if (!isHashAdminUnlocked()) {
    return <Navigate to={HASHADMIN_LOGIN_PATH} replace state={{ from: location }} />;
  }

  return (
    <HashAdminClientFilterProvider>
      <Outlet />
    </HashAdminClientFilterProvider>
  );
}
