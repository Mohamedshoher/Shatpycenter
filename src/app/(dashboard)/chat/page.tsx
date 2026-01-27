'use client';

import { useState, useEffect, useMemo } from 'react';
import { useChat } from '@/features/chat/hooks/useChat';
import { ConversationList } from '@/features/chat/components/ConversationList';
import { MessageArea } from '@/features/chat/components/MessageArea';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { Search, Loader, AlertCircle, X, UserPlus, Users, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { chatService } from '@/features/chat/services/chatService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { Teacher, Student, Group } from '@/types';
import { useUserPresence } from '@/features/chat/hooks/useUserPresence';

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



  const { data: teachersList = [] } = useTeachers();
  const { data: studentsList = [] } = useStudents();
  const { data: groupsList = [] } = useGroups();

  const queryClient = useQueryClient();
  const [view, setView] = useState<'conversations' | 'contacts' | 'parents'>('conversations');

  const startConversation = async (participant: any) => {
    if (!user) return;
    try {
      const convo = await chatService.getOrCreateConversation(
        [user.uid, participant.id],
        [user.displayName, participant.fullName],
        participant.role === 'parent' ? 'teacher-parent' : 'director-teacher'
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

  const filteredConversations = useMemo(() => {
    const clean = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';
    const myId = clean(userId);
    const myAltId = user?.teacherId ? clean(user.teacherId) : '';
    const myName = (user?.displayName || '').trim();

    return conversations
      .filter((conv) =>
        conv.participantNames.some((name) =>
          name.includes(searchQuery)
        )
      )
      .sort((a, b) => {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });
  }, [conversations, searchQuery, userId, user]);

  const filteredTeachers = useMemo(() => {
    const currentTeacherId = user?.teacherId || user?.uid || '';
    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const cleanCurrentId = cleanId(currentTeacherId);

    let list = teachersList.filter((t: any) => {
      const isSearchMatch = t.fullName.includes(searchQuery);
      const isNotMe = cleanId(t.id) !== cleanCurrentId;
      return isSearchMatch && isNotMe;
    });

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

  const filteredParents = useMemo(() => {
    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const currentTeacherId = cleanId(user?.teacherId || user?.uid || '');

    // 1. تحديد مجموعات هذا المدرس
    const myGroups = groupsList.filter(g => cleanId(g.teacherId || '') === currentTeacherId);

    // 2. تحديد طلاب هذه المجموعات (أو كل الطلاب للمدير)
    const myStudents = studentsList.filter(s =>
      (user?.role === 'director' || user?.role === 'supervisor') ||
      (s.groupId && myGroups.some(g => g.id === s.groupId))
    );

    // 3. إنشاء قائمة أولياء الأمور
    const uniqueParents = new Map();
    myStudents.forEach(student => {
      if (student.parentPhone && !uniqueParents.has(student.parentPhone)) {
        uniqueParents.set(student.parentPhone, {
          id: student.parentPhone,
          fullName: `ولي أمر ${student.fullName}`,
          role: 'parent',
          phone: student.parentPhone
        });
      }
    });

    return Array.from(uniqueParents.values()).filter((p: any) =>
      p.fullName.includes(searchQuery)
    );
  }, [studentsList, groupsList, searchQuery, user]);

  const renderSideContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      );
    }

    if (view === 'conversations') {
      return (
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversation?.id}
          onSelect={selectConversation}
        />
      );
    }

    if (view === 'contacts') {
      return (
        <div className="divide-y divide-gray-50">
          {filteredTeachers.map((teacher: any) => {
            const initials = teacher.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
            return (
              <button
                key={teacher.id}
                onClick={() => startConversation(teacher)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-all text-right group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  {initials}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-gray-900 text-sm">{teacher.fullName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">مدرس</p>
                </div>
                <UserPlus size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </button>
            );
          })}
          {filteredTeachers.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-400 font-bold text-sm">لا يوجد مدرسين مطابقين</p>
            </div>
          )}
        </div>
      );
    }

    if (view === 'parents') {
      return (
        <div className="divide-y divide-gray-50">
          {filteredParents.map((parent: any) => {
            const initials = parent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
            return (
              <button
                key={parent.id}
                onClick={() => startConversation(parent)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-all text-right group"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-black text-sm group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                  {initials}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-gray-900 text-sm">{parent.fullName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">ولي أمر</p>
                </div>
                <Users size={16} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
              </button>
            );
          })}
          {filteredParents.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-400 font-bold text-sm">لا يوجد أولياء أمور مطابقين</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ✨ حساب معرف المستخدم الآخر للهاتف في المستوى الأعلى
  const mobileOtherData = useMemo(() => {
    if (!selectedConversation) return { id: null, name: 'محادثة' };

    const cleanId = (id: string) => id ? id.replace('mock-', '') : '';
    const currentCleanId = cleanId(userId);
    const otherIndex = selectedConversation.participantIds.findIndex(id => cleanId(id) !== currentCleanId);
    const id = otherIndex !== -1 ? selectedConversation.participantIds[otherIndex] : null;
    const name = selectedConversation.participantNames[otherIndex === -1 ? 1 : otherIndex] || 'محادثة';

    return { id, name };
  }, [selectedConversation, userId]);

  // ✨ استدعاء هوك الحضور في المستوى الأعلى دائماً
  const { formattedLastSeen: mobileLastSeen, isOnline: mobileIsOnline, isTyping: mobileIsTyping } = useUserPresence(mobileOtherData.id);

  if (!isClient) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-right font-sans" dir="rtl">
      {/* Header - Optimized for Mobile & Desktop */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 md:px-8 md:py-6 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight">
              الرسائل
            </h1>
            <p className="text-[10px] md:text-sm text-gray-400 font-bold mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} رسائل جديدة`
                : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> جميع الرسائل مقروءة</span>}
            </p>
          </div>

          {/* Notification/Action buttons could go here */}
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              {/* Search toggle for mobile could go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 p-0 md:p-6 overflow-hidden relative">
        {/* Conversations Sidebar */}
        <div className={cn(
          "w-full md:w-96 flex flex-col bg-white md:rounded-[24px] shadow-sm border-x md:border border-gray-100 overflow-hidden z-10 transition-all duration-300",
          selectedConversation ? "hidden md:flex" : "flex"
        )}>
          {/* Tabs - Premium Segmented Control */}
          <div className="p-3 bg-white border-b border-gray-50">
            <div className="grid grid-cols-3 p-1 bg-gray-100/80 rounded-xl gap-1">
              <button
                onClick={() => setView('conversations')}
                className={cn(
                  "py-2 rounded-lg text-[10px] md:text-xs font-black transition-all duration-200 whitespace-nowrap",
                  view === 'conversations' ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
              >
                المحادثات
              </button>
              <button
                onClick={() => setView('contacts')}
                className={cn(
                  "py-2 rounded-lg text-[10px] md:text-xs font-black transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap",
                  view === 'contacts' ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
              >
                <UserPlus size={12} />
                المدرسين
              </button>
              <button
                onClick={() => setView('parents')}
                className={cn(
                  "py-2 rounded-lg text-[10px] md:text-xs font-black transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap",
                  view === 'parents' ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
              >
                <Users size={12} />
                الأولياء
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative group">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن محادثة أو شخص..."
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-transparent border-2 rounded-xl focus:bg-white focus:border-blue-500/20 focus:ring-0 font-bold text-sm text-right transition-all"
              />
            </div>
          </div>

          {/* Conversations/Contacts List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {renderSideContent()}
          </div>
        </div>

        {/* Messages Area - Desktop */}
        <div className="hidden md:flex flex-1 flex-col bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden relative">
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 z-20 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-700 text-xs font-bold leading-relaxed">{error}</p>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['conversations'] })} className="mr-auto text-red-600 hover:text-red-700">
                <X size={16} />
              </button>
            </div>
          )}

          {selectedConversation ? (
            <>
              <MessageArea
                key={selectedConversation.id}
                conversation={selectedConversation}
                messages={messages}
                currentUserId={userId}
                onTogglePin={togglePinMessage}
              />
              <div className="p-4 bg-white border-t border-gray-50">
                <MessageInput
                  onSend={sendMessage}
                  disabled={sending}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center text-blue-500 mb-6 animate-pulse">
                <MessageCircle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">ابدأ المحادثة</h3>
              <p className="text-gray-400 font-bold max-w-xs mx-auto text-sm leading-relaxed">
                اختر شخصاً من القائمة الجانبية أو ابحث عن زميل لبدء مراسلته فوراً
              </p>
            </div>
          )}
        </div>

        {/* Mobile Message View Overlay */}
        {selectedConversation && (
          <div className="md:hidden fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-left duration-300">
            {/* Mobile Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <button
                onClick={() => selectConversation(null as any)}
                className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-sm transition-colors"
              >
                <span className="text-lg">←</span>
                <span>رجوع</span>
              </button>

              <div className="flex-1 flex flex-col items-center mx-2 overflow-hidden">
                <h3 className="font-black text-gray-900 leading-tight truncate w-full text-center">
                  {mobileOtherData.name}
                </h3>
                <div className="flex items-center gap-1.5 justify-center">
                  {mobileIsOnline && (
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  )}
                  <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                    {mobileIsTyping ? <span className="text-blue-500">يكتب الآن...</span> : (mobileIsOnline ? 'نشط الآن' : mobileLastSeen)}
                  </span>
                </div>
              </div>

              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                <UserPlus size={18} />
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]/50">
              <MessageArea
                key={selectedConversation.id}
                conversation={selectedConversation}
                messages={messages}
                currentUserId={userId}
                showHeader={false}
                onTogglePin={togglePinMessage}
              />
              <div className="p-3 bg-white border-t border-gray-100 safe-bottom">
                <MessageInput
                  onSend={sendMessage}
                  disabled={sending}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
