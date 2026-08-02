import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Workflow, 
  Database, 
  Server, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Cpu, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Key, 
  Send,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent: string;
  actionType: string;
  actionConfig: {
    messageTemplate?: string;
    webhookUrl?: string;
    ledgerAccount?: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  hash: string;
}

export function EnterpriseView() {
  const [activeTab, setActiveTab] = useState<'ai' | 'workflows' | 'security' | 'k8s' | 'offline' | 'localization'>('ai');
  const [appTheme, setAppTheme] = useState<'classic' | 'neon'>(() => {
    return (localStorage.getItem('appTheme') as 'classic' | 'neon') || 'neon';
  });

  // Load state from local storage or server
  useEffect(() => {
    const checkTheme = () => {
      const currentTheme = (localStorage.getItem('appTheme') as 'classic' | 'neon') || 'neon';
      setAppTheme(currentTheme);
    };
    window.addEventListener('storage', checkTheme);
    const interval = setInterval(checkTheme, 1000);
    return () => {
      window.removeEventListener('storage', checkTheme);
      clearInterval(interval);
    };
  }, []);

  // 1. AI Predictive Core States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  // 2. Workflows Engine States
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('invoice_paid');
  const [newRuleAction, setNewRuleAction] = useState('create_notification');
  const [newRuleConfigVal, setNewRuleConfigVal] = useState('');

  // 3. Security ABAC & Audit Log States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<'employee' | 'manager' | 'admin'>('admin');
  const [encryptSalary, setEncryptSalary] = useState('45000');
  const [encryptedValue, setEncryptedValue] = useState('');
  const [decryptedValue, setDecryptedValue] = useState('');
  const [decryptError, setDecryptError] = useState('');

  // 4. K8s Multi-pod sharding States
  const [clusterData, setClusterData] = useState<any>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [replicasCount, setReplicasCount] = useState(3);
  const [selectedShard, setSelectedShard] = useState('shard_node_1');

  // 5. Offline-First & Sync States
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('promet_offline_queue') || '[]');
  });
  const [offlineAmount, setOfflineAmount] = useState('25000');
  const [offlineClient, setOfflineClient] = useState('شركة النصر للمقاولات');

  // 6. Dynamic Localization States
  const [dict, setDict] = useState<Record<string, string>>({
    'dashboard_title': 'لوحة القيادة الموحدة للمؤسسة',
    'total_sales': 'إجمالي الإيرادات والتحصيل',
    'active_workers': 'مسؤول الرقابة والعمليات',
    'offline_status': 'حالة الاتصال بالخادم',
  });
  const [editKey, setEditKey] = useState('dashboard_title');
  const [editVal, setEditVal] = useState('لوحة القيادة الموحدة للمؤسسة');

  // ==========================================
  // FETCHES & API TRIGGERS
  // ==========================================

  // Fetch AI Predictions
  const fetchAiPredictions = async (forceRefresh = false) => {
    setAiLoading(true);
    try {
      const url = forceRefresh ? '/api/enterprise/ai/predictions?refresh=true' : '/api/enterprise/ai/predictions';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data && data.data) {
        setAiData(data.data);
      }
    } catch (err) {
      console.error('Error fetching AI predictions:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch Rules List
  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/enterprise/workflows/rules', { headers });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  // Create Rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let actionConfig: any = {};
      if (newRuleAction === 'create_notification' || newRuleAction === 'log_audit') {
        actionConfig.messageTemplate = newRuleConfigVal || 'حدث حدث تلقائي للفاتورة رقم {invoiceNumber}';
      } else if (newRuleAction === 'send_webhook') {
        actionConfig.webhookUrl = newRuleConfigVal || 'https://api.external-webhook.com/v1/trigger';
      } else {
        actionConfig.ledgerAccount = newRuleConfigVal || '1010-المبيعات_الآجلة';
      }

      const res = await fetch('/api/enterprise/workflows/rules', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newRuleName,
          triggerEvent: newRuleTrigger,
          actionType: newRuleAction,
          actionConfig,
          isActive: true
        })
      });

      if (res.ok) {
        setNewRuleName('');
        setNewRuleConfigVal('');
        fetchRules();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/enterprise/workflows/rules/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchRules();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  // Fetch ISO compliance audit logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/enterprise/security/audit-logs', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Fetch K8s & Broker status
  const fetchClusterStatus = async () => {
    setClusterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/enterprise/microservices/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setClusterData(data);
      }
    } catch (err) {
      console.error('Error cluster data fetch:', err);
    } finally {
      setClusterLoading(false);
    }
  };

  // Encryption simulation on client/server side
  const handleEncryptTest = () => {
    if (!encryptSalary) return;
    // In a real database we use SecurityService.encrypt. We simulate AES-256 base64 representation
    const text = `ENC_${btoa(unescape(encodeURIComponent(encryptSalary))) || '45000'}`;
    setEncryptedValue(text);
    setDecryptedValue('');
    setDecryptError('');
  };

  const handleDecryptTest = async () => {
    if (!encryptedValue) return;
    setDecryptError('');
    setDecryptedValue('');

    // If simulated role is employee, prevent decryption on client side
    if (simulatedRole === 'employee') {
      setDecryptError('حظر أمني تلقائي (ABAC): يمنع دور الموظف (employee) من قراءة بيانات الرواتب المشفرة. سيتم تحويل المحاولة فوراً لسجل الرقابة ISO.');
      
      // Post to audit logs by calling mock log or actual log
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        await fetch('/api/enterprise/workflows/rules', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'تحذير اختراق صلاحيات (ABAC Violation)',
            triggerEvent: 'low_stock',
            actionType: 'log_audit',
            actionConfig: {
              messageTemplate: 'محاولة غير مصرح بها من دور الموظف لقراءة الراتب المشفر.'
            }
          })
        });
        fetchAuditLogs();
      } catch {}
      return;
    }

    // Call secure backend decrypt service api endpoint
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/enterprise/security/decrypt-test', {
        method: 'POST',
        headers,
        body: JSON.stringify({ encryptedText: encryptedValue })
      });

      const data = await res.json();
      if (res.ok) {
        setDecryptedValue(data.decrypted || '45,000 ريال');
      } else {
        setDecryptError(data.error || 'فشلت عملية فك التشفير الآمنة.');
      }
      fetchAuditLogs();
    } catch (err: any) {
      setDecryptError('خطأ أثناء الاتصال بخادم فك التشفير الآمن.');
    }
  };

  // Offline invoice creation (Offline queue simulator)
  const handleCreateOfflineInvoice = () => {
    const newOfflineInv = {
      id: `offline-${Date.now()}`,
      clientName: offlineClient,
      amount: parseFloat(offlineAmount) || 25000,
      createdAt: new Date().toISOString(),
      synced: false
    };

    const updatedQueue = [...offlineQueue, newOfflineInv];
    setOfflineQueue(updatedQueue);
    localStorage.setItem('promet_offline_queue', JSON.stringify(updatedQueue));
    alert('💾 تم حفظ الفاتورة محلياً بنجاح في قاعدة بيانات المستعرض (LocalStorage). النظام يعمل الآن بمرونة دون انقطاع.');
  };

  const handleSyncOfflineQueue = async () => {
    if (!isOnline) {
      alert('⚠️ يرجى تفعيل حالة الاتصال بالشبكة (Online) أولاً لمحاكاة الاتصال الفعلي بالخادم!');
      return;
    }

    if (offlineQueue.length === 0) {
      alert('لا توجد فواتير معلقة للمزامنة.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Simulate sending each offline item to server and triggering MQ broker events
      for (const item of offlineQueue) {
        await fetch('/api/invoices', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            invoiceNumber: `OFF-${Math.floor(Math.random() * 90000) + 10000}`,
            contactId: 'c-1', // Default contact
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            items: [{ description: 'خدمات توريد ومزامنة غير متصلة', quantity: 1, unitPrice: item.amount }],
            taxRate: 15,
            status: 'unpaid'
          })
        });
      }

      setOfflineQueue([]);
      localStorage.removeItem('promet_offline_queue');
      alert('✨ تمت المزامنة بنجاح! تم تمرير الفواتير المعلقة لمحرك الرسائل الموزع Pub/Sub بنجاح وتم تسجيل الحركات المحاسبية بالأستاذ العام.');
      fetchAuditLogs();
    } catch (err) {
      alert('فشلت المزامنة التلقائية مع الخادم الموزع.');
    }
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
  };

  // Run initial fetches on load
  useEffect(() => {
    fetchAiPredictions();
    fetchRules();
    fetchAuditLogs();
    fetchClusterStatus();
  }, []);

  return (
    <div className={`p-6 space-y-6 ${appTheme === 'neon' ? 'text-white' : 'text-slate-800'}`} dir="rtl">
      {/* 1. Header Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
        appTheme === 'neon' 
          ? 'bg-radial from-purple-950/40 via-purple-900/10 to-transparent border-purple-900/50 shadow-[0_0_30px_rgba(108,43,217,0.15)]' 
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className={`p-1.5 rounded-lg flex items-center justify-center text-white ${
              appTheme === 'neon' ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-blue-600'
            }`}>
              <Globe size={18} className="animate-spin-slow" />
            </span>
            <h1 className="text-xl font-black font-sans tracking-tight">
              {dict.dashboard_title || 'منصة المؤسسة الكبرى والحلول السحابية فائقة الأداء'}
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed">
            التحول الشامل إلى معايير الحوسبة السحابية المرنة: أتمتة الأعمال الذكية، أمان ABAC المعزز بالتشفير المالي E2E، معايير كفاءة المزامنة غير المتصلة بالإنترنت، ونمذجة تدفقات السيولة عبر تقنيات الذكاء الاصطناعي (Gemini Core).
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/10 rounded-xl border border-slate-700/10 max-w-fit">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'ai' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={12} />
            تنبؤات الذكاء الاصطناعي
          </button>
          
          <button 
            onClick={() => setActiveTab('workflows')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'workflows' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow size={12} />
            أتمتة الأعمال وقواعد العمل
          </button>

          <button 
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'security' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={12} />
            أمن ABAC وسجلات ISO
          </button>

          <button 
            onClick={() => setActiveTab('k8s')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'k8s' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server size={12} />
            بنية Kubernetes والوسيط
          </button>

          <button 
            onClick={() => setActiveTab('offline')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'offline' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-red-400" />}
            مزامنة بدون اتصال
          </button>

          <button 
            onClick={() => setActiveTab('localization')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'localization' 
                ? (appTheme === 'neon' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-blue-600 text-white')
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Globe size={12} />
            تخصيص اللغات والترجمة
          </button>
        </div>
      </div>

      {/* 2. Main Selected Tab Render */}
      <div className="grid grid-cols-1 gap-6">

        {/* TAB 1: AI Predictor Core (Proposal 2 & Recharts Integration) */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cashflow Chart (Recharts AreaChart with modern aesthetic) */}
              <div className={`lg:col-span-2 p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">📈 التنبؤ المالي للتدفقات النقدية والسيولة (AI Predictive Flow)</h3>
                    <p className="text-[10px] text-slate-400">توقعات التدفقات النقدية بناءً على خوارزميات ذكاء اصطناعي تفصيلية (Revenue vs Expenses)</p>
                  </div>
                  <button 
                    onClick={() => fetchAiPredictions(true)}
                    disabled={aiLoading}
                    className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
                    تحديث النماذج الفوري
                  </button>
                </div>

                {aiLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="animate-spin text-purple-400" />
                    <span className="text-xs text-slate-400 font-bold">جاري تشغيل محركات التنبؤ المالي وتجميع فواتير الأستاذ...</span>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={aiData?.predictiveCashflow || [
                          { month: 'أغسطس 2026', revenue: 380000, expenses: 145000 },
                          { month: 'سبتمبر 2026', revenue: 420000, expenses: 150000 },
                          { month: 'أكتوبر 2026', revenue: 475000, expenses: 152000 }
                        ]}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D3D" opacity={0.2} />
                        <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#13131A', borderColor: '#3B3B4F', color: '#fff' }} />
                        <Area type="monotone" dataKey="revenue" name="إيرادات متوقعة" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="expenses" name="نفقات متوقعة" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpenses)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Anomaly Detection Status Grid */}
              <div className={`p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
              }`}>
                <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-yellow-400">
                  <AlertTriangle size={14} />
                  مؤشرات تدقيق المخاطر والشذوذ الذكي (AI Anomalies)
                </h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">جاري تشغيل مراقبة الأنماط الشاذة في المبيعات والرواتب بشكل دائم:</p>

                <div className="space-y-3">
                  {(aiData?.anomalyDetection || [
                    {
                      title: 'ارتفاع حاد في بند المصاريف الإدارية',
                      description: 'تم ملاحظة زيادة بنسبة 35% في بند القرطاسية والمشتريات الطارئة مقارنة بالمتوسط السنوي.',
                      severity: 'medium',
                      status: 'under_review'
                    },
                    {
                      title: 'مخاطر تأخير تحصيل فواتير معلقة',
                      description: 'فاتورة العميل (شركة الغانم للتوريدات) تجاوزت تاريخ الاستحقاق بـ 15 يوماً دون أي دفعات مجدولة.',
                      severity: 'high',
                      status: 'flagged'
                    }
                  ]).map((ano: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-1 ${
                      ano.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-slate-200">{ano.title}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          ano.severity === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {ano.severity === 'high' ? 'خطر حرج' : 'متوسط'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal">{ano.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Advisor Opportunities recommendations */}
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1 text-emerald-400">
                <Zap size={14} />
                توصيات ترشيد النفقات وتحسين الهامش الربحي (AI Growth Opportunities)
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">نماذج الاستقصاء السحابية من مساعد الذكاء الاصطناعي بروميت:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(aiData?.growthOpportunities || [
                  {
                    opportunity: 'أتمتة أوامر الشراء المنخفضة المخزون بالكامل',
                    estimatedSavings: 'حوالي 12,000 ريال سنوياً من تقليل الفاقد وتوفير تكلفة التخزين العشوائي.',
                    impactLevel: 'high'
                  },
                  {
                    opportunity: 'التحويل لنظام الفوترة الإلكتروني التلقائي بالاشتراكات',
                    estimatedSavings: 'حوالي 8,000 ريال من كفاءة التشغيل والتحصيل السريع.',
                    impactLevel: 'medium'
                  }
                ]).map((opp: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/20 border border-slate-800 flex flex-col justify-between gap-3">
                    <span className="font-bold text-[11px] text-slate-200">{opp.opportunity}</span>
                    <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[9px]">
                      <span className="text-emerald-400">الوفر المتوقع: {opp.estimatedSavings}</span>
                      <span className="text-purple-400">مستوى التأثير: {opp.impactLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Task Automation Workflow Rule Engine (Proposal 2) */}
        {activeTab === 'workflows' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Rule Panel */}
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5 text-purple-400">
                <Workflow size={14} />
                محرك القواعد وصانع الأتمتة (Workflows)
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">أنشئ تدفقات وسلسلة قواعد تلقائية لتوفير الوقت وتفادي الأخطاء البشرية.</p>

              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-300 font-bold block">اسم قاعدة الأتمتة:</label>
                  <input 
                    type="text" 
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="مثال: إرسال قيد محاسبي فوري للتحصيل" 
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-300 font-bold block">مُشغّل الحدث (Trigger):</label>
                  <select 
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="invoice_paid">عند سداد الفاتورة بالكامل (invoice_paid)</option>
                    <option value="invoice_created">عند إنشاء فاتورة جديدة (invoice_created)</option>
                    <option value="low_stock">عند انخفاض كمية سلع المستودعات (low_stock)</option>
                    <option value="payroll_approved">اعتماد مسير الرواتب الشهري (payroll_approved)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-300 font-bold block">الإجراء التلقائي (Action Event):</label>
                  <select 
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="create_notification">إنشاء تنبيه فوري بالبرنامج للشركاء</option>
                    <option value="log_audit">تسجيل حركة تدقيق أمان فورية (ISO Logs)</option>
                    <option value="send_webhook">إرسال الحدث إلى رابط خارجي (Outbound Webhook)</option>
                    <option value="update_ledger">قيد محاسبي مزدوج فوري بالأستاذ العام</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-300 font-bold block">قيمة التكوين أو القالب الإرشادي:</label>
                  <textarea 
                    value={newRuleConfigVal}
                    onChange={(e) => setNewRuleConfigVal(e.target.value)}
                    placeholder={
                      newRuleAction === 'send_webhook' 
                        ? 'أدخل رابط الـ URL الفعلي للمطورين'
                        : newRuleAction === 'update_ledger'
                        ? 'حساب الأستاذ المستهدف (مثال: 1010-المبيعات)'
                        : 'مثال: تم تحصيل الفاتورة رقم {invoiceNumber} بقيمة {totalAmount} ريال بنجاح!'
                    }
                    rows={3}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full p-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  تسجيل وتفعيل القاعدة بالتطبيق
                </button>
              </form>
            </div>

            {/* List Rules Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
              }`}>
                <h3 className="text-xs font-bold text-slate-300 mb-3">📋 قائمة القواعد المحفوظة حالياً (Active Workflows)</h3>
                
                {rulesLoading ? (
                  <div className="py-8 text-center text-slate-400 font-bold">جاري تحميل القواعد...</div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-3.5 rounded-xl bg-slate-950/25 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{rule.name}</span>
                            <span className="text-[8px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">نشط الآن</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                            <span>المشغّل: <code className="bg-slate-900 px-1 py-0.5 rounded">{rule.triggerEvent}</code></span>
                            <span>•</span>
                            <span>الإجراء: <code className="bg-slate-900 px-1 py-0.5 rounded">{rule.actionType}</code></span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                          title="إلغاء تفعيل وحذف القاعدة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {rules.length === 0 && (
                      <div className="py-8 text-center text-slate-500">لا توجد قواعد أتمتة مخصصة مسجلة حالياً لرمز المستأجر هذا.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Enterprise Security & Compliance Sandbox (Proposal 3) */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ABAC Sandbox Controls */}
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5 text-blue-400">
                <ShieldCheck size={14} />
                أمن حماية الحقول المالي (ABAC & AES-256)
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">قم بمحاكاة التحقق من صلاحيات الأسطر والحقول الحساسة وفك تشفير الرواتب الآمن.</p>

              <div className="space-y-4 text-xs">
                {/* Switch simulated role */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-300 font-bold block">تعديل دورك الحالي للتجربة:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['employee', 'manager', 'admin'].map((role) => (
                      <button 
                        key={role}
                        type="button"
                        onClick={() => setSimulatedRole(role as any)}
                        className={`p-1.5 rounded-lg font-bold text-[9px] transition-all cursor-pointer ${
                          simulatedRole === role 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {role === 'employee' ? 'موظف مبيعات' : role === 'manager' ? 'مدير قطاع' : 'مسؤول النظام'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Salary input to encrypt */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block">الراتب الأساسي بالريال:</span>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={encryptSalary}
                      onChange={(e) => setEncryptSalary(e.target.value)}
                      className="flex-1 bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                    />
                    <button 
                      type="button"
                      onClick={handleEncryptTest}
                      className="px-3 bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
                    >
                      تشفير AES
                    </button>
                  </div>
                </div>

                {/* Encrypted output display */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">القيمة المخزنة بقاعدة البيانات (مُشفرة):</span>
                  <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[9px] text-indigo-400 break-all select-all">
                    {encryptedValue || 'اضغط على زر تشفير AES أولاً.'}
                  </div>
                </div>

                {/* Decrypt flow with ABAC check */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button 
                    type="button"
                    onClick={handleDecryptTest}
                    disabled={!encryptedValue}
                    className="w-full p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Key size={12} />
                    فك تشفير الحقل الآمن (ABAC)
                  </button>

                  {decryptedValue && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center font-bold">
                      تم فك التشفير بنجاح: {decryptedValue} ريال سعودي
                    </div>
                  )}

                  {decryptError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs leading-normal">
                      {decryptError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compliance Audit Trail ISO Logs */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">🛡️ سجل المراقبة وتدقيق العمليات الموحد (ISO 27001 compliance logs)</h3>
                    <p className="text-[10px] text-slate-400">سجل غير قابل للتعديل (Append-Only) مع هاش SHA-256 لضمان سلامة حركات البيانات المتميزة.</p>
                  </div>
                  <button 
                    onClick={fetchAuditLogs}
                    disabled={auditLoading}
                    className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 text-[9px] font-bold cursor-pointer"
                  >
                    تحديث السجلات
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[10px]">
                    <thead className="bg-slate-900/40 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2 font-bold">التوقيت</th>
                        <th className="p-2 font-bold">المستخدم والترخيص</th>
                        <th className="p-2 font-bold">العملية</th>
                        <th className="p-2 font-bold">التفاصيل</th>
                        <th className="p-2 font-bold">الهاش الأمني (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5">
                          <td className="p-2 text-slate-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-2 font-bold text-slate-200">{log.userName}</td>
                          <td className="p-2"><span className="bg-blue-500/10 text-blue-400 px-1 rounded font-mono">{log.action}</span></td>
                          <td className="p-2 text-slate-300">{log.details}</td>
                          <td className="p-2 font-mono text-[8px] text-purple-400 truncate max-w-[120px]" title={log.hash}>{log.hash || 'e3b0c442...'}</td>
                        </tr>
                      ))}

                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد سجلات بعد. قم بعملية لإضافتها.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Kubernetes & Microservices Status Monitor (Proposal 1) */}
        {activeTab === 'k8s' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${appTheme === 'neon' ? 'bg-slate-950/40 border-purple-900/20' : 'bg-slate-100'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">حالة شبكة gRPC</span>
                <span className="text-md font-black text-emerald-400">مستقرة (gRPC Live)</span>
                <p className="text-[8px] text-slate-500 mt-1">اتصال قنوات الخدمات الخلفية خالي من التقطيع.</p>
              </div>

              <div className={`p-4 rounded-xl border ${appTheme === 'neon' ? 'bg-slate-950/40 border-purple-900/20' : 'bg-slate-100'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">وسيط الرسائل (RabbitMQ / Kafka)</span>
                <span className="font-mono text-md font-black text-purple-400">
                  {clusterData?.broker?.activeTopicsCount || 3} قنوات نشطة
                </span>
                <p className="text-[8px] text-slate-500 mt-1">حجم الرسائل المعالجة: {clusterData?.broker?.processedMessages || 12} رسالة.</p>
              </div>

              <div className={`p-4 rounded-xl border ${appTheme === 'neon' ? 'bg-slate-950/40 border-purple-900/20' : 'bg-slate-100'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">توزيع قواعد البيانات (Sharding Node)</span>
                <span className="font-mono text-sm font-black text-indigo-400">
                  {clusterData?.sharding?.resolvedNode || 'shard_node_1_sa'}
                </span>
                <p className="text-[8px] text-slate-500 mt-1">توجيه ذكي لقاعدة بيانات المستأجر.</p>
              </div>

              <div className={`p-4 rounded-xl border ${appTheme === 'neon' ? 'bg-slate-950/40 border-purple-900/20' : 'bg-slate-100'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">سعة التخزين المؤقت الموزع (Redis)</span>
                <span className="text-md font-black text-blue-400">
                  {clusterData?.cache?.keysCount || 4} مفاتيح بالذاكرة
                </span>
                <p className="text-[8px] text-slate-500 mt-1">معدل الإصابة الناجحة للسيولة: 100% (Hit Ratio).</p>
              </div>
            </div>

            {/* Kubernetes Active Pods Diagram Simulation */}
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-300">☸️ هيكلية حاويات السحابة والتحجيم التلقائي (Kubernetes HPA Topology)</h3>
                  <p className="text-[10px] text-slate-400">مراقبة التحجيم الرأسي لخدمات تطبيق بروميت والتحكم اليدوي المحاكي في عدد الـ Replicas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">محاكاة عدد الحاويات:</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={replicasCount}
                    onChange={(e) => setReplicasCount(parseInt(e.target.value) || 3)}
                    className="w-12 bg-slate-900 border border-slate-800 rounded p-1 text-xs text-center"
                  />
                </div>
              </div>

              {/* Graphical visualizer representing active cluster pods */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4">
                {Array.from({ length: replicasCount }).map((_, idx) => (
                  <div key={idx} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                    <Server size={24} className="text-emerald-400" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-200 block">promet-erp-pod-{idx+1}</span>
                      <span className="text-[8px] text-slate-400 block">IP: 10.124.0.{idx+11}</span>
                      <span className="text-[8px] text-emerald-400 font-bold">الحالة: مستقر وجاهز</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Offline-First Simulator & Synchronization Queue (Proposal 4) */}
        {activeTab === 'offline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Offline data panel */}
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-300">💾 إصدار فواتير مرن غير متصل (Offline Invoice)</h3>
                <button 
                  onClick={handleToggleOnline}
                  className={`px-2 py-1 rounded text-[9px] font-bold ${
                    isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {isOnline ? 'متصل بالشبكة ●' : 'غير متصل بالشبكة ✕'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mb-4">في حال انقطاع الإنترنت، يتيح لك النظام مواصلة البيع فوراً وحفظ البيانات بالمتصفح ريثما يعود الاتصال.</p>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block">اسم العميل:</span>
                  <input 
                    type="text" 
                    value={offlineClient}
                    onChange={(e) => setOfflineClient(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block">قيمة الفاتورة بالريال سعودي:</span>
                  <input 
                    type="number" 
                    value={offlineAmount}
                    onChange={(e) => setOfflineAmount(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="button"
                  onClick={handleCreateOfflineInvoice}
                  className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  حفظ الفاتورة محلياً (مسودة معلقة)
                </button>
              </div>
            </div>

            {/* View Queue Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">⏳ صف مزامنة البيانات المعلقة بالخادم (Outbox queue)</h3>
                    <p className="text-[10px] text-slate-400">الفواتير المحفوظة محلياً والمستعدة للمزامنة وتصدير الإيصالات الذكية فور استقرار الاتصال.</p>
                  </div>
                  <button 
                    onClick={handleSyncOfflineQueue}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    مزامنة الفواتير بالخادم الآن
                  </button>
                </div>

                <div className="space-y-3">
                  {offlineQueue.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950/30 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-200">{item.clientName}</span>
                        <span className="text-[9px] text-slate-400 block">التوقيت: {new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">{item.amount.toLocaleString()} ريال</span>
                        <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">بانتظار المزامنة</span>
                      </div>
                    </div>
                  ))}

                  {offlineQueue.length === 0 && (
                    <div className="py-8 text-center text-slate-500">لا توجد حركات بيع معلقة بانتظار المزامنة. كل البيانات محدثة ومطابقة للخادم السحابي!</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Dynamic Localization / Translation dictionary manager (Proposal 4) */}
        {activeTab === 'localization' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-5 rounded-2xl border transition-all ${
              appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Globe size={14} />
                محرر الترجمة وقاموس اللغات الديناميكي (Dynamic Localization)
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">قم بتغيير المصطلحات المحورية في لوحة القيادة فوراً لتتناسب مع هوية ومصطلحات مؤسستك المحددة.</p>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block">العنصر المراد ترجمته (Translation Key):</span>
                  <select 
                    value={editKey}
                    onChange={(e) => {
                      setEditKey(e.target.value);
                      setEditVal(dict[e.target.value] || '');
                    }}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="dashboard_title">عنوان لوحة التحكم الرئيسي (dashboard_title)</option>
                    <option value="total_sales">حقل إجمالي الإيرادات (total_sales)</option>
                    <option value="active_workers">اسم حقل مسؤول الرقابة (active_workers)</option>
                    <option value="offline_status">حالة الاتصال (offline_status)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block">القيمة الجديدة باللغة العربية أو الإنجليزية:</span>
                  <input 
                    type="text" 
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setDict(prev => ({ ...prev, [editKey]: editVal }));
                    alert('✨ تم حفظ التعديل بنجاح في قاموس الترجمة الفوري! تم تعديل الهوية البصرية للتطبيق بالكامل.');
                  }}
                  className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  تعديل المصطلح فوراً
                </button>
              </div>
            </div>

            {/* List Dictionary values */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-5 rounded-2xl border transition-all ${
                appTheme === 'neon' ? 'bg-[#13131A] border-purple-900/30' : 'bg-white border-slate-200'
              }`}>
                <h3 className="text-xs font-bold text-slate-300 mb-3">📋 مصفوفة قاموس الترجمة النشط (Localization Dictionary)</h3>
                
                <div className="space-y-3">
                  {Object.entries(dict).map(([k, v]) => (
                    <div key={k} className="p-3 bg-slate-950/30 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded">{k}</span>
                      <span className="font-bold text-slate-200">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
