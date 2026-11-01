import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { ValuePropsBar } from '../components/ValuePropsBar';
import { CategoryGrid } from '../components/CategoryGrid';
import { FeaturedProducts } from '../components/FeaturedProducts';
import { SizeCalculatorWidget } from '@/modules/product/components/SizeCalculatorWidget';
import { BrandBenefits } from '../components/BrandBenefits';
import { Product } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenSizeAdvisor?: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenSizeAdvisor }) => {
  const { currentRole } = useAuth();
  const isStaff = currentRole === 'admin' || currentRole === 'manager';

  const handleScrollToSizeFinder = () => {
    const el = document.getElementById('size-calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('/size-guide');
    }
  };

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <HeroSection onNavigate={onNavigate} onOpenSizeFinder={handleScrollToSizeFinder} />

      {/* 2. Value Propositions Bar (3 Slogans: 01, 02, 03) */}
      <div className="reveal-init">
        <ValuePropsBar />
      </div>

      {/* 3. Category Grid */}
      <div className="reveal-init delay-100">
        <CategoryGrid onNavigate={onNavigate} />
      </div>

      {/* 4. Featured Products & Best Sellers with Tabs */}
      <div className="reveal-init delay-100">
        <FeaturedProducts onNavigate={onNavigate} onOpenSizeAdvisor={onOpenSizeAdvisor} />
      </div>

      {/* 5. Direct Size Calculator AI Widget on Home (Hidden for Admin & Manager) */}
      {!isStaff && (
        <div className="reveal-init delay-100">
          <SizeCalculatorWidget onNavigate={onNavigate} />
        </div>
      )}

      {/* 6. Technical Engineering & Brand Benefits (Hidden for Admin & Manager) */}
      {!isStaff && <BrandBenefits onNavigate={onNavigate} />}
    </div>
  );
};
