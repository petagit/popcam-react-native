import { useState, useEffect } from 'react';
import { LightSensor } from 'expo-sensors';
import { Platform } from 'react-native';

export function useEnvironmentBrightness(threshold: number = 20) {
    const [illuminance, setIlluminance] = useState<number>(50); // Default to not dark
    const [isDark, setIsDark] = useState<boolean>(false);

    useEffect(() => {
        // LightSensor is typically only available on Android in the managed workflow
        // For iOS, this would require native modules or camera frame analysis which is heavier
        if (Platform.OS === 'android') {
            try {
                LightSensor.setUpdateInterval(1000); // Check every second
                const subscription = LightSensor.addListener(({ illuminance }) => {
                    setIlluminance(illuminance);
                    setIsDark(illuminance < threshold);
                });

                return () => {
                    subscription.remove();
                };
            } catch (e) {
                console.warn('LightSensor not available or failed', e);
            }
        } else {
            // On iOS, we currently default to "not dark" or we'd need a different strategy.
            // If the user wants to simulate specific behavior, we could add logic here.
            // For now, we assume standard lighting.
            setIsDark(false);
        }
    }, [threshold]);

    return { isDark, illuminance };
}
