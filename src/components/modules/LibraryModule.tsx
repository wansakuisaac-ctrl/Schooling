import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { BookOpen, Plus, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Clock } from 'lucide-react';
import { Book, BookLoan } from '../../types';

export const LibraryModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [books, setBooks] = useState<Book[]>(() => dbService.getBooks(schoolId));
  const [loans, setLoans] = useState<BookLoan[]>(() => dbService.getBookLoans(schoolId));
  const students = dbService.getStudents(schoolId);

  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // New book state
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Science',
    total_copies: 25,
  });

  // Issue state
  const [issueStudentId, setIssueStudentId] = useState(students[0]?.id || '');
  const [issueBookId, setIssueBookId] = useState(books[0]?.id || '');
  const [issueDueDate, setIssueDueDate] = useState('2026-03-25');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      dbService.createBook(schoolId, {
        ...newBook,
        available_copies: newBook.total_copies,
      });
      setBooks(dbService.getBooks(schoolId));
      setIsBookModalOpen(false);
      setStatusMsg({ type: 'success', text: `Added "${newBook.title}" to library catalog.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleIssueBook = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      dbService.issueBookLoan(schoolId, issueBookId, issueStudentId, issueDueDate);
      setBooks(dbService.getBooks(schoolId));
      setLoans(dbService.getBookLoans(schoolId));
      setIsIssueModalOpen(false);
      setStatusMsg({ type: 'success', text: 'Book loan issued successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleReturnBook = (loanId: string) => {
    try {
      const loan = dbService.returnBookLoan(schoolId, loanId);
      setBooks(dbService.getBooks(schoolId));
      setLoans(dbService.getBookLoans(schoolId));
      setStatusMsg({
        type: 'success',
        text: `Book returned successfully. ${loan.fine_amount > 0 ? `Late Fine: KES ${loan.fine_amount}` : 'No overdue fines.'}`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Library & KICD Course Books</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Course book inventory, student lending registry, automated inventory tracking & overdue fines (KES 20/day)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            Add New Title
          </button>
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            Issue Book Loan
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Book Catalog ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'loans' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active & Returned Loans ({loans.length})
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Title & Author</th>
                <th className="py-3 px-4">ISBN</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Total Copies</th>
                <th className="py-3 px-4">Available Copies</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {books.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{b.title}</div>
                    <div className="text-[11px] font-normal text-slate-500">{b.author}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">{b.isbn}</td>
                  <td className="py-3 px-4">{b.category}</td>
                  <td className="py-3 px-4 font-semibold">{b.total_copies}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-black ${
                        b.available_copies > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {b.available_copies} copies
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.available_copies > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.available_copies > 0 ? 'In Stock' : 'All Borrowed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Borrowing Learner</th>
                <th className="py-3 px-4">Borrowed Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Fine (KES)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loans.map((l) => {
                const book = books.find((b) => b.id === l.book_id);
                const std = students.find((s) => s.id === l.student_id);

                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{book?.title || 'Book'}</td>
                    <td className="py-3 px-4 font-medium">{std?.full_name} ({std?.admission_number})</td>
                    <td className="py-3 px-4">{l.borrowed_at}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{l.due_date}</td>
                    <td className="py-3 px-4 font-bold text-rose-700">
                      {l.fine_amount > 0 ? `KES ${l.fine_amount}` : 'None'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.status === 'returned'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {l.status === 'active' && (
                        <button
                          onClick={() => handleReturnBook(l.id)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold transition flex items-center gap-1 shadow-xs ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Mark Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Title Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add Book Title to Catalog</h3>
            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  placeholder="e.g. Moran Science Grade 7"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Author / Publisher</label>
                <input
                  type="text"
                  required
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  placeholder="e.g. KICD / Longhorn"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN Number</label>
                  <input
                    type="text"
                    required
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    placeholder="978-9966-..."
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Copies</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newBook.total_copies}
                    onChange={(e) => setNewBook({ ...newBook, total_copies: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Issue Book to Learner</h3>
            <form onSubmit={handleIssueBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Book Title</label>
                <select
                  value={issueBookId}
                  onChange={(e) => setIssueBookId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {books.filter((b) => b.available_copies > 0).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.available_copies} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Borrowing Learner</label>
                <select
                  value={issueStudentId}
                  onChange={(e) => setIssueStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Return Date</label>
                <input
                  type="date"
                  required
                  value={issueDueDate}
                  onChange={(e) => setIssueDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
