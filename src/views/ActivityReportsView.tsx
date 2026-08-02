import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  TrendingUp, 
  Truck, 
  Wrench, 
  Calendar, 
  Layers, 
  Activity, 
  FileSpreadsheet, 
  FileText, 
  Download,
  AlertTriangle,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface ReportData {
  activity: string;
  type: string;
  data: any;
}

export const ActivityReportsView: React.FC = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isNeon, setIsNeon] = useState(false);

  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportType, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let apiType = reportType;
      if (reportType === 'scrap_sales') apiType = 'sales';
      if (reportType === 'scrap_products') apiType = 'products';

      let url = `/api/reports/activity?type=${apiType}`;
      if (dateFrom && dateTo) {
        url += `&date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('❌ فشل جلب التقرير:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: string) => {
    if (!report || !report.data) return;
    
    // Simulate realistic export of current report data
    if (format === 'csv' || format === 'excel') {
      const data = report.data[0] || report.data;
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "المؤشر (Metric),القيمة (Value)\n";
      
      Object.entries(data).forEach(([key, val]) => {
        const readableKey = getArabicLabel(key);
        csvContent += `"${readableKey}","${val}"\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `تقرير_النشاط_${report.activity}_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF Print simulation
      window.print();
    }
  };

  const getActivityName = (code: string) => {
    const map: Record<string, string> = {
      scrap: '🧹 قطاع الخردة وإعادة التدوير (Scrap & Recycling)',
      transport: '🚛 قطاع النقل والشحن (Logistics & Transport)',
      manufacturing: '🏭 قطاع التصنيع والإنتاج (Manufacturing)',
      construction: '🏗️ قطاع المقاولات والتشييد (Construction & Contracting)',
      retail: '🛒 قطاع التجزئة والمبيعات (Retail & Sales)'
    };
    return map[code] || code;
  };

  const getArabicLabel = (key: string): string => {
    const map: Record<string, string> = {
      total_shipments: 'إجمالي الشحنات الصادرة',
      delivered: 'الشحنات التي تم تسليمها بنجاح',
      in_progress: 'شحنات قيد التنفيذ والتوصيل',
      avg_delivery_time: 'متوسط زمن التوصيل (بالساعات)',
      total_vehicles: 'إجمالي أسطول السيارات المتاح',
      active: 'المركبات النشطة حالياً',
      maintenance: 'المركبات في الصيانة الدورية',
      avg_fuel_consumption: 'معدل استهلاك الوقود (لتر/100كم)',
      active_vehicles: 'السيارات النشطة حالياً في الميدان',
      active_drivers: 'السائقين النشطين على المسارات',
      estimated_maintenance_cost: 'التكلفة التقديرية للصيانة والتشغيل (ج.م)',
      total_production: 'حجم الإنتاج الإجمالي (وحدة)',
      avg_daily_production: 'معدل الإنتاج اليومي',
      good_products: 'المنتجات المطابقة للمواصفات',
      defective_products: 'المنتجات التالفة أو المعيبة',
      total_machines: 'عدد خطوط الإنتاج والماكينات',
      avg_efficiency: 'متوسط كفاءة التشغيل الشاملة (%)',
      total_production_volume: 'إجمالي وحدات الإنتاج النهائي',
      active_machines_count: 'خطوط الإنتاج المفعلة حالياً',
      active_work_orders: 'أوامر العمل الصناعية النشطة',
      raw_material_estimated_cost: 'تكلفة المواد الخام التقديرية (ج.م)',
      total_projects: 'إجمالي المشاريع الإنشائية المسجلة',
      completed: 'المشاريع التي تم تسليمها',
      avg_progress: 'متوسط نسبة إنجاز المشاريع الإجمالية (%)',
      total_equipment: 'إجمالي المعدات الثقيلة والآلات',
      avg_utilization: 'معدل استغلال المعدات اليومي (%)',
      active_projects_count: 'عدد المشاريع قيد التنفيذ والإشراف',
      active_equipment_count: 'عدد الآلات الثقيلة المفعلة بالموقع',
      active_workers_count: 'إجمالي الكادر والعمال بالموقع',
      total_estimated_costs: 'التكلفة الإنشائية والتشغيلية الكلية (ج.م)',
      total_sales: 'إجمالي المبيعات المحققة',
      avg_sale: 'متوسط قيمة العملية البيعية الواحدة',
      total_transactions: 'إجمالي عدد حركات البيع الصادرة',
      cash_sales: 'إجمالي المقبوضات النقدية (كاش)',
      card_sales: 'إجمالي المدفوعات الإلكترونية والكروت',
      total_stock: 'حجم المخزون السلعي الإجمالي (كجم)',
      low_stock_count: 'أصناف قاربت على النفاد (تنبيه إعادة طلب)',
      total_products: 'إجمالي أصناف المواد الخردة',
      total_sales_revenue: 'إجمالي إيرادات المبيعات المحققة (ج.م)',
      total_transactions_count: 'إجمالي عدد الفواتير والعمليات',
      total_customers_reached: 'إجمالي قاعدة العملاء المتفاعلين',
      low_stock_products_count: 'عدد المنتجات تحت حد الطلب الآمن'
    };
    return map[key] || key.replace(/_/g, ' ');
  };

  const getMetricIcon = (key: string) => {
    if (key.includes('sales') || key.includes('revenue') || key.includes('cost')) {
      return <TrendingUp className="text-emerald-500" size={18} />;
    }
    if (key.includes('vehicles') || key.includes('shipments') || key.includes('delivery')) {
      return <Truck className="text-blue-500" size={18} />;
    }
    if (key.includes('maintenance') || key.includes('machines') || key.includes('equipment')) {
      return <Wrench className="text-amber-500" size={18} />;
    }
    if (key.includes('stock') || key.includes('production') || key.includes('progress')) {
      return <Layers className="text-purple-500" size={18} />;
    }
    return <Activity className="text-indigo-500" size={18} />;
  };

  const renderReportContent = () => {
    if (!report || !report.data) {
      return (
        <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
          <AlertTriangle size={24} className="text-amber-500/80" />
          <p className="text-xs font-bold">لا توجد بيانات متاحة حالياً للتصفية المحددة.</p>
        </div>
      );
    }

    if (report.data.message) {
      return (
        <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
          <AlertTriangle size={24} className="text-amber-500/80" />
          <p className="text-xs font-bold">{report.data.message}</p>
        </div>
      );
    }

    const data = report.data[0] || report.data;

    return (
      <div className="space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(data).map(([key, value]) => (
            <div 
              key={key} 
              className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-32 ${
                isNeon 
                  ? 'bg-[#111118]/80 border-purple-950/40 hover:border-purple-500/30 shadow-[0_0_20px_rgba(108,43,217,0.02)]' 
                  : 'bg-white border-slate-200/60 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className={`text-[11px] font-bold leading-relaxed ${isNeon ? 'text-slate-400' : 'text-slate-500'}`}>
                  {getArabicLabel(key)}
                </span>
                <div className={`p-1.5 rounded-lg ${isNeon ? 'bg-slate-900/40 border border-slate-800/50' : 'bg-slate-50 border border-slate-100'}`}>
                  {getMetricIcon(key)}
                </div>
              </div>
              
              <div className="mt-2">
                <span className={`text-2xl font-black ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                  {typeof value === 'number' ? (value as number).toLocaleString() : (value as any) || '-'}
                </span>
                {key.includes('cost') || key.includes('revenue') || key.includes('sales') ? (
                  <span className="text-[9px] font-bold text-slate-400 mr-1">ج.م</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Interactive table for details view */}
        <div className={`rounded-2xl border overflow-hidden ${
          isNeon ? 'bg-[#111118]/85 border-purple-950/40' : 'bg-white border-slate-200/80'
        }`}>
          <div className="p-4 border-b border-slate-200/10 flex items-center justify-between">
            <h3 className={`text-xs font-black flex items-center gap-2 ${isNeon ? 'text-white' : 'text-slate-800'}`}>
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span>جدول تحليل المؤشرات والموازنات والنتائج المالية للربع الحالي</span>
            </h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
              محدث تلقائياً
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`${isNeon ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-50 text-slate-500'} border-b border-slate-200/10 font-bold`}>
                <tr>
                  <th className="p-3.5 pr-5">المؤشر الاستراتيجي (Strategic Metric)</th>
                  <th className="p-3.5">التصنيف والتحليل</th>
                  <th className="p-3.5 text-left pl-5">القيمة المسجلة بالفواتير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/5">
                {Object.entries(data).map(([key, value]) => (
                  <tr key={key} className={`transition-colors duration-200 ${isNeon ? 'hover:bg-slate-900/15' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-3.5 pr-5 font-black ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                      {getArabicLabel(key)}
                    </td>
                    <td className={`p-3.5 font-mono ${isNeon ? 'text-slate-400' : 'text-slate-500'}`}>
                      {key.toUpperCase()}
                    </td>
                    <td className="p-3.5 text-left pl-5 font-black text-indigo-400">
                      {typeof value === 'number' ? (value as number).toLocaleString() : (value as any) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout
      title="📊 تقارير النشاط الاستراتيجية"
      description="لوحة ذكية تقدم تقارير إحصائية وتحليلات مالية وعملياتية دقيقة مخصصة بالكامل لنوع نشاط شركتك المسجل في النظام"
      actions={
        <div className="flex gap-2">
          <Button 
            className={`${isNeon ? 'bg-slate-900/40 border-purple-950/40 text-purple-300 hover:bg-slate-850' : 'bg-white border-slate-200 text-slate-600'} border flex items-center gap-1.5 px-3 py-1.5 text-xs`}
            onClick={() => exportReport('csv')}
            disabled={loading || !report}
          >
            <Download size={13} />
            <span>تصدير Excel (CSV)</span>
          </Button>
          <Button 
            className={`${isNeon ? 'btn-neon bg-purple-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shadow-md shadow-purple-650/15`}
            onClick={() => exportReport('pdf')}
            disabled={loading || !report}
          >
            <FileText size={13} />
            <span>طباعة التقرير PDF</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6" dir="rtl">
        {/* Filters Panel */}
        <Card className={`p-5 rounded-2xl border ${
          isNeon ? 'bg-[#111118]/85 border-purple-950/45 shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col md:flex-row flex-wrap items-end gap-4">
            <div className="w-full md:w-64">
              <label className={`block text-[11px] font-bold mb-1.5 ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                تحديد نوع التقرير المطلوب
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className={`w-full rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 transition-all ${
                  isNeon 
                    ? 'bg-[#14141F] border border-purple-950/50 text-white focus:ring-purple-500' 
                    : 'bg-slate-50 border border-slate-250/60 text-slate-800 focus:ring-blue-500'
                }`}
              >
                <optgroup label="تقارير قطاعية عامة">
                  <option value="summary">ملخص عام وتكاملي للنشاط</option>
                </optgroup>
                <optgroup label="🚛 قطاع النقل والشحن">
                  <option value="shipments">إحصائيات وحركات الشحنات</option>
                  <option value="vehicles">تقرير الأسطول والمركبات</option>
                </optgroup>
                <optgroup label="🏭 قطاع التصنيع والإنتاج">
                  <option value="production">كفاءة الإنتاج والجودة</option>
                  <option value="machines">حالة الآلات والمعدات التشغيلية</option>
                </optgroup>
                <optgroup label="🏗️ قطاع المقاولات والتشييد">
                  <option value="projects">سير إنجاز المشاريع الإنشائية</option>
                  <option value="equipment">استغلال المعدات والرافعات</option>
                </optgroup>
                <optgroup label="🛒 قطاع التجزئة والمبيعات">
                  <option value="sales">تقارير المبيعات ونقاط البيع</option>
                  <option value="products">تحليل المخزون وحالة السلع</option>
                </optgroup>
                <optgroup label="🧹 قطاع الخردة وإعادة التدوير">
                  <option value="scrap_sales">تقرير مبيعات وتدوير الخردة</option>
                  <option value="scrap_products">تقرير تصنيفات ومخزون المواد</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                من تاريخ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 transition-all ${
                    isNeon 
                      ? 'bg-[#14141F] border border-purple-950/50 text-white focus:ring-purple-500' 
                      : 'bg-slate-50 border border-slate-250/60 text-slate-800 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                إلى تاريخ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 transition-all ${
                    isNeon 
                      ? 'bg-[#14141F] border border-purple-950/50 text-white focus:ring-purple-500' 
                      : 'bg-slate-50 border border-slate-250/60 text-slate-800 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            <Button 
              className={`${isNeon ? 'btn-neon bg-purple-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'} text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5`}
              onClick={loadReport}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>تحديث البيانات</span>
            </Button>
          </div>
        </Card>

        {/* Report Content Wrapper */}
        <Card className={`p-6 rounded-2xl border ${
          isNeon ? 'bg-[#111118]/85 border-purple-950/45 shadow-[0_0_20px_rgba(0,0,0,0.15)]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-4 border-b border-slate-200/10">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">تقرير نشاط المنشأة الحالي</span>
              <h2 className={`text-base font-black mt-1 ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                {report ? getActivityName(report.activity) : 'تحميل...'}
              </h2>
            </div>
            {report && (
              <span className={`text-[11px] px-3 py-1 rounded-full font-bold ${
                isNeon ? 'bg-purple-950/40 text-purple-300 border border-purple-500/15' : 'bg-slate-50 text-slate-600 border border-slate-100'
              }`}>
                نوع التحليل: <span className="font-mono">{report.type}</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-bold">جاري تجميع السجلات والتحويل اللحظي للموازنات والنشاطات القطاعية...</p>
            </div>
          ) : (
            renderReportContent()
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default ActivityReportsView;
