'use client';

import { ChatMessage, Conversation } from '@/store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useEffect, useRef } from 'react';

interface MessageAreaProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  currentUserId: string;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
  conversation,
  messages,
  currentUserId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>اختر محادثة للبدء</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-semibold text-gray-900 text-right">
          {conversation.participantNames[1]}
        </h2>
        <p className="text-sm text-gray-600 text-right">
          {conversation.participantNames.length} مشاركين
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>لا توجد رسائل حتى الآن</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white rounded-bl-none'
                      : 'bg-gray-200 text-gray-900 rounded-br-none'
                  }`}
                >
                  {!isCurrentUser && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.senderName}
                    </p>
                  )}
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.timestamp), {
                      locale: ar,
                      addSuffix: false,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
