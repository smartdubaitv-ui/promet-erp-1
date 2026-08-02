import React, { useState, useEffect, useContext, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  Users, 
  Landmark, 
  BarChart3, 
  Settings, 
  Check, 
  AlertTriangle,
  UserCheck,
  Plus,
  Briefcase,
  Layers,
  ShieldAlert,
  Puzzle,
  Globe,
  Scale,
  Wallet,
  Vault,
  BookOpen,
  Coins,
  CreditCard,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  LogOut
} from 'lucide-react';

// Subcomponents
import { CustomDashboardView } from './views/CustomDashboardView';
import { AdvancedDashboardView } from './views/AdvancedDashboardView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import EmployeesView from './views/EmployeesView';
import PayrollView from './views/PayrollView';
import InvoicesView from './views/InvoicesView';
import ExpensesView from './components/ExpensesView';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import BankingAndCopilot from './components/BankingAndCopilot';
import HRView from './components/HRView';
import ProjectsView from './components/ProjectsView';
import AssetsView from './components/AssetsView';
import CRMView from './components/CRMView';
import AuditView from './components/AuditView';
import BankReconciliationView from './views/BankReconciliationView';
import AccountsPayableView from './views/AccountsPayableView';
import ActivitySetup from './views/ActivitySetup';
import DashboardView from './views/DashboardView';
import ModulesView from './views/ModulesView';
import { UnifiedSettingsView } from './views/UnifiedSettingsView';
import ActivityReportsView from './views/ActivityReportsView';
import { PermissionsView } from './views/PermissionsView';
import { Modal } from './components/Modal';
import { PermissionGate } from './components/PermissionGate';
import { Permission, UserRole } from './types/roles';
import { AuthContext } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { TrialBalanceView } from './views/TrialBalanceView';
import { ProfitLossView } from './views/ProfitLossView';
import { BalanceSheetView } from './views/BalanceSheetView';
import { CashFlowView } from './views/CashFlowView';
import { GeneralLedgerView } from './views/GeneralLedgerView';
import { TaxReportView } from './views/TaxReportView';
import { AgingReceivableView } from './views/AgingReceivableView';
import { AgingPayableView } from './views/AgingPayableView';
import { ScrapView } from './views/ScrapView';
import { EnterpriseView } from './views/EnterpriseView';
import { TreasuryView } from './components/TreasuryView';


// Types
import { 
  Invoice, 
  Contact, 
  Product, 
  Expense, 
  BankTransaction, 
  Account, 
  User, 
  ChatMessage 
} from './types';

function getSectionIcon(id: string) {
  switch (id) {
    case 'dashboard': return <LayoutDashboard size={14} />;
    case 'invoices': return <Receipt size={14} />;
    case 'expenses': return <TrendingDown size={14} />;
    case 'inventory': return <Package size={14} />;
    case 'contacts': return <Users size={14} />;
    case 'banking': return <TrendingUp size={14} />;
    case 'reports': return <BarChart3 size={14} />;
    case 'hr': return <Users size={14} />;
    case 'projects': return <Briefcase size={14} />;
    case 'assets': return <Layers size={14} />;
    case 'audit': return <ShieldAlert size={14} />;
    default: return <Settings size={14} />;
  }
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map pathname to activeTab (derived state from routing)
  const activeTab = location.pathname.substring(1) || 'dashboard';

  // Helper to change active view
  const setActiveTab = (tabId: string) => {
    console.log(`Navigating to /${tabId}`);
    navigate(`/${tabId}`);
  };

  // Language Configuration
  const [currentLanguage, setCurrentLanguage] = useState<string>(localStorage.getItem('promet_language') || 'ar');

  // Active company activity state (e.g. 'retail', 'scrap')
  const [companyActivity, setCompanyActivity] = useState<string>('scrap');

  // Reports submenu expansion toggle (keeps it open if visiting a reports subpath)
  const reportsSubPaths = [
    'reports', 'trial-balance', 'profit-loss', 'balance-sheet', 
    'cash-flow', 'general-ledger', 'tax-report', 'aging-receivable', 'aging-payable', 'activity-reports', 'scrap_reports'
  ];
  const [reportsMenuExpanded, setReportsMenuExpanded] = useState(() => {
    return reportsSubPaths.includes(window.location.pathname.substring(1));
  });

  const handleLanguageChange = async (langCode: string) => {
    try {
      const res = await fetch('/api/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: langCode })
      });
      if (res.ok) {
        localStorage.setItem('promet_language', langCode);
        setCurrentLanguage(langCode);
        alert(langCode === 'ar' ? '✅ تم تغيير لغة النظام بنجاح!' : `✅ System language changed to ${langCode.toUpperCase()} successfully!`);
      } else {
        alert('فشل تغيير اللغة / Failed to change language');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle state to control navigation modules visibility dynamically
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    dashboard: true,
    invoices: true,
    expenses: true,
    inventory: true,
    contacts: true,
    banking: true,
    reports: true,
    hr: true,
    projects: true,
    assets: true,
    audit: true,
    activityReports: true,
    permissions: true,
    scrap: true,
    scrap_inventory: true,
    scrap_transactions: true,
    scrap_reports: true
  });

  // Dynamic deduplicated reports list according to selected activity
  const sidebarReports = useMemo(() => {
    const scrapReportItem = companyActivity === 'scrap' ? [
      { id: 'scrap_reports', label: '📊 تقارير الخردة وميزان البسكول', icon: BarChart3, iconColor: 'text-purple-400' }
    ] : [];

    const baseReports = [
      { id: 'trial-balance', label: '📊 ميزان المراجعة', icon: Scale, iconColor: 'text-blue-400' },
      { id: 'profit-loss', label: '📈 قائمة الدخل', icon: TrendingUp, iconColor: 'text-emerald-400' },
      { id: 'balance-sheet', label: '⚖️ الميزانية العمومية', icon: Landmark, iconColor: 'text-amber-400' },
      { id: 'cash-flow', label: '💵 كشف التدفقات النقدية', icon: Wallet, iconColor: 'text-cyan-400' },
      { id: 'general-ledger', label: '📚 دفتر الأستاذ العام', icon: BookOpen, iconColor: 'text-indigo-400' },
      { id: 'tax-report', label: '🧾 التقرير الضريبي', icon: Receipt, iconColor: 'text-indigo-400' },
      { id: 'aging-receivable', label: '💰 أعمار الذمم المدينة', icon: Coins, iconColor: 'text-indigo-400' },
      { id: 'aging-payable', label: '💳 أعمار الحسابات الدائنة', icon: CreditCard, iconColor: 'text-indigo-400' },
    ];

    const activityReports = visibleSections.activityReports ? [
      { id: 'activity-reports', label: '📊 تقارير حسب النشاط', icon: BarChart3, iconColor: 'text-indigo-400' }
    ] : [];

    const combined = [...scrapReportItem, ...baseReports, ...activityReports];
    // دمج العناصر ومنع تكرار أي عنصر ليه نفس الـ id
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [visibleSections.activityReports, companyActivity]);

  // Active logged-in user details initialized from session / localStorage
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRole] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.role || 'admin';
      }
    } catch {}
    return 'admin';
  });

  const { login: setAuthUser, logout } = useContext(AuthContext);
  const { can } = usePermissions();

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        if (u.role && u.role !== userRole) {
          setUserRole(u.role);
        }
        const roleMap: Record<string, UserRole> = {
          admin: UserRole.ADMIN,
          superadmin: UserRole.ADMIN,
          accountant: UserRole.ACCOUNTANT,
          finance: UserRole.ACCOUNTANT,
          sales: UserRole.EMPLOYEE,
          hr: UserRole.EMPLOYEE,
          scrap: UserRole.EMPLOYEE,
          viewer: UserRole.EMPLOYEE
        };
        setAuthUser({
          id: u.id || 1,
          name: u.name || u.username || 'مستخدم النظام',
          email: u.email || 'user@promet.com',
          role: roleMap[u.role] || UserRole.EMPLOYEE
        });
      } catch (err) {}
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCurrentUser(null);
    logout();
    navigate('/login', { replace: true });
  };
  
  // Theme state supporting 'classic' and 'neon'
  const [appTheme, setAppTheme] = useState<'classic' | 'neon'>(() => {
    return (localStorage.getItem('appTheme') as 'classic' | 'neon') || 'neon';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', appTheme);
    if (appTheme === 'neon') {
      document.documentElement.classList.add('theme-neon-active');
    } else {
      document.documentElement.classList.remove('theme-neon-active');
    }
  }, [appTheme]);
  
  // Loadable database entities from Server API
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Notifications State & Logic
  const [notifSettings, setNotifSettings] = useState<any[]>([]);
  const [notifSettingsLoading, setNotifSettingsLoading] = useState<boolean>(false);
  const [savingNotifSettings, setSavingNotifSettings] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const getUserIdFromRole = (role: string) => {
    switch (role) {
      case 'admin': return 'u-1';
      case 'accountant': return 'u-2';
      case 'sales': return 'u-3';
      case 'viewer': return 'u-4';
      default: return 'u-1';
    }
  };

  const safeJsonFetch = async (url: string, fallback: any = null) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(url, { headers });
      if (!r.ok) return fallback;
      const contentType = r.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await r.json();
      }
      return fallback;
    } catch (err) {
      console.warn(`Warning/Info: Suppressed fetch issue for ${url}:`, err);
      return fallback;
    }
  };

  const loadNotificationsAndSettings = async () => {
    try {
      const activeUserId = getUserIdFromRole(userRole);
      setNotifSettingsLoading(true);
      
      const [notifsRes, settingsRes] = await Promise.all([
        safeJsonFetch(`/api/notifications?userId=${activeUserId}`, {}),
        safeJsonFetch(`/api/notifications/settings?userId=${activeUserId}`, [])
      ]);

      if (notifsRes && Array.isArray(notifsRes.data)) {
        setNotifications(notifsRes.data);
        setUnreadNotifsCount(notifsRes.unread_count || 0);
      }
      
      if (Array.isArray(settingsRes)) {
        setNotifSettings(settingsRes);
      }
    } catch (err) {
      console.error("Failed to load notifications/settings:", err);
    } finally {
      setNotifSettingsLoading(false);
    }
  };

  const handleToggleSetting = (typeId: number, key: 'receive_in_app' | 'receive_by_email', value: boolean) => {
    setNotifSettings(prev => prev.map(s => {
      if (s.notification_type_id === typeId) {
        return { ...s, [key]: value };
      }
      return s;
    }));
  };

  const handleSaveNotifSettings = async () => {
    try {
      setSavingNotifSettings(true);
      const activeUserId = getUserIdFromRole(userRole);
      const res = await fetch(`/api/notifications/settings?userId=${activeUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: notifSettings })
      });
      if (!res.ok) throw new Error();
      alert("✅ تم حفظ إعدادات الإشعارات بنجاح ومزامنتها على الخادم.");
    } catch {
      alert("❌ فشل حفظ الإعدادات");
    } finally {
      setSavingNotifSettings(false);
    }
  };

  const handleMarkAsRead = async (notifId: number) => {
    try {
      const activeUserId = getUserIdFromRole(userRole);
      const res = await fetch(`/api/notifications/${notifId}/read?userId=${activeUserId}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true, status: 'read' } : n));
        setUnreadNotifsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const activeUserId = getUserIdFromRole(userRole);
      const res = await fetch(`/api/notifications/read-all?userId=${activeUserId}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, status: 'read' })));
        setUnreadNotifsCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Search input and loader triggers
  const [globalSearch, setGlobalSearch] = useState('');
  const [sysLoading, setSysLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Copilot Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'assistant', text: 'مرحباً بك في نظام بروميت المحاسبي الذكي. أنا كوبايلوت بروميت المالي. كيف يمكنني مساعدتك في استقصاء سيولة البنك اليوم أو فحص حسابات الذمم المعلقة؟', timestamp: new Date().toISOString() }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Contacts adding states (built directly in Contacts/Settings tab inside App.tsx)
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<'customer' | 'vendor'>('customer');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | 'customer' | 'vendor'>('all');

  // Initial loading from Express server
  const loadAllData = async () => {
    try {
      setSysLoading(true);
      const [
        resTenant, 
        resInvoices, 
        resContacts, 
        resExpenses, 
        resProducts, 
        resTransactions, 
        resAccounts, 
        resUsers, 
        resSettings,
        resCompSettings
      ] = await Promise.all([
        safeJsonFetch('/api/tenant', {}),
        safeJsonFetch('/api/invoices', []),
        safeJsonFetch('/api/contacts', []),
        safeJsonFetch('/api/expenses', []),
        safeJsonFetch('/api/products', []),
        safeJsonFetch('/api/bank-transactions', []),
        safeJsonFetch('/api/accounts', []),
        safeJsonFetch('/api/users', []),
        safeJsonFetch('/api/settings', {}),
        safeJsonFetch('/api/company-settings', {})
      ]);

      setTenant(resTenant);
      setInvoices(Array.isArray(resInvoices) ? resInvoices : []);
      setContacts(Array.isArray(resContacts) ? resContacts : []);
      setExpenses(Array.isArray(resExpenses) ? resExpenses : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setTransactions(Array.isArray(resTransactions) ? resTransactions : []);
      setAccounts(Array.isArray(resAccounts) ? resAccounts : []);
      setUsers(Array.isArray(resUsers) ? resUsers : []);

      if (resCompSettings && resCompSettings.activity_code) {
        setCompanyActivity(resCompSettings.activity_code);
      }

      if (resSettings && resSettings.visibleSections) {
        setVisibleSections({
          dashboard: resSettings.visibleSections.dashboard !== undefined ? resSettings.visibleSections.dashboard : true,
          invoices: resSettings.visibleSections.invoices !== undefined ? resSettings.visibleSections.invoices : true,
          expenses: resSettings.visibleSections.expenses !== undefined ? resSettings.visibleSections.expenses : true,
          inventory: resSettings.visibleSections.inventory !== undefined ? resSettings.visibleSections.inventory : true,
          contacts: resSettings.visibleSections.contacts !== undefined ? resSettings.visibleSections.contacts : true,
          banking: resSettings.visibleSections.banking !== undefined ? resSettings.visibleSections.banking : true,
          reports: resSettings.visibleSections.reports !== undefined ? resSettings.visibleSections.reports : true,
          hr: resSettings.visibleSections.hr !== undefined ? resSettings.visibleSections.hr : true,
          projects: resSettings.visibleSections.projects !== undefined ? resSettings.visibleSections.projects : true,
          assets: resSettings.visibleSections.assets !== undefined ? resSettings.visibleSections.assets : true,
          audit: resSettings.visibleSections.audit !== undefined ? resSettings.visibleSections.audit : true,
          scrap: resSettings.visibleSections.scrap !== undefined ? resSettings.visibleSections.scrap : true
        });
      }

      // Fetch company modules configuration dynamically for the modular system
      try {
        const compModules = await safeJsonFetch('/api/company-modules', []);
        if (Array.isArray(compModules) && compModules.length > 0) {
          const sections: Record<string, boolean> = {};
          compModules.forEach((m: any) => {
            sections[m.code] = m.is_enabled !== false;
          });
          
          setVisibleSections(prev => ({
            ...prev,
            dashboard: sections.dashboard !== undefined ? sections.dashboard : prev.dashboard,
            invoices: sections.invoices !== undefined ? sections.invoices : prev.invoices,
            expenses: sections.expenses !== undefined ? sections.expenses : prev.expenses,
            inventory: sections.inventory !== undefined ? sections.inventory : prev.inventory,
            contacts: sections.crm !== undefined ? sections.crm : prev.contacts,
            banking: sections.banking !== undefined ? sections.banking : prev.banking,
            reports: sections.reports !== undefined ? sections.reports : prev.reports,
            hr: sections.employees !== undefined ? sections.employees : prev.hr,
            projects: sections.projects !== undefined ? sections.projects : prev.projects,
            assets: sections.assets !== undefined ? sections.assets : prev.assets,
            audit: sections.audit !== undefined ? sections.audit : prev.audit,
            scrap: sections.scrap !== undefined ? sections.scrap : prev.scrap,
            scrap_inventory: sections.scrap_inventory !== undefined ? sections.scrap_inventory : prev.scrap_inventory,
            scrap_transactions: sections.scrap_transactions !== undefined ? sections.scrap_transactions : prev.scrap_transactions,
            scrap_reports: sections.scrap_reports !== undefined ? sections.scrap_reports : prev.scrap_reports,
          }));
        }
      } catch (err) {
        console.error('Failed to load company modules:', err);
      }

      // Fetch smart alerts in the background as non-blocking
      safeJsonFetch('/api/ai/smart-alerts', [])
        .then(resAlerts => setAlerts(Array.isArray(resAlerts) ? resAlerts : []))
        .catch(err => console.error('Failed to load background alerts:', err));

    } catch (err) {
      console.error('Failed to parse loadable items:', err);
    } finally {
      setSysLoading(false);
    }
  };

  const handleSwitchActivity = async (code: string) => {
    setCompanyActivity(code);
    const isScrap = code === 'scrap';
    try {
      await fetch('/api/company-settings/activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_code: code })
      });
      setVisibleSections(prev => ({
        ...prev,
        scrap: isScrap,
        scrap_inventory: isScrap,
        scrap_transactions: isScrap,
        scrap_reports: isScrap,
      }));
    } catch (err) {
      console.error('Failed to update company activity:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const currentTab = location.pathname.substring(1);
    if (reportsSubPaths.includes(currentTab)) {
      setReportsMenuExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    loadNotificationsAndSettings();
  }, [userRole]);

  useEffect(() => {
    const interval = setInterval(() => {
      const activeUserId = getUserIdFromRole(userRole);
      safeJsonFetch(`/api/notifications?userId=${activeUserId}`, {})
        .then(notifsRes => {
          if (notifsRes && Array.isArray(notifsRes.data)) {
            setNotifications(notifsRes.data);
            setUnreadNotifsCount(notifsRes.unread_count || 0);
          }
        })
        .catch(err => console.error("Periodic notification fetch failed:", err));
    }, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Helper to build headers with Authorization token if available
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // API Call helper wrappers
  const handleCreateInvoice = async (invoiceData: any) => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حفظ الفاتورة' }));
      throw err;
    }
    const data = await res.json();
    await loadAllData(); // Recompute state balances
    return data;
  };

  const handleUpdateInvoice = async (id: string, updateData: any) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  const handleCreateExpense = async (expenseData: any) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  const handleCreateProduct = async (productData: any) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  const handleUpdateProduct = async (id: string, updateData: any) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  const handleReconcileTransaction = async (id: string, matchedCategory: string) => {
    const res = await fetch(`/api/bank-transactions/reconcile/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ matchedCategory })
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  // Simulates Plaid bank pull feeds
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/bank-transactions/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendChatMessage = async (msgText: string) => {
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: msgText,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages((prev) => [...prev, newUserMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatMessages, newUserMsg] })
      });
      const data = await res.json();
      if (data && data.text) {
        setChatMessages((prev) => [...prev, {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contactType,
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          address: contactAddress
        })
      });
      if (res.ok) {
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactAddress('');
        setShowContactForm(false);
        await loadAllData();
      }
    } catch (err) {
      alert('خطأ أثناء إضافة جهة الاتصال');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'فشل عملية حذف جهة الاتصال لربطه بمبيعات.');
        return;
      }
      await loadAllData();
    } catch (e) {
      alert('فشل الاتصال بالخادم لحذف جهة الاتصال');
    }
  };

  const handleCreateAccount = async (accData: any) => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  // Searching logic for general items (QuickBooks search box simulation)
  const filteredInvoices = invoices.filter(inv => {
    if (!globalSearch) return true;
    const client = contacts.find(c => c.id === inv.contactId);
    return inv.invoiceNumber.toLowerCase().includes(globalSearch.toLowerCase()) || 
           (client && client.name.includes(globalSearch)) || 
           inv.status.toLowerCase().includes(globalSearch.toLowerCase());
  });

  const filteredContactsList = (contacts || []).filter(c => {
    const term = contactSearchQuery.trim().toLowerCase();
    const matchesSearch = !term || 
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term));
    const matchesType = contactTypeFilter === 'all' || c.type === contactTypeFilter;
    return matchesSearch && matchesType;
  });

  const isAuthenticated = Boolean(localStorage.getItem('token') || localStorage.getItem('user'));

  if (location.pathname === '/login') {
    if (isAuthenticated) {
      const saved = localStorage.getItem('user');
      const u = saved ? JSON.parse(saved) : currentUser || {};
      const role = (u.role || 'admin').toLowerCase();
      if (role === 'hr') return <Navigate to="/hr" replace />;
      if (role === 'accountant' || role === 'finance') return <Navigate to="/invoices" replace />;
      if (role === 'sales') return <Navigate to="/invoices" replace />;
      if (role === 'scrap' || role === 'scale') return <Navigate to="/scrap" replace />;
      return <Navigate to="/dashboard" replace />;
    }
    return <LoginView />;
  }

  if (location.pathname === '/register') {
    return <RegisterView />;
  }

  // Auth Guard: Protect internal ERP routes from unauthorized access
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${appTheme === 'neon' ? 'cyberlux-app bg-[#0A0A0F] text-white' : 'bg-[#F1F5F9] text-slate-800'}`} dir="rtl">
      
      {/* Sidebar navigation conforming to the High Density design template */}
      <aside className={`w-56 flex flex-col shrink-0 transition-colors duration-300 ${appTheme === 'neon' ? 'bg-[#13131A] border-l border-purple-900/30' : 'bg-[#1E293B]'}`}>
        <div className={`p-4 flex items-center justify-between border-b ${appTheme === 'neon' ? 'border-purple-900/30' : 'border-slate-700/50'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded flex items-center justify-center font-black text-white text-md shadow-xs ${appTheme === 'neon' ? 'bg-purple-600 shadow-[0_0_10px_rgba(108,43,217,0.5)]' : 'bg-blue-500'}`}>P</div>
            <span className="text-white font-black text-lg tracking-tight">بروميت</span>
          </div>
          <span className={`text-[8px] font-bold px-1 rounded ${appTheme === 'neon' ? 'bg-purple-950 text-purple-300 border border-purple-500/20' : 'bg-slate-700 text-slate-300'}`}>SaaS ERP</span>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
          <AnimatePresence initial={false}>
            {visibleSections.dashboard && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'dashboard' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <LayoutDashboard size={14} />
                  <span className="text-xs">لوحة التحكم</span>
                </button>
              </motion.div>
            )}

            {visibleSections.invoices && (
              <motion.div
                key="invoices"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    // Sales user can access invoices
                    setActiveTab('invoices');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'invoices' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Receipt size={14} />
                  <span className="text-xs font-bold">🧾 المبيعات والفواتير وعروض الأسعار</span>
                </button>
              </motion.div>
            )}

            {companyActivity !== 'scrap' && visibleSections.expenses && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، لا تمتلك الصلاحية الكافية للوصول للمصروفات بصفتك موظف مبيعات.');
                      return;
                    }
                    setActiveTab('expenses');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'expenses' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <TrendingDown size={14} />
                  <span className="text-xs">المصروفات والإيصالات</span>
                </button>
              </motion.div>
            )}

            {visibleSections.inventory && companyActivity !== 'scrap' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('inventory');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'inventory' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Package size={14} />
                  <span className="text-xs">إدارة المخزون والسلع</span>
                </button>
              </motion.div>
            )}

            {visibleSections.contacts && (
              <motion.div
                key="contacts"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('contacts');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'contacts' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Users size={14} />
                  <span className="text-xs">دفتر العملاء والموردين</span>
                </button>
              </motion.div>
            )}

            {visibleSections.contacts && (
              <motion.div
                key="crm"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('crm');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'crm' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span className="text-xs">المبيعات وعلاقات العملاء CRM</span>
                </button>
              </motion.div>
            )}

            {visibleSections.banking && (
              <motion.div
                key="treasury"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('treasury');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'treasury' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Vault size={14} />
                  <span className="text-xs">إدارة الخزينة متعددة الخزائن</span>
                </button>
              </motion.div>
            )}

            {visibleSections.banking && (
              <motion.div
                key="banking"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('banking');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'banking' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Landmark size={14} />
                  <span className="text-xs">البنوك والأستاذ العام</span>
                </button>
              </motion.div>
            )}

            {visibleSections.banking && (
              <motion.div
                key="bank-reconciliation"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('bank-reconciliation');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'bank-reconciliation' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Check size={14} />
                  <span className="text-xs">التسوية البنكية الذكية</span>
                </button>
              </motion.div>
            )}

            {visibleSections.banking && (
              <motion.div
                key="accounts-payable"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    if (userRole === 'sales') {
                      alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                      return;
                    }
                    setActiveTab('accounts-payable');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'accounts-payable' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Puzzle size={14} className="text-blue-400" />
                  <span className="text-xs">أتمتة الحسابات الدائنة</span>
                </button>
              </motion.div>
            )}

            {visibleSections.reports && (
              <>
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, height: 0, x: 20 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      if (userRole === 'sales') {
                        alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                        return;
                      }
                      setActiveTab('reports');
                      setReportsMenuExpanded(!reportsMenuExpanded);
                    }} 
                    className={`w-full flex items-center justify-between px-5 py-2 text-right transition-colors ${
                      userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      activeTab === 'reports' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 size={14} className="shrink-0" />
                      <span className="text-xs">التقارير والقوائم المالية</span>
                    </div>
                    {reportsMenuExpanded ? (
                      <ChevronUp size={12} className="text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown size={12} className="text-slate-500 shrink-0" />
                    )}
                  </button>
                </motion.div>

                {/* Sub-menu items under reports with strict deduplication */}
                {reportsMenuExpanded && (
                  <div key={`reports-sub-${companyActivity}`}>
                    {Array.from(new Map(sidebarReports.map(item => [item.id, item])).values()).map((reportItem) => {
                      const IconComponent = reportItem.icon;
                      const isItemActive = activeTab === reportItem.id || (reportItem.id === 'activity-reports' && activeTab === 'scrap_reports');
                      return (
                        <motion.div
                          key={`clean-${companyActivity}-${reportItem.id}`}
                          initial={{ opacity: 0, height: 0, x: 20 }}
                          animate={{ opacity: 1, height: 'auto', x: 0 }}
                          exit={{ opacity: 0, height: 0, x: -20 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="overflow-hidden pr-4"
                        >
                          <button 
                            onClick={() => {
                              if (userRole === 'sales') {
                                alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                                return;
                              }
                              setActiveTab(reportItem.id);
                            }} 
                            className={`w-full flex items-center gap-3 px-5 py-1.5 text-right transition-colors ${
                              userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${
                              isItemActive ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                          >
                            <IconComponent size={13} className={`${reportItem.iconColor} shrink-0`} />
                            <span className="text-[11px]">{reportItem.label}</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {visibleSections.hr && (
              <>
                <motion.div
                  key="hr"
                  initial={{ opacity: 0, height: 0, x: 20 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      if (!can(Permission.VIEW_REPORTS)) {
                        alert('عذراً، لا تملك صلاحية الوصول لقسم الموارد البشرية.');
                        return;
                      }
                      setActiveTab('hr');
                    }} 
                    className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                      !can(Permission.VIEW_REPORTS) ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      activeTab === 'hr' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Users size={14} />
                    <span className="text-xs">إدارة الموظفين HR</span>
                  </button>
                </motion.div>

                <motion.div
                  key="employees"
                  initial={{ opacity: 0, height: 0, x: 20 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      if (userRole === 'sales') {
                        alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                        return;
                      }
                      setActiveTab('employees');
                    }} 
                    className={`w-full flex items-center gap-3 px-8 py-1.5 text-right transition-colors ${
                      userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      activeTab === 'employees' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500">←</span>
                    <span className="text-[11px]">جدول ملفات الموظفين</span>
                  </button>
                </motion.div>

                <motion.div
                  key="payroll"
                  initial={{ opacity: 0, height: 0, x: 20 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      if (userRole === 'sales') {
                        alert('عذراً، صلاحياتك مقصورة على الفواتير فقط.');
                        return;
                      }
                      setActiveTab('payroll');
                    }} 
                    className={`w-full flex items-center gap-3 px-8 py-1.5 text-right transition-colors ${
                      userRole === 'sales' ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      activeTab === 'payroll' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500">←</span>
                    <span className="text-[11px]">مسيرات ورواتب الموظفين</span>
                  </button>
                </motion.div>
              </>
            )}

            {visibleSections.projects && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('projects');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'projects' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Briefcase size={14} />
                  <span className="text-xs">إدارة المشاريع والمهام</span>
                </button>
              </motion.div>
            )}

            {visibleSections.assets && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('assets');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'assets' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Layers size={14} />
                  <span className="text-xs">إدارة الأصول والسيولة</span>
                </button>
              </motion.div>
            )}

            {visibleSections.audit && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('audit');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'audit' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <ShieldAlert size={14} className="text-red-400" />
                  <span className="text-xs">سجل الرقابة وتدقيق الحركات</span>
                </button>
              </motion.div>
            )}

            {visibleSections.permissions && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('permissions');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'permissions' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <UserCheck size={14} className="text-purple-400" />
                  <span className="text-xs">🔐 مصفوفة الصلاحيات</span>
                </button>
              </motion.div>
            )}

            {companyActivity === 'scrap' && (visibleSections.scrap_inventory || visibleSections.scrap) && (
              <motion.div
                key="scrap_inventory"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('scrap_inventory');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'scrap_inventory' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Trash2 size={14} className="text-purple-400" />
                  <span className="text-xs">🧹 مخزون الخردة وميزان البسكول</span>
                </button>
              </motion.div>
            )}

            {companyActivity === 'scrap' && (visibleSections.scrap_transactions || visibleSections.scrap) && (
              <motion.div
                key="scrap_transactions"
                initial={{ opacity: 0, height: 0, x: 20 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setActiveTab('scrap_transactions');
                  }} 
                  className={`w-full flex items-center gap-3 px-5 py-2 text-right transition-colors ${
                    activeTab === 'scrap_transactions' ? 'text-white bg-blue-600/20 border-r-4 border-blue-500 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Scale size={14} className="text-purple-400" />
                  <span className="text-xs">⚖️ حركات ميزان البسكول</span>
                </button>
              </motion.div>
            )}


          </AnimatePresence>

          {/* Settings and system configuration is always visible to navigate back */}
          <div className="pt-4 border-t border-slate-700/40 mt-4 px-2 space-y-1.5">
            <button 
              onClick={() => setActiveTab('enterprise')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-right rounded-xl transition-all ${
                activeTab === 'enterprise' ? 'text-white bg-purple-600 font-bold shadow-md shadow-purple-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Globe size={14} className="text-purple-400" />
              <span className="text-xs font-bold">🏢 منصة المؤسسة الكبرى</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-right rounded-xl transition-all ${
                activeTab === 'settings' ? 'text-white bg-indigo-600 font-bold shadow-md shadow-indigo-600/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings size={14} className="animate-pulse" />
              <span className="text-xs font-bold">⚙️ الإعدادات ونظام ERP</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content framework */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header conforming to High Density styling with user profile switcher */}
        <header className={`h-14 flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-300 ${
          appTheme === 'neon' ? 'bg-[#13131A] border-b border-purple-900/30 text-white' : 'bg-slate-900 border-b border-slate-800 text-slate-100'
        }`}>
          <div className="flex items-center gap-3 w-1/3">
            <div className="relative w-full max-w-xs">
              <input 
                type="text" 
                placeholder="بحث سريع عن فاتورة، عميل او حالة..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className={`w-full border-none rounded-md py-1 px-3 text-xs focus:outline-none focus:ring-1 text-right pr-3 pl-3 transition-colors duration-300 ${
                  appTheme === 'neon' 
                    ? 'bg-white/5 text-white placeholder-slate-400 focus:ring-purple-500' 
                    : 'bg-slate-800 text-white placeholder-slate-400 focus:ring-blue-500'
                }`}
              />
            </div>
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} className={`text-[10px] hover:scale-105 transition-transform ${appTheme === 'neon' ? 'text-purple-300 hover:text-purple-100' : 'text-slate-400 hover:text-slate-600'}`}>
                تصفية ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Theme switcher */}
            <button 
              onClick={() => setAppTheme(appTheme === 'classic' ? 'neon' : 'classic')}
              className={`px-3 py-1 rounded-full relative transition-all duration-300 focus:outline-none cursor-pointer text-[10px] font-bold ${
                appTheme === 'neon' 
                  ? 'bg-purple-950/40 text-yellow-400 hover:bg-purple-900/50 hover:scale-105 border border-purple-500/30 shadow-[0_0_10px_rgba(108,43,217,0.3)]' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={appTheme === 'neon' ? "التحول للمظهر الكلاسيكي" : "التحول للمظهر النيون الفضائية"}
            >
              <span>{appTheme === 'neon' ? '🌙 نيون فضائي' : '☀️ كلاسيكي'}</span>
            </button>

            {/* Quick user selector to demonstrate roles */}
            <div className={`flex items-center gap-2 border-l pl-4 shrink-0 ${appTheme === 'neon' ? 'border-purple-900/30' : 'border-slate-200'}`}>
              <UserCheck size={13} className={appTheme === 'neon' ? 'text-purple-400' : 'text-slate-500'} />
              <div className="text-right">
                <label className="block text-[8px] font-bold text-slate-400 leading-none">تغيير دور المستخدم (ديمو)</label>
                <select 
                  value={userRole}
                  onChange={(e: any) => {
                    const newRole = e.target.value;
                    setUserRole(newRole);
                    if (newRole === 'sales') {
                      setActiveTab('invoices');
                    } else {
                      setActiveTab('dashboard');
                    }
                  }}
                  className={`bg-transparent border-none text-[10px] font-black focus:outline-none focus:ring-0 p-0 pr-0 cursor-pointer ${
                    appTheme === 'neon' ? 'text-purple-400' : 'text-blue-700'
                  }`}
                >
                  <option value="admin" className={appTheme === 'neon' ? 'bg-[#13131A] text-white' : ''}>أحمد حماد (صاحب الشركة / مدير عام)</option>
                  <option value="accountant" className={appTheme === 'neon' ? 'bg-[#13131A] text-white' : ''}>سارة الشمري (محاسب قانوني)</option>
                  <option value="sales" className={appTheme === 'neon' ? 'bg-[#13131A] text-white' : ''}>خالد الحربي (مبيعات فقط)</option>
                  <option value="viewer" className={appTheme === 'neon' ? 'bg-[#13131A] text-white' : ''}>محمد القحطاني (مشاهد فقط)</option>
                </select>
              </div>
            </div>

            {/* Notifications Menu */}
            <div className="relative mr-2 ml-1 shrink-0">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-1.5 rounded-full relative transition-colors focus:outline-none cursor-pointer ${
                  appTheme === 'neon' ? 'hover:bg-purple-900/20 text-purple-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
                id="notifications-bell"
              >
                <span className="text-base">🔔</span>
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full font-bold text-[8px] px-1 py-0.5 animate-pulse min-w-4 text-center leading-none">
                    {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute left-0 mt-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col text-right ${
                        appTheme === 'neon' ? 'bg-[#13131A] border border-purple-500/20 text-white' : 'bg-white border border-slate-100'
                      }`}
                      dir="rtl"
                    >
                      <div className={`p-3 border-b flex items-center justify-between ${
                        appTheme === 'neon' ? 'border-purple-500/10 bg-purple-950/20' : 'border-slate-100 bg-slate-50'
                      }`}>
                        <span className={`font-black text-xs ${appTheme === 'neon' ? 'text-purple-300' : 'text-slate-800'}`}>🔔 الإشعارات الواردة</span>
                        {unreadNotifsCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead} 
                            className={`text-[10px] font-black focus:outline-none cursor-pointer ${
                              appTheme === 'neon' ? 'text-purple-400 hover:text-purple-200' : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            تحديد الكل كمقروء
                          </button>
                        )}
                      </div>

                      <div className={`flex-1 overflow-y-auto max-h-64 divide-y ${appTheme === 'neon' ? 'divide-purple-950/40' : 'divide-slate-100'}`}>
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-[11px] font-bold">
                            لا توجد تنبيهات جديدة في الوقت الحالي.
                          </div>
                        ) : (
                          notifications.map((notif, index) => (
                            <div 
                              key={`${notif.user_notification_id || notif.id || 'notif'}-${index}`} 
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                if (notif.link) {
                                  const tabName = notif.link.replace('/', '').replace('.html', '');
                                  if (visibleSections[tabName]) {
                                    setActiveTab(tabName);
                                  }
                                  setShowNotifDropdown(false);
                                }
                              }}
                              className={`p-3 text-right cursor-pointer transition-colors flex gap-2.5 items-start ${
                                appTheme === 'neon' 
                                  ? !notif.is_read ? 'bg-purple-950/30 hover:bg-purple-900/20' : 'opacity-75 hover:bg-purple-900/10'
                                  : !notif.is_read ? 'bg-blue-50/40 hover:bg-slate-50' : 'opacity-75 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`text-base shrink-0 p-1 rounded-md ${appTheme === 'neon' ? 'bg-purple-950/40' : 'bg-slate-100'}`}>
                                {notif.icon || '📌'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`font-bold text-[11px] truncate ${appTheme === 'neon' ? 'text-white' : 'text-slate-900'}`}>{notif.title}</span>
                                  {!notif.is_read && (
                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shrink-0 animate-ping" />
                                  )}
                                </div>
                                <p className={`text-[10px] mt-0.5 leading-relaxed break-words ${appTheme === 'neon' ? 'text-slate-300' : 'text-slate-500'}`}>{notif.message}</p>
                                <span className="block text-[8px] text-slate-400 mt-1 font-mono">
                                  {new Date(notif.created_at).toLocaleString('ar-EG', { hour12: true })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className={`p-2 border-t text-center ${appTheme === 'neon' ? 'border-purple-500/10 bg-purple-950/20' : 'bg-slate-50 border-slate-100'}`}>
                        <button 
                          onClick={() => {
                            setActiveTab('settings');
                            setShowNotifDropdown(false);
                          }} 
                          className={`text-[10px] font-bold focus:outline-none cursor-pointer ${
                            appTheme === 'neon' ? 'text-purple-300 hover:text-purple-100' : 'text-slate-600 hover:text-blue-600'
                          }`}
                        >
                          ⚙️ تخصيص وقنوات التنبيهات
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Logged in User Profile & Actions */}
            <div className="flex items-center gap-3">
              <div className="text-right font-medium">
                <p className={`text-xs font-black transition-colors duration-300 ${appTheme === 'neon' ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser?.name || currentUser?.username || tenant?.name || 'مستخدم النظام'}
                </p>
                <p className={`text-[9px] leading-tight transition-colors duration-300 ${appTheme === 'neon' ? 'text-purple-300' : 'text-slate-400'}`}>
                  الدور: {
                    userRole === 'admin' ? 'مدير عام (Admin)' :
                    userRole === 'hr' ? 'الموارد البشرية (HR)' :
                    userRole === 'accountant' || userRole === 'finance' ? 'المحاسبة (Finance)' :
                    userRole === 'sales' ? 'المبيعات (Sales)' :
                    userRole === 'scrap' || userRole === 'scale' ? 'ميزان السكراب' :
                    userRole
                  }
                </p>
              </div>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-colors duration-300 ${
                appTheme === 'neon' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border border-purple-400/30' : 'bg-blue-600 text-white'
              }`}>
                {(currentUser?.name || userRole || 'A').charAt(0).toUpperCase()}
              </div>

              <button
                onClick={handleLogout}
                className="mr-1 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="تسجيل الخروج من النظام"
              >
                <LogOut size={13} className="rotate-180" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Tab routing with React Router */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {sysLoading ? (
            <div className="h-full flex flex-col justify-center items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold">جاري تحميل سجلات بروميت وقواعد البيانات لضمان دقتها...</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/scrap" replace />} />
              <Route path="/login" element={<LoginView />} />
              <Route path="/register" element={<RegisterView />} />
              <Route path="/dashboard" element={
                <AdvancedDashboardView />
              } />
              <Route path="/activity-setup" element={<ActivitySetup />} />
              <Route path="/activity-dashboard" element={<DashboardView />} />

              <Route path="/invoices" element={
                <InvoicesView 
                  invoices={filteredInvoices}
                  contacts={contacts}
                  products={products}
                  onCreateInvoice={handleCreateInvoice}
                  onUpdateInvoice={handleUpdateInvoice}
                  userRole={userRole}
                />
              } />

              <Route path="/expenses" element={
                <ExpensesView 
                  expenses={expenses}
                  contacts={contacts}
                  onCreateExpense={handleCreateExpense}
                  userRole={userRole}
                />
              } />

              <Route path="/inventory" element={
                <InventoryView 
                  products={products}
                  onCreateProduct={handleCreateProduct}
                  onUpdateProduct={handleUpdateProduct}
                  userRole={userRole}
                />
              } />

              <Route path="/reports" element={
                <ReportsView 
                  invoices={invoices}
                  expenses={expenses}
                  accounts={accounts}
                  tenant={tenant}
                />
              } />

              <Route path="/trial-balance" element={
                <TrialBalanceView />
              } />

              <Route path="/profit-loss" element={
                <ProfitLossView />
              } />

              <Route path="/balance-sheet" element={
                <BalanceSheetView />
              } />

              <Route path="/cash-flow" element={
                <CashFlowView />
              } />

              <Route path="/general-ledger" element={
                <GeneralLedgerView />
              } />

              <Route path="/tax-report" element={
                <TaxReportView />
              } />

              <Route path="/aging-receivable" element={
                <AgingReceivableView />
              } />

              <Route path="/aging-payable" element={
                <AgingPayableView />
              } />

              <Route path="/treasury" element={
                <TreasuryView userRole={userRole} currentUser={{ role: userRole }} />
              } />

              <Route path="/banking" element={
                <BankingAndCopilot 
                  transactions={transactions}
                  accounts={accounts}
                  onReconcileTransaction={handleReconcileTransaction}
                  onTriggerSync={handleTriggerSync}
                  isSyncing={isSyncing}
                  onCreateAccount={handleCreateAccount}
                  chatMessages={chatMessages}
                  onSendChatMessage={handleSendChatMessage}
                  isChatLoading={isChatLoading}
                  userRole={userRole}
                  onRefreshAll={loadAllData}
                />
              } />

              <Route path="/bank-reconciliation" element={
                <BankReconciliationView />
              } />

              <Route path="/crm" element={
                <CRMView 
                  contacts={contacts}
                  onRefreshContacts={loadAllData}
                  userRole={userRole}
                />
              } />

              <Route path="/contacts" element={
                <div className="space-y-4" dir="rtl text-xs">
                  {/* Contacts Header */}
                  <div className="flex justify-between items-center bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl">
                        <Users size={22} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <span>إدارة جهات الاتصال (العملاء والموردين)</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">سجل وحصر بيانات الشركاء الموردين والمشترين بالفاتورة لتتبع المطالبات المالية</p>
                      </div>
                    </div>
                    {userRole !== 'viewer' && (
                      <button 
                        onClick={() => setShowContactForm(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium p-2.5 px-4 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
                      >
                        <Plus size={15} />
                        إضافة جهة اتصال جديدة
                      </button>
                    )}
                  </div>

                  {/* Add Contact Modal Popup */}
                  <Modal
                    isOpen={showContactForm}
                    onClose={() => setShowContactForm(false)}
                    title="إضافة جهة اتصال جديدة (عميل / جهة بيع - مورد خردة / خامات)"
                    icon={<UserCheck size={18} className="text-blue-400" />}
                    headerColorClass="text-blue-400"
                    maxWidthClass="max-w-2xl"
                  >
                    <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم التجاري أو الشخصي <span className="text-rose-400">*</span></label>
                          <input 
                            type="text" 
                            required 
                            value={contactName} 
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="شركة الأحمدية للمقاولات"
                            className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع جهة الاتصال</label>
                          <select 
                            value={contactType} 
                            onChange={(e: any) => setContactType(e.target.value)}
                            className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="customer">عميل / جهة بيع (Customer / Buyer)</option>
                            <option value="vendor">مورد خردة / خامات (Supplier / Vendor)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
                          <input 
                            type="email" 
                            value={contactEmail} 
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="mail@corp.sa"
                            className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الهاتف</label>
                          <input 
                            type="text" 
                            value={contactPhone} 
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="+96650XXXXXX"
                            className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-right"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">العنوان المفوتر / للمقر الرئيسي</label>
                        <input 
                          type="text" 
                          value={contactAddress} 
                          onChange={(e) => setContactAddress(e.target.value)}
                          placeholder="طريق الملك فهد، برج نجد الرقمي، الرياض"
                          className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-3 border-t border-slate-700/80 pt-4 mt-6">
                        <button 
                          type="button" 
                          onClick={() => setShowContactForm(false)} 
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2.5 px-4 rounded-xl text-xs transition-colors"
                        >
                          إلغاء
                        </button>
                        <button 
                          type="submit" 
                          className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 px-5 rounded-xl text-xs font-bold shadow-md transition-colors"
                        >
                          حفظ جهة الاتصال
                        </button>
                      </div>
                    </form>
                  </Modal>

                  {/* Search and filter controls */}
                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md flex flex-col md:flex-row gap-3.5 items-center justify-between">
                    <div className="relative w-full md:w-80">
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 pointer-events-none">
                        <Search size={15} />
                      </span>
                      <input
                        type="text"
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم، الهاتف، البريد أو العنوان..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
                        <Filter size={14} className="text-slate-400" />
                        تصفية حسب النوع:
                      </div>
                      <select
                        value={contactTypeFilter}
                        onChange={(e: any) => setContactTypeFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700/80 rounded-xl p-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 min-w-[150px]"
                      >
                        <option value="all">الكل (عملاء جهات بيع وموردين خردة)</option>
                        <option value="customer">عميل / جهة بيع</option>
                        <option value="vendor">مورد خردة / خامات</option>
                      </select>
                      <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/50 px-3 py-1.5 rounded-xl font-mono shrink-0">
                        النتائج: {filteredContactsList.length} من {contacts.length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md p-4 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-900/60 text-slate-300 font-bold border-b border-slate-700/80">
                          <tr>
                            <th className="p-3">الاسم</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">البريد الإلكتروني</th>
                            <th className="p-3 text-center">رقم الهاتف</th>
                            <th className="p-3 text-left">الرصيد المدور (ج.م)</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-xs">
                          {filteredContactsList.map((c, idx) => (
                            <tr key={`contact-row-${c.id || idx}`} className="hover:bg-slate-700/30 transition-colors">
                              <td className="p-3 font-bold text-white">
                                {c.name}
                                <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{c.address || 'لا يوجد عنوان مسجل.'}</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  c.type === 'customer' 
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                  {c.type === 'customer' ? 'عميل / جهة بيع' : 'مورد خردة / خامات'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">{c.email || 'info@partner.sa'}</td>
                              <td className="p-3 text-center font-mono text-slate-400">{c.phone || '-'}</td>
                              <td className="p-3 text-left font-bold text-emerald-400 font-mono">{(c.balance).toLocaleString()} ج.م</td>
                              <td className="p-3 text-center">
                                {userRole !== 'viewer' && (
                                  <button 
                                    onClick={() => handleDeleteContact(c.id)}
                                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 px-2 rounded-lg cursor-pointer text-xs font-medium transition-colors"
                                  >
                                    حذف الجهة
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredContactsList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                لا توجد جهات اتصال تطابق خيارات البحث والتصفية المحددة.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              } />

              <Route path="/hr" element={
                <HRView 
                  onRefreshAll={loadAllData} 
                  currency="ج.م" 
                />
              } />

              <Route path="/employees" element={
                <EmployeesView />
              } />

              <Route path="/payroll" element={
                <PayrollView />
              } />

              <Route path="/projects" element={
                <ProjectsView userRole={userRole} />
              } />

              <Route path="/assets" element={
                <AssetsView userRole={userRole} contacts={contacts} />
              } />

              <Route path="/audit" element={
                <AuditView userRole={userRole} />
              } />

              <Route path="/modules" element={
                <ModulesView />
              } />

              <Route path="/scrap" element={
                <ScrapView />
              } />

              <Route path="/scrap_inventory" element={
                <ScrapView defaultTab="inventory" />
              } />

              <Route path="/scrap_transactions" element={
                <ScrapView defaultTab="transactions" />
              } />

              <Route path="/scrap_reports" element={
                <ScrapView defaultTab="dashboard" />
              } />

              <Route path="/accounts-payable" element={
                <AccountsPayableView />
              } />

              <Route path="/activity-reports" element={
                <ActivityReportsView />
              } />

              <Route path="/permissions" element={
                <PermissionsView />
              } />

              <Route path="/enterprise" element={
                <EnterpriseView />
              } />

              <Route path="/settings" element={
                <div className="space-y-6" dir="rtl">
                  
                  {/* The Gorgeous Central Settings View */}
                  <UnifiedSettingsView
                    visibleSections={visibleSections}
                    setVisibleSections={setVisibleSections}
                    currentLanguage={currentLanguage}
                    handleLanguageChange={handleLanguageChange}
                    loadAllData={loadAllData}
                    appTheme={appTheme}
                    setAppTheme={setAppTheme}
                  />







                  {/* Section 3: Notification Settings */}
                  <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">🔔 إعدادات قنوات التنبيهات والإشعارات الفورية</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">خصص قنوات استلام التنبيهات لكل نوع من الأحداث في النظام لدورك الحالي.</p>
                    </div>

                    {notifSettingsLoading ? (
                      <div className="py-4 text-center text-slate-400 font-bold">جاري تحميل إعدادات التنبيهات...</div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {notifSettings.map((setting: any, idx: number) => (
                            <div key={`${setting.id || setting.notification_type_id || 'setting'}-${idx}`} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/80 flex flex-col justify-between gap-3 font-sans">
                              <div className="flex items-start gap-2.5">
                                <span className="text-lg p-1 bg-slate-800 rounded-md shadow-xs shrink-0">{setting.icon || '📌'}</span>
                                <div className="text-right">
                                  <span className="font-bold text-slate-200 text-[11px] block">{setting.description || setting.name}</span>
                                  <span className="text-[9px] text-slate-400">اسم المفتاح: <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-400 font-mono text-[8px]">{setting.name}</code></span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 pt-1 border-t border-slate-700/80 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={!!setting.receive_in_app}
                                    onChange={(e) => handleToggleSetting(setting.notification_type_id, 'receive_in_app', e.target.checked)}
                                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-slate-300">إشعار بالتطبيق</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={!!setting.receive_by_email}
                                    onChange={(e) => handleToggleSetting(setting.notification_type_id, 'receive_by_email', e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-slate-600">إشعار بالبريد الإلكتروني</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-end pt-2">
                          <button 
                            onClick={handleSaveNotifSettings}
                            disabled={savingNotifSettings}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs cursor-pointer"
                          >
                            {savingNotifSettings ? 'جاري الحفظ...' : 'حفظ قنوات التنبيه الفورية'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              } />
            </Routes>
          )}

        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
