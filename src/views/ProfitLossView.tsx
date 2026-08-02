import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Search, FileSpreadsheet, RefreshCw, TrendingUp, DollarSign, Award, AlertCircle } from 'lucide-react';

interface ReportAccount {
  id: string;
  code: string;
  name: string;
  amount: number;
}

interface ProfitLossData {
  revenues: ReportAccount[];
  total_revenue: number;
  cogs: ReportAccount[];
  total_cogs: number;
  gross_profit: number;
  expenses: ReportAccount[];
  total_expenses: number;
  net_income: number;
}

export const ProfitLossView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-12-31');

  const fetchProfitLoss = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/profit-loss?date_from=${dateFrom}&date_to=${dateTo}`);
      if (response.ok) {
        const result = await response.json();
        const revenues: ReportAccount[] = (result.revenues || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'إيراد',
          amount: Number(a.amount ?? a.balance ?? 0)
        }));
        const cogs: ReportAccount[] = (result.cogs || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'تكلفة',
          amount: Number(a.amount ?? a.balance ?? 0)
        }));
        const expenses: ReportAccount[] = (result.expenses || []).map((a: any) => ({
          id: a.id || a.code || '',
          code: a.code || '',
          name: a.name || 'مصروف',
          amount: Number(a.amount ?? a.balance ?? 0)
        }));

        const total_revenue = Number(result.total_revenue ?? result.totalRevenues ?? revenues.reduce((s, a) => s + a.amount, 0));
        const total_cogs = Number(result.total_cogs ?? result.totalCogs ?? cogs.reduce((s, a) => s + a.amount, 0));
        const gross_profit = Number(result.gross_profit ?? result.grossProfit ?? (total_revenue - total_cogs));
        const total_expenses = Number(result.total_expenses ?? result.totalExpenses ?? expenses.reduce((s, a) => s + a.amount, 0));
        const net_income = Number(result.net_income ?? result.netIncome ?? (total_revenue - total_expenses));

        setData({
          revenues,
          total_revenue,
          cogs,
          total_cogs,
          gross_profit,
          expenses,
          total_expenses,
          net_income
        });
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Error fetching profit loss:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitLoss();
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">قائمة الدخل (الأرباح والخسائر)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">تقرير مالي يلخص الإيرادات والمصروفات والتكاليف للشركة لقياس أدائها المالي وصافي الدخل.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=profit-loss&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=profit-loss&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={fetchProfitLoss}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls: Date Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
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

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-2 shadow-sm">
          <RefreshCw className="animate-spin text-blue-500" />
          <p className="text-xs">جاري معالجة وحساب البنود وإعداد قائمة الأرباح والخسائر...</p>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          فشل تحميل بيانات التقرير المالي. يرجى التحديث لاحقاً.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">إجمالي الإيرادات</span>
                <p className="text-lg font-black text-blue-600 mt-1">{(data.total_revenue).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-500 mt-1">المبيعات والخدمات المقدمة</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600 border border-blue-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">تكلفة البضاعة المباعة</span>
                <p className="text-lg font-black text-rose-600 mt-1">{(data.total_cogs).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-500 mt-1">التكاليف المباشرة للإنتاج</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl text-rose-600 border border-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">إجمالي مجمل الربح</span>
                <p className="text-lg font-black text-emerald-600 mt-1">{(data.gross_profit).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-500 mt-1">الإيرادات مطروحاً منها التكاليف</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 border border-emerald-100">
                <Award className="h-5 w-5" />
              </div>
            </div>

            <div className={`border rounded-2xl p-5 shadow-sm flex items-center justify-between ${data.net_income >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <div>
                <span className="text-[10px] font-bold text-slate-500">صافي الدخل / الربح</span>
                <p className={`text-lg font-black mt-1 ${data.net_income >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{(data.net_income).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-600 mt-1">النتيجة النهائية لأداء المنشأة</p>
              </div>
              <div className={`p-3 rounded-xl border ${data.net_income >= 0 ? 'bg-white text-emerald-600 border-emerald-300' : 'bg-white text-rose-600 border-rose-300'}`}>
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Detailed Statement Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-sm font-bold text-slate-800">تفاصيل هيكل قائمة الدخل المحاسبية</h2>
              <p className="text-[10px] text-slate-500 mt-1">عرض شجري للبنود والإيرادات والمصروفات بالتفصيل.</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 1. Revenues Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2 rounded-lg">
                  <span className="text-sm font-bold text-slate-800">1. الإيرادات التشغيلية الرئيسيّة</span>
                  <span className="text-sm font-bold text-blue-600">{(data.total_revenue).toLocaleString()} ج.م</span>
                </div>
                <div className="divide-y divide-slate-100 pr-4">
                  {data.revenues.map((item, index) => (
                    <div key={`${item.id || item.code || 'rev'}-${index}`} className="flex justify-between items-center py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-600 font-bold">{item.amount.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  {data.revenues.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">لا توجد إيرادات مسجلة للفترة.</div>
                  )}
                </div>
              </div>

              {/* 2. COGS Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2 rounded-lg">
                  <span className="text-sm font-bold text-slate-800">2. يُطرح: تكلفة المبيعات (تكلفة البضاعة المباعة)</span>
                  <span className="text-sm font-bold text-rose-600">({(data.total_cogs).toLocaleString()}) ج.م</span>
                </div>
                <div className="divide-y divide-slate-100 pr-4">
                  {data.cogs.map((item, index) => (
                    <div key={`${item.id || item.code || 'cogs'}-${index}`} className="flex justify-between items-center py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-600 font-bold">{item.amount.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  {data.cogs.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">لا توجد تكاليف مباشرة مسجلة للفترة.</div>
                  )}
                </div>
              </div>

              {/* Gross Profit Summary */}
              <div className="flex justify-between items-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 font-bold">
                <span className="text-sm">إجمالي مجمّل الربح (Revenues - COGS)</span>
                <span className="font-mono text-base font-black">{(data.gross_profit).toLocaleString()} ج.م</span>
              </div>

              {/* 3. Expenses Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2 rounded-lg">
                  <span className="text-sm font-bold text-slate-800">3. يُطرح: المصروفات والعموميات التشغيلية</span>
                  <span className="text-sm font-bold text-amber-700">({(data.total_expenses).toLocaleString()}) ج.م</span>
                </div>
                <div className="divide-y divide-slate-100 pr-4 max-h-96 overflow-y-auto">
                  {data.expenses.map((item, index) => (
                    <div key={`${item.id || item.code || 'exp'}-${index}`} className="flex justify-between items-center py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-600 font-bold">{item.amount.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  {data.expenses.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">لا توجد مصروفات مسجلة للفترة.</div>
                  )}
                </div>
              </div>

              {/* Net Income Summary */}
              <div className={`flex justify-between items-center p-4 rounded-xl border ${data.net_income >= 0 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'} font-black shadow-md`}>
                <span className="text-base">صافي الأرباح والخسائر (الخل النهائي للفترة)</span>
                <span className="font-mono text-lg">{(data.net_income).toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
