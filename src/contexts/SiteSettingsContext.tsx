import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  site_name: string;
  telefone_principal: string | null;
  whatsapp_principal: string | null;
  endereco_empresa: string | null;
  email_contato: string | null;
}

const defaultSettings: SiteSettings = {
  site_name: 'Entulho Hoje',
  telefone_principal: null,
  whatsapp_principal: null,
  endereco_empresa: null,
  email_contato: null,
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('site_name, telefone_principal, whatsapp_principal, endereco_empresa, email_contato')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.site_name) setSettings(data as SiteSettings);
      });
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
