import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Plus, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Target, 
  Phone, 
  Calendar, 
  Building, 
  Briefcase, 
  Layers, 
  Search, 
  MessageSquare,
  ChevronRight,
  Filter,
  UserCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import { Contact } from '../types';

interface CRMViewProps {
  contacts: Contact[];
  onRefreshContacts?: () => void;
  userRole: string;
}

export default function CRMView({
  contacts,
  onRefreshContacts,
  userRole
}: CRMViewProps) {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'customers' | 'activities'>('pipeline');

  // Backend state data
  const [dashboardStats, setDashboardStats] = useState<any>({
    totalCustomers: 0,
    activeOpportunities: 0,
    expectedRevenue: 0,
    wonOpportunities: 0,
    totalRevenue: 0,
    pendingActivities: 0
  });

  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  // Modals visibility
  const [showCustModal, setShowCustModal] = useState(false);
  const [showOppModal, setShowOppModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);

  // Success / Error messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields: New Customer
  const [newCustContactId, setNewCustContactId] = useState('');
  const [newCustCompanyName, setNewCustCompanyName] = useState('');
  const [newCustIndustry, setNewCustIndustry] = useState('');
  const [newCustWebsite, setNewCustWebsite] = useState('');
  const [newCustTaxId, setNewCustTaxId] = useState('');
  const [newCustCR, setNewCustCR] = useState('');
  const [newCustType, setNewCustType] = useState('company');
  const [newCustSegment, setNewCustSegment] = useState('lead');
  const [newCustRevenue, setNewCustRevenue] = useState('');
  const [newCustEmpCount, setNewCustEmpCount] = useState('');
  const [newCustContactMethod, setNewCustContactMethod] = useState('whatsapp');
  const [newCustAssignedTo, setNewCustAssignedTo] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('');
  const [newCustPaymentTerms, setNewCustPaymentTerms] = useState('30');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Form Fields: New Opportunity
  const [newOppCustomerId, setNewOppCustomerId] = useState('');
  const [newOppName, setNewOppName] = useState('');
  const [newOppDescription, setNewOppDescription] = useState('');
  const [newOppAmount, setNewOppAmount] = useState('');
  const [newOppStageId, setNewOppStageId] = useState('stage-1');
  const [newOppCloseDate, setNewOppCloseDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [newOppProb, setNewOppProb] = useState('10');
  const [newOppAssignedTo, setNewOppAssignedTo] = useState('');
  const [newOppSource, setNewOppSource] = useState('social_media');
  const [newOppNotes, setNewOppNotes] = useState('');

  // Form Fields: New Activity
  const [newActCustomerId, setNewActCustomerId] = useState('');
  const [newActOppId, setNewActOppId] = useState('');
  const [newActType, setNewActType] = useState('whatsapp');
  const [newActSubject, setNewActSubject] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActDate, setNewActDate] = useState(new Date().toISOString().slice(0, 16));
  const [newActDuration, setNewActDuration] = useState('15');
  const [newActAssignedTo, setNewActAssignedTo] = useState('');
  const [newActFollowUp, setNewActFollowUp] = useState('');

  // Initial loading
  useEffect(() => {
    loadCRMAll();
    loadEmployees();
  }, []);

  const loadCRMAll = async () => {
    try {
      const [statsRes, custsRes, oppsRes, stagesRes, actRes] = await Promise.all([
        fetch('/api/crm/dashboard').then(r => r.json()),
        fetch('/api/crm/customers').then(r => r.json()),
        fetch('/api/crm/opportunities').then(r => r.json()),
        fetch('/api/crm/pipeline-stages').then(r => r.json()),
        fetch('/api/crm/activities').then(r => r.json().catch(() => []))
      ]);

      if (statsRes) setDashboardStats(statsRes);
      if (custsRes) setCrmCustomers(custsRes);
      if (oppsRes) setOpportunities(oppsRes);
      if (stagesRes) setStages(stagesRes);
      if (actRes) setActivities(actRes);
    } catch (e) {
      console.error("Error loading CRM data:", e);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustContactId) {
      setErrorMsg('الرجاء اختيار جهة اتصال من الدفتر الأساسي أولاً');
      return;
    }

    try {
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: newCustContactId,
          company_name: newCustCompanyName || undefined,
          industry: newCustIndustry,
          website: newCustWebsite,
          tax_id: newCustTaxId,
          commercial_register: newCustCR,
          customer_type: newCustType,
          customer_segment: newCustSegment,
          annual_revenue: parseFloat(newCustRevenue) || 0,
          employee_count: parseInt(newCustEmpCount) || 0,
          preferred_contact_method: newCustContactMethod,
          assigned_to: newCustAssignedTo || null,
          credit_limit: parseFloat(newCustLimit) || 0,
          payment_terms: parseInt(newCustPaymentTerms) || 30,
          notes: newCustNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('✅ تم ترقية جهة الاتصال لعميل CRM بنجاح!');
        setTimeout(() => {
          setSuccessMsg('');
          setShowCustModal(false);
          loadCRMAll();
          if (onRefreshContacts) onRefreshContacts();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء الإضافة');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOppCustomerId || !newOppName || !newOppAmount) {
      setErrorMsg('الرجاء تعبئة كافة الحقول الإلزامية');
      return;
    }

    try {
      const res = await fetch('/api/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: newOppCustomerId,
          name: newOppName,
          description: newOppDescription,
          amount: parseFloat(newOppAmount),
          pipeline_stage_id: newOppStageId,
          expected_close_date: newOppCloseDate,
          probability: parseInt(newOppProb),
          assigned_to: newOppAssignedTo || null,
          source: newOppSource,
          notes: newOppNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('✅ تم إضافة فرصة البيع الجديدة بنجاح!');
        setTimeout(() => {
          setSuccessMsg('');
          setShowOppModal(false);
          loadCRMAll();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'حدث خطأ');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActCustomerId || !newActSubject) {
      setErrorMsg('الرجاء اختيار العميل وعنوان التفاعل المالي');
      return;
    }

    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: newActCustomerId,
          opportunity_id: newActOppId || null,
          activity_type: newActType,
          subject: newActSubject,
          description: newActDesc,
          activity_date: newActDate,
          duration_minutes: parseInt(newActDuration) || 15,
          assigned_to: newActAssignedTo || null,
          follow_up_date: newActFollowUp || null,
          status: 'completed'
        })
      });

      if (res.ok) {
        setSuccessMsg('✅ تم تسجيل وتدوين تفاعل العميل بنجاح!');
        setTimeout(() => {
          setSuccessMsg('');
          setShowActivityModal(false);
          loadCRMAll();
        }, 1500);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'حدث خطأ');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateOpportunityStage = async (oppId: string, stageId: string) => {
    try {
      const matchingStage = stages.find(s => s.id === stageId);
      const prob = matchingStage ? matchingStage.probability : 10;

      const res = await fetch(`/api/crm/opportunities/${oppId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_stage_id: stageId,
          probability: prob
        })
      });

      if (res.ok) {
        loadCRMAll();
      } else {
        alert('حدث خطأ أثناء نقل الفرصة لمرحلة أخرى');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pre-fill fields when selecting Contact
  const handleContactSelect = (contactId: string) => {
    setNewCustContactId(contactId);
    const contactObj = contacts.find(c => c.id === contactId);
    if (contactObj) {
      setNewCustCompanyName(contactObj.name);
    }
  };

  // Filtered customer list
  const filteredCustomers = crmCustomers.filter(cust => {
    const sQuery = searchQuery.toLowerCase();
    const matchesSearch = 
      cust.company_name?.toLowerCase().includes(sQuery) ||
      cust.contact_email?.toLowerCase().includes(sQuery) ||
      cust.contact_phone?.toLowerCase().includes(sQuery) ||
      cust.industry?.toLowerCase().includes(sQuery);

    const matchesSegment = segmentFilter ? cust.customer_segment === segmentFilter : true;
    const matchesAssigned = assignedFilter ? String(cust.assigned_to) === String(assignedFilter) : true;

    return matchesSearch && matchesSegment && matchesAssigned;
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header Operation Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md gap-3">
        <div>
          <h2 className="text-sm font-black text-white">إدارة علاقات العملاء الذكية والصفقات (CRM Pipeline)</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">جرد وتصنيف العملاء الموالين، وتتبع خط أنابيب المبيعات اليومي والفرص المحققة لإثراء السيولة المباشرة</p>
        </div>

        {userRole !== 'viewer' && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setShowCustModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <Users size={14} />
              ترقية جهة اتصال لعميل CRM
            </button>
            <button 
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setShowOppModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <TrendingUp size={14} />
              فرصة مبيعات جديدة
            </button>
            <button 
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setShowActivityModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <MessageSquare size={14} />
              تسجيل تفاعل / نشاط
            </button>
          </div>
        )}
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">إجمالي عملاء CRM</span>
            <strong className="text-sm font-black text-white">{dashboardStats.totalCustomers || 0} منشأة</strong>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">فرص المبيعات النشطة</span>
            <strong className="text-sm font-black text-amber-400">{dashboardStats.activeOpportunities || 0} صفقات جارية</strong>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <Target size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">الوزن المالي المتوقع للخط</span>
            <strong className="text-sm font-black text-indigo-400">{(dashboardStats.expectedRevenue || 0).toLocaleString()} ج.م</strong>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">الصفقات المغلقة المكتملة</span>
            <strong className="text-sm font-black text-emerald-400">{(dashboardStats.totalRevenue || 0).toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex border border-slate-700/80 bg-slate-900/80 p-1 rounded-2xl gap-1 max-w-md">
        <button
          onClick={() => setActiveSubTab('pipeline')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            activeSubTab === 'pipeline' ? 'bg-slate-800 text-blue-400 border border-slate-700/80 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📈 أنابيب المبيعات والمراحل
        </button>
        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            activeSubTab === 'customers' ? 'bg-slate-800 text-blue-400 border border-slate-700/80 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          👥 قائمة عملاء CRM
        </button>
        <button
          onClick={() => setActiveSubTab('activities')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            activeSubTab === 'activities' ? 'bg-slate-800 text-blue-400 border border-slate-700/80 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📞 سجل التفاعلات والمتابعات
        </button>
      </div>

      {/* Tab Contents: 1. Sales Pipeline */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-800 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-300">تتبع تقدم صفقاتك النشطة من خلال النقل التلقائي للمراحل التالية:</span>
            <span className="text-[10px] text-slate-400">إجمالي الصفقات: {opportunities.length} صفقات</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-2">
            {stages.map(stage => {
              const stageOpps = opportunities.filter(o => o.pipeline_stage_id === stage.id);
              const stageTotalWeighted = stageOpps.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0);
              
              return (
                <div key={stage.id} className="bg-slate-800 rounded-2xl border border-slate-700/80 border-t-4 p-3.5 space-y-2.5 min-w-[200px]" style={{ borderTopColor: stage.color || '#94a3b8' }}>
                  <div className="flex justify-between items-center border-b border-slate-700/60 pb-2">
                    <span className="text-xs font-black text-white">{stage.name}</span>
                    <span className="bg-slate-900 text-slate-300 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-slate-700">{stageOpps.length}</span>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 font-semibold">
                    المتوقع: {stageTotalWeighted.toLocaleString()} ج.م
                  </div>

                  <div className="space-y-2 max-h-[450px] overflow-y-auto">
                    {stageOpps.map(opp => (
                      <div 
                        key={opp.id} 
                        onClick={() => setSelectedOpp(opp)}
                        className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 shadow-xs hover:border-blue-500 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-relaxed">{opp.name}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${opp.status === 'won' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                            {opp.status === 'won' ? 'مكتسب' : `${opp.probability}%`}
                          </span>
                        </div>

                        <p className="text-[9px] text-slate-400 font-medium line-clamp-1">{opp.company_name}</p>

                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-[10px]">
                          <strong className="text-blue-400 font-mono font-bold">{(opp.amount).toLocaleString()} ج.م</strong>
                          <span className="text-slate-400 text-[9px] font-mono">{opp.expected_close_date}</span>
                        </div>

                        {opp.assigned_to_name && (
                          <div className="text-[8px] text-slate-300 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            👤 {opp.assigned_to_name}
                          </div>
                        )}

                        {userRole !== 'viewer' && opp.status === 'active' && (
                          <div className="pt-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={opp.pipeline_stage_id}
                              onChange={(e) => handleUpdateOpportunityStage(opp.id, e.target.value)}
                              className="w-full text-[9px] bg-slate-900 border border-slate-700 rounded-lg p-1 font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id}>نقل إلى: {s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}

                    {stageOpps.length === 0 && (
                      <div className="text-center py-6 text-[9px] text-slate-500 border border-dashed border-slate-700/80 rounded-xl">
                        لا يوجد صفقات حالية
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Contents: 2. CRM Customers */}
      {activeSubTab === 'customers' && (
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row gap-2 justify-between items-center pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-400" />
              <h3 className="text-xs font-bold text-white">قائمة عملاء CRM المصنفين</h3>
            </div>
            {/* Filters Area */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="بحث باسم الشركة أو الصناعة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl p-2 pr-8 pl-3 text-xs text-white placeholder-slate-500 w-52 focus:outline-none focus:border-blue-500"
                />
                <Search size={12} className="absolute right-2.5 top-3 text-slate-400" />
              </div>
              <select 
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">جميع فئات العملاء</option>
                <option value="premium">💎 عملاء مميزين (Premium)</option>
                <option value="gold">🥇 عميل ذهبي (Gold)</option>
                <option value="silver">🥈 عميل فضي (Silver)</option>
                <option value="bronze">🥉 عميل برونزي (Bronze)</option>
                <option value="lead">🏷️ عملاء محتملين (Leads)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80">
                <tr>
                  <th className="p-3">العميل / المؤسسة</th>
                  <th className="p-3">الصناعة / المجال</th>
                  <th className="p-3">فئة التصنيف</th>
                  <th className="p-3">التواصل المفضل</th>
                  <th className="p-3">الحد الائتماني</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3 text-center">الفرص النشطة</th>
                  <th className="p-3 text-left">مجموع الصفقات المكتسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white">{cust.company_name}</div>
                      {cust.website && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{cust.website}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{cust.industry || 'غير محدد'}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        cust.customer_segment === 'premium' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                        cust.customer_segment === 'gold' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        cust.customer_segment === 'silver' ? 'bg-slate-700 text-slate-200 border-slate-600' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {cust.customer_segment === 'premium' ? '💎 مميز' :
                         cust.customer_segment === 'gold' ? '🥇 ذهبي' :
                         cust.customer_segment === 'silver' ? '🥈 فضي' :
                         cust.customer_segment === 'bronze' ? '🥉 برونزي' : '🏷️ محتمل'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">
                      {cust.preferred_contact_method === 'whatsapp' ? '🟢 واتساب' :
                       cust.preferred_contact_method === 'meeting' ? '🤝 اجتماع شخصي' :
                       cust.preferred_contact_method === 'phone' ? '📞 مكالمة' : '📧 بريد إلكتروني'}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-200">
                      {cust.credit_limit ? `${(cust.credit_limit).toLocaleString()} ج.م` : 'بدون حد'}
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{cust.assigned_to_name}</td>
                    <td className="p-3 text-center text-amber-400 font-black">{cust.active_opportunities}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-400">{(cust.total_revenue).toLocaleString()} ج.م</td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                      لم يتم العثور على عملاء CRM يطابقون شروط البحث الفلترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: 3. Activities Log */}
      {activeSubTab === 'activities' && (
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              <h3 className="text-xs font-bold text-white">سجل التفاعلات والتواصل المكتمل مع العملاء</h3>
            </div>
            <span className="text-[10px] text-slate-400">إجمالي التفاعلات المسجلة: {activities.length}</span>
          </div>

          <div className="space-y-3">
            {activities.map(act => {
              const customerObj = crmCustomers.find(c => c.id === act.customer_id) || {};
              return (
                <div key={act.id} className="p-3.5 bg-slate-900/80 rounded-2xl border-r-4 border-indigo-500 border-y border-l border-slate-700/80 flex justify-between items-start gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border ${
                        act.activity_type === 'call' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        act.activity_type === 'meeting' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        act.activity_type === 'whatsapp' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {act.activity_type === 'call' ? '📞 مكالمة هاتفية' :
                         act.activity_type === 'meeting' ? '🤝 اجتماع عمل' :
                         act.activity_type === 'whatsapp' ? '🟢 واتساب' :
                         act.activity_type === 'note' ? '📝 ملاحظة إدارية' : '📧 بريد الكتروني'}
                      </span>
                      <h4 className="text-xs font-bold text-white">{act.subject}</h4>
                      <span className="text-[10px] text-slate-400">— مع {customerObj.company_name || 'عميل غير معروف'}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">{act.description}</p>

                    {act.follow_up_date && (
                      <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 inline-block p-1 px-2.5 rounded-xl font-bold">
                        ⏳ تاريخ المتابعة القادم الموصى به: {act.follow_up_date}
                      </div>
                    )}
                  </div>

                  <div className="text-left text-[10px] text-slate-400 font-mono space-y-1 shrink-0">
                    <div>{act.activity_date ? act.activity_date.replace('T', ' ').slice(0, 16) : ''}</div>
                    {act.duration_minutes && <div>⏱️ المدة: {act.duration_minutes} دقيقة</div>}
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="text-center py-10 text-slate-400 border border-dashed border-slate-700/80 rounded-2xl">
                لم يتم تسجيل أي تفاعل عملاء حتى الآن في النظام.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Modal: Register CRM Customer */}
      <Modal
        isOpen={showCustModal}
        onClose={() => setShowCustModal(false)}
        title="ترقية جهة اتصال في الدفتر لعميل CRM"
        icon={<Users className="text-emerald-400" size={18} />}
        headerColorClass="text-emerald-400"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {errorMsg && <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs rounded-xl font-bold">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اختر جهة الاتصال الأساسية *</label>
              <select 
                required
                value={newCustContactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="">-- اختر جهة اتصال --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type === 'customer' ? 'عميل' : 'مورد'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">اسم الشركة (بالعربي)</label>
              <input 
                type="text"
                placeholder="مثال: شركة الأندلس المحدودة"
                value={newCustCompanyName}
                onChange={(e) => setNewCustCompanyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المجال / الصناعة</label>
              <input 
                type="text"
                placeholder="مثال: الاستشارات التقنية"
                value={newCustIndustry}
                onChange={(e) => setNewCustIndustry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الموقع الإلكتروني</label>
              <input 
                type="text"
                placeholder="www.example.com"
                value={newCustWebsite}
                onChange={(e) => setNewCustWebsite(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-left focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الرقم الضريبي</label>
              <input 
                type="text"
                placeholder="3000123456..."
                value={newCustTaxId}
                onChange={(e) => setNewCustTaxId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">السجل التجاري</label>
              <input 
                type="text"
                placeholder="1010..."
                value={newCustCR}
                onChange={(e) => setNewCustCR(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">فئة العميل التصنيفية</label>
              <select 
                value={newCustSegment}
                onChange={(e) => setNewCustSegment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="lead">🏷️ عميل محتمل (Lead)</option>
                <option value="bronze">🥉 عميل برونزي</option>
                <option value="silver">🥈 عميل فضي</option>
                <option value="gold">🥇 عميل ذهبي</option>
                <option value="premium">💎 عميل مميز (VIP)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الحد الائتماني المالي (ج.م)</label>
              <input 
                type="number"
                placeholder="50000"
                value={newCustLimit}
                onChange={(e) => setNewCustLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">شروط السداد الافتراضية (أيام)</label>
              <select 
                value={newCustPaymentTerms}
                onChange={(e) => setNewCustPaymentTerms(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="15">سداد خلال 15 يوم</option>
                <option value="30">سداد خلال 30 يوم</option>
                <option value="45">سداد خلال 45 يوم</option>
                <option value="60">سداد خلال 60 يوم</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">مسؤول المبيعات المعين</label>
              <select 
                value={newCustAssignedTo}
                onChange={(e) => setNewCustAssignedTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- اختر موظف المبيعات --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">البيان / الملاحظات والاستراتيجية</label>
            <textarea 
              placeholder="تفاصيل التفاهم الأساسي، الاهتمام والمنتجات المستهدفة بالبيع"
              value={newCustNotes}
              onChange={(e) => setNewCustNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none h-16 text-xs"
            />
          </div>

          {successMsg && <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-xl font-bold">{successMsg}</div>}

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setShowCustModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              ترقية وتفعيل الحساب
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create New Opportunity */}
      <Modal
        isOpen={showOppModal}
        onClose={() => setShowOppModal(false)}
        title="صياغة فرصة مبيعات جديدة خطوة (Deals)"
        icon={<TrendingUp className="text-blue-400" size={18} />}
        headerColorClass="text-blue-400"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleCreateOpportunity} className="space-y-4 text-xs">
          {errorMsg && <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs rounded-xl font-bold">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اختر عميل CRM *</label>
              <select 
                required
                value={newOppCustomerId}
                onChange={(e) => setNewOppCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="">-- اختر العميل --</option>
                {crmCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">عنوان وموضوع الصفقة *</label>
              <input 
                type="text"
                required
                placeholder="مثال: توريد تراخيص سنوية"
                value={newOppName}
                onChange={(e) => setNewOppName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المبلغ المالي المتوقع (ج.م) *</label>
              <input 
                type="number"
                required
                placeholder="0.00"
                value={newOppAmount}
                onChange={(e) => setNewOppAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm text-blue-400 focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المرحلة الافتتاحية</label>
              <select 
                value={newOppStageId}
                onChange={(e) => {
                  setNewOppStageId(e.target.value);
                  const matching = stages.find(s => s.id === e.target.value);
                  if (matching) setNewOppProb(String(matching.probability));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                {stages.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">احتمالية النجاح والإغلاق (%)</label>
              <input 
                type="number"
                placeholder="10"
                value={newOppProb}
                onChange={(e) => setNewOppProb(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">تاريخ الإغلاق المتوقع</label>
              <input 
                type="date"
                value={newOppCloseDate}
                onChange={(e) => setNewOppCloseDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المسؤول المعين بمتابعتها</label>
              <select 
                value={newOppAssignedTo}
                onChange={(e) => setNewOppAssignedTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- اختر موظف المبيعات --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">قناة جذب الفرصة (Source)</label>
              <select 
                value={newOppSource}
                onChange={(e) => setNewOppSource(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="social_media">السوشيال ميديا والإعلانات</option>
                <option value="referral">توصية عملاء سابقين</option>
                <option value="website">موقع الشركة الرسمي</option>
                <option value="meeting">اجتماع شخصي مباشر</option>
                <option value="other">قنوات تسويق أخرى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">تفصيل ووصف بنود الصفقة بالتفصيل</label>
            <textarea 
              placeholder="الأعداد، الشروط المطلوبة، المدة والمورد المعتمد للربط"
              value={newOppDescription}
              onChange={(e) => setNewOppDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none h-16 text-xs"
            />
          </div>

          {successMsg && <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-xl font-bold">{successMsg}</div>}

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setShowOppModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              حفظ الفرصة للخط
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Log New Activity */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="تسجيل وتدوين تواصل فعال مع العميل"
        icon={<MessageSquare className="text-indigo-400" size={18} />}
        headerColorClass="text-indigo-400"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
          {errorMsg && <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs rounded-xl font-bold">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اختر عميل CRM المستهدف *</label>
              <select 
                required
                value={newActCustomerId}
                onChange={(e) => setNewActCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="">-- اختر العميل المستهدف --</option>
                {crmCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">ربط التفاعل بفرصة نشطة (اختياري)</label>
              <select 
                value={newActOppId}
                onChange={(e) => setNewActOppId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- لا يوجد أو عام --</option>
                {opportunities.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({(o.amount).toLocaleString()} ج.م)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">نوع التفاعل والتواصل</label>
              <select 
                value={newActType}
                onChange={(e) => setNewActType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="whatsapp">🟢 رسالة واتساب (Whatsapp)</option>
                <option value="call">📞 مكالمة هاتفية (Call)</option>
                <option value="meeting">🤝 اجتماع عمل مباشر (Meeting)</option>
                <option value="email">📧 بريد إلكتروني رسمي (Email)</option>
                <option value="note">📝 تدوين ملاحظة داخلية (Note)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">عنوان الموضوع والتواصل *</label>
              <input 
                type="text"
                required
                placeholder="مثال: مناقشة التسعير الأخير"
                value={newActSubject}
                onChange={(e) => setNewActSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">تاريخ ووقت التواصل</label>
              <input 
                type="datetime-local"
                value={newActDate}
                onChange={(e) => setNewActDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المدة التقريبية (بالدقائق)</label>
              <input 
                type="number"
                placeholder="15"
                value={newActDuration}
                onChange={(e) => setNewActDuration(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الموظف القائم بالتفاعل</label>
              <select 
                value={newActAssignedTo}
                onChange={(e) => setNewActAssignedTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- اختر الموظف --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">تاريخ المتابعة القادم الموصى به</label>
              <input 
                type="date"
                value={newActFollowUp}
                onChange={(e) => setNewActFollowUp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">وصف ملخص ما تم الاستقرار عليه بالتفصيل</label>
            <textarea 
              placeholder="نتائج التوافق، المشاكل المطروحة، التعهد بالمتابعة"
              value={newActDesc}
              onChange={(e) => setNewActDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none h-16 text-xs"
            />
          </div>

          {successMsg && <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-xl font-bold">{successMsg}</div>}

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setShowActivityModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              حفظ وتسجيل التواصل
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Opportunity Detail / Action View */}
      {selectedOpp && (
        <Modal
          isOpen={!!selectedOpp}
          onClose={() => setSelectedOpp(null)}
          title="عرض تفاصيل فرصة البيع بالكامل"
          icon={<Award className="text-amber-400" size={18} />}
          headerColorClass="text-amber-400"
          maxWidthClass="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">الفرصة</span>
              <strong className="text-sm font-black text-white">{selectedOpp.name}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">اسم الشركة العميل</span>
                <span className="font-bold text-white">{selectedOpp.company_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">قيمة الصفقة</span>
                <strong className="text-blue-400 font-mono font-bold text-sm">{(selectedOpp.amount).toLocaleString()} ج.م</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold mb-1">مرحلة البيع الحالية</span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white inline-block shadow-sm" style={{ backgroundColor: selectedOpp.stage_color || '#64748b' }}>
                  {selectedOpp.stage_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold mb-1">احتمالية الإغلاق والنجاح</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{selectedOpp.probability}%</span>
              </div>
            </div>

            {selectedOpp.description && (
              <div>
                <span className="text-[10px] text-slate-400 block font-bold mb-1">التوصيف والمذكرة</span>
                <p className="bg-slate-900/60 p-3 rounded-xl text-slate-300 border border-slate-700">{selectedOpp.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400 pt-3 border-t border-slate-700">
              <div>🗓️ تاريخ الإغلاق المتوقع: <span className="font-mono text-slate-200">{selectedOpp.expected_close_date}</span></div>
              <div>🗣️ مسؤول المبيعات: <span className="font-bold text-slate-200">{selectedOpp.assigned_to_name}</span></div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-700 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl transition-colors font-medium shadow-md"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
