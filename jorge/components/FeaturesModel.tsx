import { Modal, StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker'
import { DatabaseProvider, useDatabase } from '@/providers/DatabaseProvider';


type PickedFile = {
    uri: string;
    name: string;
    mimeType?: string;
    size: number;
};

export default function FeaturesModel({ visible, onRequestClose }: { visible: boolean; onRequestClose: () => void }) {
    const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
    const { activeConversationId } = useDatabase()

    async function addFile() {

        const result = await DocumentPicker.getDocumentAsync({
            multiple: true,
            copyToCacheDirectory: true,
            type: ['application/pdf', 'image/*', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        }); // [web:863]

        if (result.canceled) return;

        for (const a of result.assets ?? []) {
            const form = new FormData();
            form.append('file', {
                uri: a.uri,
                name: a.name ?? 'upload',
                type: a.mimeType ?? 'application/octet-stream',
            } as any);

            const res = await fetch(`${API_BASE}/conversations/${activeConversationId}/files`, {
                method: 'POST',
                body: form,
            });
            if (!res.ok) throw new Error(await res.text());
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onRequestClose}
        >
            {/* Full-screen transparent backdrop */}
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onRequestClose}
            >
                {/* Menu positioned at bottom-right */}
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.menuItem} onPress={addFile}>
                        <MaterialIcons name="attach-file" size={20} color="white" />
                        <Text style={styles.menuText}>Add files</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <MaterialIcons name="graphic-eq" size={20} color="white" />
                        <Text style={styles.menuText}>Voice mode</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    modalContent: {
        animationDirection: 'above',
        position: 'absolute',
        bottom: 150, // Position above the input (adjust based on your layout)
        left: 20,  // Align with right side
        width: 200, // Match width from your screenshot
        backgroundColor: '#353535', // Dark background
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
    },
    menuText: {
        color: 'white',
        fontSize: 15,
        flex: 1,
    },
});
