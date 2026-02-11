import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker'

type Conversation = { id: string; title: string | null; updated_at: string };
type Message = { id?: number; role: 'user' | 'assistant' | 'system' | 'error'; content: string; created_at?: string };

export type ConversationFile = {
    id: number;
    filename: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
};

type DatabaseContextType = {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    activeConversationTitle: string;
    conversationFiles: ConversationFile[];

    loading: boolean;
    error: string | null;

    refreshConversations: () => Promise<void>;
    editConversation: (conversationId: string, title: string) => Promise<Conversation>;
    deleteConversation: (conversationId: string) => Promise<Conversation>
    createConversation: (title?: string) => Promise<Conversation>;
    openConversation: (conversationId: string) => Promise<void>;
    sendMessage: (text: string) => Promise<void>;

    refreshConversationFiles: (conversationId: string) => Promise<void>;
    uploadConversationFiles: (conversationId: string) => Promise<void>;
    deleteConversationFiles: (conversationId: string, fileId: number) => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
const USER_ID = process.env.EXPO_PUBLIC_USER_ID!;

async function mustJson(res: Response) {
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t}`);
    }
    return await res.json();
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conversationFiles, setConversationFiles] = useState<ConversationFile[]>([]);

    const activeConversationTitle =
        conversations.find(c => c.id === activeConversationId)?.title ?? 'New chat';

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

    const editConversation = useCallback(async (conversationId: string, title: string) => {
        const trimmed = title.trim()
        if (!trimmed) throw new Error('Title is required');

        setError(null);

        const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: trimmed }),
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(`HTTP ${res.status}: ${t}`);
        }

        const data = await res.json(); // { conversation: {...} }
        const updated: Conversation = data.conversation;

        // Update local cache so UI refreshes immediately
        setConversations(prev =>
            prev.map(c => (c.id === conversationId ? { ...c, title: updated.title, updated_at: updated.updated_at } : c))
        );

        return updated;
    }, []);

    const deleteConversation = useCallback(async (conversationId: string) => {
        if (!activeConversationId) throw new Error('You need to have an active chat to delete this one');

        setError(null);
        const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
            method: 'DELETE',
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(`HTTP ${res.status}: ${t}`);
        }

        const data = await res.json(); // { conversation: {...} }
        const updated: Conversation = data.conversation;

        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (activeConversationId === conversationId) {
            setActiveConversationId(prevActive => {
                // compute next from *current* conversations is tricky here, simplest:
                return null;
            });
            setMessages([]); // clear chat view
            // Optional: you can call refreshConversations() and then open first conversation
        }

        return data.conversation as Conversation;

    }, [API_BASE, activeConversationId])

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

    const refreshConversationFiles = useCallback(async (conversationId: string) => {
        setError(null);
        const res = await fetch(`${API_BASE}/conversations/${conversationId}/files`);
        const data = await mustJson(res);
        setConversationFiles((data.files ?? []) as ConversationFile[]);
    }, [conversationFiles]);

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

    const uploadConversationFiles = useCallback(async (conversationId: string) => {
        setError(null);

        const result = await DocumentPicker.getDocumentAsync({
            multiple: true,
            copyToCacheDirectory: true,
            type: [
                'application/pdf',
                'image/*',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ],
        }); // multiple selection returns assets[] [web:863]

        if (result.canceled) return;

        for (const a of result.assets ?? []) {
            const form = new FormData();
            form.append('file', {
                uri: a.uri,
                name: a.name ?? 'upload',
                type: a.mimeType ?? 'application/octet-stream',
            } as any);

            const res = await fetch(`${API_BASE}/conversations/${conversationId}/files`, {
                method: 'POST',
                body: form,
            });
            await mustJson(res);
        }

        await refreshConversationFiles(conversationId);
    }, [refreshConversationFiles]);

    const deleteConversationFiles = useCallback(
        async (conversationId: string, fileId: number) => {
            setError(null);
            const res = await fetch(`${API_BASE}/conversations/${conversationId}/files/${fileId}`, {
                method: 'DELETE',
            });
            await mustJson(res);
            await refreshConversationFiles(conversationId);
        },
        [refreshConversationFiles]
    );
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
        activeConversationTitle,
        activeConversationId,
        conversationFiles,
        messages,
        loading,
        error,

        refreshConversations,
        deleteConversation,
        editConversation,
        createConversation,
        openConversation,
        refreshConversationFiles,
        deleteConversationFiles,
        uploadConversationFiles,
        sendMessage,
    }), [conversations, activeConversationTitle, activeConversationId, messages, loading, error, refreshConversations, createConversation, openConversation, refreshConversationFiles, sendMessage]);

    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
    const ctx = useContext(DatabaseContext);
    if (!ctx) throw new Error('useDatabase must be used inside DatabaseProvider');
    return ctx;
}
