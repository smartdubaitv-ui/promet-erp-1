import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Search, FileSpreadsheet, RefreshCw, Landmark, ShieldCheck, Scale, BarChart2 } from 'lucide-react';

interface ReportAccount {
  id: string;
  code: string;
  name: string;
  balance: number;
}

interface BalanceSheetData {
  assets: ReportAccount[];
  total_assets: number;
  liabilities: ReportAccount[];
  total_liabilities: number;
  equity: ReportAccount[];
  total_equity: number;
  retained_earnings: number;
  total_equity_and_retained: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export const BalanceSheetView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [dateTo, setDateTo] = useState<string>('2026-12-31');

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/balance-sheet?date_to=${dateTo}`);
      if (response.ok) {
        const result = await response.json();
        
        const assets: ReportAccount[] = (result.assets || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'حساب',
          balance: Number(a.balance) || 0
        }));
        const liabilities: ReportAccount[] = (result.liabilities || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'حساب',
          balance: Number(a.balance) || 0
        }));
        const equity: ReportAccount[] = (result.equity || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'حساب',
          balance: Number(a.balance) || 0
        }));

        const total_assets = Number(result.total_assets ?? result.totalAssets ?? assets.reduce((s, a) => s + a.balance, 0));
        const total_liabilities = Number(result.total_liabilities ?? result.totalLiabilities ?? liabilities.reduce((s, a) => s + a.balance, 0));
        const total_equity = Number(result.total_equity ?? result.totalEquity ?? equity.reduce((s, a) => s + a.balance, 0));
        const retained_earnings = Number(result.retained_earnings ?? result.retainedEarnings ?? 0);
        const total_equity_and_retained = Number(result.total_equity_and_retained ?? result.totalEquityAndRetained ?? (total_equity + retained_earnings));
        const total_liabilities_and_equity = Number(result.total_liabilities_and_equity ?? result.totalLiabilitiesAndEquity ?? (total_liabilities + total_equity_and_retained));
        const is_balanced = Boolean(result.is_balanced ?? result.isBalanced ?? (Math.abs(total_assets - total_liabilities_and_equity) < 1));

        setData({
          assets,
          total_assets,
          liabilities,
          total_liabilities,
          equity,
          total_equity,
          retained_earnings,
          total_equity_and_retained,
          total_liabilities_and_equity,
          is_balanced
        });
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Error fetching balance sheet:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [dateTo]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="text-blue-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">قائمة المركز المالي (الميزانية العمومية)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">تقرير مالي يلخص مركز المنشأة المالي من أصول، والتزامات، وحقوق ملكية في لحظة زمنية محددة.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=balance-sheet&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=balance-sheet&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={fetchBalanceSheet}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls: Date Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 md:col-span-1">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">كما في تاريخ:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center justify-end text-xs text-slate-400">
          * يتم تحديث وحساب الأرباح الختامية المحتجزة تلقائياً لتطابق الميزان ميكانيكياً.
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-2 shadow-sm">
          <RefreshCw className="animate-spin text-blue-500" />
          <p className="text-xs">جاري سحب وإعداد قائمة المركز المالي والتسويات الشجرية للالتزامات...</p>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          فشل تحميل تقرير الميزانية العمومية. يرجى إعادة المحاولة.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Equality / Balanced Alert Box */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${data.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${data.is_balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm">مطابقة المعادلة المحاسبية الذهبية</h3>
                <p className="text-xs opacity-90 mt-0.5">الأصول = الالتزامات (الخصوم) + حقوق الملكية</p>
              </div>
            </div>
            <div className="flex gap-4 text-xs font-bold text-left sm:text-right font-mono">
              <div>
                <span className="block text-[10px] opacity-75">إجمالي الأصول</span>
                <span className="text-sm font-black">{(data.total_assets || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="border-r border-slate-200 pr-4">
                <span className="block text-[10px] opacity-75">إجمالي الالتزامات وحقوق الملكية</span>
                <span className="text-sm font-black">{(data.total_liabilities_and_equity || 0).toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          {/* Balanced Two-column layout on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: ASSETS (الأصول) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-slate-100 bg-slate-50/55 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">الأصول (Assets)</span>
                  <span className="text-xs text-slate-500">القيمة المادية والمستحقات</span>
                </div>
                <div className="p-6 divide-y divide-slate-100">
                  {(data.assets || []).map((item, index) => (
                    <div key={`${item.id || item.code || 'asset'}-${index}`} className="flex justify-between items-center py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-800 font-bold">{(item.balance || 0).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  {(!data.assets || data.assets.length === 0) && (
                    <div className="text-center py-6 text-slate-400 text-xs">لا توجد أصول مسجلة.</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 border-t border-slate-100 flex justify-between items-center font-black text-blue-900 text-sm">
                <span>إجمالي الأصول (Total Assets)</span>
                <span className="font-mono">{(data.total_assets || 0).toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* COLUMN 2: LIABILITIES & EQUITY (الخصوم وحقوق الملكية) */}
            <div className="space-y-6">
              {/* Liabilities (الالتزامات) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-slate-100 bg-slate-50/55 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-800">الالتزامات والخصوم (Liabilities)</span>
                    <span className="text-xs text-slate-500">المطالبات والالتزامات للغير</span>
                  </div>
                  <div className="p-5 divide-y divide-slate-100">
                    {(data.liabilities || []).map((item, index) => (
                      <div key={`${item.id || item.code || 'liability'}-${index}`} className="flex justify-between items-center py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                          <span className="text-slate-700 font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-800 font-bold">{(item.balance || 0).toLocaleString()} ج.م</span>
                      </div>
                    ))}
                    {(!data.liabilities || data.liabilities.length === 0) && (
                      <div className="text-center py-6 text-slate-400 text-xs">لا توجد خصوم مسجلة.</div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center font-bold text-slate-700 text-xs">
                  <span>إجمالي الالتزامات (Total Liabilities)</span>
                  <span className="font-mono">{(data.total_liabilities || 0).toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Equity (حقوق الملكية) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-slate-100 bg-slate-50/55 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-800">حقوق الملكية (Equity)</span>
                    <span className="text-xs text-slate-500">رأس المال وصافي المساهمة</span>
                  </div>
                  <div className="p-5 divide-y divide-slate-100">
                    {(data.equity || []).map((item, index) => (
                      <div key={`${item.id || item.code || 'equity'}-${index}`} className="flex justify-between items-center py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                          <span className="text-slate-700 font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-800 font-bold">{(item.balance || 0).toLocaleString()} ج.م</span>
                      </div>
                    ))}
                    
                    {/* Retained Earnings (صافي ربح الفترة) */}
                    <div className="flex justify-between items-center py-2.5 text-xs bg-amber-50/35 p-1 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-500">Earnings</span>
                        <span className="text-amber-800 font-black">الأرباح والخسائر للعام الجاري</span>
                      </div>
                      <span className="font-mono text-amber-700 font-bold">{(data.retained_earnings || 0).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border-t border-slate-100 flex justify-between items-center font-bold text-emerald-800 text-xs">
                  <span>إجمالي حقوق الملكية والأرباح (Total Equity & Retained)</span>
                  <span className="font-mono">{(data.total_equity_and_retained || 0).toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Grand Total Column Footer */}
              <div className="p-4 bg-blue-600 rounded-2xl text-white flex justify-between items-center font-black text-sm shadow-md">
                <span>إجمالي الخصوم وحقوق الملكية (Total Liabilities & Equity)</span>
                <span className="font-mono text-base">{(data.total_liabilities_and_equity || 0).toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
