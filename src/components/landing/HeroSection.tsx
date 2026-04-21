import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowDown, ArrowRight, Check } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useStatePage } from '@/contexts/StatePageContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Carrossel do hero — fotos de obra/demolição/entulho brasileiras.
 * Troca por fotos reais das suas caçambas: coloca JPG em public/hero/ e aponta o src.
 */
const HERO_SLIDES = [
  {
    // Caçamba — primeiro slide (LCP): arquivo pequeno carrega rápido
    src: '/hero/cacamba-1.jpg',
    alt: 'Caçamba de entulho para locação',
  },
  {
    src: '/hero/cacamba-2.jpg',
    alt: 'Caçamba laranja cheia na calçada',
  },
  {
    // Escavadeiras em obra de terraplenagem — vista aérea
    src: 'https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=1600&q=85&auto=format&fit=crop',
    alt: 'Obra de terraplenagem com maquinário pesado',
  },
  {
    // Peões de obra em canteiro — vista superior
    src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=85&auto=format&fit=crop',
    alt: 'Equipa de obra em canteiro de construção',
  },
  {
    // Trabalhadores em reforma residencial
    src: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=85&auto=format&fit=crop',
    alt: 'Reforma residencial com descarte de entulho',
  },
  {
    // Demolição / obra de construção civil
    src: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=85&auto=format&fit=crop',
    alt: 'Construção civil e descarte de entulho',
  },
];

export function HeroSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const { stateName, basePath } = useStatePage();
  const tamanhosHref = basePath ? `${basePath}#tamanhos` : '#tamanhos';
  const checkoutHref = basePath ? `${basePath}/checkout` : '/checkout';

  const proofItems = [
    'Entrega rápida na sua região',
    'Pagamento seguro via pagamento online',
    'Atendimento via WhatsApp',
    'Processo 100% online',
  ];
  const [current, setCurrent] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());

  const next = useCallback(() => {
    setCurrent((prev) => {
      const n = HERO_SLIDES.length;
      for (let i = 1; i <= n; i++) {
        const idx = (prev + i) % n;
        if (!failedSrcs.has(HERO_SLIDES[idx].src)) return idx;
      }
      return prev;
    });
  }, [failedSrcs]);

  useEffect(() => {
    const timer = setInterval(next, 5200);
    return () => clearInterval(timer);
  }, [next]);

  const slide = HERO_SLIDES[current];

  const handleImgError = () => {
    setFailedSrcs((prev) => new Set(prev).add(slide.src));
    setCurrent((c) => (c + 1) % HERO_SLIDES.length);
  };

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.img
          key={current}
          src={slide.src}
          alt={slide.alt}
          className="absolute inset-0 h-full w-full object-cover brightness-75 blur-[2px] scale-[1.02]"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: 'easeInOut' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImgError}
        />
      </AnimatePresence>

      {/* Gradiente lateral — cobre mais a área do texto */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 from-0% via-black/35 via-55% to-black/10 to-100%"
        aria-hidden
      />
      {/* Gradiente vertical — ainda mais escuro na base */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent to-40%"
        aria-hidden
      />

      <div className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-20">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setCurrent(i)}
            disabled={failedSrcs.has(s.src)}
            aria-label={`Foto ${i + 1} de ${HERO_SLIDES.length}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current
                ? 'w-10 bg-white shadow-[0_0_14px_rgba(255,255,255,0.45)]'
                : 'w-2.5 bg-white/45 hover:bg-white/70'
            } ${failedSrcs.has(s.src) ? 'opacity-30' : ''}`}
          />
        ))}
      </div>

      <div className="container relative z-10 pb-12 pt-24">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.65 }}
            className="font-display mb-5 text-balance text-4xl font-extrabold leading-[1.08] text-white drop-shadow-sm md:text-5xl lg:text-[3.25rem] lg:leading-[1.06]"
          >
            Alugue sua caçamba{' '}
            <span className="text-yellow-400">em minutos</span>,{' '}
            <span className="text-yellow-300">rápido</span>, sem burocracia e com{' '}
            <span className="text-green-400">pagamento rápido online</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mb-6 max-w-xl text-lg leading-relaxed text-white/90 drop-shadow-sm md:text-xl"
          >
            Precisa descartar entulho hoje? Escolha o tamanho ideal, finalize online e receba sua caçamba sem
            complicação.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            className="mb-8 grid max-w-xl gap-2.5 sm:grid-cols-2"
            aria-label="Vantagens rápidas"
          >
            {proofItems.map((text) => (
              <li key={text} className="flex items-start gap-2.5 text-sm font-medium text-white/95 md:text-base">
                <Check
                  className="mt-0.5 size-5 shrink-0 text-yellow-300 md:text-yellow-200"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{text}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="mb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <Link
              to={checkoutHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-7 py-3.5 text-center text-base font-bold text-zinc-900 shadow-md transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 sm:w-auto sm:min-h-[3.25rem]"
            >
              Ir para o checkout
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Link>
            {available && (
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackClick}
                className="w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 sm:w-auto"
              >
                <span className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-white bg-transparent px-7 py-3.5 text-center text-base font-semibold text-white shadow-none transition hover:bg-white/10 sm:inline-flex sm:min-h-[3.25rem] sm:min-w-[220px]">
                  <MessageCircle className="size-5 shrink-0" aria-hidden />
                  Atendimento no WhatsApp
                </span>
              </a>
            )}
            <a
              href={tamanhosHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-sm border-b-2 border-white/55 pb-1.5 text-base font-semibold text-white transition hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto sm:justify-start"
            >
              Ver tamanhos e valores
              <ArrowRight
                className="size-5 shrink-0 transition-transform group-hover:translate-x-1"
                strokeWidth={2.25}
                aria-hidden
              />
            </a>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-bounce md:block">
        <ArrowDown className="text-white/50" size={28} />
      </div>
    </section>
  );
}
