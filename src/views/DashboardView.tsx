import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { colors, typography } from '../theme';

interface DashboardData {
  activity: string;
  data: {
    metrics: Array<{ title: string; value: number; color: string }>;
    [key: string]: any;
  };
}

export const DashboardView: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/activity');
      const data = await res.json();
      setDashboard(data);
    } catch (error) {
      console.error('❌ فشل جلب لوحة التحكم:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityName = (code: string) => {
    const map: Record<string, string> = {
      scrap: '🧹 الخردة وإعادة التدوير',
      transport: '🚛 نقل وشحن',
      manufacturing: '🏭 تصنيع',
      construction: '🏗️ مقاولات',
      retail: '🛒 تجزئة',
      hotel: '🏨 فندق',
      healthcare: '🏥 صحي',
      education: '🎓 تعليمي',
      agriculture: '🌾 زراعي'
    };
    return map[code] || code;
  };

  if (loading) {
    return (
      <MainLayout title="لوحة التحكم" description="⏳ جاري تحميل لوحة التحكم...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#6C2BD9] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[#A0A0B0]">⏳ جاري تحميل لوحة التحكم...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!dashboard) {
    return (
      <MainLayout title="لوحة التحكم" description="⚠️ لا توجد بيانات لعرضها">
        <div className="text-center py-12">
          <p className="text-[#A0A0B0]">⚠️ لا توجد بيانات لعرضها</p>
        </div>
      </MainLayout>
    );
  }

  const { activity, data } = dashboard;

  return (
    <MainLayout
      title={`📊 لوحة التحكم - ${getActivityName(activity)}`}
      description="مرحباً بك في لوحة التحكم المخصصة لنشاطك"
    >
      <div className="space-y-6" dir="rtl">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.metrics?.map((metric, index) => (
            <div
              key={index}
              className="card-glow p-4.5 text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-[#A0A0B0] text-xs">{metric.title}</p>
              <p className="text-xl font-bold text-white mt-1.5">
                {metric.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Activity Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="card-glow">
            <h3 className="text-base font-bold text-white mb-3">📈 تفاصيل النشاط</h3>
            <div className="space-y-3">
              {Object.entries(data)
                .filter(([key]) => key !== 'metrics')
                .map(([key, value]) => {
                  const translateKey = (k: string) => {
                    const map: Record<string, string> = {
                      vehicles: '🚛 عدد المركبات',
                      drivers: '👨‍✈️ عدد السائقين',
                      activeShipments: '📦 الشحنات النشطة',
                      pendingMaintenance: '🔧 أعمال صيانة معلقة',
                      dailyProduction: '🏭 الإنتاج اليومي',
                      activeMachines: '⚙️ الآلات النشطة',
                      activeOrders: '📋 أوامر الإنتاج النشطة',
                      lowMaterials: '📦 نقص المواد الخام',
                      activeProjects: '🏗️ المشاريع القائمة',
                      activeEquipment: '⚙️ المعدات المشغلة',
                      activeWorkers: '👷 العمال النشطين',
                      activeContracts: '📄 العقود المبرمة',
                      dailySales: '🛒 المبيعات اليومية',
                      totalCustomers: '👥 إجمالي العملاء',
                      lowStockProducts: '📦 منتجات قاربت النفاد',
                      pendingOrders: '📋 فواتير غير مدفوعة',
                      employees: '👥 إجمالي الموظفين',
                      revenue: '💰 إجمالي الإيرادات',
                      expenses: '💸 إجمالي المصروفات',
                      pendingInvoices: '📋 فواتير معلقة'
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
                    <div key={key} className="flex justify-between items-center p-3 bg-[#13131A]/40 rounded-lg">
                      <span className="text-[#A0A0B0] text-sm">{translateKey(key)}</span>
                      <span className="text-white font-bold">{formatValue(key, value)}</span>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="card-glow p-6">
            <h3 className="text-lg font-bold text-white mb-4">🔔 تنبيهات سريعة</h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#13131A]/40 rounded-lg border-r-4 border-[#F59E0B]">
                <p className="text-white text-sm">⚠️ 3 فواتير متأخرة بحاجة للمتابعة</p>
                <p className="text-xs text-[#A0A0B0]">منذ 2 ساعة</p>
              </div>
              <div className="p-3 bg-[#13131A]/40 rounded-lg border-r-4 border-[#6C2BD9]">
                <p className="text-white text-sm">📦 5 منتجات منخفضة المخزون</p>
                <p className="text-xs text-[#A0A0B0]">منذ 5 ساعات</p>
              </div>
              <div className="p-3 bg-[#13131A]/40 rounded-lg border-r-4 border-[#10B981]">
                <p className="text-white text-sm">✅ تم صرف رواتب الموظفين</p>
                <p className="text-xs text-[#A0A0B0]">منذ يوم</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardView;
