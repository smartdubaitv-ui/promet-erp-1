import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Search, FileSpreadsheet, RefreshCw, Scale } from 'lucide-react';

interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  total_debit: number;
  total_credit: number;
  ending_debit: number;
  ending_credit: number;
}

export const TrialBalanceView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TrialBalanceAccount[]>([]);
  const [search, setSearch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-12-31');

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/trial-balance?date_from=${dateFrom}&date_to=${dateTo}`);
      if (response.ok) {
        const result = await response.json();
        setData(Array.isArray(result) ? result : (result.accounts || []));
      }
    } catch (err) {
      console.error("Error fetching trial balance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [dateFrom, dateTo]);

  const filteredData = (data || []).filter(acc => 
    (acc.name || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (acc.code || '').includes(search || '')
  );

  // Sums
  const totalPeriodDebit = filteredData.reduce((sum, item) => sum + (Number(item.total_debit) || 0), 0);
  const totalPeriodCredit = filteredData.reduce((sum, item) => sum + (Number(item.total_credit) || 0), 0);
  const totalEndingDebit = filteredData.reduce((sum, item) => sum + (Number(item.ending_debit) || 0), 0);
  const totalEndingCredit = filteredData.reduce((sum, item) => sum + (Number(item.ending_credit) || 0), 0);

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return 'أصول';
      case 'liability': return 'خصوم / التزامات';
      case 'equity': return 'حقوق ملكية';
      case 'revenue': return 'إيرادات';
      case 'expense': return 'مصروفات';
      default: return type;
    }
  };

  const getAccountTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'liability': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'equity': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'revenue': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'expense': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="text-blue-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">ميزان المراجعة (Trial Balance)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">تتبع وتدقيق أرصدة جميع الحسابات المحاسبية خلال الفترة المحددة للتأكد من توازن القيود.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=trial-balance&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=trial-balance&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={fetchTrialBalance}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls: Date Filter & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث برقم الحساب أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">من:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">إلى:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-500">حالة التوازن (Equality Status)</span>
            <div className="text-base font-black text-slate-800 mt-1 flex items-center gap-1.5">
              {Math.abs(totalEndingDebit - totalEndingCredit) < 1 ? (
                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-200">ميزان متوازن ومطابق ✓</span>
              ) : (
                <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg text-xs border border-rose-200">غير متوازن (فرق: {(totalEndingDebit - totalEndingCredit).toLocaleString()} ج.م)</span>
              )}
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <Scale className={`h-6 w-6 ${Math.abs(totalEndingDebit - totalEndingCredit) < 1 ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500">مجموع حركة الفترة (Period Activity)</span>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400">إجمالي المدين</span>
              <p className="text-xs font-bold text-slate-700">{totalPeriodDebit.toLocaleString()} ج.م</p>
            </div>
            <div className="border-r pr-2">
              <span className="text-[10px] text-slate-400">إجمالي الدائن</span>
              <p className="text-xs font-bold text-slate-700">{totalPeriodCredit.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500">مجموع الأرصدة الختامية (Ending Balances)</span>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400">إجمالي الأرصدة المدينة</span>
              <p className="text-sm font-black text-slate-800">{totalEndingDebit.toLocaleString()} ج.م</p>
            </div>
            <div className="border-r pr-2">
              <span className="text-[10px] text-slate-400">إجمالي الأرصدة الدائنة</span>
              <p className="text-sm font-black text-slate-800">{totalEndingCredit.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-2">
            <RefreshCw className="animate-spin text-blue-500" />
            <p className="text-xs">جاري سحب وإعداد ميزان المراجعة لجميع الحسابات...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد حسابات مسجلة أو قيود تطابق معايير البحث والفلترة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="p-4" colSpan={3}>بيانات الحساب المحاسبي</th>
                  <th className="p-4 border-r border-slate-200 text-center bg-blue-50/40" colSpan={2}>حركة الفترة المحاسبية</th>
                  <th className="p-4 border-r border-slate-200 text-center bg-emerald-50/40" colSpan={2}>الأرصدة الختامية المعدلة</th>
                </tr>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">الكود</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">نوع الحساب</th>
                  <th className="p-3 border-r border-slate-200 text-left bg-blue-50/30">مدين</th>
                  <th className="p-3 text-left bg-blue-50/30">دائن</th>
                  <th className="p-3 border-r border-slate-200 text-left bg-emerald-50/30">رصيد مدين</th>
                  <th className="p-3 text-left bg-emerald-50/30">رصيد دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredData.map((item, index) => (
                  <tr key={`${item.id || item.code || 'item'}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-600">{item.code}</td>
                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAccountTypeBadgeColor(item.type)}`}>
                        {getAccountTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-200 font-mono text-left text-slate-600 bg-blue-50/10">
                      {item.total_debit > 0 ? item.total_debit.toLocaleString() : '-'}
                    </td>
                    <td className="p-3 font-mono text-left text-slate-600 bg-blue-50/10">
                      {item.total_credit > 0 ? item.total_credit.toLocaleString() : '-'}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-mono text-left font-bold text-emerald-700 bg-emerald-50/10">
                      {item.ending_debit > 0 ? `${item.ending_debit.toLocaleString()} ج.م` : '-'}
                    </td>
                    <td className="p-3 font-mono text-left font-bold text-slate-800 bg-emerald-50/10">
                      {item.ending_credit > 0 ? `${item.ending_credit.toLocaleString()} ج.م` : '-'}
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-800 text-sm">
                  <td className="p-4" colSpan={3}>إجمالي أرصدة ميزان المراجعة</td>
                  <td className="p-4 border-r border-slate-200 text-left font-mono bg-blue-50">
                    {totalPeriodDebit.toLocaleString()} ج.م
                  </td>
                  <td className="p-4 text-left font-mono bg-blue-50">
                    {totalPeriodCredit.toLocaleString()} ج.م
                  </td>
                  <td className="p-4 border-r border-slate-200 text-left font-mono text-emerald-700 bg-emerald-100/60">
                    {totalEndingDebit.toLocaleString()} ج.م
                  </td>
                  <td className="p-4 text-left font-mono text-slate-800 bg-emerald-100/60">
                    {totalEndingCredit.toLocaleString()} ج.م
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
