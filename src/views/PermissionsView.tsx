import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Shield, 
  Users, 
  Save, 
  Lock, 
  Unlock, 
  Check, 
  Search, 
  Sparkles,
  Info
} from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  is_enabled: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export const PermissionsView: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNeon, setIsNeon] = useState(false);

  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedRole(data[0].id);
      }
    } catch (error) {
      console.error('❌ فشل جلب الأدوار:', error);
    }
  };

  const loadPermissions = async (roleId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`);
      const data = await res.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ فشل جلب الصلاحيات:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (id: number) => {
    setPermissions(prev =>
      prev.map(p =>
        p.id === id ? { ...p, is_enabled: !p.is_enabled } : p
      )
    );
  };

  const toggleAllInModule = (moduleName: string, enable: boolean) => {
    setPermissions(prev =>
      prev.map(p =>
        p.module === moduleName ? { ...p, is_enabled: enable } : p
      )
    );
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const enabledPermissions = permissions
        .filter(p => p.is_enabled)
        .map(p => p.id);

      const res = await fetch(`/api/roles/${selectedRole}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: enabledPermissions })
      });

      if (res.ok) {
        // Trigger visual success notification
        alert('✅ تم حفظ تعديل الصلاحيات والمصفوفة الأمنية بنجاح بنظام ERP');
      } else {
        alert('❌ فشل حفظ الصلاحيات. يرجى مراجعة الخادم.');
      }
    } catch (error) {
      console.error('❌ فشل حفظ الصلاحيات:', error);
      alert('❌ فشل حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const getRoleArabicName = (name: string): string => {
    const map: Record<string, string> = {
      admin: 'مدير النظام العام (Administrator)',
      hr: 'مسؤول الموارد البشرية والتوظيف (HR Officer)',
      manager: 'مدير قسم أو قطاع (Department Manager)',
      employee: 'موظف بالشركة (Employee)'
    };
    return map[name.toLowerCase()] || name;
  };

  // Filter permissions based on search input
  const filteredPermissions = permissions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered permissions by module
  const groupedPermissions = filteredPermissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <MainLayout
      title="🔐 مصفوفة الصلاحيات المتقدمة"
      description="إدارة مصفوفة الأدوار والوصول الأمني ومستويات التحكم لمستخدمي الهضبة ERP، مما يضمن أمان وخصوصية البيانات والقيود المالية بالشركة"
      actions={
        <Button 
          className={`${isNeon ? 'btn-neon bg-purple-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md`}
          onClick={savePermissions}
          disabled={saving || loading || !selectedRole}
        >
          <Save size={13} className={saving ? 'animate-spin' : ''} />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ المصفوفة الأمنية'}</span>
        </Button>
      }
    >
      <div className="space-y-6" dir="rtl">
        {/* Helper Alert Info Card */}
        <div className={`p-4 rounded-2xl border flex gap-3 items-start ${
          isNeon ? 'bg-purple-950/20 border-purple-500/10 text-purple-200' : 'bg-blue-50/40 border-blue-250/20 text-blue-800'
        }`}>
          <Info size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">توجيه أمني هام:</p>
            <p className="leading-relaxed text-slate-400">
              تعديل مصفوفة الصلاحيات يطبق فورياً على مستوى الأمان والحماية لحسابات الموظفين بمجرد تسجيل دخولهم القادم. 
              يرجى توخي الحذر عند إعطاء صلاحيات محاسبية أو صلاحيات لإدارة أدوار المستخدمين للحفاظ على سلامة القيود والدفاتر المالية.
            </p>
          </div>
        </div>

        {/* Filters and Selector Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Role Selector Card */}
          <Card className={`p-5 rounded-2xl border md:col-span-4 flex flex-col justify-between ${
            isNeon ? 'bg-[#111118]/85 border-purple-950/45 shadow-sm' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={15} className="text-indigo-400" />
                <h3 className={`text-xs font-black ${isNeon ? 'text-white' : 'text-slate-800'}`}>اختيار الدور الوظيفي</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                اختر الدور الوظيفي لتعديل مستوى الوصول والصلاحيات الممنوحة له في النظام بالكامل:
              </p>
              
              <div className="space-y-2">
                {roles.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all text-xs flex justify-between items-center ${
                        isSelected 
                          ? isNeon 
                            ? 'bg-purple-950/30 border-purple-500 text-white font-bold' 
                            : 'bg-blue-50/70 border-blue-500 text-blue-900 font-bold'
                          : isNeon
                            ? 'bg-slate-900/30 border-slate-800/40 text-slate-300 hover:bg-slate-900/50 hover:border-slate-800'
                            : 'bg-slate-50/50 border-slate-200 text-slate-650 hover:bg-slate-100/50'
                      }`}
                    >
                      <div>
                        <span className="block font-black">{getRoleArabicName(role.name)}</span>
                        <span className="block text-[9px] text-slate-400 mt-0.5">{role.description}</span>
                      </div>
                      {isSelected && (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isNeon ? 'bg-purple-600' : 'bg-blue-600'} text-white`}>
                          <Check size={9} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Search Card */}
          <Card className={`p-5 rounded-2xl border md:col-span-8 flex flex-col justify-between ${
            isNeon ? 'bg-[#111118]/85 border-purple-950/45 shadow-sm' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search size={15} className="text-indigo-400" />
                <h3 className={`text-xs font-black ${isNeon ? 'text-white' : 'text-slate-800'}`}>بحث سريع وتصفية</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                اكتب جزءاً من اسم الصلاحية أو الوصف لتصفية وعرض الصلاحيات المستهدفة وتسهيل عملية المراجعة والتحقق:
              </p>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الوصف، أو الوحدة الأمنية..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 transition-all text-right pr-9 ${
                    isNeon 
                      ? 'bg-[#14141F] border border-purple-950/50 text-white focus:ring-purple-500' 
                      : 'bg-slate-50 border border-slate-250/60 text-slate-800 focus:ring-blue-500'
                  }`}
                />
                <Search size={13} className="absolute right-3.5 top-3.5 text-slate-400" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-xl border text-center ${isNeon ? 'bg-[#141421]/60 border-slate-900/60' : 'bg-slate-50 border-slate-150'}`}>
                  <span className="block text-[10px] text-slate-400">إجمالي الصلاحيات الكلية</span>
                  <span className={`block text-lg font-black mt-1 ${isNeon ? 'text-white' : 'text-slate-800'}`}>{permissions.length}</span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${isNeon ? 'bg-[#141421]/60 border-slate-900/60' : 'bg-slate-50 border-slate-150'}`}>
                  <span className="block text-[10px] text-slate-400">الصلاحيات الممنوحة لهذا الدور</span>
                  <span className="block text-lg font-black mt-1 text-emerald-500">{permissions.filter(p => p.is_enabled).length}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Permissions Grid Grouped by Modules */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-bold">جاري تحميل مصفوفة الحماية والأدوار من خادم الأمان...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.entries(groupedPermissions) as [string, Permission[]][]).map(([moduleName, perms]) => (
              <Card key={moduleName} className={`p-5 rounded-2xl border overflow-hidden ${
                isNeon ? 'bg-[#111118]/85 border-purple-950/45 shadow-sm' : 'bg-white border-slate-200'
              }`}>
                {/* Module Header */}
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/10">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-purple-400" />
                    <h3 className={`text-xs font-black ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                      {moduleName}
                    </h3>
                  </div>
                  
                  {/* Quick controls to enable/disable all inside module */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllInModule(moduleName, true)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isNeon ? 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      تفعيل الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllInModule(moduleName, false)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isNeon ? 'bg-slate-900/40 text-slate-400 hover:bg-slate-850/40' : 'bg-slate-100/50 text-slate-500 hover:bg-slate-250/50'
                      }`}
                    >
                      إلغاء تفعيل الكل
                    </button>
                  </div>
                </div>

                {/* Permissions inside module */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        p.is_enabled 
                          ? isNeon 
                            ? 'bg-purple-950/10 border-purple-500/20 text-white' 
                            : 'bg-emerald-50/20 border-emerald-500/15 text-slate-800'
                          : isNeon
                            ? 'bg-[#13131F]/40 border-slate-900/50 text-slate-400'
                            : 'bg-slate-50/40 border-slate-150 text-slate-500 opacity-80'
                      }`}
                    >
                      <div className="pl-4 min-w-0 flex-1">
                        <p className={`text-xs font-black leading-snug truncate ${isNeon ? 'text-white' : 'text-slate-800'}`}>
                          {p.description}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate select-all">
                          {p.name}
                        </p>
                      </div>

                      <button
                        onClick={() => togglePermission(p.id)}
                        className={`
                          w-11 h-6 rounded-full relative transition-all cursor-pointer focus:outline-none shrink-0
                          ${p.is_enabled 
                            ? isNeon ? 'bg-purple-600' : 'bg-emerald-500' 
                            : 'bg-slate-300 dark:bg-slate-800'
                          }
                        `}
                      >
                        <div
                          className={`
                            w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all
                            ${p.is_enabled ? 'left-0.5' : 'left-5.5'}
                          `}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {filteredPermissions.length === 0 && (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
                <Lock size={24} className="text-amber-500/80" />
                <p className="text-xs font-bold">لم نجد أي صلاحيات مطابقة لكلمات البحث.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PermissionsView;
