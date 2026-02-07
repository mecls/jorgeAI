import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ThemedText } from './themed-text';
import { useDatabase } from '@/providers/DatabaseProvider'

const ChatSelectionModel = ({ convoPickerVisible, onRequestClose }: { convoPickerVisible: boolean, onRequestClose: () => void }) => {
    const {
        conversations,
        activeConversationId,
        createConversation,
        openConversation,
    } = useDatabase();

    return (
        <>
            {/* Conversation picker modal */}
            <Modal
                visible={convoPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={onRequestClose}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onRequestClose}                >
                    {/* CHANGED: prevent taps inside the card from closing the modal */}
                    <TouchableOpacity activeOpacity={1} onPress={(e: any) => e?.stopPropagation?.()}>
                        <View style={styles.picker}>
                            <TouchableOpacity
                                style={styles.pickerItem}
                                onPress={async () => {
                                    const convo = await createConversation('New chat');
                                    await openConversation(convo.id);
                                    onRequestClose();
                                }}
                            >
                                <ThemedText>+ New conversation</ThemedText>
                            </TouchableOpacity>

                            <View style={styles.pickerDivider} />

                            {conversations.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.pickerItem}
                                    onPress={async () => {
                                        await openConversation(c.id);
                                        onRequestClose();
                                    }}
                                >
                                    <ThemedText>{c.title ?? `Conversation ${c.id.slice(0, 6)}`}</ThemedText>
                                    {c.id === activeConversationId ? (
                                        <ThemedText style={{ opacity: 0.6 }}> (current)</ThemedText>
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    )
}

export default ChatSelectionModel

const styles = StyleSheet.create({
    // Full-screen tap-to-close overlay for the modal
    backdrop: {
        ...StyleSheet.absoluteFillObject,              // cover the whole screen [web:270]
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-end',
        padding: 16,
    },

    // The conversation picker "card"
    picker: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        backgroundColor: '#353535',
        borderRadius: 16,
        paddingVertical: 8,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },

    // Row/button inside the picker
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },

    // Optional: separator line between items
    pickerDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginHorizontal: 14,
    },
})