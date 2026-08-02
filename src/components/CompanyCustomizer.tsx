import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Cpu, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Check, 
  Save, 
  Layers, 
  Compass, 
  Info,
  ChevronRight,
  Settings
} from 'lucide-react';

interface CompanyCustomizerProps {
  visibleSections: Record<string, boolean>;
  setVisibleSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const CompanyCustomizer: React.FC<CompanyCustomizerProps> = ({ 
  visibleSections, 
  setVisibleSections 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'fields'>('info');
  const [loading, setLoading] = useState<boolean>(true);
  
  // Data States
  const [activities, setActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    company_name: '',
    activity_code: '',
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
  const [modules, setModules] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  
  // Field Form States
  const [newField, setNewField] = useState({
    activity_code: '',
    entity_type: '',
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false
  });

  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [savingModules, setSavingModules] = useState<boolean>(false);
  const [addingField, setAddingField] = useState<boolean>(false);

  useEffect(() => {
    loadAllCustomizerData();
  }, []);

  const loadAllCustomizerData = async () => {
    setLoading(true);
    try {
      const [actRes, settingsRes, modsRes, fieldsRes] = await Promise.all([
        fetch('/api/activity-types').then(r => r.json()),
        fetch('/api/company-settings').then(r => r.json()),
        fetch('/api/company-settings/modules').then(r => r.json()),
        fetch('/api/custom-fields').then(r => r.json())
      ]);

      setActivities(actRes || []);
      if (settingsRes && settingsRes.company_name) {
        setSettings(settingsRes);
      }
      setModules(modsRes || []);
      setCustomFields(fieldsRes || []);
      
      // Select first activity type and first entity type as default for custom fields form
      if (actRes && actRes.length > 0) {
        setNewField(prev => ({
          ...prev,
          activity_code: settingsRes?.activity_code || actRes[0].code,
          entity_type: 'employee'
        }));
      }
    } catch (err) {
      console.error("Error loading customizer data:", err);
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
        alert(data.message || '✅ تم حفظ إعدادات الشركة وتنشيط الوحدات بنجاح!');
        // Reload all data to sync state and update modules list
        await loadAllCustomizerData();
        
        // Dynamic reload of sidebar sections based on newly set default modules
        if (data.settings && data.settings.activity_code) {
          const matchedAct = activities.find(a => a.code === data.settings.activity_code);
          if (matchedAct && matchedAct.default_modules) {
            const newVis: Record<string, boolean> = {};
            modules.forEach(m => {
              newVis[m.code] = matchedAct.default_modules.includes(m.code) || m.is_core;
            });
            setVisibleSections(prev => ({ ...prev, ...newVis }));
          }
        }
      } else {
        alert('❌ فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء الاتصال بالخادم');
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
        alert(data.message || '✅ تم تنشيط تخصيصات الوحدات البرمجية وتعديل القائمة بنجاح!');
        const updatedVis: Record<string, boolean> = {};
        modules.forEach(m => {
          updatedVis[m.code] = activeCodes.includes(m.code) || m.is_core;
        });
        setVisibleSections(prev => ({ ...prev, ...updatedVis }));
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
      alert("الرجاء إدخال اسم الحقل البرمجي والعنوان المعروض");
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
        alert('✅ تم تسجيل وتفعيل الحقل المخصص بنجاح!');
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
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الحقل المخصص؟ سيتم فقده نهائياً من سجلات الشاشات.')) return;
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

  if (loading) {
    return (
      <div className="bg-white/5 border border-purple-900/30 rounded-xl p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>جاري تحميل هيكل ERP وتخصيصات النشاط...</span>
      </div>
    );
  }

  const selectedActivityObj = activities.find(a => a.code === settings.activity_code);

  return (
    <div className="bg-[#13131A] border border-purple-950/40 rounded-xl overflow-hidden shadow-2xl font-sans" dir="rtl">
      {/* Tab bar header */}
      <div className="bg-black/40 border-b border-purple-900/20 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-950/50 border border-purple-500/20 rounded-lg text-purple-400">
            <Settings size={18} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">تخصيص الهيكل والأنشطة (ERP Blueprint)</h3>
            <p className="text-[10px] text-slate-400">محرك الهضبة ERP للشركات متعددة الأنشطة لتخصيص الشاشات والوحدات والحقول الديناميكية.</p>
          </div>
        </div>

        <div className="flex gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'info' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 size={13} />
            نشاط الشركة والبيانات
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'modules' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            الوحدات والأنظمة المفعلة
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fields' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet size={13} />
            الحقول المخصصة ({customFields.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* TAB 1: COMPANY INFO & ACTIVITY TYPE */}
        {activeTab === 'info' && (
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div className="bg-purple-950/20 border border-purple-500/10 p-4 rounded-xl flex items-start gap-3">
              <Compass className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white text-[11px] block">محرك الأنشطة المتعددة والوحدات الافتراضية</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  عند تحديد نشاط معين للشركة (مثال: تصنيع، مقاولات، نقل وشحن)، سيقوم النظام تلقائياً بتحديد قائمة الوحدات البرمجية الملائمة له (كالشحنات، خطوط الإنتاج، إدارة المعدات والآلات).
                </p>
              </div>
            </div>

            {/* Grid for settings fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">اسم المنشأة / الشركة</label>
                <input
                  type="text"
                  required
                  value={settings.company_name}
                  onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="شركة الهضبة للحلول اللوجستية"
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-right"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">نوع النشاط الأساسي (تحديث الوحدات تلقائياً)</label>
                <select
                  value={settings.activity_code}
                  onChange={e => setSettings({ ...settings, activity_code: e.target.value })}
                  className="w-full bg-[#13131A] border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-right cursor-pointer"
                >
                  {activities.map(a => (
                    <option key={a.code} value={a.code}>
                      {a.icon} {a.name} ({a.description})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">رقم التسجيل الضريبي (Tax ID)</label>
                <input
                  type="text"
                  value={settings.tax_id || ''}
                  onChange={e => setSettings({ ...settings, tax_id: e.target.value })}
                  placeholder="300-654-219"
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-left pr-3 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">رقم الهاتف للشركة</label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+201201234567"
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-left pr-3 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">البريد الإلكتروني للشركة</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  placeholder="accounting@company.com"
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-left pr-3 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">العملة الافتراضية للدفاتر</label>
                <select
                  value={settings.currency || 'EGP'}
                  onChange={e => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full bg-[#13131A] border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs cursor-pointer text-right"
                >
                  <option value="EGP">EGP - جنيه مصري</option>
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="USD">USD - دولار أمريكي</option>
                  <option value="AED">AED - درهم إماراتي</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] text-slate-400">العنوان الجغرافي للمقر الرئيسي</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  placeholder="طريق القاهرة الإسكندرية الصحراوي، القرية الذكية، الجيزة، مصر"
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-right pr-3"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">بداية السنة المالية للشركة</label>
                <input
                  type="date"
                  value={settings.fiscal_year_start || ''}
                  onChange={e => setSettings({ ...settings, fiscal_year_start: e.target.value })}
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-right pr-3"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400">نهاية السنة المالية للشركة</label>
                <input
                  type="date"
                  value={settings.fiscal_year_end || ''}
                  onChange={e => setSettings({ ...settings, fiscal_year_end: e.target.value })}
                  className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500 text-xs text-right pr-3"
                />
              </div>
            </div>

            {selectedActivityObj && (
              <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedActivityObj.icon}</span>
                  <span className="text-white text-xs font-black">الوحدات التلقائية المخصصة لنشاط ({selectedActivityObj.name}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedActivityObj.default_modules?.map((mCode: string) => {
                    const matchedMod = modules.find(m => m.code === mCode);
                    return (
                      <span key={mCode} className="px-2.5 py-1 bg-purple-950/75 border border-purple-500/30 text-purple-200 text-[9px] font-bold rounded-full">
                        {matchedMod?.icon || '🧩'} {matchedMod?.name || mCode}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md hover:shadow-purple-500/20"
              >
                <Save size={14} />
                {savingSettings ? 'جاري الحفظ وتنشيط الوحدات...' : 'حفظ إعدادات وتخصيصات الشركة'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ACTIVE ERP MODULES */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="bg-purple-950/20 border border-purple-500/10 p-4 rounded-xl flex items-start gap-3">
              <Cpu className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white text-[11px] block">تفعيل وتخصيص الأنظمة والوحدات الفردية</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  يمكنك يدوياً تشغيل أو إغلاق أي من الوحدات البرمجية الـ 13 المتاحة. سيقوم محرك القائمة الجانبية فوراً بعكس حالتها وتخصيص الشريط الجانبي لأدوار الموظفين حسب تفضيلاتك.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map(m => {
                const isCore = !!m.is_core;
                const isEnabled = !!m.is_enabled || isCore;
                return (
                  <div
                    key={m.code}
                    onClick={() => !isCore && handleToggleModule(m.code)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
                      isCore
                        ? 'bg-purple-950/20 border-purple-500/20 cursor-not-allowed opacity-90'
                        : isEnabled
                          ? 'bg-purple-950/30 border-purple-500/30 hover:border-purple-500 cursor-pointer shadow-md'
                          : 'bg-white/5 border-slate-900/30 hover:border-slate-800 cursor-pointer opacity-60'
                    }`}
                  >
                    <div className={`p-2 rounded-lg text-lg shrink-0 ${
                      isEnabled ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.icon || '🧩'}
                    </div>

                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white block truncate">{m.name}</span>
                        {isCore ? (
                          <span className="bg-purple-500/10 text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-purple-500/20 shrink-0">
                            أساسي
                          </span>
                        ) : isEnabled ? (
                          <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                            ✓
                          </div>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                      <span className="text-[8px] text-slate-500 mt-1 block font-mono">الرمز: {m.code}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-purple-900/20">
              <button
                onClick={handleSaveModules}
                disabled={savingModules}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md hover:shadow-purple-500/20"
              >
                <Save size={14} />
                {savingModules ? 'جاري حفظ التخصيصات...' : 'حفظ وتنشيط تخصيصات الوحدات'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIC CUSTOM FIELDS */}
        {activeTab === 'fields' && (
          <div className="space-y-6">
            <div className="bg-purple-950/20 border border-purple-500/10 p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white text-[11px] block">منظومة الحقول الديناميكية المخصصة (Dynamic Fields Engine)</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  يتيح لك هذا المحرك إضافة حقول مخصصة تظهر تلقائياً في استمارات الإضافة/التحديث لعدة جهات بالنظام. مثلاً: (رقم لوحة السيارة، حمولة الشاحنة في نشاط الشحن)، أو (رقم شهادة السلامة في نشاط المقاولات).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Form to add custom field */}
              <form onSubmit={handleAddCustomField} className="bg-black/30 border border-purple-900/30 p-4 rounded-xl space-y-3 lg:col-span-1">
                <span className="font-bold text-white text-[11px] block border-b border-purple-900/20 pb-2 mb-2">إضافة حقل مخصص جديد</span>
                
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400">النشاط المستهدف</label>
                  <select
                    value={newField.activity_code}
                    onChange={e => setNewField({ ...newField, activity_code: e.target.value })}
                    className="w-full bg-[#13131A] border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none text-xs text-right cursor-pointer"
                  >
                    {activities.map(a => (
                      <option key={a.code} value={a.code}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400">النموذج / الكيان المستهدف</label>
                  <select
                    value={newField.entity_type}
                    onChange={e => setNewField({ ...newField, entity_type: e.target.value })}
                    className="w-full bg-[#13131A] border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none text-xs text-right cursor-pointer"
                  >
                    <option value="employee">👥 نموذج الموظف (Employee)</option>
                    <option value="vehicle">🚛 نموذج الشاحنة / السيارة (Vehicle)</option>
                    <option value="product">📦 نموذج المنتجات والمخزون (Product)</option>
                    <option value="invoice">📄 نموذج الفواتير والمبيعات (Invoice)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400">اسم الحقل برمجياً (English lowercase)</label>
                  <input
                    type="text"
                    required
                    value={newField.field_name}
                    onChange={e => setNewField({ ...newField, field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="license_plate_no"
                    className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none text-xs text-left font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400">العنوان المعروض للمستخدم (Arabic)</label>
                  <input
                    type="text"
                    required
                    value={newField.field_label}
                    onChange={e => setNewField({ ...newField, field_label: e.target.value })}
                    placeholder="رقم لوحة المركبة"
                    className="w-full bg-white/5 border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none text-xs text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400">نوع مدخل الحقل</label>
                  <select
                    value={newField.field_type}
                    onChange={e => setNewField({ ...newField, field_type: e.target.value })}
                    className="w-full bg-[#13131A] border border-purple-900/30 rounded-lg p-2 text-white focus:outline-none text-xs text-right cursor-pointer"
                  >
                    <option value="text">نص عادي (text)</option>
                    <option value="number">رقم عددي (number)</option>
                    <option value="checkbox">مربع خيار صح/خطأ (checkbox)</option>
                    <option value="date">تاريخ رزنامة (date)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 select-none">
                  <input
                    type="checkbox"
                    id="is_req"
                    checked={newField.is_required}
                    onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                    className="rounded border-purple-900/30 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer bg-white/5"
                  />
                  <label htmlFor="is_req" className="text-[10px] text-slate-300 cursor-pointer">حقل إلزامي التعبئة</label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addingField}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={13} />
                    {addingField ? 'جاري الإضافة...' : 'إضافة وتفعيل الحقل'}
                  </button>
                </div>
              </form>

              {/* Table of active custom fields */}
              <div className="bg-black/20 border border-purple-900/20 p-4 rounded-xl lg:col-span-2 space-y-4">
                <span className="font-bold text-white text-[11px] block border-b border-purple-900/20 pb-2">قائمة الحقول المخصصة النشطة حالياً بالنظام</span>
                
                {customFields.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-[11px]">لا يوجد حقول مخصصة مسجلة حالياً. أضف حقلاً من النموذج الجانبي.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-[11px]">
                      <thead>
                        <tr className="border-b border-purple-900/30 text-slate-400">
                          <th className="pb-2">النشاط</th>
                          <th className="pb-2">الكيان</th>
                          <th className="pb-2">اسم الحقل</th>
                          <th className="pb-2">نوعه</th>
                          <th className="pb-2 text-center">إلزامي؟</th>
                          <th className="pb-2 text-left">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-900/10">
                        {customFields.map(field => {
                          const actObj = activities.find(a => a.code === field.activity_code);
                          return (
                            <tr key={field.id} className="text-slate-300">
                              <td className="py-2.5">
                                <span className="px-2 py-0.5 bg-white/5 text-slate-300 rounded text-[9px]">
                                  {actObj?.icon} {actObj?.name || field.activity_code}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <span className="font-bold text-purple-300">
                                  {field.entity_type === 'employee' ? 'الموظف' : field.entity_type === 'vehicle' ? 'السيارات' : field.entity_type === 'product' ? 'المنتجات' : 'الفاتورة'}
                                </span>
                              </td>
                              <td className="py-2.5 font-bold text-white">
                                {field.field_label}
                                <span className="block font-mono text-[8px] text-slate-500 font-normal">{field.field_name}</span>
                              </td>
                              <td className="py-2.5 font-mono text-slate-400 text-[10px]">{field.field_type}</td>
                              <td className="py-2.5 text-center">
                                {field.is_required ? (
                                  <span className="bg-red-500/10 text-red-400 text-[8px] px-1.5 py-0.5 rounded border border-red-500/20">نعم</span>
                                ) : (
                                  <span className="text-slate-500">لا</span>
                                )}
                              </td>
                              <td className="py-2.5 text-left">
                                <button
                                  onClick={() => handleDeleteCustomField(field.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                  title="حذف الحقل المخصص"
                                >
                                  <Trash2 size={13} />
                                </button>
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
          </div>
        )}
      </div>
    </div>
  );
};
