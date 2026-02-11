import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
    Text,
    Modal,
    FlatList,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { useEffect, useRef, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import FeaturesModel from '@/components/FeaturesModel';
import { useDatabase } from '@/providers/DatabaseProvider';
import ChatSelectionModel from '@/components/ChatSelectionModel';
import RenameChatModel from '@/components/RenameChatModel';

export function AttachmentsModal({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const { activeConversationId, conversationFiles, deleteConversationFiles, refreshConversationFiles } = useDatabase();

    useEffect(() => {
        if (visible && activeConversationId) refreshConversationFiles(activeConversationId);
    }, [conversationFiles]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableOpacity style={attachStyles.backdrop} activeOpacity={0} onPress={onClose}>
                <View style={attachStyles.sheet}>
                    <ThemedText style={attachStyles.title}>Attachments</ThemedText>

                    {conversationFiles.length === 0 ? (
                        <ThemedText style={{ opacity: 0.6 }}>No files attached.</ThemedText>
                    ) : (
                        <FlatList
                            data={conversationFiles}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => (
                                <View style={attachStyles.row}>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText numberOfLines={1}>{item.filename}</ThemedText>
                                        <ThemedText style={attachStyles.meta}>
                                            {item.mime_type ?? 'unknown'} • {item.size_bytes ?? 0} bytes
                                        </ThemedText>
                                    </View>

                                    <TouchableOpacity
                                        onPress={async () => {
                                            if (!activeConversationId) return;
                                            await deleteConversationFiles(activeConversationId, item.id);
                                        }}
                                        style={attachStyles.trash}
                                    >
                                        <MaterialIcons name="delete" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const attachStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#1e1e1e',
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        minHeight: 260,
        maxHeight: '70%',
    },
    title: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    meta: { opacity: 0.6, fontSize: 12, marginTop: 2 },
    trash: { padding: 8, borderRadius: 8, backgroundColor: '#353535' },
});
