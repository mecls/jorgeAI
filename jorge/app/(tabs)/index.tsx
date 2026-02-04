import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import FeaturesModel from '@/components/FeaturesModel';
import { ThemedText } from '@/components/themed-text';

export default function HomeScreen() {
  const [messageText, setMessageText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    //Add user message to chat
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setMessageText(''); // Clear input immediately

    try {
      const response = await fetch('http://192.168.5.56:8000/chat', {  // Changed port to 8000
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
        })
      });

      const data = await response.json();

      //Add AI response to chat
      const aiMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      console.log(messages)
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'error', content: 'Failed to get response' }]);
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
              <ThemedText style={styles.messageText}>
                {msg.content}
              </ThemedText>
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
