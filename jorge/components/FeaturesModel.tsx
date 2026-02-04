import { Modal, StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FeaturesModel({
    visible,
    onRequestClose
}: {
    visible: boolean;
    onRequestClose: () => void
}) {
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
                    <TouchableOpacity style={styles.menuItem}>
                        <MaterialIcons name="attach-file" size={20} color="white" />
                        <Text style={styles.menuText}>Add photos & files</Text>
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
