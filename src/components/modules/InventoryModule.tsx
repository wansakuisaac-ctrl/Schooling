import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Package, Plus, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { InventoryItem } from '../../types';

export const InventoryModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [items, setItems] = useState<InventoryItem[]>(() => dbService.getInventoryItems(schoolId));
  const users = dbService.getUsers(schoolId);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // New Item
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Laboratory Supplies');
  const [quantity, setQuantity] = useState(50);
  const [unitPrice, setUnitPrice] = useState(250);

  // Issue Item
  const [issueItemId, setIssueItemId] = useState(items[0]?.id || '');
  const [issueUserId, setIssueUserId] = useState(users[0]?.id || '');
  const [issueQty, setIssueQty] = useState(2);
  const [issueNotes, setIssueNotes] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    dbService.createInventoryItem(schoolId, {
      name: itemName,
      category,
      quantity,
      unit_price: unitPrice,
    });

    setItems(dbService.getInventoryItems(schoolId));
    setIsItemModalOpen(false);
    setItemName('');
    setStatusMsg({ type: 'success', text: `Item "${itemName}" added to inventory.` });
  };

  const handleIssueItem = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      dbService.issueInventoryItem(schoolId, issueItemId, issueUserId, issueQty, issueNotes);
      setItems(dbService.getInventoryItems(schoolId));
      setIsIssueModalOpen(false);
      setStatusMsg({ type: 'success', text: `Issued ${issueQty} units successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const lowStockItems = items.filter((i) => i.quantity < 10);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Inventory & Lab Equipment</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stationery, laboratory apparatus, sports gear, and classroom supplies with automated low-stock warnings (&lt;10)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsItemModalOpen(true)}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            Add Stock Item
          </button>
          <button
            onClick={() => {
              if (items.length > 0) setIssueItemId(items[0].id);
              setIsIssueModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            Issue Supplies
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
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Low Stock Warning:</strong> {lowStockItems.length} item(s) have fallen below the critical safety threshold of 10 units: <em>{lowStockItems.map((i) => `${i.name} (${i.quantity})`).join(', ')}</em>.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Item Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">In-Stock Quantity</th>
              <th className="py-3 px-4">Unit Cost (KES)</th>
              <th className="py-3 px-4">Total Asset Value</th>
              <th className="py-3 px-4 text-right">Stock Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">{i.name}</td>
                <td className="py-3 px-4">{i.category}</td>
                <td className="py-3 px-4">
                  <span className={`font-black ${i.quantity < 10 ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                    {i.quantity} units
                  </span>
                </td>
                <td className="py-3 px-4">KES {i.unit_price.toLocaleString()}</td>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  KES {(i.quantity * i.unit_price).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      i.quantity < 10 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {i.quantity < 10 ? 'Low Stock' : 'Optimal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add Stock Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Description</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Test Tubes & Beakers"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  <option value="Laboratory Supplies">Laboratory Supplies</option>
                  <option value="Stationery">Stationery & Office</option>
                  <option value="Sports">Sports & Physical Education</option>
                  <option value="Cleaning">Sanitation & Janitorial</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Price (KES)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Item
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
            <h3 className="font-bold text-base text-slate-900">Issue Inventory Supplies</h3>
            <form onSubmit={handleIssueItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Item</label>
                <select
                  value={issueItemId}
                  onChange={(e) => setIssueItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issued To Staff Member</label>
                <select
                  value={issueUserId}
                  onChange={(e) => setIssueUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={issueQty}
                  onChange={(e) => setIssueQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Purpose / Notes</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Grade 4 practical experiment"
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
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
