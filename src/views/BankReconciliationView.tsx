import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { colors, typography } from '../theme';

export const BankReconciliationView: React.FC = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bank/transactions');
      const data = await res.json();
      // Safely handle both array and object responses from backend
      if (data && data.data) {
        setTransactions(data.data);
      } else if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('❌ فشل جلب المعاملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_account_id', '1');

    try {
      const res = await fetch('/api/bank/import-statement', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      alert(data.message || 'تم استيراد كشف الحساب بنجاح!');
      loadTransactions();
    } catch (error) {
      alert('❌ فشل استيراد الكشف البنكي');
    }
  };

  const handleAutoReconcile = async () => {
    if (!confirm('هل أنت متأكد من تشغيل المطابقة التلقائية؟')) return;
    try {
      const res = await fetch('/api/bank/reconcile-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_account_id: '1', auto_approve: false }),
      });
      const data = await res.json();
      alert(data.message || 'تم تشغيل المطابقة بنجاح!');
      loadTransactions();
    } catch (error) {
      alert('❌ فشل تشغيل المطابقة التلقائية');
    }
  };

  const columns = [
    { key: 'transaction_date', header: 'التاريخ' },
    { key: 'description', header: 'البيان' },
    { 
      key: 'amount', 
      header: 'المبلغ',
      render: (item: any) => (
        <span className={`font-mono font-bold ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
        </span>
      )
    },
    { key: 'counterparty_name', header: 'الطرف الآخر' },
    { 
      key: 'reconciliation_status', 
      header: 'الحالة',
      render: (item: any) => {
        const isMatched = item.reconciliation_status === 'matched';
        const isExcluded = item.reconciliation_status === 'excluded';
        return (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            isMatched ? 'bg-green-100 text-green-700' : 
            isExcluded ? 'bg-slate-100 text-slate-500' : 
            'bg-yellow-100 text-yellow-700'
          }`}>
            {isMatched ? 'مطابقة ومسواة' : isExcluded ? 'مستبعدة' : 'معلقة'}
          </span>
        );
      }
    },
  ];

  return (
    <MainLayout title="🏦 التسوية البنكية الذكية" description="استيراد ومطابقة الكشوفات البنكية مع الفواتير والمدفوعات تلقائياً">
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-sm font-black text-slate-800">إجراءات المطابقة والتسوية</h2>
            <p className="text-[10px] text-slate-500">قم برفع ملف الكشف البنكي بصيغة CSV أو Excel لمطابقتها مع السجلات المالية</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <span>📤 استيراد كشف</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <Button onClick={handleAutoReconcile} variant="secondary">
              ⚡ تشغيل المطابقة التلقائية
            </Button>
            <Button onClick={loadTransactions} variant="secondary">
              🔄 تحديث البيانات
            </Button>
          </div>
        </div>

        <Card>
          <Table
            columns={columns}
            data={transactions}
            rowKey={(item: any) => item.id || `${item.transaction_date}-${Math.random()}`}
            loading={loading}
            emptyMessage="لا توجد معاملات بنكية مستوردة حالياً"
          />
        </Card>
      </div>
    </MainLayout>
  );
};

export default BankReconciliationView;
