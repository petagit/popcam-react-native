import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { NanoBananaPreset } from '../../lib/nanobanana-presets';
import { NanoBananaThumbnail } from './NanoBananaThumbnail';
import Animated, { FadeOut, Layout } from 'react-native-reanimated';

export type GridItem =
    | { type: 'preset'; preset: NanoBananaPreset }
    | { type: 'custom' }
    | { type: 'history_custom'; preset: { id: string; prompt_text: string; title?: string; thumbnail_url?: string } };

interface NanoBananaGridProps {
    items: GridItem[];
    selectedId: string | null;
    onSelect: (item: GridItem) => void;
    onLongPress: (item: GridItem) => void;
    onOpenCustomPicker: () => void;
    onEditCustom: (item: { id: string; prompt_text: string; title?: string; thumbnail_url?: string }) => void;
    onDeleteCustom?: (item: { id: string; prompt_text: string; title?: string; thumbnail_url?: string }) => void;
    isManageMode?: boolean;
    tileSize: number;
    columns: number;
    interItemGap: number;
}

export const NanoBananaGrid: React.FC<NanoBananaGridProps> = ({
    items,
    selectedId,
    onSelect,
    onLongPress,
    onOpenCustomPicker,
    onEditCustom,
    onDeleteCustom,
    isManageMode,
    tileSize,
    columns,
    interItemGap,
}) => {
    return (
        <View style={tw`flex-row flex-wrap`}>
            {items.map((item, index) => {
                const marginRight = (index % columns) !== (columns - 1) ? interItemGap : 0;

                if (item.type === 'custom') {
                    const isSelectedCustom = selectedId === 'custom';
                    return (
                        <Animated.View
                            key={`custom-tile`}
                            layout={Layout.duration(300)}
                            style={[
                                { width: tileSize, height: tileSize, marginRight },
                                tw`mb-2`
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    tw`flex-1 rounded-xl border items-center justify-center`,
                                    isSelectedCustom ? tw`border-blue-500 bg-blue-50` : tw`border-gray-200 bg-white`,
                                ]}
                                onPress={onOpenCustomPicker}
                                accessibilityLabel="Custom prompt filter"
                            >
                                <MaterialIcons name="add" size={32} color={isSelectedCustom ? '#1d4ed8' : '#111827'} />
                                <Text style={tw`text-xs font-semibold text-gray-800 mt-2 text-center px-1`}>Add custom preset</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }

                if (item.type === 'history_custom') {
                    const preset = item.preset;
                    const isSelected = preset.id === selectedId;
                    return (
                        <Animated.View
                            key={preset.id}
                            layout={Layout.duration(300)}
                            exiting={FadeOut.duration(300)}
                            style={[
                                { width: tileSize, height: tileSize, marginRight },
                                tw`mb-2`
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    tw`flex-1 rounded-xl border overflow-hidden bg-gray-100`,
                                    isSelected ? tw`border-blue-500` : tw`border-gray-200`,
                                ]}
                                onPress={() => onSelect(item)}
                                onLongPress={() => onLongPress(item)}
                                delayLongPress={200}
                            >
                                <NanoBananaThumbnail
                                    thumbnailUrl={preset.thumbnail_url}
                                    promptText={preset.prompt_text}
                                />
                                {isSelected && (
                                    <View style={[tw`absolute inset-0 items-center justify-center`, { backgroundColor: 'rgba(29,78,216,0.25)' }]}>
                                        <Text style={tw`text-white text-xs font-semibold`}>Selected</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {isManageMode && (
                                <>
                                    {/* Delete button (Top Right) */}
                                    <TouchableOpacity
                                        style={tw`absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100 z-10`}
                                        onPress={() => onDeleteCustom && onDeleteCustom(preset)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <MaterialIcons name="close" size={12} color="#ef4444" />
                                    </TouchableOpacity>

                                    {/* Edit button (Bottom Right) */}
                                    <TouchableOpacity
                                        style={tw`absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100 z-10`}
                                        onPress={() => onEditCustom(preset)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <MaterialIcons name="edit" size={12} color="#4b5563" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </Animated.View>
                    );
                }

                // Default preset handling
                const preset = item.preset;
                const isSelected = preset.id === selectedId;
                return (
                    <Animated.View
                        key={preset.id}
                        layout={Layout.duration(300)}
                        style={[
                            { width: tileSize, height: tileSize, marginRight },
                            tw`mb-2`
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                tw`flex-1 rounded-xl border overflow-hidden`,
                                isSelected ? tw`border-blue-500` : tw`border-gray-200`,
                                { flex: 1 },
                            ]}
                            onPress={() => onSelect(item)}
                            onLongPress={() => onLongPress(item)}
                            delayLongPress={150}
                            accessibilityLabel={preset.title}
                        >
                            <NanoBananaThumbnail
                                imageSource={preset.preview}
                                promptText={preset.prompt}
                            />
                            {isSelected && (
                                <View style={[tw`absolute inset-0 items-center justify-center`, { backgroundColor: 'rgba(29,78,216,0.25)' }]}>
                                    <Text style={tw`text-white text-xs font-semibold`}>Selected</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );
};
