import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  User, 
  UserCheck, 
  LayoutList, 
  TrendingUp, 
  BarChart3,
  Sliders,
  AlertTriangle,
  Sparkles,
  Plus,
  Play,
  Activity,
  BookOpen,
  Lock,
  Check,
  PlayCircle,
  Layers,
  ArrowLeftRight,
  FileText,
  CheckSquare
} from 'lucide-react';

interface AuditViewProps {
  userRole: string;
}

export default function AuditView({ userRole }: AuditViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'sensitive' | 'retention' | 'anomalies' | 'closing'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [statistics, setStatistics] = useState<any>({
    total_actions: 0,
    by_action: [],
    by_user: [],
    pending_sensitive: 0
  });
  const [sensitiveChanges, setSensitiveChanges] = useState<any[]>([]);
  
  // Anomaly Detection States
  const [detections, setDetections] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [anomalySeverity, setAnomalySeverity] = useState('');
  const [anomalyStatus, setAnomalyStatus] = useState('');
  const [anomalyType, setAnomalyType] = useState('');
  const [runningDetection, setRunningDetection] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleType, setNewRuleType] = useState<'threshold' | 'pattern' | 'ml_model'>('threshold');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Closing Period States
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [closingTasks, setClosingTasks] = useState<any[]>([]);
  const [suggestedAdjustments, setSuggestedAdjustments] = useState<any[]>([]);
  const [showStartClosingModal, setShowStartClosingModal] = useState(false);
  const [newPeriodType, setNewPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [newPeriodDate, setNewPeriodDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingNotes, setClosingNotes] = useState('');
  const [isClosingActionLoading, setIsClosingActionLoading] = useState(false);
  
  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Loading & alerts
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Retention Policies
  const [policies, setPolicies] = useState([
    { id: 1, table_name: "audit_log", name: "سجل العمليات العام (Audit Log)", retention_days: 365, is_active: true },
    { id: 2, table_name: "audit_sensitive_changes", name: "سجل التغييرات الحساسة والرواتب", retention_days: 730, is_active: true },
    { id: 3, table_name: "audit_user_activity", name: "ملخص نشاط المستخدمين اليومي", retention_days: 180, is_active: true }
  ]);

  const loadStatistics = async () => {
    try {
      const res = await fetch('/api/audit/statistics');
      if (res.ok) {
        const stats = await res.json();
        setStatistics(stats);
      }
    } catch (err) {
      console.error("Error loading statistics:", err);
    }
  };

  const loadSensitiveChanges = async () => {
    try {
      const res = await fetch('/api/audit/sensitive');
      if (res.ok) {
        const data = await res.json();
        setSensitiveChanges(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading sensitive changes:", err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/audit/log?limit=${pageSize}&offset=${currentPage * pageSize}`;
      if (filterAction) url += `&action_type=${filterAction}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterDateFrom) url += `&date_from=${filterDateFrom}`;
      if (filterDateTo) url += `&date_to=${filterDateTo}`;
      if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotalLogs(data.total || 0);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalies = async () => {
    try {
      let url = '/api/anomaly/detections?';
      if (anomalySeverity) url += `severity=${anomalySeverity}&`;
      if (anomalyStatus) url += `status=${anomalyStatus}&`;
      if (anomalyType) url += `type=${anomalyType}&`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDetections(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading anomalies:", err);
      setDetections([]);
    }
  };

  const loadRules = async () => {
    try {
      const res = await fetch('/api/anomaly/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading rules:", err);
      setRules([]);
    }
  };

  const runDetection = async () => {
    setRunningDetection(true);
    try {
      const res = await fetch('/api/anomaly/run-detection', { method: 'POST' });
      const data = await res.json();
      setAlertMsg({ type: 'success', text: data.message || 'تم تشغيل الكشف بنجاح' });
      await Promise.all([loadAnomalies(), loadStatistics()]);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ أثناء تشغيل الفحص' });
    } finally {
      setRunningDetection(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const updateAnomalyStatus = async (id: number, status: string, notesVal?: string) => {
    try {
      const res = await fetch(`/api/anomaly/detections/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notesVal })
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: data.message });
        await loadAnomalies();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'فشل التحديث' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ اتصال' });
    }
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;
    try {
      const res = await fetch('/api/anomaly/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleName,
          description: newRuleDesc,
          rule_type: newRuleType,
          severity: newRuleSeverity,
          conditions: {}
        })
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'تمت إضافة قاعدة الكشف بنجاح!' });
        setNewRuleName('');
        setNewRuleDesc('');
        setIsAddingRule(false);
        await loadRules();
      } else {
        const errData = await res.json();
        setAlertMsg({ type: 'error', text: errData.error || 'فشل إضافة القاعدة' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ اتصال' });
    }
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handleDeleteRule = async (id: number) => {
    try {
      const res = await fetch(`/api/anomaly/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'تم حذف القاعدة بنجاح' });
        await loadRules();
      } else {
        setAlertMsg({ type: 'error', text: 'فشل حذف القاعدة' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ اتصال' });
    }
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.all([loadStatistics(), loadSensitiveChanges(), loadLogs(), loadAnomalies(), loadRules()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeSubTab === 'anomalies') {
      loadAnomalies();
      loadRules();
    }
  }, [activeSubTab, anomalySeverity, anomalyStatus, anomalyType]);

  useEffect(() => {
    loadAllData();
  }, [filterAction, filterStatus, filterDateFrom, filterDateTo, filterSearch, currentPage]);

  const loadClosingPeriodData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/closing/current');
      if (res.ok) {
        const data = await res.json();
        setCurrentPeriod(data);
        if (data && data.id) {
          const tRes = await fetch(`/api/closing/${data.id}/tasks`);
          if (tRes.ok) {
            const tData = await tRes.json();
            setClosingTasks(Array.isArray(tData) ? tData : []);
          }

          const aRes = await fetch(`/api/closing/${data.id}/adjustments`);
          if (aRes.ok) {
            const aData = await aRes.json();
            setSuggestedAdjustments(Array.isArray(aData) ? aData : []);
          }
        } else {
          setClosingTasks([]);
          setSuggestedAdjustments([]);
        }
      }
    } catch (err) {
      console.error('Error loading closing period data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'closing') {
      loadClosingPeriodData();
    }
  }, [activeSubTab]);

  const handleStartClosing = async () => {
    try {
      setIsClosingActionLoading(true);
      const res = await fetch('/api/closing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: newPeriodType,
          period_date: newPeriodDate,
          initiated_by: 1,
          notes: closingNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل بدء الدورة');
      
      setAlertMsg({ type: 'success', text: data.message });
      setShowStartClosingModal(false);
      setClosingNotes('');
      loadClosingPeriodData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsClosingActionLoading(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleExecuteTask = async (taskId: number) => {
    try {
      setIsClosingActionLoading(true);
      const res = await fetch(`/api/closing/task/${taskId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تنفيذ المهمة');
      
      setAlertMsg({ type: 'success', text: data.message });
      loadClosingPeriodData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsClosingActionLoading(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleSuggestAdjustments = async () => {
    if (!currentPeriod || !currentPeriod.id) return;
    try {
      setIsClosingActionLoading(true);
      const res = await fetch('/api/closing/suggest-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: currentPeriod.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل توليد قيود التسوية');
      
      setAlertMsg({ type: 'success', text: data.message });
      loadClosingPeriodData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsClosingActionLoading(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleUpdateAdjustmentStatus = async (id: number, status: string) => {
    try {
      setIsClosingActionLoading(true);
      const res = await fetch(`/api/closing/adjustment/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث حالة القيد');
      
      setAlertMsg({ type: 'success', text: data.message });
      loadClosingPeriodData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsClosingActionLoading(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleClosePeriod = async () => {
    if (!currentPeriod || !currentPeriod.id) return;
    if (!window.confirm('هل أنت متأكد من إغلاق وتأمين هذه الدورة المحاسبية بالكامل؟ لا يمكن تعديل قيود الدفاتر بعد الإغلاق.')) return;
    try {
      setIsClosingActionLoading(true);
      const res = await fetch(`/api/closing/${currentPeriod.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closed_by: 1,
          notes: 'إغلاق نهائي معتمد بواسطة المدير المالي'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إغلاق الدورة المحاسبية');
      
      setAlertMsg({ type: 'success', text: data.message });
      loadClosingPeriodData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsClosingActionLoading(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleApproveSensitive = async (id: number, approved: boolean) => {
    if (userRole !== 'admin') {
      setAlertMsg({ type: 'error', text: 'عذراً، تقتصر صلاحية قبول أو رفض التعديلات الحساسة على المدير العام فقط.' });
      return;
    }

    try {
      const res = await fetch(`/api/audit/sensitive/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: approved ? 'approved' : 'rejected',
          approved_by: 'Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ type: 'success', text: approved ? 'تمت الموافقة على التغيير وتوثيقه بسجل الرقابة المالي.' : 'تم رفض التغيير وإلغاء مفعوله المالي.' });
        loadAllData();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'حدث خطأ أثناء معالجة الطلب.' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ اتصال بالخادم.' });
    }
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handleCleanupLogs = async () => {
    if (userRole !== 'admin') {
      setAlertMsg({ type: 'error', text: 'تقتصر صلاحية تنظيف السجلات والمراجعة على دور المدير العام للشركة.' });
      return;
    }

    if (!window.confirm('هل أنت متأكد من رغبتك في تصفية وتطهير سجلات التدقيق القديمة حسب السياسة المحاسبية؟')) {
      return;
    }

    try {
      const res = await fetch('/api/audit/cleanup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({ type: 'success', text: data.message });
        loadAllData();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'خطأ أثناء المعالجة.' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'خطأ اتصال بالخادم.' });
    }
    setTimeout(() => setAlertMsg(null), 4000);
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Upper Alerts & Messages */}
      {alertMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 border shadow-sm ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-rose-400" />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Header Panel styled like Treasury */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-700/80">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-rose-500/15 text-rose-400 p-2 rounded-xl border border-rose-500/30">
                <ShieldAlert size={20} />
              </span>
              <h2 className="text-lg font-black tracking-tight text-white">سجل الرقابة وتدقيق النظام (Audit Log)</h2>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              نظام تتبع وحوكمة العمليات الإدارية والمالية الفورية، كاشف الحركات الحساسة للرواتب والتعديلات المحاسبية.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>تحديث البيانات</span>
            </button>
            {userRole === 'admin' && (
              <button
                onClick={handleCleanupLogs}
                className="flex items-center gap-2 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-500/30 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>تنظيف السجلات القديمة</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/80">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-right">
            <p className="text-[10px] text-slate-400 font-bold">📊 إجمالي العمليات المسجلة</p>
            <p className="text-xl font-black text-white mt-1.5">{statistics.total_actions || 0}</p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-right">
            <p className="text-[10px] text-emerald-400 font-bold">➕ عمليات الإدراج (INSERT)</p>
            <p className="text-xl font-black text-white mt-1.5">
              {statistics.by_action?.find((a: any) => a.action_type === 'INSERT')?.count || 0}
            </p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-right">
            <p className="text-[10px] text-amber-400 font-bold">✏️ التعديلات المحاسبية (UPDATE)</p>
            <p className="text-xl font-black text-white mt-1.5">
              {statistics.by_action?.find((a: any) => a.action_type === 'UPDATE')?.count || 0}
            </p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-right">
            <p className="text-[10px] text-rose-400 font-bold">⚠️ تغييرات معلقة بحاجة لاعتماد</p>
            <p className={`text-xl font-black mt-1.5 ${statistics.pending_sensitive > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {statistics.pending_sensitive || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex border-b border-slate-700/80 gap-6">
        {[
          { id: 'logs', label: 'سجل الرقابة والعمليات المباشر', icon: LayoutList },
          { id: 'sensitive', label: 'تعديلات الرواتب والعمليات الحساسة', icon: UserCheck, count: statistics.pending_sensitive },
          { id: 'retention', label: 'حوكمة الاحتفاظ بالبيانات', icon: Sliders },
          { id: 'anomalies', label: 'كشف الحالات الشاذة والذكاء الاصطناعي', icon: ShieldAlert },
          { id: 'closing', label: 'إغلاق الدفاتر الآلي', icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 text-xs font-bold transition-all cursor-pointer relative ${
                isActive 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {Boolean(tab.count && tab.count > 0) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs Content Card */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/80 p-6 shadow-sm min-h-[450px]">
        {activeSubTab === 'logs' && (
          <div className="space-y-6">
            {/* Search & Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="بحث سريع بالوصف أو المستخدم..."
                  value={filterSearch}
                  onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pr-9 pl-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={filterAction}
                  onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">جميع العمليات</option>
                  <option value="INSERT">➕ إدراج (INSERT)</option>
                  <option value="UPDATE">✏️ تعديل (UPDATE)</option>
                  <option value="DELETE">🗑️ حذف (DELETE)</option>
                  <option value="LOGIN">🔑 تسجيل دخول (LOGIN)</option>
                  <option value="APPROVE">✅ موافقة (APPROVE)</option>
                  <option value="REJECT">❌ رفض (REJECT)</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">جميع الحالات</option>
                  <option value="success">✅ ناجح</option>
                  <option value="failure">❌ فشل</option>
                  <option value="warning">⚠️ تحذير</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  placeholder="من تاريخ"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="إلى تاريخ"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto border border-slate-700/80 rounded-xl bg-slate-900/50">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700/80 text-slate-300">
                    <th className="p-3.5 font-bold">#</th>
                    <th className="p-3.5 font-bold">المستخدم والمسؤول</th>
                    <th className="p-3.5 font-bold">نوع العملية</th>
                    <th className="p-3.5 font-bold">الجدول المعني</th>
                    <th className="p-3.5 font-bold">الوصف وتفاصيل الحركة</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                    <th className="p-3.5 font-bold">تاريخ الحركة</th>
                    <th className="p-3.5 font-bold text-center">التفاصيل الفنية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                        <div className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-2"></div>
                        جاري تحميل سجلات التدقيق والرقابة...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                        لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: any) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-slate-700/30 transition-colors">
                            <td className="p-3.5 text-slate-400 font-mono">#{log.id}</td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-500/20 text-indigo-300 p-1.5 rounded-full text-[10px] border border-indigo-500/30">
                                  <User size={12} />
                                </span>
                                <div>
                                  <p className="font-bold text-white">{log.user_name || 'عام / مجهول'}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {log.user_role === 'admin' ? 'مدير النظام' : 'محاسب مالي'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                log.action_type === 'INSERT' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                log.action_type === 'UPDATE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                log.action_type === 'DELETE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {log.action_type}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-bold">{log.table_name || '-'}</td>
                            <td className="p-3.5 font-semibold text-white max-w-xs truncate" title={log.description}>
                              {log.description || '-'}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                log.status === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                {log.status === 'success' ? 'نجاح' : 'فشل'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400 text-[11px] font-mono" dir="ltr">
                              {new Date(log.created_at).toLocaleString('ar-EG', { hour12: false })}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-all border border-slate-700 cursor-pointer"
                              >
                                {isExpanded ? 'إخفاء ✕' : 'عرض التفاصيل 🔎'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-900/90 border-b border-slate-700/80">
                              <td colSpan={8} className="p-4 text-right">
                                <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                                  <p><span className="text-slate-400 font-bold">عنوان الـ IP:</span> {log.ip_address || '127.0.0.1'}</p>
                                  <p className="text-indigo-300 font-bold">سجل حالة الكيان الكامل (JSON Record):</p>
                                  <pre className="text-emerald-400 bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto text-[10px]">
                                    {JSON.stringify(log, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <span className="text-xs text-slate-400 font-bold">
                عرض {logs.length} من أصل {totalLogs} سجل تدقيق مسجل
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  السابق ⬅️
                </button>
                <span className="text-xs text-slate-300 font-bold">
                  صفحة {currentPage + 1} من {Math.ceil(totalLogs / pageSize) || 1}
                </span>
                <button
                  disabled={(currentPage + 1) * pageSize >= totalLogs}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  التالي ➡️
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'sensitive' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-xl text-xs flex items-start gap-3">
              <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold">مستوى أمان وحماية الرواتب والتعديلات الحساسة</p>
                <p className="mt-1 opacity-90 leading-relaxed">
                  يمنع النظام بشكل كامل اعتماد أي زيادة في الرواتب الأساسية أو تعديل الحد الائتماني للعملاء إلا بموافقة صريحة من المدير العام.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-700/80 rounded-xl bg-slate-900/50">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700/80 text-slate-300">
                    <th className="p-3.5 font-bold">رقم الطلب</th>
                    <th className="p-3.5 font-bold">نوع الحركة الحساسة</th>
                    <th className="p-3.5 font-bold">الوصف المحاسبي والمالي</th>
                    <th className="p-3.5 font-bold">القيمة السابقة</th>
                    <th className="p-3.5 font-bold">القيمة الجديدة المقترحة</th>
                    <th className="p-3.5 font-bold">تاريخ الطلب</th>
                    <th className="p-3.5 font-bold">حالة الاعتماد</th>
                    <th className="p-3.5 font-bold text-center">الإجراءات والرقابة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {sensitiveChanges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                        لا توجد طلبات تغييرات حساسة معلقة بالشركة حالياً.
                      </td>
                    </tr>
                  ) : (
                    sensitiveChanges.map((sc: any) => (
                      <tr key={sc.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono">#{sc.id}</td>
                        <td className="p-3.5">
                          <span className="px-3 py-1 rounded-xl text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {sc.entity_type === 'payroll' ? '💰 زيادة راتب موظف' : '💳 تعديل حد ائتماني'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white">{sc.field_name} - {sc.description || 'تعديل بيانات'}</td>
                        <td className="p-3.5 text-slate-300 font-mono">{sc.old_value || '0'}</td>
                        <td className="p-3.5 text-indigo-400 font-bold font-mono">{sc.new_value || '0'}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]" dir="ltr">
                          {new Date(sc.created_at).toLocaleString('ar-EG', { hour12: false })}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                            sc.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            sc.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                          }`}>
                            {sc.status === 'approved' ? '✅ معتمد رسمياً' : sc.status === 'rejected' ? '❌ مرفوض وملغي' : '⏳ في انتظار الاعتماد'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {sc.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleApproveSensitive(sc.id, true)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                موافقة ✓
                              </button>
                              <button
                                onClick={() => handleApproveSensitive(sc.id, false)}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                رفض ✕
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">تم البت بالطلب</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'retention' && (
          <div className="space-y-6">
            <div className="p-5 bg-blue-500/10 text-blue-200 border border-blue-500/30 rounded-2xl text-xs leading-relaxed space-y-3">
              <h4 className="font-bold text-sm text-white">قواعد الاحتفاظ بالبيانات والامتثال المالي للشركة</h4>
              <p>
                وفقاً للوائح التدقيق الضريبي والمعايير المحاسبية المعتمدة للشركات، يلتزم النظام بتطبيق سياسات صارمة لتنظيف السجلات وتخزين البيانات لتوفير المساحة والحفاظ على سرية النشاط التجاري.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-4 text-slate-300">
                <li>سجلات العمليات العادية تحتفظ بحد أقصى <strong className="text-white font-bold">365 يوماً</strong>.</li>
                <li>سجلات التغييرات الحساسة والرواتب تحتفظ بحد أقصى <strong className="text-white font-bold">730 يوماً</strong>.</li>
                <li>السجلات التحليلية لنشاط المستخدمين يتم الاحتفاظ بها لمدة <strong className="text-white font-bold">180 يوماً</strong>.</li>
              </ul>
            </div>

            <div className="overflow-x-auto border border-slate-700/80 rounded-xl bg-slate-900/50">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700/80 text-slate-300">
                    <th className="p-3.5 font-bold">#</th>
                    <th className="p-3.5 font-bold">جدول قاعدة البيانات</th>
                    <th className="p-3.5 font-bold">الاسم والوصف المحاسبي</th>
                    <th className="p-3.5 font-bold">فترة الاحتفاظ بالبيانات</th>
                    <th className="p-3.5 font-bold">حالة السياسة</th>
                    <th className="p-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {policies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 text-slate-400 font-mono">#{policy.id}</td>
                      <td className="p-3.5 text-indigo-400 font-bold font-mono">{policy.table_name}</td>
                      <td className="p-3.5 font-bold text-white">{policy.name}</td>
                      <td className="p-3.5 font-bold text-slate-200 font-mono">{policy.retention_days} يوم</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">
                          نشط ومحمي
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] text-slate-400">سياسة معتمدة 🔒</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'anomalies' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 animate-pulse" />
                  <span>محرك الذكاء الاصطناعي لكشف الأنشطة المشبوهة والحالات الشاذة</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  فحص آلي لفواتير المبيعات، الرواتب، وسجلات النظام للكشف المبكر عن أي تلاعب أو أخطاء محاسبية.
                </p>
              </div>
              <button
                onClick={runDetection}
                disabled={runningDetection}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {runningDetection ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري الفحص المالي الفوري...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>فحص الحالات الشاذة فوراً</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-700/80 p-4 rounded-xl text-right">
                <p className="text-[10px] text-slate-400 font-bold">📊 إجمالي الإنذارات</p>
                <p className="text-xl font-black text-white mt-1.5">{detections.length}</p>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/50 p-4 rounded-xl text-right">
                <p className="text-[10px] text-rose-400 font-bold">🔴 حالات حرجة</p>
                <p className="text-xl font-black text-rose-300 mt-1.5">{detections.filter(d => d.severity === 'critical').length}</p>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/50 p-4 rounded-xl text-right">
                <p className="text-[10px] text-amber-400 font-bold">🟡 حالات عالية الخطورة</p>
                <p className="text-xl font-black text-amber-300 mt-1.5">{detections.filter(d => d.severity === 'high').length}</p>
              </div>
              <div className="bg-blue-950/40 border border-blue-800/50 p-4 rounded-xl text-right">
                <p className="text-[10px] text-blue-400 font-bold">⏳ قيد المراجعة والانتظار</p>
                <p className="text-xl font-black text-blue-300 mt-1.5">{detections.filter(d => d.status === 'pending').length}</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-700/80 rounded-xl bg-slate-900/50">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700/80 text-slate-300">
                    <th className="p-3.5 font-bold">نوع الإنذار</th>
                    <th className="p-3.5 font-bold">الوصف والتفاصيل</th>
                    <th className="p-3.5 font-bold">الخطورة</th>
                    <th className="p-3.5 font-bold">حالة الفحص</th>
                    <th className="p-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {detections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                        🎉 لا توجد حالات شاذة مكتشفة. النظام آمن ونظيف.
                      </td>
                    </tr>
                  ) : (
                    detections.map((anomaly: any) => (
                      <tr key={anomaly.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <span className="font-black text-white text-xs">{anomaly.anomaly_type}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(anomaly.created_at).toLocaleString('ar-EG')}</span>
                        </td>
                        <td className="p-3.5 text-slate-200 font-medium">{anomaly.description}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                            anomaly.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {anomaly.severity}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {anomaly.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => updateAnomalyStatus(anomaly.id, 'resolved', 'تم اعتماد الحل ومراجعة التقرير')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            معالجة وإغلاق ✓
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'closing' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Lock size={16} className="text-indigo-400" />
                  <span>إدارة إغلاق الدورات المحاسبية والمالية (Period Closing)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  إغلاق الفترات الشهرية، رصد مطابقة البنوك، واحتساب إهلاكات الأصول قبل اعتماد القوائم النهائية.
                </p>
              </div>
              <button
                onClick={() => setShowStartClosingModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                ➕ فتح دورة إغلاق جديدة
              </button>
            </div>

            {currentPeriod ? (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-700/80 pb-4">
                    <div>
                      <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg">الدورة الحالية #{currentPeriod.id}</span>
                      <h4 className="text-base font-black text-white mt-2">دورة إغلاق {currentPeriod.period_type === 'monthly' ? 'شهرية' : 'فصلية'} ({currentPeriod.period_date})</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentPeriod.status === 'open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                      {currentPeriod.status === 'open' ? '⚙️ الدورة مفتوحة وقيد التنفيذ' : '🔒 مغلقة ومؤمنة نهائياً'}
                    </span>
                  </div>

                  {/* Tasks Checklist */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-300">مهام الإغلاق الإلزامي:</h5>
                    <div className="space-y-2">
                      {closingTasks.map(task => (
                        <div key={task.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${task.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                            <div>
                              <p className="font-bold text-white text-xs">{task.title}</p>
                              <p className="text-[10px] text-slate-400">المسؤول: {task.assigned_to || 'المحاسب المالي'}</p>
                            </div>
                          </div>
                          <div>
                            {task.status === 'completed' ? (
                              <span className="text-xs text-emerald-400 font-bold">مكتملة ✓</span>
                            ) : (
                              <button
                                onClick={() => handleExecuteTask(task.id)}
                                disabled={isClosingActionLoading}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                تنفيذ وتأكيد المهمة
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Adjustments Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-700/80">
                    <div className="flex justify-between items-center">
                      <h5 className="text-xs font-bold text-slate-300">قيود التسوية المقترحة:</h5>
                      <button
                        onClick={handleSuggestAdjustments}
                        disabled={isClosingActionLoading}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        🤖 توليد قيود التسوية بالذكاء الاصطناعي
                      </button>
                    </div>

                    <div className="space-y-2">
                      {suggestedAdjustments.map(adj => (
                        <div key={adj.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-white">{adj.account_name} - {adj.description}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">مدين: {adj.debit} ج.م | دائن: {adj.credit} ج.م</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 font-bold text-[10px]">{adj.status}</span>
                            {adj.status === 'suggested' && (
                              <button
                                onClick={() => handleUpdateAdjustmentStatus(adj.id, 'approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                              >
                                اعتماد القيد ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentPeriod.status === 'open' && (
                    <div className="pt-4 border-t border-slate-700/80 flex justify-end">
                      <button
                        onClick={handleClosePeriod}
                        disabled={isClosingActionLoading}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
                      >
                        🔒 إغلاق الدورة المحاسبية نهائياً وتأمين الدفاتر
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-bold bg-slate-900 border border-slate-700/80 rounded-2xl">
                لا توجد دورة محاسبية مفتوحة حالياً. انقر على "فتح دورة إغلاق جديدة" للبدء.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Start Closing Period Modal */}
      {showStartClosingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-black text-white">فتح دورة إغلاق محاسبية جديدة</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">نوع الدورة:</label>
                <select
                  value={newPeriodType}
                  onChange={(e) => setNewPeriodType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="monthly">إغلاق شهري</option>
                  <option value="quarterly">إغلاق ربع سنوي</option>
                  <option value="yearly">إغلاق سنوي نهائي</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">تاريخ نهاية الدورة:</label>
                <input
                  type="date"
                  value={newPeriodDate}
                  onChange={(e) => setNewPeriodDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات توجيهية:</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="ملاحظات المراجع المالي أو المدير..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                onClick={() => setShowStartClosingModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleStartClosing}
                disabled={isClosingActionLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                بدء الدورة المحاسبية 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
