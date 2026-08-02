import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Search, RefreshCw, Wallet, PiggyBank, ArrowDownRight, ArrowUpLeft, ChevronDown, FileSpreadsheet } from 'lucide-react';

interface CashFlowCategory {
  net_income?: number;
  ar_change?: number;
  inventory_change?: number;
  ap_change?: number;
  asset_purchase?: number;
  capital_change?: number;
  loan_change?: number;
  total: number;
}

interface CashFlowData {
  operating: CashFlowCategory;
  investing: CashFlowCategory;
  financing: CashFlowCategory;
  beginning_cash: number;
  net_change: number;
  ending_cash: number;
}

export const CashFlowView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-12-31');

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/cash-flow?date_from=${dateFrom}&date_to=${dateTo}`);
      if (response.ok) {
        const result = await response.json();
        
        const operating: CashFlowCategory = {
          total: Number(result.operating?.total ?? result.operatingActivities?.netCash ?? 0),
          net_income: Number(result.operating?.net_income ?? result.operatingActivities?.inflow ?? 0),
          ar_change: Number(result.operating?.ar_change ?? -result.operatingActivities?.outflow ?? 0),
          inventory_change: Number(result.operating?.inventory_change ?? 0),
          ap_change: Number(result.operating?.ap_change ?? 0)
        };

        const investing: CashFlowCategory = {
          total: Number(result.investing?.total ?? result.investingActivities?.netCash ?? 0),
          asset_purchase: Number(result.investing?.asset_purchase ?? 0)
        };

        const financing: CashFlowCategory = {
          total: Number(result.financing?.total ?? result.financingActivities?.netCash ?? 0),
          capital_change: Number(result.financing?.capital_change ?? 0),
          loan_change: Number(result.financing?.loan_change ?? 0)
        };

        const beginning_cash = Number(result.beginning_cash ?? result.cashAtBeginning ?? 100000);
        const net_change = Number(result.net_change ?? result.netIncreaseInCash ?? (operating.total + investing.total + financing.total));
        const ending_cash = Number(result.ending_cash ?? result.cashAtEnd ?? (beginning_cash + net_change));

        setData({
          operating,
          investing,
          financing,
          beginning_cash,
          net_change,
          ending_cash
        });
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Error fetching cash flow:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="text-blue-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">قائمة التدفقات النقدية (Cash Flow Statement)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">تتبع التدفقات الداخلة والخارجة من النقد وما يعادله عبر الأنشطة التشغيلية والاستثمارية والتمويلية.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=cash-flow&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=cash-flow&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={fetchCashFlow}
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
          <p className="text-xs">جاري تجميع بنود التدفقات النقدية والسيولة والتحركات البنكية...</p>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          فشل تحميل تقرير التدفقات النقدية. يرجى إعادة المحاولة.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Flow Metric Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">النقدية بداية الفترة (Beginning Cash)</span>
                <p className="text-lg font-black text-slate-800 mt-1">{(data.beginning_cash).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-500 mt-1">الرصيد الافتتاحي للبنك والخزينة</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-500">
                <PiggyBank className="h-5 w-5" />
              </div>
            </div>

            <div className={`border rounded-2xl p-5 shadow-sm flex items-center justify-between ${data.net_change >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <div>
                <span className="text-[10px] font-bold text-slate-500">صافي التغير النقدي (Net Cash Change)</span>
                <p className={`text-lg font-black mt-1 ${data.net_change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {data.net_change >= 0 ? '+' : ''}{(data.net_change).toLocaleString()} ج.م
                </p>
                <p className="text-[9px] text-slate-500 mt-1">المحصلة الصافية لتدفق الأموال</p>
              </div>
              <div className={`p-3 rounded-xl border ${data.net_change >= 0 ? 'bg-white text-emerald-600 border-emerald-200' : 'bg-white text-rose-600 border-rose-200'}`}>
                {data.net_change >= 0 ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpLeft className="h-5 w-5" />}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">النقدية نهاية الفترة (Ending Cash)</span>
                <p className="text-lg font-black text-blue-600 mt-1">{(data.ending_cash).toLocaleString()} ج.م</p>
                <p className="text-[9px] text-slate-500 mt-1">الرصيد المتاح حالياً بالبنك والخزينة</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Detailed Cash Flow Statement breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-sm font-bold text-slate-800">تفاصيل التدفقات حسب مجموعات الأنشطة المحاسبية</h2>
              <p className="text-[10px] text-slate-500 mt-1">تقسيم التدفقات النقدية وفقاً للمعيار الدولي لعرض القوائم المالية.</p>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Operating Activities */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-xs font-black text-slate-800">أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)</span>
                  <span className={`text-xs font-black ${data.operating.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(data.operating.total).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="divide-y divide-slate-100 pr-4 text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between items-center py-2">
                    <span>صافي الدخل / صافي الربح للفترة (Net Income)</span>
                    <span className="font-mono">{(data.operating.net_income || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>تأثير التغير في حسابات المدينين والعملاء (Accounts Receivable)</span>
                    <span className="font-mono">{(data.operating.ar_change || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>تأثير التغير في المخزون السلعي (Inventory)</span>
                    <span className="font-mono">{(data.operating.inventory_change || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>تأثير التغير في حسابات الدائنين والموردين (Accounts Payable)</span>
                    <span className="font-mono">{(data.operating.ap_change || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* 2. Investing Activities */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-xs font-black text-slate-800">ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)</span>
                  <span className={`text-xs font-black ${data.investing.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(data.investing.total).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="divide-y divide-slate-100 pr-4 text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between items-center py-2">
                    <span>شراء / بيع أصول ثابتة وتجهيزات عقارية (Capex)</span>
                    <span className="font-mono">{(data.investing.asset_purchase || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* 3. Financing Activities */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-xs font-black text-slate-800">ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)</span>
                  <span className={`text-xs font-black ${data.financing.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(data.financing.total).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="divide-y divide-slate-100 pr-4 text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between items-center py-2">
                    <span>التغير في رأس المال والمساهمات (Equity Contributions)</span>
                    <span className="font-mono">{(data.financing.capital_change || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>التغير في القروض والالتزامات التمويلية (Financing Debt)</span>
                    <span className="font-mono">{(data.financing.loan_change || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Net cash calculation and checks */}
              <div className="border-t-2 border-slate-100 pt-6 space-y-3">
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-700">
                  <span>صافي التغير في النقدية خلال العام (التشغيلية + الاستثمارية + التمويلية)</span>
                  <span className="font-mono">{(data.net_change).toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-700">
                  <span>النقدية في بداية العام</span>
                  <span className="font-mono">{(data.beginning_cash).toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-blue-600 font-black text-sm text-white shadow-md">
                  <span>النقدية في نهاية العام (النقد وما يعادله)</span>
                  <span className="font-mono">{(data.ending_cash).toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
