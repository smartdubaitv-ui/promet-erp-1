import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table, Column } from '../components/ui/Table';
import { Modal } from '../components/Modal';
import { DollarSign, Plus, Search, Calendar, UserCheck } from 'lucide-react';

interface PayrollRecord {
  id: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowance: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'overdue';
}

export const PayrollView: React.FC = () => {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // نموذج إضافة راتب
  const [formData, setFormData] = useState({
    employeeName: '',
    month: '',
    basicSalary: '',
    allowance: '',
    deductions: '',
  });

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/payroll', { headers });
      const data = await res.json();
      setPayroll(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ فشل جلب الرواتب:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basicSalary: Number(formData.basicSalary),
          allowance: Number(formData.allowance) || 0,
          deductions: Number(formData.deductions) || 0,
          netSalary: Number(formData.basicSalary) + (Number(formData.allowance) || 0) - (Number(formData.deductions) || 0),
          status: 'pending',
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ employeeName: '', month: '', basicSalary: '', allowance: '', deductions: '' });
        fetchPayroll();
      }
    } catch (error) {
      console.error('❌ فشل إضافة الراتب:', error);
    }
  };

  const columns: Column<PayrollRecord>[] = [
    { key: 'employeeName', header: 'الموظف' },
    { key: 'month', header: 'الشهر' },
    { 
      key: 'basicSalary', 
      header: 'الراتب الأساسي',
      render: (p: PayrollRecord) => `${Number(p.basicSalary || 0).toLocaleString()} ج.م`,
    },
    { 
      key: 'allowance', 
      header: 'البدلات',
      render: (p: PayrollRecord) => `${Number(p.allowance || 0).toLocaleString()} ج.م`,
    },
    { 
      key: 'deductions', 
      header: 'الاستقطاعات',
      render: (p: PayrollRecord) => `${Number(p.deductions || 0).toLocaleString()} ج.م`,
    },
    { 
      key: 'netSalary', 
      header: 'صافي الراتب',
      render: (p: PayrollRecord) => (
        <span className="font-bold text-emerald-400 font-mono">
          {Number(p.netSalary || 0).toLocaleString()} ج.م
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (p: PayrollRecord) => {
        const statusMap = {
          paid: { label: '✅ مدفوع', className: 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' },
          pending: { label: '⏳ قيد الانتظار', className: 'text-amber-300 bg-amber-500/20 border border-amber-500/30' },
          overdue: { label: '🔴 متأخر', className: 'text-rose-300 bg-rose-500/20 border border-rose-500/30' },
        };
        const status = statusMap[p.status as keyof typeof statusMap] || statusMap.pending;
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        );
      },
    },
  ];

  const filteredPayroll = payroll.filter((p) =>
    p.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayroll = payroll.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);

  return (
    <MainLayout
      title="💰 إدارة الرواتب"
      description="إدارة مسيرات الرواتب الشهرية للموظفين والمستحقات والبدلات بالتفصيل"
      actions={
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>إضافة مسير راتب جديد</span>
        </button>
      }
    >
      <div className="space-y-6" dir="rtl">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md">
            <p className="text-xs font-semibold text-slate-400">👥 إجمالي مسيرات الرواتب</p>
            <p className="text-2xl font-black mt-2 text-white">
              {payroll.length}
            </p>
          </div>
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md">
            <p className="text-xs font-semibold text-slate-400">💰 إجمالي الرواتب الصافية</p>
            <p className="text-2xl font-black mt-2 text-emerald-400 font-mono">
              {totalPayroll.toLocaleString()} ج.م
            </p>
          </div>
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md">
            <p className="text-xs font-semibold text-slate-400">⏳ رواتب قيد الانتظار</p>
            <p className="text-2xl font-black mt-2 text-amber-400 font-mono">
              {payroll.filter(p => p.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Modal نموذج إضافة راتب */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="إضافة مسير راتب جديد للموظف"
          icon={<DollarSign size={18} className="text-emerald-400" />}
          headerColorClass="text-emerald-400"
          maxWidthClass="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">اسم الموظف <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="أدخل الاسم الرباعي"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  required
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الشهر <span className="text-rose-400">*</span></label>
                <input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الراتب الأساسي (ج.م) <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  placeholder="10000"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                  required
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">البدلات والمكافآت (ج.م)</label>
                <input
                  type="number"
                  placeholder="2000"
                  value={formData.allowance}
                  onChange={(e) => setFormData({ ...formData, allowance: e.target.value })}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاستقطاعات والتأمين (ج.م)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-700/80 pt-4 mt-6">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 px-5 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
              >
                💾 حفظ مسير الراتب
              </button>
            </div>
          </form>
        </Modal>

        {/* جدول الرواتب */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md p-4 space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              placeholder="بحث سريع عن مسير راتب باسم الموظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-xs rounded-xl bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
          <Table<PayrollRecord>
            columns={columns}
            data={filteredPayroll}
            rowKey={(p) => p.id}
            loading={loading}
            emptyMessage="لا توجد مسيرات رواتب مسجلة في هذا القسم"
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default PayrollView;

