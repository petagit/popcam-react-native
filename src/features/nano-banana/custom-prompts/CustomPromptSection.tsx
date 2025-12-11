import React, { useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomPromptSectionProps {
    isEnabled: boolean;
    onToggle: (val: boolean) => void;
    customPrompt: string;
    onPromptChange: (text: string) => void;
    onSave: () => Promise<boolean>;
    onViewHistory: () => void;
    onUsePrompt: () => void;
}

export const CustomPromptSection: React.FC<CustomPromptSectionProps> = ({
    isEnabled,
    onToggle,
    customPrompt,
    onPromptChange,
    onSave,
    onViewHistory,
    onUsePrompt,
}) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = async () => {
        const success = await onSave();
        if (success) {
            setIsSaved(true);
            setTimeout(() => {
                setIsSaved(false);
            }, 2000);
        }
    };

    return (
        <View style={tw`mb-4 bg-white rounded-2xl p-4 shadow-sm`}>
            <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-base font-semibold text-gray-900`}>Enable Custom Prompt</Text>
                <Switch
                    value={isEnabled}
                    onValueChange={onToggle}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={isEnabled ? '#ffffff' : '#f3f4f6'}
                />
            </View>
            {isEnabled && (
                <View style={tw`mt-3`}>
                    <Text style={tw`text-sm text-gray-600 mb-2`}>
                        Enter your custom prompt below. This will be used instead of the preset's default prompt behavior where applicable.
                    </Text>
                    <TextInput
                        value={customPrompt}
                        onChangeText={onPromptChange}
                        placeholder="E.g., Cyberpunk city with neon lights..."
                        multiline
                        style={[tw`border border-gray-300 rounded-xl p-3 text-gray-900`, { minHeight: 80 }]}
                    />
                    <View style={tw`mt-3 gap-2`}>
                        <View style={tw`flex-row gap-2`}>
                            <TouchableOpacity
                                onPress={onViewHistory}
                                style={tw`flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center border border-gray-200`}
                            >
                                <Text style={tw`text-gray-700 font-semibold text-xs`}>View History</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSave}
                                style={[
                                    tw`flex-1 py-3 rounded-xl items-center justify-center border`,
                                    isSaved ? tw`bg-green-100 border-green-200` : tw`bg-gray-100 border-gray-200`
                                ]}
                                disabled={isSaved}
                            >
                                {isSaved ? (
                                    <View style={tw`flex-row items-center gap-1`}>
                                        <MaterialIcons name="check" size={16} color="#15803d" />
                                        <Text style={tw`text-green-700 font-semibold text-xs`}>Saved</Text>
                                    </View>
                                ) : (
                                    <Text style={tw`text-gray-700 font-semibold text-xs`}>Save to History</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={onUsePrompt}
                            style={tw`py-3 rounded-xl bg-blue-500 items-center justify-center shadow-sm`}
                        >
                            <Text style={tw`text-white font-bold text-sm`}>Use This Prompt</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};
