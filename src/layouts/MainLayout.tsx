import React, { useState, useEffect } from 'react';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company-modules');
      const data = await res.json();
      // بس اللي is_enabled = true
      setModules(data.filter((m: any) => m.is_enabled !== false));
    } catch (error) {
      console.error('❌ فشل جلب الوحدات:', error);
    } finally {
      setLoading(false);
    }
  };

  // بناء القائمة من الـ modules بس
  const navItems = modules.map((module: any) => {
    const icons: Record<string, string> = {
      dashboard: '📊',
      employees: '👥',
      payroll: '💰',
      invoices: '📄',
      inventory: '📦',
      scrap_inventory: '🧹',
      scrap_transactions: '📊',
      scrap_reports: '📋',
      crm: '🤝',
      reports: '📊',
    };
    const labels: Record<string, string> = {
      dashboard: 'لوحة التحكم',
      employees: 'الموظفين',
      payroll: 'الرواتب',
      invoices: 'الفواتير',
      inventory: 'المخزون',
      scrap_inventory: 'مخزون الخردة',
      scrap_transactions: 'حركات الخردة',
      scrap_reports: 'تقارير الخردة',
      crm: 'العملاء',
      reports: 'التقارير',
    };
    return {
      path: `/${module.code}`,
      label: labels[module.code] || module.name,
      icon: icons[module.code] || '📌'
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
      <aside className="w-64 bg-slate-800 border-l border-slate-700/50 p-4">
        <div className="text-xl font-bold mb-6 text-center text-blue-400">لوحة التحكم</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">جاري التحميل...</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default MainLayout;
