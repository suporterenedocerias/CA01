import { SiteHeader } from '@/components/landing/SiteHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProofDifferentialSection } from '@/components/landing/ProofDifferentialSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { OffersSection } from '@/components/landing/OffersSection';
import { SizesSection } from '@/components/landing/SizesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { TrackingSection } from '@/components/landing/TrackingSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';
import { WhatToDiscardSection } from '@/components/landing/WhatToDiscardSection';
import { RegionsSection } from '@/components/landing/RegionsSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { ContactFormSection } from '@/components/landing/ContactFormSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';

/** Conteúdo único da landing — reutilizado na home e em /e/:slug */
export function LandingContent() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <HeroSection />
      <ProofDifferentialSection />
      <BenefitsSection />
      <OffersSection />
      <SizesSection />
      <HowItWorksSection />
      <TrackingSection />
      <SocialProofSection />
      <WhatToDiscardSection />
      <RegionsSection />
      <CtaSection />
      <ContactFormSection />
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
