import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  FileText, 
  AlertTriangle, 
  Package, 
  Calendar, 
  ArrowUpRight, 
  Percent, 
  Layers, 
  ArrowDownRight, 
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Database,
  Cpu,
  HardDrive,
  Server,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface KPIItem {
  value: number;
  label: string;
  change: string;
  icon: string;
}

interface DashboardData {
  kpis: {
    revenue: KPIItem;
    expenses: KPIItem;
    profit: KPIItem;
    employees: KPIItem;
    pending_invoices: KPIItem;
    active_projects: KPIItem;
  };
  charts: {
    revenue: Array<{ month: string; revenue: number }>;
    expenses: Array<{ month: string; expenses: number }>;
    departments: Array<{ department: string; count: number }>;
    top_products: Array<{ name: string; sales_count: number; revenue: number }>;
  };
  activities: Array<{
    action_type: string;
    description: string;
    user_name: string;
    table_name: string;
    created_at: string;
  }>;
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    priority: string;
  }>;
  updated_at: string;
}

export const AdvancedDashboardView: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // System Monitoring States
  const [dashboardTab, setDashboardTab] = useState<'financial' | 'system'>('financial');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loadingSystem, setLoadingSystem] = useState(false);
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    if (dashboardTab === 'system') {
      loadSystemStatus();
      const interval = setInterval(loadSystemStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [dashboardTab]);

  const loadDashboard = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/advanced');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('❌ فشل جلب لوحة التحكم:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadSystemStatus = async () => {
    setLoadingSystem(true);
    try {
      const res = await fetch('/api/dashboard/system-status');
      if (res.ok) {
        const result = await res.json();
        setSystemStatus(result);
      }
    } catch (error) {
      console.error('❌ فشل جلب حالة النظام:', error);
    } finally {
      setLoadingSystem(false);
    }
  };

  const handleFlushCache = async () => {
    setIsFlushingCache(true);
    try {
      const res = await fetch('/api/cache/flush', { method: 'POST' });
      if (res.ok) {
        alert('✅ تم تفريغ وتحديث الذاكرة المؤقتة (Memory & HTTP Cache) بالكامل بنجاح!');
        loadSystemStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFlushingCache(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const tenantId = "tenant-promet-sa";
      const res = await fetch(`/api/admin/backup?tenantId=${tenantId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PROMET_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('❌ فشل إنشاء نسخة احتياطية من قاعدة البيانات');
      }
    } catch (e) {
      console.error(e);
      alert('❌ فشل تشغيل سكريبت النسخ الاحتياطي');
    } finally {
      setIsBackingUp(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'low':
        return 'border-violet-500/30 bg-violet-500/10 text-violet-400';
      default:
        return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'update':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'delete':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <MainLayout title="لوحة التحكم المتقدمة" description="جاري تحميل المؤشرات والرسوم البيانية المحاسبية">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-purple-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-400">⏳ جاري تحميل البيانات المالية المتقدمة...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout title="لوحة التحكم المتقدمة" description="خطأ في تحميل البيانات">
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <p className="text-base font-bold text-white">⚠️ لا توجد بيانات لعرضها حالياً</p>
          <Button variant="primary" className="mt-4" onClick={loadDashboard}>
            إعادة المحاولة
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Group chart revenues and expenses by month
  const combinedChartData = data?.charts?.revenue ? data.charts.revenue.map((rev) => {
    const expItem = data.charts.expenses?.find((exp) => exp.month === rev.month);
    return {
      month: rev.month || '',
      الإيرادات: rev.revenue || 0,
      المصروفات: expItem ? (expItem.expenses || 0) : 0,
    };
  }) : [];

  const COLORS = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <MainLayout
      title="📊 لوحة التحكم المتقدمة"
      description={`آخر تحديث مالي وتلقائي: ${new Date(data.updated_at).toLocaleTimeString('ar-EG')} - جميع المعاملات بالجنيه المصري (ج.م)`}
      actions={
        <div className="flex items-center gap-2">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value={15000}>تحديث كل 15 ثانية</option>
            <option value={30000}>تحديث كل 30 ثانية</option>
            <option value={60000}>تحديث كل دقيقة</option>
            <option value={300000}>تحديث كل 5 دقائق</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDashboard}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6" dir="rtl">
        {/* Tab Selector */}
        <div className="flex border-b border-slate-800/80 pb-px gap-6 mb-2">
          <button
            onClick={() => setDashboardTab('financial')}
            className={`pb-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
              dashboardTab === 'financial'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={15} />
            <span>📊 المؤشرات والتقارير المالية</span>
          </button>
          <button
            onClick={() => setDashboardTab('system')}
            className={`pb-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
              dashboardTab === 'system'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={15} />
            <span>⚙️ مراقبة أداء وحالة النظام (لحظي)</span>
          </button>
        </div>

        {dashboardTab === 'financial' ? (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {Object.entries(data?.kpis || {}).map(([key, kpiValue]) => {
                const kpi = kpiValue as any;
                const isPositive = kpi.change.startsWith('+');
                const isDanger = key === 'expenses' || (key === 'pending_invoices' && !isPositive);
                return (
                  <div 
                    key={key} 
                    className="card-glow p-5 flex flex-col justify-between border border-slate-800/60 bg-slate-900/40 rounded-2xl hover:border-purple-500/20 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xl p-2 bg-slate-800/60 rounded-xl">{kpi.icon}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPositive 
                          ? isDanger ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          : isDanger ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {kpi.change}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-400">{kpi.label}</p>
                      <p className="text-lg font-black text-white mt-1">
                        {key === 'revenue' || key === 'expenses' || key === 'profit'
                          ? `${kpi.value.toLocaleString('ar-EG')} ج.م`
                          : kpi.value.toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue vs Expenses Chart (Area Chart) */}
              <Card 
                title="📈 مقارنة الإيرادات والمصروفات الشهرية" 
                subtitle="الرصد المالي لآخر 6 أشهر بـ (ج.م)"
                className="lg:col-span-2"
              >
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={combinedChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="الإيرادات" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                      <Area type="monotone" dataKey="المصروفات" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Department Distribution (Pie Chart) */}
              <Card 
                title="👥 توزيع الموظفين حسب الأقسام" 
                subtitle="مجموع القوى العاملة النشطة بالشركة"
              >
                <div className="h-64 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.charts?.departments || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="department"
                      >
                        {(data?.charts?.departments || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">
                      {(data?.charts?.departments || []).reduce((sum, d) => sum + d.count, 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">إجمالي الموظفين</span>
                  </div>
                </div>
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(data?.charts?.departments || []).map((dept, index) => (
                    <div key={`${dept.department || 'dept'}-${index}`} className="flex items-center gap-2 px-2 py-1 bg-slate-800/20 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[11px] font-medium text-slate-300 truncate w-24">{dept.department}</span>
                      <span className="text-[11px] font-black text-white mr-auto">{dept.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Products, Alerts, & Activity Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Selling Products */}
              <Card 
                title="🏆 المنتجات والخدمات الأكثر مبيعاً" 
                subtitle="الترتيب حسب حجم الإيرادات بـ (ج.م)"
                className="lg:col-span-1"
              >
                <div className="space-y-3.5 pt-2">
                  {(data?.charts?.top_products || []).map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-900/30 border border-slate-800/40 rounded-xl hover:border-purple-500/10 transition-all">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-lg ${
                          index === 0 ? 'bg-amber-500/20 text-amber-400' :
                          index === 1 ? 'bg-slate-400/20 text-slate-300' :
                          index === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-800/60 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-200 line-clamp-1">{product.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{product.sales_count} عملية بيع ناجحة</p>
                        </div>
                      </div>
                      <p className="text-xs font-black text-purple-400 shrink-0">
                        {product.revenue?.toLocaleString('ar-EG')} ج.م
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Smart Notifications & Alerts */}
              <Card 
                title="🔔 نظام التنبيهات والإشعارات الذكية" 
                subtitle="مراقبة ومحاكاة مستمرة لحالة الفواتير والمخزون والإجازات"
                className="lg:col-span-1"
              >
                <div className="space-y-3 pt-2">
                  {(data?.alerts || []).map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border-r-4 border-y border-l border-slate-800/40 ${getPriorityColor(alert.priority)} transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold">{alert.title}</p>
                        <span className="text-[9px] font-black uppercase tracking-wider opacity-80">{alert.priority}</span>
                      </div>
                      <p className="text-[11px] mt-1.5 opacity-90 leading-relaxed">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Audit & Activities */}
              <Card 
                title="🕒 سجل الأنشطة والتدقيق المحاسبي" 
                subtitle="آخر الحركات والعمليات المنفذة على النظام"
                className="lg:col-span-1"
              >
                <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
                  {(data?.activities || []).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/40 transition-colors">
                      <span className="p-1.5 bg-slate-800/60 rounded-lg shrink-0 mt-0.5">
                        {getActionIcon(activity.action_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[9px] text-purple-400 font-bold truncate">بواسطة: {activity.user_name}</span>
                          <span className="text-[9px] text-slate-500 font-medium shrink-0">
                            {new Date(activity.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Real-time System Monitoring Dashboard Tab */
          <div className="space-y-6">
            {loadingSystem && !systemStatus ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                <p className="text-slate-400 text-xs font-bold">جاري الاتصال بقنوات المراقبة اللحظية للنظام وقاعدة البيانات...</p>
              </div>
            ) : systemStatus ? (
              <>
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PostgreSQL Status */}
                  <div className="p-5 border border-slate-800/60 bg-slate-900/40 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                      <Database size={22} className={systemStatus.postgres.connected ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">قاعدة بيانات PostgreSQL (Cloud SQL)</h4>
                      <p className="text-sm font-black text-white mt-1">
                        {systemStatus.postgres.connected ? "🟢 متصلة ونشطة" : "🔴 غير متصلة (محاكاة محلي)"}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">{systemStatus.postgres.driver}</p>
                    </div>
                    <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.postgres.connected ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                  </div>

                  {/* Firebase Firestore Status */}
                  <div className="p-5 border border-slate-800/60 bg-slate-900/40 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                      <Server size={22} className={systemStatus.firebase.connected ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">قاعدة بيانات Firebase (Firestore)</h4>
                      <p className="text-sm font-black text-white mt-1">
                        {systemStatus.firebase.connected ? "🟢 متصلة ونشطة" : "🔴 غير متصلة (محاكاة محلي)"}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">{systemStatus.firebase.driver}</p>
                    </div>
                    <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.firebase.connected ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                  </div>

                  {/* Cache Service Status */}
                  <div className="p-5 border border-slate-800/60 bg-slate-900/40 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                      <HardDrive size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">محرك الذاكرة المؤقتة للسرعة (Cache Service)</h4>
                      <p className="text-sm font-black text-white mt-1">
                        ⚡ نشط ومفعل
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1 font-sans">
                        المفاتيح النشطة: <span className="font-mono text-purple-400 font-bold">{systemStatus.cache.totalKeys}</span> | منتهية: <span className="font-mono text-rose-400 font-bold">{systemStatus.cache.expiredKeysCount}</span>
                      </p>
                    </div>
                    <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                </div>

                {/* Metrics and Operations panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* System & Process Performance */}
                  <Card 
                    title="💻 معلومات بيئة التشغيل وموارد النظام" 
                    subtitle="بيانات حيّة مستمدة من معالج حاوية التطبيق"
                    className="lg:col-span-1"
                  >
                    <div className="space-y-3.5 pt-2 text-xs font-sans">
                      <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5"><Cpu size={13} className="text-purple-400" /> استهلاك الذاكرة الفعلي (Heap Used)</span>
                        <span className="font-mono font-black text-white">{systemStatus.process.memoryUsage.heapUsed}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5"><Cpu size={13} className="text-indigo-400" /> إجمالي الذاكرة المحجوزة (Heap Total)</span>
                        <span className="font-mono font-black text-white">{systemStatus.process.memoryUsage.heapTotal}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5"><Clock size={13} className="text-emerald-400" /> مدة عمل الخادم بلا انقطاع (Uptime)</span>
                        <span className="font-mono font-black text-white">
                          {Math.floor(systemStatus.process.uptime / 3600)} ساعة و {Math.floor((systemStatus.process.uptime % 3600) / 60)} دقيقة
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5"><Server size={13} className="text-blue-400" /> إصدار بيئة Node.js</span>
                        <span className="font-mono font-black text-white">{systemStatus.process.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5"><Cpu size={13} className="text-slate-400" /> نظام التشغيل المعزز (OS Platform)</span>
                        <span className="font-mono font-black text-white text-left uppercase">{systemStatus.process.platform} (PID: {systemStatus.process.pid})</span>
                      </div>
                    </div>
                  </Card>

                  {/* Database Optimized Indexes setup details */}
                  <Card 
                    title="⚡ فهارس تسريع الاستعلامات (Postgres Indexes)" 
                    subtitle="الفهارس وقواعد الأداء التي تم تفعيلها لضمان سرعة معالجة المستندات"
                    className="lg:col-span-2"
                  >
                    <div className="overflow-x-auto text-xs font-sans">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-slate-400 font-bold">
                            <th className="py-2.5 pr-2">اسم الجدول (Table Name)</th>
                            <th className="py-2.5">الحقول المفهرسة والمنظمة (Indexed Fields)</th>
                            <th className="py-2.5 text-left pl-2">الحالة والجاهزية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {systemStatus.postgres.indexesSetup.map((idx: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-900/20">
                              <td className="py-2.5 pr-2 font-mono font-black text-white">{idx.table}</td>
                              <td className="py-2.5 font-mono text-purple-400 font-bold">
                                {idx.indexes.map((field: string) => `"${field}"`).join(', ')}
                              </td>
                              <td className="py-2.5 text-left pl-2">
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  ⚡ مفهرس ونشط
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Operations Center & System Logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Administrative Operations panel */}
                  <Card 
                    title="🛠️ مركز العمليات الإدارية وسكريبتات الدعم" 
                    subtitle="تنفيذ سكريبتات الدعم والتحسين اللحظي للنظام بنقرة زر"
                    className="lg:col-span-1"
                  >
                    <div className="space-y-4 pt-2">
                      <div className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-200">النسخ الاحتياطي اللحظي (Durability Backup)</h5>
                          <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">سكريبت مفعّل</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          يقوم هذا الخيار بجمع كافة الفواتير، الموظفين، والمصروفات من قواعد البيانات، وتصديرها كملف مشفر وموثوق للحفظ الآمن.
                        </p>
                        <Button
                          onClick={handleDownloadBackup}
                          disabled={isBackingUp}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                        >
                          <RefreshCw size={13} className={isBackingUp ? "animate-spin" : ""} />
                          <span>{isBackingUp ? "جاري تجميع البيانات والنسخ..." : "🚀 تشغيل سكريبت النسخ الاحتياطي"}</span>
                        </Button>
                      </div>

                      <div className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-200">تصفير الذاكرة المؤقتة (Clear Cache Engine)</h5>
                          <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">تحسين فوري</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          يقوم بمسح كافة الاستعلامات المخزنة بمحرك الكاش لمنتجات ومبيعات المنشأة فوراً لإجبار المخدم على سحب أحدث السجلات الحقيقية.
                        </p>
                        <Button
                          onClick={handleFlushCache}
                          disabled={isFlushingCache}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10"
                        >
                          <Trash2 size={13} className={isFlushingCache ? "animate-spin" : ""} />
                          <span>{isFlushingCache ? "جاري تصفير الذاكرة..." : "♻️ مسح وتصفير كاش النظام"}</span>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Comprehensive Audit Logs mapping */}
                  <Card 
                    title="📋 سجلات الرقابة وتدقيق الحركات الأمنية" 
                    subtitle="رصد متواصل لكافة محاولات الدخول والتعديل والمحو بنظام بروميت المعزز"
                    className="lg:col-span-2"
                  >
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {systemStatus.recentLogs.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-xs font-bold">
                          لا توجد سجلات تدقيق أمني مسجلة حالياً بقاعدة البيانات.
                        </div>
                      ) : (
                        systemStatus.recentLogs.map((log: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/30 border border-slate-800/35 rounded-xl hover:bg-slate-900/50 transition-all text-xs font-sans">
                            <span className="p-1.5 bg-slate-800/60 rounded-lg shrink-0 mt-0.5">
                              {getActionIcon(log.actionType || log.action_type || 'info')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-slate-200">{log.description}</span>
                                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                  {new Date(log.createdAt || log.created_at).toLocaleTimeString('ar-EG')}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] text-slate-400">
                                <span className="font-bold text-purple-400">المستخدم: {log.userName || log.user_name || 'زائر مجهول'}</span>
                                <span className="font-mono text-slate-500 font-bold">الجدول: {log.tableName || log.table_name || 'عام'}</span>
                                {log.ipAddress || log.ip ? (
                                  <span className="font-mono text-slate-500">IP: {log.ipAddress || log.ip}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3 animate-bounce" />
                <p className="text-sm font-bold text-white">⚠️ تعذر تجميع بيانات حالة النظام المباشرة</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdvancedDashboardView;
