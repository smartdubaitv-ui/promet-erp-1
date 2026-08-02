import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { colors, typography } from '../theme';
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
  UserCheck
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
  Cell, 
  LineChart, 
  Line 
} from 'recharts';

interface Widget {
  id: number;
  widget_key: string;
  widget_title: string;
  widget_type: string;
  widget_config: any;
  order_index: number;
}

interface DashboardData {
  [key: string]: any;
}

interface RoleDashboard {
  role: string;
  widgets: Widget[];
  data: DashboardData;
}

interface CustomDashboardViewProps {
  userRole: string;
  appTheme?: 'classic' | 'neon';
}

export const CustomDashboardView: React.FC<CustomDashboardViewProps> = ({ userRole, appTheme = 'neon' }) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<RoleDashboard | null>(null);
  
  // Dynamic Operational Activity State Integration
  const [activeTab, setActiveTab] = useState<'financial' | 'operational'>('financial');
  const [activityDashboard, setActivityDashboard] = useState<any>(null);

  const isNeon = appTheme === 'neon';
  const cardBgClass = isNeon ? 'card-glow text-white' : 'bg-white border-slate-150 shadow-sm';
  const textPrimaryClass = isNeon ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isNeon ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    loadDashboard();
  }, [userRole]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [res, resActivity] = await Promise.all([
        fetch(`/api/dashboard/${userRole}`),
        fetch('/api/dashboard/activity')
      ]);
      
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
      
      if (resActivity.ok) {
        const dataAct = await resActivity.json();
        setActivityDashboard(dataAct);
      }
    } catch (error) {
      console.error('❌ فشل جلب لوحة التحكم المخصصة والنشاط:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'المدير العام (CEO)';
      case 'cfo':
        return 'المدير المالي (CFO)';
      case 'hr':
        return 'مدير الموارد البشرية (HR)';
      case 'sales':
        return 'مدير المبيعات (Sales)';
      case 'inventory':
        return 'مدير المخزون (Inventory)';
      default:
        return 'الموظف العام';
    }
  };

  const getActivityName = (code?: string) => {
    if (!code) return '';
    const map: Record<string, string> = {
      scrap: '🧹 قطاع الخردة وإعادة التدوير والتشغيل المعدني',
      transport: '🚛 قطاع النقل والشحن والدعم اللوجستي',
      manufacturing: '🏭 قطاع التصنيع والإنتاج الميكانيكي',
      construction: '🏗️ قطاع المقاولات والتطوير العقاري',
      retail: '🛒 قطاع التجزئة والمبيعات المباشرة',
      hotel: '🏨 قطاع إدارة الفنادق والضيافة',
      healthcare: '🏥 قطاع الرعاية الصحية والمستشفيات',
      education: '🎓 قطاع التعليم والمدارس',
      agriculture: '🌾 قطاع الزراعة وتوريد الأغذية'
    };
    return map[code] || code;
  };


  const getStatIconAndBg = (key: string) => {
    switch (key) {
      case 'total_revenue':
      case 'cash_flow':
      case 'monthly_sales':
        return { icon: <DollarSign className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' };
      case 'total_expenses':
      case 'overdue_invoices':
        return { icon: <TrendingDown className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50' };
      case 'net_profit':
      case 'stock_value':
        return { icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' };
      case 'total_employees':
      case 'total_employees_hr':
        return { icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' };
      case 'today_attendance':
      case 'my_attendance':
        return { icon: <UserCheck className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-50' };
      case 'pending_leaves':
        return { icon: <Calendar className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' };
      case 'total_products':
        return { icon: <Package className="w-5 h-5 text-cyan-600" />, bg: 'bg-cyan-50' };
      case 'low_stock_items':
        return { icon: <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />, bg: 'bg-red-50' };
      default:
        return { icon: <Activity className="w-5 h-5 text-slate-600" />, bg: 'bg-slate-50' };
    }
  };

  const renderWidget = (widget: Widget) => {
    const rawData = dashboard?.data?.[widget.widget_key];

    switch (widget.widget_type) {
      case 'stat':
        const style = getStatIconAndBg(widget.widget_key);
        let displayValue = '0';
        if (typeof rawData === 'number') {
          displayValue = rawData.toLocaleString();
          // Add currency where relevant
          if (['total_revenue', 'total_expenses', 'net_profit', 'cash_flow', 'overdue_invoices', 'total_payroll', 'monthly_sales', 'stock_value'].includes(widget.widget_key)) {
            displayValue = `${displayValue} ج.م`;
          }
        } else if (typeof rawData === 'string') {
          displayValue = rawData;
        } else if (rawData && typeof rawData === 'object') {
          displayValue = Array.isArray(rawData) ? `[مصفوفة من ${rawData.length} عناصر]` : JSON.stringify(rawData);
        } else {
          displayValue = String(rawData || '0');
        }

        return (
          <div key={widget.id} className={`${cardBgClass} p-5 rounded-2xl border flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
            <div className="space-y-1.5 text-right">
              <p className={`text-xs font-bold ${isNeon ? 'text-purple-300/80' : 'text-slate-400'}`}>{widget.widget_title}</p>
              <p className={`text-xl font-black tracking-tight ${isNeon ? 'text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'text-slate-800'}`}>{displayValue}</p>
            </div>
            <div className={`p-3 rounded-xl shrink-0 ${isNeon ? 'bg-purple-950/40 border border-purple-500/20 text-purple-300' : style.bg}`}>
              {React.cloneElement(style.icon, { className: `w-5 h-5 ${isNeon ? 'text-purple-400' : style.icon.props.className}` })}
            </div>
          </div>
        );

      case 'chart':
        if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
          return (
            <Card key={widget.id} className={`p-6 border flex flex-col justify-center items-center min-h-64 ${cardBgClass}`}>
              <h4 className={`text-xs font-black self-start mb-4 text-right w-full ${isNeon ? 'text-purple-300/80' : 'text-slate-700'}`}>{widget.widget_title}</h4>
              <AlertTriangle className={`w-8 h-8 mb-2 ${isNeon ? 'text-purple-500/40' : 'text-slate-300'}`} />
              <p className="text-[11px] text-slate-400">لا تتوفر بيانات رسومية كافية حالياً</p>
            </Card>
          );
        }

        const renderChartComponent = () => {
          const gridColor = isNeon ? '#1e1b4b' : '#f1f5f9';
          const labelColor = isNeon ? '#cbd5e1' : '#64748b';
          const primaryStroke = isNeon ? '#8b5cf6' : '#2563eb';
          const secondaryStroke = isNeon ? '#d946ef' : '#10b981';

          if (widget.widget_key === 'revenue_chart' || widget.widget_key === 'sales_chart') {
            return (
              <AreaChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryStroke} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={primaryStroke} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <Tooltip 
                  contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', border: '1px solid #312e81', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#0a0a0f', color: '#ffffff' } : { direction: 'rtl', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }} 
                  formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'المبلغ']}
                />
                <Area type="monotone" dataKey={widget.widget_key === 'revenue_chart' ? 'revenue' : 'sales'} stroke={primaryStroke} strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            );
          }

          if (widget.widget_key === 'cash_flow_chart') {
            return (
              <BarChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <Tooltip contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', border: '1px solid #312e81', fontSize: '11px', backgroundColor: '#0a0a0f', color: '#ffffff' } : { direction: 'rtl', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="inflow" name="التدفقات الداخلة" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="التدفقات الخارجة" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          }

          if (widget.widget_key === 'attendance_chart') {
            return (
              <AreaChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isNeon ? '#ec4899' : '#14b8a6'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={isNeon ? '#ec4899' : '#14b8a6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <Tooltip contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', border: '1px solid #312e81', fontSize: '11px', backgroundColor: '#0a0a0f', color: '#ffffff' } : { direction: 'rtl', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Area type="monotone" dataKey="present" name="الحضور %" stroke={isNeon ? '#ec4899' : '#14b8a6'} strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            );
          }

          if (widget.widget_key === 'department_distribution' || widget.widget_key === 'department_count') {
            const COLORS = isNeon 
              ? ['#8b5cf6', '#d946ef', '#06b6d4', '#ec4899', '#f59e0b', '#3b82f6']
              : ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
            return (
              <PieChart>
                <Pie
                  data={rawData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {rawData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', fontSize: '11px', backgroundColor: '#0a0a0f', color: '#ffffff', border: '1px solid #312e81' } : { direction: 'rtl', borderRadius: '12px', fontSize: '11px' }} />
                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px', color: labelColor }} />
              </PieChart>
            );
          }

          if (widget.widget_key === 'budget_vs_actual') {
            return (
              <BarChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <Tooltip contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', fontSize: '11px', backgroundColor: '#0a0a0f', color: '#ffffff', border: '1px solid #312e81' } : { direction: 'rtl', borderRadius: '12px', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="budget" name="الميزانية المحددة" fill={isNeon ? '#475569' : '#64748b'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="المصروف الفعلي" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          }

          if (widget.widget_key === 'stock_movement') {
            return (
              <LineChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <YAxis tick={{ fontSize: 10, fill: labelColor }} stroke={isNeon ? '#312e81' : '#cbd5e1'} />
                <Tooltip contentStyle={isNeon ? { direction: 'rtl', borderRadius: '12px', fontSize: '11px', backgroundColor: '#0a0a0f', color: '#ffffff', border: '1px solid #312e81' } : { direction: 'rtl', borderRadius: '12px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="movement" name="حجم الحركة" stroke={isNeon ? '#a855f7' : '#8b5cf6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            );
          }

          // Default fallback LineChart
          return (
            <LineChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={primaryStroke} strokeWidth={2} />
            </LineChart>
          );
        };

        return (
          <Card key={widget.id} className={`p-6 min-h-80 flex flex-col justify-between ${cardBgClass}`}>
            <h4 className={`text-xs font-black mb-6 text-right w-full flex justify-between items-center border-b pb-2 ${isNeon ? 'text-purple-300 border-purple-500/10' : 'text-slate-700 border-slate-50'}`}>
              <span>{widget.widget_title}</span>
              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isNeon ? 'bg-purple-500' : 'bg-blue-600'}`} />
            </h4>
            <div className="flex-1 w-full min-h-56">
              <ResponsiveContainer width="100%" height="100%">
                {renderChartComponent()}
              </ResponsiveContainer>
            </div>
          </Card>
        );

      case 'list':
        return (
          <Card key={widget.id} className={`p-6 flex flex-col ${cardBgClass}`}>
            <h4 className={`text-xs font-black mb-4 text-right border-b pb-2 flex justify-between items-center ${isNeon ? 'text-purple-300 border-purple-500/10' : 'text-slate-700 border-slate-50'}`}>
              <span>{widget.widget_title}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isNeon ? 'text-purple-300 bg-purple-950/50 border border-purple-500/30' : 'text-blue-600 bg-blue-50'}`}>مباشر / Live</span>
            </h4>
            {(!rawData || !Array.isArray(rawData) || rawData.length === 0) ? (
              <div className="flex-1 flex flex-col justify-center items-center py-8">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-400">لا توجد سجلات حالياً</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1">
                {rawData.map((item: any, idx: number) => (
                  <div key={idx} className={`p-3 border rounded-xl flex gap-3 text-right items-start transition-colors duration-200 ${isNeon ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50/75 border-slate-100 hover:bg-slate-50'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isNeon ? 'bg-purple-400' : 'bg-blue-500'}`} />
                    <div className="space-y-0.5">
                      <p className={`text-xs font-bold leading-relaxed ${isNeon ? 'text-slate-200' : 'text-slate-700'}`}>{item.description || item.name || JSON.stringify(item)}</p>
                      {item.time && <span className="block text-[9px] text-slate-400 font-mono">{item.time}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-bold">جاري تحميل لوحة التحكم المخصصة لدورك...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={`text-center py-20 rounded-2xl border p-8 m-6 ${cardBgClass}`}>
        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-sm font-bold text-slate-800">لا توجد لوحة تحكم مخصصة لهذا الدور</h3>
        <p className="text-xs text-slate-400 mt-1">يرجى اختيار دور مستخدم آخر من القائمة في الأعلى.</p>
      </div>
    );
  }

  const renderOperationalDashboard = () => {
    if (!activityDashboard) {
      return (
        <div className="text-center py-12 text-slate-500 text-xs">
          ⚠️ لا توجد بيانات تشغيلية متاحة حالياً لنشاط الشركة.
        </div>
      );
    }

    const { activity, data } = activityDashboard;

    return (
      <div className="space-y-6">
        {/* Upper Active Sector Header */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${isNeon ? 'bg-purple-950/20 border-purple-500/20' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <h4 className="text-xs font-black text-white">مؤشرات القطاع والعمليات التشغيلية الفعالة</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">مؤشرات الأداء المخصصة لنشاط: {getActivityName(activity)}</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
            نشط / Active
          </span>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {data.metrics?.map((metric: any, index: number) => (
            <div
              key={index}
              className={`${cardBgClass} p-5 text-right flex flex-col justify-between hover:shadow-lg transition-all animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <p className="text-[#A0A0B0] text-[10px] font-bold">{metric.title}</p>
              <p className="text-xl font-black text-white mt-2 drop-shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                {metric.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Operational Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <Card className={`${cardBgClass} p-6`}>
            <h3 className="text-xs font-black text-white mb-4 border-b pb-2">📈 تفاصيل النشاط والعمليات الفعالة</h3>
            <div className="space-y-3">
              {Object.entries(data)
                .filter(([key]) => key !== 'metrics')
                .map(([key, value]) => {
                  const translateKey = (k: string) => {
                    const map: Record<string, string> = {
                      vehicles: '🚛 عدد المركبات الفعالة بالأسطول',
                      drivers: '👨‍✈️ السائقين والمناديب المسجلين',
                      activeShipments: '📦 الشحنات قيد النقل والتوصيل',
                      pendingMaintenance: '🔧 أعمال ومطالبات الصيانة المعلقة',
                      dailyProduction: '🏭 كمية الإنتاج اليومي للمصنع',
                      activeMachines: '⚙️ الآلات والمعدات التشغيلية النشطة',
                      activeOrders: '📋 أوامر التوريد والإنتاج المفتوحة',
                      lowMaterials: '📦 نقص إمدادات المواد الخام',
                      activeProjects: '🏗️ المشاريع الإنشائية القائمة حالياً',
                      activeEquipment: '⚙️ المعدات والرافعات الموقرة بالموقع',
                      activeWorkers: '👷 العمال والمقاولين الفاعلين اليوم',
                      activeContracts: '📄 العقود الإنشائية المبرمة والموثقة',
                      dailySales: '🛒 مبيعات التجزئة المحققة اليوم',
                      totalCustomers: '👥 إجمالي المشترين بدفتر العملاء',
                      lowStockProducts: '📦 سلع ومنتجات قاربت كميتها على النفاد',
                      pendingOrders: '📋 فواتير وأوامر بيع بانتظار الدفع',
                      employees: '👥 إجمالي موظفي المنشأة',
                      revenue: '💰 إجمالي التدفقات الإيرادية',
                      expenses: '💸 إجمالي مصروفات التشغيل المتراكمة',
                      pendingInvoices: '📋 فواتير المشتريات المعلقة'
                    };
                    return map[k] || k;
                  };

                  const formatValue = (k: string, val: any) => {
                    if (typeof val === 'object' && val !== null) {
                      if (Array.isArray(val)) {
                        return `[مصفوفة من ${val.length} عناصر]`;
                      }
                      return JSON.stringify(val);
                    }
                    if (typeof val === 'number') {
                      const isCurrency = ['revenue', 'expenses', 'dailySales'].includes(k);
                      return isCurrency ? `${val.toLocaleString()} ج.م` : val.toLocaleString();
                    }
                    return String(val);
                  };

                  return (
                    <div key={key} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                      <span className="text-[#A0A0B0] text-xs">{translateKey(key)}</span>
                      <span className="text-white font-black text-xs">{formatValue(key, value)}</span>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className={`${cardBgClass} p-6`}>
            <h3 className="text-xs font-black text-white mb-4 border-b pb-2">🔔 تنبيهات القطاع والتحوط المالي السريع</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/30 rounded-lg border-r-4 border-amber-500 flex justify-between items-center">
                <div>
                  <p className="text-white text-xs font-bold">⚠️ 3 فواتير ومطالبات متأخرة بحاجة للمتابعة</p>
                  <p className="text-[9px] text-[#A0A0B0] mt-0.5">منذ 2 ساعة</p>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">حرج / Urgent</span>
              </div>
              <div className="p-3 bg-black/30 rounded-lg border-r-4 border-purple-500 flex justify-between items-center">
                <div>
                  <p className="text-white text-xs font-bold">📦 5 منتجات وسلع بمستودعاتك قاربت النفاد</p>
                  <p className="text-[9px] text-[#A0A0B0] mt-0.5">منذ 5 ساعات</p>
                </div>
                <span className="text-[10px] text-purple-400 font-bold font-mono">Inventory</span>
              </div>
              <div className="p-3 bg-black/30 rounded-lg border-r-4 border-emerald-500 flex justify-between items-center">
                <div>
                  <p className="text-white text-xs font-bold">✅ تم اعتماد وصرف رواتب مسيرات الموظفين بنجاح</p>
                  <p className="text-[9px] text-[#A0A0B0] mt-0.5">منذ يوم</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">مكتمل / Done</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const statWidgets = dashboard.widgets.filter(w => w.widget_type === 'stat');
  const chartWidgets = dashboard.widgets.filter(w => w.widget_type === 'chart');
  const listWidgets = dashboard.widgets.filter(w => w.widget_type === 'list');

  return (
    <div className="space-y-6 p-6 animate-fade-in" dir="rtl">
      {/* Upper Welcoming Banner */}
      <div className={`p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isNeon ? 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 text-white border border-purple-500/20' : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white'}`}>
        {/* Background decorative glowing circles */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-x-20 translate-y-20" />
        
        <div className="space-y-1 relative z-10 text-right">
          <div className="flex items-center gap-2 justify-start">
            <span className="text-lg">📊</span>
            <h1 className="text-sm md:text-base font-black tracking-tight">
              لوحة التحكم الذكية - {getRoleDisplayName(dashboard.role)}
            </h1>
          </div>
          <p className="text-[10px] md:text-xs text-blue-100 font-medium">
            مرحباً بك مجدداً. تم تفصيل هذه المؤشرات بدقة عالية بناءً على صلاحيات ومهام دورك الحالي في النظام.
          </p>
        </div>

        <button 
          onClick={loadDashboard}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-[10px] font-bold transition-all duration-300 backdrop-blur-sm self-end md:self-auto border border-white/10 focus:outline-none cursor-pointer relative z-10"
        >
          <RefreshCw size={11} className="animate-spin-slow" />
          تحديث المؤشرات
        </button>
      </div>

      {/* Tabs Selector Navigation inside the main Dashboard view */}
      <div className="flex gap-2 border-b border-slate-200/10 pb-1">
        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3 px-4 text-xs font-black transition-all cursor-pointer relative ${
            activeTab === 'financial'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 المؤشرات المالية والعامة
        </button>
        <button
          onClick={() => setActiveTab('operational')}
          className={`pb-3 px-4 text-xs font-black transition-all cursor-pointer relative ${
            activeTab === 'operational'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🎯 مؤشرات القطاع التشغيلي ({(() => {
            if (!activityDashboard || !activityDashboard.activity) return '...';
            const fullName = getActivityName(activityDashboard.activity);
            if (!fullName) return '...';
            const parts = fullName.split(' ');
            return parts.length > 2 ? parts.slice(2).join(' ') : (parts[1] || fullName);
          })()})
        </button>
      </div>

      {/* Conditional Content Rendering */}
      {activeTab === 'financial' ? (
        <>
          {/* Stats Section */}
          {statWidgets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statWidgets.map(widget => renderWidget(widget))}
            </div>
          )}

          {/* Main Grid for Charts and Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartWidgets.map(widget => renderWidget(widget))}
            {listWidgets.map(widget => renderWidget(widget))}
          </div>
        </>
      ) : (
        renderOperationalDashboard()
      )}
    </div>
  );

};
