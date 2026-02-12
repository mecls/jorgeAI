import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Modal,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import React, { useEffect, useRef, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import FeaturesModel from '@/components/FeaturesModel';
import { useDatabase } from '@/providers/DatabaseProvider';
import ChatSelectionModel from '@/components/ChatSelectionModel';
import RenameChatModel from '@/components/RenameChatModel';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { AttachmentsModal } from '@/components/AttachmentsModal';

type MessageIntent = 'summary' | 'study_plan' | 'practice_questions' | 'custom';
type OutputMode = 'quick' | 'full' | 'study_ready';

const QUICK_PROMPTS: { label: string; text: string; intent: MessageIntent }[] = [
  {
    label: 'Summarize the slides',
    text: 'Give me a concise summary of the slides and highlight key takeaways.',
    intent: 'summary',
  },
  {
    label: 'Make a study plan',
    text: 'Make a 7-day study plan for this topic with daily goals and revision checkpoints.',
    intent: 'study_plan',
  },
  {
    label: 'Generate practice questions',
    text: 'Create 10 exam-style practice questions with answers based on the slides.',
    intent: 'practice_questions',
  },
];

const OUTPUT_MODE_META: Record<OutputMode, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  quick: { label: 'Quick', icon: 'flash-on' },
  full: { label: 'Full', icon: 'article' },
  study_ready: { label: 'Study ready', icon: 'school' },
};

export default function HomeScreen() {
  const [messageText, setMessageText] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<MessageIntent>('custom');
  const [selectedOutputMode, setSelectedOutputMode] = useState<OutputMode>('full');
  const [modeDropdownVisible, setModeDropdownVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [attachmentsVisible, setAttachmentsVisible] = useState(false);
  const [convoPickerVisible, setConvoPickerVisible] = useState(false);

  const {
    activeConversationId,
    activeConversationTitle,
    messages,
    loading,
    refreshConversations,
    openConversation,
    sendMessage,
    conversationFiles,
  } = useDatabase();

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [renameCurrentTitle, setRenameCurrentTitle] = useState<string | null>(null);
  const startRename = (id: string, title?: string | null) => {
    setRenameConversationId(id);
    setRenameCurrentTitle(title ?? null);
    setRenameVisible(true);
  };

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) openConversation(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const isSending =
    loading ||
    (messages.length > 0 &&
      messages[messages.length - 1].role === 'assistant' &&
      messages[messages.length - 1].content === '');

  const hasText = messageText.trim().length > 0;

  const onSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    setMessageText('');
    await sendMessage(text, { intent: selectedIntent, output_mode: selectedOutputMode });
    setSelectedIntent('custom');
  };

  const onQuickPromptPress = (text: string, intent: MessageIntent) => {
    setMessageText(text);
    setSelectedIntent(intent);
  };

  const currentMode = OUTPUT_MODE_META[selectedOutputMode];

  return (
    <ThemedView style={styles.container}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarLeft} onPress={() => setConvoPickerVisible(true)}>
          <Entypo name="chat" size={22} color="white" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <TouchableOpacity
            onPress={() => {
              if (!activeConversationId) return;
              startRename(activeConversationId, activeConversationTitle);
            }}
          >
            <ThemedText numberOfLines={1} style={styles.topBarTitle}>
              {activeConversationTitle}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.topBarRightRow}>
          {/* Mode selector pill */}
          <TouchableOpacity style={styles.modePill} onPress={() => setModeDropdownVisible(true)}>
            <MaterialIcons name={currentMode.icon} size={14} color="white" />
            <Text style={styles.modePillText}>{currentMode.label}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Attachments */}
          <TouchableOpacity
            onPress={() => setAttachmentsVisible(true)}
            disabled={!activeConversationId}
            style={styles.topBarAttach}
          >
            <MaterialIcons
              name="attach-file"
              size={22}
              color={!activeConversationId ? 'rgba(255,255,255,0.35)' : 'white'}
            />
            {activeConversationId && conversationFiles.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{conversationFiles.length}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Chat messages ── */}
      <ScrollView ref={scrollRef} style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {messages.length === 0 ? (
          <ThemedText style={styles.emptyStateText}>
            {loading ? 'Loading...' : 'Start a conversation...'}
          </ThemedText>
        ) : (
          messages.map((msg, index) => (
            <View
              key={index}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userMessage : styles.aiMessage]}
            >
              {msg.role === 'assistant' && msg.content === '' ? (
                <ThinkingIndicator />
              ) : (
                <ThemedText>{msg.content}</ThemedText>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Quick prompt bubbles (empty state only) ── */}
      {messages.length === 0 && !loading && (
        <View style={styles.predefinedContainer}>
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt.intent}
              style={styles.quickPromptBubble}
              activeOpacity={0.7}
              onPress={() => onQuickPromptPress(prompt.text, prompt.intent)}
            >
              <ThemedText style={styles.quickPromptText}>{prompt.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Input area ── */}
      <KeyboardAvoidingView
        style={styles.inputContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.plusButton} onPress={() => setFeaturesVisible(true)}>
            <AntDesign name="plus" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TextInput
            value={messageText}
            onChangeText={(t) => {
              setMessageText(t);
              if (selectedIntent !== 'custom' && t !== messageText) {
                // User is editing a prefilled prompt, keep intent
              }
            }}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.textInput}
            placeholder="Ask anything..."
            onSubmitEditing={onSend}
            returnKeyType="send"
            editable={!isSending}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendButton, hasText && !isSending && styles.sendButtonActive]}
            onPress={onSend}
            disabled={isSending || !hasText}
          >
            <MaterialIcons
              name="arrow-upward"
              size={24}
              color={hasText && !isSending ? '#fff' : 'rgba(255,255,255,0.25)'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Mode dropdown modal ── */}
      <Modal
        visible={modeDropdownVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModeDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setModeDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>Output mode</Text>
            {(['quick', 'full', 'study_ready'] as OutputMode[]).map((mode) => {
              const meta = OUTPUT_MODE_META[mode];
              const isActive = selectedOutputMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedOutputMode(mode);
                    setModeDropdownVisible(false);
                  }}
                >
                  <MaterialIcons
                    name={meta.icon}
                    size={20}
                    color={isActive ? '#6b7cff' : 'rgba(255,255,255,0.6)'}
                  />
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                    {meta.label}
                  </Text>
                  {isActive && <MaterialIcons name="check" size={18} color="#6b7cff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Existing modals ── */}
      {featuresVisible && (
        <FeaturesModel
          visible={featuresVisible}
          onRequestClose={() => setFeaturesVisible(false)}
        />
      )}

      <AttachmentsModal visible={attachmentsVisible} onClose={() => setAttachmentsVisible(false)} />

      {convoPickerVisible && (
        <ChatSelectionModel
          convoPickerVisible={convoPickerVisible}
          onRequestClose={() => setConvoPickerVisible(false)}
        />
      )}

      {renameVisible && (
        <RenameChatModel
          renameVisible={renameVisible}
          conversationId={renameConversationId}
          currentTitle={renameCurrentTitle}
          onRequestClose={() => {
            setRenameVisible(false);
            setRenameConversationId(null);
            setRenameCurrentTitle(null);
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ── Top bar ── */
  topBar: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    height: 44,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topBarLeft: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  topBarRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarAttach: { position: 'relative' },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modePillText: { color: 'white', fontSize: 12, fontWeight: '600' },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#ff4d4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '700' },

  /* ── Chat area ── */
  chatContainer: {
    flex: 1,
    width: '95%',
    maxHeight: '80%',
    backgroundColor: 'transparent',
    padding: 16,
    top: 48,
  },
  emptyStateText: { textAlign: 'center', marginTop: 50, opacity: 0.5 },
  messageBubble: { padding: 12, borderRadius: 16, marginVertical: 8, maxWidth: '80%' },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#353535' },
  aiMessage: { alignSelf: 'flex-start', backgroundColor: 'transparent' },

  /* ── Quick prompt bubbles ── */
  predefinedContainer: {
    width: '95%',
    marginBottom: 12,
    gap: 8,
  },
  quickPromptBubble: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickPromptText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
    textAlign: 'center',
  },

  /* ── Input area ── */
  inputContainer: {
    width: '95%',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 50,
    gap: 4,
  },
  plusButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#6b7cff',
  },

  /* ── Mode dropdown ── */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: 220,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(107,124,255,0.12)',
  },
  dropdownItemText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
