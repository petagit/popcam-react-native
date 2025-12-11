import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, Dimensions, Image, Alert } from 'react-native';
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomPromptPickerModalProps {
    visible: boolean;
    onClose: () => void;
    customPrompt: string;
    setCustomPrompt: (text: string) => void;
    history: { id: string; prompt_text: string }[];
    onSaveAndUse: (imageUri: string | null) => void;
}

export const CustomPromptPickerModal: React.FC<CustomPromptPickerModalProps> = ({
    visible,
    onClose,
    customPrompt,
    setCustomPrompt,
    history,
    onSaveAndUse,
}) => {
    const screenWidth = Dimensions.get('window').width;
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]?.uri) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[tw`rounded-2xl bg-white p-4`, { width: Math.min(screenWidth * 0.9, 380) }]}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Add Custom Preset</Text>

                    <TouchableOpacity
                        onPress={pickImage}
                        style={tw`w-full h-40 bg-gray-100 rounded-xl mb-4 items-center justify-center border border-dashed border-gray-300 overflow-hidden`}
                    >
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={tw`w-full h-full`} resizeMode="cover" />
                        ) : (
                            <View style={tw`items-center`}>
                                <MaterialIcons name="add-photo-alternate" size={32} color="#9ca3af" />
                                <Text style={tw`text-gray-500 text-xs mt-2`}>Add Cover Image</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Prompt</Text>
                    <TextInput
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        placeholder="Describe the transformation..."
                        multiline
                        style={[tw`border border-gray-300 rounded-xl p-3 text-gray-900 mb-4`, { minHeight: 80 }]}
                    />

                    <View style={tw`flex-row justify-end gap-3`}>
                        <TouchableOpacity onPress={onClose} style={tw`py-3 px-4 rounded-xl border border-gray-200`}>
                            <Text style={tw`text-gray-700 font-semibold`}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onSaveAndUse(selectedImage)}
                            style={[
                                tw`py-3 px-6 rounded-xl bg-blue-600 shadow-sm`,
                                !customPrompt.trim() && tw`opacity-50`
                            ]}
                            disabled={!customPrompt.trim()}
                        >
                            <Text style={tw`text-white font-semibold`}>Save & Use</Text>
                        </TouchableOpacity>
                    </View>

                    {history.length > 0 && (
                        <View style={tw`mt-6 w-full pt-4 border-t border-gray-100`}>
                            <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-3`}>Recent Prompts</Text>
                            <ScrollView style={{ maxHeight: 100 }}>
                                {history.map((historyItem) => (
                                    <TouchableOpacity
                                        key={historyItem.id}
                                        style={tw`py-2 px-3 mb-2 bg-gray-50 rounded-lg border border-gray-100 flex-row items-center`}
                                        onPress={() => setCustomPrompt(historyItem.prompt_text)}
                                    >
                                        <MaterialIcons name="history" size={16} color="#6b7280" style={tw`mr-2`} />
                                        <Text numberOfLines={1} style={tw`text-sm text-gray-600 flex-1`}>{historyItem.prompt_text}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};
