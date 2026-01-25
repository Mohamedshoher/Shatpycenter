'use client';

import { useState, useEffect, useMemo } from 'react';
import { useChat } from '@/features/chat/hooks/useChat';
import { ConversationList } from '@/features/chat/components/ConversationList';
import { MessageArea } from '@/features/chat/components/MessageArea';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { Search, Loader, AlertCircle, Zap, X, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { chatService } from '@/features/chat/services/chatService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Teacher } from '@/types';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const userId = user?.uid || '';
  const userRole = (user?.role === 'director' || user?.role === 'supervisor') ? 'director' : 'teacher';

  const {
    conversations,
    selectedConversation,
    messages,
    unreadCount,
    loading,
    sending,
    error,
    selectConversation,
    sendMessage,
    togglePinMessage,
  } = useChat(userId, userRole as any);

  // Mock automation notifications
  const automationNotifications = [
    {
      id: 'notif-1',
      teacher: 'أحمد علي',
      action: 'تم خصم ربع يوم',
      reason: 'عدم تسليم التقرير اليومي',
      timestamp: new Date(),
    },
    {
      id: 'notif-2',
      teacher: 'فاطمة محمد',
      action: 'تم خصم ربع يوم',
      reason: 'عدم تسليم التقرير اليومي',
      timestamp: new Date(Date.now() - 60000),
    },
  ];

  const { data: teachersList = [] } = useTeachers();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'conversations' | 'contacts'>('conversations');

  const startConversation = async (teacher: any) => {
    if (!user) return;
    try {
      const convo = await chatService.getOrCreateConversation(
        [user.uid, teacher.id],
        [user.displayName, teacher.fullName],
        'director-teacher'
      );

      // إجبار النظام على اختيار المحادثة الجديدة فوراً
      selectConversation(convo);

      // التبديل إلى تبويب المحادثات لإظهار النتيجة
      setView('conversations');

      // مسح نص البحث لراحة المستخدم
      setSearchQuery('');
    } catch (err) {
      console.error("خطأ أثناء بدء المحادثة:", err);
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredConversations = conversations.filter((conv) =>
    conv.participantNames.some((name) =>
      name.includes(searchQuery)
    )
  );

  const filteredTeachers = useMemo(() => {
    // التأكد من أن المدرس الحالي لا يراسل نفسه في القائمة
    const currentTeacherId = user?.teacherId || user?.uid || '';
    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const cleanCurrentId = cleanId(currentTeacherId);

    let list = teachersList.filter((t: any) => {
      const isSearchMatch = t.fullName.includes(searchQuery);
      const isNotMe = cleanId(t.id) !== cleanCurrentId;
      return isSearchMatch && isNotMe;
    });

    // إضافة المدير العام في بداية القائمة للمدرسين
    if (user?.role === 'teacher') {
      const directorContact = {
        id: 'director',
        fullName: 'المدير العام',
        phone: 'الإدارة العليا',
        role: 'director',
        assignedGroups: [],
        status: 'active'
      } as any;
      if (directorContact.fullName.includes(searchQuery)) {
        list = [directorContact, ...list];
      }
    }

    return list;
  }, [teachersList, searchQuery, user]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black text-gray-900">
            الرسائل
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-bold"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="text-sm">الأتمتة ({automationNotifications.length})</span>
            </button>
          </div>
        </div>
        <p className="text-gray-500 font-bold">
          {unreadCount > 0 ? `${unreadCount} رسائل جديدة` : 'جميع الرسائل مقروءة'}
        </p>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-full md:w-96 flex flex-col bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex p-2 bg-gray-50/50 gap-1 border-b border-gray-100">
            <button
              onClick={() => setView('conversations')}
              className={cn(
                "flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all",
                view === 'conversations' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              المحادثات
            </button>
            <button
              onClick={() => setView('contacts')}
              className={cn(
                "flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                view === 'contacts' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <UserPlus size={16} />
              المدرسين
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={view === 'conversations' ? "ابحث عن محادثة..." : "ابحث عن مدرس..."}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-sm text-right"
              />
            </div>
          </div>

          {/* Conversations/Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : view === 'conversations' ? (
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversation?.id}
                onSelect={selectConversation}
              />
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredTeachers.map((teacher: any) => (
                  <button
                    key={teacher.id}
                    onClick={() => startConversation(teacher)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-all text-right group"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <UserPlus size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{teacher.fullName}</h4>
                      <p className="text-xs text-gray-400 font-bold">مدرس - {teacher.phone}</p>
                    </div>
                  </button>
                ))}
                {filteredTeachers.length === 0 && (
                  <div className="p-8 text-center text-gray-400 font-bold">لا يوجد مدرسين بهذا الاسم</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hidden md:flex">
          {error && (
            <div className="bg-red-50 border-b border-red-200 p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {selectedConversation ? (
            <>
              <MessageArea
                key={selectedConversation.id} // إجبار المكون على إعادة التحميل بالكامل عند تغيير المحادثة
                conversation={selectedConversation}
                messages={messages}
                currentUserId={userId}
                onTogglePin={togglePinMessage}
              />
              <MessageInput
                onSend={sendMessage}
                disabled={sending}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">اختر محادثة للبدء</p>
                <p className="text-sm">سيظهر محتوى الرسائل هنا</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Message View */}
      {selectedConversation && (
        <div className="md:hidden fixed inset-0 bg-white z-[60] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shadow-sm shrink-0">
            <button
              onClick={() => selectConversation(null as any)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-xl font-bold text-sm"
            >
              العودة
            </button>
            <div className="text-right">
              <h3 className="font-bold text-gray-900 leading-none">
                {(() => {
                  const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
                  const currentCleanId = cleanId(userId);
                  const otherIndex = selectedConversation.participantIds.findIndex(id => cleanId(id) !== currentCleanId);
                  return selectedConversation.participantNames[otherIndex === -1 ? 1 : otherIndex] || 'محادثة';
                })()}
              </h3>
              <span className="text-[10px] text-gray-400 font-bold">نشط الآن</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <MessageArea
              key={selectedConversation.id}
              conversation={selectedConversation}
              messages={messages}
              currentUserId={userId}
              showHeader={false}
              onTogglePin={togglePinMessage}
            />
            <MessageInput
              onSend={sendMessage}
              disabled={sending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
