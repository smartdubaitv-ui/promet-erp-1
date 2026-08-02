import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Table } from './ui/Table';
import { colors, typography } from '../theme';

interface Anomaly {
  id: number;
  anomaly_type: string;
  severity: string;
  description: string;
  status: string;
  detected_at: string;
  details: any;
}

export const AnomalyDetector: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAnomalies();
  }, []);

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anomaly/detections');
      const data = await res.json();
      setAnomalies(data);
    } catch (error) {
      console.error('❌ فشل جلب الحالات الشاذة:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDetection = async () => {
    if (!confirm('هل أنت متأكد من تشغيل كشف الحالات الشاذة؟')) return;
    try {
      const res = await fetch('/api/anomaly/run-detection', {
        method: 'POST'
      });
      const data = await res.json();
      alert(data.message);
      loadAnomalies();
    } catch (error) {
      alert('❌ فشل تشغيل الكشف');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/anomaly/detections/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadAnomalies();
      }
    } catch (error) {
      alert('❌ فشل تحديث الحالة');
    }
  };

  const typeMap: Record<string, string> = {
    duplicate_invoice: '📄 فواتير مكررة',
    salary_change: '💰 تغيير راتب',
    inventory_spike: '📦 حركة مخزون',
    suspicious_login: '🔐 دخول مشبوه',
    budget_deviation: '📊 انحراف ميزانية'
  };

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    investigating: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    false_positive: 'bg-gray-100 text-gray-700'
  };

  const columns = [
    {
      key: 'anomaly_type',
      header: 'النوع',
      render: (row: Anomaly) => typeMap[row.anomaly_type] || row.anomaly_type
    },
    { key: 'description', header: 'الوصف' },
    {
      key: 'severity',
      header: 'الخطورة',
      render: (row: Anomaly) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[row.severity] || 'bg-gray-100 text-gray-700'}`}>
          {row.severity === 'critical' ? '🔴 حرج' : row.severity === 'high' ? '🟡 عالي' : row.severity === 'medium' ? '🔵 متوسط' : '⚪ منخفض'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (row: Anomaly) => (
        <select
          value={row.status}
          onChange={(e) => updateStatus(row.id, e.target.value)}
          className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}
        >
          <option value="pending">⏳ قيد الانتظار</option>
          <option value="investigating">🔍 قيد التحقيق</option>
          <option value="resolved">✅ تم الحل</option>
          <option value="false_positive">❌ إنذار كاذب</option>
        </select>
      )
    },
    {
      key: 'detected_at',
      header: 'تاريخ الاكتشاف',
      render: (row: Anomaly) => new Date(row.detected_at).toLocaleString('ar-EG')
    }
  ];

  const filteredAnomalies = filter === 'all' 
    ? anomalies 
    : anomalies.filter(a => a.status === filter);

  return (
    <Card title="🛡️ كشف الحالات الشاذة" className="shadow-lg border border-neutral-200">
      <div className="space-y-4" dir="rtl">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <div>
            <p className="text-xs text-neutral-500 mt-1">
              اكتشاف تلقائي للفواتير المكررة، تغييرات الرواتب، وحركات المخزون غير الطبيعية بالنظام
            </p>
          </div>
          <Button onClick={runDetection} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
            🔍 تشغيل الكشف
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
            className="text-xs font-semibold"
          >
            الكل ({anomalies.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'ghost'}
            onClick={() => setFilter('pending')}
            className="text-xs font-semibold text-yellow-600"
          >
            ⏳ قيد الانتظار ({anomalies.filter(a => a.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'resolved' ? 'primary' : 'ghost'}
            onClick={() => setFilter('resolved')}
            className="text-xs font-semibold text-green-600"
          >
            ✅ تم الحل ({anomalies.filter(a => a.status === 'resolved').length})
          </Button>
        </div>

        <Table
          columns={columns}
          data={filteredAnomalies}
          loading={loading}
          emptyMessage="🎉 لا توجد حالات شاذة مكتشفة"
          rowKey={(item: Anomaly) => item.id}
        />
      </div>
    </Card>
  );
};
