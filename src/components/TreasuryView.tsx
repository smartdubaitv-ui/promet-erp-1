import React, { useState, useEffect } from 'react';
import { 
  Vault, 
  ArrowRightLeft, 
  PlusCircle, 
  MinusCircle, 
  Building2, 
  Landmark, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  History, 
  User as UserIcon, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  FileText,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  Ban,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  HelpCircle,
  Printer,
  Calculator,
  Lock,
  Coins,
  FileCheck,
  ClipboardCheck,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TreasuryViewProps {
  userRole?: string;
  currentUser?: any;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({ userRole = 'admin', currentUser }) => {
  const [activeTab, setActiveTab] = useState<'vaults' | 'transfers' | 'vouchers' | 'closures' | 'settings'>('vaults');
  
  const [vaults, setVaults] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Vault for Ledger Detail View
  const [selectedVault, setSelectedVault] = useState<any | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');

  // Modal States
  const [showCreateVaultModal, setShowCreateVaultModal] = useState<boolean>(false);
  const [showEditVaultModal, setShowEditVaultModal] = useState<boolean>(false);
  const [editingVault, setEditingVault] = useState<any | null>(null);

  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showRejectTransferModal, setShowRejectTransferModal] = useState<boolean>(false);
  const [selectedTransferForReject, setSelectedTransferForReject] = useState<any | null>(null);

  // Closure & Denomination States
  const [showClosureModal, setShowClosureModal] = useState<boolean>(false);
  const [showDenominationModal, setShowDenominationModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState<{ type: 'voucher' | 'transfer' | 'closure', data: any } | null>(null);

  // Denominations breakdown
  const [denominations, setDenominations] = useState({
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    d5: 0,
    coins: 0
  });

  const [closureForm, setClosureForm] = useState({
    vault_id: '',
    notes: '',
    closed_by_name: currentUser?.name || 'أمين الخزينة',
    adjust_balance: true,
    manual_physical_count: ''
  });

  // Form States
  const [vaultForm, setVaultForm] = useState({
    name: '',
    type: 'main',
    custodian_id: '',
    custodian_name: '',
    custodian_email: '',
    opening_balance: 0,
    max_limit: 100000
  });

  const [receiptForm, setReceiptForm] = useState({
    vault_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'customer_collection',
    notes: '',
    contact_id: '',
    contact_name: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    vault_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'supplier_payment',
    notes: '',
    contact_id: '',
    contact_name: '',
    contract_name: '',
    client_name: '',
    expected_return_date: new Date().toISOString().split('T')[0]
  });

  const [transferForm, setTransferForm] = useState({
    from_vault_id: '',
    to_vault_id: '',
    amount: '',
    reason: ''
  });

  const [bankForm, setBankForm] = useState({
    vault_id: '',
    operation_type: 'deposit', // deposit (توريد للبنك) or withdrawal (سحب من البنك)
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [rejectReason, setRejectReason] = useState<string>('');

  // Calculated Denomination Total
  const calculatedPhysicalTotal = 
    (Number(denominations.d200) || 0) * 200 +
    (Number(denominations.d100) || 0) * 100 +
    (Number(denominations.d50) || 0) * 50 +
    (Number(denominations.d20) || 0) * 20 +
    (Number(denominations.d10) || 0) * 10 +
    (Number(denominations.d5) || 0) * 5 +
    (Number(denominations.coins) || 0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await Promise.all([
        fetchVaults(),
        fetchVouchers(),
        fetchTransfers(),
        fetchClosures(),
        fetchStats(),
        fetchUsersAndContacts()
      ]);
    } catch (err: any) {
      console.error('Error fetching treasury data:', err);
      setErrorMsg('فشل في تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
    }
  };

  const fetchClosures = async () => {
    try {
      const res = await fetch('/api/treasury/closures');
      const data = await res.json();
      if (data.success) {
        setClosures(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching closures:', e);
    }
  };

  const handleCloseVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureForm.vault_id) {
      showNotification('يرجى اختيار الخزينة المراد إغلاقها', true);
      return;
    }

    const physicalCount = closureForm.manual_physical_count !== ''
      ? Number(closureForm.manual_physical_count)
      : calculatedPhysicalTotal;

    try {
      const res = await fetch(`/api/treasury/vaults/${closureForm.vault_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physical_count: physicalCount,
          denominations,
          notes: closureForm.notes,
          adjust_balance: closureForm.adjust_balance
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'تم إغلاق وتقفيل الخزينة بنجاح');
        setShowClosureModal(false);
        setDenominations({ d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, coins: 0 });
        setClosureForm({ vault_id: '', notes: '', closed_by_name: currentUser?.name || 'أمين الخزينة', adjust_balance: true, manual_physical_count: '' });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في إغلاق الخزينة', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء تقفيل الخزينة', true);
    }
  };

  const tafqeet = (num: number): string => {
    const val = Math.abs(Number(num) || 0);
    if (val === 0) return 'صفر جنيه مصري';
    return `${val.toLocaleString('ar-EG')} جنيه مصري لا غير`;
  };

  const fetchVaults = async () => {
    const res = await fetch('/api/treasury/vaults');
    const data = await res.json();
    if (data.success) {
      setVaults(data.data || []);
      // If a vault was selected, refresh its data
      if (selectedVault) {
        const updated = (data.data || []).find((v: any) => v.id === selectedVault.id);
        if (updated) setSelectedVault(updated);
      }
    }
  };

  const fetchVouchers = async () => {
    const res = await fetch('/api/treasury/vouchers');
    const data = await res.json();
    if (data.success) {
      setVouchers(data.data || []);
    }
  };

  const fetchTransfers = async () => {
    const res = await fetch('/api/treasury/transfers');
    const data = await res.json();
    if (data.success) {
      setTransfers(data.data || []);
    }
  };

  const fetchStats = async () => {
    const res = await fetch('/api/treasury/stats');
    const data = await res.json();
    if (data.success) {
      setStats(data.stats);
    }
  };

  const fetchUsersAndContacts = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/contacts')
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsersList(Array.isArray(uData) ? uData : uData.data || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setContactsList(Array.isArray(cData) ? cData : cData.data || []);
      }
    } catch (e) {
      console.warn('Could not fetch auxiliary users/contacts:', e);
    }
  };

  // Notification helper
  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 6000);
  };

  // -------------------------------------------------------------
  // Handlers for Vault CRUD
  // -------------------------------------------------------------

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.name.trim()) {
      showNotification('يرجى إدخال اسم الخزينة', true);
      return;
    }

    try {
      const res = await fetch('/api/treasury/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'تم إنشاء الخزينة بنجاح');
        setShowCreateVaultModal(false);
        setVaultForm({
          name: '',
          type: 'main',
          custodian_id: '',
          custodian_name: '',
          custodian_email: '',
          opening_balance: 0,
          max_limit: 100000
        });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في إنشاء الخزينة', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء حفظ بيانات الخزينة', true);
    }
  };

  const handleOpenEditVaultModal = (vault: any) => {
    setEditingVault(vault);
    setVaultForm({
      name: vault.name,
      type: vault.type,
      custodian_id: vault.custodian_id || '',
      custodian_name: vault.custodian_name || '',
      custodian_email: vault.custodian_email || '',
      opening_balance: vault.opening_balance || 0,
      max_limit: vault.max_limit || 100000
    });
    setShowEditVaultModal(true);
  };

  const handleUpdateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVault) return;

    try {
      const res = await fetch(`/api/treasury/vaults/${editingVault.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vaultForm.name,
          type: vaultForm.type,
          custodian_id: vaultForm.custodian_id,
          custodian_name: vaultForm.custodian_name,
          custodian_email: vaultForm.custodian_email,
          max_limit: vaultForm.max_limit
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'تم تحديث بيانات الخزينة بنجاح');
        setShowEditVaultModal(false);
        setEditingVault(null);
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في تحديث الخزينة', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء تحديث الخزينة', true);
    }
  };

  const handleToggleVaultStatus = async (vault: any) => {
    try {
      const res = await fetch(`/api/treasury/vaults/${vault.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchAllData();
      } else {
        showNotification(data.error, true);
      }
    } catch (err) {
      showNotification('فشل في تغيير حالة الخزينة', true);
    }
  };

  const handleDeleteVault = async (vault: any) => {
    if (!window.confirm(`هل أنت أصل من رغبتك في حذف الخزينة "${vault.name}"؟`)) return;

    try {
      const res = await fetch(`/api/treasury/vaults/${vault.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        if (selectedVault?.id === vault.id) setSelectedVault(null);
        fetchAllData();
      } else {
        showNotification(data.error, true);
      }
    } catch (err) {
      showNotification('فشل في حذف الخزينة', true);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Receipt & Payment Vouchers
  // -------------------------------------------------------------

  const handleCreateReceiptVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptForm.vault_id) {
      showNotification('يرجى اختيار الخزينة المستلمة', true);
      return;
    }
    if (!receiptForm.amount || Number(receiptForm.amount) <= 0) {
      showNotification('يرجى إدخال مبلغ إيداع صحيح أكبر من صفر', true);
      return;
    }

    try {
      const res = await fetch('/api/treasury/vouchers/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        if (data.warning) {
          setTimeout(() => showNotification(data.warning, true), 2000);
        }
        setShowReceiptModal(false);
        setReceiptForm({
          vault_id: selectedVault?.id || '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          type: 'customer_collection',
          notes: '',
          contact_id: '',
          contact_name: ''
        });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في تسجيل سند القبض', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء تسليم سند القبض', true);
    }
  };

  const handleCreatePaymentVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.vault_id) {
      showNotification('يرجى اختيار الخزينة الصارفة', true);
      return;
    }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      showNotification('يرجى إدخال مبلغ صرف صحيح أكبر من صفر', true);
      return;
    }

    if (paymentForm.type === 'contract_security' && (!paymentForm.contract_name || !paymentForm.client_name)) {
      showNotification('يرجى إدخال اسم العقد واسم العميل لتأمين العقد', true);
      return;
    }

    try {
      const endpoint = paymentForm.type === 'contract_security' ? '/api/treasury/security-vouchers' : '/api/treasury/vouchers/payment';
      const payload = paymentForm.type === 'contract_security' ? {
        vaultId: paymentForm.vault_id,
        amount: Number(paymentForm.amount),
        contractName: paymentForm.contract_name,
        clientName: paymentForm.client_name,
        expectedReturnDate: paymentForm.expected_return_date,
        notes: paymentForm.notes
      } : paymentForm;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setShowPaymentModal(false);
        setPaymentForm({
          vault_id: selectedVault?.id || '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          type: 'supplier_payment',
          notes: '',
          contact_id: '',
          contact_name: '',
          contract_name: '',
          client_name: '',
          expected_return_date: new Date().toISOString().split('T')[0]
        });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في تسجيل سند الصرف', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء معالجة سند الصرف', true);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Inter-Vault Transfers
  // -------------------------------------------------------------

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.from_vault_id || !transferForm.to_vault_id) {
      showNotification('يرجى اختيار الخزينة المصدر والخزينة المستهدفة', true);
      return;
    }
    if (transferForm.from_vault_id === transferForm.to_vault_id) {
      showNotification('لا يمكن التحويل من وإلى نفس الخزينة', true);
      return;
    }
    if (!transferForm.amount || Number(transferForm.amount) <= 0) {
      showNotification('يرجى إدخال مبلغ تحويل صحيح', true);
      return;
    }

    try {
      const res = await fetch('/api/treasury/transfers/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setShowTransferModal(false);
        setTransferForm({
          from_vault_id: selectedVault?.id || '',
          to_vault_id: '',
          amount: '',
          reason: ''
        });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في إنشاء طلب التحويل', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء معالجة طلب التحويل', true);
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    if (!window.confirm('هل تؤكد القبول والاستلام الفعلي لمبلغ التحويل وتحديث أرصدة الخزينتين؟')) return;

    try {
      const res = await fetch(`/api/treasury/transfers/${transferId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في قبول واستلام التحويل', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء قبول التحويل', true);
    }
  };

  const handleOpenRejectTransferModal = (transfer: any) => {
    setSelectedTransferForReject(transfer);
    setRejectReason('');
    setShowRejectTransferModal(true);
  };

  const handleRejectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferForReject) return;

    try {
      const res = await fetch(`/api/treasury/transfers/${selectedTransferForReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setShowRejectTransferModal(false);
        setSelectedTransferForReject(null);
        setRejectReason('');
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في رفض طلب التحويل', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء رفض طلب التحويل', true);
    }
  };

  // -------------------------------------------------------------
  // Handlers for Bank Deposit / Withdrawal
  // -------------------------------------------------------------

  const handleBankOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.vault_id) {
      showNotification('يرجى اختيار الخزينة المعنية', true);
      return;
    }
    if (!bankForm.amount || Number(bankForm.amount) <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح', true);
      return;
    }

    const endpoint = bankForm.operation_type === 'deposit' 
      ? '/api/treasury/bank/deposit' 
      : '/api/treasury/bank/withdrawal';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: bankForm.vault_id,
          amount: bankForm.amount,
          date: bankForm.date,
          notes: bankForm.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setShowBankModal(false);
        setBankForm({
          vault_id: selectedVault?.id || '',
          operation_type: 'deposit',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchAllData();
      } else {
        showNotification(data.error || 'فشل في إتمام المعاملة البنكية', true);
      }
    } catch (err) {
      showNotification('حدث خطأ أثناء معالجة العملية البنكية', true);
    }
  };

  // Helper for vault type label
  const getVaultTypeBadge = (type: string) => {
    switch (type) {
      case 'main':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">خزينة رئيسية</span>;
      case 'scrap_purchase':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">شراء خردة</span>;
      case 'petty_cash':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">نثريات ومصروفات</span>;
      case 'site_factory':
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">خزينة موقع/مصنع</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full">فرعية</span>;
    }
  };

  // Helper for voucher category label
  const getCategoryLabel = (type: string) => {
    const labels: Record<string, string> = {
      customer_collection: 'تحصيل من عميل',
      scrap_sale: 'تحصيل بيع خردة/مخرجات',
      custody_settlement: 'إعادة عهدة / تسوية مالية',
      supplier_payment: 'توريد مستحقات مورّد خردة',
      operational_expense: 'مصروف تشغيلي أو نثرية',
      salary_advance: 'سلفة أو راتب موظف',
      broker_commission: 'عمولة سمسار أو وسيط',
      bank_feed: 'تغذية / تسوية بنكية (حساب 1010)',
      inter_vault_transfer: 'تحويل بين الخزائن'
    };
    return labels[type] || type || 'أخرى';
  };

  // Filter vouchers by selected vault or search term
  const filteredVouchers = vouchers.filter((v: any) => {
    if (selectedVault && v.vault_id !== selectedVault.id) return false;
    if (voucherTypeFilter !== 'all' && v.voucher_type !== voucherTypeFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNumber = String(v.voucher_number || '').toLowerCase().includes(term);
      const matchNotes = String(v.notes || '').toLowerCase().includes(term);
      const matchVault = String(v.vault_name || '').toLowerCase().includes(term);
      const matchContact = String(v.contact_name || '').toLowerCase().includes(term);
      if (!matchNumber && !matchNotes && !matchVault && !matchContact) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans dir-rtl" dir="rtl">
      
      {/* ------------------------------------------------------------- */}
      {/* HEADER & ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Vault size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">إدارة الخزينة متعددة الخزائن</h1>
              <p className="text-xs text-slate-400 mt-0.5">Multi-Vault Treasury & Cashflow Management System</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setClosureForm(prev => ({ ...prev, vault_id: vaults[0]?.id || '' }));
              setShowClosureModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow-md transition-colors"
          >
            <Lock size={15} />
            <span>تقفيل الخزينة والجرد</span>
          </button>

          <button
            onClick={() => setShowDenominationModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs px-3.5 py-2 rounded-lg font-medium transition-colors"
          >
            <Coins size={15} />
            <span>حاسبة جرد الفئات النقدية</span>
          </button>

          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>تحديث البيانات</span>
          </button>

          {(userRole === 'admin' || userRole === 'accountant') && (
            <button
              onClick={() => {
                setVaultForm({
                  name: '',
                  type: 'main',
                  custodian_id: currentUser?.id || '',
                  custodian_name: currentUser?.name || '',
                  custodian_email: currentUser?.email || '',
                  opening_balance: 0,
                  max_limit: 100000
                });
                setShowCreateVaultModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-colors"
            >
              <Plus size={16} />
              <span>إنشاء خزينة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NOTIFICATIONS & MESSAGES */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl mb-6 flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">×</button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl mb-6 flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exceeding Max Limit Warning Alert Box */}
      {stats && stats.exceeding_limit_count > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-amber-300">تنبيه إداري: تجاوز الحد الأقصى لرصيد الخزينة ({stats.exceeding_limit_count} خزائن)</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                تجاوز الرصيد الحالي للحد الأقصى المسموح به. يُوصى بتغذية البنك أو تحويل السيولة الزائدة إلى الخزينة الرئيسية لضمان الأمان المالي.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {stats.exceeding_vaults?.map((ev: any) => (
                  <span key={ev.id} className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-md border border-amber-500/30">
                    <Vault size={12} />
                    <span>{ev.name}: {Number(ev.current_balance).toLocaleString()} / الحد: {Number(ev.max_limit).toLocaleString()} ج.م</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUMMARY STATS CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي رصيد الخزائن الحقيقي</span>
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {stats ? Number(stats.total_balance || 0).toLocaleString() : '0'} <span className="text-xs text-blue-400 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            من {stats?.active_vaults_count || 0} خزائن مفعلة
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي المقبوضات والوارد</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {stats ? Number(stats.total_receipts || 0).toLocaleString() : '0'} <span className="text-xs text-emerald-500 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">سندات القبض والسحب البنكي</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي المدفوعات والمصروفات</span>
            <TrendingDown size={16} className="text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">
            {stats ? Number(stats.total_payments || 0).toLocaleString() : '0'} <span className="text-xs text-rose-500 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">سندات الصرف والتوريد للبنك</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>طلبات التحويل المعلّقة</span>
            <ArrowRightLeft size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            {stats?.pending_transfers_count || 0} <span className="text-xs text-amber-500 font-normal">طلب</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">تتطلب استلام أمين الخزينة</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>حساب النقدية والبنك (1010)</span>
            <Landmark size={16} className="text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300">
            مربوط آلياً
          </div>
          <div className="text-[11px] text-slate-400 mt-1">تسجيل محاسبي مباشر</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex border-b border-slate-700/80 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('vaults'); setSelectedVault(null); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'vaults'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Vault size={16} />
          <span>بطاقات الخزائن والأرصدة</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors relative whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft size={16} />
          <span>طلبات التحويل بين الخزائن</span>
          {stats?.pending_transfers_count > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {stats.pending_transfers_count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'vouchers'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          <span>سجل كافة السندات والحركات</span>
        </button>

        <button
          onClick={() => setActiveTab('closures')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'closures'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock size={16} />
          <span>إغلاق الخزينة والجرد الدوري</span>
          {closures.length > 0 && (
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full border border-indigo-500/30">
              {closures.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={16} />
          <span>إعدادات الخزائن والأمناء</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: VAULTS CARDS & LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vaults' && (
        <div>
          {/* Detailed Vault Ledger view if a vault is selected */}
          {selectedVault ? (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedVault(null)}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium mb-2"
              >
                <ChevronRight size={16} />
                <span>العودة إلى جميع الخزائن</span>
              </button>

              {/* Opened Vault Header Card */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">{selectedVault.name}</h2>
                      {getVaultTypeBadge(selectedVault.type)}
                      {!selectedVault.is_active && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full">معطلة</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <UserIcon size={14} className="text-blue-400" />
                        <span>أمين الخزينة: <strong className="text-slate-200">{selectedVault.custodian_name || 'غير محدد'}</strong></span>
                      </span>
                      <span>•</span>
                      <span>الرصيد الافتتاحي: {Number(selectedVault.opening_balance || 0).toLocaleString()} ج.م</span>
                      <span>•</span>
                      <span>الحد الأقصى: {Number(selectedVault.max_limit || 0).toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  <div className="text-left bg-slate-900/80 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block mb-1">الرصيد الحالي المتاح</span>
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {Number(selectedVault.current_balance || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-500">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Exceed Limit warning inside vault header */}
                {selectedVault.exceeds_limit && (
                  <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3.5 mt-4 flex items-center gap-3 text-amber-300 text-xs">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{selectedVault.exceed_warning_message}</span>
                  </div>
                )}

                {/* Vault Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    onClick={() => {
                      setReceiptForm(prev => ({ ...prev, vault_id: selectedVault.id }));
                      setShowReceiptModal(true);
                    }}
                    disabled={!selectedVault.is_active}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors"
                  >
                    <PlusCircle size={16} />
                    <span>سند قبض (إيداع)</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, vault_id: selectedVault.id }));
                      setShowPaymentModal(true);
                    }}
                    disabled={!selectedVault.is_active}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors"
                  >
                    <MinusCircle size={16} />
                    <span>سند صرف (خروج مالي)</span>
                  </button>

                  <button
                    onClick={() => {
                      setTransferForm(prev => ({ ...prev, from_vault_id: selectedVault.id }));
                      setShowTransferModal(true);
                    }}
                    disabled={!selectedVault.is_active}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors"
                  >
                    <ArrowRightLeft size={16} />
                    <span>طلب تحويل لخزينة أخرى</span>
                  </button>

                  <button
                    onClick={() => {
                      setBankForm(prev => ({ ...prev, vault_id: selectedVault.id }));
                      setShowBankModal(true);
                    }}
                    disabled={!selectedVault.is_active}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors"
                  >
                    <Landmark size={16} />
                    <span>تغذية / سحب بنكي (حساب 1010)</span>
                  </button>
                </div>
              </div>

              {/* Vault Transactions Ledger Table */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <History size={18} className="text-blue-400" />
                  <span>سجل حركات الخزينة "{selectedVault.name}"</span>
                </h3>

                {filteredVouchers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    لا توجد حركات أو سندات مسجلة لهذه الخزينة حتى الآن.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs text-slate-300">
                      <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                        <tr>
                          <th className="p-3">رقم السند</th>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">النوع</th>
                          <th className="p-3">التصنيف والبيان</th>
                          <th className="p-3">جهة الاتصال / الملاحظات</th>
                          <th className="p-3">المبلغ</th>
                          <th className="p-3">بواسطة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {filteredVouchers.map((v: any) => {
                          const isInflow = v.voucher_type === 'receipt' || v.voucher_type === 'bank_withdrawal';
                          return (
                            <tr key={v.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="p-3 font-mono font-medium text-slate-200">{v.voucher_number || v.id}</td>
                              <td className="p-3 text-slate-400">{v.date}</td>
                              <td className="p-3">
                                {v.voucher_type === 'receipt' && (
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <ArrowDownLeft size={12} /> قبض (إيداع)
                                  </span>
                                )}
                                {v.voucher_type === 'payment' && (
                                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <ArrowUpRight size={12} /> صرف (خروج)
                                  </span>
                                )}
                                {v.voucher_type === 'bank_deposit' && (
                                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <Landmark size={12} /> توريد للبنك
                                  </span>
                                )}
                                {v.voucher_type === 'bank_withdrawal' && (
                                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <Landmark size={12} /> سحب من البنك
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-medium text-slate-200">{getCategoryLabel(v.category_type)}</div>
                              </td>
                              <td className="p-3 text-slate-400 max-w-xs truncate">
                                {v.contact_name && <span className="text-blue-300 font-medium block">{v.contact_name}</span>}
                                <span>{v.notes}</span>
                              </td>
                              <td className="p-3 font-bold font-mono">
                                <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                                  {isInflow ? '+' : '-'}{Number(v.amount).toLocaleString()} ج.م
                                </span>
                              </td>
                              <td className="p-3 text-slate-400">{v.created_by_name || 'المنشئ'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vault Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {vaults.map((vault: any) => {
                const current = Number(vault.current_balance || 0);
                const maxLimit = Number(vault.max_limit || 0);
                const fillRatio = maxLimit > 0 ? Math.min(100, Math.round((current / maxLimit) * 100)) : 0;

                return (
                  <motion.div
                    key={vault.id}
                    whileHover={{ y: -2 }}
                    className={`bg-slate-800 border rounded-2xl p-5 shadow-lg flex flex-col justify-between relative transition-all ${
                      vault.exceeds_limit
                        ? 'border-amber-500/60 shadow-amber-500/5'
                        : 'border-slate-700/80 hover:border-slate-600'
                    } ${!vault.is_active ? 'opacity-60' : ''}`}
                  >
                    <div>
                      {/* Top Row: Type Badge & Active Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {getVaultTypeBadge(vault.type)}
                        {vault.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            مفعلة
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">معطلة</span>
                        )}
                      </div>

                      {/* Vault Name */}
                      <h3 className="text-lg font-bold text-white mb-1 flex items-center justify-between">
                        <span>{vault.name}</span>
                        {vault.exceeds_limit && (
                          <AlertTriangle className="text-amber-400 shrink-0" size={18} />
                        )}
                      </h3>

                      {/* Custodian info */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                        <UserIcon size={13} className="text-blue-400" />
                        <span className="truncate">الأمين: <strong className="text-slate-300">{vault.custodian_name || 'غير محدد'}</strong></span>
                      </div>

                      {/* Balance Display */}
                      <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/50 mb-4">
                        <span className="text-[11px] text-slate-400 block mb-1">الرصيد الحالي الحقيقي</span>
                        <div className="text-2xl font-extrabold text-emerald-400">
                          {current.toLocaleString()} <span className="text-xs font-normal text-emerald-500">ج.م</span>
                        </div>

                        {/* Max limit bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>استهلاك الحد الأقصى</span>
                            <span>{current.toLocaleString()} / {maxLimit.toLocaleString()} ({fillRatio}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                fillRatio > 100 ? 'bg-amber-400' : fillRatio > 80 ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, fillRatio)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Exceed warning note */}
                      {vault.exceeds_limit && (
                        <div className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] p-2.5 rounded-lg mb-4 leading-relaxed">
                          ⚠️ تجاوزت الحد الأقصى! يوصى بتغذية البنك أو تحويل الفائض للخزينة الرئيسية.
                        </div>
                      )}
                    </div>

                    {/* Card Footer Action Buttons */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-700/60 pt-3 mt-2">
                      <button
                        onClick={() => setSelectedVault(vault)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs py-2 rounded-xl transition-colors font-medium"
                      >
                        <Eye size={14} />
                        <span>فتح الدفتر الحركي</span>
                      </button>

                      {(userRole === 'admin' || userRole === 'accountant') && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setClosureForm(prev => ({ ...prev, vault_id: vault.id }));
                              setShowClosureModal(true);
                            }}
                            title="تقفيل الخزينة وجرد الفئات النقدية"
                            className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
                          >
                            <Lock size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenEditVaultModal(vault)}
                            title="تعديل الخزينة"
                            className="p-2 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleVaultStatus(vault)}
                            title={vault.is_active ? 'تعطيل الخزينة' : 'تفعيل الخزينة'}
                            className="p-2 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          >
                            {vault.is_active ? <Ban size={14} className="text-amber-400" /> : <Check size={14} className="text-emerald-400" />}
                          </button>

                          <button
                            onClick={() => handleDeleteVault(vault)}
                            title="حذف الخزينة"
                            className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: INTER-VAULT TRANSFERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="text-blue-400" size={20} />
              <span>دورة التحويل بين الخزائن مع طلب واعتماد الاستلام</span>
            </h2>

            <button
              onClick={() => {
                setTransferForm({ from_vault_id: '', to_vault_id: '', amount: '', reason: '' });
                setShowTransferModal(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              <Plus size={16} />
              <span>طلب تحويل جديد بين الخزائن</span>
            </button>
          </div>

          {/* Pending Transfers Section */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>طلبات التحويل المعلّقة (بانتظار الاستلام والقبول)</span>
            </h3>

            {transfers.filter((t: any) => t.status === 'pending').length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-700/40">
                لا توجد طلبات تحويل معلّقة حالياً. الأرصدة مستقرة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                    <tr>
                      <th className="p-3">رقم الطلب</th>
                      <th className="p-3">من الخزينة المصدر</th>
                      <th className="p-3">إلى الخزينة المستهدفة</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">السبب / البيان</th>
                      <th className="p-3">المطالب</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-center">الإجراء (أمين المستهدفة / الأدمن)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {transfers.filter((t: any) => t.status === 'pending').map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-300">{t.transfer_number || t.id}</td>
                        <td className="p-3 font-medium text-slate-200">{t.from_vault_name}</td>
                        <td className="p-3 font-medium text-blue-300">{t.to_vault_name}</td>
                        <td className="p-3 font-bold text-emerald-400 font-mono">{Number(t.amount).toLocaleString()} ج.م</td>
                        <td className="p-3 text-slate-300">{t.reason}</td>
                        <td className="p-3 text-slate-400">{t.requested_by_name}</td>
                        <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAcceptTransfer(t.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} />
                              <span>قبول واستلام</span>
                            </button>

                            <button
                              onClick={() => handleOpenRejectTransferModal(t)}
                              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <XCircle size={14} />
                              <span>رفض</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical Transfers Section */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <History size={16} className="text-blue-400" />
              <span>سجل التحويلات المنفذة والمرفوضة</span>
            </h3>

            {transfers.filter((t: any) => t.status !== 'pending').length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد تحويلات مكتملة سابقة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                    <tr>
                      <th className="p-3">رقم الطلب</th>
                      <th className="p-3">من الخزينة</th>
                      <th className="p-3">إلى الخزينة</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">المعالج</th>
                      <th className="p-3">التاريخ والسبب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {transfers.filter((t: any) => t.status !== 'pending').map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono font-medium text-slate-300">{t.transfer_number || t.id}</td>
                        <td className="p-3 text-slate-200">{t.from_vault_name}</td>
                        <td className="p-3 text-slate-200">{t.to_vault_name}</td>
                        <td className="p-3 font-bold font-mono text-slate-200">{Number(t.amount).toLocaleString()} ج.م</td>
                        <td className="p-3">
                          {t.status === 'accepted' ? (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> مقبول ومستلم
                            </span>
                          ) : (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <XCircle size={12} /> مرفوض
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">{t.processed_by_name || 'الأمين'}</td>
                        <td className="p-3 text-slate-400">
                          <div>{new Date(t.processedAt || t.createdAt).toLocaleDateString('ar-EG')}</div>
                          {t.reject_reason && <div className="text-rose-400 text-[11px]">سبب الرفض: {t.reject_reason}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ALL VOUCHERS LOG */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vouchers' && (
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="text-blue-400" size={18} />
              <span>سجل كافة الحركات والسندات في الخزائن</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الخزينة أو رقم السند..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs pr-9 pl-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-60"
                />
              </div>

              {/* Filter */}
              <select
                value={voucherTypeFilter}
                onChange={(e) => setVoucherTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="all">جميع أنواع السندات</option>
                <option value="receipt">سندات القبض (إيداع)</option>
                <option value="payment">سندات الصرف (خروج)</option>
                <option value="bank_deposit">توريد للبنك</option>
                <option value="bank_withdrawal">سحب من البنك</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">الخزينة</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">النوع والتصنيف</th>
                  <th className="p-3">الجهة / الملاحظات</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">المنشئ</th>
                  <th className="p-3">طباعة PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      لا توجد سندات مطابقة للبحث أو الفلتر المقتني.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v: any) => {
                    const isInflow = v.voucher_type === 'receipt' || v.voucher_type === 'bank_withdrawal';
                    return (
                      <tr key={v.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono font-medium text-slate-200">{v.voucher_number || v.id}</td>
                        <td className="p-3 font-bold text-blue-300">{v.vault_name}</td>
                        <td className="p-3 text-slate-400">{v.date}</td>
                        <td className="p-3">
                          <span className="font-medium text-slate-200 block">{getCategoryLabel(v.category_type)}</span>
                          <span className="text-[10px] text-slate-400">{v.voucher_type}</span>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">
                          {v.contact_name && <span className="text-blue-300 font-medium block">{v.contact_name}</span>}
                          <span>{v.notes}</span>
                        </td>
                        <td className="p-3 font-bold font-mono">
                          <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                            {isInflow ? '+' : '-'}{Number(v.amount).toLocaleString()} ج.م
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{v.created_by_name || 'المنشئ'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedPrintItem({ type: 'voucher', data: v });
                              setShowPrintModal(true);
                            }}
                            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Printer size={13} />
                            <span>طباعة سند</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: VAULT CLOSURES & RECONCILIATION LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'closures' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl shadow-md">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="text-indigo-400" size={18} />
                <span>سجل إغلاق وتقفيل الخزائن والجرد الدوري</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                حصر النقدية الفعليه (Physical Cash Count) ومطابقتها مع الرصيد الدفتري المسجل وإثبات الفروقات تلقائياً.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClosureForm(prev => ({ ...prev, vault_id: vaults[0]?.id || '' }));
                  setShowClosureModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors"
              >
                <Lock size={16} />
                <span>بدء إغلاق وتقفيل خزينة جديد</span>
              </button>

              <button
                onClick={() => setShowDenominationModal(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Coins size={16} />
                <span>حاسبة تفصيل الفئات النقدية</span>
              </button>
            </div>
          </div>

          {/* Closure Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">إجمالي عمليات التقفيل</span>
              <span className="text-xl font-bold text-white font-mono">{closures.length}</span>
            </div>
            <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">تقفيلات متطابقة</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {closures.filter(c => c.status === 'matched').length}
              </span>
            </div>
            <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">حالات وجود عجز</span>
              <span className="text-xl font-bold text-rose-400 font-mono">
                {closures.filter(c => c.status === 'shortage').length}
              </span>
            </div>
            <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">حالات وجود زيادة</span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {closures.filter(c => c.status === 'surplus').length}
              </span>
            </div>
          </div>

          {/* Closures Table */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md">
            {closures.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                لا توجد عمليات إغلاق أو تقفيل مسجلة سابقاً. اضغط على "بدء إغلاق وتقفيل خزينة جديد" لإجراء جرد ومطابقة نقدية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                    <tr>
                      <th className="p-3">رقم المحضر</th>
                      <th className="p-3">الخزينة</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">الرصيد الدفتري</th>
                      <th className="p-3">الجرد الفعلي</th>
                      <th className="p-3">الفروقات</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">القائم بالتقفيل</th>
                      <th className="p-3">طباعة PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {closures.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-300">{c.id}</td>
                        <td className="p-3 font-bold text-slate-200">{c.vault_name}</td>
                        <td className="p-3 text-slate-400">{new Date(c.closed_at).toLocaleString('ar-EG')}</td>
                        <td className="p-3 font-mono text-slate-300">{Number(c.book_balance || 0).toLocaleString()} ج.م</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">{Number(c.physical_count || 0).toLocaleString()} ج.م</td>
                        <td className="p-3 font-mono font-bold">
                          {c.difference === 0 ? (
                            <span className="text-slate-400">0 ج.م</span>
                          ) : c.difference < 0 ? (
                            <span className="text-rose-400">عجز: {Math.abs(c.difference).toLocaleString()} ج.م</span>
                          ) : (
                            <span className="text-amber-400">زيادة: {c.difference.toLocaleString()} ج.م</span>
                          )}
                        </td>
                        <td className="p-3">
                          {c.status === 'matched' && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              متطابق
                            </span>
                          )}
                          {c.status === 'shortage' && (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              عجز نقدية
                            </span>
                          )}
                          {c.status === 'surplus' && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              زيادة نقدية
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">{c.closed_by_name}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedPrintItem({ type: 'closure', data: c });
                              setShowPrintModal(true);
                            }}
                            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Printer size={13} />
                            <span>معاينة وطباعة</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: VAULT SETTINGS & CUSTODIANS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-400" size={18} />
            <span>إدارة وتكوين الخزائن والأمناء والحدود المالية</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-[11px] uppercase border-b border-slate-700">
                <tr>
                  <th className="p-3">اسم الخزينة</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">أمين الخزينة المسؤول</th>
                  <th className="p-3">الرصيد الافتتاحي</th>
                  <th className="p-3">الرصيد الحالي</th>
                  <th className="p-3">الحد الأقصى المسموح</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">التحكم والتعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {vaults.map((vault: any) => (
                  <tr key={vault.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-bold text-white">{vault.name}</td>
                    <td className="p-3">{getVaultTypeBadge(vault.type)}</td>
                    <td className="p-3 text-slate-200 flex items-center gap-1.5">
                      <UserIcon size={14} className="text-blue-400" />
                      <span>{vault.custodian_name || 'غير محدد'}</span>
                    </td>
                    <td className="p-3 font-mono">{Number(vault.opening_balance || 0).toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{Number(vault.current_balance || 0).toLocaleString()} ج.م</td>
                    <td className="p-3 font-mono text-amber-300">{Number(vault.max_limit || 0).toLocaleString()} ج.م</td>
                    <td className="p-3">
                      {vault.is_active ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full">مفعلة</span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-400 text-[11px] px-2.5 py-0.5 rounded-full">معطلة</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditVaultModal(vault)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => handleToggleVaultStatus(vault)}
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {vault.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* MODAL 1: Create / Edit Vault */}
      {(showCreateVaultModal || showEditVaultModal) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Vault className="text-blue-400" size={18} />
                <span>{showEditVaultModal ? 'تعديل بيانات الخزينة' : 'إنشاء خزينة جديدة'}</span>
              </h3>
              <button 
                onClick={() => { setShowCreateVaultModal(false); setShowEditVaultModal(false); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={showEditVaultModal ? handleUpdateVault : handleCreateVault} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">اسم الخزينة <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خزينة الفرع الرئيسي / خزينة شراء خردة المصنع"
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">نوع الخزينة</label>
                <select
                  value={vaultForm.type}
                  onChange={(e) => setVaultForm({ ...vaultForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="main">خزينة رئيسية</option>
                  <option value="scrap_purchase">خزينة شراء خردة</option>
                  <option value="petty_cash">خزينة نثريات ومصروفات</option>
                  <option value="site_factory">خزينة موقع أو مصنع</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">أمين الخزينة المسؤول (Custodian)</label>
                <select
                  value={vaultForm.custodian_id}
                  onChange={(e) => {
                    const uId = e.target.value;
                    const selectedU = usersList.find((u: any) => String(u.id) === String(uId));
                    setVaultForm({ 
                      ...vaultForm, 
                      custodian_id: uId,
                      custodian_name: selectedU?.name || selectedU?.username || 'أمين الخزينة',
                      custodian_email: selectedU?.email || ''
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر أمين الخزينة من القائمة...</option>
                  {usersList.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.username || u.email} ({u.role || 'مستخدم'})
                    </option>
                  ))}
                </select>
              </div>

              {!showEditVaultModal && (
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">الرصيد الافتتاحي (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={vaultForm.opening_balance}
                    onChange={(e) => setVaultForm({ ...vaultForm, opening_balance: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1 font-medium">الحد الأقصى المسموح للرصيد (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="100000"
                  value={vaultForm.max_limit}
                  onChange={(e) => setVaultForm({ ...vaultForm, max_limit: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">عند تجاوز الرصيد لهذا الحد، يصدر النظام تنبيهاً يوصي بتغذية البنك أو الخزينة الرئيسية.</p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateVaultModal(false); setShowEditVaultModal(false); }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  {showEditVaultModal ? 'حفظ التعديلات' : 'إنشاء الخزينة'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: Receipt Voucher (إيداع) */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <PlusCircle size={18} />
                <span>إصدار سند قبض (إيداع خزينة)</span>
              </h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateReceiptVoucher} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">الخزينة المستلمة <span className="text-rose-400">*</span></label>
                <select
                  required
                  value={receiptForm.vault_id}
                  onChange={(e) => setReceiptForm({ ...receiptForm, vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الخزينة...</option>
                  {vaults.filter(v => v.is_active).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الرصيد: {Number(v.current_balance).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">نوع المقبوضات</label>
                <select
                  value={receiptForm.type}
                  onChange={(e) => setReceiptForm({ ...receiptForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="customer_collection">تحصيل من عميل</option>
                  <option value="scrap_sale">تحصيل بيع خردة أو خرس</option>
                  <option value="custody_settlement">إعادة عهدة أو تسوية مالية</option>
                  <option value="other">مقادير / إيداعات أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">المبلغ (ج.م) <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">تاريخ السند</label>
                <input
                  type="date"
                  value={receiptForm.date}
                  onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">جهة الاتصال / العميل / الزميل (اختياري)</label>
                <input
                  type="text"
                  placeholder="اسم العميل أو الجهة الموردة للمبلغ"
                  value={receiptForm.contact_name}
                  onChange={(e) => setReceiptForm({ ...receiptForm, contact_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">البيان / الملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="تفاصيل سبب القبض والإيداع..."
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  حفظ وتسجيل سند القبض
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: Payment Voucher (صرف) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <MinusCircle size={18} />
                <span>إصدار سند صرف (صرف مالي من الخزينة)</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePaymentVoucher} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">الخزينة الصارفة <span className="text-rose-400">*</span></label>
                <select
                  required
                  value={paymentForm.vault_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الخزينة...</option>
                  {vaults.filter(v => v.is_active).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الرصيد المتاح: {Number(v.current_balance).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">نوع المصروفات / الصرف</label>
                <select
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="supplier_payment">توريد مستحقات مورّد خردة / بضاعة</option>
                  <option value="operational_expense">مصروف تشغيلي أو نثرية</option>
                  <option value="salary_advance">سلفة أو راتب موظف</option>
                  <option value="broker_commission">عمولة سمسار أو وسيط</option>
                  <option value="contract_security">تأمين عقد / ضمان تنفيذ (Contract Security)</option>
                  <option value="other">مصروفات / مدفوعات أخرى</option>
                </select>
              </div>

              {paymentForm.type === 'contract_security' && (
                <div className="space-y-3 p-3.5 bg-slate-900/90 rounded-xl border border-indigo-500/40">
                  <p className="text-[11px] font-bold text-indigo-300">بيانات تأمين العقد / ضمان التنفيذ (أصول متداولة - ودائع تأمينية)</p>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">اسم العقد <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      required={paymentForm.type === 'contract_security'}
                      placeholder="مثال: عقد توريد خردة مصنع الحديد والصلب"
                      value={paymentForm.contract_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, contract_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">اسم العميل / الجهة المستفيدة <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      required={paymentForm.type === 'contract_security'}
                      placeholder="مثال: شركة النصر العامة للمقاولات"
                      value={paymentForm.client_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, client_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">تاريخ الاسترداد المتوقع للتأمين</label>
                    <input
                      type="date"
                      value={paymentForm.expected_return_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, expected_return_date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1 font-medium">المبلغ المراد صرفه (ج.م) <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />

                {/* Validation hint if amount exceeds vault balance */}
                {paymentForm.vault_id && paymentForm.amount && Number(paymentForm.amount) > Number(vaults.find(v => v.id === paymentForm.vault_id)?.current_balance || 0) && (
                  <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} />
                    <span>المبلغ المطلوب أكبر من الرصيد المتاح بالخزينة ({Number(vaults.find(v => v.id === paymentForm.vault_id)?.current_balance || 0).toLocaleString()} ج.م)! سيتم رفض السند.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">تاريخ السند</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">جهة الاتصال / المورد / السمسار / الموظف</label>
                <input
                  type="text"
                  placeholder="اسم المستلم أو المورد أو الموظف"
                  value={paymentForm.contact_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, contact_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">البيان / الملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="سبب الصرف والتفاصيل..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  تأكيد وسداد سند الصرف
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: Inter-Vault Transfer Request */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <ArrowRightLeft size={18} />
                <span>طلب تحويل سيولة بين الخزائن</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRequestTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">من الخزينة المصدر <span className="text-rose-400">*</span></label>
                <select
                  required
                  value={transferForm.from_vault_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الخزينة المصدر...</option>
                  {vaults.filter(v => v.is_active).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الرصيد المتاح: {Number(v.current_balance).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">إلى الخزينة المستهدفة <span className="text-rose-400">*</span></label>
                <select
                  required
                  value={transferForm.to_vault_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الخزينة المستهدفة...</option>
                  {vaults.filter(v => v.is_active && v.id !== transferForm.from_vault_id).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الأمين: {v.custodian_name || 'غير محدد'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">المبلغ المراد تحويله (ج.م) <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">سبب التحويل والبيان</label>
                <textarea
                  rows={2}
                  placeholder="تغذية سيولة لشراء خردة / تغذية نثريات..."
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                ℹ️ يتطلب التحويل اعتماد واستلام من أمين الخزينة المستهدفة. لن تتأثر أرصدة الخزينتين حتى يقوم بالاستلام.
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  إرسال طلب التحويل
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: Bank Operation (Deposit / Withdrawal) */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <Landmark size={18} />
                <span>معاملة بنكية (تغذية أو سحب بنكي - حساب 1010)</span>
              </h3>
              <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleBankOperation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">نوع المعاملة البنكية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, operation_type: 'deposit' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      bankForm.operation_type === 'deposit'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏦 توريد للبنك (خصم من الخزينة)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, operation_type: 'withdrawal' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      bankForm.operation_type === 'withdrawal'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏧 سحب من البنك (إضافة للخزينة)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">الخزينة المعنية <span className="text-rose-400">*</span></label>
                <select
                  required
                  value={bankForm.vault_id}
                  onChange={(e) => setBankForm({ ...bankForm, vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الخزينة...</option>
                  {vaults.filter(v => v.is_active).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الرصيد: {Number(v.current_balance).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">المبلغ (ج.م) <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={bankForm.amount}
                  onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">تاريخ المعاملة</label>
                <input
                  type="date"
                  value={bankForm.date}
                  onChange={(e) => setBankForm({ ...bankForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">البيان / تفاصيل الإيداع أو السحب البنكي</label>
                <textarea
                  rows={2}
                  placeholder="رقم العملية البنكية أو الشيك..."
                  value={bankForm.notes}
                  onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  تأكيد وتنفيذ المعاملة البنكية
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 6: Reject Transfer Modal */}
      {showRejectTransferModal && selectedTransferForReject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <XCircle size={18} />
                <span>رفض طلب التحويل رقم {selectedTransferForReject.transfer_number}</span>
              </h3>
              <button onClick={() => setShowRejectTransferModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRejectTransfer} className="space-y-4 text-xs">
              <p className="text-slate-300">
                طلب تحويل بمبلغ <strong className="text-emerald-400 font-mono">{Number(selectedTransferForReject.amount).toLocaleString()} ج.م</strong> من <span className="text-blue-300">{selectedTransferForReject.from_vault_name}</span> إلى <span className="text-blue-300">{selectedTransferForReject.to_vault_name}</span>.
              </p>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">سبب الرفض</label>
                <textarea
                  rows={3}
                  required
                  placeholder="سبب عدم قبول التحويل..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRejectTransferModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  تأكيد الرفض
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 7: Close Vault & Denomination Breakdown Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl dir-rtl my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2">
                <Lock size={18} />
                <span>إغلاق وتقفيل الخزينة ومطابقة النقدية الفعليه</span>
              </h3>
              <button onClick={() => setShowClosureModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCloseVault} className="space-y-4 text-xs">
              {/* Select Vault */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">اختر الخزينة المراد إغلاقها</label>
                <select
                  value={closureForm.vault_id}
                  onChange={(e) => setClosureForm({ ...closureForm, vault_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- اختر الخزينة --</option>
                  {vaults.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (الرصيد الدفتري الحالي: {Number(v.current_balance).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              {/* Book balance summary */}
              {closureForm.vault_id && (() => {
                const selected = vaults.find((v: any) => v.id === closureForm.vault_id);
                const bookBal = Number(selected?.current_balance || 0);
                const physicalVal = closureForm.manual_physical_count !== ''
                  ? Number(closureForm.manual_physical_count)
                  : calculatedPhysicalTotal;
                const diff = physicalVal - bookBal;

                return (
                  <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-400 block">الرصيد الدفتري المسجل</span>
                        <span className="text-sm font-bold text-blue-400 font-mono">{bookBal.toLocaleString()} ج.م</span>
                      </div>
                      <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-400 block">إجمالي الجرد الفعلي</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{physicalVal.toLocaleString()} ج.م</span>
                      </div>
                      <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-400 block">النتيجة والفروقات</span>
                        <span className={`text-sm font-bold font-mono ${diff === 0 ? 'text-slate-300' : diff < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {diff === 0 ? 'مطابق تماماً ✓' : diff < 0 ? `عجز (${Math.abs(diff).toLocaleString()} ج.م)` : `زيادة (${diff.toLocaleString()} ج.m)`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Denomination Breakdown */}
              <div className="border border-slate-700/80 bg-slate-900/50 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-400" />
                    <span>جرد وتفصيل الفئات النقدية (Denomination Breakdown)</span>
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    الإجمالي: {calculatedPhysicalTotal.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 200 ج.م</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={denominations.d200 || ''}
                        onChange={(e) => setDenominations({ ...denominations, d200: Number(e.target.value) })}
                        placeholder="عدد الورقات"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d200) || 0) * 200).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 100 ج.م</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.d100 || ''}
                      onChange={(e) => setDenominations({ ...denominations, d100: Number(e.target.value) })}
                      placeholder="عدد الورقات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d100) || 0) * 100).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 50 ج.م</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.d50 || ''}
                      onChange={(e) => setDenominations({ ...denominations, d50: Number(e.target.value) })}
                      placeholder="عدد الورقات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d50) || 0) * 50).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 20 ج.م</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.d20 || ''}
                      onChange={(e) => setDenominations({ ...denominations, d20: Number(e.target.value) })}
                      placeholder="عدد الورقات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d20) || 0) * 20).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 10 ج.م</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.d10 || ''}
                      onChange={(e) => setDenominations({ ...denominations, d10: Number(e.target.value) })}
                      placeholder="عدد الورقات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d10) || 0) * 10).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة 5 ج.م</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.d5 || ''}
                      onChange={(e) => setDenominations({ ...denominations, d5: Number(e.target.value) })}
                      placeholder="عدد الورقات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      = {((Number(denominations.d5) || 0) * 5).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">فكّة / عملات معدنية وخردة نقدية</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.coins || ''}
                      onChange={(e) => setDenominations({ ...denominations, coins: Number(e.target.value) })}
                      placeholder="مبلغ الفكّة المتبقية..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Manual Override Input */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">تجاوز إجمالي الجرد يدويًا (اختياري)</label>
                <input
                  type="number"
                  placeholder={`تلقائياً من الحاسبة: ${calculatedPhysicalTotal} ج.م`}
                  value={closureForm.manual_physical_count}
                  onChange={(e) => setClosureForm({ ...closureForm, manual_physical_count: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Variance Adjustment Checkbox */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="adjust_balance"
                  checked={closureForm.adjust_balance}
                  onChange={(e) => setClosureForm({ ...closureForm, adjust_balance: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <label htmlFor="adjust_balance" className="text-slate-200 cursor-pointer text-xs leading-relaxed">
                  <strong>إثبات الفروقات تلقائياً</strong> (إنشاء سند تسوية نقدية وتحديث رصيد الخزينة بالرصيد الفعلي مباشرة)
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">ملاحظات تقفيل الخزينة والجرد</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات أمين الخزينة حول حالة النقدية أو سبب العجز/الزيادة..."
                  value={closureForm.notes}
                  onChange={(e) => setClosureForm({ ...closureForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  تأكيد وتقفيل الخزينة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 8: Standalone Denomination Calculator */}
      {showDenominationModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Coins size={18} />
                <span>حاسبة جرد وتفصيل الفئات النقدية (Denomination Breakdown)</span>
              </h3>
              <button onClick={() => setShowDenominationModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center">
                <span className="text-slate-400 block text-xs">إجمالي المبلغ المحسوب</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                  {calculatedPhysicalTotal.toLocaleString()} ج.م
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">فئة 200 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d200 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d200: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d200) || 0) * 200).toLocaleString()} ج.م
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">فئة 100 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d100 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d100: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d100) || 0) * 100).toLocaleString()} ج.م
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">فئة 50 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d50 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d50: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d50) || 0) * 50).toLocaleString()} ج.م
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">فئة 20 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d20 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d20: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d20) || 0) * 20).toLocaleString()} ج.م
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">فئة 10 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d10 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d10: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d10) || 0) * 10).toLocaleString()} ج.م
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">فئة 5 ج.م</label>
                  <input
                    type="number"
                    min="0"
                    value={denominations.d5 || ''}
                    onChange={(e) => setDenominations({ ...denominations, d5: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    = {((Number(denominations.d5) || 0) * 5).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">مبلغ الفكّة والعملات المعدنية</label>
                <input
                  type="number"
                  min="0"
                  value={denominations.coins || ''}
                  onChange={(e) => setDenominations({ ...denominations, coins: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-700 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setDenominations({ d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, coins: 0 })}
                  className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                >
                  تصفير العداد
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDenominationModal(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
                  >
                    إغلاق
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDenominationModal(false);
                      setClosureForm(prev => ({ ...prev, vault_id: vaults[0]?.id || '' }));
                      setShowClosureModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl transition-colors font-medium"
                  >
                    اعتماد في محضر التقفيل
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 9: Printable PDF Voucher & Closure Report */}
      {showPrintModal && selectedPrintItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl dir-rtl my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Printer size={18} className="text-blue-400" />
                <span>معاينة المستند لطباعة إيصال PDF / وسند رسمي</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow-md transition-colors"
                >
                  <Printer size={14} />
                  <span>طباعة الآن (Print / PDF)</span>
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
              </div>
            </div>

            {/* Print Document Content */}
            <div id="printable-voucher-document" className="bg-white text-slate-900 p-8 rounded-xl shadow-inner border border-slate-200 font-sans leading-relaxed text-xs">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">شركة بروميت للصناعة والخدمات اللوجستية</h2>
                  <p className="text-[11px] text-slate-600">قطاع المالية وإدارة الخزينة والسيولة النقدية</p>
                  <p className="text-[10px] text-slate-500 font-mono">السجل التجاري: 10293847 | البطاقة الضريبية: 987-654-321</p>
                </div>
                <div className="text-left border-r-2 border-slate-200 pr-4">
                  <span className="text-xs font-bold block text-slate-800 uppercase tracking-widest">
                    {selectedPrintItem.type === 'voucher' && (selectedPrintItem.data.voucher_type === 'receipt' ? 'إيصال سند قبض نقدية' : 'إيصال سند صرف نقدية')}
                    {selectedPrintItem.type === 'closure' && 'محضر إغلاق وتقفيل خزينة'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 block mt-1">
                    الرقم المرجعي: #{selectedPrintItem.data.voucher_number || selectedPrintItem.data.id}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    التاريخ: {selectedPrintItem.data.date || new Date(selectedPrintItem.data.closed_at || Date.now()).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              {/* Document Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                <div>
                  <span className="text-slate-500 text-[10px] block">اسم الخزينة:</span>
                  <span className="font-bold text-slate-800 text-xs">{selectedPrintItem.data.vault_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">القائم بالمعاملة / أمين الخزينة:</span>
                  <span className="font-bold text-slate-800 text-xs">{selectedPrintItem.data.created_by_name || selectedPrintItem.data.closed_by_name || 'أمين الخزينة'}</span>
                </div>
                {selectedPrintItem.data.contact_name && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">الجهة / العميل / المورد:</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedPrintItem.data.contact_name}</span>
                  </div>
                )}
                {selectedPrintItem.data.category_type && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">التصنيف المحاسبي:</span>
                    <span className="font-bold text-slate-800 text-xs">{getCategoryLabel(selectedPrintItem.data.category_type)}</span>
                  </div>
                )}
              </div>

              {/* Amount Box */}
              <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-4 text-center mb-6">
                <span className="text-[11px] text-slate-600 font-bold block mb-1">المبلغ الإجمالي المرقوم</span>
                <span className="text-2xl font-black text-slate-900 font-mono tracking-wider block">
                  {Number(selectedPrintItem.data.amount || selectedPrintItem.data.physical_count || 0).toLocaleString()} ج.م
                </span>
                <span className="text-xs font-semibold text-slate-700 block mt-1">
                  فقط {tafqeet(selectedPrintItem.data.amount || selectedPrintItem.data.physical_count || 0)}
                </span>
              </div>

              {/* Closure Details Breakdown Table if Closure */}
              {selectedPrintItem.type === 'closure' && selectedPrintItem.data.denominations && (
                <div className="mb-6">
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1">تفاصيل الفئات النقدية والجرد الفعلي:</h4>
                  <table className="w-full text-right border text-[11px]">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-1.5 border">الفئة النقدية</th>
                        <th className="p-1.5 border">عدد الورقات</th>
                        <th className="p-1.5 border">الإجمالي الفرعي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-1.5 border">200 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d200 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d200 || 0) * 200).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">100 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d100 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d100 || 0) * 100).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">50 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d50 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d50 || 0) * 50).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">20 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d20 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d20 || 0) * 20).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">10 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d10 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d10 || 0) * 10).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">5 ج.م</td><td className="p-1.5 border font-mono">{selectedPrintItem.data.denominations.d5 || 0}</td><td className="p-1.5 border font-mono">{((selectedPrintItem.data.denominations.d5 || 0) * 5).toLocaleString()} ج.م</td></tr>
                      <tr><td className="p-1.5 border">فكّة وعملات معدنية</td><td className="p-1.5 border font-mono">-</td><td className="p-1.5 border font-mono">{(selectedPrintItem.data.denominations.coins || 0).toLocaleString()} ج.م</td></tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Statement and Notes */}
              <div className="mb-8">
                <span className="text-slate-500 text-[10px] block font-bold mb-1">البيان والملاحظات الرسمية:</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed">
                  {selectedPrintItem.data.notes || selectedPrintItem.data.reason || 'تم صرف/قبض هذا المبلغ حسب الأصول المالية والقواعد المتبعة بالشركة.'}
                </p>
              </div>

              {/* Signatures Grid */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-center text-[11px] mt-8">
                <div>
                  <span className="font-bold text-slate-800 block mb-8">توقيع المستلم / المورد</span>
                  <span className="text-slate-400 block border-b border-dashed border-slate-400 pb-1">الاسم والتوقيع</span>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-8">توقيع أمين الخزينة</span>
                  <span className="text-slate-400 block border-b border-dashed border-slate-400 pb-1">الاسم والتوقيع</span>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-8">يعتمد / المدير المالي</span>
                  <span className="text-slate-400 block border-b border-dashed border-slate-400 pb-1">الاسم والتوقيع</span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default TreasuryView;
