import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash, FileText, Printer, Send, Save, Check, Download, MessageSquare, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Contact } from '../types';

export interface QuotationItem {
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface QuotationData {
  id?: string;
  quotationNumber?: string;
  clientName: string;
  contactId?: string;
  date: string;
  expiryDate: string;
  currency: string;
  notesTop: string;
  notesBottom: string;
  items: QuotationItem[];
  discount: number;
  discountType: 'percent' | 'fixed';
  tax: number;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
}

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: Contact[];
  initialData?: QuotationData | null;
  onSave?: (quotation: QuotationData) => void | Promise<void>;
  onSaveDraft?: (quotation: QuotationData) => void | Promise<void>;
  onSendQuotation?: (quotation: QuotationData) => void | Promise<void>;
  onSubmitInvoice?: (invoiceData: any) => void | Promise<void>;
  isNeon?: boolean;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  contacts = [],
  initialData,
  onSave,
  onSaveDraft,
  onSendQuotation,
  onSubmitInvoice,
  isNeon = true
}) => {
  const [quotation, setQuotation] = useState<QuotationData>({
    id: `QT-${Date.now()}`,
    quotationNumber: `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    clientName: '',
    contactId: '',
    date: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
    currency: 'EGP',
    notesTop: '',
    notesBottom: 'شروط الدفع: الدفع خلال 15 يوماً من تاريخ اعتماد عرض السعر. الأسعار شاملة النقل والتوريد.',
    items: [
      { materialName: '', quantity: 1, unit: 'طن', price: 0 }
    ],
    discount: 0,
    discountType: 'percent',
    tax: 14,
    status: 'draft'
  });

  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Company settings state for Operating Company (شركة تشغيل التطبيق)
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('operating_company_name') || 'مؤسسة المنصة الرقمية للتجارة والخردة';
  });
  const [companyTaxId, setCompanyTaxId] = useState<string>(() => {
    return localStorage.getItem('operating_company_tax_id') || '310294857100003';
  });
  const [companyAddress, setCompanyAddress] = useState<string>(() => {
    const saved = localStorage.getItem('operating_company_address');
    if (saved === 'المملكة العربية السعودية / جمهورية مصر العربية') return '';
    return saved || '';
  });

  const [inventoryProducts, setInventoryProducts] = useState<Array<{ id: string; name: string; unitPrice?: number; unit?: string }>>([]);

  // Fetch inventory products on mount
  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || data?.products || []);
        if (Array.isArray(list) && list.length > 0) {
          setInventoryProducts(list.map((p: any) => ({
            id: p.id || p.sku || p.name,
            name: p.name || p.title || '',
            unitPrice: Number(p.unitPrice || p.price || 0),
            unit: p.unit || 'طن'
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch initial company settings from backend on component mount
  useEffect(() => {
    fetch('/api/company-settings')
      .then(r => r.json())
      .then(data => {
        if (data && data.company_name) {
          setCompanyName(data.company_name);
          localStorage.setItem('operating_company_name', data.company_name);
        }
        if (data && data.tax_id) {
          setCompanyTaxId(data.tax_id);
          localStorage.setItem('operating_company_tax_id', data.tax_id);
        }
        if (data && data.company_address !== undefined) {
          const addr = data.company_address === 'المملكة العربية السعودية / جمهورية مصر العربية' ? '' : data.company_address;
          setCompanyAddress(addr);
          localStorage.setItem('operating_company_address', addr);
        }
      })
      .catch(() => {});
  }, []);

  // Update company setting helper
  const handleUpdateCompanySetting = (field: 'company_name' | 'tax_id' | 'company_address', value: string) => {
    if (field === 'company_name') {
      setCompanyName(value);
      localStorage.setItem('operating_company_name', value);
    } else if (field === 'tax_id') {
      setCompanyTaxId(value);
      localStorage.setItem('operating_company_tax_id', value);
    } else if (field === 'company_address') {
      setCompanyAddress(value);
      localStorage.setItem('operating_company_address', value);
    }

    fetch('/api/company-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    }).catch(() => {});
  };

  // Populate initial data when editing an existing quote
  useEffect(() => {
    if (initialData) {
      setQuotation({
        ...initialData,
        items: initialData.items && initialData.items.length > 0 ? initialData.items : [{ materialName: '', quantity: 1, unit: 'طن', price: 0 }]
      });
    } else {
      setQuotation({
        id: `QT-${Date.now()}`,
        quotationNumber: `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: '',
        contactId: '',
        date: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
        currency: 'EGP',
        notesTop: '',
        notesBottom: 'شروط الدفع: الدفع خلال 15 يوماً من تاريخ اعتماد عرض السعر. الأسعار شاملة النقل والتورID.',
        items: [
          { materialName: '', quantity: 1, unit: 'طن', price: 0 }
        ],
        discount: 0,
        discountType: 'percent',
        tax: 14,
        status: 'draft'
      });
    }
  }, [initialData, isOpen]);

  // Calculations
  const subtotal = useMemo(() => {
    return (quotation.items || []).reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.price || 0)), 0);
  }, [quotation.items]);

  const discountAmount = useMemo(() => {
    if (!quotation.discount) return 0;
    if (quotation.discountType === 'percent') {
      return (subtotal * quotation.discount) / 100;
    }
    return quotation.discount;
  }, [subtotal, quotation.discount, quotation.discountType]);

  const afterDiscount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const taxAmount = useMemo(() => {
    if (!quotation.tax) return 0;
    return (afterDiscount * quotation.tax) / 100;
  }, [afterDiscount, quotation.tax]);

  const total = useMemo(() => {
    return afterDiscount + taxAmount;
  }, [afterDiscount, taxAmount]);

  if (!isOpen) return null;

  // Handlers for Items
  const handleAddItem = () => {
    setQuotation(prev => ({
      ...prev,
      items: [...(prev.items || []), { materialName: '', quantity: 1, unit: 'طن', price: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if ((quotation.items || []).length > 1) {
      setQuotation(prev => ({
        ...prev,
        items: (prev.items || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...(quotation.items || [])];
    updated[index] = {
      ...updated[index],
      [field]: field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value
    };
    setQuotation(prev => ({ ...prev, items: updated }));
  };

  // Handle Client Selection from Existing Contacts
  const handleSelectContact = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setQuotation(prev => ({ ...prev, contactId: '', clientName: '' }));
      return;
    }
    const found = (contacts || []).find(c => c.id === val);
    if (found) {
      setQuotation(prev => ({ ...prev, contactId: found.id, clientName: found.name }));
    }
  };

  // Currency symbols mapping
  const currencySymbol = quotation.currency === 'EGP' ? 'ج.م' : quotation.currency === 'SAR' ? 'ر.س' : quotation.currency === 'USD' ? '$' : quotation.currency;

  // Save Quotation (Local & Callback)
  const saveCurrentQuotation = async (status: 'draft' | 'sent') => {
    const updated = { ...quotation, status };
    if (onSave) {
      try {
        await onSave(updated);
      } catch (e) {
        console.error("Failed onSave:", e);
      }
    }
    if (onSaveDraft && status === 'draft') {
      try {
        await onSaveDraft(updated);
      } catch (e) {
        console.error("Failed onSaveDraft:", e);
      }
    }
    if (onSendQuotation && status === 'sent') {
      try {
        await onSendQuotation(updated);
      } catch (e) {
        console.error("Failed onSendQuotation:", e);
      }
    }
    if (onSubmitInvoice) {
      // Also sync to main invoice ledger if desired
      try {
        await onSubmitInvoice({
          id: updated.id,
          contactId: updated.contactId || '',
          clientName: updated.clientName || '',
          date: updated.date,
          dueDate: updated.expiryDate,
          isEstimate: true,
          currency: updated.currency,
          notes: updated.notesBottom,
          notesTop: updated.notesTop,
          items: (updated.items || []).map(it => ({
            description: `${it.materialName || ''} (${it.unit || ''})`,
            quantity: it.quantity || 0,
            unitPrice: it.price || 0
          })),
          totalAmount: total
        });
      } catch (err) {
        console.warn('Optional invoice sync warning:', err);
      }
    }
    return updated;
  };

  // Actions
  const handleSaveAsDraft = async () => {
    await saveCurrentQuotation('draft');
    setShowSuccessToast('تم حفظ عرض السعر بنجاح!');
    setTimeout(() => {
      setShowSuccessToast('');
      onClose();
    }, 1200);
  };

  // Direct PDF Download to PC
  const downloadPDFFile = async () => {
    setIsGeneratingPdf(true);
    setIsPrintPreview(true);
    setShowSuccessToast('⏳ جاري إنشاء وتحميل ملف PDF على جهازك...');

    setTimeout(async () => {
      try {
        const element = document.getElementById('quotation-printable-document');
        if (!element) {
          window.print();
          setIsGeneratingPdf(false);
          return;
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const fileName = `عرض_سعر_${quotation.quotationNumber || 'جديد'}.pdf`;
        pdf.save(fileName);

        setShowSuccessToast(`✅ تم تنزيل الملف بنجاح: ${fileName}`);
      } catch (err) {
        console.error('PDF Generation Error:', err);
        setShowSuccessToast('⚠️ جاري فتح نافذة طباعة/حفظ PDF بالمتصفح...');
        try {
          window.print();
        } catch (e) {}
      } finally {
        setIsGeneratingPdf(false);
        setTimeout(() => setShowSuccessToast(''), 4000);
      }
    }, 450);
  };

  // Export PDF direct download to PC
  const handleExportPDF = () => {
    downloadPDFFile();
  };

  const handleSendWhatsApp = async () => {
    if (!quotation.clientName.trim()) {
      alert('يرجى كتابة اسم العميل أولاً');
      return;
    }
    await saveCurrentQuotation('sent');
    
    // Automatically trigger PDF file download to PC
    await downloadPDFFile();

    // Find client phone if available
    const contactObj = (contacts || []).find(c => c.id === quotation.contactId || c.name === quotation.clientName);
    const phone = contactObj?.phone ? contactObj.phone.replace(/[^0-9]/g, '') : '';

    const itemsSummary = (quotation.items || [])
      .map((it, idx) => `${idx + 1}. ${it.materialName || ''} - ${it.quantity || 0} ${it.unit || ''} بسعر ${it.price || 0} ${currencySymbol} = ${((it.quantity || 0) * (it.price || 0)).toFixed(2)} ${currencySymbol}`)
      .join('\n');

    const msg = `*📄 عرض سعر رسمي رقم ${quotation.quotationNumber || 'جديد'}*\n` +
      `*الشركة المُصدرة:* ${companyName || ''}\n` +
      `*العميل:* ${quotation.clientName || ''}\n` +
      `*التاريخ:* ${quotation.date || ''}\n` +
      `*المبلغ الإجمالي النهائي:* *${(total || 0).toFixed(2)} ${currencySymbol}*\n\n` +
      `📌 *ملاحظة هامة:* تم تنزيل ملف PDF الخاص بعرض السعر تلقائياً على جهازك الآن، برجاء إرفاق الملف من مجلد التنزيلات (Downloads) لإكمال الإرسال.\n\n` +
      `شكراً لتعاملكم معنا.`;

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = async () => {
    if (!quotation.clientName.trim()) {
      alert('يرجى كتابة اسم العميل أولاً');
      return;
    }

    const contactObj = (contacts || []).find(c => c.id === quotation.contactId || c.name === quotation.clientName);
    const initialEmail = contactObj?.email || '';
    const targetEmail = prompt('تأكيد أو كتابة بريد الإلكتروني للمستقبل:', initialEmail);

    if (!targetEmail) return;

    await saveCurrentQuotation('sent');
    setShowSuccessToast('⏳ جاري توليد ملف PDF وإرسال البريد الإلكتروني مع المرفق...');

    try {
      const res = await fetch('/api/quotations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotation: {
            ...quotation,
            companyName,
            total
          },
          recipientEmail: targetEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowSuccessToast('✅ تم إرسال عرض السعر كملف PDF مرفق حقيقي عبر البريد بنجاح!');
      } else {
        alert('❌ ' + (data.error || 'فشل إرسال البريد الإلكتروني'));
      }
    } catch (err: any) {
      console.error('Email error:', err);
      alert('❌ حدث خطأ أثناء الاتصال بسيرفر البريد الإلكتروني');
    } finally {
      setTimeout(() => setShowSuccessToast(''), 4000);
    }
  };

  const handlePrint = () => {
    setIsPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      {/* Toast Alert */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          {showSuccessToast}
        </div>
      )}

      {/* Main Container */}
      <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl transition-all dir-rtl my-auto ${
        isNeon
          ? 'bg-[#12121A] border-[#252538] text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isNeon ? 'border-[#252538] bg-[#171725]' : 'border-slate-200 bg-slate-50'
        } rounded-t-2xl`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-400">
                {initialData ? `✏️ تعديل عرض سعر (${quotation.quotationNumber})` : '📄 تقديم عرض سعر جديد'}
              </h2>
              <p className={`text-[11px] ${isNeon ? 'text-slate-400' : 'text-slate-500'}`}>
                إعداد وتصميم عرض سعر مالي احترافي للتسليم والتصدير الفوري
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* ====== 🏢 اسم شركة تشغيل التطبيق (الشركة المُصدرة للعرض) ====== */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            isNeon ? 'bg-blue-950/20 border-blue-500/30 text-white' : 'bg-blue-50/80 border-blue-200 text-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mb-2">
              <label className={`text-xs font-black flex items-center gap-1.5 ${isNeon ? 'text-blue-300' : 'text-blue-900'}`}>
                <span>🏢 اسم شركة تشغيل التطبيق (الشركة المُصدرة للعرض):</span>
              </label>
              <span className="text-[10px] text-blue-400 font-medium">
                (سيظهر هذا الاسم أعلى كافة عروض الأسعار وطباعة الـ PDF)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <input
                  type="text"
                  value={companyName}
                  onChange={e => handleUpdateCompanySetting('company_name', e.target.value)}
                  placeholder="أدخل اسم شركتك / مؤسستك هنا..."
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border outline-none transition-all ${
                    isNeon
                      ? 'bg-[#14141F] border-[#2E2E44] text-white focus:border-blue-500 placeholder:text-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 placeholder:text-slate-400'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={companyTaxId}
                  onChange={e => handleUpdateCompanySetting('tax_id', e.target.value)}
                  placeholder="الرقم الضريبي (اختياري)"
                  className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none transition-all ${
                    isNeon
                      ? 'bg-[#14141F] border-[#2E2E44] text-white focus:border-blue-500 placeholder:text-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ====== بيانات العميل ====== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={`block text-xs font-semibold ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                العميل / جهة البيع
              </label>
              <div className="space-y-1">
                {(contacts || []).length > 0 && (
                  <select
                    value={quotation.contactId || ''}
                    onChange={handleSelectContact}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none ${
                      isNeon ? 'bg-[#181824] border-[#2E2E44] text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">-- اختر من سجل العملاء --</option>
                    {(contacts || []).map((c, idx) => (
                      <option key={c.id ? `contact-${c.id}-${idx}` : `contact-idx-${idx}`} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={quotation.clientName}
                  onChange={e => setQuotation({ ...quotation, clientName: e.target.value })}
                  placeholder="أدخل اسم العميل..."
                  className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none ${
                    isNeon ? 'bg-[#181824] border-[#2E2E44] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`block text-xs font-semibold ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                التاريخ
              </label>
              <input
                type="date"
                value={quotation.date}
                onChange={e => setQuotation({ ...quotation, date: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${
                  isNeon ? 'bg-[#181824] border-[#2E2E44] text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`block text-xs font-semibold ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                تاريخ الانتهاء
              </label>
              <input
                type="date"
                value={quotation.expiryDate}
                onChange={e => setQuotation({ ...quotation, expiryDate: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${
                  isNeon ? 'bg-[#181824] border-[#2E2E44] text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`block text-xs font-semibold ${isNeon ? 'text-slate-300' : 'text-slate-600'}`}>
                العملة
              </label>
              <select
                value={quotation.currency}
                onChange={e => setQuotation({ ...quotation, currency: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${
                  isNeon ? 'bg-[#181824] border-[#2E2E44] text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
          </div>

          {/* ====== 📝 مساحة الكتابة الحرة (فوق الجدول - اختياري) ====== */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center gap-2">
              <label className={`text-xs font-bold flex items-center gap-1 ${isNeon ? 'text-blue-300' : 'text-blue-700'}`}>
                <span>📝 ملاحظات عامة (فوق الجدول - اختياري)</span>
              </label>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isNeon ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-500'
              }`}>
                اختياري
              </span>
            </div>
            <textarea
              rows={2}
              value={quotation.notesTop}
              onChange={e => setQuotation({ ...quotation, notesTop: e.target.value })}
              placeholder="أكتب أي ملاحظات عامة هنا (مثال: يشمل العرض توريد وتركيب المواد والخدمات الموضحة أدناه...)"
              className={`w-full p-2.5 rounded-xl text-xs border outline-none transition-all ${
                isNeon
                  ? 'bg-[#14141F] border-[#252538] text-white focus:border-blue-500 placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* ====== الأصناف ====== */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <span>🧾 الأصناف والخدمات المطلوبة</span>
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className={isNeon ? 'bg-[#181827] text-slate-300 border-b border-[#2A2A3E]' : 'bg-slate-100 text-slate-700 border-b border-slate-200'}>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">المادة / الصنف</th>
                    <th className="p-2.5 w-28">الكمية</th>
                    <th className="p-2.5 w-28">الوحدة</th>
                    <th className="p-2.5 w-32">السعر ({currencySymbol})</th>
                    <th className="p-2.5 w-32">الإجمالي</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {quotation.items.map((item, index) => {
                    const isCustomProduct = !inventoryProducts.some(p => p.name === item.materialName);
                    return (
                      <tr key={`quote-item-${index}`} className={isNeon ? 'hover:bg-[#1A1A2A]' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 text-center font-bold text-slate-500">{index + 1}</td>
                        <td className="p-2 space-y-1">
                          <select
                            value={isCustomProduct ? '__OTHER__' : item.materialName}
                            onChange={e => {
                              const selectedVal = e.target.value;
                              if (selectedVal === '__OTHER__') {
                                handleItemChange(index, 'materialName', '');
                              } else {
                                const matched = inventoryProducts.find(p => p.name === selectedVal);
                                const updated = [...(quotation.items || [])];
                                updated[index] = {
                                  ...updated[index],
                                  materialName: selectedVal,
                                  price: matched?.unitPrice ?? updated[index].price,
                                  unit: matched?.unit ?? updated[index].unit
                                };
                                setQuotation(prev => ({ ...prev, items: updated }));
                              }
                            }}
                            className={`w-full px-2 py-1.5 rounded text-xs border outline-none ${
                              isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="">-- اختر صنفاً من المخزون --</option>
                            {inventoryProducts.map(prod => (
                              <option key={prod.id} value={prod.name}>
                                {prod.name} ({prod.unitPrice ? prod.unitPrice + ' ' + currencySymbol : 'بدون سعر'})
                              </option>
                            ))}
                            <option value="__OTHER__">✏️ صنف آخر (إدخال يدوي)</option>
                          </select>

                          {(isCustomProduct || !item.materialName) && (
                            <input
                              type="text"
                              value={item.materialName}
                              onChange={e => handleItemChange(index, 'materialName', e.target.value)}
                              placeholder="أدخل اسم المادة أو الخدمة يدويًا..."
                              className={`w-full px-2 py-1 rounded text-[11px] border outline-none ${
                                isNeon ? 'bg-[#181826] border-purple-500/30 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                              }`}
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onFocus={e => e.target.select()}
                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                            placeholder="0"
                            className={`w-full px-2 py-1.5 rounded text-xs border outline-none ${
                              isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.unit}
                            onChange={e => handleItemChange(index, 'unit', e.target.value)}
                            className={`w-full px-2 py-1.5 rounded text-xs border outline-none ${
                              isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="طن">طن</option>
                            <option value="كجم">كجم</option>
                            <option value="قطعة">قطعة</option>
                            <option value="متر">متر</option>
                            <option value="متر مربع">متر مربع</option>
                            <option value="كرتونة">كرتونة</option>
                            <option value="خدمة/مقطوعية">خدمة/مقطوعية</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onFocus={e => e.target.select()}
                            onChange={e => handleItemChange(index, 'price', e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-2 py-1.5 rounded text-xs border outline-none ${
                              isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          />
                        </td>
                        <td className="p-2.5 font-bold font-mono text-emerald-400">
                          {(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors"
                            title="حذف الصنف"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed flex items-center gap-1.5 transition-all cursor-pointer ${
                isNeon
                  ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10'
                  : 'border-blue-400 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              ➕ إضافة صنف جديد
            </button>
          </div>

          {/* ====== الإجماليات ====== */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isNeon ? 'bg-[#161624] border-[#26263B]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              
              <div className="space-y-1">
                <span className="text-slate-400">الإجمالي قبل الخصم:</span>
                <div className="text-base font-bold font-mono text-white">
                  {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">الخصم الممنوح:</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={quotation.discount}
                    onFocus={e => e.target.select()}
                    onChange={e => setQuotation({ ...quotation, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className={`w-full px-2 py-1 rounded text-xs border outline-none ${
                      isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <select
                    value={quotation.discountType}
                    onChange={e => setQuotation({ ...quotation, discountType: e.target.value as any })}
                    className={`px-2 py-1 rounded text-xs border outline-none ${
                      isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="percent">%</option>
                    <option value="fixed">{currencySymbol}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">الضريبة (%):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={quotation.tax}
                    onFocus={e => e.target.select()}
                    onChange={e => setQuotation({ ...quotation, tax: parseFloat(e.target.value) || 0 })}
                    placeholder="14"
                    className={`w-full px-2 py-1 rounded text-xs border outline-none ${
                      isNeon ? 'bg-[#12121A] border-[#2C2C40] text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1 p-2 rounded-lg bg-blue-600/10 border border-blue-500/20">
                <span className="text-blue-400 font-bold">الإجمالي النهائي:</span>
                <div className="text-lg font-black font-mono text-blue-400">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                </div>
              </div>

            </div>
          </div>

          {/* ====== 📝 مساحة الكتابة الحرة (تحت الجدول - اختياري) ====== */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <label className={`text-xs font-bold flex items-center gap-1 ${isNeon ? 'text-amber-300' : 'text-amber-700'}`}>
                <span>📝 شروط وأحكام (تحت الجدول - اختياري)</span>
              </label>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isNeon ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-500'
              }`}>
                اختياري
              </span>
            </div>
            <textarea
              rows={3}
              value={quotation.notesBottom}
              onChange={e => setQuotation({ ...quotation, notesBottom: e.target.value })}
              placeholder="أكتب الشروط والأحكام هنا (مثال: الدفع خلال 15 يوم من الاستلام، الضمان يشمل عيوب التصنيع لمدة سنة...)"
              className={`w-full p-2.5 rounded-xl text-xs border outline-none transition-all ${
                isNeon
                  ? 'bg-[#14141F] border-[#252538] text-white focus:border-amber-500 placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500 placeholder:text-slate-400'
              }`}
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className={`flex flex-wrap items-center justify-between p-4 border-t ${
          isNeon ? 'border-[#252538] bg-[#171725]' : 'border-slate-200 bg-slate-50'
        } rounded-b-2xl gap-2 dir-rtl`}>
          
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              isNeon ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            إلغاء
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isNeon
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <Save className="w-4 h-4 text-slate-400" />
              <span>💾 حفظ العرض</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              title="إرسال مباشر عبر واتساب للعميل"
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 إرسال واتساب (WhatsApp)</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              title="إرسال مباشر عبر البريد الإلكتروني"
            >
              <Mail className="w-4 h-4" />
              <span>✉️ إيميل (Email)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              title="طباعة وتحميل ملف PDF"
            >
              <Download className="w-4 h-4" />
              <span>📥 تصدير PDF / طباعة</span>
            </button>
          </div>

        </div>

      </div>

      {/* Printable View Overlay */}
      {isPrintPreview && (
        <div className="fixed inset-0 bg-white z-[999] p-4 sm:p-8 overflow-y-auto text-slate-900 dir-rtl print:p-0">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Action Bar (Hidden when printing) */}
            <div className="print:hidden sticky top-0 bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 z-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">
                  معاينة وتصدير عرض السعر الرسمي PDF (رقم: {quotation.quotationNumber})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadPDFFile}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                  title="تحميل مباشر لملف PDF على جهاز الكمبيوتر"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'جاري التحميل...' : '📥 تحميل PDF على الكمبيوتر'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all border border-slate-700"
                  title="فتح نافذة طباعة المتصفح"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ طباعة المتصفح</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>💬 إرسال واتساب</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>✉️ إرسال إيميل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintPreview(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  <span>إغلاق</span>
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Container */}
            <div id="quotation-printable-document" className="bg-white p-6 sm:p-8 rounded-2xl space-y-6">
            
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">عرض سعر رسمي (QUOTATION)</h1>
                <p className="text-xs text-slate-500 mt-1">
                  رقم العرض: <strong>{quotation.quotationNumber}</strong> | التاريخ: {quotation.date} | الصلاحية حتى: {quotation.expiryDate}
                </p>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-black text-blue-900">{companyName || 'شركة تشغيل التطبيق'}</h2>
                {companyTaxId && <p className="text-xs text-slate-600 font-mono">الرقم الضريبي: {companyTaxId}</p>}
                {companyAddress && <p className="text-xs text-slate-600">{companyAddress}</p>}
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-500 block">مقدم إلى العميل:</span>
                <span className="text-base font-black text-slate-900">{quotation.clientName || 'عميل محترم'}</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-500 block">العملة المعتمدة:</span>
                <span className="text-sm font-bold text-slate-800">{quotation.currency} ({currencySymbol})</span>
              </div>
            </div>

            {/* Top Notes */}
            {quotation.notesTop && (
              <div className="p-3 bg-blue-50 border-r-4 border-blue-600 rounded text-xs text-slate-800">
                <p className="font-bold mb-1">📝 ملاحظات تمهيدية:</p>
                <p className="whitespace-pre-line">{quotation.notesTop}</p>
              </div>
            )}

            {/* Table */}
            <table className="w-full text-xs text-right border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <th className="p-2 border border-slate-300 text-center">#</th>
                  <th className="p-2 border border-slate-300">المادة / الصنف</th>
                  <th className="p-2 border border-slate-300 text-center">الكمية</th>
                  <th className="p-2 border border-slate-300 text-center">الوحدة</th>
                  <th className="p-2 border border-slate-300 text-left">السعر ({currencySymbol})</th>
                  <th className="p-2 border border-slate-300 text-left">الإجمالي ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, i) => (
                  <tr key={`quote-print-item-${i}`} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-bold">{i + 1}</td>
                    <td className="p-2 border border-slate-300 font-semibold">{item.materialName}</td>
                    <td className="p-2 border border-slate-300 text-center">{item.quantity}</td>
                    <td className="p-2 border border-slate-300 text-center">{item.unit}</td>
                    <td className="p-2 border border-slate-300 text-left font-mono">{item.price.toFixed(2)}</td>
                    <td className="p-2 border border-slate-300 text-left font-mono font-bold">{(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50">
                <div className="flex justify-between">
                  <span>الإجمالي قبل الخصم:</span>
                  <span className="font-mono">{subtotal.toFixed(2)} {currencySymbol}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم:</span>
                    <span className="font-mono">-{discountAmount.toFixed(2)} {currencySymbol}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>الضريبة ({quotation.tax}%):</span>
                  <span className="font-mono">+{taxAmount.toFixed(2)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-slate-400 pt-2 text-blue-900">
                  <span>الإجمالي النهائي:</span>
                  <span className="font-mono">{total.toFixed(2)} {currencySymbol}</span>
                </div>
              </div>
            </div>

            {/* Bottom Notes & Terms */}
            {quotation.notesBottom && (
              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1">📜 الشروط والأحكام:</p>
                <p className="whitespace-pre-line">{quotation.notesBottom}</p>
              </div>
            )}

            {/* Stamp & Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center border-t border-slate-300">
              <div>
                <p className="font-bold mb-8">إعتماد المبيعات والإدارة</p>
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-full mx-auto flex items-center justify-center text-slate-400 font-bold">
                  الختم الرسمي
                </div>
              </div>
              <div>
                <p className="font-bold mb-8">موافقة وإعتماد العميل</p>
                <div className="border-b border-slate-400 w-48 mx-auto mt-12"></div>
                <p className="text-[10px] text-slate-500 mt-1">التوقيع / التاريخ</p>
              </div>
            </div>
            </div>

            {/* Close Print Preview Bar */}
            <div className="print:hidden flex flex-wrap items-center justify-center gap-3 pt-6">
              <button
                type="button"
                onClick={downloadPDFFile}
                disabled={isGeneratingPdf}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'جاري إنشاء الملف...' : '📥 تحميل PDF على الكمبيوتر'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-800 text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-700 cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ طباعة المتصفح</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreview(false)}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 cursor-pointer"
              >
                إغلاق معاينة الطباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

