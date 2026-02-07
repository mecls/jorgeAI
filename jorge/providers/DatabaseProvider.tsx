import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Conversation = { id: string; title: string | null; updated_at: string };
type Message = { id?: number; role: 'user' | 'assistant' | 'system' | 'error'; content: string; created_at?: string };

type DatabaseContextType = {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    loading: boolean;
    error: string | null;

    refreshConversations: () => Promise<void>;
    createConversation: (title?: string) => Promise<Conversation>;
    openConversation: (conversationId: string) => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
const USER_ID = process.env.EXPO_PUBLIC_USER_ID!;

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshConversations = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_BASE}/conversations?user_id=${encodeURIComponent(USER_ID)}`);
            const data = await res.json();
            setConversations(data.conversations ?? []);
            // auto-select the newest conversation
            if (!activeConversationId && (data.conversations?.length ?? 0) > 0) {
                const firstId = data.conversations[0].id;
                setActiveConversationId(firstId);
            }
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, [activeConversationId]);

    const createConversation = useCallback(async (title?: string) => {
        setError(null);
        const res = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: USER_ID, title: title ?? null }),
        });
        const data = await res.json();
        const convo = data.conversation as Conversation;
        setConversations(prev => [convo, ...prev]);
        setActiveConversationId(convo.id);
        setMessages([]); // start fresh in UI
        return convo;
    }, []);

    const openConversation = useCallback(async (conversationId: string) => {
        setActiveConversationId(conversationId);
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages?limit=50`);
            const data = await res.json();
            setMessages(data.messages ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, []);

    const ensureActiveConversation = useCallback(async (): Promise<string> => {
        // If already selected, use it.
        if (activeConversationId) return activeConversationId;

        // If we already loaded conversations, pick the first one.
        if (conversations.length > 0) {
            const id = conversations[0].id;
            setActiveConversationId(id);
            // also load its messages
            const res = await fetch(`${API_BASE}/conversations/${id}/messages?limit=50`);
            const data = await res.json();
            setMessages(data.messages ?? []);
            return id;
        }

        // Otherwise create a new conversation.
        const res = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: USER_ID, title: 'New chat' }),
        });
        const data = await res.json();
        const convo = data.conversation;

        setConversations(prev => [convo, ...prev]);
        setActiveConversationId(convo.id);
        setMessages([]);
        return convo.id;
    }, [activeConversationId, conversations, API_BASE]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const convoId = await ensureActiveConversation(); // CHANGED: always have an id

        // optimistic bubbles
        setMessages(prev => [
            ...prev,
            { id: Date.now() as any, role: 'user', content: trimmed, created_at: new Date().toISOString() } as any,
            { id: (Date.now() + 1) as any, role: 'assistant', content: '', created_at: new Date().toISOString() } as any,
        ]);

        setError(null);

        try {
            const res = await fetch(`${API_BASE}/conversations/${convoId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: trimmed }),
            });

            if (!res.ok) {
                const t = await res.text();
                throw new Error(`HTTP ${res.status}: ${t}`);
            }

            const data = await res.json();

            // replace last placeholder bubble with assistant content
            setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = data.assistant_message; // server returns full object
                return next;
            });

            // refresh conversations list order (updated_at changed)
            refreshConversations();
        } catch (e: any) {
            setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'error', content: 'Failed to get response' } as any;
                return next;
            });
            setError(e?.message ?? 'Send failed');
        }
    }, [API_BASE, ensureActiveConversation, refreshConversations]);

    const value = useMemo(() => ({
        conversations,
        activeConversationId,
        messages,
        loading,
        error,
        refreshConversations,
        createConversation,
        openConversation,
        sendMessage,
    }), [conversations, activeConversationId, messages, loading, error, refreshConversations, createConversation, openConversation, sendMessage]);

    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
    const ctx = useContext(DatabaseContext);
    if (!ctx) throw new Error('useDatabase must be used inside DatabaseProvider');
    return ctx;
}
