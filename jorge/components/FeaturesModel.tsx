import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDatabase } from '@/providers/DatabaseProvider';

export default function FeaturesModel({
    visible,
    onRequestClose,
}: {
    visible: boolean;
    onRequestClose: () => void;
}) {
    const { activeConversationId, uploadConversationFiles } = useDatabase();

    const onAddFiles = async () => {
        if (!activeConversationId) return;
        await uploadConversationFiles(activeConversationId);
        onRequestClose();
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onRequestClose}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.menuItem} onPress={onAddFiles}>
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
    backdrop: { flex: 1 },
    modalContent: {
        position: 'absolute',
        bottom: 150,
        left: 20,
        width: 220,
        backgroundColor: '#353535',
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
    menuText: { color: 'white', fontSize: 15, flex: 1 },
});
