import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { LayoutRectangle } from 'react-native';

export type OnboardingStep =
    | 'IDLE'
    | 'NANO_BANANA_BUTTON'
    | 'PICK_FILTER'
    | 'TAKE_PICTURE'
    | 'CONFETTI'
    | 'COMPLETED';

interface OnboardingContextType {
    isActive: boolean;
    currentStep: OnboardingStep;
    targets: Record<string, LayoutRectangle>;
    startOnboarding: () => void;
    nextStep: () => void;
    stopOnboarding: () => void;
    registerTarget: (step: OnboardingStep, layout: LayoutRectangle) => void;
    deregisterTarget: (step: OnboardingStep) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('IDLE');
    const [targets, setTargets] = useState<Record<string, LayoutRectangle>>({});

    const startOnboarding = useCallback(() => {
        setIsActive(true);
        setCurrentStep('NANO_BANANA_BUTTON');
        console.log('[Onboarding] Started');
    }, []);

    const stopOnboarding = useCallback(() => {
        setIsActive(false);
        setCurrentStep('IDLE');
        console.log('[Onboarding] Stopped');
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep((prev) => {
            switch (prev) {
                case 'NANO_BANANA_BUTTON': return 'PICK_FILTER';
                case 'PICK_FILTER': return 'TAKE_PICTURE';
                case 'TAKE_PICTURE': return 'CONFETTI';
                case 'CONFETTI': return 'COMPLETED';
                default: return 'IDLE';
            }
        });
    }, []);

    const registerTarget = useCallback((step: OnboardingStep, layout: LayoutRectangle) => {
        setTargets((prev) => ({
            ...prev,
            [step]: layout
        }));
        console.log(`[Onboarding] Registered target for ${step}:`, layout);
    }, []);

    const deregisterTarget = useCallback((step: OnboardingStep) => {
        setTargets((prev) => {
            const newState = { ...prev };
            delete newState[step];
            return newState;
        });
    }, []);

    return (
        <OnboardingContext.Provider
            value={{
                isActive,
                currentStep,
                targets,
                startOnboarding,
                nextStep,
                stopOnboarding,
                registerTarget,
                deregisterTarget,
            }}
        >
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};
