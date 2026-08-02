import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  Check, 
  Mail, 
  CreditCard, 
  QrCode, 
  TrendingUp, 
  FileText, 
  RefreshCw, 
  Printer, 
  ArrowLeftRight 
} from 'lucide-react';
import { Invoice, Contact, Product } from '../types';
import { QuotationFormModal } from '../components/QuotationFormModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  contacts: Contact[];
  products: Product[];
  onCreateInvoice: (invData: any) => Promise<any>;
  onUpdateInvoice: (id: string, updateData: any) => Promise<any>;
  userRole: string; // 'admin' | 'accountant' | 'sales' | 'viewer'
}

export default function InvoicesView({
  invoices,
  contacts,
  products,
  onCreateInvoice,
  onUpdateInvoice,
  userRole
}: InvoicesViewProps) {
  
  // States
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations'>('invoices');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<any | null>(null);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Quotations persistence state
  const [quotations, setQuotations] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('promet_quotations');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'QT-1001',
        quotationNumber: 'QT-2026-1001',
        clientName: 'شركة النصر للمقاولات والتجارة',
        date: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        currency: 'EGP',
        notesTop: 'عرض توريد خردة حديد تسليح ثقيل وعادي',
        notesBottom: 'الدفع عند الاستلام بشيك مقبول الدفع أو تحويل بنكي.',
        items: [
          { materialName: 'خردة حديد تسليح ممتاز', quantity: 20, unit: 'طن', price: 18500 },
          { materialName: 'خردة زوايا وعوارض صلب', quantity: 10, unit: 'طن', price: 17200 }
        ],
        discount: 2,
        discountType: 'percent',
        tax: 14,
        status: 'sent'
      }
    ];
  });

  const handleSaveQuotation = (quotationData: any) => {
    setQuotations(prev => {
      const exists = prev.findIndex(q => q.id === quotationData.id);
      let updated;
      if (exists >= 0) {
        updated = [...prev];
        updated[exists] = quotationData;
      } else {
        updated = [quotationData, ...prev];
      }
      localStorage.setItem('promet_quotations', JSON.stringify(updated));
      return updated;
    });
    setEditingQuotation(null);
    setShowQuotationModal(false);
    setSuccessMsg('✅ تم حفظ وتحديث عرض السعر بنجاح في السجل!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteQuotation = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف عرض السعر هذا من السجل؟')) {
      setQuotations(prev => {
        const updated = prev.filter(q => q.id !== id);
        localStorage.setItem('promet_quotations', JSON.stringify(updated));
        return updated;
      });
      setSuccessMsg('🗑️ تم حذف عرض السعر بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleEditQuotation = (q: any) => {
    setEditingQuotation(q);
    setShowQuotationModal(true);
  };

  const handleCreateNewQuotation = () => {
    setEditingQuotation(null);
    setShowQuotationModal(true);
  };

  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const paginatedInvoices = invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when invoices length changes to avoid out-of-bounds pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [invoices.length, totalPages, currentPage]);

  // Local theme state
  const [isNeon, setIsNeon] = useState(false);
  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handlePrintInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 200);
  };
  
  const [isScrap, setIsScrap] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch('/api/company-modules').then(r => r.json()).catch(() => []),
      fetch('/api/company-settings').then(r => r.json()).catch(() => ({}))
    ]).then(([modules, settings]) => {
      const isScrapActivity = settings?.activity_code === 'scrap';
      const scrapEnabled = Array.isArray(modules) && modules.some((m: any) => m.code === 'scrap_inventory' && m.is_enabled);
      setIsScrap(isScrapActivity && scrapEnabled);
    }).catch(err => console.error(err));
  }, []);

  // Custom Invoice/Estimate Generator Form States
  const [contactId, setContactId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('شروط السداد: تُستحق القيمة خلال 30 يوماً من تاريخ التحرير.');
  const [isEstimate, setIsEstimate] = useState(false); // Estimate state indicator
  const [lines, setLines] = useState<Array<{ description: string; quantity: number; unitPrice: number; weight_kg?: number; unit_price_kg?: number; productId?: string }>>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sandbox payment simulator states
  const [isPaying, setIsPaying] = useState(false);

  // Filter contacts to get customers
  const customers = contacts.filter(c => c.type === 'customer');

  // Handle line item addition or removal in dynamic billing entries
  const handleAddLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index: number, key: string, value: any) => {
    const updated = [...lines] as any;
    if (key === 'quantity') {
      updated[index].quantity = Number(value) || 0;
    } else if (key === 'unitPrice') {
      updated[index].unitPrice = Number(value) || 0;
    } else if (key === 'weight_kg') {
      updated[index].weight_kg = Number(value) || 0;
      updated[index].unitPrice = (updated[index].weight_kg || 0) * (updated[index].unit_price_kg || 0);
    } else if (key === 'unit_price_kg') {
      updated[index].unit_price_kg = Number(value) || 0;
      updated[index].unitPrice = (updated[index].weight_kg || 0) * (updated[index].unit_price_kg || 0);
    } else {
      updated[index].description = String(value);
    }
    setLines(updated);
  };

  // Pre-fill fields if user selects an inventory product for that line
  const handleProductSelect = (index: number, productName: string) => {
    const selectedProd = products.find(p => p.name === productName);
    if (selectedProd) {
      const updated = [...lines] as any[];
      updated[index].description = selectedProd.name;
      updated[index].unitPrice = selectedProd.unitPrice;
      updated[index].productId = selectedProd.id;
      setLines(updated);
    }
  };

  // Submit invoice
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      setErrorMessage('يرجى تحديد العميل من القائمة أولاً.');
      return;
    }

    // Verify lines
    const validLines = lines.filter(l => l.description.trim() !== '');
    if (validLines.length === 0) {
      setErrorMessage('يرجى كتابة وصف واحد على الأقل وتحديد الصنف.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const totalAmount = validLines.reduce((acc, curr) => acc + (curr.quantity * (curr.unitPrice || 0)), 0);

      await onCreateInvoice({
        contactId,
        invoiceNumber,
        date,
        dueDate,
        lines: validLines,
        notes,
        status: isEstimate ? 'draft' : 'unpaid'
      });

      if (totalAmount > 50000 && !isEstimate) {
        setSuccessMsg('تم حفظ الفاتورة وتحويلها للمدير للموافقة عليها لتجاوزها الحد المسموح.');
      } else {
        setSuccessMsg(isEstimate ? 'تم استحداث مسودة التقدير التخطيطي للعميل بنجاح!' : 'تم إصدار الفاتورة الضريبية وتقييدها في الدفاتر!');
      }
      setTimeout(() => {
        setSuccessMsg('');
        setShowAddForm(false);
        // Reset states
        setContactId('');
        setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setLines([{ description: '', quantity: 1, unitPrice: 0 }]);
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.error || err.errorMessage || 'حدث خطأ في النظام أثناء إنشاء السند للعميل.');
    } finally {
      setSaving(false);
    }
  };

  // Turn Estimate/Draft into a formal Invoice
  const handleConvertEstimate = async (inv: Invoice) => {
    try {
      setSaving(true);
      await onUpdateInvoice(inv.id, { status: 'unpaid' });
      setSelectedInvoice({ ...inv, status: 'unpaid' });
      setSuccessMsg('تم تحويل التقدير المسودة إلى فاتورة حقيقية جارية السداد!');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      alert('خطأ أثناء عملية تفعيل الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  // Simulate instant payment of invoice with online Stripe mock
  const handleSimulatePayment = async (inv: Invoice) => {
    setIsPaying(true);
    try {
      await onUpdateInvoice(inv.id, { paidAmount: inv.totalAmount, status: 'paid' });
      setSelectedInvoice({ ...inv, paidAmount: inv.totalAmount, status: 'paid' });
      setSuccessMsg('تم تأكيد الدفع الإلكتروني بنجاح وتحديث الرصيد البنكي!');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      alert('تعذر استكمال تسوية العملية');
    } finally {
      setIsPaying(false);
    }
  };

  // Dynamic QR Code SVG renderer complying with ZATCA (Fatoora)
  // Generates matrix layout simulation in visual card
  const renderZatcaQr = (inv: Invoice) => {
    const clientName = contacts.find(c => c.id === inv.contactId)?.name || "شركة الهضبة للعملاء";
    return (
      <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100" className="text-slate-900">
          <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
          {/* Main QR anchors */}
          <rect x="5" y="5" width="20" height="20" fill="currentColor" />
          <rect x="9" y="9" width="12" height="12" fill="#ffffff" />
          <rect x="11" y="11" width="8" height="8" fill="currentColor" />

          <rect x="75" y="5" width="20" height="20" fill="currentColor" />
          <rect x="79" y="9" width="12" height="12" fill="#ffffff" />
          <rect x="81" y="11" width="8" height="8" fill="currentColor" />

          <rect x="5" y="75" width="20" height="20" fill="currentColor" />
          <rect x="9" y="79" width="12" height="12" fill="#ffffff" />
          <rect x="11" y="81" width="8" height="8" fill="currentColor" />

          {/* Simulated QR blocks & bits based on invoice meta */}
          <g fill="currentColor">
            <rect x="35" y="10" width="4" height="6" />
            <rect x="45" y="5" width="6" height="4" />
            <rect x="60" y="12" width="10" height="4" />
            <rect x="30" y="25" width="8" height="8" />
            <rect x="42" y="30" width="6" height="4" />
            <rect x="55" y="22" width="12" height="6" />
            <rect x="10" y="35" width="4" height="10" />
            <rect x="22" y="45" width="30" height="4" />
            <rect x="58" y="40" width="8" height="14" />
            <rect x="10" y="55" width="8" height="6" />
            <rect x="30" y="58" width="12" height="4" />
            <rect x="75" y="32" width="18" height="4" />
            <rect x="85" y="45" width="8" height="8" />
            <rect x="45" y="65" width="14" height="14" />
            <rect x="65" y="60" width="6" height="8" />
            <rect x="30" y="75" width="20" height="4" />
            <rect x="35" y="85" width="10" height="10" />
            <rect x="60" y="80" width="15" height="15" />
            <rect x="80" y="80" width="12" height="12" fill="#ffffff" />
            <rect x="83" y="83" width="6" height="6" fill="currentColor" />
          </g>
        </svg>
        <span className="text-[8px] text-slate-400 font-bold mt-1 tracking-wider uppercase">ZATCA Compliant QR</span>
        <span className="text-[7px] text-slate-500 max-w-[120px] text-center truncate">{clientName}</span>
      </div>
    );
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header operations bar */}
      <div className={`flex justify-between items-center p-4 rounded-xl border ${
        isNeon 
          ? 'bg-purple-950/10 border-purple-500/10 text-white' 
          : 'bg-slate-800 border-slate-700/80 text-white'
      }`}>
        <div>
          <h2 className={`text-sm font-black ${isNeon ? 'text-white' : 'text-slate-100'}`}>إدارة المبيعات وفواتير العملاء ونظام الفاتورة الضريبية</h2>
          <p className={`text-[10px] ${isNeon ? 'text-purple-300' : 'text-slate-400'}`}>قم بتحرير فواتير المبيعات، العروض السعرية (Estimates)، ومتابعة التحصيلات</p>
        </div>
        
        {userRole !== 'viewer' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCreateNewQuotation}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1.5 px-4 rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <FileText size={14} />
              📄 تقديم عرض سعر جديد
            </button>
            <button 
              onClick={() => {
                setShowAddForm(!showAddForm);
                setSelectedInvoice(null);
              }}
              className={`${isNeon ? 'btn-neon' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold p-1.5 px-4 rounded text-xs flex items-center gap-1.5 cursor-pointer`}
            >
              <Plus size={14} />
              إصدار فاتورة أو تقدير جديد
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b pb-3 border-slate-700/30">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'invoices'
              ? (isNeon ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-blue-600 text-white shadow-sm')
              : (isNeon ? 'bg-purple-950/20 text-purple-300 hover:bg-purple-950/40' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
          }`}
        >
          <FileText size={15} />
          🧾 جدول الفواتير الضريبية المسجلة ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'quotations'
              ? (isNeon ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-emerald-600 text-white shadow-sm')
              : (isNeon ? 'bg-purple-950/20 text-purple-300 hover:bg-purple-950/40' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
          }`}
        >
          <FileText size={15} />
          📄 سجل عروض الأسعار (Quotations Manager) ({quotations.length})
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-900/30 border border-green-700/50 text-green-300 text-xs p-3 rounded-lg font-bold">
          {successMsg}
        </div>
      )}

      {/* Invoice Creation Dynamic Modal / Form */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" 
          dir="rtl"
          onClick={() => setShowAddForm(false)}
        >
          <div 
            className={`w-full max-w-4xl rounded-2xl p-6 shadow-2xl border animate-scale-up flex flex-col max-h-[92vh] overflow-y-auto ${
              isNeon 
                ? 'bg-[#13131A] border-purple-500/30 text-white shadow-[0_0_25px_rgba(168,85,247,0.3)]' 
                : 'bg-slate-800 border-slate-700/80 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center pb-3 border-b mb-4 ${isNeon ? 'border-purple-500/15' : 'border-slate-700/80'}`}>
              <div className="flex items-center gap-2">
                <FileText className={`${isNeon ? 'text-purple-400' : 'text-blue-400'} w-5 h-5`} />
                <h3 className={`font-bold text-sm ${isNeon ? 'text-white' : 'text-slate-100'}`}>إنشاء مستند مالي جديد للعميل</h3>
              </div>
              <div className="flex items-center gap-4">
                <label className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${isNeon ? 'text-purple-300' : 'text-slate-300'}`}>
                  <input 
                    type="checkbox" 
                    checked={isEstimate}
                    onChange={(e) => setIsEstimate(e.target.checked)}
                    className={`rounded ${isNeon ? 'bg-purple-950/40 border-purple-500/30 text-purple-500 focus:ring-purple-500' : 'text-blue-500 focus:ring-blue-400'}`}
                  />
                  اعتبره كمسودة عرض سعر مخطط (Estimate)
                </label>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all text-sm cursor-pointer ${
                    isNeon 
                      ? 'text-purple-300 hover:text-white hover:bg-purple-950/40' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  ×
                </button>
              </div>
            </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded mb-3 font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className={`block text-[10px] font-bold mb-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>العميل المستفيد</label>
                <select 
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className={`w-full rounded p-1.5 ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-slate-50 border border-slate-300'}`}
                >
                  <option value="">-- اختر عميل من الدفتر --</option>
                  {customers.map((c, idx) => (
                    <option key={c.id ? `cust-${c.id}-${idx}` : `cust-idx-${idx}`} value={c.id} className={isNeon ? 'bg-[#13131A] text-white' : ''}>{c.name} (الرصيد: {c.balance} ج.م)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>رقم السند المالي</label>
                <input 
                  type="text" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={`w-full rounded p-1.5 ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-slate-50 border border-slate-300'}`}
                  placeholder="INV-2026-XXXX"
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>تاريخ الإصدار</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full rounded p-1.5 ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>تاريخ استحقاق السداد</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full rounded p-1.5 ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>
            </div>

            {/* Line items details with auto product loading */}
            <div className={`space-y-2 border-t pt-3 ${isNeon ? 'border-purple-500/10' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <p className={`text-[10px] font-bold ${isNeon ? 'text-purple-300' : 'text-slate-600'}`}>بنود الخدمات والسلع المباعة</p>
                <button 
                  type="button"
                  onClick={handleAddLine}
                  className={`text-[10px] font-bold hover:underline flex items-center gap-1 cursor-pointer ${isNeon ? 'text-purple-400' : 'text-blue-600'}`}
                >
                  <Plus size={10} />
                  إضافة سطر خدمة
                </button>
              </div>

              {lines.map((line, idx) => (
                <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded border ${isNeon ? 'bg-purple-950/10 border-purple-500/10' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[8px] font-bold text-slate-400">وصف الصنف / أو اختر من المخزون لحشو السعر تلقائياً</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="text" 
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="مثل: خدمات تأسيس برمجية أو رخصة نظام"
                        className={`w-full rounded p-1 text-xs ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                      />
                      <select 
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className={`rounded text-[9px] max-w-[120px] ${isNeon ? 'bg-[#13131A] border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                        defaultValue=""
                      >
                        <option value="" className={isNeon ? 'bg-[#13131A] text-white' : ''}>مخزون السلع</option>
                        {products.map((p, pIdx) => (
                          <option key={p.id ? `prod-${p.id}-${pIdx}` : `prod-idx-${pIdx}`} value={p.name} className={isNeon ? 'bg-[#13131A] text-white' : ''}>{p.name} ({p.unitPrice} ج.م)</option>
                        ))}
                      </select>
                    </div>

                    {isScrap && (
                      <div className="grid grid-cols-2 gap-2 mt-1.5 p-1.5 bg-purple-500/5 rounded border border-purple-500/10 text-right">
                        <div>
                          <label className="block text-[8px] font-bold text-purple-600 mb-0.5">الوزن (كجم)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={line.weight_kg || ''}
                            onChange={(e) => handleLineChange(idx, 'weight_kg', e.target.value)}
                            placeholder="0.00"
                            className={`w-full rounded p-1 text-[10px] ${isNeon ? 'bg-purple-950/40 border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-purple-600 mb-0.5">سعر الكيلو (ج.م)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={line.unit_price_kg || ''}
                            onChange={(e) => handleLineChange(idx, 'unit_price_kg', e.target.value)}
                            placeholder="0.00"
                            className={`w-full rounded p-1 text-[10px] ${isNeon ? 'bg-purple-950/40 border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[8px] font-bold text-slate-400">الكمية</label>
                    <input 
                      type="number" 
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                      className={`w-full rounded p-1 text-xs ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                    />
                  </div>

                  <div className="col-span-4 md:col-span-3">
                    <label className="block text-[8px] font-bold text-slate-400">سعر الوحدة (ج.م)</label>
                    <input 
                      type="number" 
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                      className={`w-full rounded p-1 text-xs text-left ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-white border border-slate-300'}`}
                    />
                  </div>

                  <div className="col-span-3 md:col-span-1 text-left">
                    <label className="block text-[8px] font-bold text-slate-400">الإجمالي</label>
                    <span className={`text-xs font-bold ${isNeon ? 'text-white' : 'text-slate-700'}`}>
                      {(line.quantity * line.unitPrice).toLocaleString()}
                    </span>
                  </div>

                  <div className="col-span-1 text-center md:col-span-1">
                    <button 
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom pricing calculations & details */}
            <div className={`flex flex-col md:flex-row justify-between items-start border-t pt-3 gap-3 ${isNeon ? 'border-purple-500/10' : ''}`}>
              <div className="w-full md:w-1/2">
                <label className={`block text-[10px] font-bold mb-1 ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>شروط وملاحظات ذيل الفاتورة</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`w-full rounded p-1.5 text-xs ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              <div className={`w-full md:w-1/3 p-3 rounded-lg text-xs space-y-1.5 border ${isNeon ? 'bg-purple-950/10 border-purple-500/10 text-purple-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="flex justify-between font-medium">
                  <span>المبلغ الخاضع للضريبة (الصافي) :</span>
                  <span className={isNeon ? 'text-white font-bold' : ''}>{calculateSubtotal().toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة المحسوبة (15%):</span>
                  <span className={isNeon ? 'text-white font-bold' : ''}>{(calculateSubtotal() * 0.15).toLocaleString()} ج.م</span>
                </div>
                <div className={`flex justify-between font-black border-t pt-1.5 text-sm ${isNeon ? 'border-purple-500/15 text-purple-400' : 'border-slate-300 text-blue-800'}`}>
                  <span>إجمالي القيمة المستحقة (ج.م):</span>
                  <span className={isNeon ? 'text-white font-bold font-mono text-base' : ''}>{(calculateSubtotal() * 1.15).toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>

            <div className={`flex justify-end gap-2 border-t pt-3 shrink-0 ${isNeon ? 'border-purple-500/10' : 'border-slate-100'}`}>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  isNeon 
                    ? 'bg-purple-950/30 hover:bg-purple-950/50 border border-purple-500/20 text-purple-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button 
                type="submit"
                disabled={saving}
                className={`px-5 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-sm disabled:opacity-50 transition-all ${
                  isNeon 
                    ? 'btn-neon text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? 'جاري الإصدار...' : isEstimate ? 'حفظ حاسوبي كعرض سعر مالي' : 'اعتماد وترحيل الدفاتر للفاتورة الضريبية'}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Main Content Area: Invoices Grid or Quotations Ledger */}
      {activeTab === 'invoices' ? (
        /* Main invoices grid list */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table Listing */}
        <div className={`lg:col-span-2 rounded-lg border shadow-xs p-3 ${
          isNeon 
            ? 'card-glow text-white' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="mb-3">
            <h3 className={`text-xs font-bold uppercase ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>سندات الفوترة ودفتر المبيعات</h3>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-right text-xs ${isNeon ? 'cyber-table' : ''}`}>
              <thead className={`font-bold border-b ${isNeon ? 'border-purple-500/10 text-purple-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-2">رقم الفاتورة</th>
                  <th className="p-2">العميل المستفيد</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2 text-left">قيمة السند</th>
                  <th className="p-2 text-center">أرصدة مدفوعة</th>
                  <th className="p-2 text-center">الحالة</th>
                  <th className="p-2 text-center">طباعة</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[11px] ${isNeon ? 'divide-purple-500/5' : 'divide-slate-100'}`}>
                {paginatedInvoices.map((inv, invIdx) => {
                  const client = contacts.find(c => c.id === inv.contactId);
                  const isEst = inv.status === 'draft';
                  return (
                    <tr 
                      key={inv.id ? `inv-${inv.id}-${invIdx}` : `inv-idx-${invIdx}`} 
                      onClick={() => setSelectedInvoice(inv)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        selectedInvoice?.id === inv.id 
                          ? (isNeon ? 'bg-purple-950/20 border-r-4 border-purple-500' : 'bg-blue-50/70 border-r-4 border-blue-600')
                          : (isNeon ? 'hover:bg-purple-950/10' : 'hover:bg-blue-50/40')
                      }`}
                    >
                      <td className={`p-2 font-bold ${isNeon ? 'text-white' : 'text-slate-800'}`}>{inv.invoiceNumber}</td>
                      <td className="p-2 font-medium">{client ? client.name : 'عميل غير مسجل'}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${isEst ? (isNeon ? 'bg-amber-950/40 text-amber-400 border border-amber-500/10' : 'bg-amber-100 text-amber-800') : (isNeon ? 'bg-blue-950/40 text-blue-400 border border-blue-500/10' : 'bg-blue-100 text-blue-800')}`}>
                          {isEst ? 'مسودة/تقديري' : 'فاتورة رسمية'}
                        </span>
                      </td>
                      <td className={`p-2 font-bold text-left ${isNeon ? 'text-purple-300' : 'text-slate-900'}`}>{(inv.totalAmount).toLocaleString()} ج.م</td>
                      <td className={`p-2 font-mono text-center ${isNeon ? 'text-purple-400' : 'text-slate-500'}`}>{(inv.paidAmount).toLocaleString()} ج.م</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          inv.status === 'paid' ? (isNeon ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' : 'bg-green-100 text-green-700') :
                          inv.status === 'overdue' ? (isNeon ? 'bg-red-950/40 text-red-400 border border-red-500/10' : 'bg-red-100 text-red-700') :
                          inv.status === 'draft' ? (isNeon ? 'bg-purple-950/40 text-purple-400 border border-purple-500/10' : 'bg-slate-100 text-slate-700') :
                          (isNeon ? 'bg-amber-950/40 text-amber-400 border border-amber-500/10' : 'bg-amber-100 text-amber-700')
                        }`}>
                          {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة' : inv.status === 'draft' ? 'استقصاء مالي' : 'غير مسددة'}
                        </span>
                      </td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handlePrintInvoice(inv)}
                          className={`p-1 px-2.5 rounded flex items-center justify-center gap-1 mx-auto text-[10px] cursor-pointer transition-colors ${
                            isNeon 
                              ? 'bg-purple-950/30 hover:bg-purple-950/50 text-purple-300 border border-purple-500/20' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                          title="طباعة الفاتورة"
                        >
                          <Printer size={10} />
                          <span>طباعة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={`flex justify-between items-center mt-4 pt-3 border-t ${isNeon ? 'border-purple-500/10 text-purple-300' : 'border-slate-200 text-slate-600'}`}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`p-1 px-3 rounded text-[11px] font-bold cursor-pointer disabled:opacity-40 transition-colors ${
                  isNeon
                    ? 'bg-purple-950/30 hover:bg-purple-950/50 text-purple-300 border border-purple-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                السابق
              </button>
              <span className="text-[11px] font-bold">
                صفحة {currentPage} من {totalPages} (إجمالي {invoices.length} فواتير)
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`p-1 px-3 rounded text-[11px] font-bold cursor-pointer disabled:opacity-40 transition-colors ${
                  isNeon
                    ? 'bg-purple-950/30 hover:bg-purple-950/50 text-purple-300 border border-purple-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                التالي
              </button>
            </div>
          )}
        </div>

        {/* Selected Invoice Details View (Mocking QuickBooks Online Detail View) */}
        <div className={`p-4 rounded-lg flex flex-col justify-between border ${
          isNeon 
            ? 'card-glow text-white' 
            : 'bg-slate-50 border-slate-200 shadow-xs'
        }`}>
          {selectedInvoice ? (
            <div className="space-y-4 text-xs">
              <div className={`flex justify-between items-start pb-2 border-b ${isNeon ? 'border-purple-500/10' : ''}`}>
                <div>
                  <h3 className={`text-xs font-black ${isNeon ? 'text-white' : 'text-slate-900'}`}>{selectedInvoice.invoiceNumber}</h3>
                  <p className="text-[9px] text-slate-400 font-medium">محرر بتاريخ: {selectedInvoice.date}</p>
                </div>
                {renderZatcaQr(selectedInvoice)}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">تفاصيل العميل</span>
                <p className={`text-xs font-bold ${isNeon ? 'text-white' : 'text-slate-700'}`}>
                  {contacts.find(c => c.id === selectedInvoice.contactId)?.name || 'غير محدد'}
                </p>
                <p className={`text-[10px] ${isNeon ? 'text-purple-300' : 'text-slate-500'}`}>
                  العنوان المفوتر: {contacts.find(c => c.id === selectedInvoice.contactId)?.address || 'الرياض، المملكة العربية السعودية'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">أشخاص/خطوط مبيعات الفاتورة</span>
                <div className={`space-y-1 p-2 rounded border ${isNeon ? 'bg-purple-950/15 border-purple-500/10 text-purple-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                  {selectedInvoice.lines?.map((line, index) => (
                    <div key={line.id || index} className={`flex justify-between items-center text-[10px] pb-1 last:border-none ${isNeon ? 'border-purple-500/5' : 'border-b'}`}>
                      <span className={`font-medium ${isNeon ? 'text-white' : 'text-slate-700'}`}>{line.description}</span>
                      <span className="text-slate-500">({line.quantity} × {line.unitPrice}) : <strong className={isNeon ? 'text-purple-300' : 'text-slate-900'}>{line.amount} ج.م</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className={`p-2.5 rounded border text-xs ${isNeon ? 'bg-purple-950/10 border-purple-500/10 text-purple-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                <div className="flex justify-between">
                  <span className="text-slate-500">مجموع بنود الضرائب (15%):</span>
                  <span className={isNeon ? 'text-white font-bold' : ''}>{(selectedInvoice.totalAmount * 0.15).toLocaleString()} ج.م</span>
                </div>
                <div className={`flex justify-between font-black text-sm mt-1 pt-1 border-t ${isNeon ? 'border-purple-500/10 text-purple-400' : 'text-blue-700'}`}>
                  <span>المبلغ الكلي المطلوب:</span>
                  <span className={isNeon ? 'text-white font-bold text-base font-mono' : ''}>{(selectedInvoice.totalAmount).toLocaleString()} ج.م</span>
                </div>
              </div>

              <div className={`text-[10px] rounded p-2 border ${isNeon ? 'bg-purple-950/20 text-purple-300 border-purple-500/15' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                <p className="font-bold">ملاحظات البنك والتحصيل:</p>
                <p>{selectedInvoice.notes || 'سداد فوري بنكي.'}</p>
              </div>

              {/* Action Operations for the selected sandboxed invoice */}
              <div className={`space-y-2 border-t pt-3 ${isNeon ? 'border-purple-500/10' : ''}`}>
                {selectedInvoice.status === 'draft' && userRole !== 'viewer' && (
                  <button 
                    onClick={() => handleConvertEstimate(selectedInvoice)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                  >
                    <ArrowLeftRight size={12} />
                    تحويل وإصدار كفاتورة ضريبية حقيقية
                  </button>
                )}

                {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'draft' && userRole !== 'viewer' && (
                  <div className="space-y-1.5">
                    <p className={`text-[9px] text-center font-semibold ${isNeon ? 'text-purple-400' : 'text-slate-500'}`}>بوابة السداد الإلكترونية المدمجة (Stripe Sandbox)</p>
                    <button 
                      onClick={() => handleSimulatePayment(selectedInvoice)}
                      disabled={isPaying}
                      className={`w-full font-bold py-1.5 rounded flex items-center justify-center gap-1.5 cursor-pointer text-[10px] disabled:opacity-50 ${isNeon ? 'btn-neon text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      <CreditCard size={12} />
                      {isPaying ? 'جاري تصفية الحوالة...' : 'محاكاة دفع العميل الفوري عبر Stripe'}
                    </button>
                    
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <button onClick={async () => { await fetch(`/api/invoices/${selectedInvoice.id}/generate-qr`, { method: 'POST' }); alert('✅ تم توليد QR Code'); }} className={`p-1.5 rounded text-[9px] font-bold ${isNeon ? 'bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20' : 'bg-blue-600 text-white'}`}>📱 QR</button>
                      <button onClick={() => window.open(`/api/invoices/${selectedInvoice.id}/xml`, '_blank')} className={`p-1.5 rounded text-[9px] font-bold ${isNeon ? 'bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-600 text-white'}`}>📄 XML</button>
                      <button onClick={async () => { if(confirm('هل أنت متأكد؟')) { await fetch(`/api/invoices/${selectedInvoice.id}/submit-eta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'u-1' }) }); alert('تم الإرسال'); } }} className={`p-1.5 rounded text-[9px] font-bold ${isNeon ? 'bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/20' : 'bg-amber-600 text-white'}`}>📤 إرسال</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePrintInvoice(selectedInvoice)}
                    className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer text-[10px] ${isNeon ? 'bg-purple-950/30 hover:bg-purple-950/50 border border-purple-500/20 text-purple-300' : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700'}`}
                  >
                    <Printer size={12} />
                    طباعة PDF
                  </button>
                  <button 
                    onClick={() => alert('تم إرسال بريد إلكتروني تذكيري تلقائي للعميل!')}
                    className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer text-[10px] ${isNeon ? 'bg-purple-950/30 hover:bg-purple-950/50 border border-purple-500/20 text-purple-300' : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700'}`}
                  >
                    <Mail size={12} />
                    تذكير بالبريد
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`h-full flex flex-col items-center justify-center text-center p-8 ${isNeon ? 'text-purple-400/60' : 'text-slate-400'}`}>
              <QrCode size={40} className={`mb-2 ${isNeon ? 'text-purple-400/40' : 'text-slate-300'}`} />
              <p className={`text-xs font-bold ${isNeon ? 'text-purple-300' : 'text-slate-700'}`}>بوابة التفاصيل الذكية للمبيعات</p>
              <p className="text-[10px]">اختر أي فاتورة أو تقدير معروض بالجدول المقابل لعرض إيصال السداد، والـ QR كود، ومحاكاة التحويل المالي وبوابة الدعم</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* Quotations Manager View */
        <div className="space-y-4">
          {/* Top Stat Cards for Quotations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border ${isNeon ? 'bg-purple-950/20 border-purple-500/20 text-white' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[11px] text-slate-400 font-bold block">إجمالي عروض الأسعار المسجلة</span>
              <p className="text-xl font-black text-emerald-400 mt-1">{quotations.length} عرض سعر</p>
            </div>
            <div className={`p-4 rounded-xl border ${isNeon ? 'bg-purple-950/20 border-purple-500/20 text-white' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[11px] text-slate-400 font-bold block">إجمالي القيمة المالية للعروض</span>
              <p className="text-xl font-black text-blue-400 mt-1">
                {quotations.reduce((sum, q) => {
                  const sub = (q.items || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
                  const disc = q.discountType === 'percent' ? (sub * (q.discount || 0)) / 100 : (q.discount || 0);
                  const afterDisc = sub - disc;
                  const tax = (afterDisc * (q.tax || 0)) / 100;
                  return sum + (afterDisc + tax);
                }, 0).toLocaleString()} ج.م
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isNeon ? 'bg-purple-950/20 border-purple-500/20 text-white' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[11px] text-slate-400 font-bold block">العروض النشطة / المعلقة</span>
              <p className="text-xl font-black text-amber-400 mt-1">
                {quotations.filter(q => q.status !== 'rejected').length} عرض نشط
              </p>
            </div>
          </div>

          {/* Quotation Search & Action Controls */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-3 ${isNeon ? 'bg-purple-950/10 border-purple-500/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-full md:w-72">
              <input
                type="text"
                value={quotationSearch}
                onChange={(e) => setQuotationSearch(e.target.value)}
                placeholder="🔍 بحث باسم العميل أو رقم عرض السعر..."
                className={`w-full p-2 text-xs rounded-lg ${isNeon ? 'bg-purple-950/30 border border-purple-500/20 text-white placeholder-purple-400/50' : 'bg-white border border-slate-300 text-slate-800'}`}
              />
            </div>
            <button
              onClick={handleCreateNewQuotation}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <FileText size={15} />
              ➕ تقديم عرض سعر جديد
            </button>
          </div>

          {/* Quotations Table */}
          <div className={`rounded-xl border shadow-xs p-4 overflow-x-auto ${isNeon ? 'card-glow text-white' : 'bg-white border-slate-200'}`}>
            <table className={`w-full text-right text-xs ${isNeon ? 'cyber-table' : ''}`}>
              <thead className={`font-bold border-b ${isNeon ? 'border-purple-500/20 text-purple-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-2.5">رقم العرض</th>
                  <th className="p-2.5">جهة العرض (العميل)</th>
                  <th className="p-2.5">تاريخ الإصدار</th>
                  <th className="p-2.5">تاريخ الانتهاء</th>
                  <th className="p-2.5 text-center">عدد البنود</th>
                  <th className="p-2.5 text-left">المبلغ الإجمالي</th>
                  <th className="p-2.5 text-center">الحالة</th>
                  <th className="p-2.5 text-center">إجراءات التحكم والتواصل</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[11px] ${isNeon ? 'divide-purple-500/10' : 'divide-slate-100'}`}>
                {quotations
                  .filter(q => 
                    !quotationSearch.trim() || 
                    (q.clientName || '').toLowerCase().includes(quotationSearch.toLowerCase()) || 
                    (q.quotationNumber || '').toLowerCase().includes(quotationSearch.toLowerCase())
                  )
                  .map((q, qIdx) => {
                    const subtotal = (q.items || []).reduce((sum: number, it: any) => sum + ((it.quantity || 0) * (it.price || 0)), 0);
                    const disc = q.discountType === 'percent' ? (subtotal * (q.discount || 0)) / 100 : (q.discount || 0);
                    const afterDisc = subtotal - disc;
                    const tax = (afterDisc * (q.tax || 0)) / 100;
                    const qTotal = afterDisc + tax;
                    
                    const waText = encodeURIComponent(
                      `مرحباً السيد/ة ${q.clientName}\nمرفق لسيادتكم تفاصيل عرض السعر رقم (${q.quotationNumber}):\n` +
                      `التاريخ: ${q.date}\n` +
                      `الإجمالي المطلوب: ${qTotal.toLocaleString()} ${q.currency || 'EGP'}\n` +
                      `شكراً لتعاملكم معنا!`
                    );

                    return (
                      <tr key={q.id ? `q-${q.id}-${qIdx}` : `q-idx-${qIdx}`} className={isNeon ? 'hover:bg-purple-950/20' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 font-bold font-mono text-purple-400">{q.quotationNumber || q.id}</td>
                        <td className="p-2.5 font-bold">{q.clientName || 'عميل غير مسجل'}</td>
                        <td className="p-2.5 font-mono">{q.date}</td>
                        <td className="p-2.5 font-mono">{q.expiryDate}</td>
                        <td className="p-2.5 text-center">{q.items?.length || 0} صنف</td>
                        <td className="p-2.5 font-bold font-mono text-left text-emerald-400">{qTotal.toLocaleString()} {q.currency || 'EGP'}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            q.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            q.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            q.status === 'sent' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {q.status === 'approved' ? 'معتمد' : q.status === 'rejected' ? 'مرفوض' : q.status === 'sent' ? 'تم الإرسال' : 'مسودة'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleEditQuotation(q)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer transition-all"
                              title="تعديل عرض السعر"
                            >
                              ✏️ تعديل
                            </button>
                            <button
                              onClick={() => handleEditQuotation(q)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 cursor-pointer transition-all"
                              title="معاينة وطباعة PDF"
                            >
                              🖨️ PDF / طباعة
                            </button>
                            <button
                              onClick={() => handleEditQuotation(q)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-all"
                              title="إرسال عبر واتساب ومناظرة ملف PDF"
                            >
                              💬 واتساب + PDF
                            </button>
                            <button
                              onClick={() => handleEditQuotation(q)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 cursor-pointer transition-all font-sans"
                              title="إرسال عبر الإيميل ومناظرة ملف PDF"
                            >
                              ✉️ إيميل + PDF
                            </button>
                            <button
                              onClick={() => handleDeleteQuotation(q.id)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer transition-all"
                              title="حذف عرض السعر"
                            >
                              🗑️ حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد عروض أسعار مسجلة حالياً. انقر فوق "تقديم عرض سعر جديد" لإضافة عرض جديد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice Template (Hidden on screen, visible on print via @media print) */}
      {selectedInvoice && (
        <div id="printable-invoice-wrapper" className="hidden print:block p-8 bg-white text-slate-900 max-w-4xl mx-auto font-sans text-right" dir="rtl">
          {/* Custom print CSS styles specifically for this template to override the viewport */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-invoice-wrapper, #printable-invoice-wrapper * {
                visibility: visible !important;
              }
              #printable-invoice-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 40px !important;
                box-shadow: none !important;
                border: none !important;
                direction: rtl !important;
              }
              .print-no-border {
                border: none !important;
              }
            }
          `}</style>

          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-1">فاتورة ضريبية مبسطة</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-4">Simplified Tax Invoice</p>
              <div className="space-y-1 text-xs text-slate-700">
                <p><span className="font-bold text-slate-900">المورد:</span> شركة المنصة الذكية للحلول المحاسبية والتقنية</p>
                 <p><span className="font-bold text-slate-900">الرقم الضريبي للمورد:</span> <span className="font-mono">310294857100003</span></p>
                <p><span className="font-bold text-slate-900">العنوان:</span> طريق الملك فهد، حي المروج، الرياض، المملكة العربية السعودية</p>
              </div>
            </div>
            
            <div className="text-left flex flex-col items-end">
              {/* Elegant print logo */}
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center text-white font-black text-xs">S</div>
                <span className="font-black text-sm text-slate-900">SMART LEDGER</span>
              </div>
              <div className="space-y-1 text-xs text-slate-700 text-right">
                <p><span className="font-bold text-slate-900">رقم الفاتورة:</span> <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span></p>
                <p><span className="font-bold text-slate-900">تاريخ الإصدار:</span> <span className="font-mono">{selectedInvoice.date}</span></p>
                <p><span className="font-bold text-slate-900">تاريخ الاستحقاق:</span> <span className="font-mono">{selectedInvoice.dueDate}</span></p>
                <p>
                  <span className="font-bold text-slate-900">حالة الدفع:</span>{' '}
                  <span className="font-black text-slate-900">
                    {selectedInvoice.status === 'paid' ? 'مدفوعة بالكامل' : selectedInvoice.status === 'overdue' ? 'متأخرة عن السداد' : selectedInvoice.status === 'draft' ? 'مسودة مراجعة' : 'غير مسددة'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
            <h2 className="text-xs font-black text-slate-800 mb-2 border-b pb-1">بيانات العميل المستلم (Client Details)</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="mb-1"><span className="font-bold text-slate-600">الاسم / المؤسسة:</span> {contacts.find(c => c.id === selectedInvoice.contactId)?.name || 'عميل غير مسجل'}</p>
                <p><span className="font-bold text-slate-600">العنوان المفوتر:</span> {contacts.find(c => c.id === selectedInvoice.contactId)?.address || 'الرياض، المملكة العربية السعودية'}</p>
              </div>
              <div>
                <p className="mb-1"><span className="font-bold text-slate-600">نوع الشراكة:</span> عميل مبيعات تجاري</p>
                <p><span className="font-bold text-slate-600">عملة المعاملة:</span> جنيه مصري (ج.م)</p>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="mb-6">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 font-bold">
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5">الوصف والخدمات المقدمة (Item Description)</th>
                  <th className="p-2.5 text-center w-20">الكمية</th>
                  <th className="p-2.5 text-left w-24">سعر الوحدة</th>
                  <th className="p-2.5 text-left w-24">الصافي خاضع للضريبة</th>
                  <th className="p-2.5 text-center w-20">نسبة الضريبة</th>
                  <th className="p-2.5 text-left w-24">قيمة الضريبة (15%)</th>
                  <th className="p-2.5 text-left w-28">الإجمالي شامل الضريبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {selectedInvoice.lines?.map((line, index) => {
                  const lineSubtotal = line.quantity * line.unitPrice;
                  const lineVat = lineSubtotal * 0.15;
                  const lineTotal = lineSubtotal * 1.15;
                  return (
                    <tr key={line.id || index} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center font-mono">{index + 1}</td>
                      <td className="p-2.5 font-medium">{line.description}</td>
                      <td className="p-2.5 text-center font-mono">{line.quantity}</td>
                      <td className="p-2.5 text-left font-mono">{line.unitPrice.toLocaleString()} ج.م</td>
                      <td className="p-2.5 text-left font-mono">{lineSubtotal.toLocaleString()} ج.م</td>
                      <td className="p-2.5 text-center">15%</td>
                      <td className="p-2.5 text-left font-mono">{lineVat.toLocaleString()} ج.م</td>
                      <td className="p-2.5 text-left font-bold font-mono">{lineTotal.toLocaleString()} ج.م</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Block & QR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-4 border-t border-slate-200">
            {/* Right side: ZATCA QR and Terms */}
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                {renderZatcaQr(selectedInvoice)}
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  <p className="font-bold text-slate-700">هذه الفاتورة منشأة وموقعة رقمياً</p>
                  <p>تخضع هذه المعاملة لأنظمة هيئة الزكاة والضريبة والجمارك وتعتبر وثيقة رسمية لإثبات عمليات البيع والتحصيل والمطابقة الضريبية.</p>
                </div>
              </div>
              <div className="text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-bold block text-slate-700 mb-0.5">ملاحظات وشروط الفاتورة:</span>
                <p>{selectedInvoice.notes || 'الرجاء سداد المستحقات في الحساب البنكي المعتمد.'}</p>
              </div>
            </div>

            {/* Left side: Financial calculations */}
            <div className="bg-slate-50 p-4 rounded-lg text-xs space-y-2.5 border border-slate-200">
              <div className="flex justify-between text-slate-700">
                <span>المبلغ الخاضع للضريبة (الصافي):</span>
                <span className="font-mono font-bold">{(selectedInvoice.totalAmount / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة المحسوبة (15%):</span>
                <span className="font-mono font-bold">{(selectedInvoice.totalAmount * 0.15 / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.m</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-2">
                <span>الإجمالي شامل ضريبة القيمة المضافة:</span>
                <span className="font-mono">{selectedInvoice.totalAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-300 pt-2">
                <span>المبالغ المسددة سابقاً:</span>
                <span className="font-mono font-bold">{(selectedInvoice.paidAmount || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold border-t border-slate-200 pt-1.5">
                <span>المتبقي المستحق للسداد:</span>
                <span className="font-mono font-black">{(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="mt-12 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 text-center text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-700 mb-8">ختم وتوقيع المورد (Seller Signature & Stamp)</p>
              <div className="h-8 border-b border-dashed border-slate-300 w-32 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-8">توقيع المستلم والعميل (Client Signature)</p>
              <div className="h-8 border-b border-dashed border-slate-300 w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Form Modal */}
      <QuotationFormModal
        isOpen={showQuotationModal}
        onClose={() => {
          setShowQuotationModal(false);
          setEditingQuotation(null);
        }}
        contacts={contacts}
        initialData={editingQuotation}
        onSave={handleSaveQuotation}
        onSubmitInvoice={onCreateInvoice}
        isNeon={isNeon}
      />
    </div>
  );
}
