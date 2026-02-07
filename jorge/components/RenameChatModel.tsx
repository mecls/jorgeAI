import { View, TextInput, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import { ThemedText } from './themed-text';
import { useDatabase } from '@/providers/DatabaseProvider';

type Props = {
    renameVisible: boolean;
    onRequestClose: () => void;
    conversationId: string | null;
    currentTitle: string | null;
};

const RenameChatModel = ({ renameVisible, onRequestClose, conversationId, currentTitle }: Props) => {
    const { editConversation } = useDatabase();

    const [renameText, setRenameText] = React.useState('');

    // CHANGED: when modal opens / conversation changes, preload the input
    React.useEffect(() => {
        if (renameVisible) setRenameText(currentTitle ?? '');
    }, [renameVisible, currentTitle]);

    const confirmRename = async () => {
        if (!conversationId) return;
        const t = renameText.trim();
        if (!t) return;

        await editConversation(conversationId, t);

        onRequestClose(); // CHANGED: actually close
    };

    return (
        <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onRequestClose}>
                <TouchableOpacity activeOpacity={1} onPress={(e: any) => e?.stopPropagation?.()}>
                    <View style={styles.renameCard}>
                        <ThemedText style={{ marginBottom: 10 }}>Rename conversation</ThemedText>

                        <TextInput
                            value={renameText}
                            onChangeText={setRenameText}
                            placeholder="New name"
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            style={styles.renameInput}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={confirmRename}
                        />

                        <View style={styles.renameActions}>
                            <TouchableOpacity onPress={onRequestClose}>
                                <ThemedText style={{ opacity: 0.8 }}>Cancel</ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={confirmRename}>
                                <ThemedText>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default RenameChatModel;

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    renameCard: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        backgroundColor: '#353535',
        borderRadius: 16,
        padding: 14,
    },
    renameInput: {
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    renameActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 12,
    },
});
