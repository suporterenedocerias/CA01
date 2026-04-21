import { StatePageProvider } from '@/contexts/StatePageContext';
import { LandingContent } from '@/pages/LandingContent';

const Index = () => {
  return (
    <StatePageProvider value={{ slug: null, stateName: null, basePath: '' }}>
      <LandingContent />
    </StatePageProvider>
  );
};

export default Index;
