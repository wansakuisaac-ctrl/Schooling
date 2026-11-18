import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  FileText,
  Upload,
  Download,
  FolderLock,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';

export const DocumentsModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;

  const documents = [
    {
      id: 'doc-1',
      title: 'School Registration Certificate - Ministry of Education',
      category: 'Institutional',
      date: '2024-01-15',
      size: '2.1 MB',
      type: 'PDF',
      confidential: false,
    },
    {
      id: 'doc-2',
      title: 'Term 1 2026 Academic Calendar & Important School Dates',
      category: 'Academic Schedule',
      date: '2026-01-05',
      size: '1.2 MB',
      type: 'PDF',
      confidential: false,
    },
    {
      id: 'doc-3',
      title: 'KNEC KJSEA Centre Approval & Inspection Report 2026',
      category: 'Accreditation',
      date: '2026-02-10',
      size: '880 KB',
      type: 'PDF',
      confidential: true,
    },
    {
      id: 'doc-4',
      title: 'Learner Birth Certificates & Medical History Archive (G1–G9)',
      category: 'Learner Records',
      date: '2026-03-01',
      size: '45.2 MB',
      type: 'ZIP',
      confidential: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <FolderLock className="w-4 h-4" />
            Registry &bull; Institutional Documents
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Documents &amp; Registry Archive
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official Ministry letters, accreditation certificates, KNEC guidelines, and secure records.
          </p>
        </div>

        <button
          onClick={() => alert('Document upload modal opened')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow"
        >
          <Upload className="w-4 h-4" />
          Upload Official Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {doc.category}
                </span>
                {doc.confidential ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                    <ShieldCheck className="w-3 h-3" />
                    Encrypted / Confidential
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Public Record
                  </span>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-1">{doc.title}</h3>
              <div className="text-[11px] text-slate-400">
                Uploaded: {doc.date} &bull; Size: {doc.size} &bull; Format: {doc.type}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Verified Official Record</span>
              <button
                onClick={() => alert(`Downloading: ${doc.title}`)}
                className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Download className="w-3.5 h-3.5" />
                Download Document
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
