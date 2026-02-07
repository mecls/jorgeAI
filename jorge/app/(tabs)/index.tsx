import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Modal
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useEffect, useRef, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import FeaturesModel from '@/components/FeaturesModel';
import { useDatabase } from '@/providers/DatabaseProvider'; // CHANGED: removed DatabaseProvider import

function TypingDots() {
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 250, useNativeDriver: true }),
        ])
      );

    const p1 = pulse(a1, 0);
    const p2 = pulse(a2, 120);
    const p3 = pulse(a3, 240);

    p1.start(); p2.start(); p3.start();
    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, [a1, a2, a3]);

  return (
    <View style={dotStyles.row}>
      <Animated.View style={[dotStyles.dot, { opacity: a1 }]} />
      <Animated.View style={[dotStyles.dot, { opacity: a2 }]} />
      <Animated.View style={[dotStyles.dot, { opacity: a3 }]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
});

export default function HomeScreen() {
  const [messageText, setMessageText] = useState('');
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [convoPickerVisible, setConvoPickerVisible] = useState(false);

  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    refreshConversations,
    createConversation,
    openConversation,
    sendMessage,
  } = useDatabase();

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    refreshConversations(); // loads conversations for current EXPO_PUBLIC_USER_ID
  }, []);

  // CHANGED: only open conversation when the ID changes AND we have one.
  useEffect(() => {
    if (activeConversationId) openConversation(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // CHANGED: prevent sending while loading or while assistant placeholder exists
  const isSending = loading || (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '');

  const onSend = async () => {
    const text = messageText.trim();
    if (!text) return;

    setMessageText('');
    await sendMessage(text); // CHANGED: provider now guarantees convo exists
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView ref={scrollRef} style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {messages.length === 0 ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 50, opacity: 0.5 }}>
            {loading ? 'Loading...' : 'Start a conversation...'}
          </ThemedText>
        ) : (
          messages.map((msg, index) => (
            <View
              key={index}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userMessage : styles.aiMessage]}
            >
              {msg.role === 'assistant' && msg.content === '' ? (
                <TypingDots />
              ) : (
                <ThemedText>{msg.content}</ThemedText>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.textBoxContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.sendButton} onPress={() => setConvoPickerVisible(true)}>
            <AntDesign name="plus" size={18} color="white" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor={'#fff'}
              style={{ color: '#fff' }}
              placeholder="Type your message..."
              onSubmitEditing={onSend}
              returnKeyType="send"
              editable={!isSending} // CHANGED: lock input while sending/typing
            />
          </View>

          <TouchableOpacity style={styles.sendButton} onPress={() => setFeaturesVisible(true)}>
            <FontAwesome name="microphone" size={21} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={isSending}>
            <MaterialIcons name="send" size={24} color={isSending ? 'rgba(255,255,255,0.4)' : 'white'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Conversation picker modal */}
      <Modal
        visible={convoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConvoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setConvoPickerVisible(false)}
        >
          {/* CHANGED: prevent taps inside the card from closing the modal */}
          <TouchableOpacity activeOpacity={1} onPress={(e: any) => e?.stopPropagation?.()}>
            <View style={styles.picker}>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={async () => {
                  const convo = await createConversation('New chat');
                  await openConversation(convo.id);
                  setConvoPickerVisible(false);
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
                    setConvoPickerVisible(false);
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

      {featuresVisible && (
        <FeaturesModel visible={featuresVisible} onRequestClose={() => setFeaturesVisible(false)} />
      )}
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatContainer: {
    flex: 1,
    width: '95%',
    maxHeight: '80%',
    backgroundColor: 'transparent',
    padding: 16,
  },
  textBoxContainer: {
    width: '95%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#353535',
    marginTop: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: -48,
  },
  iconStyle: {
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#353535',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  messageText: {
    fontSize: 15,
  },
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
});
