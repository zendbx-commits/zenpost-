import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebsiteInfoForm from './WebsiteInfoForm';
import WebsiteAnalysisView from './WebsiteAnalysisView';
import MarketingIntelligenceView from './MarketingIntelligenceView';
import CalendarPreview from './CalendarPreview';
import './OnboardingWizard.css';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    websiteInfo: null,
    analysis: null,
    intelligence: null,
    calendar: null
  });

  const steps = [
    { number: 1, title: 'Website Info', component: 'form' },
    { number: 2, title: 'Analysis', component: 'analysis' },
    { number: 3, title: 'Intelligence', component: 'intelligence' },
    { number: 4, title: 'Calendar', component: 'calendar' }
  ];

  useEffect(() => {
    // Check if user is logged in
    const currentUser = localStorage.getItem('zenpost_current_user');
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Load saved progress if exists
    const savedProgress = localStorage.getItem('zenpost_onboarding_progress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setOnboardingData(progress.data);
      setCurrentStep(progress.step);
    }
  }, [navigate]);

  const saveProgress = (data, step) => {
    const progress = {
      data,
      step,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('zenpost_onboarding_progress', JSON.stringify(progress));
  };

  const handleWebsiteInfoSubmit = async (data) => {
    const updatedData = { ...onboardingData, websiteInfo: data };
    setOnboardingData(updatedData);
    saveProgress(updatedData, 2);
    setCurrentStep(2);
  };

  const handleAnalysisComplete = (analysis) => {
    const updatedData = { ...onboardingData, analysis };
    setOnboardingData(updatedData);
    saveProgress(updatedData, 3);
    setCurrentStep(3);
  };

  const handleIntelligenceComplete = (intelligence) => {
    const updatedData = { ...onboardingData, intelligence };
    setOnboardingData(updatedData);
    saveProgress(updatedData, 4);
    setCurrentStep(4);
  };

  const handleCalendarApprove = (calendar) => {
    // Clear onboarding progress
    localStorage.removeItem('zenpost_onboarding_progress');
    
    // Save calendar data for Content Calendar page
    const existingPosts = JSON.parse(localStorage.getItem('zenpost_scheduled_posts') || '[]');
    const newPosts = calendar.posts.map((post, index) => ({
      ...post,
      id: `onboarding-${Date.now()}-${index}`,
      status: 'draft',
      source: 'onboarding'
    }));
    
    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify([...existingPosts, ...newPosts]));
    
    // Navigate to content calendar
    navigate('/content-calendar', { 
      state: { 
        fromOnboarding: true,
        message: 'Your content calendar has been generated! Review and schedule your posts below.'
      } 
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WebsiteInfoForm
            initialData={onboardingData.websiteInfo}
            onSubmit={handleWebsiteInfoSubmit}
          />
        );
      case 2:
        return (
          <WebsiteAnalysisView
            websiteInfo={onboardingData.websiteInfo}
            onComplete={handleAnalysisComplete}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <MarketingIntelligenceView
            websiteInfo={onboardingData.websiteInfo}
            analysis={onboardingData.analysis}
            onComplete={handleIntelligenceComplete}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CalendarPreview
            websiteInfo={onboardingData.websiteInfo}
            analysis={onboardingData.analysis}
            intelligence={onboardingData.intelligence}
            onApprove={handleCalendarApprove}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-wizard">
      {/* Progress Header */}
      <div className="onboarding-header">
        <div className="container">
          <div className="header-content">
            <div className="branding">
              <h1 className="wizard-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Started with ZenPost
              </h1>
              <p className="wizard-subtitle">Let's set up your content strategy in minutes</p>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div key={step.number} className="progress-step-wrapper">
                  <div
                    className={`progress-step ${
                      currentStep === step.number ? 'active' : ''
                    } ${currentStep > step.number ? 'completed' : ''}`}
                  >
                    <div className="step-number">
                      {currentStep > step.number ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="step-title">{step.title}</div>
                  </div>
                  {index < steps.length - 1 && <div className="step-connector" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="onboarding-content">
        <div className="container">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
