import React, { useState } from 'react';
import { 
  Plus, 
  Upload, 
  TrendingDown, 
  Camera, 
  Sparkles, 
  Receipt, 
  CheckCircle, 
  AlertTriangle,
  FileText 
} from 'lucide-react';
import { Expense, Contact } from '../types';

interface ExpensesViewProps {
  expenses: Expense[];
  contacts: Contact[];
  onCreateExpense: (expData: any) => Promise<any>;
  userRole: string;
}

export default function ExpensesView({
  expenses,
  contacts,
  onCreateExpense,
  userRole
}: ExpensesViewProps) {
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('تكلفة البضاعة المباعة');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState('');
  const [vaults, setVaults] = useState<any[]>([]);
  const [vaultId, setVaultId] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [scanning, setScanning] = useState(false);

  React.useEffect(() => {
    fetch('/api/treasury/vaults')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const activeVaults = data.data.filter((v: any) => v.is_active !== false);
          setVaults(activeVaults);
          if (activeVaults.length > 0) {
            // Prefer petty cash or main vault if available
            const defaultV = activeVaults.find((v: any) => v.type === 'petty_cash') || activeVaults[0];
            setVaultId(defaultV.id);
          }
        }
      })
      .catch(err => console.error('Error fetching vaults in ExpensesView:', err));
  }, []);

  // Pre-compiled receipt presets for Saudi corporate testing
  const receiptPresets = [
    {
      title: "فاتورة الاتصالات والإنترنت (شركة WE)",
      text: "WE BUSINESS BILL NO: 2026-92841, CLIENT ID: PROMET TECH, TOTAL PAYABLE AMOUNT: 450.00 EGP (INCLUDES 14% VAT). DATE OF INVOICE: 2026-06-01",
      icon: "🌐"
    },
    {
      title: "مكتبة سمير وعلي - أجهزة ومستلزمات حواسب",
      text: "مكتبة سمير وعلي SAMIR & ALY BOOKSTORE BRANCH 12 CAIRO, CASH SALE INVOICE. 1x ASUS LAPTOP CORE i7 = 15000 EGP, TAX AMOUNT 14%: 2100 EGP. TOTAL INTEGRATED CASH PAY: 17100.00 EGP",
      icon: "💻"
    },
    {
      title: "فاتورة وجبات غداء مكاتب (مصلحة الضرائب)",
      text: "مطعم كشرى أبو طارق - فرع وسط البلد. رقم الطلب 92. علب كشري وحلو للمكتب. المجموع الفرعي 140.00 جنيه. ضريبة القيمة المضافة: 19.60 جنيه. المجموع الكلي: 159.60 جنيه مصري",
      icon: "🍛"
    }
  ];

  // Dynamic list of categories with local storage support
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('expenses_categories_custom');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [
      "تكلفة البضاعة المباعة",
      "إيجار المكاتب",
      "مصروف الكهرباء والمياه",
      "مصروف التسويق والإعلانات",
      "أدوات ميكانيكية ومكتبية",
      "أطعمة وضيافة مكاتب",
      "مصروف النقل والمواصلات",
      "أجور ورواتب الموظفين",
      "تكلفة تشغيلية أخرى"
    ];
  });
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!categoriesList.includes(trimmed)) {
      const updated = [...categoriesList, trimmed];
      setCategoriesList(updated);
      localStorage.setItem('expenses_categories_custom', JSON.stringify(updated));
    }
    setCategory(trimmed);
    setNewCatInput('');
    setShowAddCatModal(false);
  };

  // AI OCR simulator and scan triggering
  const handleTriggerOcrScan = async (presetText: string) => {
    setScanning(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/ai/classify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptText: presetText })
      });
      const data = await response.json();
      
      if (data) {
        setAmount(data.amount?.toString() || '');
        setCategory(data.category || 'أدوات ميكانيكية ومكتبية');
        setDescription(`تم استخلاصها آلياً - ${data.vendor || 'مورد عام'}: ${data.description || 'مصروف عام مستند'}`);
        // Find if vendor matches contact
        const matchedVendor = contacts.find(c => c.type === 'vendor' && c.name.includes(data.vendor || ''));
        if (matchedVendor) {
          setContactId(matchedVendor.id);
        }
        setSuccessMsg('احسنت! قام الذكاء الاصطناعي بقراءة الإيصال وتصنيف المصروف تلقائياً وإدخال القيم!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMessage('تعذر قراءة الإيصال عبر خوادم الذكاء الاصطناعي. الرجاء إدخال الحقول يدوياً.');
    } finally {
      setScanning(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('الرجاء إدخال مبلغ صالح أكبر من الصفر.');
      return;
    }

    if (!vaultId) {
      setErrorMessage('الرجاء اختيار الخزينة المراد خصم المصروف منها.');
      return;
    }

    try {
      const res = await onCreateExpense({
        contactId: contactId || undefined,
        vaultId,
        expenseDate,
        amount: Number(amount),
        category,
        description,
        receiptUrl: 'https://ais-static.sa/mock-receipt.pdf'
      });

      if (res && res.error) {
        setErrorMessage(res.error);
        return;
      }

      setSuccessMsg('تم تسجيل المصروف وترحيل الأرصدة وخصمها من الخزينة بنجاح!');
      setAmount('');
      setDescription('');
      setContactId('');
      
      setTimeout(() => {
        setSuccessMsg('');
        setShowAddForm(false);
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.errorMessage || 'حدث خطأ أثناء حفظ المصروف.');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-slate-800 p-3.5 rounded-xl border border-slate-700/80">
        <div>
          <h2 className="text-sm font-black text-slate-100">تتبع المصروفات، النفقات التشغيلية، ومسح الإيصالات (AI Reciepts)</h2>
          <p className="text-[10px] text-slate-400">سجل المدفوعات اليومية وصنف نفقاتك لضبط قائمتي الدخل والميزانية العامة</p>
        </div>

        {userRole !== 'viewer' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1.5 px-4 rounded text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            إضافة مصروف يدوياً أو مسح إيصال
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-900/30 border border-green-700/50 text-green-300 text-xs p-2.5 rounded font-bold">
          {successMsg}
        </div>
      )}

      {/* Manual & OCR Expense capturing workspace */}
      {showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* AI Interactive Receipt Scanner Presets Column */}
          <div className="bg-gradient-to-br from-indigo-900 to-[#1E1B4B] p-4 rounded-lg text-white border border-indigo-950">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
              <Sparkles className="text-yellow-300" size={14} />
              <h3 className="text-xs font-bold">ماسح الإيصالات وضريبة القيمة المضافة (AI Scanner)</h3>
            </div>
            <p className="text-[10px] text-indigo-200 leading-relaxed mb-4">
              اختر أحد الإيصالات السعودية التجريبية التالية لمحاكاة تصوير الإيصالات بهاتفك المحمول. سيتولى الذكاء الاصطناعي قراءة الضريبة والتصنيف الضريبي بدقة:
            </p>

            <div className="space-y-2">
              {receiptPresets.map((preset, idx) => (
                <div 
                  key={idx}
                  onClick={() => !scanning && handleTriggerOcrScan(preset.text)}
                  className={`p-2.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 cursor-pointer transition-all ${
                    scanning ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{preset.icon}</span>
                    <span className="text-[10px] font-bold text-white leading-tight">{preset.title}</span>
                  </div>
                  <p className="text-[9px] text-indigo-200 line-clamp-2 leading-relaxed font-mono">
                    {preset.text}
                  </p>
                  <div className="text-left mt-1.5">
                    <span className="text-[8px] font-bold text-yellow-300 bg-yellow-400/10 px-1 py-0.5 rounded">
                      انقر للمسح الفوري بالذكاء الاصطناعي ✦
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {scanning && (
              <div className="mt-4 p-3 bg-white/10 rounded-md border border-white/15 flex items-center justify-center gap-2 text-xs">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold text-yellow-300 animate-pulse">جاري فحص المستند واستخراج البيانات بالذكاء الاصطناعي...</span>
              </div>
            )}
          </div>

          {/* Form Entry Column */}
          <div className="lg:col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-xs">
            <h3 className="text-xs font-bold text-slate-100 mb-3">تفاصيل المعاملة المصروفة</h3>
            
            {errorMessage && (
              <div className="bg-red-900/30 text-red-300 text-xs p-2 rounded mb-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">قيمة المصروف الكلية (ج.م)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded p-1.5 text-left font-bold text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-400">التصنيف المحاسبي للمصروف</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCatModal(true)}
                      className="text-[10px] text-pink-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} />
                      + إضافة تصنيف جديد
                    </button>
                  </div>
                  <select 
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowAddCatModal(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 text-white rounded p-1.5"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">تحديد التصنيف المحاسبي للمصروف</option>
                    {categoriesList.map((c, idx) => (
                      <option key={idx} value={c} className="bg-slate-900 text-white">{c}</option>
                    ))}
                    <option value="__ADD_NEW__" className="bg-slate-800 text-pink-400 font-bold">
                      + إضافة تصنيف جديد
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-amber-400 mb-1">🏦 الخزينة (خصم النقدية)</label>
                  <select 
                    value={vaultId}
                    onChange={(e) => setVaultId(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/40 text-white rounded p-1.5 focus:border-amber-400 font-bold"
                    required
                  >
                    <option value="" className="bg-slate-900 text-slate-400">-- اختر الخزينة --</option>
                    {vaults.map(v => (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                        {v.name} (رصيد: {Number(v.current_balance || 0).toLocaleString()} ج.م)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">التاريخ</label>
                  <input 
                    type="date" 
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 text-white rounded p-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">المورد / الجهة المستفيدة (اختياري)</label>
                  <select 
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 text-white rounded p-1.5"
                  >
                    <option value="" className="bg-slate-900 text-white">-- اختر مورد من السجل --</option>
                    {contacts.filter(c => c.type === 'vendor').map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">البيان / تفصيل الشراء</label>
                <input 
                  type="text" 
                  placeholder="وصف مختصر لمحتويات الفاتورة"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 text-white rounded p-1.5 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-700/80 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 px-4 rounded font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-6 rounded font-bold cursor-pointer"
                >
                  ترحيل وضبط المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List of registered expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expenses ledger table */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/80 p-3.5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">دفتر اليومية المساعد للمصروفات</h3>
            <span className="text-[10px] bg-slate-900 text-slate-300 px-2.5 py-1 rounded-md font-semibold border border-slate-700/80">المجموع الكلي: {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} ج.م</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80">
                <tr>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">الفئة المحاسبية</th>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5">المستفيد</th>
                  <th className="p-2.5 text-left">المبلغ</th>
                  <th className="p-2.5 text-center">الإرفاق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-[11px]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400">لا يوجد مصروفات مسجلة بعد.</td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const vendor = contacts.find(c => c.id === exp.contactId);
                    return (
                      <tr key={exp.id} className="hover:bg-slate-700/40">
                        <td className="p-2.5 text-slate-400">{exp.expenseDate}</td>
                        <td className="p-2.5 font-bold text-slate-200">{exp.category}</td>
                        <td className="p-2.5 text-slate-300 max-w-[180px] truncate">{exp.description}</td>
                        <td className="p-2.5 text-slate-400">{vendor ? vendor.name : 'مشتريات نقدية عامة'}</td>
                        <td className="p-2.5 text-left font-black text-red-400">-{exp.amount.toLocaleString()} ج.م</td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] text-blue-400 hover:underline cursor-pointer font-medium">إيصال قيد ✓</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses breakdown stat side panel */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-200 uppercase">مراقبة الفئات والالتزام الضريبي</h3>
          <p className="text-[10px] text-slate-400">تحليل الفئات الأكثر تطلباً للسيولة النقدية هذا الشهر:</p>

          <div className="space-y-2 text-xs">
            {categoriesList.map((cat, i) => {
              const catTotal = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
              const percent = (catTotal / (expenses.reduce((sum, e) => sum + e.amount, 0) || 1)) * 100;
              if (catTotal === 0) return null;
              
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-300">{cat}</span>
                    <span className="font-bold text-slate-100">{catTotal.toLocaleString()} ج.م ({Math.round(percent)}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {expenses.length === 0 && (
              <p className="text-[10.5px] text-slate-400 text-center py-4">قم بتسجيل المصاريف لبناء الرسم الهيكلي التراكمي للتكاليف.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2">
                <Plus size={16} />
                إضافة تصنيف محاسبي جديد
              </h3>
              <button onClick={() => setShowAddCatModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">اسم التصنيف المحاسبي:</label>
              <input
                type="text"
                autoFocus
                placeholder="مثال: مصاريف شحن صادر، رسوم تراخيص..."
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatInput.trim()}
                className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
              >
                حفظ والتحديد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
