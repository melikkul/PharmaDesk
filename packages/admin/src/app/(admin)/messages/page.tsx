'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Participant {
  id: number;
  pharmacyId: number;
  pharmacyName: string;
  joinedAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

interface Conversation {
  id: number;
  type: 'Direct' | 'Group';
  title: string;
  groupId?: number;
  groupName?: string;
  createdAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants: Participant[];
  messageCount: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MessagesPage() {
  const { api } = useAuth();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/chat/admin/conversations');
      setConversations(response.data || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.message || 'Konuşmalar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(`/api/chat/admin/conversations/${conversationId}/messages`);
      setMessages(response.data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  // ═══════════════════════════════════════════════════════════════
  // FILTERING
  // ═══════════════════════════════════════════════════════════════

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.groupName?.toLowerCase().includes(query) ||
      conv.participants?.some(p => p.pharmacyName?.toLowerCase().includes(query))
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    }
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get display title for conversation
  // For Group: Group name
  // For Direct: Both participant names joined with " ↔ "
  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'Group') {
      return conv.groupName || conv.title || 'Grup Sohbeti';
    }
    // Direct: Show both participant names
    if (conv.participants && conv.participants.length >= 2) {
      return conv.participants.map(p => p.pharmacyName).join(' ↔ ');
    }
    return conv.title || 'Bireysel Sohbet';
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-600 font-medium">Konuşmalar yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Hata Oluştu</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchConversations}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              💬 Sohbet İzleme
            </h1>
            <p className="text-slate-500 mt-1">Sistemdeki tüm konuşmaları salt okunur olarak izleyin</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl">
              <span>👁️</span>
              <span className="font-medium text-sm">Salt Okunur Mod</span>
            </div>
            <button 
              onClick={fetchConversations}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <span>🔄</span>
              <span className="font-medium text-slate-700">Yenile</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">💬</div>
              <div>
                <p className="text-sm text-slate-500">Toplam Konuşma</p>
                <p className="text-2xl font-bold text-slate-900">{conversations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">👥</div>
              <div>
                <p className="text-sm text-slate-500">Grup Sohbetleri</p>
                <p className="text-2xl font-bold text-purple-600">
                  {conversations.filter(c => c.type === 'Group').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">👤</div>
              <div>
                <p className="text-sm text-slate-500">Bireysel Sohbetler</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {conversations.filter(c => c.type === 'Direct').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">📨</div>
              <div>
                <p className="text-sm text-slate-500">Toplam Mesaj</p>
                <p className="text-2xl font-bold text-amber-600">
                  {conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Left Panel - Conversation List */}
            <div className="w-[380px] border-r border-slate-100 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    placeholder="Konuşma ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <span className="text-4xl mb-2">📭</span>
                    <p>Konuşma bulunamadı</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${
                          conv.type === 'Group' 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-700'
                        }`}>
                          {conv.type === 'Group' ? '👥' : '👤'}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 truncate">{getConversationTitle(conv)}</h3>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                              {formatDate(conv.lastMessageAt || conv.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {conv.lastMessagePreview || 'Henüz mesaj yok'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              conv.type === 'Group' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {conv.type === 'Group' ? 'Grup' : 'Bireysel'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {conv.participants?.length || 0} katılımcı
                            </span>
                            <span className="text-xs text-slate-400">
                              • {conv.messageCount || 0} mesaj
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Messages */}
            <div className="flex-1 flex flex-col bg-slate-50">
              {!selectedConversation ? (
                /* Placeholder */
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <span className="text-5xl">💬</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">İzlemek için bir sohbet seçin</h3>
                  <p className="text-sm">Sol panelden bir konuşma seçerek mesajları görüntüleyin</p>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="p-4 bg-white border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          selectedConversation.type === 'Group' 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-700'
                        }`}>
                          {selectedConversation.type === 'Group' ? '👥' : '👤'}
                        </div>
                        <div>
                          <h2 className="font-semibold text-slate-900">{getConversationTitle(selectedConversation)}</h2>
                          <p className="text-xs text-slate-500">
                            {selectedConversation.participants?.map(p => p.pharmacyName).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          selectedConversation.type === 'Group' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {selectedConversation.type === 'Group' ? '👥 Grup Sohbeti' : '👤 Bireysel'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-slate-500">Mesajlar yükleniyor...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <span className="text-4xl mb-2">📭</span>
                        <p>Bu konuşmada henüz mesaj yok</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                          {/* Message Bubble */}
                          <div className="max-w-[80%] bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                            {/* Sender Name */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-blue-600">
                                {msg.senderName}
                              </span>
                              <span className="text-xs text-slate-400">
                                (ID: {msg.senderId})
                              </span>
                            </div>
                            {/* Content */}
                            <p className="text-slate-700 text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            {/* Time & Read Status */}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-xs text-slate-400">
                                {formatMessageTime(msg.sentAt)}
                              </span>
                              {msg.isRead && (
                                <span className="text-blue-500 text-xs">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Read-Only Footer */}
                  <div className="p-4 bg-amber-50 border-t border-amber-200">
                    <div className="flex items-center justify-center gap-2 text-amber-700">
                      <span className="text-lg">🔒</span>
                      <span className="font-medium">Bu konuşma salt okunurdur - Yalnızca izleme modu</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
