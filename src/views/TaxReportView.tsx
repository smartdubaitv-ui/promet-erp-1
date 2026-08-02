import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Percent, 
  TrendingUp, 
  Coins, 
  Users, 
  Receipt, 
  Calendar, 
  Printer, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';

interface TaxDetailItem {
  invoice_number?: string;
  description?: string;
  employee_name?: string;
  customer_name?: string;
  date?: string;
  expense_date?: string;
  month?: string;
  invoice_total?: number;
  amount?: number;
  net_salary?: number;
  vat_amount?: number;
  tax_amount?: number;
  category?: string;
}

interface TaxSection {
  total: number;
  total_sales?: number;
  total_expenses?: number;
  total_payroll?: number;
  invoice_count?: number;
  expense_count?: number;
  employee_count?: number;
  tax_rate: number;
  details: TaxDetailItem[];
}

interface ProfitTaxData {
  total: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  tax_rate: number;
  is_profitable: boolean;
}

interface TaxReportData {
  period: { from: string; to: string };
  output_tax: TaxSection;
  input_tax: TaxSection;
  payroll_tax: TaxSection;
  profit_tax: ProfitTaxData;
  summary: {
    total_output_tax: number;
    total_input_tax: number;
    net_vat: number;
    payroll_tax: number;
    profit_tax: number;
    total_tax_due: number;
    is_vat_payable: boolean;
  };
}

export const TaxReportView: React.FC = () => {
  const [data, setData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-12-31');
  
  // Toggles for detail views
  const [showOutputDetails, setShowOutputDetails] = useState<boolean>(false);
  const [showInputDetails, setShowInputDetails] = useState<boolean>(false);
  const [showPayrollDetails, setShowPayrollDetails] = useState<boolean>(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/tax';
      if (dateFrom && dateTo) {
        url += `?date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('❌ فشل جلب التقرير الضريبي:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="text-indigo-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800">التقرير الضريبي الشامل (Tax Report)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            احتساب وإقرار الضرائب المستحقة للشركة بما يشمل ضريبة القيمة المضافة (VAT)، ضريبة كسب العمل/المرتبات، وضريبة الأرباح التجارية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            طباعة الإقرار
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/pdf?type=tax&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
            title="تصدير PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => window.open(`/api/reports/export/excel?type=tax&date_from=${dateFrom}&date_to=${dateTo}&token=${localStorage.getItem('token')}`, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={loadReport}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4 items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">من تاريخ</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-48 pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">إلى تاريخ</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-48 pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        <button 
          onClick={loadReport}
          className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
        >
          تطبيق الفلترة
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col justify-center items-center gap-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="animate-spin text-indigo-600" />
          <p className="text-xs">جاري سحب واحتساب البيانات والتحقق من الوعاء الضريبي...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">ضريبة مبيعات (مخرجات)</span>
                <span className="p-1 rounded-lg bg-indigo-200/50 text-indigo-700 text-[10px] font-black">15% VAT</span>
              </div>
              <p className="text-lg font-black text-indigo-950">
                {data.summary.total_output_tax.toLocaleString()} ج.م
              </p>
              <p className="text-[10px] text-slate-400 mt-1">إجمالي المبيعات: {data.output_tax.total_sales?.toLocaleString()} ج.م</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">ضريبة مشتريات (مدخلات)</span>
                <span className="p-1 rounded-lg bg-emerald-200/50 text-emerald-700 text-[10px] font-black">15% VAT</span>
              </div>
              <p className="text-lg font-black text-emerald-950">
                {data.summary.total_input_tax.toLocaleString()} ج.م
              </p>
              <p className="text-[10px] text-slate-400 mt-1">المصروفات الخاضعة: {data.input_tax.total_expenses?.toLocaleString()} ج.م</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-600 uppercase">صافي ق.م المضافة</span>
                {data.summary.is_vat_payable ? (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                    <AlertTriangle className="h-2.5 w-2.5" /> واجب السداد
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                    <CheckCircle className="h-2.5 w-2.5" /> رصيد دائن مستحق
                  </span>
                )}
              </div>
              <p className={`text-lg font-black ${data.summary.is_vat_payable ? 'text-rose-700' : 'text-emerald-700'}`}>
                {data.summary.net_vat.toLocaleString()} ج.م
              </p>
              <p className="text-[10px] text-slate-400 mt-1">خصم المدخلات من المخرجات</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase">ضريبة كسب العمل</span>
                <span className="p-1 rounded-lg bg-blue-200/50 text-blue-700 text-[10px] font-black">10%</span>
              </div>
              <p className="text-lg font-black text-blue-950">
                {data.summary.payroll_tax.toLocaleString()} ج.م
              </p>
              <p className="text-[10px] text-slate-400 mt-1">رواتب ومستحقات الموظفين الخاضعة</p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md col-span-1">
              <span className="text-[10px] font-bold text-slate-300 block mb-1">إجمالي الالتزام الضريبي للشركة</span>
              <span className="text-xl font-black text-indigo-300">
                {data.summary.total_tax_due.toLocaleString()} ج.م
              </span>
              <div className="text-[9px] text-slate-300 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span>شامل ضريبة الأرباح ({data.summary.profit_tax.toLocaleString()} ج.م)</span>
              </div>
            </div>
          </div>

          {/* Details sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VAT ON SALES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                    <Percent className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">ضريبة المخرجات المبيعات (VAT on Sales)</h3>
                    <p className="text-[10px] text-slate-400">الفواتير الضريبية المباعة المحتسبة بنسبة 15%</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowOutputDetails(!showOutputDetails)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  {showOutputDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-4 grid grid-cols-3 gap-2 text-center border-b border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">قيمة المبيعات الخاضعة</span>
                  <span className="text-xs font-bold text-slate-700">{data.output_tax.total_sales?.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">الضريبة الإجمالية</span>
                  <span className="text-xs font-bold text-indigo-600">{data.output_tax.total.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">الفواتير المصدرة</span>
                  <span className="text-xs font-bold text-slate-700">{data.output_tax.invoice_count} فواتير</span>
                </div>
              </div>

              {showOutputDetails && (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {data.output_tax.details.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">لا توجد تفاصيل لحركة المبيعات خلال الفترة.</div>
                  ) : (
                    data.output_tax.details.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.customer_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">رقم الفاتورة: #{item.invoice_number} | {item.date}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-indigo-600 font-mono">{item.vat_amount?.toLocaleString()} ج.م</p>
                          <p className="text-[10px] text-slate-400 font-mono">قيمة الفاتورة: {item.invoice_total?.toLocaleString()} ج.م</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* VAT ON PURCHASES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                    <Coins className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">ضريبة المدخلات المشتريات (VAT on Purchases)</h3>
                    <p className="text-[10px] text-slate-400">الفواتير التشغيلية والمشتريات والمصروفات المحتسبة بنسبة 15%</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInputDetails(!showInputDetails)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  {showInputDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-4 grid grid-cols-3 gap-2 text-center border-b border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">قيمة المشتريات والمصاريف</span>
                  <span className="text-xs font-bold text-slate-700">{data.input_tax.total_expenses?.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">الضريبة المستردة</span>
                  <span className="text-xs font-bold text-emerald-600">{data.input_tax.total.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">سندات الصرف</span>
                  <span className="text-xs font-bold text-slate-700">{data.input_tax.expense_count} عمليات</span>
                </div>
              </div>

              {showInputDetails && (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {data.input_tax.details.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">لا توجد تفاصيل لحركة المشتريات أو المصروفات خلال الفترة.</div>
                  ) : (
                    data.input_tax.details.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">التصنيف: {item.category} | {item.expense_date}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-emerald-600 font-mono">{item.vat_amount?.toLocaleString()} ج.م</p>
                          <p className="text-[10px] text-slate-400 font-mono">الأساسي الخاضع: {item.amount?.toLocaleString()} ج.م</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* PAYROLL TAX */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">ضريبة كسب العمل / المرتبات (Payroll Tax)</h3>
                    <p className="text-[10px] text-slate-400">الضريبة المستقطعة من رواتب ومكافآت الموظفين بنسبة 10%</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPayrollDetails(!showPayrollDetails)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  {showPayrollDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-4 grid grid-cols-3 gap-2 text-center border-b border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">وعاء الرواتب الخاضع</span>
                  <span className="text-xs font-bold text-slate-700">{data.payroll_tax.total_payroll?.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">الضريبة المستقطعة</span>
                  <span className="text-xs font-bold text-blue-600">{data.payroll_tax.total.toLocaleString()} ج.م</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">سجلات مسيرات الرواتب</span>
                  <span className="text-xs font-bold text-slate-700">{data.payroll_tax.employee_count} موظفين</span>
                </div>
              </div>

              {showPayrollDetails && (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {data.payroll_tax.details.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">لا توجد تفاصيل لمسيرات الرواتب المعتمدة والمدفوعة خلال الفترة.</div>
                  ) : (
                    data.payroll_tax.details.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.employee_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">مسير شهر: {item.month}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-blue-600 font-mono">{item.tax_amount?.toLocaleString()} ج.م</p>
                          <p className="text-[10px] text-slate-400 font-mono">صافي الراتب: {item.net_salary?.toLocaleString()} ج.م</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* PROFIT TAX (CORPORATE TAX) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">تقديرات ضريبة الأرباح التجارية (Profit Tax)</h3>
                      <p className="text-[10px] text-slate-400">الضريبة المقدرة على صافي الربح المحقق بنسبة 22.5%</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3 border-b border-slate-100">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">إجمالي الإيرادات (المبيعات)</span>
                    <span className="text-sm font-black text-emerald-600">{data.profit_tax.total_revenue?.toLocaleString()} ج.م</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">إجمالي المصروفات التشغيلية</span>
                    <span className="text-sm font-black text-rose-600">{data.profit_tax.total_expenses?.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">صافي الربح قبل الضريبة</p>
                  <p className={`text-base font-black flex items-center gap-1 ${data.profit_tax.is_profitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {data.profit_tax.net_profit?.toLocaleString()} ج.م
                    {data.profit_tax.is_profitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">ضريبة الأرباح المستحقة (22.5%)</p>
                  <p className="text-base font-black text-rose-600 font-mono">
                    {data.profit_tax.total?.toLocaleString()} ج.م
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          لا توجد بيانات كافية لإنشاء التقرير الضريبي للفترة المحددة.
        </div>
      )}
    </div>
  );
};

export default TaxReportView;
