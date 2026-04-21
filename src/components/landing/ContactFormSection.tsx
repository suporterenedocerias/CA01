import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useStatePage } from '@/contexts/StatePageContext';
import { supabase } from '@/integrations/supabase/client';
import { apiPost } from '@/lib/api';
import { DEFAULT_DUMPSTER_SIZES } from '@/lib/default-dumpster-sizes';
import { MessageCircle, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

interface DumpsterOption {
  size: string;
  title: string;
  price: number;
}

function defaultOptionsFromBrief(): DumpsterOption[] {
  return DEFAULT_DUMPSTER_SIZES.map((s) => ({
    size: s.size,
    title: s.title,
    price: s.price,
  }));
}

interface ContactFormSectionProps {
  pageSlug?: string;
}

export function ContactFormSection({ pageSlug }: ContactFormSectionProps = {}) {
  const navigate = useNavigate();
  const { getWhatsAppUrl, trackClick, available, assignedNumberId } = useWhatsApp();
  const { slug } = useStatePage();
  const [loading, setLoading] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<DumpsterOption[]>([]);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cpf_cnpj: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    tamanho: '',
    quantidade: '1',
    observacoes: '',
  });

  useEffect(() => {
    async function fetchSizes() {
      const fallback = defaultOptionsFromBrief();
      const { data } = await supabase
        .from('dumpster_sizes')
        .select('size, title, price')
        .eq('active', true)
        .order('order_index');

      if (data && data.length > 0) {
        setSizeOptions(data);
        setForm((f) => ({ ...f, tamanho: data[0].size }));
        setSelectedPrice(Number(data[0].price));
      } else {
        setSizeOptions(fallback);
        setForm((f) => ({ ...f, tamanho: fallback[0].size }));
        setSelectedPrice(fallback[0].price);
      }
    }
    fetchSizes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'tamanho') {
      const found = sizeOptions.find((s) => s.size === value);
      if (found) setSelectedPrice(Number(found.price));
    }

    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep);
      }
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: data.complemento || prev.complemento,
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    }
  };

  const valorTotal = selectedPrice * parseInt(form.quantidade || '1', 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.whatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      if (slug) {
        sessionStorage.setItem('entulho_page_slug', slug);
      } else {
        sessionStorage.removeItem('entulho_page_slug');
      }

      const data = await apiPost('create-pix-charge', {
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.trim(),
        whatsapp_number_id: assignedNumberId || null,
        email: form.email.trim() || null,
        cpf_cnpj: form.cpf_cnpj.trim() || null,
        cep: form.cep.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade, 10),
        valor_unitario: selectedPrice,
        observacoes: form.observacoes.trim() || null,
        page_slug: slug || null,
        custom_page_slug: pageSlug || null,
      });

      navigate(`/pagamento/${data.order_id}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao gerar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectClasses =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <section id="contato" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-4xl">
          <AnimateOnScroll className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Pedido online</span>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">Faça seu pedido online</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Preencha os dados e conclua o pagamento via PIX com segurança.
            </p>
            <p className="mt-2 text-base text-muted-foreground">Processo objetivo, sem burocracia desnecessária.</p>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <AnimateOnScroll direction="left" className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Dados pessoais</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input name="nome" placeholder="Nome completo *" value={form.nome} onChange={handleChange} required maxLength={100} />
                  <Input name="whatsapp" placeholder="WhatsApp *" value={form.whatsapp} onChange={handleChange} required maxLength={20} />
                  <Input name="email" placeholder="E-mail" type="email" value={form.email} onChange={handleChange} maxLength={255} />
                  <Input name="cpf_cnpj" placeholder="CPF ou CNPJ" value={form.cpf_cnpj} onChange={handleChange} maxLength={18} />
                </div>

                <h3 className="mb-2 pt-4 font-display text-lg font-bold text-foreground">Endereço de entrega</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} maxLength={9} />
                  <Input
                    name="endereco"
                    placeholder="Endereço"
                    className="sm:col-span-2"
                    value={form.endereco}
                    onChange={handleChange}
                    maxLength={200}
                  />
                  <Input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} maxLength={10} />
                  <Input name="complemento" placeholder="Complemento" value={form.complemento} onChange={handleChange} maxLength={100} />
                  <Input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100} />
                  <Input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100} />
                  <Input name="estado" placeholder="UF" value={form.estado} onChange={handleChange} maxLength={2} />
                </div>

                <h3 className="mb-2 pt-4 font-display text-lg font-bold text-foreground">Caçamba</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <select name="tamanho" value={form.tamanho} onChange={handleChange} className={selectClasses} required>
                    {sizeOptions.map((s) => (
                      <option key={s.size} value={s.size}>
                        {s.size}: {s.title} (R$ {Number(s.price).toFixed(2).replace('.', ',')})
                      </option>
                    ))}
                  </select>
                  <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectClasses}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} caçamba{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {valorTotal > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-base font-bold text-foreground">
                      R$ {valorTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                <Textarea
                  name="observacoes"
                  placeholder="Observações"
                  value={form.observacoes}
                  onChange={handleChange}
                  rows={3}
                  maxLength={1000}
                />

                <Button type="submit" variant="whatsapp" size="lg" className="w-full" disabled={loading || sizeOptions.length === 0}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} /> Gerando PIX…
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2" size={18} /> Pagar com PIX
                    </>
                  )}
                </Button>
              </form>
            </AnimateOnScroll>

            <AnimateOnScroll direction="right" className="flex flex-col gap-6 lg:col-span-2">
              {available && (
                <div className="flex-1 rounded-xl bg-primary p-6 text-primary-foreground">
                  <h3 className="mb-2 font-display text-xl font-bold">Suporte</h3>
                  <p className="mb-2 font-medium">Ficou com dúvida?</p>
                  <p className="mb-6 text-primary-foreground/85">
                    Fale com a nossa equipe pelo WhatsApp para tirar dúvidas antes de fechar o pedido.
                  </p>
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
                    <Button variant="whatsapp" size="lg" className="w-full">
                      <MessageCircle className="mr-2" /> Abrir WhatsApp
                    </Button>
                  </a>
                </div>
              )}
              <div className="rounded-xl border bg-surface p-6">
                <h4 className="mb-3 font-display font-bold text-foreground">Horário de atendimento</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Segunda a sexta: 7h às 20h</p>
                  <p>Sábado: 7h às 20h</p>
                  <p>Emergência: 24h</p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
