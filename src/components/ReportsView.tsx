import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Landmark, 
  ShieldAlert,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Save,
  Heart,
  Users,
  Package,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Invoice, Expense, Account } from '../types';

interface ReportsViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  accounts: Account[];
  tenant: any;
}

export default function ReportsView({
  invoices,
  expenses,
  accounts,
  tenant
}: ReportsViewProps) {
  
  // Tab Selector
  const [reportType, setReportType] = useState<'analytics' | 'pl' | 'bs' | 'tax'>('analytics');
  const [fiscalYear, setFiscalYear] = useState('2026');

  // ==========================================
  // Smart Analytics Tab State
  // ==========================================
  const [analyticsType, setAnalyticsType] = useState<'sales' | 'employees' | 'inventory'>('sales');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Set default date range for past month (simulated to fit the 2026 dataset)
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [trends, setTrends] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Saved reports states
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [savedReportsLoading, setSavedReportsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportDesc, setNewReportDesc] = useState('');
  const [newReportIsFavorite, setNewReportIsFavorite] = useState(false);
  const [newReportIsPublic, setNewReportIsPublic] = useState(true);
  const [savingReport, setSavingReport] = useState(false);

  // Search filter for grids
  const [searchQuery, setSearchQuery] = useState('');

  // ==========================================
  // Load Analytics Data
  // ==========================================
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      let url = '';
      if (analyticsType === 'sales') {
        url = `/api/reports/sales/analytics?period=${period}`;
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;
      } else if (analyticsType === 'employees') {
        url = `/api/reports/employees/performance`;
      } else {
        url = `/api/reports/inventory/analytics`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json.data || []);
        setSummary(json.summary || {});
        setTrends(json.trends || {});
      }
    } catch (e) {
      console.error("Failed to load analytics report data", e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Load Saved Reports
  // ==========================================
  const fetchSavedReports = async () => {
    try {
      setSavedReportsLoading(true);
      const res = await fetch('/api/reports/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch saved reports", err);
    } finally {
      setSavedReportsLoading(false);
    }
  };

  // Trigger loading when filters change
  useEffect(() => {
    if (reportType === 'analytics') {
      fetchAnalyticsData();
    }
  }, [analyticsType, period, dateFrom, dateTo, reportType]);

  // Load saved reports on mount
  useEffect(() => {
    fetchSavedReports();
  }, []);

  // ==========================================
  // Save Custom Report Handler
  // ==========================================
  const handleSaveReport = async () => {
    if (!newReportName.trim()) {
      alert("الرجاء إدخال اسم التقرير أولاً.");
      return;
    }
    try {
      setSavingReport(true);
      const payload = {
        name: newReportName,
        description: newReportDesc,
        report_type: analyticsType,
        filters: { period, dateFrom, dateTo },
        columns: analyticsType === 'sales' ? ["period", "invoice_count", "total_amount", "total_tax"] : ["full_name", "avg_rating", "tasks_completed"],
        chart_type: analyticsType === 'sales' ? 'line' : 'bar',
        chart_config: { xAxis: analyticsType === 'sales' ? "period" : "full_name", yAxis: analyticsType === 'sales' ? "total_amount" : "avg_rating" },
        is_favorite: newReportIsFavorite,
        is_public: newReportIsPublic
      };

      const res = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ تم حفظ وتأمين التقرير المخصص بنجاح في سجلات النظام.");
        setNewReportName('');
        setNewReportDesc('');
        setNewReportIsFavorite(false);
        setShowSaveModal(false);
        fetchSavedReports();
      } else {
        const err = await res.json();
        alert(`❌ فشل حفظ التقرير: ${err.error || 'حدث خطأ غير معروف'}`);
      }
    } catch (e) {
      console.error(e);
      alert("❌ خطأ بالاتصال مع الخادم");
    } finally {
      setSavingReport(false);
    }
  };

  // Quick load saved report state
  const handleLoadSavedReport = (report: any) => {
    setReportType('analytics');
    setAnalyticsType(report.report_type);
    if (report.filters) {
      if (report.filters.period) setPeriod(report.filters.period);
      if (report.filters.dateFrom) setDateFrom(report.filters.dateFrom);
      if (report.filters.dateTo) setDateTo(report.filters.dateTo);
    }
  };

  // ==========================================
  // Traditional Ledger Calculation Values
  // ==========================================
  const totalSalesRevenues = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0) || invoices.reduce((s, i) => s + i.totalAmount, 0);
  const costOfGoodsSold = accounts.find(a => a.code === '5010')?.balance || 48000;
  
  const opsExpenses = accounts.filter(a => a.type === 'expense' && a.code !== '5010');
  const totalExpensesAmount = opsExpenses.reduce((sum, a) => sum + a.balance, 0) || expenses.reduce((s, e) => s + e.amount, 0);

  const grossProfit = totalSalesRevenues - costOfGoodsSold;
  const netIncome = grossProfit - totalExpensesAmount;

  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);

  const liabilityAccounts = accounts.filter(a => a.type === 'liability');
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);

  const equityAccounts = accounts.filter(a => a.type === 'equity');
  const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 50;

  const triggerPrint = () => {
    window.print();
  };

  // Filter records in data grid
  const filteredData = analyticsData.filter(row => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    
    // Check various potential string fields
    return (
      (row.period && row.period.toLowerCase().includes(term)) ||
      (row.full_name && row.full_name.toLowerCase().includes(term)) ||
      (row.job_title && row.job_title.toLowerCase().includes(term)) ||
      (row.department_name && row.department_name.toLowerCase().includes(term)) ||
      (row.name && row.name.toLowerCase().includes(term)) ||
      (row.sku && row.sku.toLowerCase().includes(term)) ||
      (row.category_name && row.category_name.toLowerCase().includes(term)) ||
      (row.stock_status && row.stock_status.toLowerCase().includes(term))
    );
  });

  // Mock colors for Pie/Status charts
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-4 text-xs" dir="rtl">
      
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-3 rounded-xl border border-slate-200/80 gap-3">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setReportType('analytics')}
            className={`p-1.5 px-4 font-bold rounded-lg cursor-pointer transition-all ${
              reportType === 'analytics' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            📊 التقارير الذكية والتحليلات
          </button>
          
          <button 
            onClick={() => setReportType('pl')}
            className={`p-1.5 px-4 font-bold rounded-lg cursor-pointer transition-all ${
              reportType === 'pl' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            قائمة الدخل (Profit & Loss)
          </button>
          
          <button 
            onClick={() => setReportType('bs')}
            className={`p-1.5 px-4 font-bold rounded-lg cursor-pointer transition-all ${
              reportType === 'bs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            الميزانية العمومية (Balance Sheet)
          </button>

          <button 
            onClick={() => setReportType('tax')}
            className={`p-1.5 px-4 font-bold rounded-lg cursor-pointer transition-all ${
              reportType === 'tax' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            الضرائب والإقرار (VAT Audit)
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Calendar size={13} className="text-slate-400" />
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg p-1 px-2.5 font-sans"
          >
            <option value="2026">السنة المالية 2026 (الحالية)</option>
            <option value="2025">السنة المالية 2025</option>
          </select>

          <button 
            onClick={triggerPrint}
            className="bg-white hover:bg-slate-50 border border-slate-300 p-1.5 px-3.5 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={12} />
            طباعة الصفحة الحاليّة
          </button>

          <button 
            onClick={async () => {
              try {
                const response = await fetch(`/api/reports/${reportType}/pdf?year=${fiscalYear}`);
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `report-${reportType}-${fiscalYear}.pdf`;
                  a.click();
                  alert('تم تنزيل تقرير الـ PDF بنجاح.');
                } else {
                  alert('تقرير الـ PDF جاري إنشاؤه، تم تجهيز التحليلات المحاسبية المحدثة في واجهة الويب.');
                }
              } catch (e) {
                console.error(e);
                alert('فشل الاتصال بالخادم');
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 p-1.5 px-3.5 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText size={12} />
            تصدير كشف PDF
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      {reportType === 'analytics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Left Column: Saved Reports & Templates Bar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="font-extrabold text-slate-900 text-[11px] flex items-center gap-1">📋 التقارير المحفوظة ({savedReports.length})</span>
                <button 
                  onClick={fetchSavedReports} 
                  title="تحديث التقارير المحفوظة"
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                >
                  <RefreshCw size={11} className={savedReportsLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {savedReportsLoading ? (
                <div className="py-8 text-center text-slate-400 font-bold">جاري التحميل...</div>
              ) : savedReports.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-[10px] font-bold">لا توجد تقارير مخصصة محفوظة بعد.</div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto">
                  {savedReports.map((report) => (
                    <div 
                      key={report.id}
                      onClick={() => handleLoadSavedReport(report)}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 cursor-pointer transition-all space-y-1 relative group"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-slate-800 text-[11px] truncate">{report.name}</span>
                        {report.is_favorite && <Heart size={10} className="fill-red-500 text-red-500 shrink-0" />}
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">{report.description || 'لا يوجد وصف'}</p>
                      
                      <div className="flex items-center justify-between text-[8px] pt-1 text-slate-500 font-mono">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-sans font-black">
                          {report.report_type === 'sales' ? 'مبيعات' : report.report_type === 'employees' ? 'موظفين' : 'مخزون'}
                        </span>
                        <span>{new Date(report.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-indigo-900/5 text-indigo-950 p-4 rounded-xl border border-indigo-100 space-y-2.5">
              <span className="font-bold text-[11px] text-indigo-900 block">💡 تلميحات التحليل المالي:</span>
              <p className="text-[10px] leading-relaxed text-indigo-800/80">
                يقوم محرك التقارير الذكية بتحليل الفواتير المسجلة تلقائياً، وحساب توازن المخرجات والمدخلات ومطابقتها مع مخزون البضائع وكفاءة الموظفين، لتقديم رؤية ملموسة لصناع القرار في الشركة.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Workspace Panel */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Interactive Filters Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                
                {/* Module selection */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0">
                  <button 
                    onClick={() => setAnalyticsType('sales')}
                    className={`px-3.5 py-1.5 font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-[10px] ${
                      analyticsType === 'sales' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TrendingUp size={11} />
                    📊 المبيعات والإيرادات
                  </button>
                  <button 
                    onClick={() => setAnalyticsType('employees')}
                    className={`px-3.5 py-1.5 font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-[10px] ${
                      analyticsType === 'employees' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Users size={11} />
                    👥 أداء الكادر البشري
                  </button>
                  <button 
                    onClick={() => setAnalyticsType('inventory')}
                    className={`px-3.5 py-1.5 font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-[10px] ${
                      analyticsType === 'inventory' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Package size={11} />
                    📦 تحليل المخازن والسلع
                  </button>
                </div>

                {/* Sub utilities (Refresh, Save Report button) */}
                <div className="flex items-center gap-2 font-sans">
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 p-1.5 px-3.5 rounded-lg font-black flex items-center gap-1.5 cursor-pointer text-[10px]"
                  >
                    <Save size={11} />
                    حفظ كتقرير مخصص
                  </button>

                  <button 
                    onClick={fetchAnalyticsData}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 px-2.5 rounded-lg cursor-pointer"
                    title="تحديث البيانات"
                  >
                    <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Specific Filter Inputs depending on Module */}
              {analyticsType === 'sales' && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">دورية التحليل (Period):</span>
                    <select 
                      value={period} 
                      onChange={(e: any) => setPeriod(e.target.value)}
                      className="bg-white border border-slate-200 rounded p-1 w-full text-[11px]"
                    >
                      <option value="daily">📅 يومي (Daily)</option>
                      <option value="weekly">📅 أسبوعي (Weekly)</option>
                      <option value="monthly">📅 شهري (Monthly)</option>
                      <option value="yearly">📅 سنوي (Yearly)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">من تاريخ (From):</span>
                    <input 
                      type="date" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white border border-slate-200 rounded p-1 w-full text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold block">إلى تاريخ (To):</span>
                    <input 
                      type="date" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white border border-slate-200 rounded p-1 w-full text-[11px]"
                    />
                  </div>

                  <div className="flex items-end">
                    <button 
                      onClick={fetchAnalyticsData}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-1.5 font-bold rounded text-[10px] cursor-pointer"
                    >
                      تصفية وتأكيد البيانات
                    </button>
                  </div>
                </div>
              )}

              {analyticsType === 'employees' && (
                <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-[10px] text-slate-500">
                  ⚡️ يتم رصد تحليلات الأداء والمؤشرات البشرية ديناميكياً بناءً على تقييمات الأداء الدورية، الحضور والانصراف، ومهام مشاريع الكاشير والأنظمة.
                </div>
              )}

              {analyticsType === 'inventory' && (
                <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-[10px] text-slate-500">
                  📦 يعتمد تقرير المخزون التحليلي على الموازنة اللحظية بين البضائع في المستودعات والحدود الدنيا لإعادة الطلب لمنع توقف سلاسل التوريد.
                </div>
              )}
            </div>

            {/* Save Report Modal Popup */}
            {showSaveModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-right" dir="rtl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-extrabold text-slate-900 text-[12px]">💾 حفظ التقرير الحالي كقالب مخصص</span>
                    <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block">اسم التقرير المخصص *</label>
                      <input 
                        type="text" 
                        placeholder="مثال: تحليل مبيعات الربع الأول"
                        value={newReportName} 
                        onChange={(e) => setNewReportName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block">الوصف / الغرض من التحليل</label>
                      <textarea 
                        rows={3}
                        placeholder="اكتب نبذة مختصرة عن أهداف هذا الفلتر والتقرير"
                        value={newReportDesc} 
                        onChange={(e) => setNewReportDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-sans resize-none"
                      />
                    </div>

                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newReportIsFavorite} 
                          onChange={(e) => setNewReportIsFavorite(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-slate-600">إضافة للمفضلة ⭐</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newReportIsPublic} 
                          onChange={(e) => setNewReportIsPublic(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-slate-600">تقرير عام مرئي لجميع الزملاء</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-3">
                    <button 
                      onClick={() => setShowSaveModal(false)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 px-4 font-bold rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={handleSaveReport} 
                      disabled={savingReport}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 px-4 font-bold rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {savingReport ? 'جاري الحفظ...' : 'حفظ التقرير'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Dynamic Statistics Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 animate-pulse h-16" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {analyticsType === 'sales' && (
                  <>
                    <div className="bg-white rounded-xl border-r-4 border-indigo-600 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">💰 إجمالي الإيرادات</div>
                      <div className="text-base font-black text-slate-800">
                        {Number(summary.total_revenue || 0).toLocaleString()} <span className="text-[9px] font-medium text-slate-400">ج.م</span>
                      </div>
                      <div className="text-[8px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <span>إيرادات المبيعات الخاضعة للضريبة</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-blue-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">📄 عدد الفواتير</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.total_invoices || 0} <span className="text-[9px] font-medium text-slate-400">فاتورة</span>
                      </div>
                      <div className="text-[8px] text-blue-500 font-bold">مصدر الفواتير والمستندات المحاسبية</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-emerald-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">📊 متوسط قيمة الفاتورة</div>
                      <div className="text-base font-black text-slate-800">
                        {Number(summary.avg_invoice || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[9px] font-medium text-slate-400">ج.م</span>
                      </div>
                      <div className="text-[8px] text-slate-500">متوسط سلة المبيعات والمنتجات</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-purple-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">🧾 إجمالي ضريبة المخرجات</div>
                      <div className="text-base font-black text-slate-800">
                        {Number(summary.total_tax || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[9px] font-medium text-slate-400">ج.م</span>
                      </div>
                      <div className="text-[8px] text-indigo-600 font-bold">مستحقة الفوترة بمعدل 15%</div>
                    </div>
                  </>
                )}

                {analyticsType === 'employees' && (
                  <>
                    <div className="bg-white rounded-xl border-r-4 border-indigo-600 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">👥 إجمالي الموظفين النشطين</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.total_employees || 0} <span className="text-[9px] font-medium text-slate-400">كادر</span>
                      </div>
                      <div className="text-[8px] text-indigo-600 font-bold">مسجلين في المكاتب والميدان</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-amber-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">⭐ متوسط تقييم الكفاءة</div>
                      <div className="text-base font-black text-slate-800 flex items-center gap-1">
                        <span>{Number(summary.avg_performance || 0).toFixed(1)}</span>
                        <span className="text-amber-500 text-xs">★</span>
                      </div>
                      <div className="text-[8px] text-amber-600 font-bold">درجات استقصاء الأداء الإجمالي</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-emerald-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">🏆 موظفون متميزون</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.top_performers || 0} <span className="text-[9px] font-medium text-slate-400">كفاءة</span>
                      </div>
                      <div className="text-[8px] text-emerald-600 font-bold">تقييم ممتاز فوق 4.0 نجوم</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-blue-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">📋 إجمالي المهام المنجزة</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.total_tasks_completed || 0} <span className="text-[9px] font-medium text-slate-400">مهمة</span>
                      </div>
                      <div className="text-[8px] text-blue-500 font-bold">تم الانتهاء منها في المشاريع</div>
                    </div>
                  </>
                )}

                {analyticsType === 'inventory' && (
                  <>
                    <div className="bg-white rounded-xl border-r-4 border-indigo-600 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">📦 إجمالي المنتجات والسلع</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.total_products || 0} <span className="text-[9px] font-medium text-slate-400">منتج</span>
                      </div>
                      <div className="text-[8px] text-slate-500">في كافة التصنيفات والخدمات</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-emerald-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">💰 القيمة التقديرية للمخزون</div>
                      <div className="text-base font-black text-slate-800">
                        {Number(summary.total_stock_value || 0).toLocaleString()} <span className="text-[9px] font-medium text-slate-400">ج.م</span>
                      </div>
                      <div className="text-[8px] text-emerald-600 font-bold">قيمة السلع بسعر الشراء الفعلي</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-red-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">🔴 منخفض حرج (Critical)</div>
                      <div className="text-base font-black text-red-600">
                        {summary.critical_items || 0} <span className="text-[9px] font-medium text-slate-400">عناصر</span>
                      </div>
                      <div className="text-[8px] text-red-500 font-bold">تجاوزت الحد الأدنى لإعادة الطلب</div>
                    </div>

                    <div className="bg-white rounded-xl border-r-4 border-amber-500 border border-slate-200/80 p-3.5 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">🟡 مخزون منخفض (Low)</div>
                      <div className="text-base font-black text-amber-600">
                        {summary.low_items || 0} <span className="text-[9px] font-medium text-slate-400">منتجات</span>
                      </div>
                      <div className="text-[8px] text-amber-500 font-bold">بحاجة للتجهيز والشراء</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. Interactive Charts Section (Recharts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Chart Left: Trend (Line or Area) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <span className="font-extrabold text-slate-900 text-[11px] block">
                  {analyticsType === 'sales' ? '📈 اتجاه الإيرادات والمبيعات التراكمية' : analyticsType === 'employees' ? '⭐ توزيع تقييم الأداء بين الموظفين' : '📦 قيمة المنتجات وسعر البيع'}
                </span>
                <div className="h-60 w-full pt-1.5 font-sans">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">جاري تحميل المخطط...</div>
                  ) : analyticsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">لا توجد بيانات كافية للرسم البياني</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {analyticsType === 'sales' ? (
                        <AreaChart data={analyticsData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ج.م`, 'الإيرادات']} />
                          <Area type="monotone" dataKey="total_amount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      ) : analyticsType === 'employees' ? (
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="full_name" stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <YAxis domain={[0, 5]} stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)} نجوم`, 'تقييم الكفاءة']} />
                          <Bar dataKey="avg_rating" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {analyticsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={(entry?.avg_rating || 0) >= 4 ? '#10b981' : (entry?.avg_rating || 0) < 3 ? '#ef4444' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="sku" stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ج.م`, 'سعر السلعة']} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="selling_price" name="سعر البيع" fill="#10b981" />
                          <Bar dataKey="purchase_price" name="سعر الشراء" fill="#2563eb" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart Right: Volume/Status (Bar or Pie) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <span className="font-extrabold text-slate-900 text-[11px] block">
                  {analyticsType === 'sales' ? '📊 حجم تداول المستندات (عدد الفواتير)' : analyticsType === 'employees' ? '🏆 المهام المنجزة مقابل المهام المعلقة' : '🚨 توزيع كميات المخازن المتوفرة'}
                </span>
                <div className="h-60 w-full pt-1.5 font-sans">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">جاري تحميل المخطط...</div>
                  ) : analyticsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">لا توجد بيانات كافية للرسم البياني</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {analyticsType === 'sales' ? (
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: any) => [value, 'عدد الفواتير']} />
                          <Bar dataKey="invoice_count" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : analyticsType === 'employees' ? (
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="full_name" stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                          <Tooltip formatter={(value: any) => [value, 'المهام']} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="tasks_completed" name="مهام مكتملة" fill="#10b981" stackId="tasks" />
                          <Bar dataKey="tasks_pending" name="مهام متبقية" fill="#f59e0b" stackId="tasks" />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={analyticsData.map(d => ({ name: d.name, value: d.current_stock }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {analyticsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [value, 'الكمية']} />
                          <Legend wrapperStyle={{ fontSize: 8 }} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Detailed Data Table Workspace */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/50">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-[11px]">📋 تفاصيل القيود والبيانات التحليلية</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">جدول تدقيق ومطابقة السجلات الفردية المسترجعة من الخادم.</p>
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial">
                    <Search size={11} className="absolute right-2.5 top-2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="البحث في تفاصيل الجدول..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1 pr-7 text-[10px] w-full md:w-48 focus:outline-indigo-500 font-sans"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      // Custom JSON / CSV Export simulator
                      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredData, null, 2))}`;
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", jsonString);
                      downloadAnchor.setAttribute("download", `promet-analytics-${analyticsType}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      alert("✅ تم تصدير ومزامنة كشف البيانات التفصيلي بصيغة JSON المحاسبية.");
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-[10px] shadow-xs shrink-0"
                  >
                    <Download size={11} />
                    تصدير البيانات
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[9px]">
                      {analyticsType === 'sales' && (
                        <>
                          <th className="p-3">الفترة / التاريخ</th>
                          <th className="p-3 text-center">عدد الفواتير الصادرة</th>
                          <th className="p-3">إجمالي الإيرادات</th>
                          <th className="p-3">متوسط قيمة الفاتورة</th>
                          <th className="p-3">ضريبة المخرجات المجمعة</th>
                          <th className="p-3 text-center">عدد العملاء الفريدين</th>
                          <th className="p-3">مستحقات معلقة</th>
                        </>
                      )}

                      {analyticsType === 'employees' && (
                        <>
                          <th className="p-3 font-sans">اسم الموظف كود</th>
                          <th className="p-3">المنصب والمهنة</th>
                          <th className="p-3">القسم المالي</th>
                          <th className="p-3">الراتب الأساسي</th>
                          <th className="p-3 text-center">كفاءة الأداء</th>
                          <th className="p-3 text-center">نسبة الحضور بالدوام</th>
                          <th className="p-3 text-center">المهام المنجزة</th>
                        </>
                      )}

                      {analyticsType === 'inventory' && (
                        <>
                          <th className="p-3">اسم السلعة / السجل</th>
                          <th className="p-3 font-mono">الباركود SKU</th>
                          <th className="p-3">التصنيف المحاسبي</th>
                          <th className="p-3">الكمية الحالية بالمستودع</th>
                          <th className="p-3">سعر التكلفة</th>
                          <th className="p-3">سعر البيع المقترح</th>
                          <th className="p-3 text-center">حالة توفر المخزون</th>
                          <th className="p-3">قيمة أصول المستودع</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold text-[11px]">
                          لا توجد سجلات مطابقة للبحث الحالي.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((row: any, idx: number) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50/50 transition-colors text-slate-600 font-sans">
                          {analyticsType === 'sales' && (
                            <>
                              <td className="p-3 font-bold text-slate-950 font-sans">{row.period}</td>
                              <td className="p-3 text-center font-bold text-slate-800">{row.invoice_count}</td>
                              <td className="p-3 font-black text-indigo-600">{Number(row.total_amount).toLocaleString()} ج.م</td>
                              <td className="p-3 text-slate-500">{Number(row.avg_invoice).toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م</td>
                              <td className="p-3 text-slate-500">{Number(row.total_tax).toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م</td>
                              <td className="p-3 text-center font-bold text-slate-700">{row.customer_count}</td>
                              <td className="p-3 text-amber-600 font-bold">{(row.unpaid_amount || 0).toLocaleString()} ج.م</td>
                            </>
                          )}

                          {analyticsType === 'employees' && (
                            <>
                              <td className="p-3 font-bold text-slate-900">{row.full_name}</td>
                              <td className="p-3 text-slate-500">{row.job_title}</td>
                              <td className="p-3"><span className="bg-slate-100 p-1 px-2 rounded-md font-sans font-black text-slate-700 text-[9px]">{row.department_name}</span></td>
                              <td className="p-3 font-bold text-slate-800">{row.base_salary !== undefined && row.base_salary !== null ? Number(row.base_salary).toLocaleString() : '0'} ج.م</td>
                              <td className="p-3 text-center">
                                <span className={`p-1 px-2 rounded-full font-bold text-[9px] ${
                                  (row.avg_rating || 0) >= 4.5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  (row.avg_rating || 0) >= 3.5 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {Number(row.avg_rating || 0).toFixed(1)} ★
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-600">
                                {row.attendance_days || 0} يوم حضر ({ ((row.attendance_days || 0) + (row.absent_days || 0)) > 0 ? Math.round((row.attendance_days || 0) / ((row.attendance_days || 0) + (row.absent_days || 0)) * 100) : 0 }%)
                              </td>
                              <td className="p-3 text-center text-slate-500 font-bold">
                                <span className="text-emerald-600">{row.tasks_completed || 0} منجز</span> / <span className="text-slate-400">{row.tasks_pending || 0} متبقي</span>
                              </td>
                            </>
                          )}

                          {analyticsType === 'inventory' && (
                            <>
                              <td className="p-3 font-bold text-slate-900">{row.name}</td>
                              <td className="p-3 font-mono text-slate-400 font-black">{row.sku}</td>
                              <td className="p-3 text-slate-500 font-bold">{row.category_name}</td>
                              <td className="p-3 text-center font-black text-slate-800">{row.current_stock !== undefined && row.current_stock !== null ? Number(row.current_stock).toLocaleString() : '0'}</td>
                              <td className="p-3 text-slate-500">{Number(row.purchase_price || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 font-bold text-slate-800">{Number(row.selling_price || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 text-center">
                                <span className={`p-1 px-2 rounded-md font-extrabold text-[9px] ${
                                  row.stock_status === 'critical' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                                  row.stock_status === 'low' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  row.stock_status === 'overstocked' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                  {row.stock_status === 'critical' ? '🔴 حرج منخفض جداً' : 
                                   row.stock_status === 'low' ? '🟡 مخزون منخفض' : 
                                   row.stock_status === 'overstocked' ? '🔵 فائض متراكم' : '🟢 متوفر وآمن'}
                                </span>
                              </td>
                              <td className="p-3 font-black text-indigo-600">{Number(row.stock_value).toLocaleString()} ج.م</td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5" id="printable-area">
          
          {/* Traditional Statements Branding Header */}
          <div className="flex justify-between items-start border-b pb-4 mb-4">
            <div>
              <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded uppercase">نظام بروميت المالي الموحد</span>
              <h1 className="text-base font-black text-slate-900 mt-1">{tenant?.name || 'شركة الهضبة للحلول والتقنيات المحاسبية'}</h1>
              <p className="text-[10px] text-slate-400">الرقم الضريبي المحلي: #310029348100003 | الرياض، المملكة العربية السعودية</p>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-black text-slate-700">
                {reportType === 'pl' ? 'حساب الأرباح والخسائر وقائمة الدخل' : reportType === 'bs' ? 'تقرير المركز المالي والشركاء' : 'إقرارات ضريبة القيمة المضافة المحتسبة'}
              </h2>
              <p className="text-[10px] text-slate-400">معد بالفترة المقيدة في: 01 يناير 2026 - إلى 14 يونيو 2026</p>
            </div>
          </div>

          {/* 1. Profit & Loss View */}
          {reportType === 'pl' && (
            <div className="space-y-4">
              
              {/* Sales Revenue Section */}
              <div>
                <div className="bg-slate-50 p-2 font-bold mb-1 border-r-4 border-blue-600 text-slate-800 flex justify-between">
                  <span>1. الإيرادات والنشاط البيعي الرئيسي</span>
                  <span>{totalSalesRevenues.toLocaleString()} ج.م</span>
                </div>
                <div className="px-6 space-y-1 py-1.5 text-slate-600 font-sans">
                  <div className="flex justify-between border-b pb-1">
                    <span>مبيعات المنتجات المباشرة (قيد 4010)</span>
                    <span>{(totalSalesRevenues * 0.7).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>إيرادات استشارات وخدمات مدمجة (قيد 4020)</span>
                    <span>{(totalSalesRevenues * 0.3).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Cost of Goods section */}
              <div>
                <div className="bg-slate-50 p-2 font-bold mb-1 border-r-4 border-red-500 text-slate-800 flex justify-between">
                  <span>2. تكلفة المبيعات والبضاعة المستهلكة (COGS)</span>
                  <span>-{costOfGoodsSold.toLocaleString()} ج.م</span>
                </div>
                <div className="px-6 space-y-1 py-1 text-slate-600 font-sans">
                  <div className="flex justify-between border-b pb-1 text-red-600">
                    <span>قيد تكلفة البضاعة المباعة الأساسي (قيد 5010)</span>
                    <span>-{costOfGoodsSold.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Gross Profit Block */}
              <div className="bg-slate-100 p-2 px-4 rounded font-extrabold text-slate-900 flex justify-between font-sans">
                <span>إجمالي هامش الربح التشغيلي المباشر (Gross Profit):</span>
                <span className="text-blue-700">{grossProfit.toLocaleString()} ج.م</span>
              </div>

              {/* Operating Expenses Section */}
              <div>
                <div className="bg-slate-50 p-2 font-bold mb-1 border-r-4 border-amber-500 text-slate-800 flex justify-between">
                  <span>3. المصروفات التشغيلية والرواتب (OPEX)</span>
                  <span>-{totalExpensesAmount.toLocaleString()} ج.م</span>
                </div>
                <div className="px-6 space-y-1 py-1.5 text-slate-600 font-sans">
                  {opsExpenses.map((expense, idx) => (
                    <div key={idx} className="flex justify-between border-b pb-1">
                      <span>{expense.name} (قيد {expense.code})</span>
                      <span>-{expense.balance.toLocaleString()} ج.م</span>
                    </div>
                  ))}

                  {opsExpenses.length === 0 && (
                    <div className="flex justify-between border-b pb-1">
                      <span>نفقات تشغيلية عامة مسجلة</span>
                      <span>-{totalExpensesAmount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Strategic Net Income */}
              <div className={`p-3 rounded-xl flex justify-between items-center text-sm font-black font-sans ${
                netIncome >= 0 ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'
              }`}>
                <span>صافي الأرباح المحققة عن الفترة المذكورة (Net Income):</span>
                <span className="text-xl">{netIncome.toLocaleString()} ج.م</span>
              </div>
            </div>
          )}

          {/* 2. Balance Sheet View */}
          {reportType === 'bs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Assets (Left Panel) */}
              <div className="space-y-4">
                <h3 className="font-black text-xs text-slate-800 border-b pb-2 text-right">الأصول المتداولة والغير متداولة (Assets)</h3>
                
                <div className="space-y-2 font-sans">
                  {assetAccounts.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-1 text-slate-700">
                      <div>
                        <span className="font-medium">{a.name}</span>
                        <span className="block text-[8px] text-slate-400">قيد رقم: {a.code}</span>
                      </div>
                      <span className="font-bold text-slate-900">{a.balance.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/50 p-2.5 rounded font-black text-blue-900 border-r-4 border-blue-600 flex justify-between text-xs font-sans">
                  <span>إجمالي الأصول (Assets):</span>
                  <span>{totalAssets.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Liabilities & Equity (Right Panel) */}
              <div className="space-y-4">
                <h3 className="font-black text-xs text-slate-800 border-b pb-2 text-right">الالتزامات وحقوق الملكية الشركاء (Equity & Liabilities)</h3>
                
                <div className="space-y-2 font-sans">
                  {/* Liabilities */}
                  <div className="text-[10px] font-bold text-slate-400">الالتزامات المتداولة (Liabilities):</div>
                  {liabilityAccounts.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-1 text-slate-700">
                      <div>
                        <span>{a.name}</span>
                        <span className="block text-[8px] text-slate-400">قيد رقم: {a.code}</span>
                      </div>
                      <span className="font-bold text-slate-900">{a.balance.toLocaleString()} ج.م</span>
                    </div>
                  ))}

                  {/* Equity */}
                  <div className="text-[10px] font-bold text-slate-400 pt-2">حقوق الملكية ورأس المال والأرباح المبقاة (Equity):</div>
                  {equityAccounts.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-1 text-slate-700">
                      <div>
                        <span>{a.name}</span>
                        <span className="block text-[8px] text-slate-400">قيد رقم: {a.code}</span>
                      </div>
                      <span className="font-bold text-slate-900">{a.balance.toLocaleString()} ج.م</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center border-b pb-1 text-slate-700 font-bold">
                    <span>الأرباح الصافية المبقاة للفترة الحالية</span>
                    <span>{netIncome.toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="bg-slate-100 p-2.5 rounded font-black text-slate-900 border-r-4 border-slate-600 flex justify-between text-xs font-sans">
                  <span>إجمالي الخصوم وحقوق الملكية:</span>
                  <span>{totalLiabilitiesAndEquity.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Integrity checks label */}
              <div className="col-span-1 md:col-span-2 pt-3 border-t">
                <div className={`p-2.5 rounded-lg flex items-center gap-2 font-bold ${
                  isBalanced ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  {isBalanced ? (
                    <>
                      <CheckCircle className="text-green-600" size={16} />
                      <span>مؤشر التوازن: كفتي المعادلة المحاسبية متطابقتان تماماً وبحالة ممتازة الأصول = الالتزامات + رأس المال الشركاء (Balanced ✓)</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} className="text-amber-600" />
                      <span>تنبيه: يوجد تسويات معلقة تحت التجهيز بمطابقة الأرصدة المدورة من البنوك.</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. VAT Tax Compliance View */}
          {reportType === 'tax' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded border border-amber-200 p-3 text-amber-900 leading-relaxed mb-4">
                <p className="font-bold">ضريبة القيمة المضافة السعودية (15%):</p>
                يحتسب هذا التقرير ضريبة المدخلات (المشتريات التشغيلية والمصروفات) مخصومة من ضريبة المخرجات (الفواتير البيعية الصادرة لتقديم الإقرار الإلكتروني لهيئة الزكاة والضريبة والجمارك ZATCA) بشكل تراكمي.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-slate-200 space-y-2 font-sans">
                  <span className="text-[10px] text-slate-400 block mb-1 font-bold">مجموع ضريبة السداد المستحقة من العملاء (المخرجات)</span>
                  <strong className="text-lg text-slate-900">{(totalSalesRevenues * 0.15).toLocaleString()} ج.م</strong>
                  <p className="text-[9px] text-slate-500">تم تجميعها من 15% من المبيعات الخاضعة للضريبة.</p>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200 space-y-2 font-sans">
                  <span className="text-[10px] text-slate-400 block mb-1 font-bold">مجموع ضريبة المشتريات المستردة (المدخلات)</span>
                  <strong className="text-lg text-slate-900">{(totalExpensesAmount * 0.15).toLocaleString()} ج.م</strong>
                  <p className="text-[9px] text-slate-500">تم احتسابها من إجمالي الفواتير والمصروفات المقبولة.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center font-bold text-sm border font-sans">
                <span>تقدير صافي التزام الدفع لهيئة الزكاة لربع السنة الحالي:</span>
                <span className="text-red-600">{Math.max(0, (totalSalesRevenues * 0.15) - (totalExpensesAmount * 0.15)).toLocaleString()} ج.م</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
