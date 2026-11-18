import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Bell, Plus, Users, Send, CheckCircle2, X } from 'lucide-react';
import { Announcement } from '../../types';

export const AnnouncementsModule: React.FC = () => {
  const { currentSchool, currentUser, currentRole } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    dbService.getAnnouncements(schoolId)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'teachers' | 'parents'>('all');
  const [sendSms, setSendSms] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newAnc = dbService.createAnnouncement(schoolId, {
      title,
      body,
      audience,
      posted_by: currentUser?.full_name || 'School Principal',
      sms_sent: sendSms,
    });

    if (sendSms) {
      dbService.logNotification(schoolId, {
        channel: 'sms',
        phone_or_email: 'Broadcast-Audience-' + audience.toUpperCase(),
        message: `${title}: ${body.slice(0, 100)}...`,
        status: 'sent',
        provider_response: 'AfricasTalking broadcast batch ack 200 OK',
      });
    }

    setAnnouncements(dbService.getAnnouncements(schoolId));
    setIsModalOpen(false);
    setTitle('');
    setBody('');
    setSuccessMsg('Announcement published and notifications broadcast successfully.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">School Announcements & Circulars</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast official administrative notices to parents, teachers, and the entire school community
          </p>
        </div>

        {currentRole === 'SCHOOL_ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((anc) => (
          <div
            key={anc.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">{anc.title}</h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Posted by <strong>{anc.posted_by}</strong> on {new Date(anc.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Target: {anc.audience}
                </span>
                {anc.sms_sent && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    SMS Sent
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {anc.body}
            </p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Post School Notice</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Break Schedule & Academic Clinic"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  <option value="all">Whole School (Parents & Staff)</option>
                  <option value="parents">Parents Only</option>
                  <option value="teachers">Teaching Staff Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Circular Message Body</label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Detailed announcement content..."
                  className="w-full p-3 bg-slate-50 border rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="smsAnc"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                />
                <label htmlFor="smsAnc" className="font-semibold text-slate-700">
                  Broadcast via Africa&apos;s Talking SMS (Kenya)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
