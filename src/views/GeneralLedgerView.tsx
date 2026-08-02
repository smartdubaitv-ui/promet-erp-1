import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Search, RefreshCw, BookOpen, ArrowUpDown, Download, Printer, FileSpreadsheet } from 'lucide-react';

interface LedgerEntry {
  journal_id: string;
  date: string;
  description: string;
  reference_number: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
  notes: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LedgerSummary {
  total_entries: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  opening_balance: number;
  ending_balance: number;
}

export const GeneralLedgerView: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('1010'); // Default to Bank (1010)
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-12-31');
  const [search, setSearch] = useState<string>('');
  const [summary, setSummary] = useState<LedgerSummary | null>(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/general-ledger?date_from=${dateFrom}&date_to=${dateTo}`;
      if (selectedAccount) {
        url += `&account_id=${selectedAccount}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setEntries(result.entries || []);
        setAccounts(result.accounts || []);
        setSummary(result.summary || null);
      }
    } catch (err) {
      console.error("Error fetching general ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [dateFrom, dateTo, selectedAccount]);

  // Filter entries based on textual search (description, notes, or account info)
  const filteredEntries = entries.filter(entry => 
    entry.description.toLowerCase().includes(search.toLowerCase()) || 
    entry.notes.toLowerCase().includes(search.toLowerCase()) ||
    entry.account_name.toLowerCase().includes(search.toLowerCase()) ||
    entry.account_code.includes(search)
  );

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'asset': return 'أصول';
      case 'liability': return 'خصوم / التزامات';
      case 'equity': return 'حقوق ملكية';
      case 'revenue': return 'إيرادات';
      case 'expense': return 'مصروفات';
      default: return type;
    }
  };

  const getActiveAccountInfo = () => {
    return accounts.find(acc => acc.code === selectedAccount || acc.id === selectedAccount);
  };

  const activeAccount = getActiveAccountInfo();

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">دفتر الأستاذ العام (General Ledger)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل حركة تفصيلي شامل لكافة العمليات المالية والقيود المحاسبية لكل حساب على حدة مع احتساب الرصيد التراكمي المستمر.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            طباعة
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=general-ledger&date_from=${dateFrom}&date_to=${dateTo}&account_id=${selectedAccount}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=general-ledger&date_from=${dateFrom}&date_to=${dateTo}&account_id=${selectedAccount}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={fetchLedger}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">الحساب المحاسبي الرئيسي</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">-- جميع الحسابات --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.code}>
                {acc.code} - {acc.name} ({getAccountTypeName(acc.type)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">من تاريخ</label>
          <div className="flex items-center gap-2 relative">
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">إلى تاريخ</label>
          <div className="flex items-center gap-2 relative">
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">بحث سريع في الحركة</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالبيان أو الملاحظات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">رصيد أول المدة (Opening Balance)</span>
            <span className="text-sm font-black text-slate-700">
              {selectedAccount ? `${summary.opening_balance.toLocaleString()} ج.م` : '0 ج.م'}
            </span>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-indigo-500 block mb-1">حركة الجانب المدين (Total Debit)</span>
            <span className="text-sm font-black text-indigo-700">
              {summary.total_debit.toLocaleString()} ج.م
            </span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-500 block mb-1">حركة الجانب الدائن (Total Credit)</span>
            <span className="text-sm font-black text-emerald-700">
              {summary.total_credit.toLocaleString()} ج.م
            </span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-amber-500 block mb-1">صافي حركة الفترة (Net Change)</span>
            <span className={`text-sm font-black ${summary.net_balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {summary.net_balance.toLocaleString()} ج.م
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">الرصيد الختامي (Ending Balance)</span>
            <span className={`text-base font-black ${summary.ending_balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {summary.ending_balance.toLocaleString()} ج.م
            </span>
          </div>
        </div>
      )}

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-2">
            <RefreshCw className="animate-spin text-indigo-600" />
            <p className="text-xs">جاري جلب وعرض تفاصيل دفتر الأستاذ العام...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد حركات مالية مسجلة لهذا الحساب خلال الفترة المحددة أو تطابق معايير البحث والفلترة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم القيد</th>
                  <th className="p-3">البيان الأساسي للقيد</th>
                  <th className="p-3">الحساب المحاسبي</th>
                  <th className="p-3 text-left">مدين (Debit)</th>
                  <th className="p-3 text-left">دائن (Credit)</th>
                  <th className="p-3 text-left bg-slate-100/50">الرصيد المستمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* Opening Balance Row for single selected account */}
                {selectedAccount && summary && (
                  <tr className="bg-slate-50/50 text-slate-500 font-medium italic">
                    <td className="p-3 font-mono">{dateFrom}</td>
                    <td className="p-3">-</td>
                    <td className="p-3">رصيد أول المدة الافتتاحي المقفل (Opening Balance)</td>
                    <td className="p-3">
                      {activeAccount ? `${activeAccount.code} - ${activeAccount.name}` : selectedAccount}
                    </td>
                    <td className="p-3 text-left">-</td>
                    <td className="p-3 text-left">-</td>
                    <td className="p-3 text-left font-mono font-bold text-slate-600 bg-slate-50">
                      {summary.opening_balance.toLocaleString()} ج.م
                    </td>
                  </tr>
                )}

                {/* Ledger Entries */}
                {filteredEntries.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">
                      #{entry.journal_id}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{entry.description}</div>
                      {entry.notes && entry.notes !== entry.description && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{entry.notes}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-700">{entry.account_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{entry.account_code}</div>
                    </td>
                    <td className="p-3 font-mono text-left text-indigo-600 font-bold whitespace-nowrap">
                      {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                    </td>
                    <td className="p-3 font-mono text-left text-emerald-600 font-bold whitespace-nowrap">
                      {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                    </td>
                    <td className="p-3 font-mono text-left font-black text-slate-800 bg-slate-50/30 whitespace-nowrap">
                      {entry.balance.toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}

                {/* Summary / Total Row */}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-800 text-sm">
                  <td className="p-4" colSpan={4}>المجموع الإجمالي لحركة الفترة</td>
                  <td className="p-4 text-left font-mono text-indigo-600 whitespace-nowrap">
                    {summary?.total_debit.toLocaleString()} ج.م
                  </td>
                  <td className="p-4 text-left font-mono text-emerald-600 whitespace-nowrap">
                    {summary?.total_credit.toLocaleString()} ج.م
                  </td>
                  <td className="p-4 text-left font-mono text-indigo-700 bg-slate-200/50 whitespace-nowrap">
                    {summary?.ending_balance.toLocaleString()} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralLedgerView;
