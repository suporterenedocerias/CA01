import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Package, Truck, Star, Award, TrendingUp } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const iconMap: Record<string, React.ComponentType<any>> = {
  clientes: Users,
  pedidos: Package,
  cacambas: Truck,
  satisfacao: Star,
};

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const stepValue = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

export function SocialProofSection() {
  const [counters, setCounters] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCounters() {
      const { data } = await supabase.from('site_counters').select('*').eq('active', true).order('order_index');
      if (data) setCounters(data);
    }
    fetchCounters();
  }, []);

  if (counters.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-primary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {counters.map((counter, i) => {
            const Icon = iconMap[counter.name] || Award;
            return (
              <motion.div
                key={counter.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <Icon className="text-accent mx-auto mb-3" size={32} />
                <div className="font-display text-3xl md:text-4xl font-extrabold text-primary-foreground mb-1">
                  <AnimatedCounter value={counter.value} suffix={counter.suffix} />
                </div>
                <p className="text-primary-foreground/70 text-sm font-medium">{counter.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
