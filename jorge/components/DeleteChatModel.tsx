import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Conversation = { id: string; title: string };

export function DeleteChatModel({
    visible,
    conversation,
    onCancel,
    onDeleteConfirmed,
}: {
    visible: boolean;
    onCancel: () => void;
    conversation: Conversation;
    onDeleteConfirmed: (id: string) => Promise<void> | void;
}) {

    const chatTitle = useMemo(
        () => conversation.title?.trim() || 'Untitled chat',
        [conversation.title]
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            {/* Tap outside closes */}
            <Pressable style={styles.backdrop} onPress={onCancel}>
                {/* Tap inside should NOT close */}
                <Pressable style={styles.card} onPress={() => { }}>
                    <Text style={styles.title}>{chatTitle}</Text>
                    <Text style={styles.message}>Do you really want to delete this chat?</Text>

                    <View style={styles.actions}>
                        <Pressable style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            style={styles.deleteBtn}
                            onPress={async () => {
                                await onDeleteConfirmed(conversation.id);
                            }}
                            disabled={!conversation.id}
                        >
                            <Text style={styles.deleteText}>Delete</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    row: { paddingVertical: 12, paddingHorizontal: 14 },
    rowTitle: { fontSize: 16, color: '#111' },

    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#353535',
        borderRadius: 14,
        padding: 16,
    },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#fff' },
    message: { fontSize: 14, color: '#fff', marginBottom: 14 },

    actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#eee' },
    cancelText: { color: '#111', fontWeight: '600' },

    deleteBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E53935' },
    deleteText: { color: '#fff', fontWeight: '700' },
});
