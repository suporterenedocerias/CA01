import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { apiPost } from '@/lib/api';
import { DEFAULT_DUMPSTER_SIZES } from '@/lib/default-dumpster-sizes';
import { toast } from 'sonner';
import { Copy, QrCode, Link2, MessageCircle, Loader2, CheckCircle } from 'lucide-react';

interface DumpsterOption {
  size: string;
  title: string;
  price: number;
}

export default function AdminManualPix() {
  const [tab, setTab] = useState<'pix' | 'link'>('pix');
  const [sizeOptions, setSizeOptions] = useState<DumpsterOption[]>([]);

  // PIX form
  const [pixForm, setPixForm] = useState({
    nome: '',
    whatsapp: '',
    cpf_cnpj: '',
    tamanho: '',
    quantidade: '1',
    desconto: '0',
    observacoes: '',
  });
  const [pixBasePrice, setPixBasePrice] = useState(0);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixResult, setPixResult] = useState<{
    order_id: string;
    pix_copy_paste?: string;
    pix_qr_code?: string;
    pix_qr_code_url?: string;
  } | null>(null);

  // Link form
  const [linkForm, setLinkForm] = useState({
    tamanho: '',
    quantidade: '1',
    valor_override: '',
    desconto: '0',
  });
  const [linkBasePrice, setLinkBasePrice] = useState(0);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    async function fetchSizes() {
      const fallback = DEFAULT_DUMPSTER_SIZES.map((s) => ({ size: s.size, title: s.title, price: s.price }));
      const { data } = await supabase
        .from('dumpster_sizes')
        .select('size, title, price')
        .eq('active', true)
        .order('order_index');

      const options = (data && data.length > 0 ? data : fallback) as DumpsterOption[];
      setSizeOptions(options);

      setPixForm((f) => ({ ...f, tamanho: options[0].size }));
      setPixBasePrice(Number(options[0].price));

      setLinkForm((f) => ({ ...f, tamanho: options[0].size, valor_override: String(options[0].price) }));
      setLinkBasePrice(Number(options[0].price));
    }
    fetchSizes();
  }, []);

  // PIX calculations
  const pixDesconto = parseFloat(pixForm.desconto || '0') || 0;
  const pixQtd = parseInt(pixForm.quantidade || '1', 10);
  const pixValorFinal = Math.max(0, (pixBasePrice - pixDesconto) * pixQtd);

  // Link calculations
  const linkValorBase = parseFloat(linkForm.valor_override || '0') || linkBasePrice;
  const linkDesconto = parseFloat(linkForm.desconto || '0') || 0;
  const linkValorFinal = Math.max(0, linkValorBase - linkDesconto);
  const linkQtd = parseInt(linkForm.quantidade || '1', 10);

  const handlePixSizeChange = (size: string) => {
    const found = sizeOptions.find((s) => s.size === size);
    if (found) setPixBasePrice(Number(found.price));
    setPixForm((f) => ({ ...f, tamanho: size }));
    setPixResult(null);
  };

  const handleLinkSizeChange = (size: string) => {
    const found = sizeOptions.find((s) => s.size === size);
    if (found) {
      setLinkBasePrice(Number(found.price));
      setLinkForm((f) => ({ ...f, tamanho: size, valor_override: String(found.price) }));
    }
    setGeneratedLink('');
  };

  const handlePixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixForm.nome.trim() || !pixForm.whatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp.');
      return;
    }
    if (pixValorFinal <= 0) {
      toast.error('Valor final deve ser maior que zero.');
      return;
    }

    setPixLoading(true);
    setPixResult(null);
    try {
      const data = await apiPost('create-pix-charge', {
        nome: pixForm.nome.trim(),
        whatsapp: pixForm.whatsapp.trim(),
        cpf_cnpj: pixForm.cpf_cnpj.trim() || null,
        tamanho: pixForm.tamanho,
        quantidade: pixQtd,
        valor_unitario: pixValorFinal / pixQtd,
        observacoes: pixForm.observacoes.trim() || null,
      });
      setPixResult(data);
      toast.success('PIX gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PIX. Verifique os dados e tente novamente.');
    } finally {
      setPixLoading(false);
    }
  };

  const handleGenerateLink = () => {
    if (linkValorFinal <= 0) {
      toast.error('Valor final deve ser maior que zero.');
      return;
    }
    const params = new URLSearchParams({
      tamanho: linkForm.tamanho,
      valor: String(linkValorFinal),
      qty: linkForm.quantidade,
    });
    setGeneratedLink(`${window.location.origin}/checkout?${params.toString()}`);
    toast.success('Link gerado!');
  };

  const copyText = (text: string, label = 'Copiado!') => {
    navigator.clipboard.writeText(text).then(() => toast.success(label));
  };

  const pixPaymentUrl = pixResult ? `${window.location.origin}/pagamento/${pixResult.order_id}` : '';

  const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <AdminLayout title="PIX Manual">
      <div className="max-w-2xl space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab('pix')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'pix' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Gerar PIX Agora
          </button>
          <button
            onClick={() => setTab('link')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'link' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Link de Checkout
          </button>
        </div>

        {/* TAB: Gerar PIX Agora */}
        {tab === 'pix' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Preencha os dados do cliente e gere o PIX. Envie o link de pagamento via WhatsApp.
            </p>

            <form onSubmit={handlePixSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={pixForm.nome}
                    onChange={(e) => setPixForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">WhatsApp *</label>
                  <Input
                    value={pixForm.whatsapp}
                    onChange={(e) => setPixForm((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="11999999999"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">CPF/CNPJ (opcional)</label>
                <Input
                  value={pixForm.cpf_cnpj}
                  onChange={(e) => setPixForm((f) => ({ ...f, cpf_cnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tamanho</label>
                  <select
                    value={pixForm.tamanho}
                    onChange={(e) => handlePixSizeChange(e.target.value)}
                    className={selectClass}
                  >
                    {sizeOptions.map((s) => (
                      <option key={s.size} value={s.size}>
                        {s.size} — {s.title} (R$ {Number(s.price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={pixForm.quantidade}
                    onChange={(e) => setPixForm((f) => ({ ...f, quantidade: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Desconto (R$)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pixForm.desconto}
                  onChange={(e) => setPixForm((f) => ({ ...f, desconto: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              {/* Resumo de valores */}
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço unitário</span>
                  <span>R$ {pixBasePrice.toFixed(2)}</span>
                </div>
                {pixDesconto > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Desconto</span>
                    <span>− R$ {pixDesconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qtd</span>
                  <span>× {pixQtd}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">R$ {pixValorFinal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Observações (opcional)</label>
                <Input
                  value={pixForm.observacoes}
                  onChange={(e) => setPixForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Endereço de entrega, horário, etc."
                />
              </div>

              <Button type="submit" disabled={pixLoading} className="w-full">
                {pixLoading
                  ? <><Loader2 size={16} className="animate-spin mr-2" />Gerando PIX...</>
                  : <><QrCode size={16} className="mr-2" />Gerar PIX</>}
              </Button>
            </form>

            {/* Resultado do PIX */}
            {pixResult && (
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle size={18} />
                  PIX gerado com sucesso!
                </div>

                {(pixResult.pix_qr_code || pixResult.pix_qr_code_url) && (
                  <div className="flex justify-center">
                    <img
                      src={pixResult.pix_qr_code || pixResult.pix_qr_code_url}
                      alt="QR Code PIX"
                      className="w-48 h-48 border rounded-lg"
                    />
                  </div>
                )}

                {pixResult.pix_copy_paste && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Código PIX (copia e cola)</label>
                    <div className="flex gap-2">
                      <Input value={pixResult.pix_copy_paste} readOnly className="text-xs font-mono" />
                      <Button variant="outline" size="sm" onClick={() => copyText(pixResult.pix_copy_paste!, 'Código PIX copiado!')}>
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium">Link da página de pagamento</label>
                  <div className="flex gap-2">
                    <Input value={pixPaymentUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="sm" onClick={() => copyText(pixPaymentUrl, 'Link copiado!')}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() =>
                    window.open(
                      `https://wa.me/55${pixForm.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá ${pixForm.nome}! Segue o link para o pagamento PIX da sua caçamba (${pixForm.tamanho} × ${pixQtd}):\n\n${pixPaymentUrl}\n\nValor: R$ ${pixValorFinal.toFixed(2)}`
                      )}`,
                      '_blank'
                    )
                  }
                >
                  <MessageCircle size={16} className="mr-2" />
                  Enviar via WhatsApp
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Link de Checkout */}
        {tab === 'link' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Gere um link de checkout com preço especial. O cliente abre o link, preenche os dados e paga.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tamanho</label>
                  <select
                    value={linkForm.tamanho}
                    onChange={(e) => handleLinkSizeChange(e.target.value)}
                    className={selectClass}
                  >
                    {sizeOptions.map((s) => (
                      <option key={s.size} value={s.size}>
                        {s.size} — {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={linkForm.quantidade}
                    onChange={(e) => { setLinkForm((f) => ({ ...f, quantidade: e.target.value })); setGeneratedLink(''); }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Valor unitário (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linkForm.valor_override}
                    onChange={(e) => { setLinkForm((f) => ({ ...f, valor_override: e.target.value })); setGeneratedLink(''); }}
                  />
                  <p className="text-xs text-muted-foreground">Preço original: R$ {linkBasePrice.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Desconto (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linkForm.desconto}
                    onChange={(e) => { setLinkForm((f) => ({ ...f, desconto: e.target.value })); setGeneratedLink(''); }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Resumo do link */}
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor unitário</span>
                  <span>R$ {linkValorBase.toFixed(2)}</span>
                </div>
                {linkDesconto > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Desconto</span>
                    <span>− R$ {linkDesconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Valor no checkout × {linkQtd}</span>
                  <span className="text-primary">R$ {(linkValorFinal * linkQtd).toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleGenerateLink} className="w-full">
                <Link2 size={16} className="mr-2" />
                Gerar Link
              </Button>

              {generatedLink && (
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Link gerado</label>
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="text-xs" />
                      <Button variant="outline" size="sm" onClick={() => copyText(generatedLink, 'Link copiado!')}>
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(
                          `Segue o link para fazer seu pedido com valor especial:\n\n${generatedLink}`
                        )}`,
                        '_blank'
                      )
                    }
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Compartilhar via WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
