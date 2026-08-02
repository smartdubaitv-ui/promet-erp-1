import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/Modal';
import { colors, typography } from '../theme';
import { 
  FileText, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  HelpCircle, 
  Search, 
  Filter, 
  AlertTriangle, 
  DollarSign, 
  FileCheck,
  Percent, 
  ChevronRight, 
  Info,
  Layers,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier_id: string | number;
  supplier_name: string;
  purchase_order_id: number | null;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'received' | 'pending_approval' | 'approved' | 'paid' | 'rejected' | 'disputed';
  match_status: 'pending' | 'partial' | 'matched' | 'mismatch';
  match_score: number;
  mismatch_reason: string;
  approved_by_name: string;
  payment_date: string | null;
  payment_amount: number | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  extracted_data?: any;
}

interface Vendor {
  id: string;
  name: string;
  type: string;
  email?: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: string;
  total: number;
}

interface MatchingRule {
  id: number;
  name: string;
  description: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
}

interface LogEntry {
  id: number;
  invoice_id: number;
  action: string;
  comment: string;
  user_name: string;
  created_at: string;
}

export const AccountsPayableView: React.FC = () => {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [matchingRules, setMatchingRules] = useState<MatchingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Selected Invoice Details for side-panel / logs
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    purchase_order_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    subtotal: '',
    tax: '',
    notes: ''
  });

  // Calculate total dynamically on subtotal or tax change
  const calculatedTotal = (Number(formData.subtotal) || 0) + (Number(formData.tax) || 0);

  useEffect(() => {
    loadInvoices();
    loadVendorsAndPOs();
    loadMatchingRules();
  }, [statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const url = statusFilter 
        ? `/api/supplier-invoices?status=${statusFilter}`
        : '/api/supplier-invoices';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (error) {
      console.error('❌ فشل جلب فواتير الموردين:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorsAndPOs = async () => {
    try {
      // Load contacts (vendors)
      const resContacts = await fetch('/api/contacts');
      const contactsData = await resContacts.json();
      if (Array.isArray(contactsData)) {
        setVendors(contactsData.filter((c: any) => c.type === 'vendor'));
      }

      // Load purchase orders
      const resPOs = await fetch('/api/inventory/purchase-orders');
      const posData = await resPOs.json();
      if (Array.isArray(posData)) {
        setPurchaseOrders(posData);
      }
    } catch (error) {
      console.error('❌ فشل جلب الموردين وأوامر الشراء:', error);
    }
  };

  const loadMatchingRules = async () => {
    try {
      const res = await fetch('/api/matching-rules');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMatchingRules(data);
      }
    } catch (error) {
      console.error('❌ فشل جلب قواعد المطابقة:', error);
    }
  };

  const fetchLogs = async (invoiceId: number) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/supplier-invoices/${invoiceId}/logs`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSelectedLogs(data);
      }
    } catch (error) {
      console.error('❌ فشل جلب سجل المراجعة:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    fetchLogs(invoice.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      alert('الرجاء اختيار المورد');
      return;
    }
    try {
      const res = await fetch('/api/supplier-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total: calculatedTotal,
          created_by: 1
        })
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({
          invoice_number: '',
          supplier_id: '',
          purchase_order_id: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          subtotal: '',
          tax: '',
          notes: ''
        });
        loadInvoices();
      } else {
        const err = await res.json();
        alert(err.error || '❌ فشل حفظ الفاتورة');
      }
    } catch (error) {
      alert('❌ فشل إرسال البيانات');
    }
  };

  const handleApprove = async (id: number) => {
    const comment = prompt('أدخل أي ملاحظات مرافقة للاعتماد أو اضغط موافق مباشرة:');
    if (comment === null) return; // cancelled
    
    try {
      const res = await fetch(`/api/supplier-invoices/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 1, comment })
      });
      if (res.ok) {
        loadInvoices();
        if (selectedInvoice && selectedInvoice.id === id) {
          const updated = { ...selectedInvoice, status: 'approved' as const, approved_by_name: 'أحمد حماد' };
          setSelectedInvoice(updated);
          fetchLogs(id);
        }
      } else {
        const err = await res.json();
        alert(err.error || '❌ فشل اعتماد الفاتورة');
      }
    } catch (error) {
      alert('❌ خطأ في الاتصال بالخادم');
    }
  };

  const handlePay = async (id: number) => {
    const ref = prompt('الرجاء كتابة الرقم المرجعي للتحويل البنكي (أو اتركه فارغاً للتوليد التلقائي):');
    if (ref === null) return;

    try {
      const res = await fetch(`/api/supplier-invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_date: new Date().toISOString().split('T')[0],
          payment_reference: ref || undefined
        })
      });
      if (res.ok) {
        alert('🎉 تم سداد الفاتورة بنجاح وتحديث كافة السجلات المحاسبية والبنكية المرتبطة بها!');
        loadInvoices();
        if (selectedInvoice && selectedInvoice.id === id) {
          const updated = { ...selectedInvoice, status: 'paid' as const };
          setSelectedInvoice(updated);
          fetchLogs(id);
        }
      } else {
        const err = await res.json();
        alert(err.error || '❌ فشل تسجيل الدفعة');
      }
    } catch (error) {
      alert('❌ فشل الاتصال بالخادم');
    }
  };

  const statusMap: Record<string, { label: string; className: string; icon: any }> = {
    draft: { label: 'مسودة', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
    received: { label: 'مستلمة', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FileText },
    pending_approval: { label: 'قيد الاعتماد', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'معتمدة للدفع', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileCheck },
    paid: { label: 'مدفوعة بالكامل', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle },
    rejected: { label: 'مرفوضة', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    disputed: { label: 'متنازع عليها', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle }
  };

  const matchStatusMap: Record<string, { label: string; className: string; color: string }> = {
    pending: { label: 'قيد المراجعة', className: 'bg-slate-100 text-slate-700', color: '#94a3b8' },
    partial: { label: 'مطابقة جزئية', className: 'bg-amber-100 text-amber-800', color: '#f59e0b' },
    matched: { label: 'مطابقة كاملة', className: 'bg-emerald-100 text-emerald-800', color: '#10b981' },
    mismatch: { label: 'فروقات في المطابقة', className: 'bg-rose-100 text-rose-800', color: '#f43f5e' }
  };

  // KPIs Calculations
  const totalPayable = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'rejected')
    .reduce((sum, i) => sum + i.total, 0);

  const matchedRate = invoices.length > 0
    ? Math.round((invoices.filter(i => i.match_status === 'matched').length / invoices.length) * 100)
    : 0;

  const disputesCount = invoices.filter(i => i.match_status === 'mismatch' || i.status === 'disputed').length;
  
  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.payment_amount || i.total), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Welcome Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              🧾 أتمتة الحسابات الدائنة والتدقيق التلقائي (AP Automation)
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">الجيل المالي الذكي</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة فواتير الموردين والمطابقة الثلاثية (Invoice vs PO vs GRN)، الموافقات الذكية وقيد المدفوعات التلقائي بالدفاتر المحاسبية.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadInvoices} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            تحديث البيانات
          </Button>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus size={14} />
            {showForm ? 'إلغاء النموذج' : 'فاتورة مورد جديدة'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200 hover:shadow-md transition-all">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-bold">إجمالي الذمم الدائنة المستحقة</p>
              <h4 className="text-xl font-black text-slate-900 mt-1">{totalPayable.toLocaleString('ar-EG')} ج.م</h4>
              <p className="text-[9px] text-amber-600 mt-1">قيد الانتظار للاعتماد والتسوية</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 hover:shadow-md transition-all">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-bold">إجمالي المسدد هذا الشهر</p>
              <h4 className="text-xl font-black text-slate-900 mt-1">{paidTotal.toLocaleString('ar-EG')} ج.م</h4>
              <p className="text-[9px] text-emerald-600 mt-1">مسجلة بالكامل بالقيود المزدوجة</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 hover:shadow-md transition-all">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-bold">معدل المطابقة التلقائية الناجحة</p>
              <h4 className="text-xl font-black text-slate-900 mt-1">{matchedRate}%</h4>
              <p className="text-[9px] text-blue-600 mt-1">تمت مطابقتها بنسبة 3-way كاملة</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Percent size={20} />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 hover:shadow-md transition-all">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-bold">فواتير معلقة بسبب خلافات</p>
              <h4 className="text-xl font-black text-slate-900 mt-1">{disputesCount} فاتورة</h4>
              <p className="text-[9px] text-rose-600 mt-1">تتطلب تدخلاً ومطابقة يدوية</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Form, Invoices Table, side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Table & Add Form */}
        <div className="xl:col-span-2 space-y-6">
          
      {/* Modal for New Invoice Form */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="تسجيل واستلام فاتورة مورد جديدة"
        icon={<Plus size={18} className="text-blue-400" />}
        headerColorClass="text-blue-400"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">رقم الفاتورة الأصلي *</label>
              <input 
                placeholder="مثال: FT-2026-909"
                value={formData.invoice_number}
                onChange={e => setFormData({...formData, invoice_number: e.target.value})}
                required
                className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">المورد *</label>
              <select 
                value={formData.supplier_id}
                onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                required
                className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- اختر المورد المعني --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">أمر الشراء المرتبط (اختياري)</label>
              <select 
                value={formData.purchase_order_id}
                onChange={e => setFormData({...formData, purchase_order_id: e.target.value})}
                className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">لا يوجد أمر شراء مرتبط</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} (إجمالي: {po.total.toLocaleString()} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">تاريخ الفاتورة *</label>
              <input 
                type="date"
                value={formData.invoice_date}
                onChange={e => setFormData({...formData, invoice_date: e.target.value})}
                required
                className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">تاريخ الاستحقاق *</label>
              <input 
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                required
                className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">القيمة الخاضعة للضريبة</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={formData.subtotal}
                  onChange={e => setFormData({...formData, subtotal: e.target.value})}
                  required
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">الضريبة (EGP)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={formData.tax}
                  onChange={e => setFormData({...formData, tax: e.target.value})}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">ملاحظات الفاتورة</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="اكتب تفاصيل أو ملاحظات للتوريد هنا..."
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Live total display */}
          <div className="bg-slate-900/80 p-3 rounded-xl flex justify-between items-center text-xs border border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">المجموع النهائي التلقائي:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{calculatedTotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <span className="text-[10px] text-slate-400">يشمل القيمة المضافة المدخلة</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
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
              💾 حفظ الفاتورة وتدقيقها
            </button>
          </div>
        </form>
      </Modal>

          {/* Filters Bar */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === '' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                الكل ({invoices.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending_approval')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'pending_approval' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                ⏳ قيد الاعتماد ({invoices.filter(i => i.status === 'pending_approval').length})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                ✅ معتمدة للدفع ({invoices.filter(i => i.status === 'approved').length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'paid' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                💰 مدفوعة ({invoices.filter(i => i.status === 'paid').length})
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Filter size={11} />
              تصفية سريعة لحالة الدورة المستندية
            </div>
          </div>

          {/* Invoices List Card */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700/80 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-900/60 border-b border-slate-700/80 flex justify-between items-center">
              <span className="font-bold text-xs text-white">قائمة فواتير الموردين والمطابقات المستلمة</span>
              <span className="text-[10px] text-slate-400">انقر فوق الفاتورة لعرض سجل التدقيق والموافقة</span>
            </div>

            {loading ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xs text-slate-400 font-bold">جاري تحميل سجلات الحسابات الدائنة والتدقيق التلقائي...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-16 text-center">
                <FileText size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-300">لا توجد فواتير موردين مسجلة حالياً</p>
                <p className="text-xs text-slate-500 mt-1">يمكنك البدء بتسجيل أول فاتورة لتجربة نظام التدقيق الآلي.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-700/80 text-slate-400 font-bold">
                      <th className="p-4">رقم الفاتورة</th>
                      <th className="p-4">المورد</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4 text-left">المبلغ الإجمالي</th>
                      <th className="p-4 text-center">المطابقة الثلاثية</th>
                      <th className="p-4 text-center">حالة الفاتورة</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {invoices.map(invoice => {
                      const StatusIcon = statusMap[invoice.status]?.icon || Clock;
                      const matchStatus = matchStatusMap[invoice.match_status] || matchStatusMap.pending;
                      
                      return (
                        <tr 
                          key={invoice.id}
                          className={`hover:bg-slate-700/40 transition-colors cursor-pointer ${
                            selectedInvoice?.id === invoice.id ? 'bg-blue-900/30 font-bold' : ''
                          }`}
                          onClick={() => handleSelectInvoice(invoice)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-slate-700/60 rounded text-slate-300 shrink-0 font-bold">
                                #{invoice.id}
                              </span>
                              <div>
                                <p className="font-bold text-white">{invoice.invoice_number}</p>
                                {invoice.purchase_order_id && (
                                  <p className="text-[10px] text-slate-400 font-mono">PO-ID: {invoice.purchase_order_id}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-200">
                            {invoice.supplier_name}
                          </td>
                          <td className="p-4 text-slate-400 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p>{invoice.invoice_date}</p>
                              <p className="text-[10px] text-slate-500">استحقاق: {invoice.due_date}</p>
                            </div>
                          </td>
                          <td className="p-4 font-black text-emerald-400 text-left whitespace-nowrap font-mono">
                            {invoice.total.toLocaleString()} ج.م
                          </td>
                          <td className="p-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${matchStatus.className}`}>
                                {matchStatus.label}
                              </span>
                              <div className="w-16 bg-slate-900 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${invoice.match_score || 0}%`,
                                    backgroundColor: matchStatus.color
                                  }} 
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">درجة: {invoice.match_score}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusMap[invoice.status]?.className}`}>
                              <StatusIcon size={11} />
                              {statusMap[invoice.status]?.label}
                            </span>
                          </td>
                          <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-center">
                              {invoice.status === 'pending_approval' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(invoice.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 px-2 rounded"
                                >
                                  ✅ اعتماد
                                </Button>
                              )}
                              {invoice.status === 'approved' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handlePay(invoice.id)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 px-2.5 rounded flex items-center gap-1"
                                >
                                  <CreditCard size={10} />
                                  سداد
                                </Button>
                              )}
                              <button
                                onClick={() => handleSelectInvoice(invoice)}
                                className="p-1 text-slate-400 hover:text-white rounded bg-slate-700 hover:bg-slate-600"
                                title="عرض التفاصيل"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Details Pane & Audit Log */}
        <div className="space-y-6">
          
          {/* Active Invoice Details Panel */}
          {selectedInvoice ? (
            <div className="bg-slate-800 rounded-2xl border border-slate-700/80 overflow-hidden shadow-md sticky top-6">
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-700">
                <div>
                  <h3 className="font-bold text-xs text-amber-400">تفاصيل الفاتورة وتطابقات التدقيق</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{selectedInvoice.invoice_number}</p>
                </div>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs"
                >
                  إغلاق ✕
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Visual score gauge */}
                <div className="text-center p-4 bg-slate-900/80 rounded-xl border border-slate-700/80">
                  <p className="text-[10px] text-slate-400 font-bold">نقاط التطابق الثلاثي المجمّعة</p>
                  <h2 
                    className="text-3xl font-black mt-1 font-mono"
                    style={{ color: matchStatusMap[selectedInvoice.match_status]?.color }}
                  >
                    {selectedInvoice.match_score}%
                  </h2>
                  <span className="text-xs font-bold text-slate-300 mt-0.5 block">
                    {matchStatusMap[selectedInvoice.match_status]?.label}
                  </span>
                  
                  {selectedInvoice.mismatch_reason && (
                    <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300 rounded-lg text-right flex items-start gap-2">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{selectedInvoice.mismatch_reason}</span>
                    </div>
                  )}
                </div>

                {/* Info list */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">المورد المعتمد:</span>
                    <span className="font-bold text-white">{selectedInvoice.supplier_name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">تاريخ الفاتورة:</span>
                    <span className="font-bold text-white">{selectedInvoice.invoice_date}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">تاريخ الاستحقاق:</span>
                    <span className="font-bold text-white">{selectedInvoice.due_date}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">أمر الشراء المرتبط:</span>
                    <span className="font-bold text-white">
                      {selectedInvoice.purchase_order_id ? `#PO-00${selectedInvoice.purchase_order_id}` : 'لا يوجد'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">قيمة الفاتورة الخاضعة للضريبة:</span>
                    <span className="font-bold text-white font-mono">{selectedInvoice.subtotal.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400 font-medium">قيمة الضريبة المضافة:</span>
                    <span className="font-bold text-white font-mono">{selectedInvoice.tax.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2 bg-blue-950/40 border border-blue-800/40 px-3 rounded-xl font-bold text-blue-300">
                    <span>الإجمالي النهائي:</span>
                    <span className="text-emerald-400 font-mono">{selectedInvoice.total.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Extracted JSON OCR / Meta details if available */}
                {selectedInvoice.extracted_data && (
                  <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-800/40 text-[10px]">
                    <span className="font-bold text-indigo-300 block mb-1">🔍 البيانات المستخرجة بالذكاء الاصطناعي (OCR):</span>
                    <div className="grid grid-cols-2 gap-1.5 text-indigo-200 font-mono">
                      <div>المورد المكتشف: {selectedInvoice.extracted_data.vendor_detected || 'غير متوفر'}</div>
                      <div>نسبة الثقة: {(selectedInvoice.extracted_data.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}

                {/* Payment reference if paid */}
                {selectedInvoice.status === 'paid' && (
                  <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold">✅ تم سداد الفاتورة بنجاح</p>
                    <p className="font-mono text-[10px]">التاريخ: {selectedInvoice.payment_date}</p>
                    <p className="font-mono text-[10px]">الرقم المرجعي: {selectedInvoice.payment_reference}</p>
                    <p className="font-mono text-[10px]">القيمة المدفوعة: {selectedInvoice.payment_amount?.toLocaleString()} ج.م</p>
                  </div>
                )}

                {/* Audit Logs Trail */}
                <div className="space-y-3">
                  <span className="font-bold text-xs text-slate-200 block">سجل موافقات وتتبع الدورة المستندية</span>
                  {loadingLogs ? (
                    <div className="text-center py-4">
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : selectedLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-400">لا توجد سجلات للموافقة حالياً.</p>
                  ) : (
                    <div className="space-y-3 relative border-r-2 border-slate-700 pr-4 mr-1">
                      {selectedLogs.map(log => (
                        <div key={log.id} className="relative space-y-0.5">
                          <span className="absolute top-1 -right-[21px] w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-800" />
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                            <span>بواسطة: {log.user_name}</span>
                            <span className="font-mono">{new Date(log.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-200">{log.comment}</p>
                          <span className="text-[9px] text-slate-500 block font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons inside detail panel */}
                <div className="pt-2 border-t border-slate-700 flex gap-2">
                  {selectedInvoice.status === 'pending_approval' && (
                    <Button 
                      onClick={() => handleApprove(selectedInvoice.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl"
                    >
                      ✅ اعتماد وموافقة فورية
                    </Button>
                  )}
                  {selectedInvoice.status === 'approved' && (
                    <Button 
                      onClick={() => handlePay(selectedInvoice.id)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-xl flex justify-center items-center gap-1.5"
                    >
                      <CreditCard size={13} />
                      سداد وتسجيل القيد المزدوج
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <Info size={32} className="mx-auto text-slate-500" />
              <p className="text-xs font-bold text-slate-300">لم يتم اختيار أي فاتورة حالياً</p>
              <p className="text-[10px] text-slate-400">انقر على أي فاتورة من الجدول الأيمن لاستعراض تفاصيل الدورة، نقاط المطابقة، وسجلات الموافقة التفاعلية للقسم.</p>
            </div>
          )}

          {/* Matching Rules Info Card */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700/80 p-4 space-y-3">
            <div className="pb-3 border-b border-slate-700">
              <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-blue-400" />
                معايير وقواعد التدقيق التلقائي النشطة
              </h3>
            </div>
            <div className="space-y-3">
              {matchingRules.map(rule => (
                <div key={rule.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-start gap-2">
                  <div className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 font-bold px-2 py-0.5 rounded-lg shrink-0">
                    أولوية {rule.priority}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-200">{rule.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AccountsPayableView;
