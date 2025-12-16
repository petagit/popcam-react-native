import { NanoBananaPreset } from '../../lib/nanobanana-presets';

/**
 * Defines the three sources of prompts in the application.
 */
export type PromptSource =
    | { type: 'APP_PRESET'; preset: NanoBananaPreset }           // Type 1: App defined
    | { type: 'USER_PRESET'; preset: { id: string; prompt_text: string; title?: string } } // Type 2: User defined (History)
    | { type: 'MANUAL_INPUT'; text: string };                    // Type 3: Manual input

/**
 * Result structure for navigation or processing.
 */
export interface ResolvedPromptConfig {
    presetId: string;
    presetTitle: string;
    customPromptParam?: string; // Passed ONLY if it's a custom/override prompt
}

/**
 * LOGIC BLOCK: Determines the navigation parameters based on the source.
 * This effectively implements the rule: "If you use 1 or 2, you are not using 3."
 */
export const resolvePromptConfig = (source: PromptSource): ResolvedPromptConfig => {
    switch (source.type) {
        case 'APP_PRESET':
            return {
                presetId: source.preset.id,
                presetTitle: source.preset.title,
                customPromptParam: undefined, // Explicitly undefined: Use the preset's internal prompt
            };

        case 'USER_PRESET':
            return {
                presetId: source.preset.id,
                presetTitle: source.preset.title || 'Custom Preset',
                customPromptParam: source.preset.prompt_text, // Pass the text as a custom override
            };

        case 'MANUAL_INPUT':
            return {
                presetId: 'custom',
                presetTitle: 'Custom Prompt',
                customPromptParam: source.text.trim(),
            };
    }
};

/**
 * LOGIC BLOCK: Resolves the final string to send to the AI model.
 * Used by the Result Screen.
 */
export const resolveActivePrompt = (
    presetId: string,
    customPromptParam: string | undefined,
    appPresets: NanoBananaPreset[]
): string => {
    // Rule: If a custom/manual prompt text is provided, it ALWAYS wins.
    // This covers Type 2 (User Preset) and Type 3 (Manual Input).
    if (customPromptParam && customPromptParam.trim().length > 0) {
        return customPromptParam.trim();
    }

    // Rule: If no custom text, look up the App Preset (Type 1).
    const foundPreset = appPresets.find((p) => p.id === presetId);
    if (foundPreset) {
        return foundPreset.prompt;
    }

    // Fallback (Safe default)
    return 'Lego style';
};
