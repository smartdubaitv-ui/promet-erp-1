import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  Users, 
  Receipt, 
  Calendar, 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Search
} from 'lucide-react';

interface AgingSupplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total_balance: number;
}

interface AgingData {
  date: string;
  suppliers: AgingSupplier[];
  summary: {
    total_suppliers: number;
    total_balance: number;
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
}

export const AgingPayableView: React.FC = () => {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNeon, setIsNeon] = useState<boolean>(false);

  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/aging-payable?date=${date}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('❌ فشل جلب تقرير الحسابات الدائنة:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [date]);

  const getAgingColor = (days: number) => {
    if (days === 0) return 'text-emerald-500';
    if (days <= 30) return 'text-amber-500';
    if (days <= 60) return 'text-orange-500';
    if (days <= 90) return 'text-rose-500';
    return 'text-red-600';
  };

  const formatCurrency = (value: number) => {
    return (value || 0).toLocaleString() + ' ج.م';
  };

  const filteredSuppliers = data?.suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery))
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border transition-all duration-300 ${
        isNeon 
          ? 'bg-[#13131A]/90 border-purple-500/20 shadow-[0_0_15px_rgba(108,43,217,0.15)]' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className={`${isNeon ? 'text-purple-400' : 'text-indigo-600'} h-6 w-6`} />
            <h1 className={`text-xl font-bold ${isNeon ? 'text-white' : 'text-slate-800'}`}>تقرير أعمار الحسابات الدائنة (AP Aging Report)</h1>
          </div>
          <p className={`text-xs mt-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>
            تصنيف ومتابعة مستحقات الموردين والالتزامات المالية المتأخرة لتنظيم التدفقات النقدية الخارجية وجدولة المدفوعات.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
              isNeon 
                ? 'border-purple-500/30 text-purple-300 hover:bg-purple-950/40' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            طباعة التقرير
          </button>
          <button 
            onClick={loadReport}
            className={`flex items-center justify-center p-2 rounded-xl border transition-colors ${
              isNeon 
                ? 'border-purple-500/30 text-purple-300 hover:bg-purple-950/40' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-4 items-end p-5 rounded-2xl border transition-all duration-300 ${
        isNeon 
          ? 'bg-[#13131A]/90 border-purple-500/20' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className={`block text-xs font-bold mb-1.5 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>البحث عن مورد</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="اسم المورد، الهاتف أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-3 pr-10 py-2 text-xs border rounded-xl outline-none transition-all ${
                isNeon 
                  ? 'bg-black/30 border-purple-500/20 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className={`block text-xs font-bold mb-1.5 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>حتى تاريخ</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full sm:w-48 pl-3 pr-10 py-2 text-xs border rounded-xl outline-none transition-all ${
                isNeon 
                  ? 'bg-black/30 border-purple-500/20 text-white focus:border-purple-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>
        </div>

        <button 
          onClick={loadReport}
          className={`w-full sm:w-auto px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-sm ${
            isNeon ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          تحديث التصفية
        </button>
      </div>

      {loading ? (
        <div className={`p-12 text-center flex flex-col justify-center items-center gap-2 rounded-2xl border transition-all ${
          isNeon ? 'bg-[#13131A]/90 border-purple-500/20 text-purple-300' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <RefreshCw className={`animate-spin h-5 w-5 ${isNeon ? 'text-purple-400' : 'text-indigo-600'}`} />
          <p className="text-xs">جاري تحليل مستحقات الموردين وتوزيع الأعمار...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-purple-950/20 border-purple-500/20' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>الموردين الدائنين</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                {data.summary.total_suppliers}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-red-950/20 border-red-500/20' : 'bg-red-50 border-red-100'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-red-300' : 'text-red-700'}`}>إجمالي الديون</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-red-400' : 'text-red-800'}`}>
                {formatCurrency(data.summary.total_balance)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-emerald-300' : 'text-emerald-700'}`}>حالي (0 يوم)</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-emerald-400' : 'text-emerald-850'}`}>
                {formatCurrency(data.summary.current)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-amber-950/20 border-amber-500/20' : 'bg-amber-50 border-amber-100'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-amber-300' : 'text-amber-700'}`}>1-30 يوم</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-amber-400' : 'text-amber-800'}`}>
                {formatCurrency(data.summary.days_1_30)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-orange-950/20 border-orange-500/20' : 'bg-orange-50 border-orange-100'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-orange-300' : 'text-orange-700'}`}>31-60 يوم</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-orange-400' : 'text-orange-850'}`}>
                {formatCurrency(data.summary.days_31_60)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-rose-950/20 border-rose-500/20' : 'bg-rose-50 border-rose-100'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-rose-300' : 'text-rose-700'}`}>61-90 يوم</span>
              <p className={`text-lg font-black mt-1 ${isNeon ? 'text-rose-400' : 'text-rose-800'}`}>
                {formatCurrency(data.summary.days_61_90)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              isNeon ? 'bg-red-950/40 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-red-100/70 border-red-200'
            }`}>
              <span className={`text-[10px] font-bold ${isNeon ? 'text-red-400' : 'text-red-800'}`}>أكثر من 90 يوم</span>
              <p className={`text-lg font-black mt-1 text-red-600`}>
                {formatCurrency(data.summary.days_90_plus)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${
            isNeon ? 'bg-[#13131A]/90 border-purple-500/20' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={`border-b text-right font-bold ${
                    isNeon ? 'bg-purple-950/15 border-purple-500/10 text-purple-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <th className="p-4">المورد</th>
                    <th className="p-4">إجمالي مستحق له</th>
                    <th className="p-4">حالي (غير متأخر)</th>
                    <th className="p-4">1-30 يوم</th>
                    <th className="p-4">31-60 يوم</th>
                    <th className="p-4">61-90 يوم</th>
                    <th className="p-4">أكثر من 90 يوم</th>
                    <th className="p-4 text-center">الوضعية المالية للمورد</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isNeon ? 'divide-purple-500/5' : 'divide-slate-100'}`}>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد مستحقات دائنة تطابق بحثك أو التاريخ المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => {
                      const overdue90 = supplier.days_90_plus > 0;
                      const overdue60 = supplier.days_61_90 > 0;
                      const overdue30 = supplier.days_31_60 > 0;
                      const overdue1 = supplier.days_1_30 > 0;

                      return (
                        <tr key={supplier.id} className={`hover:bg-slate-50/50 transition-colors ${
                          isNeon ? 'hover:bg-purple-500/5' : 'hover:bg-slate-50/50'
                        }`}>
                          <td className="p-4">
                            <div>
                              <p className={`font-bold ${isNeon ? 'text-white' : 'text-slate-800'}`}>{supplier.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{supplier.phone || supplier.email || '-'}</p>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-red-600 font-mono">
                            {formatCurrency(supplier.total_balance)}
                          </td>
                          <td className={`p-4 font-mono font-bold ${getAgingColor(0)}`}>
                            {supplier.current > 0 ? formatCurrency(supplier.current) : '-'}
                          </td>
                          <td className={`p-4 font-mono ${getAgingColor(30)}`}>
                            {supplier.days_1_30 > 0 ? formatCurrency(supplier.days_1_30) : '-'}
                          </td>
                          <td className={`p-4 font-mono ${getAgingColor(60)}`}>
                            {supplier.days_31_60 > 0 ? formatCurrency(supplier.days_31_60) : '-'}
                          </td>
                          <td className={`p-4 font-mono ${getAgingColor(90)}`}>
                            {supplier.days_61_90 > 0 ? formatCurrency(supplier.days_61_90) : '-'}
                          </td>
                          <td className="p-4 font-bold text-red-600 font-mono">
                            {supplier.days_90_plus > 0 ? formatCurrency(supplier.days_90_plus) : '-'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                              overdue90 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : overdue60 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : overdue30 
                                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                : overdue1 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {overdue90 ? (
                                <>
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>مستحق السداد فوراً</span>
                                </>
                              ) : overdue60 ? (
                                <>
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>متأخرة عالية</span>
                                </>
                              ) : overdue30 ? (
                                <>
                                  <span>متوسطة (جدولة مطلوبة)</span>
                                </>
                              ) : overdue1 ? (
                                <>
                                  <span>قريبة الاستحقاق</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>مستحقة حالية</span>
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          لا توجد مستحقات مالية للموردين للفترة المحددة.
        </div>
      )}
    </div>
  );
};

export default AgingPayableView;
