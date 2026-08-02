import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPermissionsTab } from '../components/UserPermissionsTab';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Building2, 
  Puzzle, 
  Globe, 
  Database, 
  Trash2, 
  Plus, 
  Check, 
  Save, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  CheckCircle,
  HelpCircle,
  Shield,
  Eye,
  Settings,
  AlertTriangle,
  FileSpreadsheet,
  Cpu,
  Info,
  Sliders,
  ChevronDown,
  UserCheck,
  Users,
  Lock,
  Unlock,
  Edit3,
  X,
  Scale,
  FileText,
  Package,
  DollarSign,
  BarChart2,
  Briefcase
} from 'lucide-react';
import { colors, typography } from '../theme';

interface ActivityType {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  default_modules: string[];
}

interface Module {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  is_core: boolean;
  is_enabled: boolean;
  is_active?: boolean;
}

interface CustomField {
  id: number;
  activity_code: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
}

interface UnifiedSettingsViewProps {
  visibleSections: Record<string, boolean>;
  setVisibleSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentLanguage: string;
  handleLanguageChange: (langCode: string) => Promise<void>;
  loadAllData: () => Promise<void>;
  appTheme: 'classic' | 'neon';
  setAppTheme: React.Dispatch<React.SetStateAction<'classic' | 'neon'>>;
}

export const UnifiedSettingsView: React.FC<UnifiedSettingsViewProps> = ({
  visibleSections,
  setVisibleSections,
  currentLanguage,
  handleLanguageChange,
  loadAllData,
  appTheme,
  setAppTheme
}) => {
  // Navigation for Unified Settings Tabs
  const navigate = useNavigate();
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'employee_tasks' | 'permissions' | 'modules' | 'fields' | 'appearance' | 'database'>('profile');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Employee tasks management states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [selectedUserForTasks, setSelectedUserForTasks] = useState<any | null>(null);
  const [editingTasksModalOpen, setEditingTasksModalOpen] = useState<boolean>(false);
  const [editingAssignedTasks, setEditingAssignedTasks] = useState<string[]>([]);
  const [editingCustomRole, setEditingCustomRole] = useState<string>('');
  const [savingUserTasks, setSavingUserTasks] = useState<boolean>(false);

  // New user modal
  const [addUserModalOpen, setAddUserModalOpen] = useState<boolean>(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'employee',
    custom_role_name: 'مسؤول موارد بشرية (HR)',
    assigned_tasks: ['hr']
  });
  const [creatingUser, setCreatingUser] = useState<boolean>(false);

  const loadCompanyUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading users for task assignments:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeSettingsTab === 'employee_tasks') {
      loadCompanyUsers();
    }
  }, [activeSettingsTab]);
  
  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [activities, setActivities] = useState<ActivityType[]>([
    { id: 1, code: 'retail', name: 'تجزئة ومبيعات مباشرة', icon: '🛒', description: 'مبيعات التجزئة وفواتير نقاط البيع والعملاء', color: '#6C2BD9', default_modules: ['dashboard', 'sales', 'inventory', 'reports'] },
    { id: 2, code: 'scrap', name: 'الخردة وإعادة التدوير', icon: '🧹', description: 'إدارة مخزون الخردة والسكراب والمصانع', color: '#10B981', default_modules: ['dashboard', 'scrap_inventory', 'scrap_operations', 'scrap_reports'] },
    { id: 3, code: 'construction', name: 'مقاولات وتطوير عقاري', icon: '🏗️', description: 'المستخلصات والمستودعات والمشاريع والعمالة', color: '#F59E0B', default_modules: ['dashboard', 'projects', 'inventory', 'contracts'] },
    { id: 4, code: 'transport', name: 'نقل وشحن', icon: '🚛', description: 'إدارة الأسطول والشحنات وبولصات الشحن', color: '#3B82F6', default_modules: ['dashboard', 'fleet', 'shipments', 'fuel'] },
    { id: 5, code: 'manufacturing', name: 'تصنيع', icon: '🏭', description: 'أوامر الإنتاج والمواد الخام والتصنيع', color: '#EC4899', default_modules: ['dashboard', 'production', 'raw_materials', 'maintenance'] },
    { id: 6, code: 'logistics', name: 'خدمات لوجستية', icon: '📦', description: 'التخزين والتوزيع وتقارير المخزون', color: '#8B5CF6', default_modules: ['dashboard', 'warehouses', 'distribution', 'inventory'] },
    { id: 7, code: 'import_export', name: 'استيراد وتصدير', icon: '🌍', description: 'الشحن الدولي والاعتمادات والجمارك', color: '#14B8A6', default_modules: ['dashboard', 'shipping', 'letters_credit', 'customs'] },
    { id: 8, code: 'it_services', name: 'تكنولوجيا معلومات', icon: '💻', description: 'تطوير البرمجيات والبنية التحتية والاشتراكات', color: '#06B6D4', default_modules: ['dashboard', 'dev_projects', 'infrastructure', 'subscriptions'] },
    { id: 9, code: 'agriculture', name: 'زراعة وثروة حيوانية', icon: '🌾', description: 'المحاصيل والثروة الحيوانية والتخزين الزراعي', color: '#84CC16', default_modules: ['dashboard', 'crops', 'livestock', 'agro_storage'] },
    { id: 10, code: 'maintenance', name: 'صيانة وتشغيل', icon: '🔧', description: 'عقود الصيانة وقطع الغيار وفرق الفنيين', color: '#6366F1', default_modules: ['dashboard', 'maintenance_contracts', 'spare_parts', 'technicians'] },
    { id: 11, code: 'hospitality', name: 'ضيافة وسياحة', icon: '🏨', description: 'إدارة الفنادق والحجوزات والنزلاء', color: '#F43F5E', default_modules: ['dashboard', 'hotel_rooms', 'reservations', 'guests'] },
    { id: 12, code: 'education', name: 'تعليم وتدريب', icon: '🎓', description: 'إدارة الطلاب والرسوم الكادر التعليمي', color: '#D97706', default_modules: ['dashboard', 'students', 'tuition', 'teachers'] },
    { id: 13, code: 'consulting', name: 'استشارات إدارية ومالية', icon: '📋', description: 'الدراسات والمشروعات والدعم الاستشاري', color: '#64748B', default_modules: ['dashboard', 'studies', 'consulting_projects', 'support'] }
  ]);
  const [settings, setSettings] = useState<any>({
    company_name: '',
    activity_code: 'retail',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    currency: 'EGP',
    language: 'ar',
    timezone: 'Africa/Cairo',
    fiscal_year_start: '2026-01-01',
    fiscal_year_end: '2026-12-31'
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // Custom Activity addition form
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    code: '',
    description: '',
    icon: '📌',
    color: '#6C2BD9',
    default_modules: ['dashboard']
  });

  // Custom Field Form state
  const [newField, setNewField] = useState({
    activity_code: '',
    entity_type: 'employee',
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false
  });

  // Saving states
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [savingModules, setSavingModules] = useState<boolean>(false);
  const [addingField, setAddingField] = useState<boolean>(false);
  const [savingActivity, setSavingActivity] = useState<boolean>(false);

  // Automatic backups states
  const [autoBackups, setAutoBackups] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const [loadingAutoBackups, setLoadingAutoBackups] = useState<boolean>(false);
  const [isGeneratingAutoBackup, setIsGeneratingAutoBackup] = useState<boolean>(false);

  // Cloud backup states
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<'s3' | 'gcs' | 'dropbox'>('s3');
  const [cloudBackups, setCloudBackups] = useState<{ id: string; name: string; size: number; provider: string; uploadedAt: string }[]>([]);
  const [loadingCloudBackups, setLoadingCloudBackups] = useState<boolean>(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<boolean>(false);
  
  // Sandbox verification states
  const [testReport, setTestReport] = useState<{ passed: boolean; checks: { name: string; status: '✅' | '❌'; details: string }[]; summary: string } | null>(null);
  const [isTestingRestore, setIsTestingRestore] = useState<boolean>(false);
  const [activeTestTarget, setActiveTestTarget] = useState<string | null>(null);

  const loadAutoBackups = async () => {
    setLoadingAutoBackups(true);
    try {
      const res = await fetch('/api/admin/auto-backups');
      if (res.ok) {
        const data = await res.json();
        setAutoBackups(data);
      }
    } catch (err) {
      console.error("Error loading auto backups:", err);
    } finally {
      setLoadingAutoBackups(false);
    }
  };

  const loadCloudBackups = async (provider: 's3' | 'gcs' | 'dropbox' = selectedCloudProvider) => {
    setLoadingCloudBackups(true);
    try {
      const res = await fetch(`/api/admin/cloud-backups?provider=${provider}`);
      if (res.ok) {
        const data = await res.json();
        setCloudBackups(data);
      }
    } catch (err) {
      console.error("Error loading cloud backups:", err);
    } finally {
      setLoadingCloudBackups(false);
    }
  };

  const uploadBackupFileToCloud = async (filename?: string) => {
    setIsUploadingToCloud(true);
    try {
      const res = await fetch('/api/admin/cloud-backups/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, provider: selectedCloudProvider })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ تم تشفير ورفع النسخة الاحتياطية بنجاح إلى ${selectedCloudProvider.toUpperCase()}!\nرابط الملف: ${data.fileUrl}`);
        await loadCloudBackups(selectedCloudProvider);
      } else {
        const errData = await res.json();
        alert(`❌ فشل الرفع السحابي: ${errData.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error("Error uploading to cloud:", err);
      alert("❌ حدث خطأ أثناء الرفع إلى السحاب.");
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  const restoreFromCloudBackup = async (fileId: string) => {
    if (!confirm("⚠️ تحذير: أنت على وشك استعادة البيانات بالكامل من النسخة الاحتياطية السحابية المشفرة. سيتم كتابة البيانات مجدداً. هل تود الاستمرار؟")) return;
    try {
      const res = await fetch('/api/admin/cloud-backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, provider: selectedCloudProvider })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.message}`);
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(`❌ فشل استعادة البيانات: ${errData.error}`);
      }
    } catch (err) {
      console.error("Error restoring from cloud:", err);
    }
  };

  const deleteCloudBackup = async (fileId: string) => {
    if (!confirm("هل تريد حذف النسخة الاحتياطية السحابية هذه نهائياً؟")) return;
    try {
      const res = await fetch('/api/admin/cloud-backups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, provider: selectedCloudProvider })
      });
      if (res.ok) {
        alert("✅ تم حذف الملف بنجاح.");
        await loadCloudBackups(selectedCloudProvider);
      }
    } catch (err) {
      console.error("Error deleting cloud file:", err);
    }
  };

  const runSandboxTest = async (target: { filename?: string; fileId?: string; isCloud: boolean }) => {
    setIsTestingRestore(true);
    setActiveTestTarget(target.fileId || target.filename || "direct");
    setTestReport(null);
    try {
      const res = await fetch('/api/admin/test-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: target.filename,
          fileId: target.fileId,
          isCloud: target.isCloud,
          provider: selectedCloudProvider
        })
      });
      const data = await res.json();
      setTestReport(data);
    } catch (err) {
      console.error("Error running test restore:", err);
      alert("❌ فشل تشغيل الفحص والتحقق البيئي.");
    } finally {
      setIsTestingRestore(false);
    }
  };

  const triggerAutoBackupManual = async () => {
    setIsGeneratingAutoBackup(true);
    try {
      const res = await fetch('/api/admin/auto-backups/trigger', { method: 'POST' });
      if (res.ok) {
        alert("✅ تم إنشاء نسخة احتياطية تلقائية ناجحة وحفظها على الخادم!");
        await loadAutoBackups();
      } else {
        alert("❌ فشل إنشاء نسخة احتياطية على الخادم");
      }
    } catch (err) {
      console.error("Error triggering backup:", err);
    } finally {
      setIsGeneratingAutoBackup(false);
    }
  };

  const deleteAutoBackupFile = async (filename: string) => {
    if (!confirm(`هل أنت متأكد من حذف النسخة الاحتياطية "${filename}" نهائياً من الخادم؟`)) return;
    try {
      const res = await fetch(`/api/admin/auto-backups/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        alert("✅ تم حذف الملف من الخادم بنجاح.");
        await loadAutoBackups();
      } else {
        alert("❌ فشل حذف الملف");
      }
    } catch (err) {
      console.error("Error deleting backup:", err);
    }
  };

  useEffect(() => {
    if (activeSettingsTab === 'database') {
      loadAutoBackups();
      loadCloudBackups(selectedCloudProvider);
    }
  }, [activeSettingsTab, selectedCloudProvider]);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [actRes, settingsRes, modsRes, fieldsRes] = await Promise.all([
        fetch('/api/activity-types').then(r => r.json()),
        fetch('/api/company-settings').then(r => r.json()),
        fetch('/api/company-settings/modules').then(r => r.json()),
        fetch('/api/custom-fields').then(r => r.json())
      ]);

      setActivities(Array.isArray(actRes) ? actRes : []);
      if (settingsRes && settingsRes.company_name !== undefined) {
        setSettings(settingsRes);
      }
      
      // Clean up module objects so is_enabled matches settings
      if (Array.isArray(modsRes)) {
        setModules(modsRes);
      }
      
      setCustomFields(Array.isArray(fieldsRes) ? fieldsRes : []);

      // Autofill fields default codes
      if (actRes && actRes.length > 0) {
        setNewField(prev => ({
          ...prev,
          activity_code: settingsRes?.activity_code || actRes[0].code
        }));
      }
    } catch (err) {
      console.error("Error loading unified settings data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '✅ تم حفظ البيانات والخصائص بنجاح!');
        await loadSettingsData();
        await loadAllData();
      } else {
        alert('❌ فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error(err);
      alert('❌ خطأ في الاتصال بالخادم');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSelectActivity = async (code: string) => {
    setSettings(prev => ({ ...prev, activity_code: code }));
    setSavingSettings(true);
    try {
      const res = await fetch('/api/company-settings/activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_code: code })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ تم تحويل نشاط الشركة إلى: ${getActivityName(code)} بنجاح!`);
        await loadSettingsData();
        await loadAllData();
      } else {
        alert('❌ فشل تحويل النشاط الرئيسي');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleModule = (mCode: string) => {
    setModules(prev => prev.map(m => {
      if (m.code === mCode) {
        return { ...m, is_enabled: !m.is_enabled };
      }
      return m;
    }));
  };

  const handleSaveModules = async () => {
    setSavingModules(true);
    try {
      const activeCodes = modules.filter(m => m.is_enabled || m.is_core).map(m => m.code);
      const res = await fetch('/api/company-settings/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_codes: activeCodes })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '✅ تم تحديث وتنشيط قائمة البرامج بنجاح!');
        const updatedVis: Record<string, boolean> = {};
        modules.forEach(m => {
          updatedVis[m.code] = activeCodes.includes(m.code) || m.is_core;
        });
        setVisibleSections(prev => ({ ...prev, ...updatedVis }));
        await loadAllData();
      } else {
        alert('❌ فشل حفظ تخصيصات الوحدات');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingModules(false);
    }
  };

  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.field_name || !newField.field_label) {
      alert("الرجاء إدخال كود الحقل والعنوان المعروض");
      return;
    }
    setAddingField(true);
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newField)
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ تم تفعيل وتسجيل الحقل المخصص بنجاح!');
        setCustomFields(prev => [...prev, data.customField]);
        setNewField(prev => ({
          ...prev,
          field_name: '',
          field_label: '',
          is_required: false
        }));
      } else {
        alert(data.error || '❌ فشل إضافة الحقل المخصص');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteCustomField = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحقل التشغيلي؟')) return;
    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCustomFields(prev => prev.filter(f => f.id !== id));
      } else {
        alert('❌ فشل حذف الحقل');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddActivityType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.name) {
      alert('❌ يرجى إدخال اسم النشاط الجديد');
      return;
    }
    const generatedCode = newActivity.code.trim()
      ? newActivity.code.trim().toLowerCase().replace(/\s+/g, '_')
      : `act_${Date.now()}`;

    setSavingActivity(true);
    try {
      const res = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newActivity, code: generatedCode })
      });
      if (res.ok) {
        setShowAddActivity(false);
        setNewActivity({
          name: '',
          code: '',
          description: '',
          icon: '💼',
          color: '#6C2BD9',
          default_modules: ['dashboard']
        });
        await loadSettingsData();
        // Automatically activate newly added activity
        await handleSelectActivity(generatedCode);
      } else {
        const err = await res.json();
        alert('❌ ' + (err.error || 'فشل إضافة النشاط'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingActivity(false);
    }
  };

  const getActivityName = (code: string) => {
    const map: Record<string, string> = {
      scrap: '🧹 الخردة وإعادة التدوير',
      transport: '🚛 نقل وشحن ودعم لوجستي',
      manufacturing: '🏭 تصنيع وإنتاج ميكانيكي',
      construction: '🏗️ مقاولات وتطوير عقاري',
      retail: '🛒 تجزئة ومبيعات مباشرة',
      hotel: '🏨 إدارة فنادق وضيافة',
      healthcare: '🏥 رعاية صحية ومستشفيات',
      education: '🎓 تعليم ومدارس',
      agriculture: '🌾 زراعة وتوريد أغذية'
    };
    return map[code] || code;
  };

  const isNeon = appTheme === 'neon';
  const textPrimaryClass = isNeon ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isNeon ? 'text-slate-400' : 'text-slate-500';
  const cardClass = isNeon ? 'card-glow p-6 text-white' : 'bg-white p-6 rounded-xl border border-slate-150 shadow-sm text-slate-800';
  const inputClass = isNeon 
    ? 'bg-[#0f0f15]/80 border-purple-900/30 text-white placeholder-slate-600 focus:border-purple-500/50'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24" dir="rtl">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold text-xs">⏳ جاري تحميل لوحة التحكم وإعدادات النظام الموحدة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Dynamic Header */}
      <div className={`${isNeon ? 'card-glow' : 'bg-white border border-slate-100 shadow-sm'} rounded-2xl p-6 transition-all`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl ${isNeon ? 'bg-purple-950/50 border border-purple-500/30 text-purple-400' : 'bg-slate-100 text-slate-700'}`}>
              <Settings size={22} className="animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h2 className={`text-base font-black ${textPrimaryClass}`}>⚙️ مركز التحكم وإعدادات النظام الموحد</h2>
              <p className={`text-[11px] ${textSecondaryClass} mt-0.5`}>
                مكان واحد مرن لتشكيل نشاط شركتك، وتعديل هيكل الـ ERP، وإدارة التفضيلات والخصوصية، وحماية وحفظ البيانات.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800/10 dark:bg-black/40 border border-slate-200/20 px-3.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-400">القطاع الفعال:</span>
            <span className="text-xs font-black text-indigo-400">{getActivityName(settings.activity_code)}</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Gorgeous Responsive Navigation Tabs Menu */}
        <div className="lg:col-span-3 space-y-1">
          {[
            { id: 'profile', title: '🏢 الشركة والنشاط الفعّال', desc: 'البيانات الأساسية ونوع العمل' },
            { id: 'employee_tasks', title: '👥 تخصيص مهام الموظفين والأدوار', desc: 'تحديد مهام وأقسام كل موظف بالشركة' },
            { id: 'permissions', title: '🛡️ تخصيص الصلاحيات الدقيقة', desc: 'تحديد صلاحيات المشاهدة والتعديل والحذف' },
            { id: 'modules', title: '🧩 تفعيل الأنظمة والوحدات', desc: 'تخصيص الهيكل والظهور' },
            { id: 'fields', title: '🏷️ الحقول والخصائص الإضافية', desc: 'تخصيص نماذج الإدخال' },
            { id: 'appearance', title: '🌐 لغة النظام والمظهر', desc: 'اللغات والسمة البصرية' },
            { id: 'database', title: '💾 صيانة وحفظ البيانات', desc: 'النسخ الاحتياطي وإعادة التعيين' }
          ].map((tab) => {
            const isTabActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`w-full text-right py-1.5 px-3 rounded-lg transition-all duration-150 border flex flex-col gap-0.5 cursor-pointer ${
                  isTabActive
                    ? isNeon
                      ? 'bg-purple-600/20 border-purple-500/80 text-white shadow-[0_0_8px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/10'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                    : isNeon
                      ? 'bg-[#111118]/60 border-purple-950/10 text-slate-400 hover:text-white hover:bg-purple-950/20'
                      : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10.5px] font-black">{tab.title}</span>
                <span className={`text-[8.5px] ${isTabActive ? (isNeon ? 'text-purple-300/90' : 'text-slate-100/95') : 'text-slate-400'}`}>{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Panel Content (Eliminating wide stretched visual blocks) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* USER PERMISSIONS TAB */}
          {activeSettingsTab === 'permissions' && (
            <UserPermissionsTab
              cardClass={cardClass}
              inputClass={inputClass}
              isNeon={isNeon}
            />
          )}

          {/* EMPLOYEE TASKS & ROLES ALLOCATION TAB */}
          {activeSettingsTab === 'employee_tasks' && (
            <div className="space-y-6">
              
              {/* Header Box */}
              <Card className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-100">👥 جدول تخصيص المهام والأدوار الأمنية لكادر الشركة</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        حدد المهام المتاحة لكل موظف (مثلاً: مسؤول HR يفتح ويستعمل قسم الموارد البشرية والرواتب فقط).
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setAddUserModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>إضافة موظف وتحديد مهامه ➕</span>
                  </button>
                </div>
              </Card>

              {/* Employees List Table */}
              <Card className={cardClass}>
                <div className="flex justify-between items-center mb-4 border-b border-slate-700/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-400" />
                    <h4 className="text-xs font-black text-slate-200">سجل حسابات الموظفين وتوزيع صلاحيات الأقسام</h4>
                  </div>
                  <button
                    onClick={loadCompanyUsers}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={loadingUsers ? "animate-spin" : ""} />
                    <span>تحديث القائمة</span>
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-400" size={24} />
                    <span>جاري جلب قائمة الموظفين وتوزيع المهام...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    لا يوجد حسابات موظفين مسجلة حالياً. قم بإضافة حساب موظف جديد وتخصيص أقسامه.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10.5px]">
                          <th className="pb-3 font-bold pr-2">الموظف / الحساب</th>
                          <th className="pb-3 font-bold">المسمى الوظيفي المخصص</th>
                          <th className="pb-3 font-bold">الأقسام والمهام المسموح بها</th>
                          <th className="pb-3 font-bold text-center">الحالة</th>
                          <th className="pb-3 font-bold text-center">الإجراءات والتحكم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {usersList.map((usr) => {
                          const userTasks: string[] = usr.assigned_tasks || [];
                          return (
                            <tr key={usr.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3.5 pr-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-black text-xs shrink-0">
                                    {(usr.name || usr.email || 'U')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-200 block text-[11.5px]">{usr.name || 'بدون اسم'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{usr.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[10.5px] font-bold">
                                  {usr.custom_role_name || usr.role_name || usr.role || 'موظف'}
                                </span>
                              </td>

                              <td className="py-3.5">
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {userTasks.includes('hr') && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9.5px] font-bold">
                                      👥 الموارد البشرية HR
                                    </span>
                                  )}
                                  {userTasks.includes('scrap') && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9.5px] font-bold">
                                      🧹 الخردة والميزان
                                    </span>
                                  )}
                                  {userTasks.includes('sales_invoices') && (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9.5px] font-bold">
                                      🧾 الفواتير والمبيعات
                                    </span>
                                  )}
                                  {userTasks.includes('inventory') && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9.5px] font-bold">
                                      📦 المستودعات
                                    </span>
                                  )}
                                  {userTasks.includes('expenses_finance') && (
                                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9.5px] font-bold">
                                      💵 المصروفات والخزينة
                                    </span>
                                  )}
                                  {userTasks.includes('reports') && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9.5px] font-bold">
                                      📊 التقارير المالية
                                    </span>
                                  )}
                                  {userTasks.includes('projects') && (
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9.5px] font-bold">
                                      🏗️ المشاريع
                                    </span>
                                  )}
                                  {userTasks.includes('assets') && (
                                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9.5px] font-bold">
                                      🏛️ الأصول والسيولة
                                    </span>
                                  )}
                                  {userTasks.includes('settings') && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[9.5px] font-bold">
                                      ⚙️ إعدادات النظام
                                    </span>
                                  )}
                                  {userTasks.length === 0 && (
                                    <span className="text-[10px] text-amber-400/90 italic">
                                      ⚠️ لم يتم تحديد مهام حتى الآن
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  usr.is_active 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}>
                                  {usr.is_active ? 'مفعل' : 'معطل'}
                                </span>
                              </td>

                              <td className="py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedUserForTasks(usr);
                                      setEditingAssignedTasks(usr.assigned_tasks || ['hr']);
                                      setEditingCustomRole(usr.custom_role_name || usr.role || 'موظف');
                                      setEditingTasksModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit3 size={12} />
                                    <span>تخصيص المهام ⚙️</span>
                                  </button>

                                  <button
                                    onClick={async () => {
                                      if (!confirm(`هل أنت متأكد من حذف حساب الموظف ${usr.name || usr.email}؟`)) return;
                                      try {
                                        const res = await fetch(`/api/users/${usr.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          loadCompanyUsers();
                                        } else {
                                          alert("❌ تعذر حذف الحساب");
                                        }
                                      } catch {
                                        alert("❌ حدث خطأ أثناء الحذف");
                                      }
                                    }}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                                    title="حذف حساب الموظف"
                                  >
                                    <Trash2 size={13} />
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
              </Card>

              {/* MODAL: CUSTOMIZE EMPLOYEE TASKS */}
              {editingTasksModalOpen && selectedUserForTasks && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 custom-scrollbar text-right text-xs">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                          <Sliders size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">تحديد وتعديل مهام الموظف: {selectedUserForTasks.name || selectedUserForTasks.email}</h3>
                          <p className="text-[10px] text-slate-400">قم باختيار المسمى الوظيفي والمهام/الأقسام المسموح له باستخدامها بالتطبيق</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingTasksModalOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Custom Role Title */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">المسمى الوظيفي المخصص للحساب:</label>
                      <Input
                        type="text"
                        value={editingCustomRole}
                        onChange={(e) => setEditingCustomRole(e.target.value)}
                        placeholder="مثال: مسؤول موارد بشرية HR / مسؤول خردة وموازين / محاسب فواتير"
                        className={inputClass}
                      />
                    </div>

                    {/* Quick Role Presets Buttons */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-2">⚡ تحديد سريع حسب القوالب الجاهزة:</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { label: '💼 مسؤول HR (الموارد البشرية)', roleTitle: 'مسؤول موارد بشرية HR', tasks: ['hr'] },
                          { label: '🚚 مسؤول الخردة والميزان', roleTitle: 'مسؤول خردة وموازين', tasks: ['scrap'] },
                          { label: '🧾 مسؤول مبيعات وفواتير', roleTitle: 'مسؤول مبيعات وفواتير', tasks: ['sales_invoices'] },
                          { label: '📦 أمين مخزن ولوجستيات', roleTitle: 'أمين مخزن', tasks: ['inventory', 'scrap'] },
                          { label: '💵 محاسب وقوائم مالية', roleTitle: 'محاسب مالي', tasks: ['sales_invoices', 'expenses_finance', 'reports'] },
                          { label: '👑 مدير عام / أدمن كامل', roleTitle: 'مدير عام بالنظام', tasks: ['hr', 'scrap', 'sales_invoices', 'inventory', 'expenses_finance', 'reports', 'projects', 'assets', 'audit', 'settings'] },
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setEditingAssignedTasks(preset.tasks);
                              setEditingCustomRole(preset.roleTitle);
                            }}
                            className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-indigo-600/20 hover:border-indigo-500/50 text-slate-200 text-right text-[10.5px] transition-all cursor-pointer font-bold flex flex-col gap-0.5"
                          >
                            <span>{preset.label}</span>
                            <span className="text-[9px] text-slate-400 font-normal">تفعيل تلقائي لقسم: {preset.tasks.join(', ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Checkboxes List */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-200">
                        🧩 اختر الأقسام والمهام التفصيلية المسموح بها للموظف:
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[
                          { id: 'hr', title: '👥 الموارد البشرية والرواتب (HR)', desc: 'إدارة ملفات الكادر، تسجيل الحضور والانصراف، مسيرات الرواتب والمستحقات' },
                          { id: 'scrap', title: '🧹 الخردة وميزان البسكول (Scrap & Weighbridge)', desc: 'كروت الميزان، حركات الخردة والسكراب، عينات الفرز، شحنات الخبث والعمولات' },
                          { id: 'sales_invoices', title: '🧾 الفواتير والمبيعات (Sales & Invoices)', desc: 'إصدار الفواتير الإلكترونية، إدارة بيانات العملاء، سندات القابض والعروض' },
                          { id: 'inventory', title: '📦 إدارة المستودعات والمخزون (Inventory)', desc: 'أصناف المنتجات، أرصدة المستودعات، حركات التوريد وأوامر الشراء' },
                          { id: 'expenses_finance', title: '💵 المصروفات والخزينة (Expenses & Treasury)', desc: 'تسجيل المصروفات التشغيلية، الخزينة المباشرة، المعاملات والقيود الحسابية' },
                          { id: 'reports', title: '📊 التقارير المالية والتحليلية (Reports)', desc: 'القوائم المالية، ميزان المراجعة، الأرباح والخسائر وتقارير الأداء' },
                          { id: 'projects', title: '🏗️ إدارة المشاريع والمقاولات (Projects)', desc: 'متابعة المستخلصات التنفيذية، العقود، وتكاليف المشروعات' },
                          { id: 'assets', title: '🏛️ الأصول والسيولة المالية (Assets)', desc: 'إدارة الأصول الثابتة بالشركة، حسابات البنوك، وإدارة السيولة' },
                          { id: 'audit', title: '🛡️ سجل الرقابة وتدقيق الحركات (Audit)', desc: 'تتبع كافة التعديلات وعمليات الإضافة والحذف الحية بالنظام' },
                          { id: 'settings', title: '⚙️ إعدادات النظام للشركة (Admin Settings)', desc: 'إدارة إعدادات المؤسسة، النسخ الاحتياطي، المظهر، وصلاحيات النظام' },
                        ].map((item) => {
                          const isChecked = editingAssignedTasks.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (isChecked) {
                                  setEditingAssignedTasks(editingAssignedTasks.filter(t => t !== item.id));
                                } else {
                                  setEditingAssignedTasks([...editingAssignedTasks, item.id]);
                                }
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isChecked 
                                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm' 
                                  : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
                              }`}>
                                {isChecked && <Check size={12} />}
                              </div>
                              <div>
                                <span className="font-bold block text-[11px]">{item.title}</span>
                                <span className="text-[9.5px] opacity-80 block mt-0.5">{item.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingTasksModalOpen(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>

                      <button
                        type="button"
                        disabled={savingUserTasks}
                        onClick={async () => {
                          setSavingUserTasks(true);
                          try {
                            const res = await fetch(`/api/users/${selectedUserForTasks.id}/tasks`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                assigned_tasks: editingAssignedTasks,
                                custom_role_name: editingCustomRole,
                                role: editingAssignedTasks.includes('settings') ? 'admin' : (editingAssignedTasks.includes('hr') ? 'hr' : 'employee')
                              })
                            });
                            if (res.ok) {
                              setEditingTasksModalOpen(false);
                              await loadCompanyUsers();
                              alert(`✅ تم تحديث مهام وأقسام الموظف ${selectedUserForTasks.name || selectedUserForTasks.email} بنجاح!`);
                            } else {
                              alert("❌ تعذر حفظ المهام المخصصة");
                            }
                          } catch {
                            alert("❌ فشل الاتصال بالسيرفر أثناء الحفظ");
                          } finally {
                            setSavingUserTasks(false);
                          }
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Save size={14} />
                        <span>{savingUserTasks ? 'جاري الحفظ...' : 'حفظ مهام الموظف ✅'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* MODAL: ADD NEW EMPLOYEE WITH TASKS */}
              {addUserModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 text-right text-xs">
                    
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-black text-white">إضافة موظف جديد وتحديد مهامه بالأقسام</h3>
                      <button
                        onClick={() => setAddUserModalOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setCreatingUser(true);
                        try {
                          const res = await fetch('/api/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newUserData)
                          });
                          if (res.ok) {
                            setAddUserModalOpen(false);
                            setNewUserData({ name: '', email: '', role: 'employee', custom_role_name: 'مسؤول موارد بشرية (HR)', assigned_tasks: ['hr'] });
                            await loadCompanyUsers();
                            alert("✅ تم إنشاء حساب الموظف وتحديد مهامه بنجاح!");
                          } else {
                            const err = await res.json();
                            alert(`❌ ${err.error || 'فشل إضافة الموظف'}`);
                          }
                        } catch {
                          alert("❌ حدث خطأ أثناء إضافة الموظف");
                        } finally {
                          setCreatingUser(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-[10.5px] text-slate-400 mb-1">اسم الموظف الثلاثي:</label>
                        <Input
                          type="text"
                          required
                          value={newUserData.name}
                          onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                          placeholder="علي عبد الله"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 mb-1">البريد الإلكتروني للدخول:</label>
                        <Input
                          type="email"
                          required
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          placeholder="hr.officer@company.com"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 mb-1">المسمى الوظيفي المخصص:</label>
                        <Input
                          type="text"
                          required
                          value={newUserData.custom_role_name}
                          onChange={(e) => setNewUserData({ ...newUserData, custom_role_name: e.target.value })}
                          placeholder="مسؤول موارد بشرية (HR)"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 mb-1">القسم المخصص للعمل فيه:</label>
                        <select
                          value={newUserData.assigned_tasks[0] || 'hr'}
                          onChange={(e) => {
                            const selected = e.target.value;
                            if (selected === 'all') {
                              setNewUserData({ ...newUserData, assigned_tasks: ['hr', 'scrap', 'sales_invoices', 'inventory', 'expenses_finance', 'reports', 'projects', 'assets', 'audit', 'settings'] });
                            } else {
                              setNewUserData({ ...newUserData, assigned_tasks: [selected] });
                            }
                          }}
                          className={`${inputClass} bg-slate-800 text-slate-200 cursor-pointer`}
                        >
                          <option value="hr">👥 قسم الموارد البشرية والرواتب (HR Only)</option>
                          <option value="scrap">🧹 قسم الخردة وميزان البسكول (Scrap Only)</option>
                          <option value="sales_invoices">🧾 قسم المبيعات والفواتير</option>
                          <option value="inventory">📦 قسم المستودعات والمخزون</option>
                          <option value="expenses_finance">💵 قسم المصروفات والخزينة</option>
                          <option value="all">👑 جميع الأقسام (مدير عام بالنظام)</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-800 pt-3 mt-4">
                        <button
                          type="button"
                          onClick={() => setAddUserModalOpen(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          إلغاء
                        </button>

                        <button
                          type="submit"
                          disabled={creatingUser}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>{creatingUser ? 'جاري الإنشاء...' : 'إضافة الموظف الحين ➕'}</span>
                        </button>
                      </div>
                    </form>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* PROFILE & ACTIVITY TAB */}
          {activeSettingsTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Company Info Form - Styled to take up compact grids instead of screen width */}
              <Card className={cardClass}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200/10 pb-3">
                  <Building2 size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-black">الملف التعريفي والخصائص المالية للشركة</h3>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">اسم المؤسسة / الشركة</label>
                      <Input
                        type="text"
                        required
                        value={settings.company_name}
                        onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                        placeholder="شركة ركاز الدولية"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">الرقم الضريبي الموحد</label>
                      <Input
                        type="text"
                        value={settings.tax_id || ''}
                        onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                        placeholder="300582914100003"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">البريد الإلكتروني التجاري</label>
                      <Input
                        type="email"
                        value={settings.email || ''}
                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                        placeholder="info@rikaz.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">رقم الهاتف الفعال</label>
                      <Input
                        type="text"
                        value={settings.phone || ''}
                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                        placeholder="+966501234567"
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">العنوان والمقر الرئيسي</label>
                      <Input
                        type="text"
                        value={settings.address || ''}
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        placeholder="برج الفيصلية، حي العليا، الرياض، المملكة العربية السعودية"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">العملة الرسمية بالدفاتر</label>
                      <select
                        value={settings.currency || 'EGP'}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className={`w-full p-2 text-xs rounded-lg border ${inputClass}`}
                      >
                        <option value="EGP">جنيه مصري (EGP)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">المنطقة الزمنية</label>
                      <select
                        value={settings.timezone || 'Africa/Cairo'}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className={`w-full p-2 text-xs rounded-lg border ${inputClass}`}
                      >
                        <option value="Africa/Cairo">توقيت القاهرة (UTC+2)</option>
                        <option value="Asia/Riyadh">توقيت الرياض (UTC+3)</option>
                        <option value="Asia/Dubai">توقيت دبي (UTC+4)</option>
                        <option value="Europe/London">توقيت لندن (UTC+0)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button 
                      type="submit" 
                      disabled={savingSettings}
                      className={`text-xs p-2.5 px-6 font-bold cursor-pointer rounded-xl ${
                        isNeon ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {savingSettings ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات التعريفية'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Text-based Industry & Activity Selector & Registration */}
              <Card className={cardClass}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-400" />
                    <div>
                      <h3 className="text-xs font-black">اختيار نشاط الشركة الرئيسي وتسجيل نشاط جديد</h3>
                      <p className={`text-[10px] ${isNeon ? 'text-slate-400' : 'text-slate-500'}`}>
                        اختر النشاط من قائمة المسميات المتاحة أدناه لتحديث الشاشات والوظائف فوراً
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setShowAddActivity(!showAddActivity)}
                    className={`p-1.5 px-3 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 border transition-all ${
                      isNeon 
                        ? 'bg-purple-950/60 border-purple-500/30 text-purple-200 hover:bg-purple-900' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    <Plus size={14} />
                    <span>تسجيل نشاط جديد بالاسم</span>
                  </button>
                </div>

                {/* Primary Activity Dropdown Select */}
                <div className="mb-6 p-4 rounded-xl border bg-slate-50/50 dark:bg-purple-950/20 dark:border-purple-500/20 space-y-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-purple-200">
                    قائمة مسميات الأنشطة التجارية والتشغيلية المتاحة:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={settings.activity_code || 'retail'}
                      onChange={(e) => handleSelectActivity(e.target.value)}
                      disabled={savingSettings}
                      className={`flex-1 p-2.5 text-xs font-bold rounded-xl border outline-none cursor-pointer transition-colors ${
                        isNeon
                          ? 'bg-[#151124] border-purple-500/40 text-white focus:border-purple-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                      }`}
                    >
                      {activities.map((act) => (
                        <option key={act.code} value={act.code}>
                          {act.name} {act.description ? `— (${act.description})` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleSelectActivity(settings.activity_code)}
                      disabled={savingSettings}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shrink-0 transition-colors shadow-sm"
                    >
                      {savingSettings ? '⏳ جاري التفعيل...' : 'تفعيل النشاط المختار'}
                    </button>
                  </div>
                </div>

                {/* Optional Custom Activity Registration Form */}
                {showAddActivity && (
                  <form onSubmit={handleAddActivityType} className="mb-6 p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-950/10 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                      <h4 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        تسجيل نشاط تجاري أو صناعي جديد بالاسم
                      </h4>
                      <button 
                        type="button"
                        onClick={() => setShowAddActivity(false)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        إغلاق
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          اسم النشاط بالكامل (المسمى التجاري) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          value={newActivity.name}
                          onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                          placeholder="مثال: صيدليات وأدوية، تجارة السيارات، مطاعم وتكلفة أغذية"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400 mb-1">وصف موجز لطبيعة العمل والتشغيل</label>
                        <Input
                          type="text"
                          value={newActivity.description}
                          onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                          placeholder="مثال: متابعة المبيعات اليومية، تاريخ الصلاحيات والموردين"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setShowAddActivity(false)}
                        className="p-1.5 px-4 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                      <Button 
                        type="submit" 
                        disabled={savingActivity || !newActivity.name}
                        className="p-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg"
                      >
                        {savingActivity ? '⏳ جاري التسجيل...' : 'حفظ وتسجيل النشاط وتفعيله فوراً'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Clean Table / List of Activity Names */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
                    جدول مسميات الأنشطة المتاحة وتسهيل الاختيار:
                  </h4>

                  <div className="divide-y divide-slate-100 dark:divide-purple-900/20 border rounded-xl overflow-hidden">
                    {activities.map((act) => {
                      const isSelected = settings.activity_code === act.code;
                      return (
                        <div
                          key={act.code}
                          onClick={() => handleSelectActivity(act.code)}
                          className={`p-3 text-right flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? isNeon
                                ? 'bg-purple-900/40 border-r-4 border-r-purple-400'
                                : 'bg-indigo-50/80 border-r-4 border-r-indigo-600'
                              : isNeon
                                ? 'hover:bg-purple-950/30'
                                : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-200/20 flex items-center justify-center text-sm shrink-0">
                              {act.icon || '💼'}
                            </div>
                            <div className="truncate">
                              <span className={`text-xs font-black ${isSelected ? 'text-indigo-600 dark:text-purple-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                {act.name}
                              </span>
                              {act.description && (
                                <p className={`text-[10px] truncate ${isNeon ? 'text-purple-300/70' : 'text-slate-500'}`}>
                                  {act.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {isSelected ? (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check size={12} />
                                النشاط المفعل حالياً
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectActivity(act.code);
                                }}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                  isNeon
                                    ? 'bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/30'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                              >
                                اختار وفعّل
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Notification Banner */}
                {settings.activity_code === 'scrap' && (
                  <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isNeon 
                      ? 'bg-purple-950/20 border-purple-500/30' 
                      : 'bg-[#1e1b4b]/20 border-indigo-200/50 text-indigo-900'
                  }`}>
                    <div className="space-y-1">
                      <h4 className={`text-xs font-black ${isNeon ? 'text-purple-300' : 'text-slate-800'}`}>🧹 نشاط الخردة وإعادة التدوير مفعل بالكامل!</h4>
                      <p className={`text-[10px] ${isNeon ? 'text-slate-400' : 'text-slate-600'}`}>تم تعديل القائمة الجانبية ووظائف النظام لتشمل مخزون وحركات وتقارير الخردة السكراب.</p>
                    </div>
                    <Button 
                      onClick={() => navigate('/scrap_inventory')}
                      className={`text-[10px] font-bold p-1.5 px-4 shrink-0 rounded-lg ${
                        isNeon ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse'
                      }`}
                    >
                      🚀 الانتقال إلى مخزون الخردة
                    </Button>
                  </div>
                )}
              </Card>

            </div>
          )}

          {/* MODULES MANAGEMENT TAB */}
          {activeSettingsTab === 'modules' && (
            <Card className={cardClass}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-200/10 pb-3">
                <div className="flex items-center gap-2">
                  <Puzzle size={16} className="text-purple-400" />
                  <h3 className="text-xs font-black">تنشيط البرامج وإدارة هيكل الوحدات البرمجية</h3>
                </div>
                <Button
                  onClick={handleSaveModules}
                  disabled={savingModules}
                  className={`text-[11px] p-1.5 px-4 font-bold cursor-pointer rounded-lg flex items-center gap-1.5 ${
                    isNeon ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Save size={12} />
                  <span>{savingModules ? '⏳ جاري الحفظ...' : 'حفظ وتعديل هيكل القائمة الجانبية'}</span>
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 mb-4 bg-purple-950/25 p-3 rounded-lg border border-purple-500/10">
                💡 تغيير حالة تفعيل الوحدات يؤدي لتعديل تبويبات القائمة الجانبية للمستخدمين فوراً. الوحدات الموسومة بـ <span className="text-yellow-400 font-bold">وحدة أساسية (Core)</span> غير قابلة للتعطيل لحماية استقرار الحسابات.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((mod) => {
                  const isEnabled = mod.is_enabled || mod.is_core;
                  return (
                    <div
                      key={mod.code}
                      onClick={() => !mod.is_core && handleToggleModule(mod.code)}
                      className={`p-4 rounded-xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                        mod.is_core ? 'opacity-85' : 'cursor-pointer'
                      } ${
                        isEnabled
                          ? 'border-purple-500/50 bg-purple-500/5'
                          : isNeon
                            ? 'bg-[#111118]/60 border-purple-950/20 text-slate-500'
                            : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl p-2 bg-slate-800/50 rounded-lg shrink-0">{mod.icon || '🧩'}</span>
                        <div className="space-y-1 text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{mod.name}</span>
                            {mod.is_core && (
                              <span className="bg-yellow-600/20 text-yellow-500 text-[8px] font-bold rounded p-0.5 px-1 border border-yellow-500/20">
                                أساسي Core
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Custom spring toggle switch */}
                      <div 
                        className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                          isEnabled ? 'bg-purple-600' : 'bg-slate-700'
                        }`}
                      >
                        <div 
                          className="w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                          style={{
                            marginRight: isEnabled ? 'auto' : '0',
                            marginLeft: isEnabled ? '0' : 'auto',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* CUSTOM OPERATIONAL FIELDS TAB */}
          {activeSettingsTab === 'fields' && (
            <div className="space-y-6">
              
              <Card className={cardClass}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200/10 pb-3">
                  <FileSpreadsheet size={16} className="text-green-400" />
                  <h3 className="text-xs font-black">تخصيص وإضافة حقول تشغيلية لقطاع {getActivityName(settings.activity_code)}</h3>
                </div>

                <form onSubmit={handleAddCustomField} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">الكيان / الشاشة المستهدفة</label>
                      <select
                        value={newField.entity_type}
                        onChange={(e) => setNewField({ ...newField, entity_type: e.target.value })}
                        className={`w-full p-2 text-xs rounded-lg border ${inputClass}`}
                      >
                        <option value="employee">بيانات الموظفين (Employee)</option>
                        <option value="invoice">الفواتير والمطالبات (Invoice)</option>
                        <option value="product">المخزون والسلع (Product)</option>
                        <option value="expense">المصروفات والسندات (Expense)</option>
                        <option value="project">إدارة المشاريع (Project)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">اسم الحقل بالإنجليزية (كود)</label>
                      <Input
                        type="text"
                        required
                        value={newField.field_name}
                        onChange={(e) => setNewField({ ...newField, field_name: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                        placeholder="مثال: license_plate"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">العنوان المعروض بالعربية</label>
                      <Input
                        type="text"
                        required
                        value={newField.field_label}
                        onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                        placeholder="مثال: رقم لوحة الشاحنة"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">نوع الحقل وبيانات الإدخال</label>
                      <select
                        value={newField.field_type}
                        onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                        className={`w-full p-2 text-xs rounded-lg border ${inputClass}`}
                      >
                        <option value="text">نص عادي (Text)</option>
                        <option value="number">رقم عددي (Number)</option>
                        <option value="date">تاريخ رزنامة (Date)</option>
                        <option value="boolean">نعم / لا (Yes/No Toggle)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={newField.is_required}
                        onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                        className="rounded accent-indigo-600 bg-slate-900"
                      />
                      <span>جعل تعبئة هذا الحقل إلزامية لحفظ المستند / الموظف</span>
                    </label>

                    <Button
                      type="submit"
                      disabled={addingField}
                      className="text-xs p-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      {addingField ? '⏳ جاري الحفظ...' : '➕ تنشيط وتسجيل الحقل'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* List of custom fields */}
              <Card className={cardClass}>
                <h3 className="text-xs font-black mb-3">سجل الحقول التشغيلية المخصصة في هذا القطاع</h3>
                
                {customFields.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-[11px]">
                    لا توجد حقول تشغيلية مخصصة حتى الآن. أضف أول حقل لمطابقة نماذج الإدخال بخصائص شاحناتك أو ماكيناتك!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-800/40 text-slate-400 border-b border-slate-700/50">
                        <tr>
                          <th className="p-2.5">الكيان / المستهدف</th>
                          <th className="p-2.5">العنوان المعروض</th>
                          <th className="p-2.5">النوع البرمجي</th>
                          <th className="p-2.5">الحالة الإلزامية</th>
                          <th className="p-2.5 text-center">إجراءات الحذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-[11px]">
                        {customFields.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-850/20">
                            <td className="p-2.5 text-white font-mono">{f.entity_type === 'employee' ? 'الموظف HR' : f.entity_type === 'invoice' ? 'الفاتورة' : f.entity_type === 'product' ? 'السلعة / المنتج' : f.entity_type === 'expense' ? 'سند الصرف' : f.entity_type}</td>
                            <td className="p-2.5 text-white font-bold">{f.field_label}</td>
                            <td className="p-2.5 text-slate-400 font-mono">{f.field_type === 'text' ? 'نص عادي' : f.field_type === 'number' ? 'رقم' : f.field_type === 'date' ? 'تاريخ' : 'مفتاح منطقي'}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] ${f.is_required ? 'bg-red-950/40 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                {f.is_required ? 'إلزامي' : 'اختياري'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteCustomField(f.id)}
                                className="text-red-400 hover:text-red-500 font-bold text-[10px] cursor-pointer"
                              >
                                <Trash2 size={12} className="inline-block" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            </div>
          )}

          {/* LANGUAGE & APPEARANCE TAB */}
          {activeSettingsTab === 'appearance' && (
            <div className="space-y-6">
              
              {/* Language customizer */}
              <Card className={cardClass}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200/10 pb-3">
                  <Globe size={16} className="text-blue-400" />
                  <h3 className="text-xs font-black">لغة واجهة المستخدم والنظام (System Language)</h3>
                </div>

                <div className="space-y-4">
                  <p className={`text-[10px] ${isNeon ? 'text-slate-400' : 'text-slate-500'}`}>
                    اختر اللغة المفضلة لتعديل واجهات عرض النظام بالكامل ومطابقة اتجاه النصوص التلقائي (RTL / LTR) لكل لغة:
                  </p>
                  
                  <div className="relative w-full max-w-sm">
                    {/* Dropdown Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all duration-200 cursor-pointer ${
                        isNeon
                          ? 'bg-[#111118]/85 border-purple-950/40 text-slate-100 hover:border-purple-800/60 hover:bg-purple-950/25'
                          : 'bg-white border-slate-250 hover:border-slate-350 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800/10 border border-slate-200/5 text-xl shrink-0">
                          {(() => {
                            const found = [
                              { code: 'ar', flag: '🇸🇦' },
                              { code: 'en', flag: '🇺🇸' },
                              { code: 'fr', flag: '🇫🇷' },
                              { code: 'tr', flag: '🇹🇷' },
                              { code: 'es', flag: '🇪🇸' }
                            ].find(l => l.code === currentLanguage);
                            return found ? found.flag : '🇸🇦';
                          })()}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-black">
                            {(() => {
                              const found = [
                                { code: 'ar', native: 'العربية' },
                                { code: 'en', native: 'English' },
                                { code: 'fr', native: 'Français' },
                                { code: 'tr', native: 'Türkçe' },
                                { code: 'es', native: 'Español' }
                              ].find(l => l.code === currentLanguage);
                              return found ? found.native : 'العربية';
                            })()}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {(() => {
                              const found = [
                                { code: 'ar', name: 'العربية' },
                                { code: 'en', name: 'English' },
                                { code: 'fr', name: 'Français' },
                                { code: 'tr', name: 'Türkçe' },
                                { code: 'es', name: 'Español' }
                              ].find(l => l.code === currentLanguage);
                              return found ? found.name : 'Arabic';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Items Menu */}
                    {isLangDropdownOpen && (
                      <>
                        {/* Overlay to close the dropdown */}
                        <div 
                          className="fixed inset-0 z-10 cursor-default" 
                          onClick={() => setIsLangDropdownOpen(false)}
                        />
                        
                        <div className={`absolute right-0 left-0 mt-1.5 rounded-xl border shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto divide-y transition-all ${
                          isNeon
                            ? 'bg-[#0b0b10] border-purple-950/80 divide-purple-950/20 shadow-[0_4px_25px_rgba(0,0,0,0.6)]'
                            : 'bg-white border-slate-200 divide-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
                        }`}>
                          {[
                            { code: 'ar', name: 'العربية', native: 'العربية', flag: '🇸🇦', desc: 'الواجهة العربية الرسمية للنظام.' },
                            { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', desc: 'Standard Global English interface.' },
                            { code: 'fr', name: 'Français', native: 'Français', flag: '🇫🇷', desc: 'Édition française internationale.' },
                            { code: 'tr', name: 'Türkçe', native: 'Türkçe', flag: '🇹🇷', desc: 'Bölgesel Türkçe raporlama arayüzü.' },
                            { code: 'es', name: 'Español', native: 'Español', flag: '🇪🇸', desc: 'Traducción integral en español.' }
                          ].map((lang) => {
                            const isSelected = currentLanguage === lang.code;
                            return (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  handleLanguageChange(lang.code);
                                  setIsLangDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 text-right transition-colors cursor-pointer text-xs ${
                                  isSelected
                                    ? isNeon
                                      ? 'bg-blue-600/20 text-blue-400 font-bold'
                                      : 'bg-blue-50 text-blue-700 font-bold'
                                    : isNeon
                                      ? 'text-slate-300 hover:bg-purple-950/30 hover:text-white'
                                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg leading-none shrink-0">{lang.flag}</span>
                                  <div className="flex flex-col text-right">
                                    <span className="font-bold text-[11px]">{lang.native}</span>
                                    <span className="text-[8.5px] text-slate-400">{lang.name} - {lang.desc}</span>
                                  </div>
                                </div>
                                {isSelected && <Check size={11} className={isNeon ? 'text-blue-400' : 'text-blue-600'} />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Theme Customizer */}
              <Card className={cardClass}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200/10 pb-3">
                  <Sliders size={16} className="text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black">المظهر البصري وسلوك العرض الشاشي (App Themes)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'neon', name: 'فضاء النيون والجرأة (Futuristic Space Neon)', desc: 'قماش داكن ملكي عالي التباين بظلال الأرجواني المتوهج، يحمي العينين ويبرز المؤشرات.', accent: '#8b5cf6', flag: '🔮' },
                    { id: 'classic', name: 'الكلاسيكي السحابي (Cloud Classic)', desc: 'نمط إداري أنيق وعملي بنقاء عالي ونسب تباين بيضاء ناصعة لمزيد من التركيز المكتبي.', accent: '#2563eb', flag: '🏢' }
                  ].map((themeOpt) => {
                    const isSelected = appTheme === themeOpt.id;
                    return (
                      <button
                        key={themeOpt.id}
                        onClick={() => setAppTheme(themeOpt.id as any)}
                        className={`flex flex-col text-right p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                            : isNeon
                              ? 'bg-slate-900/40 border-purple-950/20 text-slate-400 hover:border-purple-800/40'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{themeOpt.flag}</span>
                            <span className="font-bold text-xs text-white">{themeOpt.name}</span>
                          </div>
                          {isSelected && (
                            <span className="bg-purple-600 text-white text-[8px] font-black rounded-full p-0.5 px-1.5 animate-pulse">
                              مفعّل الآن
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {themeOpt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>

            </div>
          )}

          {/* BACKUPS & DATABASE OPERATIONS TAB */}
          {activeSettingsTab === 'database' && (
            <div className="space-y-6">
              
              <Card className={cardClass}>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200/10 pb-3">
                  <Database size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-black">حفظ وصيانة قاعدة البيانات وسجلات التدقيق المالي</h3>
                </div>

                <div className="space-y-4">
                  {/* Download Backup */}
                  <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold text-xs text-indigo-300 block">تحميل نسخة احتياطية آمنة (Backup)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">قم بتحميل نسخة رقمية من قاعدة البيانات بصيغة JSON على جهازك لتأمين أرقامك ضد التلف.</p>
                    </div>
                    <a 
                      href="/api/admin/backup" 
                      target="_blank"
                      rel="noopener noreferrer"
                      download="promet-erp-backup.json"
                      className="p-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                    >
                      تنزيل نسخة JSON
                    </a>
                  </div>

                  {/* Export Source Code ZIP */}
                  <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold text-xs text-emerald-300 block">تصدير الكود المصدري كاملاً (ZIP)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">تحميل كامل ملفات نظام بروميت المحاسبي في ملف واحد مضغوط لتشغيله محلياً أو رفعه للخادم.</p>
                    </div>
                    <a 
                      href="/api/export-zip" 
                      target="_blank"
                      rel="noopener noreferrer"
                      download="promet-erp-source.zip"
                      className="p-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <span>📦</span>
                      <span>تنزيل كامل الكود ZIP</span>
                    </a>
                  </div>

                  {/* Restore Backup file */}
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/30">
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-200 block">استعادة قاعدة بيانات من ملف محلي</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">اختر ملف نسخة احتياطية JSON المحفوظ مسبقاً لاستبدال ودمج البيانات الفعالة على هذا الخادم.</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!confirm("تحذير: هل أنت متأكد من استبدال كامل قاعدة البيانات الحالية بالملف الجديد؟")) return;
                        
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const text = event.target?.result as string;
                            const parsed = JSON.parse(text);
                            const res = await fetch('/api/admin/restore-backup', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(parsed)
                            });
                            if (!res.ok) throw new Error("فشل الخادم في معالجة واستعادة الملف");
                            alert("✅ تمت استعادة النسخة الاحتياطية بنجاح ومطابقة الدفاتر.");
                            await loadAllData();
                            await loadSettingsData();
                          } catch (err: any) {
                            alert(`❌ خطأ أثناء رفع النسخة: ${err.message}`);
                          }
                        };
                        reader.readAsText(file);
                      }}
                      className="mt-3 block w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                    />
                  </div>

                  {/* Panel for Sandbox Verification Test Results */}
                  {testReport && (
                    <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-4 text-right animate-fadeIn">
                      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${testReport.passed ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <h4 className="font-bold text-xs text-indigo-200">تقرير فحص سلامة وموثوقية النسخة الاحتياطية (Sandbox Verification)</h4>
                        </div>
                        <button 
                          onClick={() => setTestReport(null)}
                          className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          إغلاق ×
                        </button>
                      </div>

                      <div className="space-y-2">
                        {testReport.checks.map((check, i) => (
                          <div key={`check-${i}`} className="flex justify-between items-center p-2 rounded bg-slate-900/40 border border-slate-800 text-[10px]">
                            <span className="text-slate-400">{check.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300">{check.details}</span>
                              <span className="text-xs">{check.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={`p-3 rounded-lg text-xs font-bold text-center mt-3 ${testReport.passed ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-300' : 'bg-red-950/40 border border-red-500/20 text-red-300'}`}>
                        {testReport.summary}
                      </div>
                    </div>
                  )}

                  {/* Automated Backups Section */}
                  <div className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700/50 pb-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="font-bold text-xs text-indigo-300">نظام النسخ الاحتياطي التلقائي المحسّن (Auto-Backups)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          يقوم النظام تلقائياً بإنشاء نسخة احتياطية كل 24 ساعة ويحتفظ بآخر 10 نسخ لحماية بياناتك من أي فقدان طارئ.
                        </p>
                      </div>
                      <button
                        onClick={triggerAutoBackupManual}
                        disabled={isGeneratingAutoBackup}
                        className="p-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                      >
                        {isGeneratingAutoBackup ? "جاري إنشاء النسخة..." : "إنشاء نسخة احتياطية الآن 💾"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-300">النسخ الاحتياطية المحفوظة تلقائياً على الخادم:</h4>
                      
                      {loadingAutoBackups ? (
                        <p className="text-[10px] text-slate-400 italic">جاري تحميل النسخ الاحتياطية...</p>
                      ) : autoBackups.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">لا توجد نسخ احتياطية تلقائية على الخادم بعد.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {autoBackups.map((bk, idx) => (
                            <div key={`auto-bk-${bk.filename || idx}`} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between items-center text-[10px] hover:border-slate-700 transition-colors">
                              <div className="text-right">
                                <span className="font-mono text-slate-200 block text-[11px]" dir="ltr">{bk.filename}</span>
                                <span className="text-slate-400 block mt-0.5">
                                  التاريخ: {new Date(bk.createdAt).toLocaleString('ar-EG', { hour12: true })} | الحجم: {(bk.size / 1024).toFixed(2)} KB
                                </span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => runSandboxTest({ filename: bk.filename, isCloud: false })}
                                  disabled={isTestingRestore}
                                  className="px-2 py-1 bg-violet-950/40 hover:bg-violet-900/60 text-violet-300 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  {isTestingRestore && activeTestTarget === bk.filename ? "جاري الفحص..." : "فحص 🔍"}
                                </button>
                                <button
                                  onClick={() => uploadBackupFileToCloud(bk.filename)}
                                  disabled={isUploadingToCloud}
                                  className="px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  رفع سحابي ☁️
                                </button>
                                <a
                                  href={`/api/admin/auto-backups/download/${bk.filename}`}
                                  download={bk.filename}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded transition-colors text-[10px]"
                                >
                                  تحميل 📥
                                </a>
                                <button
                                  onClick={() => deleteAutoBackupFile(bk.filename)}
                                  className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  حذف 🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cloud Backup & Decrypted Sync Section */}
                  <div className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
                    <div className="border-b border-slate-700/50 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="font-bold text-xs text-blue-300">مزامنة التخزين السحابي وتشفير البيانات (AES-256)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          قم بحفظ النسخ الاحتياطية مشفرة بالكامل بشكل سحابي على AWS S3 أو Google Cloud أو Dropbox مع نظام إشعارات بريدية فوري.
                        </p>
                      </div>
                      <button
                        onClick={() => uploadBackupFileToCloud()}
                        disabled={isUploadingToCloud}
                        className="p-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                      >
                        {isUploadingToCloud ? "جاري التشفير والرفع..." : "رفع نسخة مشفرة فورية للسحاب ☁️"}
                      </button>
                    </div>

                    {/* Providers Tab Selector */}
                    <div className="flex gap-2 border-b border-slate-800 pb-2.5">
                      {(['s3', 'gcs', 'dropbox'] as const).map((prov) => (
                        <button
                          key={prov}
                          onClick={() => {
                            setSelectedCloudProvider(prov);
                            loadCloudBackups(prov);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedCloudProvider === prov
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                              : 'bg-slate-950/40 text-slate-400 border border-transparent hover:border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {prov === 's3' && 'AWS S3 🪣'}
                          {prov === 'gcs' && 'Google Cloud ☁️'}
                          {prov === 'dropbox' && 'Dropbox 📦'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-300">الملفات السحابية المخزنة والمشفرة حالياً:</h4>
                      
                      {loadingCloudBackups ? (
                        <p className="text-[10px] text-slate-400 italic">جاري جلب الملفات السحابية...</p>
                      ) : cloudBackups.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">لا توجد نسخ احتياطية مرفوعة على هذا المزود حتى الآن.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {cloudBackups.map((cb, idx) => (
                            <div key={`cloud-bk-${cb.id || idx}`} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between items-center text-[10px] hover:border-slate-700 transition-colors">
                              <div className="text-right">
                                <span className="font-mono text-slate-200 block text-[11px]" dir="ltr">{cb.name}</span>
                                <span className="text-slate-400 block mt-0.5">
                                  الرفع: {new Date(cb.uploadedAt).toLocaleString('ar-EG', { hour12: true })} | الحجم: {(cb.size / 1024).toFixed(2)} KB | التشفير: <span className="text-emerald-400">AES-256</span>
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => runSandboxTest({ fileId: cb.id, isCloud: true })}
                                  disabled={isTestingRestore}
                                  className="px-2.5 py-1 bg-violet-950/40 hover:bg-violet-900/60 text-violet-300 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  {isTestingRestore && activeTestTarget === cb.id ? "جاري الفحص..." : "فحص جودة 🔍"}
                                </button>
                                <button
                                  onClick={() => restoreFromCloudBackup(cb.id)}
                                  className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  استعادة آمنة 🔄
                                </button>
                                <button
                                  onClick={() => deleteCloudBackup(cb.id)}
                                  className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold rounded transition-colors text-[10px] cursor-pointer"
                                >
                                  حذف 🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
