import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';

interface PromptHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    history: { id: string; prompt_text: string }[];
    onSelect: (prompt: string) => void;
    onDelete?: (id: string) => void;
}

export const PromptHistoryModal: React.FC<PromptHistoryModalProps> = ({
    visible,
    onClose,
    history,
    onSelect,
    onDelete,
}) => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[tw`rounded-2xl bg-white p-5 shadow-lg`, { width: Math.min(screenWidth * 0.9, 380), maxHeight: screenHeight * 0.7 }]}>
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <Text style={tw`text-xl font-bold text-gray-900`}>Prompt History</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <MaterialIcons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {history.length === 0 ? (
                        <View style={tw`py-8 items-center`}>
                            <Text style={tw`text-gray-500 text-center`}>No saved prompts yet.</Text>
                        </View>
                    ) : (
                        <ScrollView style={tw`w-full`} indicatorStyle="black">
                            {history.map((item) => (
                                <View
                                    key={item.id}
                                    style={tw`flex-row items-center mb-2`}
                                >
                                    <TouchableOpacity
                                        style={tw`flex-1 py-3 px-4 bg-gray-50 rounded-xl border border-gray-100 active:bg-blue-50 active:border-blue-200 mr-2`}
                                        onPress={() => onSelect(item.prompt_text)}
                                    >
                                        <Text style={tw`text-gray-700 leading-5`}>{item.prompt_text}</Text>
                                    </TouchableOpacity>

                                    {onDelete && (
                                        <TouchableOpacity
                                            onPress={() => onDelete(item.id)}
                                            style={tw`p-3 bg-gray-100 rounded-xl items-center justify-center`}
                                            accessibilityLabel="Delete prompt"
                                        >
                                            <MaterialIcons name="close" size={20} color="#6b7280" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};
