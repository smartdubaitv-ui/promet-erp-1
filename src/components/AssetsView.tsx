import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2,
  DollarSign, 
  BarChart3, 
  Activity, 
  RefreshCw, 
  Layers, 
  Calendar, 
  Briefcase, 
  User as UserIcon, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building,
  Wrench,
  Percent,
  Wallet,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value_percent: number;
  depreciation_rate: number;
  asset_account_id?: string;
}

interface FixedAsset {
  id: string;
  asset_code: string;
  code: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  purchase_date: string;
  purchase_invoice_id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_cost: number;
  additional_costs: number;
  total_cost: number;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value: number;
  depreciation_rate: number;
  accumulated_depreciation: number;
  net_book_value: number;
  status: 'active' | 'depreciated' | 'sold' | 'disposed';
  location: string;
  department_id: string;
  department_name: string;
  employee_id: string;
  employee_name: string;
  depreciation_start_date: string;
  last_depreciation_date: string;
  notes: string;
  years_used: number;
  remaining_years: number;
  depreciation_percent: number;
}

interface ReportsSummary {
  total_assets: number;
  total_cost: number;
  total_depreciation: number;
  total_net_book_value: number;
  active_assets: number;
  fully_depreciated: number;
  sold_assets: number;
}

interface CurrentAssetsSummary {
  cash: number;
  bank: number;
  receivable: number;
  inventory: number;
  total: number;
}

interface AssetsViewProps {
  userRole: string;
  contacts: any[];
}

export default function AssetsView({ userRole, contacts }: AssetsViewProps) {
  const [activeTab, setActiveTab] = useState<'fixed' | 'current' | 'reports'>('fixed');
  
  // Data States
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [summary, setSummary] = useState<ReportsSummary>({
    total_assets: 0,
    total_cost: 0,
    total_depreciation: 0,
    total_net_book_value: 0,
    active_assets: 0,
    fully_depreciated: 0,
    sold_assets: 0
  });
  const [currentAssets, setCurrentAssets] = useState<CurrentAssetsSummary>({
    cash: 0,
    bank: 0,
    receivable: 0,
    inventory: 0,
    total: 0
  });

  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [showDepreciateModal, setShowDepreciateModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<FixedAsset | null>(null);

  // Form: Add Fixed Asset
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPurchaseCost, setNewPurchaseCost] = useState('');
  const [newAddCosts, setNewAddCosts] = useState('0');
  const [newUsefulLife, setNewUsefulLife] = useState('');
  const [newSalvageValue, setNewSalvageValue] = useState('');
  const [newDepMethod, setNewDepMethod] = useState('straight_line');
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Form: Run Depreciation
  const [depPeriodDate, setDepPeriodDate] = useState(new Date().toISOString().slice(0, 10));

  // Form: Disposal
  const [disposalType, setDisposalType] = useState<'sale' | 'write_off'>('sale');
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleAmount, setSaleAmount] = useState('');
  const [disposalNotes, setDisposalNotes] = useState('');

  // Helper lists from general db
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Load all assets data
  const loadData = async () => {
    try {
      setLoading(true);
      const [resAssets, resCats, resSum, resCurrent, resDepts, resEmps] = await Promise.all([
        fetch('/api/assets').then(r => r.json().catch(() => [])),
        fetch('/api/asset-categories').then(r => r.json().catch(() => [])),
        fetch('/api/assets/reports/summary').then(r => r.json().catch(() => null)),
        fetch('/api/assets/current-assets').then(r => r.json().catch(() => null)),
        fetch('/api/departments').then(r => r.json().catch(() => [])),
        fetch('/api/employees').then(r => r.json().catch(() => []))
      ]);

      setAssets(Array.isArray(resAssets) ? resAssets : []);
      setCategories(Array.isArray(resCats) ? resCats : []);
      if (resSum && typeof resSum === 'object' && !resSum.error) {
        setSummary(resSum);
      }
      if (resCurrent && typeof resCurrent === 'object' && !resCurrent.error) {
        setCurrentAssets(resCurrent);
      }
      setDepartments(Array.isArray(resDepts) ? resDepts : []);
      setEmployees(Array.isArray(resEmps) ? resEmps : []);
    } catch (error) {
      console.error('Error loading assets data:', error);
      setErrorMessage('فشل تحميل بيانات الأصول من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync salvage value & useful life on category change in Add form
  useEffect(() => {
    if (newCatId && categories.length > 0) {
      const selectedCat = categories.find(c => c.id === newCatId);
      if (selectedCat) {
        setNewDepMethod(selectedCat.depreciation_method || 'straight_line');
        setNewUsefulLife(String(selectedCat.useful_life_years || '5'));
        
        const cost = Number(newPurchaseCost) || 0;
        const addCosts = Number(newAddCosts) || 0;
        const total = cost + addCosts;
        const salvagePercent = selectedCat.salvage_value_percent || 10;
        setNewSalvageValue(String(Math.round((total * salvagePercent) / 100)));
      }
    }
  }, [newCatId, newPurchaseCost, newAddCosts, categories]);

  // Actions
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setNewName('');
    setNewDesc('');
    setNewCatId('');
    setNewPurchaseDate(new Date().toISOString().slice(0, 10));
    setNewPurchaseCost('');
    setNewAddCosts('0');
    setNewUsefulLife('');
    setNewSalvageValue('');
    setNewDepMethod('straight_line');
    setNewSupplierId('');
    setNewLocation('');
    setNewDeptId('');
    setNewEmpId('');
    setNewNotes('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setNewName(asset.name || '');
    setNewDesc(asset.description || '');
    setNewCatId(asset.category_id || '');
    setNewPurchaseDate(asset.purchase_date ? asset.purchase_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setNewPurchaseCost(String(asset.purchase_cost || ''));
    setNewAddCosts(String(asset.additional_costs || '0'));
    setNewUsefulLife(String(asset.useful_life_years || ''));
    setNewSalvageValue(String(asset.salvage_value || ''));
    setNewDepMethod(asset.depreciation_method || 'straight_line');
    setNewSupplierId(asset.supplier_id || '');
    setNewLocation(asset.location || '');
    setNewDeptId(asset.department_id || '');
    setNewEmpId(asset.employee_id || '');
    setNewNotes(asset.notes || '');
    setShowAddModal(true);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف الأصل الثابت (${name})؟`)) {
      return;
    }
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('🗑️ تم حذف الأصل الثابت بنجاح.');
        loadData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'فشل حذف الأصل الثابت.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم لحذف الأصل.');
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCatId || !newPurchaseCost || !newPurchaseDate) {
      setErrorMessage('الرجاء إدخال الحقول الإلزامية للأصل الثابت.');
      return;
    }

    try {
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          category_id: newCatId,
          purchase_date: newPurchaseDate,
          purchase_cost: Number(newPurchaseCost),
          additional_costs: Number(newAddCosts),
          useful_life_years: Number(newUsefulLife),
          salvage_value: Number(newSalvageValue),
          depreciation_method: newDepMethod,
          supplier_id: newSupplierId || null,
          location: newLocation,
          department_id: newDeptId || null,
          employee_id: newEmpId || null,
          notes: newNotes
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(editingAsset ? '✅ تم تعديل بيانات الأصل بنجاح.' : '✅ تم إضافة الأصل الثابت الجديد وقيد الشراء بنجاح.');
        setShowAddModal(false);
        setEditingAsset(null);
        // Reset form
        setNewName('');
        setNewDesc('');
        setNewCatId('');
        setNewPurchaseCost('');
        setNewAddCosts('0');
        setNewUsefulLife('');
        setNewSalvageValue('');
        setNewLocation('');
        setNewNotes('');
        
        loadData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'فشل حفظ بيانات الأصل.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم.');
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/assets/calculate-depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_date: depPeriodDate })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(data.message || '✅ تم حساب الإهلاك الشهري بنجاح.');
        setShowDepreciateModal(false);
        loadData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'فشل حساب الإهلاك.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء حساب الإهلاك.');
    }
  };

  const handleDisposeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForDisposal) return;

    try {
      const response = await fetch(`/api/assets/${selectedAssetForDisposal.id}/dispose`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_type: disposalType,
          disposal_date: disposalDate,
          sale_amount: Number(saleAmount),
          notes: disposalNotes
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(data.message || '✅ تم تسجيل معاملة استبعاد الأصل الثابت بنجاح.');
        setShowDisposeModal(false);
        setSelectedAssetForDisposal(null);
        setSaleAmount('');
        setDisposalNotes('');
        loadData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'فشل استبعاد الأصل.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء استبعاد الأصل.');
    }
  };

  // Filters calculation
  const filteredAssets = assets.filter(asset => {
    const name = asset.name || '';
    const assetCode = asset.asset_code || asset.code || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      assetCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? String(asset.category_id) === String(selectedCategory) : true;
    const matchesStatus = selectedStatus ? asset.status === selectedStatus : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Category Icon helper
  const getCategoryIcon = (catName: string) => {
    const name = catName || '';
    if (name.includes('مباني') || name.includes('عقار')) return <Building className="text-amber-500" size={16} />;
    if (name.includes('سيار') || name.includes('نقل')) return <Activity className="text-blue-500" size={16} />;
    if (name.includes('أجهزة') || name.includes('كمبيوتر') || name.includes('خادم')) return <BarChart3 className="text-purple-500" size={16} />;
    if (name.includes('أثاث')) return <Layers className="text-emerald-500" size={16} />;
    return <Wrench className="text-slate-500" size={16} />;
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">نشط ويستهلك</span>;
      case 'depreciated':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">مستهلك بالكامل</span>;
      case 'sold':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">مستبعد (تم البيع)</span>;
      case 'disposed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">مستبعد (شطب وإتلاف)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  // Recharts Data Prep
  const pieData = [
    { name: 'النقدية بالصندوق', value: currentAssets.cash, color: '#10B981' },
    { name: 'الأرصدة البنكية', value: currentAssets.bank, color: '#3B82F6' },
    { name: 'حسابات العملاء والذمم', value: currentAssets.receivable, color: '#8B5CF6' },
    { name: 'المخزون السلعي', value: currentAssets.inventory, color: '#F59E0B' }
  ];

  const totalCurrentValue = currentAssets.total;
  const totalFixedCost = summary.total_cost;
  const totalFixedNet = summary.total_net_book_value;
  const totalAssetsSum = totalCurrentValue + totalFixedNet;

  return (
    <div className="space-y-6">
      
      {/* Messages Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="ml-auto text-xs text-red-400 underline">تجاهل</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-800 border border-slate-700/80 rounded-2xl shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl hidden sm:block">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>إدارة أصول الشركة والسيولة</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              متابعة شاملة للأصول الثابتة وإهلاكها المحاسبي، وتكلفة الأصول المتغيرة وسيولة الخزينة.
            </p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
          <button
            onClick={() => setActiveTab('fixed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'fixed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            الأصول الثابتة Fixed Assets
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'current' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            الأصول المتغيرة Current Assets
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            الميزانية وهيكل الأصول
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="text-blue-500 animate-spin" size={40} />
          <span className="text-sm text-slate-400 mt-4">جاري تحميل حسابات ومستندات الأصول...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: FIXED ASSETS VIEW */}
          {activeTab === 'fixed' && (
            <div className="space-y-6">
              
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">إجمالي عدد الأصول</span>
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><Layers size={16} /></span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-3">{summary.total_assets} <span className="text-xs text-slate-400 font-normal">أصل</span></h3>
                  <p className="text-[10px] text-slate-500 mt-1">تشمل الأصول النشطة والمستهلكة والمستبعدة</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">تكلفة الشراء التاريخية</span>
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><DollarSign size={16} /></span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-3">{summary.total_cost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">جنيه</span></h3>
                  <p className="text-[10px] text-slate-500 mt-1">القيمة التاريخية مضافاً إليها مصاريف التأسيس</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">مجمع الإهلاك المتراكم</span>
                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400"><Percent size={16} /></span>
                  </div>
                  <h3 className="text-2xl font-bold text-purple-400 mt-3">{summary.total_depreciation.toLocaleString()} <span className="text-xs text-slate-400 font-normal">جنيه</span></h3>
                  <p className="text-[10px] text-slate-500 mt-1">نسبة الإهلاك الكلي: {summary.total_cost > 0 ? Math.round((summary.total_depreciation / summary.total_cost) * 100) : 0}% من قيمة الأصول</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl bg-blue-900/10 border-blue-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-300 font-medium">صافي القيمة الدفترية الدقيقة</span>
                    <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300"><TrendingUp size={16} /></span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-3">{summary.total_net_book_value.toLocaleString()} <span className="text-xs text-blue-300 font-normal">جنيه</span></h3>
                  <p className="text-[10px] text-blue-400 mt-1">صافي قيمة الأصول المتبقية للشركة حالياً</p>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/40">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="بحث باسم الأصل أو الكود..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
                  />
                  
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-white focus:outline-none"
                  >
                    <option value="">جميع فئات الأصول</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-white focus:outline-none"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="active">نشط</option>
                    <option value="depreciated">مستهلك بالكامل</option>
                    <option value="sold">تم بيعه</option>
                    <option value="disposed">مشطوب/تالف</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDepreciateModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <RefreshCw size={14} className="animate-pulse" />
                    تشغيل الإهلاك الشهري
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <Plus size={14} />
                    إضافة أصل ثابت
                  </button>
                </div>
              </div>

              {/* Table Fixed Assets */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                        <th className="p-4 font-semibold">كود الأصل</th>
                        <th className="p-4 font-semibold">اسم الأصل / الفئة</th>
                        <th className="p-4 font-semibold">تاريخ الاقتناء</th>
                        <th className="p-4 font-semibold">التكلفة التاريخية</th>
                        <th className="p-4 font-semibold">مجمع الإهلاك</th>
                        <th className="p-4 font-semibold">القيمة الدفترية</th>
                        <th className="p-4 font-semibold">العمر الإنتاجي (الاستهلاك)</th>
                        <th className="p-4 font-semibold">الحالة</th>
                        <th className="p-4 font-semibold text-center">خيارات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30 text-slate-300">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            لا يوجد أصول ثابتة مطابقة لمعايير البحث الحالية.
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map(asset => (
                          <tr key={asset.id} className="hover:bg-slate-700/25 transition-colors">
                            <td className="p-4 font-mono font-medium text-slate-400">{asset.asset_code}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-slate-800 border border-slate-700">{getCategoryIcon(asset.category_name)}</span>
                                <div>
                                  <div className="font-bold text-white text-xs">{asset.name}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{asset.category_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400">{asset.purchase_date}</td>
                            <td className="p-4 font-bold text-white">{asset.total_cost.toLocaleString()} جنيه</td>
                            <td className="p-4 text-purple-400 font-semibold">
                              {asset.accumulated_depreciation.toLocaleString()} جنيه
                            </td>
                            <td className="p-4 font-bold text-emerald-400">
                              {asset.net_book_value.toLocaleString()} جنيه
                            </td>
                            <td className="p-4">
                              <div className="space-y-1 w-28">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                  <span>مستهلك: {asset.depreciation_percent}%</span>
                                  <span>{asset.remaining_years} سنة</span>
                                </div>
                                <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-purple-500 h-full rounded-full"
                                    style={{ width: `${asset.depreciation_percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">{getStatusBadge(asset.status)}</td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(asset)}
                                  title="تعديل بيانات الأصل الثابت"
                                  className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                  title="حذف الأصل الثابت نهائيّاً"
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                                {asset.status === 'active' || asset.status === 'depreciated' ? (
                                  <button
                                    onClick={() => {
                                      setSelectedAssetForDisposal(asset);
                                      setShowDisposeModal(true);
                                    }}
                                    title="استبعاد / بيع الأصل"
                                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition-colors text-[10px]"
                                  >
                                    استبعاد
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500">تم الاستبعاد</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CURRENT ASSETS VIEW */}
          {activeTab === 'current' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left breakdown details */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wallet size={16} className="text-blue-400" />
                    تفاصيل الأصول المتغيرة وسيولة النقدية والذمم
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex gap-4 items-center">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <Coins size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">النقدية في الخزينة</div>
                        <div className="text-lg font-bold text-white mt-1">{currentAssets.cash.toLocaleString()} جنيه</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex gap-4 items-center">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">الحسابات والأرصدة البنكية</div>
                        <div className="text-lg font-bold text-white mt-1">{currentAssets.bank.toLocaleString()} جنيه</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex gap-4 items-center">
                      <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">ذمم العملاء (الحسابات المدينة)</div>
                        <div className="text-lg font-bold text-white mt-1">{currentAssets.receivable.toLocaleString()} جنيه</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex gap-4 items-center">
                      <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                        <Layers size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">المخزون السلعي للشركة</div>
                        <div className="text-lg font-bold text-white mt-1">{currentAssets.inventory.toLocaleString()} جنيه</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gradient-to-r from-blue-900/20 to-emerald-900/20 border border-blue-800/30 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-blue-300 font-bold">إجمالي الأصول المتغيرة السيالة</span>
                      <p className="text-[10px] text-slate-400 mt-1">تؤثر مباشرة على مؤشر الملاءة والسيولة الفورية للشركة</p>
                    </div>
                    <div className="text-xl font-black text-emerald-400">{currentAssets.total.toLocaleString()} جنيه</div>
                  </div>
                </div>

                {/* Liquidity metrics block */}
                <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">مؤشرات السيولة والتشغيل</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>السيولة النقدية الفورية (كاش + بنك)</span>
                        <span className="font-bold text-white">
                          {currentAssets.total > 0 
                            ? Math.round(((currentAssets.cash + currentAssets.bank) / currentAssets.total) * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${currentAssets.total > 0 ? ((currentAssets.cash + currentAssets.bank) / currentAssets.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>نسبة الذمم والعملاء القابلة للتحصيل</span>
                        <span className="font-bold text-white">
                          {currentAssets.total > 0 
                            ? Math.round((currentAssets.receivable / currentAssets.total) * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full" 
                          style={{ width: `${currentAssets.total > 0 ? (currentAssets.receivable / currentAssets.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>نسبة المخزون السلعي الساكن</span>
                        <span className="font-bold text-white">
                          {currentAssets.total > 0 
                            ? Math.round((currentAssets.inventory / currentAssets.total) * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${currentAssets.total > 0 ? (currentAssets.inventory / currentAssets.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Doughnut chart */}
              <div className="lg:col-span-5 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">توزيع رأس المال المتغير</h3>
                  <p className="text-[10px] text-slate-400 mt-1">نسبة تمثيل كل أصل من إجمالي رأس المال المتداول بالشركة.</p>
                </div>

                <div className="h-64 flex justify-center items-center my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value.toLocaleString()} جنيه`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-400">{item.name}</span>
                      </div>
                      <span className="text-white font-bold">{item.value.toLocaleString()} جنيه</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REPORTS VIEW */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Structural Overview */}
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">صافي هيكل الأصول والموازنة العامة</h3>
                    <p className="text-[10px] text-slate-400 mt-1">مقارنة بين الأصول الثابتة الملموسة والأصول المتغيرة الفورية.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-700">
                      <div>
                        <span className="text-xs text-slate-400">إجمالي الأصول الثابتة (صافي القيمة)</span>
                        <div className="text-lg font-bold text-white mt-1">{totalFixedNet.toLocaleString()} جنيه</div>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">ثنائية استهلاكية</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-700">
                      <div>
                        <span className="text-xs text-slate-400">إجمالي الأصول المتغيرة (السيولة والذمم)</span>
                        <div className="text-lg font-bold text-white mt-1">{totalCurrentValue.toLocaleString()} جنيه</div>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">رأس مال متداول</span>
                    </div>

                    <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-slate-400 font-bold">إجمالي أصول وموارد الشركة</span>
                        <div className="text-xl font-extrabold text-blue-400 mt-1">{totalAssetsSum.toLocaleString()} جنيه</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <div>نسبة الثابتة: {totalAssetsSum > 0 ? Math.round((totalFixedNet / totalAssetsSum) * 100) : 0}%</div>
                        <div>نسبة المتغيرة: {totalAssetsSum > 0 ? Math.round((totalCurrentValue / totalAssetsSum) * 100) : 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Asset ratio Bar Chart */}
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">توازن هيكل الميزانية العمومية</h3>
                    <p className="text-[10px] text-slate-400 mt-1">التمثيل البياني لهيكل ميزانية الأصول الثابتة مقارنة بالسيولة المتوفرة.</p>
                  </div>

                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'أصول متغيرة', قيمة: totalCurrentValue },
                          { name: 'أصول ثابتة (صافي)', قيمة: totalFixedNet }
                        ]}
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
                        <YAxis stroke="#94A3B8" style={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => `${v.toLocaleString()} جنيه`} />
                        <Bar dataKey="قيمة" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                          <Cell fill="#10B981" />
                          <Cell fill="#8B5CF6" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}
        </>
      )}

      {/* MODAL 1: ADD NEW FIXED ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/40">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {editingAsset ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                {editingAsset ? `تعديل بيانات الأصل الثابت (${editingAsset.name})` : 'إضافة أصل ثابت جديد للشركة'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleAddAsset} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">اسم الأصل الثابت *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: سيارة هيلوكس 2024"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">فئة الأصول *</label>
                  <select
                    required
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">اختر الفئة للاحتساب التلقائي...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.depreciation_rate}% إهلاك)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">سعر الشراء الأساسي (جنيه) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPurchaseCost}
                    onChange={(e) => setNewPurchaseCost(e.target.value)}
                    placeholder="سعر شراء الفاتورة الأساسية"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">التكاليف الرأسمالية الإضافية (تجهيز، شحن، جمارك)</label>
                  <input
                    type="number"
                    value={newAddCosts}
                    onChange={(e) => setNewAddCosts(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">تاريخ الشراء والاقتناء *</label>
                  <input
                    type="date"
                    required
                    value={newPurchaseDate}
                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">العمر الإنتاجي بالسنوات *</label>
                  <input
                    type="number"
                    required
                    value={newUsefulLife}
                    onChange={(e) => setNewUsefulLife(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">قيمة الخردة المقدرة (الإنقاذ) *</label>
                  <input
                    type="number"
                    required
                    value={newSalvageValue}
                    onChange={(e) => setNewSalvageValue(e.target.value)}
                    placeholder="قيمة الأصل بعد نهاية عمره الإنتاجي"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">طريقة الإهلاك المحاسبي</label>
                  <select
                    value={newDepMethod}
                    onChange={(e) => setNewDepMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="straight_line">القسط الثابت (Straight Line)</option>
                    <option value="declining_balance">القسط المتناقص (Declining Balance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">موقع وجود الأصل الثابت</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="مثال: مستودع أكتوبر، فرع الدقي"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">المورد / البائع</label>
                  <select
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">اختر مورد...</option>
                    {contacts.filter(c => c.type === 'vendor').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">القسم المسند إليه الأصل</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">اختر القسم...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">الموظف المسؤول (العهدة)</label>
                  <select
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">اختر الموظف...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name || e.full_name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">وصف الأصل الثابت وملاحظات إضافية</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ملاحظات العهدة أو أي مواصفات تقنية..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold"
                >
                  {editingAsset ? 'حفظ التعديلات' : 'حفظ وتسجيل الأصل بقيد محاسبي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RUN MONTHLY DEPRECIATION */}
      {showDepreciateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/40">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw size={16} className="text-purple-400 animate-spin" />
                تشغيل عملية الإهلاك الشهري المحاسبي
              </h2>
              <button onClick={() => setShowDepreciateModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleRunDepreciation} className="p-6 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                سيقوم النظام باحتساب قيمة الإهلاك الشهري لجميع الأصول الثابتة النشطة في الشركة للفترة والفرع المختار، وإجراء القيود المحاسبية وتعديل مجمع الإهلاك في شجرة الحسابات تلقائياً.
              </p>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">تاريخ نهاية فترة الاحتساب *</label>
                <input
                  type="date"
                  required
                  value={depPeriodDate}
                  onChange={(e) => setDepPeriodDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepreciateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold"
                >
                  تأكيد واحتساب الإهلاك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPOSE / SELL FIXED ASSET */}
      {showDisposeModal && selectedAssetForDisposal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/40">
              <h2 className="text-sm font-bold text-white">
                استبعاد وتصرف في الأصل: {selectedAssetForDisposal.name}
              </h2>
              <button onClick={() => setShowDisposeModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleDisposeAsset} className="p-6 space-y-4">
              
              <div className="p-3 bg-slate-900/60 rounded-xl space-y-2 border border-slate-700 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>التكلفة الرأسمالية:</span>
                  <span className="text-white font-bold">{selectedAssetForDisposal.total_cost.toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between">
                  <span>مجمع الإهلاك الحالي:</span>
                  <span className="text-purple-400 font-bold">{selectedAssetForDisposal.accumulated_depreciation.toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي القيمة الدفترية:</span>
                  <span className="text-emerald-400 font-bold">{selectedAssetForDisposal.net_book_value.toLocaleString()} جنيه</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">نوع الاستبعاد والتصرف *</label>
                <select
                  value={disposalType}
                  onChange={(e) => setDisposalType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="sale">بيع الأصل (Sale of Asset)</option>
                  <option value="write_off">شطب وإتلاف (Write-Off / Scrap)</option>
                </select>
              </div>

              {disposalType === 'sale' && (
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">سعر البيع الفعلي (جنيه) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={saleAmount}
                    onChange={(e) => {
                      setSaleAmount(e.target.value);
                    }}
                    placeholder="قيمة البيع"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                  {saleAmount && (
                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                      <span>الربح/الخسارة الرأسمالية المقدرة:</span>
                      <span className={Number(saleAmount) - selectedAssetForDisposal.net_book_value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {(Number(saleAmount) - selectedAssetForDisposal.net_book_value).toLocaleString()} جنيه
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">تاريخ الاستبعاد *</label>
                <input
                  type="date"
                  required
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">السبب / الملاحظات</label>
                <textarea
                  value={disposalNotes}
                  onChange={(e) => setDisposalNotes(e.target.value)}
                  placeholder="سبب البيع أو ظروف التلف والإتلاف..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisposeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs text-white font-semibold"
                >
                  تأكيد الاستبعاد وتوليد المعاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
