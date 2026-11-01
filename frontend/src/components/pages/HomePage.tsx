import React from 'react';
import { HeroSection } from '../home/HeroSection';
import { ValuePropsBar } from '../home/ValuePropsBar';
import { CategoryGrid } from '../home/CategoryGrid';
import { FeaturedProducts } from '../home/FeaturedProducts';
import { SizeCalculatorWidget } from '../home/SizeCalculatorWidget';
import { BrandBenefits } from '../home/BrandBenefits';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
      <ValuePropsBar />

      {/* 3. Category Grid */}
      <CategoryGrid onNavigate={onNavigate} />

      {/* 4. Featured Products & Best Sellers with Tabs */}
      <FeaturedProducts onNavigate={onNavigate} onOpenSizeAdvisor={onOpenSizeAdvisor} />

      {/* 5. Direct Size Calculator AI Widget on Home (Hidden for Admin & Manager) */}
      {!isStaff && <SizeCalculatorWidget onNavigate={onNavigate} />}

      {/* 6. Technical Engineering & Brand Benefits (Hidden for Admin & Manager) */}
      {!isStaff && <BrandBenefits />}
    </div>
  );
};
