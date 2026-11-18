import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { MessageSquare, Send, User, Check, CheckCheck } from 'lucide-react';
import { Message } from '../../types';

export const MessagingModule: React.FC = () => {
  const { currentSchool, currentUser, currentRole } = useAuth();
  if (!currentSchool || !currentUser) return null;
  const schoolId = currentSchool.id;

  const allMessages = dbService.getMessages(schoolId, currentRole === 'SCHOOL_ADMIN' ? undefined : currentUser.id);
  const students = dbService.getStudents(schoolId);
  const users = dbService.getUsers(schoolId);

  // Group into conversations by (otherUserId, studentId)
  const conversationMap: Record<string, { otherUser: any; student: any; messages: Message[] }> = {};

  allMessages.forEach((msg) => {
    const otherUserId = msg.sender_user_id === currentUser.id ? msg.receiver_user_id : msg.sender_user_id;
    const key = `${otherUserId}_${msg.student_id}`;
    if (!conversationMap[key]) {
      const otherUser = users.find((u) => u.id === otherUserId) || { full_name: 'Staff/Parent', role: 'USER' };
      const student = students.find((s) => s.id === msg.student_id) || { full_name: 'Learner', admission_number: '' };
      conversationMap[key] = {
        otherUser,
        student,
        messages: [],
      };
    }
    conversationMap[key].messages.push(msg);
  });

  const conversationKeys = Object.keys(conversationMap);
  const [activeKey, setActiveKey] = useState<string>(conversationKeys[0] || '');
  const [newBody, setNewBody] = useState('');

  const activeConvo = conversationMap[activeKey];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim() || !activeConvo) return;

    const [otherUserId, studentId] = activeKey.split('_');

    dbService.sendMessage(schoolId, {
      sender_user_id: currentUser.id,
      receiver_user_id: otherUserId,
      student_id: studentId,
      body: newBody.trim(),
    });

    setNewBody('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Direct Parent ↔ Teacher Messaging</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Student-linked communications channel with read receipts and administrative audit logging
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Left: Conversations list */}
        <div className="md:col-span-4 border-r border-slate-200 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Active Threads ({conversationKeys.length})
          </div>

          {conversationKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No conversations found.
            </div>
          ) : (
            conversationKeys.map((key) => {
              const item = conversationMap[key];
              const lastMsg = item.messages[item.messages.length - 1];
              const isSelected = key === activeKey;

              return (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    isSelected ? 'bg-emerald-50 border border-emerald-200 shadow-2xs' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.otherUser.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(lastMsg?.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold truncate">
                    Re: {item.student.full_name}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {lastMsg?.body || 'No messages yet'}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Message Thread */}
        <div className="md:col-span-8 flex flex-col justify-between bg-slate-50/50">
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{activeConvo.otherUser.full_name}</h3>
                  <div className="text-xs text-slate-500">
                    Concerning Learner: <strong>{activeConvo.student.full_name}</strong> ({activeConvo.student.admission_number})
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {activeConvo.otherUser.role || 'Parent'}
                </span>
              </div>

              {/* Messages Body */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {activeConvo.messages.map((m) => {
                  const isMine = m.sender_user_id === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs ${
                          isMine
                            ? 'bg-emerald-700 text-white rounded-br-none shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
                        }`}
                      >
                        {m.body}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          m.read_at ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Check className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Box */}
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message to discuss learner's CBC competencies..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
