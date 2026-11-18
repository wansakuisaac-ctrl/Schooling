import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { ExcelExportService } from '../../services/excelExport';
import { HeartHandshake, Plus, Download, Printer } from 'lucide-react';
import { Donation } from '../../types';
import jsPDF from 'jspdf';

export const DonationsModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [donations, setDonations] = useState<Donation[]>(() => dbService.getDonations(schoolId));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState(50000);
  const [category, setCategory] = useState('STEM Lab & Science Equipment');
  const [notes, setNotes] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !amount) return;

    dbService.recordDonation(schoolId, {
      donor_name: donorName,
      amount: Number(amount),
      category,
      donation_date: new Date().toISOString().split('T')[0],
      notes,
    });

    setDonations(dbService.getDonations(schoolId));
    setIsModalOpen(false);
    setDonorName('');
    setNotes('');
  };

  const handleExport = () => {
    ExcelExportService.exportDonations(donations);
  };

  const handlePrintReceipt = (d: Donation) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    doc.setFillColor(20, 83, 45);
    doc.rect(0, 0, 148, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.text(currentSchool.name.toUpperCase(), 74, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL PHILANTHROPIC DONATION RECEIPT', 74, 26, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Receipt No: ${d.receipt_no}`, 14, 40);
    doc.text(`Date: ${d.donation_date}`, 14, 48);
    doc.text(`Donor: ${d.donor_name}`, 14, 56);
    doc.text(`Earmarked Initiative: ${d.category}`, 14, 64);
    doc.text(`Amount Received: KES ${d.amount.toLocaleString()}`, 14, 72);
    if (d.notes) doc.text(`Notes: ${d.notes}`, 14, 80);

    doc.text('Thank you for advancing Kenyan CBC educational infrastructure.', 74, 120, { align: 'center' });
    doc.save(`${d.receipt_no}.pdf`);
  };

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <HeartHandshake className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Alumni & Grants Philanthropy Register</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track external development donations, bursary sponsorships, and generate official contribution receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Export Donations Excel
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Log Contribution
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-w-sm">
        <span className="text-xs text-slate-500 font-medium">Total Philanthropic Inflow</span>
        <div className="text-2xl font-black text-emerald-700 mt-1">
          KES {totalDonations.toLocaleString()}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Receipt No</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Donor / Philanthropist</th>
              <th className="py-3 px-4">Earmarked Purpose</th>
              <th className="py-3 px-4">Contribution (KES)</th>
              <th className="py-3 px-4 text-right">Receipt PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {donations.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.receipt_no}</td>
                <td className="py-3 px-4">{d.donation_date}</td>
                <td className="py-3 px-4 font-bold text-slate-900">{d.donor_name}</td>
                <td className="py-3 px-4">{d.category}</td>
                <td className="py-3 px-4 font-black text-emerald-800">KES {d.amount.toLocaleString()}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handlePrintReceipt(d)}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-800 font-bold inline-flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Record Philanthropic Donation</h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Donor / Entity Name</label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Class of 2020 Alumni / Safaricom Foundation"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Earmarked Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Science Laboratory Expansion"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Conditions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional stipulations..."
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
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
                  Confirm Donation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
