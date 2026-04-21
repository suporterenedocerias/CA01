-- Painel mestre (hashadmin): listar todas as subpáginas com chave anon.
-- A chave anon já está exposta no front do site; INSERT/UPDATE continuam só autenticado/service_role.
CREATE POLICY "Anon can read all state_pages for master reporting"
  ON public.state_pages
  FOR SELECT
  TO anon
  USING (true);
