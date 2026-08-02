import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../types/roles';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShippingTransactionForm } from '../components/shipping/ShippingTransactionForm';
import { ShippingSummary } from '../components/shipping/ShippingSummary';
import { 
  Scale, 
  Coins, 
  History, 
  Plus, 
  Layers, 
  Calendar, 
  User, 
  FileText, 
  TrendingUp, 
  Tag,
  Filter,
  CheckCircle,
  AlertCircle,
  Truck,
  FilterX,
  Sparkles,
  Users,
  Briefcase,
  Percent,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Box,
  X,
  ChevronRight,
  ChevronLeft,
  Sliders,
  UserCheck,
  Printer,
  Edit,
  Trash2
} from 'lucide-react';

interface ScrapMaterial {
  id: string;
  name: string;
  category?: string;
  unit: string;
  current_price: number;
  is_active: boolean;
  description?: string;
}

interface ScrapInventory {
  id: string;
  material_id: string;
  material_name: string;
  material_category?: string;
  weight_kg: number;
  gross_weight_kg?: number;
  tare_weight_kg?: number;
  calculated_net_weight_kg?: number;
  impurity_deduction_kg?: number;
  unit_price: number;
  total_value: number;
  quality: 'raw' | 'sorted' | 'processed';
  supplier_id: string;
  supplier_name: string;
  contractor_name?: string;
  driver_name?: string;
  truck_number?: string;
  scale_ticket_no?: string;
  broker_name?: string;
  commission_per_ton?: number;
  commission_total?: number;
  purchase_date: string;
  notes: string;
}

interface ScrapTransaction {
  id: string;
  material_id: string;
  material_name: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'loss' | 'sorting';
  weight_kg: number;
  gross_weight_kg?: number;
  tare_weight_kg?: number;
  impurity_deduction_kg?: number;
  unit_price: number;
  total_amount: number;
  scale_ticket_no?: string;
  truck_number?: string;
  driver_name?: string;
  broker_name?: string;
  commission_total?: number;
  transaction_date: string;
  contact_id?: string;
  contact_name?: string;
  notes: string;
}

interface ScrapCommission {
  id: string;
  broker_name: string;
  scale_ticket_no: string;
  material_name: string;
  weight_tons: string;
  rate_per_ton: number;
  total_commission: number;
  date: string;
  status: 'pending' | 'paid';
  notes: string;
}

interface ScrapSummary {
  materials: Array<{
    material_id: string;
    material_name: string;
    total_weight: number;
    total_value: number;
    current_price: number;
    items_count: number;
  }>;
  summary: {
    total_weight: number;
    total_value: number;
    materials_count: number;
  };
}

export const ScrapView: React.FC<{ defaultTab?: 'dashboard' | 'weighbridge' | 'sorting' | 'commissions' | 'expenses' | 'inventory' | 'slag_shipments' | 'materials' | 'transactions' }> = ({ defaultTab }) => {
  const { user } = useContext(AuthContext);
  const isAdmin = !user || 
    user.role === UserRole.ADMIN || 
    user.role === UserRole.MANAGER || 
    user.role === UserRole.WAREHOUSE || 
    user.role === UserRole.ACCOUNTANT || 
    ['admin', 'manager', 'warehouse', 'accountant', 'owner'].includes(String(user.role || '').toLowerCase());

  const initialTab = defaultTab === 'transactions' ? 'weighbridge' : (defaultTab || 'dashboard');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'weighbridge' | 'sorting' | 'commissions' | 'expenses' | 'inventory' | 'slag_shipments' | 'materials'>(initialTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab === 'transactions' ? 'weighbridge' : (defaultTab as any));
    }
  }, [defaultTab]);

  const [materials, setMaterials] = useState<ScrapMaterial[]>([]);
  const [inventory, setInventory] = useState<ScrapInventory[]>([]);
  const [transactions, setTransactions] = useState<ScrapTransaction[]>([]);
  const [commissions, setCommissions] = useState<ScrapCommission[]>([]);
  const [slagShipments, setSlagShipments] = useState<any[]>([]);
  const [scrapExpenses, setScrapExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<ScrapSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'info' | 'warning'>('info');

  // Interactive Data Entry Modal States
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [scaleWizardStep, setScaleWizardStep] = useState<1 | 2 | 3>(1);
  const [sortingModalOpen, setSortingModalOpen] = useState(false);
  const [slagModalOpen, setSlagModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [scrapExpenseModalOpen, setScrapExpenseModalOpen] = useState(false);

  const DEFAULT_EXPENSE_CATEGORIES = [
    'إيجارات أراضي ومستودعات الخردة',
    'إيجار معدات وآلات (أوناش، لودرات، مكابس)',
    'كهرباء ومياه وخدمات المرافق',
    'مواصلات ونولون ونقل الشحنات',
    'صيانة موازين البسكول والمعدات',
    'وقود ومحروقات طاقة التشغيل',
    'أجور وإكراميات عمالة الفرز والتكبيس',
    'رسوم ميزان ورخص وإخراج',
    'عمولات ووساطة لوجستية',
    'مصاريف إدارية ومكتبية'
  ];

  const DEFAULT_DEPARTMENTS = [
    'قسم ميزان البسكول',
    'صالة الفرز والتصنيف',
    'فرع الورشة والمكابس',
    'الأسطول والخدمات اللوجستية',
    'المخزن الرئيسي والمستودعات',
    'الإدارة العامة والمكتب'
  ];

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('scrap_expense_categories');
    if (!saved) return DEFAULT_EXPENSE_CATEGORIES;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.includes('إيجار معدات وآلات (أوناش، لودرات، مكابس)')) {
        parsed.splice(1, 0, 'إيجار معدات وآلات (أوناش، لودرات، مكابس)');
      }
      return parsed;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  });

  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('scrap_expense_departments');
    return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
  });

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const [newDepartmentInput, setNewDepartmentInput] = useState('');
  const [showAddDepartmentInput, setShowAddDepartmentInput] = useState(false);

  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('all');
  const [expenseFilterDepartment, setExpenseFilterDepartment] = useState<string>('all');

  // Scrap Expense Form State
  const [scrapExpenseForm, setScrapExpenseForm] = useState({
    amount: '',
    category: 'إيجارات أراضي ومستودعات الخردة',
    department: 'قسم ميزان البسكول',
    description: '',
    payee: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Weighbridge Form States
  const [contacts, setContacts] = useState<any[]>([]);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [expenseReportModalOpen, setExpenseReportModalOpen] = useState(false);
  const [newBuyerForm, setNewBuyerForm] = useState({
    name: '',
    phone: '',
    tax_no: '',
    address: '',
    buyer_type: 'مصنع صلب ومسبك'
  });

  const [vaults, setVaults] = useState<any[]>([]);
  const [weighbridgeForm, setWeighbridgeForm] = useState({
    transaction_type: 'purchase' as 'purchase' | 'sale',
    material_id: '',
    vault_id: '',
    scale_ticket_no: '',
    gross_weight_kg: '',
    tare_weight_kg: '',
    deduction_type: 'kg' as 'kg' | 'percentage',
    impurity_deduction_kg: '',
    impurity_percentage: '',
    unit_price: '',
    contractor_name: '',
    buyer_name: '',
    buyer_phone: '',
    buyer_tax_no: '',
    driver_name: '',
    truck_number: '',
    broker_name: '',
    commission_per_ton: '',
    purchase_date: new Date().toISOString().split('T')[0],
    quality: 'raw' as 'raw' | 'sorted' | 'processed',
    notes: ''
  });

  // Sorting Form States
  const [sortingForm, setSortingForm] = useState({
    source_inventory_id: '',
    sorted_weight_kg: '',
    outputs: [{ material_id: '', weight_kg: '', unit_price: '' }],
    notes: ''
  });

  // New Material Form States
  const [newMaterialForm, setNewMaterialForm] = useState({
    name: '',
    category: 'حديد',
    unit: 'كجم',
    current_price: '',
    description: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    material_id: '',
    date_from: '',
    date_to: ''
  });

  // Edit & Action Modal States
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editTxModalOpen, setEditTxModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editExpenseModalOpen, setEditExpenseModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editMaterialModalOpen, setEditMaterialModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<any | null>(null);
  const [editCommissionModalOpen, setEditCommissionModalOpen] = useState(false);
  const [editingSlag, setEditingSlag] = useState<any | null>(null);
  const [editSlagModalOpen, setEditSlagModalOpen] = useState(false);

  // Material Handlers
  const handleSaveEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام (Admin) المخول بذلك.');
      return;
    }
    if (!editingMaterial) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/scrap/materials/${editingMaterial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMaterial)
      });
      const data = await res.json();
      if (res.ok) {
        setModalTitle('✅ نجاح التعديل');
        setModalMessage('تم تعديل صنف الخردة بنجاح');
        setModalType('success');
        setModalOpen(true);
        setEditMaterialModalOpen(false);
        fetchMaterials();
      } else {
        throw new Error(data.error || 'فشل التعديل');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام المخول بذلك.');
      return;
    }
    if (!window.confirm(`هل أنت تأكد من حذف صنف الخردة (${name})؟`)) return;
    try {
      const res = await fetch(`/api/scrap/materials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalTitle('🗑️ تم الحذف');
        setModalMessage(`تم حذف صنف الخردة (${name}) بنجاح`);
        setModalType('success');
        setModalOpen(true);
        fetchMaterials();
        fetchSummary();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSingleMaterial = (mat: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة التلقائية.');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بطاقة صنف خردة معتمدة - ${mat.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .card { border: 2px solid #7c3aed; border-radius: 12px; padding: 20px; max-width: 650px; margin: 0 auto; }
          .header { border-bottom: 2px solid #f3e8ff; padding-bottom: 12px; margin-bottom: 15px; text-align: center; }
          .title { font-size: 20px; font-weight: 800; color: #581c87; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .label { font-size: 11px; color: #64748b; margin-bottom: 3px; font-weight: 600; }
          .value { font-size: 14px; font-weight: 700; color: #0f172a; }
          .price-banner { background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 20px; }
          .price-val { font-size: 24px; font-weight: 900; color: #15803d; }
          .sig-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 5px; font-weight: 700; color: #475569; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="title">🏷️ بطاقة تعريف ومعايرة صنف خردة</div>
            <div style="font-size: 12px; color: #64748b;">شركة بروميت للصناعات المعدنية ومستودع الخردة</div>
          </div>
          <div class="grid">
            <div class="box">
              <div class="label">كود/معرف الصنف:</div>
              <div class="value">${mat.id}</div>
            </div>
            <div class="box">
              <div class="label">اسم الصنف المعاير:</div>
              <div class="value">${mat.name}</div>
            </div>
            <div class="box">
              <div class="label">الفئة الأساسية:</div>
              <div class="value">${mat.category || 'عام'}</div>
            </div>
            <div class="box">
              <div class="label">وحدة القياس المعتمدة:</div>
              <div class="value">${mat.unit || 'طن'}</div>
            </div>
          </div>
          <div class="price-banner">
            <div style="font-size: 12px; color: #166534; font-weight: 700;">السعر الرسمي المعتمد للتوزين:</div>
            <div class="price-val">${Number(mat.current_price || 0).toLocaleString()} ج.م / ${mat.unit || 'طن'}</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px;">
            <div><div className="sig-line">مدير جودة ومواصفات الخردة</div></div>
            <div><div className="sig-line">اعتماد إدارة الموازين والحسابات</div></div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Commission Edit Handler
  const handleSaveEditCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام (Admin) المخول بذلك.');
      return;
    }
    if (!editingCommission) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/scrap/commissions/${editingCommission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCommission)
      });
      const data = await res.json();
      if (res.ok) {
        setModalTitle('✅ نجاح التعديل');
        setModalMessage('تم تعديل بيانات العمولة بنجاح');
        setModalType('success');
        setModalOpen(true);
        setEditCommissionModalOpen(false);
        fetchCommissions();
      } else {
        throw new Error(data.error || 'فشل التعديل');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Slag Edit Handler
  const handleSaveEditSlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام (Admin) المخول بذلك.');
      return;
    }
    if (!editingSlag) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/shipping/transactions/${editingSlag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSlag)
      });
      const data = await res.json();
      if (res.ok) {
        setModalTitle('✅ نجاح التعديل');
        setModalMessage('تم تعديل شحنة الجلخ/الخرس بنجاح');
        setModalType('success');
        setModalOpen(true);
        setEditSlagModalOpen(false);
        fetchSlagShipments();
      } else {
        throw new Error(data.error || 'فشل التعديل');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handlers for Edit, Delete, and Print
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام (Admin) المخول بذلك.');
      return;
    }
    if (!editingTx) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/scrap/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTx)
      });
      const data = await res.json();
      if (res.ok) {
        setModalTitle('✅ نجاح التعديل');
        setModalMessage('تم تعديل كارتة الميزان بنجاح');
        setModalType('success');
        setModalOpen(true);
        setEditTxModalOpen(false);
        fetchTransactions();
      } else {
        throw new Error(data.error || 'فشل التعديل');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteTx = async (id: string, ticketNo: string) => {
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام المخول بذلك.');
      return;
    }
    if (!window.confirm(`هل أنت تأكد من رغبتك في حذف السجل / كارتة الميزان رقم #${ticketNo}؟`)) return;
    try {
      const res = await fetch(`/api/scrap/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalTitle('🗑️ تم الحذف');
        setModalMessage(`تم حذف السجل #${ticketNo} بنجاح من الميزان والمستودع`);
        setModalType('success');
        setModalOpen(true);
        fetchTransactions();
        fetchInventory();
        fetchSummary();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSingleTicket = (tx: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة التلقائية. يُرجى السماح بالنوافذ المنبثقة.');
      return;
    }

    const gross = Number(tx.gross_weight_kg || 0);
    const tare = Number(tx.tare_weight_kg || 0);
    const calculatedNet = gross > 0 && tare > 0 ? (gross - tare) : Number(tx.weight_kg || 0);
    const impurity = Number(tx.impurity_deduction_kg || 0);
    const payableNet = Number(tx.weight_kg || 0);
    const totalAmount = Number(tx.total_amount || 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كارتة ميزان بسكول - #${tx.scale_ticket_no || tx.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .ticket-card { border: 2px solid #6d28d9; border-radius: 12px; padding: 20px; max-width: 750px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #581c87; }
          .ticket-no { font-size: 16px; font-weight: 800; color: #7c3aed; background: #f3e8ff; padding: 4px 12px; border-radius: 6px; font-family: monospace; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
          .label { font-size: 11px; color: #64748b; margin-bottom: 3px; font-weight: 600; }
          .value { font-size: 13px; font-weight: 700; color: #0f172a; }
          .weights-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
          .weights-table th, .weights-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 12px; }
          .weights-table th { background: #f1f5f9; color: #334155; font-weight: 700; }
          .highlight-net { background: #ecfdf5; font-weight: 800; color: #047857; font-size: 14px; }
          .footer-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 30px; text-align: center; font-size: 11px; }
          .sig-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 5px; font-weight: 700; color: #475569; }
        </style>
      </head>
      <body>
        <div class="ticket-card">
          <div class="header">
            <div>
              <div class="title">⚖️ شركة بروميت للصناعات المعدنية والخردة</div>
              <div style="font-size: 11px; color: #64748b;">إيصال كارتة ميزان بسكول معتمدة - قسم مخزون الخردة</div>
            </div>
            <div class="ticket-no">كارتة #${tx.scale_ticket_no || tx.id}</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">📅 تاريخ التوزين والمعاملة:</div>
              <div class="value">${tx.transaction_date || '—'}</div>
            </div>
            <div class="box">
              <div class="label">🔄 نوع الحركة:</div>
              <div class="value">${tx.transaction_type === 'sale' ? '📤 بيع وتصريف خردة' : '📥 شراء واستلام خردة'}</div>
            </div>
            <div class="box">
              <div class="label">📦 اسم المادة / الصنف:</div>
              <div class="value">${tx.material_name || 'خردة'}</div>
            </div>
            <div class="box">
              <div class="label">👤 المقاول / الشركة / العميل:</div>
              <div class="value">${tx.contact_name || tx.contractor_name || tx.buyer_name || '—'}</div>
            </div>
            <div class="box">
              <div class="label">🚚 رقم الشاحنة / اللوحة:</div>
              <div class="value">${tx.truck_number || '—'}</div>
            </div>
            <div class="box">
              <div class="label">🧑‍✈️ اسم السائق:</div>
              <div class="value">${tx.driver_name || '—'}</div>
            </div>
          </div>

          <table class="weights-table">
            <thead>
              <tr>
                <th>الوزن القائم (حمولة)</th>
                <th>الوزن الفارغ</th>
                <th>الوزن الصافي المبدئي</th>
                <th>خصم الشوائب والرطوبة</th>
                <th>الوزن الصافي المعتمد (الصافي)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${gross ? gross.toLocaleString() + ' طن' : '—'}</td>
                <td>${tare ? tare.toLocaleString() + ' طن' : '—'}</td>
                <td>${calculatedNet.toLocaleString()} طن</td>
                <td style="color: #b45309; font-weight: 700;">${impurity ? impurity.toLocaleString() + ' طن' : '0 طن'}</td>
                <td class="highlight-net">${payableNet.toLocaleString()} طن</td>
              </tr>
            </tbody>
          </table>

          <div class="grid">
            <div class="box" style="background: #fdf4ff; border-color: #f0abfc;">
              <div class="label" style="color: #86198f;">💵 سعر الطن المعتمد:</div>
              <div class="value" style="color: #701a75; font-size: 15px;">${Number(tx.unit_price || 0).toLocaleString()} ج.م / طن</div>
            </div>
            <div class="box" style="background: #f0fdf4; border-color: #86efac;">
              <div class="label" style="color: #14532d;">💰 إجمالي القيمة المستحقة:</div>
              <div class="value" style="color: #15803d; font-size: 16px;">${totalAmount.toLocaleString()} ج.م</div>
            </div>
          </div>

          ${tx.broker_name ? `
            <div class="box" style="margin-bottom: 15px; background: #fffbeb; border-color: #fde68a;">
              <div class="label" style="color: #92400e;">🤝 السمسار / الوسيط:</div>
              <div class="value" style="color: #78350f;">${tx.broker_name} (عمولة إجمالية: ${Number(tx.commission_total || 0).toLocaleString()} ج.م)</div>
            </div>
          ` : ''}

          ${tx.notes ? `<div style="font-size: 11px; color: #475569; margin-bottom: 10px;">📝 <b>ملاحظات:</b> ${tx.notes}</div>` : ''}

          <div class="footer-signatures">
            <div>
              <div>مسؤول ميزان البسكول</div>
              <div class="sig-line">التوقيع والختم</div>
            </div>
            <div>
              <div>سائق الشاحنة / الناقل</div>
              <div class="sig-line">التوقيع</div>
            </div>
            <div>
              <div>مدير مستودع الخردة</div>
              <div class="sig-line">التوقيع والموافقة</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام (Admin) المخول بذلك.');
      return;
    }
    if (!editingExpense) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpense)
      });
      if (res.ok) {
        setModalTitle('✅ نجاح التعديل');
        setModalMessage('تم تعديل قيد المصروف بنجاح');
        setModalType('success');
        setModalOpen(true);
        setEditExpenseModalOpen(false);
        fetchScrapExpenses();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل التعديل');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام المخول بذلك.');
      return;
    }
    if (!window.confirm('هل أنت تأكد من حذف هذا المصروف؟')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalTitle('🗑️ تم الحذف');
        setModalMessage('تم حذف قيد المصروف بنجاح');
        setModalType('success');
        setModalOpen(true);
        fetchScrapExpenses();
        fetchSummary();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSingleExpense = (exp: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة التلقائية. يُرجى السماح بالنوافذ المنبثقة.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>سند صرف مصروف تشغيلي - #${exp.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .voucher-card { border: 2px solid #be123c; border-radius: 12px; padding: 20px; max-width: 700px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #881337; }
          .voucher-no { font-size: 14px; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 4px 12px; border-radius: 6px; font-family: monospace; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
          .label { font-size: 11px; color: #64748b; margin-bottom: 3px; font-weight: 600; }
          .value { font-size: 13px; font-weight: 700; color: #0f172a; }
          .amount-banner { background: #fff1f2; border: 2px solid #fecdd3; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 20px; }
          .amount-val { font-size: 22px; font-weight: 900; color: #be123c; }
          .footer-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 35px; text-align: center; font-size: 11px; }
          .sig-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 5px; font-weight: 700; color: #475569; }
        </style>
      </head>
      <body>
        <div class="voucher-card">
          <div class="header">
            <div>
              <div class="title">💸 إيصال سند صرف نفقات تشغيلية</div>
              <div style="font-size: 11px; color: #64748b;">قسم الخردة وميزان البسكول - شركة بروميت</div>
            </div>
            <div class="voucher-no">سند #${exp.id}</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">📅 تاريخ الصرف:</div>
              <div class="value">${exp.expense_date || exp.expenseDate || '—'}</div>
            </div>
            <div class="box">
              <div class="label">🏢 القسم المستفيد:</div>
              <div class="value">${exp.department || 'قسم ميزان البسكول'}</div>
            </div>
            <div class="box">
              <div class="label">🏷️ بند المصروف:</div>
              <div class="value">${exp.category || 'مصاريف تشغيل خردة'}</div>
            </div>
            <div class="box">
              <div class="label">👤 المستفيد / الجهة / المورد:</div>
              <div class="value">${exp.payee || '—'}</div>
            </div>
            <div class="box">
              <div class="label">💳 طريقة الدفع:</div>
              <div class="value">${exp.payment_method === 'bank' ? 'تحويل بنكي' : 'نقداً من الخزينة'}</div>
            </div>
            <div class="box">
              <div class="label">📝 البيان والسبب:</div>
              <div class="value">${exp.description || exp.notes || '—'}</div>
            </div>
          </div>

          <div class="amount-banner">
            <div style="font-size: 12px; color: #9f1239; font-weight: 700; margin-bottom: 4px;">إجمالي المبلغ المدفوع:</div>
            <div class="amount-val">${Number(exp.amount || 0).toLocaleString()} ج.م</div>
          </div>

          <div class="footer-signatures">
            <div>
              <div>المستلم / المستفيد</div>
              <div class="sig-line">التوقيع والاسم</div>
            </div>
            <div>
              <div>المحاسب المسؤول</div>
              <div class="sig-line">التوقيع</div>
            </div>
            <div>
              <div>المدير العام / الاعتماد</div>
              <div class="sig-line">التوقيع بالموافقة</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDeleteCommission = async (id: string, brokerName: string) => {
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام المخول بذلك.');
      return;
    }
    if (!window.confirm(`هل أنت تأكد من حذف عمولة السمسار (${brokerName})؟`)) return;
    try {
      const res = await fetch(`/api/scrap/commissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalTitle('🗑️ تم الحذف');
        setModalMessage('تم حذف قيد العمولة بنجاح');
        setModalType('success');
        setModalOpen(true);
        fetchCommissions();
        fetchSummary();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSingleCommission = (comm: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة التلقائية.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>سند عمولة سمسار - #${comm.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .comm-card { border: 2px solid #d97706; border-radius: 12px; padding: 20px; max-width: 700px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fef3c7; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #92400e; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
          .box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; }
          .label { font-size: 11px; color: #78350f; margin-bottom: 3px; font-weight: 600; }
          .value { font-size: 13px; font-weight: 700; color: #451a03; }
          .amount-banner { background: #fef3c7; border: 2px solid #fcd34d; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 20px; }
          .amount-val { font-size: 22px; font-weight: 900; color: #b45309; }
          .footer-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 35px; text-align: center; font-size: 11px; }
          .sig-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 5px; font-weight: 700; color: #475569; }
        </style>
      </head>
      <body>
        <div class="comm-card">
          <div class="header">
            <div>
              <div class="title">🤝 إيصال صرف عمولة ووساطة خردة</div>
              <div style="font-size: 11px; color: #78350f;">شركة بروميت للصناعات المعدنية والخردة</div>
            </div>
            <div style="font-size: 14px; font-weight: bold; color: #b45309;">كارتة ميزان #${comm.scale_ticket_no || '—'}</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">🤝 اسم السمسار / الوسيط:</div>
              <div class="value">${comm.broker_name}</div>
            </div>
            <div class="box">
              <div class="label">📅 التاريخ:</div>
              <div class="value">${comm.date || '—'}</div>
            </div>
            <div class="box">
              <div class="label">📦 المادة / الصنف:</div>
              <div class="value">${comm.material_name || 'خردة'}</div>
            </div>
            <div class="box">
              <div class="label">⚖️ الوزن الإجمالي للشحنة:</div>
              <div class="value">${comm.weight_tons} طن</div>
            </div>
            <div class="box">
              <div class="label">💵 معدل العمولة المتفق عليه:</div>
              <div class="value">${comm.rate_per_ton} ج.م / طن</div>
            </div>
            <div class="box">
              <div class="label">📝 ملاحظات:</div>
              <div class="value">${comm.notes || '—'}</div>
            </div>
          </div>

          <div class="amount-banner">
            <div style="font-size: 12px; color: #92400e; font-weight: 700; margin-bottom: 4px;">صافي قيمة العمولة المستحقة للسمسار:</div>
            <div class="amount-val">${Number(comm.total_commission || 0).toLocaleString()} ج.م</div>
          </div>

          <div class="footer-signatures">
            <div>
              <div>توقيع السمسار / الوسيط</div>
              <div class="sig-line">الاسم والتوقيع</div>
            </div>
            <div>
              <div>اعتماد إدارة الخردة والحسابات</div>
              <div class="sig-line">التوقيع</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDeleteSlagShipment = async (id: string) => {
    if (!isAdmin) {
      alert('عذراً، عمليات التعديل والحذف مقتصرة حصرياً على مسؤول النظام المخول بذلك.');
      return;
    }
    if (!window.confirm('هل أنت تأكد من حذف شحنة الخبث/الردم هذه؟')) return;
    try {
      const res = await fetch(`/api/shipping/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalTitle('🗑️ تم الحذف');
        setModalMessage('تم حذف الشحنة بنجاح');
        setModalType('success');
        setModalOpen(true);
        fetchSlagShipments();
        fetchSummary();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintSingleSlagShipment = (s: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة الطباعة التلقائية.');
      return;
    }

    const driver = s.driverName || s.driver_name || "غير محدد";
    const vehicle = s.vehicleNumber || s.car_number || "غير محدد";
    const qty = Number(s.loadQuantity !== undefined ? s.loadQuantity : (s.quantity !== undefined ? s.quantity : 0));
    const fPrice = Number(s.factoryPricePerTon !== undefined ? s.factoryPricePerTon : (s.factory_price_per_ton !== undefined ? s.factory_price_per_ton : 0));
    const totalSale = Number(s.totalSaleAmount !== undefined ? s.totalSaleAmount : (s.total_sales !== undefined ? s.total_sales : 0));
    const dateVal = s.transactionDate || s.date || "غير محدد";

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بوليصة شحنة جلخ وخرس - #${s.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .card { border: 2px solid #0891b2; border-radius: 12px; padding: 20px; max-width: 700px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cffaff; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #0e7490; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
          .box { background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 10px; }
          .label { font-size: 11px; color: #155e75; margin-bottom: 3px; font-weight: 600; }
          .value { font-size: 13px; font-weight: 700; color: #164e63; }
          .amount-banner { background: #cffaff; border: 2px solid #67e8f9; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 20px; }
          .amount-val { font-size: 22px; font-weight: 900; color: #0e7490; }
          .footer-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 35px; text-align: center; font-size: 11px; }
          .sig-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 5px; font-weight: 700; color: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <div class="title">🚚 بوليصة شحن ونقل الجلخ والخرس المعتمدة</div>
              <div style="font-size: 11px; color: #155e75;">شركة بروميت - قسم الشحن واللوجستيات</div>
            </div>
            <div style="font-size: 14px; font-weight: bold; color: #0891b2;">📅 ${dateVal}</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">👤 اسم السائق:</div>
              <div class="value">${driver}</div>
            </div>
            <div class="box">
              <div class="label">🚗 رقم الشاحنة / السيارة:</div>
              <div class="value">${vehicle}</div>
            </div>
            <div class="box">
              <div class="label">⚖️ وزن الحمولة:</div>
              <div class="value">${qty} طن</div>
            </div>
            <div class="box">
              <div class="label">💵 سعر الطن بالمصنع:</div>
              <div class="value">${fPrice} ج.م / طن</div>
            </div>
          </div>

          <div class="amount-banner">
            <div style="font-size: 12px; color: #155e75; font-weight: 700; margin-bottom: 4px;">إجمالي المبيعات / قيمة الشحنة:</div>
            <div class="amount-val">${totalSale.toLocaleString()} ج.م</div>
          </div>

          <div class="footer-signatures">
            <div>
              <div>توقيع السائق / الناقل</div>
              <div class="sig-line">الاسم والتوقيع</div>
            </div>
            <div>
              <div>توقيع مسؤول الشحن والبسكول</div>
              <div class="sig-line">التوقيع والاعتماد</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMaterials(),
        fetchInventory(),
        fetchTransactions(),
        fetchCommissions(),
        fetchSummary(),
        fetchSlagShipments(),
        fetchScrapExpenses(),
        fetchContacts(),
        fetchVaults()
      ]);
    } catch (err) {
      console.error('Error fetching scrap module data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaults = async () => {
    try {
      const res = await fetch('/api/treasury/vaults');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const active = data.data.filter((v: any) => v.is_active !== false);
        setVaults(active);
        if (active.length > 0) {
          const scrapV = active.find((v: any) => v.type === 'scrap_purchase') || active[0];
          setWeighbridgeForm(prev => prev.vault_id ? prev : { ...prev, vault_id: scrapV.id });
        }
      }
    } catch (err) {
      console.error('Error fetching vaults in ScrapView:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setContacts([]);
    }
  };

  const handleSaveNewBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerForm.name.trim()) return;
    setSubmitLoading(true);
    try {
      const payload = {
        name: newBuyerForm.name.trim(),
        phone: newBuyerForm.phone.trim(),
        email: '',
        address: newBuyerForm.address.trim(),
        type: 'customer',
        notes: `مشتري خردة - تصنيف: ${newBuyerForm.buyer_type} | س.ت/رقم ضريبي: ${newBuyerForm.tax_no}`
      };
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await fetchContacts();
        setWeighbridgeForm(prev => ({
          ...prev,
          contractor_name: saved.name || newBuyerForm.name,
          buyer_name: saved.name || newBuyerForm.name,
          buyer_phone: newBuyerForm.phone,
          buyer_tax_no: newBuyerForm.tax_no
        }));
        setBuyerModalOpen(false);
        setNewBuyerForm({ name: '', phone: '', tax_no: '', address: '', buyer_type: 'مصنع صلب ومسبك' });
        setModalTitle("✅ تم تسجيل بيانات المشتري بنجاح");
        setModalMessage(`تم إضافة العميل/المشتري (${payload.name}) بنجاح إلى قاعدة البيانات وتحديده لكارتة الميزان الحالية.`);
        setModalType("success");
        setModalOpen(true);
      } else {
        throw new Error('فشل إضافة المشتري');
      }
    } catch (err: any) {
      setModalTitle("❌ خطأ بالعملية");
      setModalMessage(err.message || 'حدث خطأ أثناء تسجيل المشتري');
      setModalType("warning");
      setModalOpen(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  const fetchScrapExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setScrapExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  const handlePrintExpensesPDF = () => {
    const filtered = scrapExpenses.filter((e: any) => 
      (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) &&
      (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)
    );

    const totalAmount = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setModalTitle("🖨️ طباعة وتصدير التقرير");
      setModalMessage("تعذر فتح نافذة الطباعة التلقائية. يُرجى التنشيط عبر زر معاينة التقرير الجاهز للطباعة.");
      setModalType("warning");
      setModalOpen(true);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير مصروفات ونفقات قسم الخردة وميزان البسكول - PDF</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            direction: rtl;
            padding: 30px;
            color: #111827;
            background: #ffffff;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #8b5cf6;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-badge {
            width: 44px;
            height: 44px;
            background: #7c3aed;
            color: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 20px;
          }
          .header h1 {
            font-size: 19px;
            margin: 0;
            color: #1e1b4b;
            font-weight: 800;
          }
          .header p {
            font-size: 11px;
            color: #6b7280;
            margin: 3px 0 0 0;
          }
          .badge-info {
            background: #f3e8ff;
            color: #6b21a8;
            border: 1px solid #d8b4fe;
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: bold;
            text-align: left;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 22px;
          }
          .summary-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 10px 14px;
            border-radius: 10px;
          }
          .summary-card label {
            font-size: 10px;
            color: #6b7280;
            font-weight: 600;
            display: block;
          }
          .summary-card .val {
            font-size: 16px;
            font-weight: 900;
            margin-top: 3px;
            display: block;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
          }
          th {
            background: #1e1b4b;
            color: #ffffff;
            font-weight: 700;
            padding: 9px 8px;
            text-align: right;
            border: 1px solid #1e1b4b;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 8px 8px;
            text-align: right;
            color: #1f2937;
          }
          tr:nth-child(even) td {
            background: #f9fafb;
          }
          .total-row td {
            background: #ffe4e6 !important;
            font-weight: 900;
            font-size: 12px;
            border-top: 2px solid #e11d48;
          }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #374151;
            border-top: 1px solid #e5e7eb;
            padding-top: 18px;
          }
          .no-print {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1f2937;
            padding: 10px 18px;
            border-radius: 12px;
            color: white;
          }
          .print-btn {
            padding: 8px 20px;
            background: #059669;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <span style="font-size: 12px; font-weight: bold;">🖨️ جاهز للطباعة والتصدير بصيغة PDF (اختر Save as PDF / حفظ كـ PDF في النافذة)</span>
          <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير / حفظ PDF</button>
        </div>

        <div class="header">
          <div class="header-title">
            <div class="logo-badge">♻️</div>
            <div>
              <h1>مؤسسة إدارة وتدوير الخردة وميزان البسكول</h1>
              <p>تقرير المصروفات والنفقات التشغيلية التفصيلي المعتمد</p>
            </div>
          </div>
          <div class="badge-info">
            <div>تاريخ الإصدار: ${dateStr}</div>
            <div>إجمالي القيود: ${filtered.length} قيد</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <label>القسم / الفرع المستفيد</label>
            <span class="val" style="color: #4338ca;">${expenseFilterDepartment === 'all' ? 'جميع الأقسام الفنّية' : expenseFilterDepartment}</span>
          </div>
          <div class="summary-card">
            <label>تصنيف بند المصروف</label>
            <span class="val" style="color: #7e22ce;">${expenseFilterCategory === 'all' ? 'جميع بنود المصروفات' : expenseFilterCategory}</span>
          </div>
          <div class="summary-card">
            <label>إجمالي المصروفات القائمة</label>
            <span class="val" style="color: #be123c;">${totalAmount.toLocaleString()} ج.م</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>القسم / الفرع المستفيد</th>
              <th>بند المصروف</th>
              <th>البيان / الشرح التفصيلي</th>
              <th>المستفيد / المورد</th>
              <th>المبلغ (ج.م)</th>
              <th>طريقة الدفع</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="9" style="text-align: center; color: #9ca3af; padding: 20px;">لا توجد قيود مصروفات مطابقة للتصفية الحالية.</td></tr>
            ` : filtered.map((e, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="font-family: monospace; font-weight: bold; color: #6b21a8;">${e.id || `#EXP-${i+1}`}</td>
                <td>${e.expense_date || e.expenseDate || '—'}</td>
                <td><strong>${e.department || 'قسم ميزان البسكول'}</strong></td>
                <td><span style="background: #ffe4e6; color: #9f1239; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${e.category || 'مصاريف تشغيل'}</span></td>
                <td>${e.description || e.notes || '—'}</td>
                <td><strong>${e.payee || e.vendor_name || 'سائق/مورد'}</strong></td>
                <td style="font-weight: 800; color: #be123c; font-size: 12px;">${Number(e.amount || 0).toLocaleString()} ج.م</td>
                <td>${e.payment_method === 'bank' ? 'تحويل بنكي' : 'نقداً (خزينة)'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="7" style="text-align: left; font-weight: 900; padding: 10px;">إجمالي المصروفات والنفقات بالتقرير:</td>
              <td style="color: #be123c; font-size: 14px; font-weight: 900;">${totalAmount.toLocaleString()} ج.م</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>
            <p><strong>توقيع أخصائي الحسابات:</strong> .....................................</p>
            <p style="font-size: 10px; color: #9ca3af; margin-top: 3px;">تاريخ الاعتماد: ____ / ____ / ________</p>
          </div>
          <div>
            <p><strong>اعتماد مدير قسم الخردة والتشغيل:</strong> .....................................</p>
            <p style="font-size: 10px; color: #9ca3af; margin-top: 3px;">خاتم المؤسسة المعتمد</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddCustomCategory = () => {
    if (!newCategoryInput.trim()) return;
    const catName = newCategoryInput.trim();
    if (!expenseCategories.includes(catName)) {
      const updated = [...expenseCategories, catName];
      setExpenseCategories(updated);
      localStorage.setItem('scrap_expense_categories', JSON.stringify(updated));
    }
    setScrapExpenseForm(prev => ({ ...prev, category: catName }));
    setNewCategoryInput('');
    setShowAddCategoryInput(false);
  };

  const handleAddCustomDepartment = () => {
    if (!newDepartmentInput.trim()) return;
    const deptName = newDepartmentInput.trim();
    if (!departments.includes(deptName)) {
      const updated = [...departments, deptName];
      setDepartments(updated);
      localStorage.setItem('scrap_expense_departments', JSON.stringify(updated));
    }
    setScrapExpenseForm(prev => ({ ...prev, department: deptName }));
    setNewDepartmentInput('');
    setShowAddDepartmentInput(false);
  };

  const handleCreateScrapExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapExpenseForm.amount || Number(scrapExpenseForm.amount) <= 0) {
      setModalTitle("⚠️ إدخال غير مكتمل");
      setModalMessage("يرجى إدخال قيمة المصروف بشكل صحيح.");
      setModalType("warning");
      setModalOpen(true);
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = {
        amount: Number(scrapExpenseForm.amount),
        category: scrapExpenseForm.category || 'مصاريف تشغيل الخردة',
        department: scrapExpenseForm.department || 'قسم ميزان البسكول',
        description: scrapExpenseForm.description || `مصروف خردة - ${scrapExpenseForm.category}`,
        payee: scrapExpenseForm.payee || 'سائق / مورد خدمات',
        expense_date: scrapExpenseForm.expense_date,
        payment_method: 'cash',
        activity: 'scrap',
        notes: scrapExpenseForm.notes
      };
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setScrapExpenseModalOpen(false);
        setModalTitle("✅ تم تسجيل مصروف الخردة بنجاح");
        setModalMessage(`تم قيد المصروف بقيمة ${Number(scrapExpenseForm.amount).toLocaleString()} ج.م لقسم (${scrapExpenseForm.department}) - بند (${scrapExpenseForm.category}).`);
        setModalType("success");
        setModalOpen(true);
        setScrapExpenseForm({
          amount: '',
          category: expenseCategories[0] || 'إيجارات أراضي ومستودعات الخردة',
          department: departments[0] || 'قسم ميزان البسكول',
          description: '',
          payee: '',
          expense_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchScrapExpenses();
      } else {
        throw new Error('فشل تسجيل المصروف');
      }
    } catch (err: any) {
      setModalTitle("❌ خطأ بالعملية");
      setModalMessage(err.message || 'حدث خطأ غير متوقع أثناء حفظ المصروف.');
      setModalType("warning");
      setModalOpen(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/scrap/materials');
      const data = await res.json();
      const arrayData = Array.isArray(data) ? data : [];
      setMaterials(arrayData);
      if (arrayData.length > 0 && !weighbridgeForm.material_id) {
        setWeighbridgeForm(prev => ({ 
          ...prev, 
          material_id: arrayData[0].id,
          unit_price: String(arrayData[0].current_price || '') 
        }));
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      setMaterials([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/scrap/inventory');
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setInventory([]);
    }
  };

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.material_id) queryParams.append('material_id', filters.material_id);
      if (filters.date_from) queryParams.append('date_from', filters.date_from);
      if (filters.date_to) queryParams.append('date_to', filters.date_to);

      const res = await fetch(`/api/scrap/transactions?${queryParams.toString()}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await fetch('/api/scrap/commissions');
      const data = await res.json();
      setCommissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching commissions:', err);
      setCommissions([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/scrap/reports/summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary(null);
    }
  };

  const fetchSlagShipments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/shipping/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSlagShipments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching slag shipments:', err);
      setSlagShipments([]);
    }
  };

  // Handlers
  const handleMaterialChange = (matId: string) => {
    const selectedMat = materials.find(m => String(m.id) === String(matId));
    setWeighbridgeForm(prev => ({
      ...prev,
      material_id: matId,
      unit_price: selectedMat ? String(selectedMat.current_price) : prev.unit_price
    }));
  };

  const handleAddWeighbridgeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scrap/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weighbridgeForm)
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(result.message || '✅ تم توزين وتسجيل شحنة الخردة بنجاح وتوليد القيود والعمولات');
        setScaleModalOpen(false);
        // Reset form
        setWeighbridgeForm(prev => ({
          ...prev,
          scale_ticket_no: '',
          gross_weight_kg: '',
          tare_weight_kg: '',
          impurity_deduction_kg: '',
          impurity_percentage: '',
          contractor_name: '',
          driver_name: '',
          truck_number: '',
          broker_name: '',
          commission_per_ton: '',
          notes: ''
        }));
        await Promise.all([
          fetchInventory(),
          fetchTransactions(),
          fetchCommissions(),
          fetchSummary()
        ]);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(result.error || '❌ فشل تسجيل شحنة الميزان');
      }
    } catch (err) {
      setErrorMessage('❌ حدث خطأ غير متوقع أثناء الاتصال بالخادم');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleProcessSorting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        source_inventory_id: sortingForm.source_inventory_id,
        sorted_weight_kg: Number(sortingForm.sorted_weight_kg || 0) * 1000,
        outputs: sortingForm.outputs.map(o => ({
          ...o,
          weight_kg: Number(o.weight_kg || 0) * 1000
        })),
        notes: sortingForm.notes
      };

      const res = await fetch('/api/scrap/sorting/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(result.message || '✅ تم فرز وتصنيف الشحنة بنجاح');
        setSortingModalOpen(false);
        setSortingForm({
          source_inventory_id: '',
          sorted_weight_kg: '',
          outputs: [{ material_id: materials[0]?.id || '', weight_kg: '', unit_price: '' }],
          notes: ''
        });
        await Promise.all([
          fetchInventory(),
          fetchTransactions(),
          fetchSummary()
        ]);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(result.error || '❌ فشل تنفيذ عملية الفرز');
      }
    } catch (err) {
      setErrorMessage('❌ حدث خطأ غير متوقع أثناء الاتصال بالخادم');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddNewMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scrap/materials/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterialForm)
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMessage(result.message || '✅ تم تسجيل المادة الجديدة بنجاح');
        setMaterialModalOpen(false);
        setNewMaterialForm({
          name: '',
          category: 'حديد',
          unit: 'كجم',
          current_price: '',
          description: ''
        });
        await fetchMaterials();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(result.error || '❌ فشل إضافة المادة');
      }
    } catch (err) {
      setErrorMessage('❌ حدث خطأ غير متوقع');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Calculations for Weighbridge form preview
  const grossNum = parseFloat(weighbridgeForm.gross_weight_kg || '0');
  const tareNum = parseFloat(weighbridgeForm.tare_weight_kg || '0');
  const calculatedNetWeight = grossNum > 0 && tareNum > 0 ? Math.max(0, grossNum - tareNum) : 0;
  
  let impurityKgNum = parseFloat(weighbridgeForm.impurity_deduction_kg || '0');
  const impurityPctNum = parseFloat(weighbridgeForm.impurity_percentage || '0');
  if (weighbridgeForm.deduction_type === 'percentage' && impurityPctNum > 0 && calculatedNetWeight > 0) {
    impurityKgNum = (calculatedNetWeight * impurityPctNum) / 100;
  }
  const payableNetWeight = Math.max(0, calculatedNetWeight - impurityKgNum);
  const unitPriceNum = parseFloat(weighbridgeForm.unit_price || '0');
  const totalAmountValue = payableNetWeight * unitPriceNum;
  const commPerTonNum = parseFloat(weighbridgeForm.commission_per_ton || '0');
  const totalCommissionValue = payableNetWeight * commPerTonNum;

  // Sorting form yield calculations (weight entered in tons)
  const sortingInputKg = parseFloat(sortingForm.sorted_weight_kg || '0') * 1000;
  const sortingOutputKg = sortingForm.outputs.reduce((sum, o) => sum + (parseFloat(o.weight_kg || '0') * 1000), 0);
  const sortingWasteKg = Math.max(0, sortingInputKg - sortingOutputKg);
  const sortingYieldPct = sortingInputKg > 0 ? ((sortingOutputKg / sortingInputKg) * 100).toFixed(1) : '0';

  const qualityLabels: Record<string, { text: string; css: string }> = {
    raw: { text: 'خام (غير مفروز)', css: 'bg-amber-950/40 text-amber-400 border border-amber-500/30' },
    sorted: { text: 'مفروز ومعبأ', css: 'bg-blue-950/40 text-blue-400 border border-blue-500/30' },
    processed: { text: 'معالج وجاهز للبيع', css: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30' }
  };

  const txTypeLabels: Record<string, { text: string; css: string }> = {
    purchase: { text: 'شراء (ميزان)', css: 'bg-green-950/40 text-green-400 border border-green-500/30' },
    sale: { text: 'بيع خردة', css: 'bg-blue-950/40 text-blue-400 border border-blue-500/30' },
    sorting: { text: 'فرز وتصنيف', css: 'bg-purple-950/40 text-purple-400 border border-purple-500/30' },
    adjustment: { text: 'تسوية رصيد', css: 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/30' },
    loss: { text: 'تلفيات / هالك', css: 'bg-red-950/40 text-red-400 border border-red-500/30' }
  };

  return (
    <MainLayout
      title="🧹 إدارة الخردة والخرس وإعادة التدوير (Scrap & Waste ERP)"
      description="منظومة متكاملة لميزان البسكول، خصم الشوائب والرطوبة، الفرز والتصنيف، إدارة المقاولين والسائقين، وعمولات السمسارة"
    >
      <div className="space-y-6" dir="rtl">
        
        {/* Quick Data Entry Action Toolbar */}
        <div className="bg-gradient-to-r from-[#181826] via-[#1A1A2A] to-[#161622] border border-[#2A2A3E] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600/30 to-emerald-600/30 border border-purple-500/30 text-purple-300">
              <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                مركز العمليات وإدخال البيانات السريع
              </h3>
              <p className="text-[11px] text-[#A0A0B0]">
                نافذة توزين منبثقة مع شاشة ميزان إلكتروني تفاعلي وحساب الشوائب آلياً
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => { setScaleWizardStep(1); setScaleModalOpen(true); }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-emerald-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Scale className="w-4 h-4" />
              ⚡ نافذة توزين بسكول جديدة
            </button>

            <button
              onClick={() => setSortingModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-purple-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Layers className="w-4 h-4" />
              🧹 نافذة فرز وتصنيف الخردة
            </button>

            <button
              onClick={() => setSlagModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-cyan-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Truck className="w-4 h-4" />
              🚚 نافذة شحنة جلخ وخرس جديدة
            </button>

            <button
              onClick={() => setMaterialModalOpen(true)}
              className="px-3.5 py-2.5 bg-[#1F1F2C] hover:bg-[#28283A] text-gray-200 border border-[#323246] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              🏷️ إضافة مادة / صنف خردة
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Compact Scaled Branches */}
        <div className="flex border-b border-[#23232F] space-x-reverse space-x-1 overflow-x-auto pb-px scrollbar-thin">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'dashboard'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            📊 لوحة المراقبة
          </button>
          
          <button
            onClick={() => setActiveTab('weighbridge')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'weighbridge'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            ⚖️ ميزان البسكول والشحنات
          </button>

          <button
            onClick={() => setActiveTab('sorting')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'sorting'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            🧹 الفرز والتصنيف
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'expenses'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-rose-400" />
            💸 المصروفات ونفقات التشغيل
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'commissions'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            🤝 العمولات والسمسارة
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'inventory'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-purple-400" />
            📦 جرد المخزن
          </button>

          <button
            onClick={() => setActiveTab('slag_shipments')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'slag_shipments'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            🚚 شحنات الجلخ والخرس
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-lg ${
              activeTab === 'materials'
                ? 'border-[#8B5CF6] text-white bg-[#1C1C24]'
                : 'border-transparent text-[#A0A0B0] hover:text-white hover:bg-[#13131A]/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-pink-400" />
            🏷️ أنواع المواد
          </button>
        </div>

        {/* Global Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-10 h-10 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[#A0A0B0] text-sm">⏳ جاري جلب بيانات منظومة الخردة وميزان البسكول...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* 📋 Quick Reports Toolbar */}
                <div className="flex flex-wrap gap-3 p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl items-center justify-between no-print">
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      تقارير ومخرجات نشاط الخردة وإعادة التدوير
                    </h4>
                    <p className="text-[11px] text-purple-300">طباعة كشوف الأوزان وميزان البسكول، كشوف العمولات، والتحليلات المدمجة</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        try {
                          window.print();
                        } catch (e) {
                          setModalTitle("🖨️ طباعة تقرير الجرد والتوريدات");
                          setModalMessage("يُرجى فتح البرنامج في علامة تبويب جديدة لتفعيل خاصية الطباعة دون أية قيود أمنية من المتصفح.");
                          setModalType("warning");
                          setModalOpen(true);
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      طباعة تقرير الجرد والأوزان
                    </button>
                    <button
                      onClick={() => {
                        setModalTitle("📊 تصدير البيانات إلى Excel");
                        setModalMessage("✅ تم تجهيز كشوف الخردة وميزان البسكول ومستحقات السمسارة بصيغة CSV جاهزة للتحميل.");
                        setModalType("success");
                        setModalOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="w-4 h-4" />
                      تصدير كشوف المبيعات والعمولات (Excel)
                    </button>
                  </div>
                </div>

                {/* Visual Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  <div className="card-glow p-5 rounded-xl relative overflow-hidden bg-[#161622]/40 border border-[#23232F]">
                    <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-purple-950/40 text-purple-400">
                      <Scale className="w-5 h-5" />
                    </div>
                    <p className="text-[#A0A0B0] text-xs font-semibold">أوزان المخزن الصافية</p>
                    <p className="text-2xl font-extrabold text-white mt-2">
                      {(summary?.summary?.total_weight || 0).toLocaleString()} <span className="text-xs font-medium text-purple-400">طن</span>
                    </p>
                    <div className="mt-3 text-[10px] text-[#6B7280]">
                      الأوزان المعتمدة بالمستودع
                    </div>
                  </div>

                  <div className="card-glow p-5 rounded-xl relative overflow-hidden bg-[#161622]/40 border border-[#23232F]">
                    <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-emerald-950/40 text-emerald-400">
                      <Coins className="w-5 h-5" />
                    </div>
                    <p className="text-[#A0A0B0] text-xs font-semibold">القيمة التقديرية للمخزون</p>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                      {(summary?.summary?.total_value || 0).toLocaleString()} <span className="text-xs font-medium">ج.م</span>
                    </p>
                    <div className="mt-3 text-[10px] text-[#6B7280]">
                      متوسط أسعار الفرز والتوريد
                    </div>
                  </div>

                  <div className="card-glow p-5 rounded-xl relative overflow-hidden bg-[#161622]/40 border border-[#23232F]">
                    <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-rose-950/40 text-rose-400">
                      <Coins className="w-5 h-5" />
                    </div>
                    <p className="text-[#A0A0B0] text-xs font-semibold">مصروفات وتشغيل الخردة</p>
                    <p className="text-2xl font-extrabold text-rose-400 mt-2">
                      {scrapExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-medium">ج.م</span>
                    </p>
                    <button 
                      onClick={() => setActiveTab('expenses')} 
                      className="mt-3 text-[10px] text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      عرض وتفاصيل المصروفات ←
                    </button>
                  </div>

                  <div className="card-glow p-5 rounded-xl relative overflow-hidden bg-[#161622]/40 border border-[#23232F]">
                    <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-amber-950/40 text-amber-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[#A0A0B0] text-xs font-semibold">عمولات السمسارة والوسطاء</p>
                    <p className="text-2xl font-extrabold text-amber-400 mt-2">
                      {commissions.reduce((sum, c) => sum + (Number(c.total_commission) || 0), 0).toLocaleString()} <span className="text-xs font-medium">ج.م</span>
                    </p>
                    <div className="mt-3 text-[10px] text-[#6B7280]">
                      عن {commissions.length} كارتة ميزان
                    </div>
                  </div>

                  <div className="card-glow p-5 rounded-xl relative overflow-hidden bg-[#161622]/40 border border-[#23232F]">
                    <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-blue-950/40 text-blue-400">
                      <History className="w-5 h-5" />
                    </div>
                    <p className="text-[#A0A0B0] text-xs font-semibold">شحنات البسكول المسجلة</p>
                    <p className="text-2xl font-extrabold text-white mt-2">
                      {transactions.length} <span className="text-xs font-medium text-blue-400">حركة</span>
                    </p>
                    <div className="mt-3 text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      قيود مرحّلة تلقائياً
                    </div>
                  </div>

                </div>

                {/* Weight & Value Breakdown */}
                <Card className="p-6 bg-[#161622]/30 border border-[#23232F]">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center">
                    <Layers className="w-5 h-5 ml-2 text-purple-400" />
                    توزيع أوزان وقيم المواد في المستودع (حديد، نحاس، ألومنيوم، خرس، إلخ)
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Weights Distribution */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[#A0A0B0] mb-2">⚖️ توزيع الأوزان (طن)</h4>
                      {Array.isArray(summary?.materials) && summary.materials.map((mat, idx) => {
                        const totalWeightAll = summary?.summary?.total_weight || 1;
                        const percentage = (((mat.total_weight || 0) / totalWeightAll) * 100).toFixed(1);
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-white">{mat.material_name}</span>
                              <span className="text-purple-300">{(mat.total_weight || 0).toLocaleString()} طن ({percentage}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-[#1C1C28] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Value Distribution */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[#A0A0B0] mb-2">💰 التقييم المالي (ج.م)</h4>
                      {Array.isArray(summary?.materials) && summary.materials.map((mat, idx) => {
                        const totalValAll = summary?.summary?.total_value || 1;
                        const percentage = (((mat.total_value || 0) / totalValAll) * 100).toFixed(1);
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-white">{mat.material_name}</span>
                              <span className="text-emerald-400">{(mat.total_value || 0).toLocaleString()} ج.م ({percentage}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-[#1C1C28] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

              </div>
            )}

            {/* 2. Scale Bridge & Weighbridge Tab */}
            {activeTab === 'weighbridge' && (
              <div className="space-y-6">
                
                {/* Header Banner with Modal Trigger */}
                <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-purple-950/20 to-slate-900 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-400" />
                      ⚖️ إدارة ميزان البسكول وكارتات التوزين والاستلام
                    </h3>
                    <p className="text-xs text-emerald-200">
                      تسجيل أوزان الشاحنات القائمة والفارغة، خصم الشوائب والرطوبة، وتوثيق عقود الشراء والبيع والسمسار في نافذة منبثقة مخصصة.
                    </p>
                  </div>
                  <button
                    onClick={() => setScaleModalOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    + تسجيل كارتة ميزان جديدة ⚖️
                  </button>
                </div>

                {/* Live Transactions Log Full Width */}
                <Card className="p-6 bg-[#161622]/30 border border-[#23232F]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-400" />
                        سجل حركات كارتات ميزان البسكول
                      </h3>
                      <p className="text-[11px] text-[#A0A0B0] mt-0.5">سجل التوزينات مع بيانات الشاحنات، الشوائب المخصومة، والمقاولين</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      <select
                        value={filters.material_id}
                        onChange={e => {
                          setFilters(prev => ({ ...prev, material_id: e.target.value }));
                          setTimeout(() => fetchTransactions(), 100);
                        }}
                        className="px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                      >
                        <option value="">كل المواد</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-right text-xs" dir="rtl">
                      <thead>
                        <tr className="border-b border-[#23232F] text-[#A0A0B0] font-semibold">
                          <th className="py-3 px-2">التاريخ والكارتة</th>
                          <th className="py-3 px-2">المادة</th>
                          <th className="py-3 px-2 text-left">الوزن الصافي</th>
                          <th className="py-3 px-2 text-left">خصم الشوائب</th>
                          <th className="py-3 px-2 text-left">إجمالي القيمة</th>
                          <th className="py-3 px-2">المقاول/السائق</th>
                          <th className="py-3 px-2">السمسار/العمولة</th>
                          <th className="py-3 px-2 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1C1C28]/60 text-white font-sans">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[#1C1C28]/30 transition-colors">
                            <td className="py-3 px-2">
                              <span className="font-mono text-[#A0A0B0] block">{tx.transaction_date}</span>
                              <span className="text-[10px] font-bold font-mono text-purple-400">#{tx.scale_ticket_no || 'بدون كارتة'}</span>
                            </td>
                            <td className="py-3 px-2 font-bold text-white">
                              {tx.material_name}
                            </td>
                            <td className="py-3 px-2 text-left font-mono font-bold text-emerald-400">
                              {Number(tx.weight_kg || 0).toLocaleString()} طن
                            </td>
                            <td className="py-3 px-2 text-left font-mono text-amber-400">
                              {tx.impurity_deduction_kg ? `${Number(tx.impurity_deduction_kg).toLocaleString()} طن` : '-'}
                            </td>
                            <td className="py-3 px-2 text-left font-mono font-bold text-white">
                              {Number(tx.total_amount || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-3 px-2 text-[#A0A0B0]">
                              <div>{tx.contact_name || tx.notes || '-'}</div>
                              {tx.truck_number && (
                                <span className="text-[10px] text-cyan-400 font-mono">🚛 {tx.truck_number}</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              {tx.broker_name ? (
                                <div>
                                  <span className="text-white font-medium block">{tx.broker_name}</span>
                                  <span className="text-[10px] text-amber-400 font-mono">عمولة: {Number(tx.commission_total || 0).toLocaleString()} ج.م</span>
                                </div>
                              ) : (
                                <span className="text-[#6B7280]">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handlePrintSingleTicket(tx)}
                                  className="p-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-md transition-all cursor-pointer"
                                  title="طباعة الكارتة"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTx({ ...tx });
                                    setEditTxModalOpen(true);
                                  }}
                                  className="p-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md transition-all cursor-pointer"
                                  title="تعديل الكارتة"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(tx.id, tx.scale_ticket_no || tx.id)}
                                  className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md transition-all cursor-pointer"
                                  title="حذف الكارتة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {transactions.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-[#6B7280]">
                              لا توجد كارتات ميزان مسجلة حتى الآن. انقر على "تسجيل كارتة ميزان جديدة" لإضافة أول كارتة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </Card>

              </div>
            )}

            {/* 3. Sorting, Grading & Disassembly Tab */}
            {activeTab === 'sorting' && (
              <div className="space-y-6">
                
                {/* Header Banner with Modal Trigger */}
                <div className="p-5 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900 border border-blue-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" />
                      ♻️ إدارة فرز وتصنيف وتفكيك الخردة والأصناف
                    </h3>
                    <p className="text-xs text-blue-200">
                      تحويل الخردة الخام أو المشكلة إلى أصناف صافية ومفرزة مع احتساب نسب الوفر والهالك وتحديث المخزون عبر نافذة منبثقة اختيارية.
                    </p>
                  </div>
                  <button
                    onClick={() => setSortingModalOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    + عملية فرز وتصنيف جديدة ♻️
                  </button>
                </div>

                {/* Inventory Stock Ready for Sorting Full Width */}
                <Card className="p-6 bg-[#161622]/30 border border-[#23232F]">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Box className="w-5 h-5 text-purple-400" />
                    دفعات الخردة الجاهزة للفرز والتصنيف بالمستودع
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {inventory.map((item) => (
                      <div key={item.id} className="p-4 bg-[#13131A] border border-[#23232F] rounded-xl hover:border-purple-500/40 transition-all space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                              #{item.id}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1">{item.material_name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${qualityLabels[item.quality]?.css || 'bg-slate-800'}`}>
                            {qualityLabels[item.quality]?.text || item.quality}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2 bg-[#1C1C28]/60 rounded-lg">
                          <div>
                            <span className="text-[#A0A0B0] block text-[10px]">الوزن المتوفر:</span>
                            <span className="text-emerald-400 font-bold">{Number(item.weight_kg).toLocaleString()} طن</span>
                          </div>
                          <div>
                            <span className="text-[#A0A0B0] block text-[10px]">سعر الطن:</span>
                            <span className="text-white font-bold">{Number(item.unit_price).toLocaleString()} ج.م</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSortingForm(prev => ({
                              ...prev,
                              source_inventory_id: item.id,
                              sorted_weight_kg: String(Number(item.weight_kg) / 1000)
                            }));
                            setSortingModalOpen(true);
                          }}
                          className="w-full py-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          بدء الفرز لهذه الدفعة ♻️
                        </button>
                      </div>
                    ))}
                    {inventory.length === 0 && (
                      <div className="col-span-3 py-12 text-center text-[#6B7280]">
                        لا توجد شحنات خردة خامة بالمستودع متاحة للفرز. انقر على "عملية فرز وتصنيف جديدة" للبدء.
                      </div>
                    )}
                  </div>
                </Card>

              </div>
            )}

            {/* 4. Commissions & Brokerage Tab */}
            {activeTab === 'commissions' && (
              <Card className="p-6 bg-[#161622]/30 border border-[#23232F]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      سجل مستحقات وعمولات السمسارة والوسطاء (Commissions Log)
                    </h3>
                    <p className="text-[11px] text-[#A0A0B0] mt-0.5">تتبع عمولات المندوبين بالطن، رقم كارتة الميزان، وإجمالي المبالغ المستحقة</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-right text-xs" dir="rtl">
                    <thead>
                      <tr className="border-b border-[#23232F] text-[#A0A0B0] font-semibold">
                        <th className="py-3 px-4">اسم السمسار / المندوب</th>
                        <th className="py-3 px-4">كارتة الميزان</th>
                        <th className="py-3 px-4">نوع المادة</th>
                        <th className="py-3 px-4 text-left">الوزن (بالطن)</th>
                        <th className="py-3 px-4 text-left">عمولة الطن (ج.م)</th>
                        <th className="py-3 px-4 text-left">إجمالي العمولة</th>
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-4">الحالة والمستحقات</th>
                        <th className="py-3 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1C28]/60 text-white font-sans">
                      {commissions.map((comm) => (
                        <tr key={comm.id} className="hover:bg-[#1C1C28]/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            {comm.broker_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-purple-400">
                            #{comm.scale_ticket_no}
                          </td>
                          <td className="py-3 px-4 text-[#A0A0B0]">
                            {comm.material_name}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-cyan-400">
                            {comm.weight_tons} طن
                          </td>
                          <td className="py-3 px-4 text-left font-mono">
                            {comm.rate_per_ton} ج.م
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-extrabold text-amber-400">
                            {Number(comm.total_commission).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4 font-mono text-[#A0A0B0]">
                            {comm.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30">
                              مستحق صرف
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintSingleCommission(comm)}
                                className="p-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 rounded-md transition-all cursor-pointer"
                                title="طباعة سند العمولة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommission({ ...comm });
                                  setEditCommissionModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md transition-all cursor-pointer"
                                title="تعديل العمولة"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCommission(comm.id, comm.broker_name)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md transition-all cursor-pointer"
                                title="حذف العمولة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {commissions.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                            لا توجد عمولات سمسارة مسجلة حتى الآن.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 5. Inventory & Scale Tickets Log */}
            {activeTab === 'inventory' && (
              <Card className="p-6 bg-[#161622]/30 border border-[#23232F]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Box className="w-5 h-5 text-purple-400" />
                    جرد مخزون الخردة وموقع كارتات الميزان بالمستودع
                  </h3>
                  <div className="text-xs text-[#A0A0B0]">
                    إجمالي الدفعات: <span className="text-white font-bold">{inventory.length}</span> دُفعة
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-right text-xs" dir="rtl">
                    <thead>
                      <tr className="border-b border-[#23232F] text-[#A0A0B0] font-semibold">
                        <th className="py-3 px-3">رقم الدفعة والكارتة</th>
                        <th className="py-3 px-3">المادة والتصنيف</th>
                        <th className="py-3 px-3 text-left">الوزن القائم (كجم)</th>
                        <th className="py-3 px-3 text-left">الوزن الفارغ (كجم)</th>
                        <th className="py-3 px-3 text-left">خصم الشوائب</th>
                        <th className="py-3 px-3 text-left">الوزن الصافي الخافي</th>
                        <th className="py-3 px-3 text-left">سعر الكيلو</th>
                        <th className="py-3 px-3 text-left">القيمة الإجمالية</th>
                        <th className="py-3 px-3">المقاول/السائق/الشاحنة</th>
                        <th className="py-3 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1C28]/60 text-white font-sans">
                      {inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#1C1C28]/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono text-[#A0A0B0] block">#{item.id}</span>
                            {item.scale_ticket_no && (
                              <span className="text-[10px] font-bold font-mono text-purple-400">كارتة: #{item.scale_ticket_no}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            <div>{item.material_name}</div>
                            {item.material_category && (
                              <span className="text-[10px] text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20 font-normal">
                                {item.material_category}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-[#A0A0B0]">
                            {item.gross_weight_kg ? `${Number(item.gross_weight_kg).toLocaleString()} كجم` : '-'}
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-[#A0A0B0]">
                            {item.tare_weight_kg ? `${Number(item.tare_weight_kg).toLocaleString()} كجم` : '-'}
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-amber-400">
                            {item.impurity_deduction_kg ? `${Number(item.impurity_deduction_kg).toLocaleString()} كجم` : '-'}
                          </td>
                          <td className="py-3 px-3 text-left font-mono font-extrabold text-purple-300">
                            {Number(item.weight_kg || 0).toLocaleString()} كجم
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-[#A0A0B0]">
                            {Number(item.unit_price || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-3 text-left font-mono font-bold text-emerald-400">
                            {Number(item.total_value || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-3 text-[#A0A0B0]">
                            <div>{item.supplier_name || item.contractor_name || '-'}</div>
                            {item.truck_number && (
                              <span className="text-[10px] text-cyan-400 font-mono">🚛 {item.truck_number} ({item.driver_name || ''})</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintSingleTicket(item)}
                                className="p-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-md transition-all cursor-pointer"
                                title="طباعة كارتة الميزان"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTx({ ...item });
                                  setEditTxModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md transition-all cursor-pointer"
                                title="تعديل الكارتة"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(item.id, item.scale_ticket_no || item.id)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md transition-all cursor-pointer"
                                title="حذف الكارتة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {inventory.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-[#6B7280]">
                            المستودع فارغ حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 6. Slag Shipments Tab */}
            {activeTab === 'slag_shipments' && (
              <div className="space-y-6">
                <ShippingSummary transactions={slagShipments} />

                <div className="bg-gradient-to-r from-[#181826] via-[#1A1A2A] to-[#161622] border border-[#2A2A3E] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-cyan-400" />
                      إدارة شحنات الجلخ والخرس (Slag & Concrete Shipments)
                    </h3>
                    <p className="text-xs text-[#A0A0B0]">
                      إدخال ومتابعة شحنات الجلخ والخبث والخرسانة مع كشف القيود، أسعار المصنع، وتكاليف النقل والمعدات المعتمدة.
                    </p>
                  </div>
                  <button
                    onClick={() => setSlagModalOpen(true)}
                    className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    ⚡ فتح نافذة تسجيل شحنة جلخ/خرس جديدة
                  </button>
                </div>

                <Card className="p-6 bg-[#161622]/30 border border-[#23232F] space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#23232F]">
                    <h3 className="text-base font-bold text-white flex items-center">
                      <History className="w-5 h-5 ml-2 text-purple-400" />
                      سجل حركة شحنات الجلخ والخرس التراكمية
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/20 font-sans">
                      🛡️ رادار الكشف عن التلاعب نشط
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                    {slagShipments.map((s, idx) => {
                      const driver = s.driverName || s.driver_name || "غير محدد";
                      const vehicle = s.vehicleNumber || s.car_number || "غير محدد";
                      const qty = Number(s.loadQuantity !== undefined ? s.loadQuantity : (s.quantity !== undefined ? s.quantity : 0));
                      const fPrice = Number(s.factoryPricePerTon !== undefined ? s.factoryPricePerTon : (s.factory_price_per_ton !== undefined ? s.factory_price_per_ton : 0));
                      const totalSale = Number(s.totalSaleAmount !== undefined ? s.totalSaleAmount : (s.total_sales !== undefined ? s.total_sales : 0));
                      const dateVal = s.transactionDate || s.date || "غير محدد";

                      return (
                        <div key={s.id || idx} className="p-4 bg-[#13131A] border border-[#23232F] rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-white">السائق: {driver}</span>
                              <span className="text-[10px] text-[#A0A0B0] block font-mono">🚗 {vehicle} | 📅 {dateVal}</span>
                            </div>
                            <div className="text-left font-mono">
                              <span className="text-emerald-400 font-bold text-sm">{totalSale.toLocaleString()} ج.م</span>
                              <span className="text-[10px] text-[#A0A0B0] block">{qty} طن @ {fPrice} ج.م</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 pt-2 border-t border-[#23232F]/60 justify-end">
                            <button
                              onClick={() => handlePrintSingleSlagShipment(s)}
                              className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              طباعة بوليصة الشحنة
                            </button>
                            <button
                              onClick={() => {
                                setEditingSlag({ ...s });
                                setEditSlagModalOpen(true);
                              }}
                              className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDeleteSlagShipment(s.id)}
                              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {slagShipments.length === 0 && (
                      <div className="text-center py-12 text-[#6B7280]">
                        لا توجد شحنات جلخ مسجلة حالياً. انقر على زر "فتح نافذة تسجيل شحنة جلخ/خرس جديدة" أعلاه لإضافة أول شحنة.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* 7. Materials & Categories Management Tab */}
            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add Material Form */}
                <Card className="p-6 bg-[#161622]/40 border border-[#23232F] h-fit space-y-4">
                  <div className="border-b border-[#23232F] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-pink-400" />
                      إضافة صنف / مادة خردة جديدة
                    </h3>
                  </div>

                  <form onSubmit={handleAddNewMaterial} className="space-y-3">
                    <Input
                      label="اسم مادة الخردة"
                      type="text"
                      placeholder="مثال: نحاس أحمر معزول، ألومنيوم كبائس"
                      value={newMaterialForm.name}
                      onChange={e => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })}
                      required
                    />

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#A0A0B0]">الفئة الأساسية</label>
                      <select
                        value={newMaterialForm.category}
                        onChange={e => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                      >
                        <option value="حديد">حديد</option>
                        <option value="نحاس">نحاس</option>
                        <option value="ألومنيوم">ألومنيوم</option>
                        <option value="بلاستيك">بلاستيك ونفايات صلبة</option>
                        <option value="خرس وركام">خرس وركام / Slag</option>
                        <option value="ورق">ورق وكرتون</option>
                        <option value="مشكل">خردة مشكلة خام</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="وحدة القياس"
                        type="text"
                        value={newMaterialForm.unit}
                        onChange={e => setNewMaterialForm({ ...newMaterialForm, unit: e.target.value })}
                        required
                      />
                      <Input
                        label="السعر التقديري (ج.م)"
                        type="number"
                        step="0.01"
                        placeholder="سعر الكيلو/الوحدة"
                        value={newMaterialForm.current_price}
                        onChange={e => setNewMaterialForm({ ...newMaterialForm, current_price: e.target.value })}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center cursor-pointer"
                      loading={submitLoading}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة الصنف للنظام
                    </Button>
                  </form>
                </Card>

                {/* Material Cards List */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((mat) => (
                      <Card key={mat.id} className="p-5 bg-[#161622]/30 border border-[#23232F] flex flex-col justify-between hover:border-[#8B5CF6]/40 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="p-1.5 rounded bg-purple-950/40 text-purple-400 font-mono text-[10px]">
                              {mat.id}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
                              نشط
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                              <Tag className="w-4 h-4 text-purple-400" />
                              {mat.name}
                            </h4>
                            {mat.category && (
                              <span className="text-[10px] text-purple-300 font-mono">الفئة: {mat.category}</span>
                            )}
                          </div>

                          <div className="p-2.5 bg-[#13131A] border border-[#23232F] rounded-lg">
                            <p className="text-[10px] text-[#A0A0B0]">السعر المعتمد للتوزين:</p>
                            <p className="text-base font-bold text-emerald-400 mt-0.5">
                              {Number(mat.current_price || 0).toLocaleString()} ج.م <span className="text-xs text-[#6B7280]">/ {mat.unit || 'كجم'}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#23232F]/60">
                            <button
                              type="button"
                              onClick={() => handlePrintSingleMaterial(mat)}
                              className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="طباعة بطاقة المعايرة"
                            >
                              <Printer className="w-3 h-3" />
                              طباعة
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMaterial({ ...mat });
                                setEditMaterialModalOpen(true);
                              }}
                              className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="تعديل الصنف"
                            >
                              <Edit className="w-3 h-3" />
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-3 h-3" />
                              حذف
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 8. Scrap Operational Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-slate-900 border border-rose-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-rose-400" />
                      💸 إشهار وإدارة مصاريف ونفقات تشغيل الخردة والأقسام
                    </h3>
                    <p className="text-xs text-rose-200">
                      إدارة شامـلة لبنود المصروفات (إيجارات، كهرباء، مواصلات، صيانة موازين، عمالة) وتوزيعها حسب الأقسام التشغيلية.
                    </p>
                  </div>
                  <button
                    onClick={() => setScrapExpenseModalOpen(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مصروف تشغيل جديد
                  </button>
                </div>

                {/* Expense Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-4 bg-[#161622]/60 border border-[#23232F] rounded-xl">
                    <p className="text-[11px] font-semibold text-[#A0A0B0]">إجمالي المصروفات</p>
                    <p className="text-xl font-black text-rose-400 mt-1">
                      {scrapExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">ج.م</span>
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">{scrapExpenses.length} إيصال مسجل</span>
                  </div>

                  <div className="p-4 bg-[#161622]/60 border border-[#23232F] rounded-xl">
                    <p className="text-[11px] font-semibold text-[#A0A0B0]">إيجارات ومرافق وكهرباء</p>
                    <p className="text-xl font-black text-purple-400 mt-1">
                      {scrapExpenses.filter(e => e.category?.includes('إيجار') || e.category?.includes('كهرباء') || e.category?.includes('مرافق')).reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">ج.م</span>
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">مصاريف أراضي ومباني وشبكات</span>
                  </div>

                  <div className="p-4 bg-[#161622]/60 border border-[#23232F] rounded-xl">
                    <p className="text-[11px] font-semibold text-[#A0A0B0]">مواصلات ونولون ونقل</p>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {scrapExpenses.filter(e => e.category?.includes('نقل') || e.category?.includes('شحن') || e.category?.includes('مواصلات') || e.category?.includes('نولون')).reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">ج.م</span>
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">رسوم شحن وتوصيل السيارات</span>
                  </div>

                  <div className="p-4 bg-[#161622]/60 border border-[#23232F] rounded-xl">
                    <p className="text-[11px] font-semibold text-[#A0A0B0]">صيانة معدات وموازين</p>
                    <p className="text-xl font-black text-blue-400 mt-1">
                      {scrapExpenses.filter(e => e.category?.includes('صيانة') || e.category?.includes('ميزان') || e.category?.includes('وقود')).reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">ج.م</span>
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">معايرة بسكول وصيانة مكابس</span>
                  </div>

                  <div className="p-4 bg-[#161622]/60 border border-[#23232F] rounded-xl">
                    <p className="text-[11px] font-semibold text-[#A0A0B0]">أجور وعمالة فرز</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {scrapExpenses.filter(e => e.category?.includes('أجور') || e.category?.includes('عمالة') || e.category?.includes('إكراميات')).reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">ج.م</span>
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">مستحقات عمال الفرز والتكبيس</span>
                  </div>
                </div>

                {/* Filter and Control Bar */}
                <div className="p-4 bg-[#161622]/40 border border-[#23232F] rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">تصفية حسب القسم:</span>
                      <select
                        value={expenseFilterDepartment}
                        onChange={e => setExpenseFilterDepartment(e.target.value)}
                        className="px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                      >
                        <option value="all">كل الأقسام الفنّية ({departments.length})</option>
                        {departments.map((dept, i) => (
                          <option key={i} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">تصفية حسب بند المصروف:</span>
                      <select
                        value={expenseFilterCategory}
                        onChange={e => setExpenseFilterCategory(e.target.value)}
                        className="px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs max-w-xs"
                      >
                        <option value="all">جميع البنود المسجلة ({expenseCategories.length})</option>
                        {expenseCategories.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {(expenseFilterCategory !== 'all' || expenseFilterDepartment !== 'all') && (
                      <button
                        onClick={() => {
                          setExpenseFilterCategory('all');
                          setExpenseFilterDepartment('all');
                        }}
                        className="text-xs text-rose-400 hover:underline font-semibold"
                      >
                        إلغاء التصفيات
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handlePrintExpensesPDF}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      🖨️ طباعة وتصدير PDF
                    </button>
                    <button
                      onClick={() => setExpenseReportModalOpen(true)}
                      className="px-3.5 py-1.5 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      معاينة التقرير الجاهز للطباعة
                    </button>
                    <button
                      onClick={() => setScrapExpenseModalOpen(true)}
                      className="px-3 py-1.5 bg-[#1F1F2C] hover:bg-[#2A2A3E] text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة بند/قسم جديد
                    </button>
                  </div>
                </div>

                {/* Expenses Data Table */}
                <Card className="p-6 bg-[#161622]/40 border border-[#23232F] space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#23232F] pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        سجل المصروفات والإيصالات التشغيلية للخردة
                      </h4>
                      <span className="text-xs text-gray-400">
                        ({scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).length} قيد معروض)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrintExpensesPDF}
                        className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-400" />
                        طباعة كشف المصروفات الحالي (PDF)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-[#13131A] text-[#A0A0B0] border-b border-[#23232F]">
                          <th className="p-3">رقم القيد</th>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">القسم / الفرع المستفيد</th>
                          <th className="p-3">بند المصروف</th>
                          <th className="p-3">البيان / الشرح</th>
                          <th className="p-3">المستفيد / المورد</th>
                          <th className="p-3">المبلغ (ج.م)</th>
                          <th className="p-3">طريقة الدفع</th>
                          <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#23232F] text-gray-200">
                        {scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-gray-500">
                              لا توجد مصروفات خردة مطابقة للتصفية الحالية. انقر على "إضافة مصروف تشغيل جديد" لأول قيد.
                            </td>
                          </tr>
                        ) : (
                          scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).map((exp: any, idx: number) => (
                            <tr key={exp.id || idx} className="hover:bg-[#1C1C24]/50 transition-colors">
                              <td className="p-3 font-mono text-purple-400">{exp.id || `#EXP-${idx + 1}`}</td>
                              <td className="p-3 whitespace-nowrap">{exp.expense_date || exp.expenseDate || 'اليوم'}</td>
                              <td className="p-3">
                                <span className="px-2 py-1 rounded bg-purple-950/40 text-purple-300 border border-purple-500/20 font-semibold text-[11px]">
                                  {exp.department || 'قسم ميزان البسكول'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-500/20 font-semibold text-[11px]">
                                  {exp.category || 'مصاريف تشغيل خردة'}
                                </span>
                              </td>
                              <td className="p-3 text-gray-300 max-w-xs">{exp.description || exp.notes || '—'}</td>
                              <td className="p-3 text-white font-semibold">{exp.payee || exp.vendor_name || 'سائق/مورد'}</td>
                              <td className="p-3 font-bold text-rose-400 text-sm whitespace-nowrap">
                                {Number(exp.amount || 0).toLocaleString()} ج.م
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-400 text-[10px]">
                                  {exp.payment_method === 'bank' ? 'تحويل بنكي' : 'نقداً (خزينة)'}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handlePrintSingleExpense(exp)}
                                    className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-md transition-all cursor-pointer"
                                    title="طباعة سند المصروف"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingExpense({ ...exp });
                                      setEditExpenseModalOpen(true);
                                    }}
                                    className="p-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-md transition-all cursor-pointer"
                                    title="تعديل المصروف"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="p-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 rounded-md transition-all cursor-pointer"
                                    title="حذف المصروف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

          </>
        )}

      </div>

      {/* Scrap Expense Creation Modal */}
      {scrapExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-xl w-full p-6 text-right space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#23232F] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">💸 تسجيل مصروف ونفقات تشغيل الخردة</h3>
                  <p className="text-[11px] text-[#A0A0B0]">تحديد القسم وبند المصروف (إيجارات، كهرباء، مواصلات، صيانة، عمالة) مع القيد المالي</p>
                </div>
              </div>
              <button
                onClick={() => setScrapExpenseModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateScrapExpense} className="space-y-4">
              {/* Department Selection & Dynamic Creation */}
              <div className="space-y-1 bg-[#161622]/60 p-3 rounded-xl border border-[#23232F]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#A0A0B0]">تحديد القسم / الفرع المستفيد</label>
                  <button
                    type="button"
                    onClick={() => setShowAddDepartmentInput(!showAddDepartmentInput)}
                    className="text-[10px] text-purple-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddDepartmentInput ? 'إلغاء إضافة قسم' : '+ إضافة قسم جديد'}
                  </button>
                </div>

                {showAddDepartmentInput ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="اسم القسم الجديد (مثال: فرع الإسكندرية)"
                      value={newDepartmentInput}
                      onChange={e => setNewDepartmentInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDepartment}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg"
                    >
                      حفظ القسم
                    </button>
                  </div>
                ) : (
                  <select
                    value={scrapExpenseForm.department}
                    onChange={e => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowAddDepartmentInput(true);
                      } else {
                        setScrapExpenseForm({ ...scrapExpenseForm, department: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs mt-1"
                  >
                    <option value="">تحديد القسم / الفرع المستفيد</option>
                    {departments.map((dept, i) => (
                      <option key={i} value={dept}>{dept}</option>
                    ))}
                    <option value="__ADD_NEW__" className="text-purple-400 font-bold bg-[#1C1628]">
                      + إضافة قسم جديد
                    </option>
                  </select>
                )}
              </div>

              {/* Expense Category Selection & Dynamic Creation */}
              <div className="space-y-1 bg-[#161622]/60 p-3 rounded-xl border border-[#23232F]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#A0A0B0]">بند / نوع المصروف</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                    className="text-[10px] text-rose-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddCategoryInput ? 'إلغاء إضافة بند' : '+ إضافة نوع مصروف جديد'}
                  </button>
                </div>

                {showAddCategoryInput ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="نوع المصروف الجديد (مثال: مصاريف تأمين وحراسة)"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg"
                    >
                      حفظ البند
                    </button>
                  </div>
                ) : (
                  <select
                    value={scrapExpenseForm.category}
                    onChange={e => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowAddCategoryInput(true);
                      } else {
                        setScrapExpenseForm({ ...scrapExpenseForm, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs mt-1"
                  >
                    <option value="">تحديد نوع المصروف / البند</option>
                    {expenseCategories.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                    <option value="__ADD_NEW__" className="text-rose-400 font-bold bg-[#28161A]">
                      + إضافة نوع مصروف جديد
                    </option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="المبلغ المستحق (ج.م)"
                  type="number"
                  step="0.01"
                  placeholder="أدخل المبلغ"
                  value={scrapExpenseForm.amount}
                  onChange={e => setScrapExpenseForm({ ...scrapExpenseForm, amount: e.target.value })}
                  required
                />

                <Input
                  label="تاريخ الصرف"
                  type="date"
                  value={scrapExpenseForm.expense_date}
                  onChange={e => setScrapExpenseForm({ ...scrapExpenseForm, expense_date: e.target.value })}
                  required
                />
              </div>

              <Input
                label="البيان / الشرح التفصيلي"
                type="text"
                placeholder="مثال: إيجار مخزن الخردة لشهر يوليو أو نولون سيارة نقل خردة"
                value={scrapExpenseForm.description}
                onChange={e => setScrapExpenseForm({ ...scrapExpenseForm, description: e.target.value })}
                required
              />

              <Input
                label="اسم المستفيد / الجهة / السائق / المورد"
                type="text"
                placeholder="مثال: مالك العقار / شركة الكهرباء / محمد السيد - سائق النقل"
                value={scrapExpenseForm.payee}
                onChange={e => setScrapExpenseForm({ ...scrapExpenseForm, payee: e.target.value })}
              />

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setScrapExpenseModalOpen(false)}
                  className="w-1/3 bg-[#13131A] hover:bg-[#1F1F2C] text-gray-300 border-[#23232F]"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  loading={submitLoading}
                  className="w-2/3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg"
                >
                  حفظ وتسجيل المصروف
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slag & Concrete Shipment Modal */}
      {slagModalOpen && (
        <div 
          onClick={() => setSlagModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-lg w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">🚚 تسجيل شحنة جلخ وخرس جديدة</h3>
                  <p className="text-[10px] text-[#A0A0B0]">إدخال ميسر ومباشر مع الحساب الآلي للأسعار والتكاليف</p>
                </div>
              </div>
              <button
                onClick={() => setSlagModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ShippingTransactionForm 
              onSuccess={() => {
                fetchSlagShipments();
                setSlagModalOpen(false);
              }} 
            />
          </div>
        </div>
      )}

      {/* 1. Scale Bridge Weighbridge Entry Modal */}
      {scaleModalOpen && (
        <div 
          onClick={() => setScaleModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-xl w-full p-4 sm:p-5 text-right space-y-4 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">⚡ نافذة توزين بسكول جديدة</h3>
                  <p className="text-[10px] text-[#A0A0B0]">إدخال موثق ومحسوب آلياً لمعاملات استلام وشراء الخردة</p>
                </div>
              </div>
              <button
                onClick={() => setScaleModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Digital Scale LED Display */}
            <div className="bg-[#0B0E14] border-2 border-emerald-500/40 rounded-2xl p-4 font-mono shadow-[0_0_25px_rgba(16,185,129,0.12)] space-y-3">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-sans tracking-wide">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  ميزان البسكول الإلكتروني المباشر (WEIGHBRIDGE)
                </span>
                <span className="text-gray-400 font-mono">{weighbridgeForm.scale_ticket_no || 'TICKET-PENDING'}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
                <div className="bg-[#121620] p-2.5 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] text-gray-400 block mb-0.5 font-sans">الوزن القائم (GROSS)</span>
                  <span className="text-lg font-black text-emerald-400">{grossNum.toLocaleString()} <span className="text-xs font-normal">طن</span></span>
                </div>
                <div className="bg-[#121620] p-2.5 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-gray-400 block mb-0.5 font-sans">الوزن الفارغ (TARE)</span>
                  <span className="text-lg font-black text-amber-400">{tareNum.toLocaleString()} <span className="text-xs font-normal">طن</span></span>
                </div>
                <div className="bg-[#121620] p-2.5 rounded-xl border border-red-500/20">
                  <span className="text-[10px] text-gray-400 block mb-0.5 font-sans">الخصم (DEDUCTION)</span>
                  <span className="text-lg font-black text-red-400">{impurityKgNum.toFixed(2)} <span className="text-xs font-normal">طن</span></span>
                </div>
                <div className="bg-[#121620] p-2.5 rounded-xl border border-purple-500/30">
                  <span className="text-[10px] text-gray-400 block mb-0.5 font-sans">الصافي المعتمد (NET)</span>
                  <span className="text-lg font-black text-purple-300">{payableNetWeight.toLocaleString()} <span className="text-xs font-normal">طن</span></span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#1C2230] text-xs font-sans">
                <span className="text-gray-400">💰 إجمالي فاتورة التوزين للشراء:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">{totalAmountValue.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Step Wizard Steps Header */}
            <div className="grid grid-cols-3 gap-2 bg-[#1B1B2A] p-1.5 rounded-xl border border-[#2A2A3E]">
              <button
                type="button"
                onClick={() => setScaleWizardStep(1)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  scaleWizardStep === 1
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>1. المادة والمورد</span>
              </button>
              <button
                type="button"
                onClick={() => setScaleWizardStep(2)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  scaleWizardStep === 2
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>2. أوزان البسكول والخصم</span>
              </button>
              <button
                type="button"
                onClick={() => setScaleWizardStep(3)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  scaleWizardStep === 3
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>3. الشاحنة والسمسار</span>
              </button>
            </div>

            <form onSubmit={handleAddWeighbridgeEntry} className="space-y-4">
                  {scaleWizardStep === 1 && (
                    <div className="space-y-3">
                      {/* Movement Type Toggle */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#A0A0B0]">🔄 نوع الحركة / كارتة الميزان</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-[#13131A] rounded-xl border border-[#23232F]">
                          <button
                            type="button"
                            onClick={() => setWeighbridgeForm({ ...weighbridgeForm, transaction_type: 'purchase' })}
                            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              weighbridgeForm.transaction_type === 'purchase'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>📥 توريد واستلام (مورد خردة / خامات)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeighbridgeForm({ ...weighbridgeForm, transaction_type: 'sale' })}
                            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              weighbridgeForm.transaction_type === 'sale'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>📤 بيع وتصريف (عميل / جهة بيع)</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#A0A0B0] mb-1.5">📦 اختر مادة الخردة</label>
                        <select
                          value={weighbridgeForm.material_id}
                          onChange={e => handleMaterialChange(e.target.value)}
                          className="w-full bg-[#1C1C28] border border-[#2A2A3E] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                          required
                        >
                          <option value="">-- اختر نوع المادة --</option>
                          {materials.map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name} {mat.category ? `[${mat.category}]` : ''} - ({mat.current_price} ج.م/طن)
                            </option>
                          ))}
                        </select>
                      </div>

                      {weighbridgeForm.transaction_type === 'purchase' && (
                        <div>
                          <label className="block text-xs font-semibold text-amber-400 mb-1.5">🏦 اختر الخزينة (خصم النقدية)</label>
                          <select
                            value={weighbridgeForm.vault_id || ''}
                            onChange={e => setWeighbridgeForm({ ...weighbridgeForm, vault_id: e.target.value })}
                            className="w-full bg-[#1C1C28] border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                            required
                          >
                            <option value="">-- اختر الخزينة لخصم قيمة الشراء --</option>
                            {vaults.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} (رصيد: {Number(v.current_balance || 0).toLocaleString()} ج.م)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Party details: Contractor vs Buyer */}
                      {weighbridgeForm.transaction_type === 'sale' ? (
                        <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-blue-400">👤 بيانات (عميل / جهة بيع)</label>
                            <button
                              type="button"
                              onClick={() => setBuyerModalOpen(true)}
                              className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>+ إضافة عميل / جهة بيع جديدة</span>
                            </button>
                          </div>

                          {contacts.length > 0 && (
                            <div>
                              <select
                                value={weighbridgeForm.buyer_name}
                                onChange={e => {
                                  const selectedContact = contacts.find(c => c.name === e.target.value);
                                  setWeighbridgeForm({
                                    ...weighbridgeForm,
                                    contractor_name: e.target.value,
                                    buyer_name: e.target.value,
                                    buyer_phone: selectedContact?.phone || weighbridgeForm.buyer_phone
                                  });
                                }}
                                className="w-full bg-[#13131A] border border-blue-500/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- اختر من قائمة العملاء وجهات البيع المسجلة --</option>
                                {contacts.map(c => (
                                  <option key={c.id} value={c.name}>
                                    {c.name} {c.phone ? `(${c.phone})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <Input
                            label="🏢 اسم (عميل / جهة بيع) / المصنع / الشركة"
                            placeholder="مثال: شركة صلب الدلتا / الحاج محمود"
                            value={weighbridgeForm.buyer_name || weighbridgeForm.contractor_name}
                            onChange={e => setWeighbridgeForm({ ...weighbridgeForm, contractor_name: e.target.value, buyer_name: e.target.value })}
                            required
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="📞 هاتف العميل / جهة البيع"
                              placeholder="رقم الهاتف"
                              value={weighbridgeForm.buyer_phone}
                              onChange={e => setWeighbridgeForm({ ...weighbridgeForm, buyer_phone: e.target.value })}
                            />
                            <Input
                              label="📑 السجل / الرقم الضريبي"
                              placeholder="رقم السجل التجاري"
                              value={weighbridgeForm.buyer_tax_no}
                              onChange={e => setWeighbridgeForm({ ...weighbridgeForm, buyer_tax_no: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            label="🏢 (مورد خردة / خامات) / جهة التوريد"
                            placeholder="اسم المورد أو الجهة"
                            value={weighbridgeForm.contractor_name}
                            onChange={e => setWeighbridgeForm({ ...weighbridgeForm, contractor_name: e.target.value })}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="🏷️ رقم شاحنة النقل أو السيارة"
                          placeholder="مثال: أ ب ج 1234"
                          value={weighbridgeForm.truck_number}
                          onChange={e => setWeighbridgeForm({ ...weighbridgeForm, truck_number: e.target.value })}
                        />
                        <Input
                          label="👤 اسم السائق أو الناقل"
                          placeholder="اسم السائق"
                          value={weighbridgeForm.driver_name}
                          onChange={e => setWeighbridgeForm({ ...weighbridgeForm, driver_name: e.target.value })}
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setScaleWizardStep(2)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          التالي: الأوزان ←
                        </button>
                      </div>
                    </div>
                  )}

                  {scaleWizardStep === 2 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="🚚 الوزن القائم / حمولة الشاحنة (طن)"
                      type="number"
                      step="0.01"
                      placeholder="25.5"
                      value={weighbridgeForm.gross_weight_kg}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, gross_weight_kg: e.target.value })}
                      required
                    />
                    <Input
                      label="🚛 وزن الشاحنة فارغة (طن)"
                      type="number"
                      step="0.01"
                      placeholder="10.0"
                      value={weighbridgeForm.tare_weight_kg}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, tare_weight_kg: e.target.value })}
                      required
                    />
                  </div>

                  <div className="p-3 bg-[#13131F] border border-[#2A2A3E] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <FilterX className="w-4 h-4" />
                        خصم الشوائب والأتربة والهالك والرطوبة
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <label className="flex items-center gap-1 text-[#A0A0B0] cursor-pointer">
                          <input
                            type="radio"
                            name="deduction_type_modal"
                            checked={weighbridgeForm.deduction_type === 'percentage'}
                            onChange={() => setWeighbridgeForm({ ...weighbridgeForm, deduction_type: 'percentage' })}
                          />
                          نسبة مئوية (%)
                        </label>
                        <label className="flex items-center gap-1 text-[#A0A0B0] cursor-pointer">
                          <input
                            type="radio"
                            name="deduction_type_modal"
                            checked={weighbridgeForm.deduction_type === 'kg'}
                            onChange={() => setWeighbridgeForm({ ...weighbridgeForm, deduction_type: 'kg' })}
                          />
                          وزن مباشر (طن)
                        </label>
                      </div>
                    </div>

                    {weighbridgeForm.deduction_type === 'percentage' ? (
                      <div className="space-y-2">
                        <Input
                          label="نسبة خصم الشوائب (%)"
                          type="number"
                          step="0.1"
                          placeholder="مثال: 3%"
                          value={weighbridgeForm.impurity_percentage}
                          onChange={e => setWeighbridgeForm({ ...weighbridgeForm, impurity_percentage: e.target.value })}
                        />
                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-gray-400">اختصارات سريعة:</span>
                          {['0', '2', '3', '5', '8', '10'].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setWeighbridgeForm({ ...weighbridgeForm, impurity_percentage: pct })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                weighbridgeForm.impurity_percentage === pct
                                  ? 'bg-amber-500 text-black'
                                  : 'bg-[#232335] text-amber-300 hover:bg-[#2D2D44]'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Input
                        label="وزن خصم الشوائب (طن)"
                        type="number"
                        step="0.01"
                        placeholder="مثال: 0.25 طن"
                        value={weighbridgeForm.impurity_deduction_kg}
                        onChange={e => setWeighbridgeForm({ ...weighbridgeForm, impurity_deduction_kg: e.target.value })}
                      />
                    )}
                  </div>

                  <Input
                    label="💰 سعر شراء الطن الصافي (ج.م / طن)"
                    type="number"
                    step="0.01"
                    placeholder="25000"
                    value={weighbridgeForm.unit_price}
                    onChange={e => setWeighbridgeForm({ ...weighbridgeForm, unit_price: e.target.value })}
                    required
                  />

                  <div className="p-3 bg-[#13131F] border border-[#2A2A3E] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <FilterX className="w-4 h-4" />
                        خصم الشوائب والأتربة والهالك والرطوبة
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <label className="flex items-center gap-1 text-[#A0A0B0] cursor-pointer">
                          <input
                            type="radio"
                            name="deduction_type_modal"
                            checked={weighbridgeForm.deduction_type === 'percentage'}
                            onChange={() => setWeighbridgeForm({ ...weighbridgeForm, deduction_type: 'percentage' })}
                          />
                          نسبة مئوية (%)
                        </label>
                        <label className="flex items-center gap-1 text-[#A0A0B0] cursor-pointer">
                          <input
                            type="radio"
                            name="deduction_type_modal"
                            checked={weighbridgeForm.deduction_type === 'kg'}
                            onChange={() => setWeighbridgeForm({ ...weighbridgeForm, deduction_type: 'kg' })}
                          />
                          وزن مباشر (كجم)
                        </label>
                      </div>
                    </div>

                    {weighbridgeForm.deduction_type === 'percentage' ? (
                      <div className="space-y-2">
                        <Input
                          label="نسبة خصم الشوائب (%)"
                          type="number"
                          step="0.1"
                          placeholder="مثال: 3%"
                          value={weighbridgeForm.impurity_percentage}
                          onChange={e => setWeighbridgeForm({ ...weighbridgeForm, impurity_percentage: e.target.value })}
                        />
                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-gray-400">اختصارات سريعة:</span>
                          {['0', '2', '3', '5', '8', '10'].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setWeighbridgeForm({ ...weighbridgeForm, impurity_percentage: pct })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                weighbridgeForm.impurity_percentage === pct
                                  ? 'bg-amber-500 text-black'
                                  : 'bg-[#232335] text-amber-300 hover:bg-[#2D2D44]'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Input
                        label="وزن خصم الشوائب (كجم)"
                        type="number"
                        placeholder="مثال: 250 كجم"
                        value={weighbridgeForm.impurity_deduction_kg}
                        onChange={e => setWeighbridgeForm({ ...weighbridgeForm, impurity_deduction_kg: e.target.value })}
                      />
                    )}
                  </div>

                  <Input
                    label="💰 سعر شراء الكيلو (ج.م / كجم)"
                    type="number"
                    step="0.1"
                    placeholder="25"
                    value={weighbridgeForm.unit_price}
                    onChange={e => setWeighbridgeForm({ ...weighbridgeForm, unit_price: e.target.value })}
                    required
                  />

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setScaleWizardStep(1)}
                      className="px-4 py-2 bg-[#232335] hover:bg-[#2D2D44] text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleWizardStep(3)}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>التالي: الشاحنة والسمسار</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Logistics & Commission */}
              {scaleWizardStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="🚚 رقم لوحة الشاحنة"
                      type="text"
                      placeholder="مثال: أ ب ج 1234"
                      value={weighbridgeForm.truck_number}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, truck_number: e.target.value })}
                    />
                    <Input
                      label="👤 اسم السائق"
                      type="text"
                      placeholder="اسم السائق"
                      value={weighbridgeForm.driver_name}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, driver_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="💼 اسم السمسار / الوسيط"
                      type="text"
                      placeholder="اسم السمسار"
                      value={weighbridgeForm.broker_name}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, broker_name: e.target.value })}
                    />
                    <Input
                      label="💵 عمولة السمسار (ج.م / طن)"
                      type="number"
                      placeholder="مثال: 50 ج.م/طن"
                      value={weighbridgeForm.commission_per_ton}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, commission_per_ton: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">
                      📝 ملاحظات عملية التوزين
                    </label>
                    <textarea
                      value={weighbridgeForm.notes}
                      onChange={e => setWeighbridgeForm({ ...weighbridgeForm, notes: e.target.value })}
                      placeholder="أية ملاحظات إضافية بخصوص الشحنة أو جودة الخردة..."
                      className="w-full px-3 py-2 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded-lg focus:outline-none focus:border-purple-500 text-xs h-16 resize-none"
                    />
                  </div>

                  <div className="flex justify-between pt-3 border-t border-[#23232F]">
                    <button
                      type="button"
                      onClick={() => setScaleWizardStep(2)}
                      className="px-4 py-2 bg-[#232335] hover:bg-[#2D2D44] text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/40"
                      loading={submitLoading}
                    >
                      <CheckCircle className="w-4 h-4" />
                      حفظ وتسجيل كارتة الميزان 💾
                    </Button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* 2. Sorting & Grading Modal */}
      {sortingModalOpen && (
        <div 
          onClick={() => setSortingModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-lg w-full p-4 sm:p-5 text-right space-y-4 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">🧹 فرز وتصنيف الخردة</h3>
                  <p className="text-[10px] text-[#A0A0B0]">توزيع دفعة خردة خام إلى أصناف مفروزة مع احتساب نسبة الهالك</p>
                </div>
              </div>
              <button
                onClick={() => setSortingModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessSorting} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">
                  📦 اختر دفعة الخردة الخام المراد فرزها
                </label>
                <select
                  value={sortingForm.source_inventory_id}
                  onChange={e => setSortingForm({ ...sortingForm, source_inventory_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-xs"
                  required
                >
                  <option value="">-- اختر دفعة من المخزون --</option>
                  {inventory.filter(i => i.quality === 'raw').map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.material_name} - {item.weight_kg.toLocaleString()} كجم (تاريخ: {item.purchase_date})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="⚖️ كمية الوزن المدخل للفرز (الوزن بالطن)"
                type="number"
                step="0.001"
                placeholder="أدخل الوزن بالطن (مثال: 5)"
                value={sortingForm.sorted_weight_kg}
                onChange={e => setSortingForm({ ...sortingForm, sorted_weight_kg: e.target.value })}
                required
              />

              {/* Dynamic Outputs */}
              <div className="p-3 bg-[#0F0F17] border border-[#2A2A3E] rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-300">🎯 مخرجات الفرز والأصناف الناتجة</span>
                  <button
                    type="button"
                    onClick={() => setSortingForm({
                      ...sortingForm,
                      outputs: [...sortingForm.outputs, { material_id: materials[0]?.id || '', weight_kg: '', unit_price: '' }]
                    })}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة صنف مخرج
                  </button>
                </div>

                {sortingForm.outputs.map((out, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#181826] p-2 rounded-lg border border-[#2A2A3E]">
                    <div className="col-span-5">
                      <select
                        value={out.material_id}
                        onChange={e => {
                          const newOuts = [...sortingForm.outputs];
                          newOuts[idx].material_id = e.target.value;
                          setSortingForm({ ...sortingForm, outputs: newOuts });
                        }}
                        className="w-full px-2 py-1.5 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded focus:outline-none text-xs"
                        required
                      >
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="الوزن بالطن"
                        value={out.weight_kg}
                        onChange={e => {
                          const newOuts = [...sortingForm.outputs];
                          newOuts[idx].weight_kg = e.target.value;
                          setSortingForm({ ...sortingForm, outputs: newOuts });
                        }}
                        className="w-full px-2 py-1.5 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded focus:outline-none text-xs"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="السعر ج.م"
                        value={out.unit_price}
                        onChange={e => {
                          const newOuts = [...sortingForm.outputs];
                          newOuts[idx].unit_price = e.target.value;
                          setSortingForm({ ...sortingForm, outputs: newOuts });
                        }}
                        className="w-full px-2 py-1.5 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded focus:outline-none text-xs"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const newOuts = sortingForm.outputs.filter((_, i) => i !== idx);
                          setSortingForm({ ...sortingForm, outputs: newOuts });
                        }}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Yield summary */}
              {sortingInputKg > 0 && (
                <div className="p-3 bg-[#13131F] rounded-xl border border-[#2A2A3E] flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-400 block">نسبة الوفر المفرور:</span>
                    <span className="font-bold text-emerald-400 text-sm">{sortingYieldPct}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">الهالك / التراب والشوائب:</span>
                    <span className="font-bold text-red-400 text-sm">{sortingWasteKg.toLocaleString()} كجم</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23232F]">
                <button
                  type="button"
                  onClick={() => setSortingModalOpen(false)}
                  className="px-4 py-2 bg-[#232335] text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  loading={submitLoading}
                >
                  <CheckCircle className="w-4 h-4" />
                  تنفيذ الفرز والتصنيف 🧹
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. New Material Registration Modal */}
      {materialModalOpen && (
        <div 
          onClick={() => setMaterialModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-md w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">🏷️ إضافة صنف / مادة خردة جديدة</h3>
              </div>
              <button
                onClick={() => setMaterialModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewMaterial} className="space-y-3">
              <Input
                label="اسم المادة (مثال: نحاس أصفر، ألومنيوم خردة، خرس معالج)"
                type="text"
                placeholder="ادخل اسم المادة"
                value={newMaterialForm.name}
                onChange={e => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#A0A0B0]">
                    الفئة الرئيسية
                  </label>
                  <select
                    value={newMaterialForm.category}
                    onChange={e => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded-lg focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="حديد">حديد وصُلب</option>
                    <option value="نحاس">نحاس بأنواعه</option>
                    <option value="ألومنيوم">ألومنيوم</option>
                    <option value="معادن أخرى">معادن وأسلاك أخرى</option>
                    <option value="خرس وخبث">خرس وخبث أفران</option>
                    <option value="بلاستيك">بلاستيك وإعادة تدوير</option>
                  </select>
                </div>

                <Input
                  label="سعر التوزين المعتمد (ج.م/كجم)"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={newMaterialForm.current_price}
                  onChange={e => setNewMaterialForm({ ...newMaterialForm, current_price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">
                  وصف وتفاصيل الصنف
                </label>
                <textarea
                  value={newMaterialForm.description}
                  onChange={e => setNewMaterialForm({ ...newMaterialForm, description: e.target.value })}
                  placeholder="وصف مواصفات وتصنيف المادة..."
                  className="w-full px-3 py-2 bg-[#0F0F17] border border-[#2A2A3E] text-white rounded-lg focus:outline-none focus:border-purple-500 text-xs h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#23232F]">
                <button
                  type="button"
                  onClick={() => setMaterialModalOpen(false)}
                  className="px-4 py-2 bg-[#232335] text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  loading={submitLoading}
                >
                  <Plus className="w-4 h-4" />
                  حفظ الصنف بالنظام 💾
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Buyer/Customer Modal */}
      {buyerModalOpen && (
        <div 
          onClick={() => setBuyerModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-md w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-500/30">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">👤 إضافة بيانات (عميل / جهة بيع) جديدة</h3>
                  <p className="text-[10px] text-[#A0A0B0]">تسجيل (عميل / جهة بيع) وحفظ البيانات بدفتر الحسابات</p>
                </div>
              </div>
              <button
                onClick={() => setBuyerModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBuyer} className="space-y-3">
              <Input
                label="🏢 اسم (عميل / جهة بيع) / الشركة / المصنع"
                type="text"
                placeholder="مثال: شركة حديد ومصانع الدلتا / الحاج محمود السويسي"
                value={newBuyerForm.name}
                onChange={e => setNewBuyerForm({ ...newBuyerForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="📞 رقم الهاتف / التواصل"
                  type="text"
                  placeholder="01012345678"
                  value={newBuyerForm.phone}
                  onChange={e => setNewBuyerForm({ ...newBuyerForm, phone: e.target.value })}
                />
                <Input
                  label="📑 السجل التجاري / البطاقة الضريبية"
                  type="text"
                  placeholder="رقم السجل أو البطاقة"
                  value={newBuyerForm.tax_no}
                  onChange={e => setNewBuyerForm({ ...newBuyerForm, tax_no: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">
                  🏷️ تصنيف المشتري / نوع النشاط
                </label>
                <select
                  value={newBuyerForm.buyer_type}
                  onChange={e => setNewBuyerForm({ ...newBuyerForm, buyer_type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg focus:outline-none focus:border-purple-500 text-xs"
                >
                  <option value="مصنع صلب ومسبك">مصنع صلب ومسبك صهر</option>
                  <option value="تاجر خردة بالجملة">تاجر خردة ومستودع بالجملة</option>
                  <option value="شركة تصدير وشحن">شركة تصدير وشحن دولي</option>
                  <option value="مصنع تدوير بلاستيك ومعادن">مصنع تدوير بلاستيك ومعادن</option>
                  <option value="عميل تجزئة ورش">عميل تجزئة / ورش وصيانة</option>
                </select>
              </div>

              <Input
                label="📍 العنوان / المحافظة / الموعد"
                type="text"
                placeholder="مثال: المنطقة الصناعية - السادات / السادس من أكتوبر"
                value={newBuyerForm.address}
                onChange={e => setNewBuyerForm({ ...newBuyerForm, address: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23232F]">
                <button
                  type="button"
                  onClick={() => setBuyerModalOpen(false)}
                  className="px-4 py-2 bg-[#232335] text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  loading={submitLoading}
                >
                  <UserCheck className="w-4 h-4" />
                  حفظ المشتري بالنظام 💾
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Report Preview Modal */}
      {expenseReportModalOpen && (
        <div 
          onClick={() => setExpenseReportModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-4xl w-full p-4 sm:p-6 text-right space-y-4 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">🖨️ معاينة تقرير المصروفات والنفقات التشغيلية (PDF)</h3>
                  <p className="text-[10px] text-[#A0A0B0]">عرض مسودة التقرير الرسمي الشامل ومخرجات الطباعة</p>
                </div>
              </div>
              <button
                onClick={() => setExpenseReportModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#23232F] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Preview Sheet */}
            <div className="bg-white text-gray-900 rounded-xl p-6 space-y-4 font-sans border border-gray-200 text-xs shadow-inner">
              <div className="flex justify-between items-center border-b-2 border-purple-600 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-700 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                    ♻️
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-purple-950">مؤسسة إدارة وتدوير الخردة وميزان البسكول</h2>
                    <p className="text-[11px] text-gray-500">تقرير المصروفات والنفقات التشغيلية التفصيلي المعتمد</p>
                  </div>
                </div>
                <div className="text-left bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                  <div className="text-[11px] font-bold text-purple-900">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div className="text-[10px] text-purple-700 font-mono">القيود المعروضة: {scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).length}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">القسم المستفيد:</span>
                  <span className="text-xs font-bold text-indigo-900">{expenseFilterDepartment === 'all' ? 'جميع الأقسام الفنّية' : expenseFilterDepartment}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">تصنيف المصروف:</span>
                  <span className="text-xs font-bold text-purple-900">{expenseFilterCategory === 'all' ? 'جميع البنود' : expenseFilterCategory}</span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-[10px] text-rose-700 block">إجمالي المصروفات بالتقرير:</span>
                  <span className="text-sm font-black text-rose-900">
                    {scrapExpenses
                      .filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment))
                      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
                      .toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse border border-gray-300 text-[11px]">
                  <thead>
                    <tr className="bg-purple-950 text-white font-bold">
                      <th className="p-2 border border-purple-900">#</th>
                      <th className="p-2 border border-purple-900">رقم القيد</th>
                      <th className="p-2 border border-purple-900">التاريخ</th>
                      <th className="p-2 border border-purple-900">القسم / الفرع</th>
                      <th className="p-2 border border-purple-900">بند المصروف</th>
                      <th className="p-2 border border-purple-900">البيان / الشرح</th>
                      <th className="p-2 border border-purple-900">المستفيد</th>
                      <th className="p-2 border border-purple-900">المبلغ (ج.م)</th>
                      <th className="p-2 border border-purple-900">طريقة الدفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-6 text-gray-400">
                          لا توجد بيانات مصروفات مطابقة للفلتر.
                        </td>
                      </tr>
                    ) : (
                      scrapExpenses.filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment)).map((exp: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border border-gray-300 text-center">{idx + 1}</td>
                          <td className="p-2 border border-gray-300 font-mono font-bold text-purple-900">{exp.id || `#EXP-${idx+1}`}</td>
                          <td className="p-2 border border-gray-300">{exp.expense_date || exp.expenseDate || '—'}</td>
                          <td className="p-2 border border-gray-300 font-bold">{exp.department || 'قسم ميزان البسكول'}</td>
                          <td className="p-2 border border-gray-300">
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              {exp.category || 'مصاريف تشغيل'}
                            </span>
                          </td>
                          <td className="p-2 border border-gray-300 text-gray-700">{exp.description || exp.notes || '—'}</td>
                          <td className="p-2 border border-gray-300 font-semibold">{exp.payee || exp.vendor_name || 'سائق/مورد'}</td>
                          <td className="p-2 border border-gray-300 font-extrabold text-rose-700 text-xs">
                            {Number(exp.amount || 0).toLocaleString()} ج.م
                          </td>
                          <td className="p-2 border border-gray-300">{exp.payment_method === 'bank' ? 'تحويل بنكي' : 'نقداً'}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-rose-100 font-bold text-xs text-rose-950">
                      <td colSpan={7} className="p-2.5 border border-rose-300 text-left font-black">
                        إجمالي المصروفات والنفقات بالتقرير:
                      </td>
                      <td className="p-2.5 border border-rose-300 font-black text-rose-900 text-sm">
                        {scrapExpenses
                          .filter((e: any) => (expenseFilterCategory === 'all' || e.category === expenseFilterCategory) && (expenseFilterDepartment === 'all' || e.department === expenseFilterDepartment))
                          .reduce((s, e) => s + (Number(e.amount) || 0), 0)
                          .toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 border border-rose-300"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 text-[11px] text-gray-600">
                <div>توقيع أخصائي الحسابات: .....................................</div>
                <div>اعتماد مدير قسم الخردة والتشغيل: .....................................</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#23232F]">
              <button
                type="button"
                onClick={() => setExpenseReportModalOpen(false)}
                className="px-4 py-2 bg-[#232335] text-gray-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-[#2e2e45]"
              >
                إغلاق النافذة
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handlePrintExpensesPDF();
                    setExpenseReportModalOpen(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  🖨️ بدء الطباعة والتصدير كـ PDF الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Weighbridge Ticket Modal */}
      {editTxModalOpen && editingTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-xl w-full p-6 text-right space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400" />
                تعديل كارتة ميزان البسكول #{editingTx.scale_ticket_no || editingTx.id}
              </h3>
              <button onClick={() => setEditTxModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditTx} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🎫 رقم كارتة الميزان"
                  type="text"
                  value={editingTx.scale_ticket_no || ''}
                  onChange={e => setEditingTx({ ...editingTx, scale_ticket_no: e.target.value })}
                />
                <Input
                  label="📅 تاريخ التوزين"
                  type="date"
                  value={editingTx.transaction_date || ''}
                  onChange={e => setEditingTx({ ...editingTx, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🚚 الوزن القائم (طن)"
                  type="number"
                  step="0.01"
                  value={editingTx.gross_weight_kg || ''}
                  onChange={e => setEditingTx({ ...editingTx, gross_weight_kg: e.target.value })}
                />
                <Input
                  label="🚛 الوزن الفارغ (طن)"
                  type="number"
                  step="0.01"
                  value={editingTx.tare_weight_kg || ''}
                  onChange={e => setEditingTx({ ...editingTx, tare_weight_kg: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🧹 خصم الشوائب (طن)"
                  type="number"
                  step="0.01"
                  value={editingTx.impurity_deduction_kg || ''}
                  onChange={e => setEditingTx({ ...editingTx, impurity_deduction_kg: e.target.value })}
                />
                <Input
                  label="💵 سعر الطن (ج.م)"
                  type="number"
                  step="0.01"
                  value={editingTx.unit_price || ''}
                  onChange={e => setEditingTx({ ...editingTx, unit_price: e.target.value })}
                  required
                />
              </div>

              <Input
                label="🏢 المقاول / الجهة / العميل"
                type="text"
                value={editingTx.contact_name || editingTx.contractor_name || ''}
                onChange={e => setEditingTx({ ...editingTx, contractor_name: e.target.value, contact_name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🚚 رقم الشاحنة"
                  type="text"
                  value={editingTx.truck_number || ''}
                  onChange={e => setEditingTx({ ...editingTx, truck_number: e.target.value })}
                />
                <Input
                  label="👤 اسم السائق"
                  type="text"
                  value={editingTx.driver_name || ''}
                  onChange={e => setEditingTx({ ...editingTx, driver_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🤝 اسم السمسار"
                  type="text"
                  value={editingTx.broker_name || ''}
                  onChange={e => setEditingTx({ ...editingTx, broker_name: e.target.value })}
                />
                <Input
                  label="💵 إجمالي العمولة"
                  type="number"
                  step="0.01"
                  value={editingTx.commission_total || ''}
                  onChange={e => setEditingTx({ ...editingTx, commission_total: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">📝 ملاحظات</label>
                <textarea
                  value={editingTx.notes || ''}
                  onChange={e => setEditingTx({ ...editingTx, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={submitLoading} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">
                  💾 حفظ التعديلات
                </Button>
                <button type="button" onClick={() => setEditTxModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scrap Expense Modal */}
      {editExpenseModalOpen && editingExpense && (
        <div 
          onClick={() => setEditExpenseModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-lg w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-rose-400" />
                تعديل قيد المصروف #{editingExpense.id}
              </h3>
              <button onClick={() => setEditExpenseModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="💵 المبلغ (ج.م)"
                  type="number"
                  step="0.01"
                  value={editingExpense.amount || ''}
                  onChange={e => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                  required
                />
                <Input
                  label="📅 تاريخ المصروف"
                  type="date"
                  value={editingExpense.expense_date || editingExpense.expenseDate || ''}
                  onChange={e => setEditingExpense({ ...editingExpense, expense_date: e.target.value, expenseDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">🏢 القسم المستفيد</label>
                <select
                  value={editingExpense.department || 'قسم ميزان البسكول'}
                  onChange={e => setEditingExpense({ ...editingExpense, department: e.target.value })}
                  className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                >
                  {departments.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">🏷️ بند المصروف</label>
                <select
                  value={editingExpense.category || ''}
                  onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                >
                  {expenseCategories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Input
                label="👤 المستفيد / المورد"
                type="text"
                value={editingExpense.payee || ''}
                onChange={e => setEditingExpense({ ...editingExpense, payee: e.target.value })}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">📝 البيان والشرح</label>
                <textarea
                  value={editingExpense.description || editingExpense.notes || ''}
                  onChange={e => setEditingExpense({ ...editingExpense, description: e.target.value, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={submitLoading} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">
                  💾 حفظ التعديلات
                </Button>
                <button type="button" onClick={() => setEditExpenseModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {editMaterialModalOpen && editingMaterial && (
        <div 
          onClick={() => setEditMaterialModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-md w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                تعديل صنف خردة #{editingMaterial.id}
              </h3>
              <button onClick={() => setEditMaterialModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditMaterial} className="space-y-3">
              <Input
                label="🏷️ اسم الصنف"
                type="text"
                value={editingMaterial.name || ''}
                onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">الفئة الأساسية</label>
                <select
                  value={editingMaterial.category || 'حديد'}
                  onChange={e => setEditingMaterial({ ...editingMaterial, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                >
                  <option value="حديد">حديد</option>
                  <option value="نحاس">نحاس</option>
                  <option value="ألومنيوم">ألومنيوم</option>
                  <option value="بلاستيك">بلاستيك ونفايات صلبة</option>
                  <option value="خرس وركام">خرس وركام / Slag</option>
                  <option value="ورق">ورق وكرتون</option>
                  <option value="مشكل">خردة مشكلة خام</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="وحدة القياس"
                  type="text"
                  value={editingMaterial.unit || ''}
                  onChange={e => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                  required
                />
                <Input
                  label="السعر المعتمد للتوزين (ج.م)"
                  type="number"
                  step="0.01"
                  value={editingMaterial.current_price || ''}
                  onChange={e => setEditingMaterial({ ...editingMaterial, current_price: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={submitLoading} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">
                  💾 حفظ التعديلات
                </Button>
                <button type="button" onClick={() => setEditMaterialModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Broker Commission Modal */}
      {editCommissionModalOpen && editingCommission && (
        <div 
          onClick={() => setEditCommissionModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-lg w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                تعديل عمولة السمسار #{editingCommission.id}
              </h3>
              <button onClick={() => setEditCommissionModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditCommission} className="space-y-3">
              <Input
                label="👤 اسم السمسار / المندوب"
                type="text"
                value={editingCommission.broker_name || ''}
                onChange={e => setEditingCommission({ ...editingCommission, broker_name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="⚖️ الكمية (بالطن)"
                  type="number"
                  step="0.01"
                  value={editingCommission.weight_tons || ''}
                  onChange={e => setEditingCommission({ ...editingCommission, weight_tons: e.target.value })}
                  required
                />
                <Input
                  label="💵 عمولة الطن (ج.م)"
                  type="number"
                  step="0.01"
                  value={editingCommission.rate_per_ton || ''}
                  onChange={e => setEditingCommission({ ...editingCommission, rate_per_ton: e.target.value })}
                  required
                />
              </div>

              <Input
                label="📅 التاريخ"
                type="date"
                value={editingCommission.date || ''}
                onChange={e => setEditingCommission({ ...editingCommission, date: e.target.value })}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#A0A0B0]">📝 ملاحظات</label>
                <textarea
                  value={editingCommission.notes || ''}
                  onChange={e => setEditingCommission({ ...editingCommission, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#13131A] border border-[#23232F] text-white rounded-lg text-xs"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={submitLoading} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">
                  💾 حفظ التعديلات
                </Button>
                <button type="button" onClick={() => setEditCommissionModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Slag Shipment Modal */}
      {editSlagModalOpen && editingSlag && (
        <div 
          onClick={() => setEditSlagModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#14141F] border border-[#2A2A3E] rounded-2xl max-w-lg w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative my-6 max-h-[85vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                تعديل شحنة الجلخ/الخرس #{editingSlag.id}
              </h3>
              <button onClick={() => setEditSlagModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditSlag} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="🚗 رقم الشاحنة"
                  type="text"
                  value={editingSlag.vehicleNumber || editingSlag.car_number || ''}
                  onChange={e => setEditingSlag({ ...editingSlag, vehicleNumber: e.target.value, car_number: e.target.value })}
                />
                <Input
                  label="👤 اسم السائق"
                  type="text"
                  value={editingSlag.driverName || editingSlag.driver_name || ''}
                  onChange={e => setEditingSlag({ ...editingSlag, driverName: e.target.value, driver_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="⚖️ الحمولة (طن)"
                  type="number"
                  step="0.01"
                  value={editingSlag.loadQuantity !== undefined ? editingSlag.loadQuantity : (editingSlag.quantity || '')}
                  onChange={e => setEditingSlag({ ...editingSlag, loadQuantity: e.target.value, quantity: e.target.value })}
                />
                <Input
                  label="💵 سعر طن المصنع (ج.م)"
                  type="number"
                  step="0.01"
                  value={editingSlag.factoryPricePerTon !== undefined ? editingSlag.factoryPricePerTon : (editingSlag.factory_price_per_ton || '')}
                  onChange={e => setEditingSlag({ ...editingSlag, factoryPricePerTon: e.target.value, factory_price_per_ton: e.target.value })}
                />
              </div>

              <Input
                label="📅 تاريخ الشحنة"
                type="date"
                value={editingSlag.transactionDate || editingSlag.date || ''}
                onChange={e => setEditingSlag({ ...editingSlag, transactionDate: e.target.value, date: e.target.value })}
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={submitLoading} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">
                  💾 حفظ التعديلات
                </Button>
                <button type="button" onClick={() => setEditSlagModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div 
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer transition-all" 
          dir="rtl"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#161622] border border-[#23232F] rounded-2xl max-w-sm w-full p-4 sm:p-5 text-right space-y-3 shadow-2xl relative cursor-default"
          >
            <div className="flex items-center gap-3">
              {modalType === 'success' && (
                <div className="p-2 bg-emerald-950/40 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
              {modalType === 'info' && (
                <div className="p-2 bg-purple-950/40 text-purple-400 rounded-lg border border-purple-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
              )}
              {modalType === 'warning' && (
                <div className="p-2 bg-red-950/40 text-red-400 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">{modalTitle}</h3>
              </div>
            </div>
            
            <p className="text-xs text-[#A0A0B0] leading-relaxed whitespace-pre-line">
              {modalMessage}
            </p>
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
