import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import FeaturesModel from '@/components/FeaturesModel';
import { ThemedText } from '@/components/themed-text';
import React, { useEffect, useRef } from 'react';


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
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    // setIsGenerating(true)
    // //Add user message to chat
    // const userMessage = { role: 'user', content: messageText };
    // setMessages(prev => [...prev, userMessage]);
    // setMessageText(''); // Clear input immediately
    // (Optional) add placeholder assistant bubble immediately
    setMessages(prev => [...prev, { role: 'user', content: messageText }, { role: 'assistant', content: '' }]);
    const prompt = messageText;
    setMessageText('');

    try {
      const response = await fetch('http://192.168.5.56:8000/chat', {  // Changed port to 8000
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
        })
      });

      const data = await response.json();

      // Replace last empty assistant bubble with real content
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: data.response };
        return next;
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'error', content: 'Failed to get response' }]);
    }
    finally {
      setIsGenerating(false)
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {messages.length === 0 ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 50, opacity: 0.5 }}>
            Start a conversation...
          </ThemedText>
        ) : (
          messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userMessage : styles.aiMessage
              ]}
            >
              {/* {msg.role === 'assistant' && msg.content === '' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText>{msg.content}</ThemedText>
              )} */}
              {msg.role === 'assistant' && msg.content === '' ? <TypingDots /> : <ThemedText>{msg.content}</ThemedText>}
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
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => { setModalVisible(true) }}
          >
            <AntDesign name="plus" size={18} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor={'#fff'}
              style={{ color: '#fff' }}
              placeholder="Type your message..." />
          </View>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => { setModalVisible(true) }}
          >
            <FontAwesome name="microphone" size={21} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
          >
            <MaterialIcons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {modalVisible && (
        <FeaturesModel
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
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
  }
});
