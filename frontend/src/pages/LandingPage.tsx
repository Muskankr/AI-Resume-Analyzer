import React, { useEffect } from 'react'
import { HeroSection } from '../components/Landing/HeroSection'
import { FeaturesSection } from '../components/Landing/FeaturesSection'
import { HowItWorksSection } from '../components/Landing/HowItWorksSection'
import { BenefitsSection } from '../components/Landing/BenefitsSection'

const DEFAULT_TITLE = 'AI Resume Analyzer'

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = DEFAULT_TITLE
  }, [])

  return (
    <div className="container mt-5 px-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
    </div>
  )
}
