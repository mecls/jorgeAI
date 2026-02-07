import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { ThemedText } from './themed-text';
import { useDatabase } from '@/providers/DatabaseProvider';
import { DeleteChatModel } from './DeleteChatModel';
import AntDesign from '@expo/vector-icons/AntDesign';

const ChatSelectionModel = ({
    convoPickerVisible,
    onRequestClose,
}: {
    convoPickerVisible: boolean;
    onRequestClose: () => void;
}) => {
    const {
        conversations,
        activeConversationId,
        createConversation,
        openConversation,
        deleteConversation,
    } = useDatabase();

    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
    return (
        <>
            {/* Conversation picker modal */}
            <Modal
                visible={convoPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={onRequestClose}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onRequestClose}>
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

                            {conversations.map((c) => (
                                <View key={c.id} style={styles.pickerItem}>
                                    <TouchableOpacity
                                        style={styles.rowLeftPress}
                                        onPress={async () => {
                                            await openConversation(c.id);
                                            onRequestClose();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.rowLeft}>
                                            <ThemedText numberOfLines={1}>
                                                {c.title ?? `Conversation ${c.id.slice(0, 6)}`}
                                            </ThemedText>
                                            {c.id === activeConversationId ? (
                                                <ThemedText style={{ opacity: 0.6 }}> (current)</ThemedText>
                                            ) : null}
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.trashBtn}
                                        onPress={() => {
                                            setDeleteTarget({ id: c.id, title: c.title ?? `Conversation ${c.id.slice(0, 6)}` });
                                        }}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                        activeOpacity={0.7}
                                    >
                                        <AntDesign name="delete" size={18} color="white" />

                                        < DeleteChatModel
                                            visible={!!deleteTarget}
                                            conversation={deleteTarget ?? { id: '', title: '' }}
                                            onCancel={() => setDeleteTarget(null)}
                                            onDeleteConfirmed={async (id) => {
                                                await deleteConversation(id);
                                                setDeleteTarget(null);
                                                onRequestClose();
                                            }}
                                        />

                                    </TouchableOpacity>
                                </View>
                            ))}

                        </View>
                    </TouchableOpacity>
                </TouchableOpacity >
            </Modal >

            {/* Render once, controlled by state */}


        </>
    );
};

export default ChatSelectionModel;

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-end',
        padding: 16,
    },
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
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        justifyContent: 'space-between',
    },

    rowLeftPress: { flex: 1 },      // makes left side clickable
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },

    trashBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },

    pickerDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginHorizontal: 14,
    },
});
