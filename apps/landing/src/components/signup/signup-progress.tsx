'use client';

import { Check } from 'lucide-react';

interface SignupProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function SignupProgress({ currentStep, totalSteps }: SignupProgressProps) {
  const steps = [
    'Business Type',
    'Business Details',
    'Account Setup',
    'Template Selection',
    'Complete Setup'
  ];

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-600">
            Step {currentStep} of {totalSteps}
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="hidden md:flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isCurrent
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </div>
                <div className={`mt-2 text-xs font-medium text-center max-w-[80px] ${
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden text-center mb-6">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {steps[currentStep - 1]}
        </div>
        <div className="text-xs text-gray-500">
          Step {currentStep} of {totalSteps}
        </div>
      </div>
    </div>
  );
}