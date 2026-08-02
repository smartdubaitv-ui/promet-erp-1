import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Landmark, 
  Check, 
  Sparkles, 
  Send, 
  RefreshCw, 
  BookOpen, 
  Plus, 
  Trash, 
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Layers,
  FileText,
  Wallet,
  Building,
  Activity,
  ArrowLeftRight,
  Briefcase,
  Upload
} from 'lucide-react';
import { BankTransaction, Account, ChatMessage } from '../types';

interface BankingAndCopilotProps {
  transactions: BankTransaction[];
  accounts: Account[];
  onReconcileTransaction: (id: string, matchedCategory: string) => Promise<any>;
  onTriggerSync: () => void;
  isSyncing: boolean;
  onCreateAccount: (accData: any) => Promise<any>;
  chatMessages: ChatMessage[];
  onSendChatMessage: (text: string) => void;
  isChatLoading: boolean;
  userRole: string;
  onRefreshAll?: () => void;
}

export default function BankingAndCopilot({
  transactions,
  accounts,
  onReconcileTransaction,
  onTriggerSync,
  isSyncing,
  onCreateAccount,
  chatMessages,
  onSendChatMessage,
  isChatLoading,
  userRole,
  onRefreshAll
}: BankingAndCopilotProps) {
  
  // Banking states
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [matchedCategory, setMatchedCategory] = useState('مبيعات المنتجات');

  // Sub-tab selection state (defaulting to treasury so it is immediately visible)
  const [subTab, setSubTab] = useState<'treasury' | 'reconciliation' | 'ledger'>('treasury');

  // Treasury and Bank management states
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [treasuryData, setTreasuryData] = useState<any[]>([]);
  const [cashTransactions, setCashTransactions] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>({ bankTotal: 0, treasuryTotal: 0, customersTotal: 0, totalCurrentAssets: 0 });
  const [loadingTreasury, setLoadingTreasury] = useState(false);

  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);

  // Transaction form state
  const [txType, setTxType] = useState('deposit');
  const [txSourceType, setTxSourceType] = useState('bank');
  const [txSourceId, setTxSourceId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');

  // Bank Account form state
  const [bankAccName, setBankAccName] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [bankNameStr, setBankNameStr] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankSwift, setBankSwift] = useState('');
  const [bankOpeningBalance, setBankOpeningBalance] = useState('');

  // --- Robust Bank Reconciliation UI States ---
  const [importedTransactions, setImportedTransactions] = useState<any[]>([]);
  const [reconciliationRules, setReconciliationRules] = useState<any[]>([]);
  const [reconciliationLogs, setReconciliationLogs] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'pending' | 'matched' | 'excluded'>('all');
  const [reconciliationTabSub, setReconciliationTabSub] = useState<'list' | 'rules' | 'logs'>('list');

  // Rule Modal state
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [newRuleType, setNewRuleType] = useState<'amount' | 'reference' | 'counterparty' | 'date_range' | 'custom'>('amount');
  const [newRulePriority, setNewRulePriority] = useState('1');

  // Manual Match form states
  const [manualMatchInvoiceId, setManualMatchInvoiceId] = useState('');
  const [manualMatchNotes, setManualMatchNotes] = useState('');

  // --- Loader functions ---
  const loadReconciliationData = async () => {
    try {
      setLoadingReconciliation(true);
      const [txsRes, rulesRes, logsRes, invoicesRes] = await Promise.all([
        fetch('/api/reconciliation/transactions').then(r => r.json().catch(() => [])),
        fetch('/api/reconciliation/rules').then(r => r.json().catch(() => [])),
        fetch('/api/reconciliation/logs').then(r => r.json().catch(() => [])),
        fetch('/api/invoices').then(r => r.json().catch(() => []))
      ]);

      setImportedTransactions(Array.isArray(txsRes) ? txsRes : []);
      setReconciliationRules(Array.isArray(rulesRes) ? rulesRes : []);
      setReconciliationLogs(Array.isArray(logsRes) ? logsRes : []);
      setAllInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);
    } catch (e) {
      console.error("Error loading reconciliation data:", e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const loadTreasuryModuleData = async () => {
    try {
      setLoadingTreasury(true);
      const [banksRes, treasuryRes, txRes, sumRes] = await Promise.all([
        fetch('/api/bank-accounts').then(r => r.json().catch(() => [])),
        fetch('/api/treasury').then(r => r.json().catch(() => [])),
        fetch('/api/cash-bank-transactions?limit=50').then(r => r.json().catch(() => [])),
        fetch('/api/cash-bank-summary').then(r => r.json().catch(() => null))
      ]);

      setBankAccounts(Array.isArray(banksRes) ? banksRes : []);
      setTreasuryData(Array.isArray(treasuryRes) ? treasuryRes : []);
      setCashTransactions(Array.isArray(txRes) ? txRes : []);
      if (sumRes && !sumRes.error) {
        setSummaryData(sumRes);
      }
    } catch (e) {
      console.error("Error loading treasury data:", e);
    } finally {
      setLoadingTreasury(false);
    }
  };

  useEffect(() => {
    loadTreasuryModuleData();
  }, []);

  useEffect(() => {
    if (subTab === 'reconciliation') {
      loadReconciliationData();
    }
  }, [subTab]);

  // When source type changes, auto select first available source
  useEffect(() => {
    if (txSourceType === 'bank' && bankAccounts.length > 0) {
      setTxSourceId(bankAccounts[0].id);
    } else if (txSourceType === 'treasury' && treasuryData.length > 0) {
      setTxSourceId(treasuryData[0].id);
    } else {
      setTxSourceId('');
    }
  }, [txSourceType, bankAccounts, treasuryData]);

  // --- Core Matching & Reconciliation Action Handlers ---
  const handleRunAutoMatch = async () => {
    try {
      setLoadingReconciliation(true);
      const res = await fetch('/api/reconciliation/match-auto', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`تمت التسوية والمطابقة التلقائية بنجاح! تم العثور على (${data.match_count}) تطابقات دقيقة وتحديث القيود المحاسبية.`);
        await loadReconciliationData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert(`فشلت المطابقة التلقائية: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الاتصال بخادم التسوية التلقائية');
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleManualMatchSubmit = async (txId: string) => {
    if (!manualMatchInvoiceId) {
      alert('يرجى اختيار الفاتورة المطابقة');
      return;
    }
    try {
      setLoadingReconciliation(true);
      const res = await fetch('/api/reconciliation/reconcile-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: txId,
          matched_invoice_id: manualMatchInvoiceId,
          notes: manualMatchNotes || "تمت التسوية يدوياً من قبل المحاسب المعتمد",
          status: 'matched'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedTxId(null);
        setManualMatchInvoiceId('');
        setManualMatchNotes('');
        await loadReconciliationData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert(`فشلت التسوية اليدوية: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleManualExcludeSubmit = async (txId: string) => {
    try {
      setLoadingReconciliation(true);
      const res = await fetch('/api/reconciliation/reconcile-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: txId,
          notes: manualMatchNotes || "تم استبعاد هذه المعاملة يدوياً من الكشف لتعديلات لاحقة",
          status: 'excluded'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedTxId(null);
        setManualMatchInvoiceId('');
        setManualMatchNotes('');
        await loadReconciliationData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert(`فشل استبعاد المعاملة: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleUnmatchSubmit = async (txId: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إلغاء مطابقة هذه المعاملة وإعادتها كمعاملة معلقة؟")) return;
    try {
      setLoadingReconciliation(true);
      const res = await fetch(`/api/reconciliation/unmatch/${txId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSelectedTxId(null);
        await loadReconciliationData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert(`فشل إلغاء المطابقة: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) {
      alert("يرجى كتابة اسم القاعدة");
      return;
    }
    try {
      setLoadingReconciliation(true);
      const res = await fetch('/api/reconciliation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleName,
          description: newRuleDescription,
          rule_type: newRuleType,
          priority: Number(newRulePriority) || 1,
          is_active: true,
          conditions: { days_window: 7, require_exact_amount: true }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewRuleName('');
        setNewRuleDescription('');
        setNewRulePriority('1');
        setShowRuleModal(false);
        await loadReconciliationData();
      } else {
        alert(`فشل إنشاء القاعدة: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
    try {
      setLoadingReconciliation(true);
      const res = await fetch(`/api/reconciliation/rules/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadReconciliationData();
      } else {
        alert("فشل حذف القاعدة البنكية");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const handleSyncAndReconciliation = async () => {
    // Trigger standard parent sync if passed
    onTriggerSync();
    // Fetch imported sync values
    try {
      const res = await fetch('/api/bank-transactions/sync', { method: 'POST' });
      if (res.ok) {
        await loadReconciliationData();
        await loadTreasuryModuleData();
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_account_id', 'ba-1');

    try {
      setIsUploading(true);
      const res = await fetch('/api/bank/import-statement', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'تم استيراد كشف الحساب بنجاح!');
        await loadReconciliationData();
      } else {
        alert(`فشل الاستيراد: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع ملف كشف الحساب');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccName || !bankAccNumber) {
      alert('يرجى كتابة اسم الحساب ورقم الحساب');
      return;
    }

    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: bankAccName,
          account_number: bankAccNumber,
          bank_name: bankNameStr,
          branch: bankBranch,
          swift_code: bankSwift,
          iban: bankIban,
          opening_balance: Number(bankOpeningBalance) || 0,
          currency: 'EGP'
        })
      });

      const result = await res.json();
      if (res.ok) {
        alert('✅ تم إضافة الحساب البنكي بنجاح');
        setShowBankAccountModal(false);
        // Reset state
        setBankAccName('');
        setBankAccNumber('');
        setBankNameStr('');
        setBankBranch('');
        setBankIban('');
        setBankSwift('');
        setBankOpeningBalance('');
        // Reload
        loadTreasuryModuleData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert('❌ خطأ: ' + result.error);
      }
    } catch (error: any) {
      alert('❌ حدث خطأ: ' + error.message);
    }
  };

  const handleAddCashTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txSourceId || !txAmount || !txDate) {
      alert('يرجى ملء جميع الحقول المطلوبة واختيار الحساب المستهدف');
      return;
    }

    try {
      const res = await fetch('/api/cash-bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: txDate,
          transaction_type: txType,
          source_type: txSourceType,
          source_id: txSourceId,
          amount: Number(txAmount),
          description: txDesc
        })
      });

      const result = await res.json();
      if (res.ok) {
        alert('✅ تم تسجيل الحركة بنجاح');
        setShowTransactionModal(false);
        // Reset state
        setTxAmount('');
        setTxDesc('');
        // Reload
        loadTreasuryModuleData();
        if (onRefreshAll) onRefreshAll();
      } else {
        alert('❌ خطأ: ' + result.error);
      }
    } catch (error: any) {
      alert('❌ حدث خطأ: ' + error.message);
    }
  };

  // Accounting entries states
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedEntryDetails, setSelectedEntryDetails] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const loadEntries = async () => {
    try {
      setIsLoadingEntries(true);
      const res = await fetch('/api/accounting-entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const viewEntryDetails = async (entry: any) => {
    setSelectedEntry(entry);
    try {
      const res = await fetch(`/api/accounting-entries/${entry.id}`);
      if (res.ok) {
        const details = await res.json();
        setSelectedEntryDetails(details);
        setShowDetailModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Chart of Accounts addition state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accName, setAccName] = useState('');
  const [accCode, setAccCode] = useState('');
  const [accType, setAccType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('expense');

  // Manual General Journal Entry States (Simulates complex QuickBooks manual debit/credits)
  const [showJournalVoucher, setShowJournalVoucher] = useState(false);
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [journalAmount, setJournalAmount] = useState('');
  const [journalMemo, setJournalMemo] = useState('');
  const [journalSuccess, setJournalSuccess] = useState('');
  const [journalError, setJournalError] = useState('');

  // Chat message states
  const [userInput, setUserInput] = useState('');

  // Handles bank statement reconciliation matching
  const handleReconcileSubmit = async (txId: string) => {
    try {
      await onReconcileTransaction(txId, matchedCategory);
      setReconcilingId(null);
    } catch (err) {
      alert('حدث خطأ في التسوية البنكية');
    }
  };

  // Handles Manual double-entry voucher booking
  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJournalError('');
    setJournalSuccess('');

    if (!debitAccount || !creditAccount || !journalAmount || Number(journalAmount) <= 0) {
      setJournalError('يرجى اختيار طرفي المدينة والدائن وكتابة قيمة صالحة.');
      return;
    }

    if (debitAccount === creditAccount) {
      setJournalError('لا يصح ترحيل معاملة بين نفس القيد المحاسبي كطرف مدينة ودائن!');
      return;
    }

    try {
      const debitAccObj = accounts.find(a => a.id === debitAccount);
      const creditAccObj = accounts.find(a => a.id === creditAccount);
      
      if (debitAccObj && creditAccObj) {
        const response = await fetch('/api/accounting-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debitAccountCode: debitAccObj.code,
            creditAccountCode: creditAccObj.code,
            amount: Number(journalAmount),
            notes: journalMemo
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'فشل ترحيل القيد المحاسبي');
        }

        setJournalSuccess('تم قيد سند التدقيق اليدوي وترحيله لدفتر الأستاذ بنجاح!');
        
        // Refresh entries list
        loadEntries();
        // Refresh application balances
        if (onRefreshAll) {
          onRefreshAll();
        }

        setTimeout(() => {
          setJournalSuccess('');
          setShowJournalVoucher(false);
          setDebitAccount('');
          setCreditAccount('');
          setJournalAmount('');
          setJournalMemo('');
        }, 1500);
      } else {
        setJournalError('حساب المدين أو الدائن المحدد غير موجود.');
      }
    } catch (err: any) {
      setJournalError(err.message || 'حدث خطأ في النظام أثناء القيد.');
    }
  };

  // Safe chart of accounts creation
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accCode) return;
    try {
      await onCreateAccount({ name: accName, code: accCode, type: accType });
      setAccName('');
      setAccCode('');
      setShowAddAccount(false);
    } catch (err) {
      alert('خطأ أثناء توريد الحساب');
    }
  };

  // AI tag shortcuts
  const aiPrompts = [
    "كم تبلغ السيولة النقدية لدي اليوم؟",
    "هل هناك فواتير متأخرة الدفع من العملاء؟",
    "تحليل سريع عن المخزون المنخفض"
  ];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    onSendChatMessage(userInput);
    setUserInput('');
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Double column: Banking & Chart of Accounts */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Beautiful Sub-tab Selection Header */}
          <div className="flex border-b border-slate-700/80 bg-slate-800/80 p-1.5 rounded-2xl gap-2 shadow-md">
            <button
              onClick={() => setSubTab('treasury')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                subTab === 'treasury'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Wallet size={15} />
              وحدة إدارة الخزينة والبنوك
            </button>
            <button
              onClick={() => setSubTab('reconciliation')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                subTab === 'reconciliation'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Landmark size={15} />
              <span>تسويات الكشوفات البنكية</span>
              {importedTransactions.filter(t => t.reconciliation_status === 'pending').length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {importedTransactions.filter(t => t.reconciliation_status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSubTab('ledger')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                subTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BookOpen size={15} />
              القيود اليدوية ودفتر الأستاذ
            </button>
          </div>

          {/* Render Treasury & Bank Management */}
          {subTab === 'treasury' && (
            <div className="space-y-4">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl shadow-md flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">🏦 إجمالي البنوك</span>
                  <span className="text-xl font-bold text-white font-mono mt-2">{(summaryData.bankTotal || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl shadow-md flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">💰 الخزينة والنقدية</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono mt-2">{(summaryData.treasuryTotal || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl shadow-md flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">👥 مستحقات العملاء</span>
                  <span className="text-xl font-bold text-indigo-400 font-mono mt-2">{(summaryData.customersTotal || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl shadow-md flex flex-col justify-between">
                  <span className="text-xs text-amber-400 font-medium">📊 إجمالي الأصول المتغيرة</span>
                  <span className="text-xl font-bold text-amber-300 font-mono mt-2">{(summaryData.totalCurrentAssets || 0).toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Actions & Description Header */}
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Wallet size={18} className="text-blue-400" />
                    <span>الحسابات والعمليات النقدية والبنكية</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">سجل عمليات السحب والإيداع والتحويل ومتابعة الأرصدة الفعلية في البنوك والعهود الفردية</p>
                </div>
                <div className="flex items-center gap-2">
                  {userRole !== 'viewer' && (
                    <>
                      <button
                        onClick={() => {
                          setTxType('deposit');
                          setShowTransactionModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        تسجيل حركة مالية جديدة
                      </button>
                      <button
                        onClick={() => setShowBankAccountModal(true)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-slate-600 transition-all cursor-pointer"
                      >
                        <Building size={14} />
                        إضافة حساب بنكي
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank accounts */}
                {bankAccounts.map((b: any) => (
                  <div key={b.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:border-slate-600 transition-all">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                          <Landmark size={11} />
                          حساب مصرفي - {b.bank_name || 'بنك جاري'}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-3">{b.account_name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-1">رقم الحساب: {b.account_number}</p>
                        {b.iban && <p className="text-[10px] text-slate-400 font-mono mt-0.5">IBAN: {b.iban}</p>}
                      </div>
                      <span className="text-base font-bold text-emerald-400 font-mono">{(b.current_balance || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="border-t border-slate-700/60 pt-3 mt-3 flex justify-between items-center text-xs text-slate-400">
                      <span>الفرع: {b.branch || 'غير محدد'}</span>
                      {b.notes && <span className="truncate max-w-[150px]" title={b.notes}>{b.notes}</span>}
                    </div>
                  </div>
                ))}

                {/* Treasury accounts */}
                {treasuryData.map((t: any) => (
                  <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-amber-50 text-amber-700 font-bold text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                          <Wallet size={10} />
                          الخزينة النقدية الرئيسية
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-2">{t.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">العهدة الأساسية اليومية للكاش والصندوق</p>
                      </div>
                      <span className="text-xs font-black text-amber-700 font-mono">{(t.current_balance || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between items-center text-[10px] text-slate-400">
                      <span>الحالة: نشط</span>
                      <span>العملة الافتراضية: EGP</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transactions Ledger */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Activity className="text-blue-600" size={14} />
                    سجل كشف العمليات النقدية والبنكية المفصل
                  </h3>
                  <button
                    onClick={loadTreasuryModuleData}
                    disabled={loadingTreasury}
                    className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 px-2.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw size={10} className={loadingTreasury ? "animate-spin" : ""} />
                    تحديث الكشف
                  </button>
                </div>

                {loadingTreasury ? (
                  <div className="p-8 text-center text-xs text-slate-400 animate-pulse">جاري تحميل كشف العمليات...</div>
                ) : cashTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                    لا توجد حركات نقدية أو بنكية مسجلة حتى الآن.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px]">
                          <th className="p-2">رقم الحركة</th>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">المصدر / الحساب</th>
                          <th className="p-2">النوع</th>
                          <th className="p-2">القيمة</th>
                          <th className="p-2">البيان / الوصف</th>
                          <th className="p-2 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cashTransactions.map((tx) => {
                          // Find source name
                          let srcName = 'غير معروف';
                          if (tx.source_type === 'bank') {
                            const b = bankAccounts.find((acc) => acc.id === tx.source_id);
                            srcName = b ? b.account_name : 'حساب بنكي';
                          } else if (tx.source_type === 'treasury') {
                            const t = treasuryData.find((tr) => tr.id === tx.source_id);
                            srcName = t ? t.name : 'الخزينة';
                          }

                          const isAdd = (tx.transaction_type === 'deposit' || tx.transaction_type === 'receipt');

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-all text-slate-700">
                              <td className="p-2 font-mono font-bold text-slate-400 text-[10px]">{tx.transaction_number || tx.id}</td>
                              <td className="p-2 font-bold font-mono">{tx.transaction_date}</td>
                              <td className="p-2 font-medium">
                                <span className="flex items-center gap-1">
                                  {tx.source_type === 'bank' ? <Landmark size={11} className="text-blue-600" /> : <Wallet size={11} className="text-amber-500" />}
                                  {srcName}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700 border border-green-200' :
                                  tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  tx.transaction_type === 'receipt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {tx.transaction_type === 'deposit' ? 'إيداع نقدية' :
                                   tx.transaction_type === 'withdrawal' ? 'سحب كاش' :
                                   tx.transaction_type === 'transfer' ? 'تحويل أرصدة' :
                                   tx.transaction_type === 'receipt' ? 'متحصلات مستلمة' : 'مدفوعات'}
                                </span>
                              </td>
                              <td className={`p-2 font-mono font-bold ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                                {isAdd ? '+' : '-'}{tx.amount.toLocaleString()} ج.م
                              </td>
                              <td className="p-2 font-medium text-slate-600">{tx.description}</td>
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-800">
                                  مرحل بنجاح
                                </span>
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
          )}

          {/* Render Reconciliation Sub-tab */}
          {subTab === 'reconciliation' && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-4">
              
              {/* Header with quick sub-modules */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Landmark className="text-blue-600" size={15} />
                    نظام مطابقة الكشوفات والتسويات الذكي
                  </h3>
                  <p className="text-[10px] text-slate-500">طابق الكشوفات المستوردة مع فواتير المبيعات والمشتريات والمدفوعات آلياً بنقرة واحدة</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 px-3 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs">
                    <Upload size={11} />
                    {isUploading ? "جاري الاستيراد..." : "رفع كشف (CSV/Excel)"}
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      accept=".csv,.xlsx,.xls" 
                      className="hidden" 
                      disabled={isUploading}
                    />
                  </label>
                  <button 
                    onClick={handleSyncAndReconciliation}
                    disabled={isSyncing}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 px-3 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "مزامنة المعاملات..." : "تحديث ومزامنة الكشف"}
                  </button>
                  <button 
                    onClick={handleRunAutoMatch}
                    disabled={loadingReconciliation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 px-3 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Sparkles size={11} />
                    تشغيل المطابقة التلقائية ✦
                  </button>
                </div>
              </div>

              {/* Top Stats Overview Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">إجمالي كشف الحساب</span>
                  <span className="text-sm font-black text-slate-800">{importedTransactions.length}</span>
                </div>
                <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 text-center">
                  <span className="text-[9px] text-amber-600 block font-bold">معلق بانتظار المطابقة</span>
                  <span className="text-sm font-black text-amber-700">
                    {importedTransactions.filter(t => t.reconciliation_status === 'pending' || !t.reconciliation_status).length}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200 text-center">
                  <span className="text-[9px] text-emerald-600 block font-bold">تمت تسويتها بنجاح</span>
                  <span className="text-sm font-black text-emerald-700">
                    {importedTransactions.filter(t => t.reconciliation_status === 'matched').length}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-100 rounded-lg border text-center">
                  <span className="text-[9px] text-slate-500 block font-bold">مستبعدة / مصاريف مباشرة</span>
                  <span className="text-sm font-black text-slate-600">
                    {importedTransactions.filter(t => t.reconciliation_status === 'excluded').length}
                  </span>
                </div>
              </div>

              {/* Sub navigation within reconciliation */}
              <div className="flex border-b text-[10px] font-bold gap-2">
                <button 
                  onClick={() => setReconciliationTabSub('list')}
                  className={`pb-2 px-2 border-b-2 transition-all cursor-pointer ${reconciliationTabSub === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  كشف الحساب والمطابقة
                </button>
                <button 
                  onClick={() => setReconciliationTabSub('rules')}
                  className={`pb-2 px-2 border-b-2 transition-all cursor-pointer ${reconciliationTabSub === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  قواعد المطابقة الآلية ({reconciliationRules.length})
                </button>
                <button 
                  onClick={() => setReconciliationTabSub('logs')}
                  className={`pb-2 px-2 border-b-2 transition-all cursor-pointer ${reconciliationTabSub === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  سجل التسويات والعمليات ({reconciliationLogs.length})
                </button>
              </div>

              {/* Module Content */}
              {loadingReconciliation ? (
                <div className="text-center py-12 text-slate-400 text-xs">جاري تحديث البيانات المالية...</div>
              ) : (
                <>
                  {/* TAB 1: Main Statement Match list */}
                  {reconciliationTabSub === 'list' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      
                      {/* Left: Interactive list of transactions */}
                      <div className="lg:col-span-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded border">
                          <span className="text-slate-500">تصفية المعاملات:</span>
                          <div className="flex gap-1.5 font-bold">
                            <button 
                              onClick={() => setReconcileFilter('all')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${reconcileFilter === 'all' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                            >
                              الكل ({importedTransactions.length})
                            </button>
                            <button 
                              onClick={() => setReconcileFilter('pending')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer text-amber-700 ${reconcileFilter === 'pending' ? 'bg-amber-100' : 'hover:bg-slate-100'}`}
                            >
                              المعلقة ({importedTransactions.filter(t => t.reconciliation_status === 'pending' || !t.reconciliation_status).length})
                            </button>
                            <button 
                              onClick={() => setReconcileFilter('matched')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer text-emerald-700 ${reconcileFilter === 'matched' ? 'bg-emerald-100' : 'hover:bg-slate-100'}`}
                            >
                              المطابقة ({importedTransactions.filter(t => t.reconciliation_status === 'matched').length})
                            </button>
                            <button 
                              onClick={() => setReconcileFilter('excluded')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer text-slate-600 ${reconcileFilter === 'excluded' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                            >
                              المستبعدة ({importedTransactions.filter(t => t.reconciliation_status === 'excluded').length})
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {importedTransactions
                            .filter(tx => {
                              const status = tx.reconciliation_status || 'pending';
                              if (reconcileFilter === 'all') return true;
                              if (reconcileFilter === 'pending') return status === 'pending';
                              return status === reconcileFilter;
                            })
                            .map((tx) => {
                              const isSelected = selectedTxId === tx.id;
                              const status = tx.reconciliation_status || 'pending';
                              return (
                                <div 
                                  key={tx.id} 
                                  onClick={() => {
                                    setSelectedTxId(tx.id);
                                    setManualMatchInvoiceId('');
                                    setManualMatchNotes('');
                                  }}
                                  className={`p-3 rounded-lg border transition-all text-xs cursor-pointer flex justify-between items-center gap-2 ${
                                    isSelected 
                                      ? 'bg-blue-50/50 border-blue-400 shadow-sm' 
                                      : 'bg-white hover:bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-slate-800">{tx.description}</p>
                                      {status === 'pending' && (
                                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 rounded-sm leading-none">معلقة</span>
                                      )}
                                      {status === 'matched' && (
                                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1 rounded-sm leading-none flex items-center gap-0.5">
                                          ✓ مطابقة ({tx.match_score}%)
                                        </span>
                                      )}
                                      {status === 'excluded' && (
                                        <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-1 rounded-sm leading-none">مستبعدة</span>
                                      )}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-mono">
                                      {tx.transaction_date} | طرف: {tx.counterparty_name || "غير محدد"}
                                    </p>
                                  </div>

                                  <span className={`font-mono font-bold whitespace-nowrap ${tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {tx.transaction_type === 'credit' ? '+' : '-'}{tx.amount} ج.م
                                  </span>
                                </div>
                              );
                            })
                          }
                          {importedTransactions.length === 0 && (
                            <div className="text-center py-10 text-slate-400">لا توجد معاملات بنكية مستوردة حالياً. اضغط على تحديث أو مزامنة الكشف.</div>
                          )}
                        </div>
                      </div>

                      {/* Right: Dynamic Interactive Match Panel */}
                      <div className="lg:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs min-h-[350px]">
                        {!selectedTxId ? (
                          <div className="text-center py-16 text-slate-400 space-y-2">
                            <Landmark className="mx-auto text-slate-300" size={36} />
                            <p className="font-bold">يرجى تحديد معاملة لمطابقتها</p>
                            <p className="text-[10px]">انقر فوق أي معاملة من القائمة لعرض تفاصيلها ومطابقتها مع الدفاتر والفواتير.</p>
                          </div>
                        ) : (
                          (() => {
                            const tx = importedTransactions.find(t => t.id === selectedTxId);
                            if (!tx) return null;
                            const status = tx.reconciliation_status || 'pending';

                            // Auto matching candidate logic on client side
                            const exactInvoices = allInvoices.filter((inv: any) => 
                              inv.status !== "paid" && (
                                inv.invoiceNumber === tx.reference_number ||
                                tx.description.includes(inv.invoiceNumber) ||
                                Math.abs(inv.totalAmount - tx.amount) < 0.01
                              )
                            );

                            return (
                              <div className="space-y-4">
                                <div className="border-b pb-2">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] uppercase font-bold text-slate-400">تفاصيل المعاملة المصرفية</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 
                                      status === 'excluded' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {status === 'matched' ? 'تمت المطابقة' : status === 'excluded' ? 'مستبعدة' : 'قيد الانتظار'}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-slate-800 text-sm">{tx.description}</h4>
                                  <div className="grid grid-cols-2 gap-1.5 mt-2 font-mono text-[10px] text-slate-500">
                                    <span>التاريخ: {tx.transaction_date}</span>
                                    <span>المبلغ: {tx.amount} ج.م</span>
                                    <span>النوع: {tx.transaction_type === 'credit' ? 'إيداع (Credit)' : 'سحب (Debit)'}</span>
                                    <span>الرقم المرجعي: {tx.reference_number || "---"}</span>
                                  </div>
                                  {tx.counterparty_name && (
                                    <p className="text-[10px] text-slate-600 mt-1.5 bg-white p-1 rounded border">
                                      الطرف الآخر: <strong>{tx.counterparty_name}</strong> {tx.counterparty_account ? `(${tx.counterparty_account})` : ''}
                                    </p>
                                  )}
                                </div>

                                {status === 'pending' ? (
                                  <div className="space-y-3">
                                    
                                    {/* 1. Candidate Matches */}
                                    <div>
                                      <span className="block text-[10px] font-black text-slate-500 mb-1 flex items-center gap-1">
                                        <Sparkles size={11} className="text-blue-500 animate-pulse" />
                                        مرشحات المطابقة المقترحة (Smart Suggestion)
                                      </span>
                                      
                                      {exactInvoices.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {exactInvoices.slice(0, 3).map((inv: any) => {
                                            const score = inv.invoiceNumber === tx.reference_number ? 100 : 75;
                                            return (
                                              <div 
                                                key={inv.id}
                                                onClick={() => {
                                                  setManualMatchInvoiceId(inv.id);
                                                  setManualMatchNotes(`تسوية ومطابقة الكشف آلياً مع الفاتورة رقم ${inv.invoiceNumber}`);
                                                }}
                                                className={`p-2 bg-white rounded border text-[11px] cursor-pointer hover:border-blue-400 transition-all flex justify-between items-center ${
                                                  manualMatchInvoiceId === inv.id ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200'
                                                }`}
                                              >
                                                <div>
                                                  <p className="font-bold text-slate-800">{inv.invoiceNumber}</p>
                                                  <p className="text-[9px] text-slate-400">التاريخ: {inv.date} | القيمة: {inv.totalAmount} ج.م</p>
                                                </div>
                                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded leading-none">
                                                  مطابقة {score}%
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded text-center border">
                                          لم يتم العثور على فواتير تطابق هذه القيمة والاسم بشكل مباشر.
                                        </p>
                                      )}
                                    </div>

                                    {/* 2. Manual Match selector */}
                                    <div className="space-y-2 pt-2 border-t">
                                      <span className="block text-[10px] font-bold text-slate-500">البحث والمطابقة اليدوية</span>
                                      <div>
                                        <label className="block text-[9px] text-slate-400 mb-1">اختر فاتورة معلقة من الدفاتر:</label>
                                        <select
                                          value={manualMatchInvoiceId}
                                          onChange={(e) => {
                                            setManualMatchInvoiceId(e.target.value);
                                            const matchingInv = allInvoices.find(i => i.id === e.target.value);
                                            if (matchingInv) {
                                              setManualMatchNotes(`تسوية ومطابقة يدوية مع الفاتورة ${matchingInv.invoiceNumber}`);
                                            }
                                          }}
                                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs"
                                        >
                                          <option value="">-- اختر الفاتورة المراد تسويتها --</option>
                                          {allInvoices
                                            .filter((inv: any) => inv.status !== "paid")
                                            .map((inv: any) => (
                                              <option key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} - قيمة {inv.totalAmount} ج.م (تاريخ: {inv.date})
                                              </option>
                                            ))
                                          }
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] text-slate-400 mb-1">ملاحظات التسوية / التفسير:</label>
                                        <textarea
                                          value={manualMatchNotes}
                                          onChange={(e) => setManualMatchNotes(e.target.value)}
                                          placeholder="مثال: تم سداد الفاتورة عبر تحويل سريع من العميل، الفروقات مقبولة..."
                                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs h-12 resize-none"
                                        />
                                      </div>

                                      {/* Actions */}
                                      <div className="flex gap-1.5 pt-1">
                                        <button
                                          onClick={() => handleManualMatchSubmit(tx.id)}
                                          disabled={loadingReconciliation || !manualMatchInvoiceId}
                                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded cursor-pointer text-center text-[10px] disabled:opacity-50"
                                        >
                                          ربط واعتماد المطابقة ✓
                                        </button>
                                        <button
                                          onClick={() => handleManualExcludeSubmit(tx.id)}
                                          disabled={loadingReconciliation}
                                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-2 rounded cursor-pointer text-[10px]"
                                        >
                                          استبعاد (Direct Account)
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                ) : (
                                  <div className="space-y-3 bg-white p-3 rounded-lg border">
                                    <div className="space-y-1.5">
                                      <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                        <span className="bg-emerald-500 w-2 h-2 rounded-full inline-block"></span>
                                        تفاصيل التسوية المحاسبية
                                      </p>
                                      <div className="text-[10px] text-slate-500 space-y-1 font-mono">
                                        <p>طريقة التسوية: <strong className="text-slate-700">{tx.match_method === 'auto' ? 'تلقائي آلي' : 'تسوية يدوية'}</strong></p>
                                        <p>دقة المطابقة: <strong className="text-emerald-600">{tx.match_score}%</strong></p>
                                        <p>المطابق والمراجع: <strong className="text-slate-700">{tx.matched_by || 'أحمد حماد'}</strong></p>
                                        {tx.matched_at && <p>تاريخ التسوية: <strong>{new Date(tx.matched_at).toLocaleString('ar-SA')}</strong></p>}
                                        {tx.matched_invoice_id && (
                                          <p>الفاتورة المقابلة: <strong className="text-blue-600 underline">
                                            {allInvoices.find(i => i.id === tx.matched_invoice_id)?.invoiceNumber || tx.matched_invoice_id}
                                          </strong></p>
                                        )}
                                      </div>
                                      {tx.notes && (
                                        <p className="text-[10px] italic text-slate-600 bg-slate-50 p-2 rounded border mt-2">
                                          شرح التسوية: {tx.notes}
                                        </p>
                                      )}
                                    </div>

                                    {/* Undo action */}
                                    <button
                                      onClick={() => handleUnmatchSubmit(tx.id)}
                                      className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-1.5 rounded cursor-pointer text-center text-[10px] transition-all"
                                    >
                                      إلغاء المطابقة وإعادة المعاملة لانتظار التسوية ↩
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 2: Rules Settings */}
                  {reconciliationTabSub === 'rules' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-[11px] font-bold text-slate-600">قواعد التسوية والتطابق النشطة في النظام</span>
                        <button 
                          onClick={() => setShowRuleModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 px-3 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} />
                          إضافة قاعدة مطابقة جديدة
                        </button>
                      </div>

                      {/* Add rule Modal / inline form */}
                      {showRuleModal && (
                        <form onSubmit={handleCreateRuleSubmit} className="bg-slate-50 p-3.5 rounded-xl border text-xs space-y-3">
                          <h4 className="font-bold text-slate-800">صياغة قاعدة مطابقة ذكية جديدة</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">اسم القاعدة:</label>
                              <input 
                                type="text" 
                                value={newRuleName}
                                onChange={(e) => setNewRuleName(e.target.value)}
                                placeholder="مثال: مطابقة رقم الفاتورة في الوصف" 
                                className="w-full bg-white border rounded p-1.5"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">نوع آلية المطابقة:</label>
                              <select 
                                value={newRuleType}
                                onChange={(e) => setNewRuleType(e.target.value as any)}
                                className="w-full bg-white border rounded p-1.5"
                              >
                                <option value="reference">رقم المرجعية الدقيق للفاتورة (Reference)</option>
                                <option value="counterparty">اسم الطرف الآخر مع مبالغ دقيقة (Counterparty & Amount)</option>
                                <option value="date_range">تقارب التاريخ وقيمة دقيقة (Date window & Amount)</option>
                                <option value="amount">مبالغ مطابقة فريدة فقط (Amount only)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">وصف القاعدة وشروط التفعيل:</label>
                            <input 
                              type="text" 
                              value={newRuleDescription}
                              onChange={(e) => setNewRuleDescription(e.target.value)}
                              placeholder="أدخل وصفاً مبسطاً لتعريف القاعدة لزملائك المحاسبين..."
                              className="w-full bg-white border rounded p-1.5"
                            />
                          </div>

                          <div className="flex justify-end gap-1.5 pt-2">
                            <button 
                              type="submit" 
                              className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 px-3 rounded font-bold"
                            >
                              حفظ القاعدة واعتمادها
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setShowRuleModal(false)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 px-3 rounded"
                            >
                              إلغاء
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="space-y-2">
                        {reconciliationRules.map((rule, idx) => (
                          <div key={rule.id} className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded leading-none">
                                  أولوية #{rule.priority || idx + 1}
                                </span>
                                <p className="font-bold text-slate-800">{rule.name}</p>
                              </div>
                              <p className="text-[10px] text-slate-500">{rule.description}</p>
                              <span className="bg-blue-50 text-blue-800 text-[8px] font-black px-1 rounded-sm leading-none uppercase">
                                نوع: {rule.rule_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold">نشط</span>
                              <button 
                                onClick={() => handleDeleteRule(rule.id)}
                                className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Reconciliation Logs History */}
                  {reconciliationTabSub === 'logs' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pb-2 border-b">
                        <span>سجل المراجعة والتدقيق للعمليات التاريخية للتسويات (Audit Logs)</span>
                        <span>إجمالي القيود المطابقة: {reconciliationLogs.length}</span>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 text-xs">
                        {reconciliationLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-slate-50 rounded border flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <p className="text-slate-800 font-bold">{log.notes}</p>
                              <p className="text-[9px] text-slate-400 font-mono">
                                التاريخ: {log.reconciliation_date} | القيد: {log.bank_transaction_id}
                              </p>
                            </div>
                            <div className="text-left font-mono text-[9px] text-slate-400">
                              <span className="bg-slate-200 text-slate-700 text-[8px] font-black px-1.5 rounded block text-center mb-1">
                                {log.status === 'matched' ? 'تمت التسوية' : 'تم إلغاء المطابقة'}
                              </span>
                              <span>بواسطة: {log.performed_by || 'أحمد حماد'}</span>
                            </div>
                          </div>
                        ))}
                        {reconciliationLogs.length === 0 && (
                          <div className="text-center py-12 text-slate-400">لا توجد سجلات تسوية تاريخية بعد. قم بمطابقة المعاملات لعرض السجل هنا.</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* Render Ledger & Manual Journals Sub-tab */}
          {subTab === 'ledger' && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="text-indigo-600" size={15} />
                    القيود المحاسبية اليدوية العامة (Journal Entries Voucher)
                  </h3>
                  <p className="text-[10px] text-slate-500">قم بصياغة قيود تسوية الأستاذ العام الثنائية (المدين والدائن) لضبط الفروقات المالية</p>
                </div>
                <button 
                  onClick={() => setShowJournalVoucher(!showJournalVoucher)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 px-3 rounded font-bold text-[10px] cursor-pointer border border-indigo-250 transition-all"
                >
                  {showJournalVoucher ? "إغلاق السند" : "صياغة قيد تسوية ثنائي +"}
                </button>
              </div>

              {showJournalVoucher && (
                <form onSubmit={handleJournalSubmit} className="bg-slate-50 p-3.5 rounded-xl border text-xs space-y-3">
                  {journalError && (
                    <div className="bg-red-50 text-red-700 p-2 rounded">{journalError}</div>
                  )}
                  {journalSuccess && (
                    <div className="bg-green-50 text-green-750 p-2 rounded font-bold">{journalSuccess}</div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">الطرف المدين (+) (Debit Account)</label>
                      <select 
                        value={debitAccount}
                        onChange={(e) => setDebitAccount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1"
                      >
                        <option value="">-- اختر حساب مدينة --</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name} (الرصيد: {a.balance} ج.م)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">الطرف الدائن (-) (Credit Account)</label>
                      <select 
                        value={creditAccount}
                        onChange={(e) => setCreditAccount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1"
                      >
                        <option value="">-- اختر حساب دائن --</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name} (الرصيد: {a.balance} ج.م)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">المبلغ المراد قيده (ج.م)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={journalAmount}
                        onChange={(e) => setJournalAmount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1 text-left font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">البيان / مذكرة الملاحظة</label>
                    <input 
                      type="text" 
                      placeholder="مثل: قيد إثبات اهتلاك أصول أو تصحيح تسوية خطأ مصرفي"
                      value={journalMemo}
                      onChange={(e) => setJournalMemo(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-1 px-4 rounded text-[11px] cursor-pointer"
                    >
                      اعتماد وترحيل سند قيد التدقيق
                    </button>
                  </div>
                </form>
              )}

              {/* List of accounts ledger overview */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">شجرة وعناصر الحسابات الأساسية (Chart of Accounts)</span>
                  {userRole !== 'viewer' && (
                    <button 
                      onClick={() => setShowAddAccount(!showAddAccount)}
                      className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      {showAddAccount ? "إلغاء الحساب" : "إضافة حساب جديد الشجرة +"}
                    </button>
                  )}
                </div>

                {showAddAccount && (
                  <form onSubmit={handleCreateAccount} className="bg-slate-50 p-2.5 rounded-lg border text-xs gap-3 mb-3 flex flex-wrap items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[9px] text-slate-500">اسم الحساب الكودي</label>
                      <input 
                        type="text" 
                        value={accName} 
                        onChange={(e) => setAccName(e.target.value)}
                        placeholder="مصروف مكاتب عامة"
                        className="bg-white border text-xs p-1 rounded w-full"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[9px] text-slate-500">رمز الحساب</label>
                      <input 
                        type="text" 
                        value={accCode} 
                        onChange={(e) => setAccCode(e.target.value)}
                        placeholder="5080"
                        className="bg-white border text-xs p-1 rounded w-full"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-[9px] text-slate-500">النوع الرئيسي</label>
                      <select 
                        value={accType} 
                        onChange={(e: any) => setAccType(e.target.value)}
                        className="bg-white border text-xs p-1 rounded w-full"
                      >
                        <option value="asset">أصل أصول (Asset)</option>
                        <option value="liability">التزام خصوم (Liability)</option>
                        <option value="equity">حق ملكية (Equity)</option>
                        <option value="revenue">إيراد مبيعات (Revenue)</option>
                        <option value="expense">مصروف تشغيلي (Expense)</option>
                      </select>
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white p-1 px-3 text-[10px] font-bold rounded cursor-pointer">
                      حفظ بالقائمة
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-[10px]">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-850">{acc.name}</span>
                        <span className="font-mono text-slate-400">{acc.code}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 uppercase">{acc.type}</span>
                        <span className="font-bold text-slate-700 font-mono">{(acc.balance).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* القيود المحاسبية المرحّلة */}
              <div className="pt-4 border-t border-slate-200 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="text-indigo-600" size={15} />
                    <span className="text-xs font-black text-slate-800">دفتر القيود المحاسبية المرحّلة (Accounting Entries Ledger)</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadEntries}
                    className="p-1 px-2.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-all"
                    title="تحديث البيانات"
                  >
                    <RefreshCw size={10} className={isLoadingEntries ? "animate-spin" : ""} />
                    تحديث القيود
                  </button>
                </div>

                {isLoadingEntries ? (
                  <div className="p-6 text-center text-xs text-slate-400 animate-pulse">جاري تحميل دفتر القيود المحاسبية...</div>
                ) : entries.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                    لا توجد قيود محاسبية مسجلة بعد.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px]">
                          <th className="p-2">رقم القيد</th>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">البيان</th>
                          <th className="p-2">النوع</th>
                          <th className="p-2 text-blue-600">إجمالي المدين</th>
                          <th className="p-2 text-red-600">إجمالي الدائن</th>
                          <th className="p-2 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition-all text-[11px] text-slate-700">
                            <td className="p-2 font-mono font-bold text-slate-400">{e.id}</td>
                            <td className="p-2 font-bold font-mono">{e.entry_date}</td>
                            <td className="p-2 font-medium">{e.description}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                e.reference_type === 'payroll' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {e.reference_type === 'payroll' ? 'مسير الرواتب' : 'قيد تسوية يدوي'}
                              </span>
                            </td>
                            <td className="p-2 font-mono font-bold text-blue-600">
                              {Number(e.total_debit || 0).toLocaleString()} ج.م
                            </td>
                            <td className="p-2 font-mono font-bold text-red-600">
                              {Number(e.total_credit || 0).toLocaleString()} ج.م
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => viewEntryDetails(e)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-700 text-[10px] font-bold rounded transition-all flex items-center gap-1 mx-auto border border-slate-200 cursor-pointer"
                              >
                                <FileText size={10} />
                                عرض التفاصيل
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

        </div>

        {/* Right Single column: Gemini Financial Accountant Copilot (Arabic) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col h-full justify-between">
          <div className="space-y-4">
            
            {/* Header Copilot */}
            <div className="pb-3 border-b flex justify-between items-center bg-gradient-to-r from-blue-700 to-indigo-800 p-3 rounded-t-lg text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400 rotate-12" />
                <div>
                  <h3 className="text-xs font-black">كوبايلوت بروميت المحاسبي</h3>
                  <p className="text-[8px] opacity-75">خبير استشارات مالي وضريبي آلي</p>
                </div>
              </div>
              <span className="text-[8px] bg-white/10 p-1 rounded tracking-wider font-bold">GEMINI FLASH</span>
            </div>

            {/* Quick Prompts Helper */}
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
              <p className="text-[9px] text-slate-400 font-bold mb-1">استفسارات سريعة مقترحة (انقر فوراً للسؤال):</p>
              <div className="flex flex-col gap-1">
                {aiPrompts.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      if (!isChatLoading) {
                        onSendChatMessage(p);
                      }
                    }}
                    className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 text-right p-1 px-2 rounded cursor-pointer leading-tight font-medium"
                    disabled={isChatLoading}
                  >
                    ✦ {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {chatMessages.map((msg) => {
                const isAssistant = msg.sender === 'assistant';
                return (
                  <div 
                    key={msg.id}
                    className={`p-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                      isAssistant 
                        ? 'bg-slate-100 text-slate-800 self-start mr-0 ml-auto' 
                        : 'bg-blue-600 text-white self-end ml-0 mr-auto text-left'
                    }`}
                  >
                    <p className="font-bold text-[9px] opacity-75 mb-0.5">
                      {isAssistant ? '✦ المستشار المالي' : 'أنت'}
                    </p>
                    <p className="text-[10.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>
                );
              })}

              {isChatLoading && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 p-2 text-center justify-center animate-pulse">
                  <RefreshCw className="animate-spin" size={11} />
                  <span>جاري تحليل السجلات والرد محاسبياً...</span>
                </div>
              )}
            </div>
          </div>

          {/* Form write */}
          <form onSubmit={handleSendChat} className="flex gap-1.5 pt-3 border-t mt-3">
            <input 
              type="text"
              placeholder="تبادل أطراف الحديث كأن تسأل: ما الأرباح الصافية؟"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={isChatLoading}
              className="bg-blue-600 text-white p-1.5 px-3 rounded hover:bg-blue-700 cursor-pointer text-xs disabled:opacity-50"
            >
              <Send size={12} />
            </button>
          </form>

        </div>
      </div>

      {/* تسجيل حركة مالية جديدة Modal */}
      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="تسجيل حركة نقدية أو بنكية جديدة"
        icon={<Plus className="text-blue-400" size={18} />}
        headerColorClass="text-blue-400"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleAddCashTransaction} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">تاريخ المعاملة</label>
              <input 
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">نوع الحركة المالية</label>
              <select 
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="deposit">إيداع رصيد (Deposit)</option>
                <option value="withdrawal">سحب نقدية (Withdrawal)</option>
                <option value="transfer">تحويل داخلي (Transfer)</option>
                <option value="receipt">تحصيل إيراد (Receipt)</option>
                <option value="payment">سداد مصروف (Payment)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">نوع الحساب المستهدف</label>
              <select 
                value={txSourceType}
                onChange={(e) => setTxSourceType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="bank">🏦 حساب بنكي مصرفي</option>
                <option value="treasury">💰 الخزينة / الصندوق</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اختر الحساب</label>
              <select 
                required
                value={txSourceId}
                onChange={(e) => setTxSourceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="">-- اختر حساب مستهدف --</option>
                {txSourceType === 'bank' ? (
                  bankAccounts.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                  ))
                ) : (
                  treasuryData.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">المبلغ المالي (ج.م)</label>
            <input 
              type="number"
              required
              placeholder="0.00"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">البيان / الوصف المذكرة</label>
            <textarea 
              placeholder="مثال: إيداع نقدي للمبيعات اليومية أو دفعة سداد مصروف ترويجي"
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none h-16"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setShowTransactionModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              حفظ الحركة المالية
            </button>
          </div>
        </form>
      </Modal>

      {/* إضافة حساب بنكي جديد Modal */}
      <Modal
        isOpen={showBankAccountModal}
        onClose={() => setShowBankAccountModal(false)}
        title="إضافة حساب بنكي جديد للمؤسسة"
        icon={<Building className="text-blue-400" size={18} />}
        headerColorClass="text-blue-400"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleAddBankAccount} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اسم الحساب (بالعربي)</label>
              <input 
                type="text"
                required
                placeholder="مثال: حساب البنك الأهلي الجاري"
                value={bankAccName}
                onChange={(e) => setBankAccName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">رقم الحساب</label>
              <input 
                type="text"
                required
                placeholder="1234567890"
                value={bankAccNumber}
                onChange={(e) => setBankAccNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اسم البنك</label>
              <input 
                type="text"
                placeholder="البنك الأهلي المصري"
                value={bankNameStr}
                onChange={(e) => setBankNameStr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">فرع البنك</label>
              <input 
                type="text"
                placeholder="فرع القاهرة الجديدة"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">رقم الآيبان (IBAN)</label>
              <input 
                type="text"
                placeholder="EG..."
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">سويفت كود (SWIFT Code)</label>
              <input 
                type="text"
                placeholder="NBEG..."
                value={bankSwift}
                onChange={(e) => setBankSwift(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">الرصيد الافتتاحي (ج.م)</label>
            <input 
              type="number"
              placeholder="0.00"
              value={bankOpeningBalance}
              onChange={(e) => setBankOpeningBalance(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setShowBankAccountModal(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md transition-colors"
            >
              إضافة الحساب المصرفي
            </button>
          </div>
        </form>
      </Modal>

      {/* تفاصيل القيد المحاسبي Modal */}
      {selectedEntry && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEntry(null);
            setSelectedEntryDetails([]);
          }}
          title="تفاصيل سند القيد المحاسبي"
          icon={<BookOpen className="text-indigo-400" size={18} />}
          headerColorClass="text-indigo-400"
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">البيان الأساسي:</span>
                <span className="font-bold text-white">{selectedEntry.description}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">تاريخ القيد:</span>
                <span className="font-bold text-white font-mono">{selectedEntry.entry_date}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-0.5">الحالة والاتزان:</span>
                {selectedEntryDetails.reduce((sum, d) => sum + Number(d.debit || 0), 0) === 
                 selectedEntryDetails.reduce((sum, d) => sum + Number(d.credit || 0), 0) ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block mt-0.5">
                    ✅ متوازن (Balanced)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-block mt-0.5">
                    ❌ غير متوازن (Unbalanced)
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-700 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-700 text-[10px]">
                    <th className="p-2.5">رمز الحساب</th>
                    <th className="p-2.5">اسم الحساب</th>
                    <th className="p-2.5 text-blue-400">مدين (Debit)</th>
                    <th className="p-2.5 text-rose-400">دائن (Credit)</th>
                    <th className="p-2.5">ملاحظات الطرف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {selectedEntryDetails.map((det: any) => (
                    <tr key={det.id} className="hover:bg-slate-700/30 transition-all text-[11px] text-slate-200">
                      <td className="p-2.5 font-mono font-bold text-slate-400">{det.account_code}</td>
                      <td className="p-2.5 font-bold text-white">{det.account_name}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-400">
                        {Number(det.debit || 0) > 0 ? `${Number(det.debit).toLocaleString()} ج.م` : '—'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-rose-400">
                        {Number(det.credit || 0) > 0 ? `${Number(det.credit).toLocaleString()} ج.م` : '—'}
                      </td>
                      <td className="p-2.5 text-slate-400 text-[10.5px] font-medium">{det.notes || '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900/80 font-bold text-white border-t-2 border-slate-700 text-[11px]">
                    <td colSpan={2} className="p-2.5 text-left font-bold">الإجمالي:</td>
                    <td className="p-2.5 font-mono text-blue-400 text-xs">
                      {selectedEntryDetails.reduce((sum, d) => sum + Number(d.debit || 0), 0).toLocaleString()} ج.م
                    </td>
                    <td className="p-2.5 font-mono text-rose-400 text-xs">
                      {selectedEntryDetails.reduce((sum, d) => sum + Number(d.credit || 0), 0).toLocaleString()} ج.م
                    </td>
                    <td className="p-2.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end border-t border-slate-700 pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEntry(null);
                  setSelectedEntryDetails([]);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-5 py-2 rounded-xl transition-colors font-medium"
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
