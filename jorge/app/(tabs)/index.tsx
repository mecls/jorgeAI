import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { useEffect, useRef, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import FeaturesModel from '@/components/FeaturesModel';
import { useDatabase } from '@/providers/DatabaseProvider'; // CHANGED: removed DatabaseProvider import
import ChatSelectionModel from '@/components/ChatSelectionModel';
import RenameChatModel from '@/components/RenameChatModel';

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
    activeConversationId,
    activeConversationTitle,
    messages,
    loading,
    refreshConversations,
    openConversation,
    sendMessage,
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
      <View style={styles.topBar}>
        {/* Left icon (opens chat picker) */}
        <TouchableOpacity style={styles.topBarLeft} onPress={() => setConvoPickerVisible(true)}>
          <Entypo name="chat" size={24} color="white" />
        </TouchableOpacity>

        {/* Center title */}

        <View style={styles.topBarCenter}>
          <TouchableOpacity
            onPress={() => {
              if (!activeConversationId) return; // no convo yet
              startRename(activeConversationId, activeConversationTitle); // CHANGED: set id + prefill title
            }}
          >
            <ThemedText numberOfLines={1} style={styles.topBarTitle}>
              {activeConversationTitle}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

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
          <TouchableOpacity style={styles.sendButton} onPress={() => setFeaturesVisible(true)}>
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

          <TouchableOpacity style={styles.sendButton} >
            <FontAwesome name="microphone" size={21} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={isSending}>
            <MaterialIcons name="send" size={24} color={isSending ? 'rgba(255,255,255,0.4)' : 'white'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {featuresVisible && (
        <FeaturesModel visible={featuresVisible} onRequestClose={() => setFeaturesVisible(false)} />
      )}
      {convoPickerVisible && (
        <ChatSelectionModel convoPickerVisible={convoPickerVisible} onRequestClose={() => setConvoPickerVisible(false)} />
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
    top: 48,
  },
  textBoxContainer: {
    width: '95%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#353535',
    justifyContent: 'center',
    paddingHorizontal: 12,
    top: 24
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
  topBar: {
    position: 'absolute',
    top: 70,          // adjust for your safe-area preference
    left: 0,
    right: 0,
    height: 44,
    zIndex: 10,
    justifyContent: 'center',
  },
  topBarLeft: {
    position: 'absolute',
    left: 24,
    height: 44,
    justifyContent: 'center',
  },
  topBarCenter: {
    alignSelf: 'center',
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

});
