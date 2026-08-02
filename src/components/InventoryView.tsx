import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  ShoppingBag, 
  RefreshCw, 
  Activity,
  Search,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  ClipboardList
} from 'lucide-react';
import { Product } from '../types';
import { Modal } from './Modal';

interface InventoryViewProps {
  products: Product[];
  onCreateProduct: (prodData: any) => Promise<any>;
  onUpdateProduct: (id: string, updateData: any) => Promise<any>;
  userRole: string;
}

interface StockMovement {
  id: string;
  sku: string;
  name: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  date: string;
}

export default function InventoryView({
  products,
  onCreateProduct,
  onUpdateProduct,
  userRole
}: InventoryViewProps) {
  
  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [reorderPoint, setReorderPoint] = useState('5');

  const [isScrap, setIsScrap] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');

  useEffect(() => {
    fetch('/api/company-modules')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const scrapEnabled = data.some((m: any) => m.code === 'scrap_inventory' && m.is_enabled);
          setIsScrap(scrapEnabled);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (isScrap && weightKg && pricePerKg) {
      const calculated = Number(weightKg) * Number(pricePerKg);
      setUnitPrice(String(calculated));
    }
  }, [weightKg, pricePerKg, isScrap]);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'healthy'>('all');
  const [category, setCategory] = useState('عام');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editCategory, setEditCategory] = useState('');
  const [editCustomCategoryMode, setEditCustomCategoryMode] = useState(false);

  // Quick Adjustment State
  const [selectedProdForAdjust, setSelectedProdForAdjust] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustReason, setAdjustReason] = useState('شراء بضاعة جديدة');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (selectedProdForAdjust) {
      setEditCategory(selectedProdForAdjust.category || (selectedProdForAdjust.sku.startsWith('CONS') ? 'خدمات استشارية' : 'عام'));
      setEditCustomCategoryMode(false);
    }
  }, [selectedProdForAdjust]);

  // Dynamic Movement Ledger
  const [movements, setMovements] = useState<StockMovement[]>([
    { id: 'm-1', sku: 'POS-TOUCH-01', name: 'جهاز كاشير متكامل باللمس', type: 'in', quantity: 5, reason: 'شحنة واردة من المورد الأساسي', date: '2026-06-25 10:30' },
    { id: 'm-2', sku: 'PRNT-BT', name: 'طابعة فواتير حرارية محمولة بلوتوث', type: 'out', quantity: 1, reason: 'صرف عينات للمندوبين', date: '2026-06-27 14:15' },
    { id: 'm-3', sku: 'PROM-LIC', name: 'رخصة نظام بروميت المحاسبي السحابي (سنوية)', type: 'in', quantity: 20, reason: 'تجديد مخزون تراخيص المبيعات', date: '2026-06-28 09:00' }
  ]);

  // Handle addition of inventory item
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice || Number(unitPrice) < 0) {
      setErrorMessage('يرجى كتابة اسم المنتج وتحديد سعر بيع صالح.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const formattedSku = sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProd = await onCreateProduct({
        name,
        sku: formattedSku,
        description,
        unitPrice: Number(unitPrice),
        stockQuantity: Number(stockQuantity) || 0,
        reorderPoint: Number(reorderPoint) || 0,
        category: category || "عام"
      });

      // Log the initial movement
      if (Number(stockQuantity) > 0) {
        const newMove: StockMovement = {
          id: `m-new-${Date.now()}`,
          sku: formattedSku,
          name: name,
          type: 'in',
          quantity: Number(stockQuantity),
          reason: 'رصيد مخزون أول المدة',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        setMovements(prev => [newMove, ...prev]);
      }

      setSuccessMsg('تم إدراج الصنف الجديد في السلع وتفعيل مراقبة المخزون المتقدمة!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowAddForm(false);
        // Reset
        setName('');
        setSku('');
        setDescription('');
        setUnitPrice('');
        setStockQuantity('');
        setReorderPoint('5');
        setCategory('عام');
        setCustomCategoryMode(false);
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.errorMessage || 'حدث خطأ في النظام أثناء محاولة الإضافة.');
    } finally {
      setSaving(false);
    }
  };

  // Manual Stock Adjustment Handler
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdForAdjust) return;

    const hasQtyUpdate = adjustQty && Number(adjustQty) > 0;

    setAdjusting(true);
    try {
      let newQty = selectedProdForAdjust.stockQuantity;
      if (hasQtyUpdate) {
        const delta = Number(adjustQty);
        newQty = adjustType === 'in' 
          ? selectedProdForAdjust.stockQuantity + delta 
          : Math.max(0, selectedProdForAdjust.stockQuantity - delta);
      }

      await onUpdateProduct(selectedProdForAdjust.id, { 
        stockQuantity: newQty,
        category: editCategory || "عام"
      });

      // Add movement log
      if (hasQtyUpdate) {
        const newMove: StockMovement = {
          id: `m-adj-${Date.now()}`,
          sku: selectedProdForAdjust.sku,
          name: selectedProdForAdjust.name,
          type: adjustType,
          quantity: Number(adjustQty),
          reason: adjustReason,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        setMovements(prev => [newMove, ...prev]);
      }

      setSuccessMsg(`تم تحديث الصنف "${selectedProdForAdjust.name}" بنجاح!`);
      setSelectedProdForAdjust(null);
      setAdjustQty('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ التعديلات على الخادم.');
    } finally {
      setAdjusting(false);
    }
  };

  // Quick Auto-Replenish Handler
  const handleReplenishStock = async (prod: Product) => {
    try {
      const replenishAmt = 20;
      await onUpdateProduct(prod.id, { stockQuantity: prod.stockQuantity + replenishAmt });
      
      const newMove: StockMovement = {
        id: `m-repl-${Date.now()}`,
        sku: prod.sku,
        name: prod.name,
        type: 'in',
        quantity: replenishAmt,
        reason: 'طلب توريد مستعجل تلقائي',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      setMovements(prev => [newMove, ...prev]);
      setSuccessMsg(`طلب توريد فوري: تم تمويل مخزون "${prod.name}" بزيادة قدرها +${replenishAmt} وحدات!`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      alert('حدث خطأ أثناء الاتفاق مع الموردين وتأمين الشحنة.');
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const pCategory = p.category || (p.sku.startsWith('CONS') ? 'خدمات استشارية' : 'عام');
      const matchesCategory = categoryFilter === 'all' || pCategory === categoryFilter;

      const isLow = p.stockQuantity <= p.reorderPoint;
      let matchesStatus = true;
      if (statusFilter === 'low') matchesStatus = isLow;
      if (statusFilter === 'healthy') matchesStatus = !isLow;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, statusFilter, categoryFilter]);

  // General Metrics
  const totalValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.unitPrice || 0)), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stockQuantity <= p.reorderPoint).length;
  }, [products]);

  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    const total = products.reduce((sum, p) => sum + (p.unitPrice || 0), 0);
    return Math.round(total / products.length);
  }, [products]);

  const categorySummaries = useMemo(() => {
    const summaryMap: Record<string, { count: number; totalStock: number; totalValuation: number }> = {};
    
    products.forEach(p => {
      const cat = p.category || (p.sku.startsWith('CONS') ? 'خدمات استشارية' : 'عام');
      if (!summaryMap[cat]) {
        summaryMap[cat] = { count: 0, totalStock: 0, totalValuation: 0 };
      }
      summaryMap[cat].count += 1;
      const isService = p.sku.startsWith('CONS');
      if (!isService) {
        summaryMap[cat].totalStock += p.stockQuantity || 0;
        summaryMap[cat].totalValuation += (p.stockQuantity || 0) * (p.unitPrice || 0);
      }
    });

    return Object.entries(summaryMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.totalValuation - a.totalValuation);
  }, [products]);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg animate-pulse">
              <Package size={18} />
            </span>
            <h2 className="text-base font-black tracking-tight text-slate-100">إدارة المستودعات وجرد المخزون السلعي المتقدم</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            متابعة دقيقة لمستويات المخزون، تقييم القيمة الرأسمالية للسلع، تسجيل حركات الوارد والصادر الفورية، وتصدير التقارير المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
          <a 
            href="/api/reports/inventory/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold p-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText size={14} className="text-indigo-400" />
            تصدير كشف الجرد (PDF)
          </a>

          {userRole !== 'viewer' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus size={14} />
              إضافة صنف سلعي جديد
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} className="text-emerald-400" />
          {successMsg}
        </div>
      )}

      {/* Advanced KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">إجمالي القيمة التقديرية (سعر البيع)</span>
            <strong className="text-lg font-black text-slate-100 mt-1 block">
              {totalValuation.toLocaleString()} ج.م
            </strong>
            <span className="text-[9px] text-emerald-400 font-semibold mt-0.5 block">تقييم رأسمالي حركي</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">أصناف منخفضة المخزون (حرجة)</span>
            <strong className={`text-lg font-black mt-1 block ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {lowStockCount} {lowStockCount === 1 ? 'صنف واحد' : 'أصناف'}
            </strong>
            <span className="text-[9px] text-red-400 font-semibold mt-0.5 block">أقل من حد الأمان لإعادة الطلب</span>
          </div>
          <div className={`p-3 rounded-xl border ${lowStockCount > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">عدد المنتجات والخدمات المقيدة</span>
            <strong className="text-lg font-black text-slate-100 mt-1 block">
              {products.length} أصناف
            </strong>
            <span className="text-[9px] text-indigo-400 font-semibold mt-0.5 block">نشطة في المستندات والفواتير</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">متوسط سعر بيع الوحدة</span>
            <strong className="text-lg font-black text-slate-100 mt-1 block">
              {avgPrice.toLocaleString()} ج.م
            </strong>
            <span className="text-[9px] text-slate-400 mt-0.5 block">الشرائح التسعيرية المتاحة</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <RefreshCw size={20} className="animate-spin-slow" />
          </div>
        </div>

      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="إضافة صنف سلعي جديد للمخازن"
        icon={<Plus size={18} className="text-indigo-400" />}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="bg-red-950/80 text-red-300 text-xs p-2.5 rounded-lg border border-red-800">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">اسم المنتج أو الخدمة الكودية</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="مثل: شاحن منضدي ذكي بقوة 65 واط"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">الباركود والمخزون البديل (SKU)</label>
              <input 
                type="text" 
                value={sku} 
                onChange={(e) => setSku(e.target.value)}
                placeholder="PRO-CHRG-65W"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left font-mono text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">سعر بيع الوحدة الافتراضي (ج.م)</label>
              <input 
                type="number" 
                value={unitPrice} 
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="600"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {isScrap && (
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 space-y-3">
              <p className="text-[10px] font-bold text-purple-300">⚖️ تفاصيل تسعير الخردة وإعادة التدوير</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">الوزن (كجم)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="100.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">سعر الكيلو (ج.م)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value)}
                    placeholder="25.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">الكمية الافتتاحية بالمستودع</label>
              <input 
                type="number" 
                value={stockQuantity} 
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="مثال: 50"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">نقطة إعادة الطلب</label>
              <input 
                type="number" 
                value={reorderPoint} 
                onChange={(e) => setReorderPoint(e.target.value)}
                placeholder="5"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">تصنيف أو مجموعة المخزون</label>
              <div className="flex gap-2">
                {!customCategoryMode ? (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setCustomCategoryMode(true);
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                  >
                    <option value="عام">عام</option>
                    <option value="أجهزة ومعدات">أجهزة ومعدات</option>
                    <option value="تراخيص برمجية">تراخيص برمجية</option>
                    <option value="خدمات استشارية">خدمات استشارية</option>
                    <option value="قطع غيار">قطع غيار</option>
                    {Array.from(new Set(products.map(p => p.category).filter(Boolean))).filter(c => !['عام', 'أجهزة ومعدات', 'تراخيص برمجية', 'خدمات استشارية', 'قطع غيار'].includes(c!)).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="new" className="text-indigo-400 font-bold">+ كتابة تصنيف جديد...</option>
                  </select>
                ) : (
                  <div className="flex w-full gap-1 items-center">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="اكتب تصنيف جديد..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCategoryMode(false);
                        setCategory('عام');
                      }}
                      className="text-red-400 px-1 py-1 text-[10px] font-bold hover:bg-red-500/10 rounded"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">الوصف الفرعي بالمستندات</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="يدعم الشحن السريع"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-700 pt-3 mt-4">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-xl font-bold cursor-pointer transition-all"
            >
              إلغاء الإجراء
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-xl font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/20"
            >
              {saving ? 'جاري الحفظ...' : 'تثبيت السلعة بالمخازن'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={!!selectedProdForAdjust}
        onClose={() => setSelectedProdForAdjust(null)}
        title="تسوية مخزنية وتعديل كمية يدوي للسلعة"
        icon={<ClipboardList size={18} className="text-amber-400" />}
        maxWidthClass="max-w-2xl"
      >
        {selectedProdForAdjust && (
          <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400">المنتج المستهدف للتعديل</p>
                <strong className="text-slate-100 text-xs font-bold">{selectedProdForAdjust.name}</strong>
                <span className="text-[10px] text-slate-400 block font-mono">الرمز الحالي: {selectedProdForAdjust.sku}</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400">الرصيد الفعلي الحالي بالمستودع</p>
                <span className="text-sm font-black text-amber-400">{selectedProdForAdjust.stockQuantity} وحدة</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">نوع الحركة أو التسوية</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdjustType('in'); setAdjustReason('شراء بضاعة جديدة ورصيد وارد'); }}
                    className={`flex-1 py-2 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      adjustType === 'in' 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    حركة واردة (+) زيادة
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustType('out'); setAdjustReason('صرف عجز أو جرد سنوي'); }}
                    className={`flex-1 py-2 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      adjustType === 'out' 
                        ? 'bg-red-500/20 border-red-500/40 text-red-300' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    حركة صادرة (-) سحب
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">الكمية المراد تعديلها</label>
                <input 
                  type="number" 
                  value={adjustQty} 
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="مثال: 10"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-left text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">سبب التعديل أو المبرر الجردي</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {adjustType === 'in' ? (
                    <>
                      <option value="شراء بضاعة جديدة ورصيد وارد">شراء بضاعة جديدة ورصيد وارد</option>
                      <option value="إرجاع بضاعة تالفة مستبدلة من المورد">إرجاع بضاعة تالفة مستبدلة من المورد</option>
                      <option value="بضاعة مرتجعة من عميل مستحقة للجرد">بضاعة مرتجعة من عميل مستحقة للجرد</option>
                      <option value="تعديل فروق جرد فيزيائي (وارد زائد)">تعديل فروق جرد فيزيائي (وارد زائد)</option>
                    </>
                  ) : (
                    <>
                      <option value="بضاعة تالفة أو منتهية الصلاحية">بضاعة تالفة أو منتهية الصلاحية</option>
                      <option value="سحب عينات ترويجية وهدايا للعملاء">سحب عينات ترويجية وهدايا للعملاء</option>
                      <option value="تعديل فروق جرد سنوي ومكتشفات عجز">تعديل فروق جرد سنوي ومكتشفات عجز</option>
                      <option value="استهلاك داخلي للشركة">استهلاك داخلي للشركة</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">تحديث تصنيف / مجموعة الصنف</label>
                <div className="flex gap-2">
                  {!editCustomCategoryMode ? (
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setEditCustomCategoryMode(true);
                          setEditCategory('');
                        } else {
                          setEditCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-medium text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="عام">عام</option>
                      <option value="أجهزة ومعدات">أجهزة ومعدات</option>
                      <option value="تراخيص برمجية">تراخيص برمجية</option>
                      <option value="خدمات استشارية">خدمات استشارية</option>
                      <option value="قطع غيار">قطع غيار</option>
                      {Array.from(new Set(products.map(p => p.category).filter(Boolean))).filter(c => !['عام', 'أجهزة ومعدات', 'تراخيص برمجية', 'خدمات استشارية', 'قطع غيار'].includes(c!)).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="new" className="text-indigo-400 font-bold">+ كتابة تصنيف جديد...</option>
                    </select>
                  ) : (
                    <div className="flex w-full gap-1 items-center">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="اكتب تصنيف جديد..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditCustomCategoryMode(false);
                          setEditCategory(selectedProdForAdjust?.category || 'عام');
                        }}
                        className="text-red-400 px-1 py-1 text-[10px] font-bold hover:bg-red-500/10 rounded"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-700 pt-3 mt-4">
              <button 
                type="button" 
                onClick={() => setSelectedProdForAdjust(null)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-xl font-bold border border-slate-600 cursor-pointer transition-all"
              >
                إلغاء التسوية
              </button>
              <button 
                type="submit"
                disabled={adjusting}
                className={`py-2 px-6 rounded-xl font-bold text-white cursor-pointer transition-all shadow-md ${
                  adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {adjusting ? 'جاري التسجيل...' : 'تثبيت حركة التسوية وعكس الرصيد'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Main Panel Search + Filters + Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Section: Advanced Table */}
        <div className="lg:col-span-3 bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-sm space-y-4">
          
          {/* Internal Filters & Search Tools */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/80">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 text-slate-500" size={14} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم المنتج أو الرمز SKU..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-200 min-w-[140px] cursor-pointer"
              >
                <option value="all">📁 جميع التصنيفات</option>
                {categorySummaries.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter size={12} className="text-slate-500 shrink-0" />
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                كل السلع والخدمات
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'low' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                المنخفض والحرِج فقط ({products.filter(p => p.stockQuantity <= p.reorderPoint).length})
              </button>
              <button
                onClick={() => setStatusFilter('healthy')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'healthy' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                المتوفر والآمن
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700 text-[10px]">
                <tr>
                  <th className="p-2.5 rounded-r-lg">الرمز (SKU)</th>
                  <th className="p-2.5">اسم الصنف السلعي والمواصفات</th>
                  <th className="p-2.5 text-left">سعر البيع (ج.م)</th>
                  <th className="p-2.5 text-center">الكمية الحالية</th>
                  <th className="p-2.5 text-center">الحد الآمن</th>
                  <th className="p-2.5 text-center">مؤشر الكفاية</th>
                  <th className="p-2.5 text-left rounded-l-lg">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-[11px]">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isLow = p.stockQuantity <= p.reorderPoint;
                    const isService = p.sku.startsWith('CONS');
                    
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => {
                          if (userRole !== 'viewer' && !isService) {
                            setSelectedProdForAdjust(p);
                          }
                        }}
                        className={`hover:bg-slate-700/40 transition-colors cursor-pointer ${
                          selectedProdForAdjust?.id === p.id ? 'bg-indigo-950/40' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono text-slate-400 font-semibold">{p.sku}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs">{p.name}</span>
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-0.5">
                              📂 {p.category || (p.sku.startsWith('CONS') ? 'خدمات استشارية' : 'عام')}
                            </span>
                          </div>
                          {p.description && (
                            <span className="text-[10px] text-slate-400 font-normal block mt-1">{p.description}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-left font-black text-slate-100">
                          {(p.unitPrice).toLocaleString()} ج.م
                        </td>
                        <td className="p-2.5 text-center font-black">
                          {isService ? (
                            <span className="text-indigo-400 font-bold">خدمة (غير محدودة)</span>
                          ) : (
                            <span className={isLow ? 'text-red-400 font-black text-xs' : 'text-slate-200'}>
                              {p.stockQuantity} وحدة
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-400 font-mono">
                          {isService ? '-' : p.reorderPoint}
                        </td>
                        <td className="p-2.5 text-center">
                          {isService ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              متاحة دائماً
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 inline-flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-red-400 animate-ping"></span>
                              حرج / منخفض
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              مستقر ومتوفر
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-left" onClick={(e) => e.stopPropagation()}>
                          {!isService && userRole !== 'viewer' && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button 
                                onClick={() => handleReplenishStock(p)}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all whitespace-nowrap"
                                title="تمويل فوري"
                              >
                                توريد عاجل +20
                              </button>
                              <button 
                                onClick={() => setSelectedProdForAdjust(p)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all border border-slate-600"
                              >
                                تسوية مخزنية
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">
                      لا يوجد أي منتجات تطابق شروط البحث أو التصفية الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="text-[10px] text-slate-400 mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80">
            * اضغط على أي سطر في الجدول أعلاه لفتح لوحة التسويات وتحديث الرصيد مباشرة مع تدوين السبب لإقرار ميزان المراجعة.
          </div>
        </div>

        {/* Right Section: Recent Movement Log */}
        <div className="space-y-4">
          
          {/* Categories Summary Card */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 text-indigo-400 bg-indigo-500/10 rounded-lg">
                  <Filter size={14} />
                </span>
                <h3 className="font-bold text-slate-100 text-xs">📂 تصنيفات المخزون والقيمة الرأسمالية</h3>
              </div>
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                >
                  إعادة ضبط [X]
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {categorySummaries.map((cat) => {
                const isSelected = categoryFilter === cat.name;
                const pct = totalValuation > 0 ? Math.round((cat.totalValuation / totalValuation) * 100) : 0;
                
                return (
                  <button
                    key={cat.name}
                    onClick={() => setCategoryFilter(isSelected ? 'all' : cat.name)}
                    type="button"
                    className={`w-full text-right p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-950/60 border-indigo-500/40 shadow-xs' 
                        : 'border-slate-700/50 hover:bg-slate-700/30 bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100">{cat.name}</span>
                        <span className="text-[9px] text-slate-400">({cat.count} أصناف)</span>
                      </div>
                      <span className="text-xs font-black text-slate-100">
                        {cat.totalValuation.toLocaleString()} ج.م
                      </span>
                    </div>

                    <div className="w-full flex items-center justify-between text-[9px] text-slate-400">
                      <span>إجمالي القطع: {cat.totalStock.toLocaleString()}</span>
                      <span className="font-mono">{pct}% من القيمة</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-slate-500'}`} 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
              <ClipboardList className="text-indigo-400" size={16} />
              <h3 className="font-bold text-slate-100 text-xs">دفتر حركات المخزون الأخير (وارد/صادر)</h3>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {movements.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-slate-700/50 bg-slate-900/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-slate-200 block max-w-[130px] truncate" title={m.name}>
                      {m.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 ${
                      m.type === 'in' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {m.type === 'in' ? <ArrowDownLeft size={8} /> : <ArrowUpRight size={8} />}
                      {m.type === 'in' ? 'وارد +' : 'صادر -'} {m.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span className="italic block max-w-[110px] truncate" title={m.reason}>
                      {m.reason}
                    </span>
                    <span className="font-mono">{m.date}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40 text-[10px] text-indigo-300 leading-relaxed">
              <strong>التوجيه والمحاسبة:</strong>
              <p className="mt-1">
                تنعكس الحركات تلقائياً في قيم تكلفة البضاعة المباعة (COGS) ومجمع مبيعات المنتجات بالصفحة المالية بمجرد إدراج أي فواتير جديدة.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
