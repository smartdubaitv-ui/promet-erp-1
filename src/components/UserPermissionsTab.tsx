import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Save, RefreshCw, CheckCircle, AlertCircle, Eye, Edit3, Trash2, CheckSquare, Square } from 'lucide-react';

interface ModulePerms {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserWithPerms {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: Record<string, ModulePerms>;
}

const MODULE_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
  invoices: { title: 'الفواتير والمبيعات', desc: 'إنشاء وعرض وتعديل الفواتير وعروض الأسعار', icon: '📄' },
  employees: { title: 'إدارة الموظفين', desc: 'سجلات الموظفين والبيانات الشخصية', icon: '👥' },
  payroll: { title: 'الرواتب ومسيرات الأجور', desc: 'حساب مسيرات الرواتب والاعتمادات والترحيل', icon: '💵' },
  treasury: { title: 'الخزينة والسندات', desc: 'إدارة الخزائن والحسابات وسندات القبض والصرف', icon: '🏦' },
  advances: { title: 'السلف والقروض', desc: 'طلب واعتماد وصرف أقساط وسلف الموظفين', icon: '💳' },
  scrap: { title: 'ميزان الخردة والسكراب', desc: 'عمليات الشراء والوزن عبر Weighbridge', icon: '🧹' },
  inventory: { title: 'المخزون والمستودعات', desc: 'منتجات وأصناف المستودع وإدارة المخزون', icon: '📦' },
  recurring_invoices: { title: 'الفواتير الدورية', desc: 'جدولة واستخراج الفواتير الدورية', icon: '🔄' },
  approvals: { title: 'الموافقات والاعتمادات', desc: 'نظام اعتمادات الطلبات والطلبات المعلقة', icon: '✅' },
  reports: { title: 'التقارير المادية والمالية', desc: 'تقارير المبيعات والأرباح والتحليلات', icon: '📊' },
  backup: { title: 'النسخ الاحتياطي والصيانة', desc: 'استخراج واسترجاع نسخ البيانات', icon: '💾' },
  settings: { title: 'إعدادات النظام الموحدة', desc: 'تغيير خيارات الشركة والأنظمة الفعالة', icon: '⚙️' }
};

interface UserPermissionsTabProps {
  cardClass: string;
  inputClass: string;
  isNeon?: boolean;
}

export const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({
  cardClass,
  inputClass,
  isNeon = true
}) => {
  const [users, setUsers] = useState<UserWithPerms[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, ModulePerms>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // جلب قائمة المستخدمين والصلاحيات
  const loadUsersAndPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user-permissions');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setUsers(data.data);
          if (data.data.length > 0) {
            const firstUser = data.data[0];
            setSelectedUserId(firstUser.id);
            setPermissions(firstUser.permissions || getEmptyPermissions());
          }
        }
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndPermissions();
  }, []);

  const getEmptyPermissions = (): Record<string, ModulePerms> => {
    const res: Record<string, ModulePerms> = {};
    Object.keys(MODULE_LABELS).forEach(k => {
      res[k] = { view: true, edit: false, delete: false };
    });
    return res;
  };

  // عند تغيير المستخدم المختار
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.permissions) {
      setPermissions(targetUser.permissions);
    } else {
      setPermissions(getEmptyPermissions());
    }
  };

  // تغيير خانة اختيارات لموديول معين
  const handleToggle = (moduleKey: string, action: 'view' | 'edit' | 'delete') => {
    setPermissions(prev => {
      const current = prev[moduleKey] || { view: false, edit: false, delete: false };
      const updated = { ...current, [action]: !current[action] };

      // إذا تم إلغاء العرض، يتم تلقائياً إلغاء التعديل والحذف
      if (action === 'view' && !updated.view) {
        updated.edit = false;
        updated.delete = false;
      }
      // إذا تم تفعيل التعديل أو الحذف، يتم تفعيل العرض تلقائياً
      if ((action === 'edit' || action === 'delete') && updated[action]) {
        updated.view = true;
      }

      return {
        ...prev,
        [moduleKey]: updated
      };
    });
  };

  // أزرار سريعة
  const handleCheckAll = (state: boolean) => {
    const updated: Record<string, ModulePerms> = {};
    Object.keys(MODULE_LABELS).forEach(k => {
      updated[k] = { view: state, edit: state, delete: state };
    });
    setPermissions(updated);
  };

  const handleSetViewOnly = () => {
    const updated: Record<string, ModulePerms> = {};
    Object.keys(MODULE_LABELS).forEach(k => {
      updated[k] = { view: true, edit: false, delete: false };
    });
    setPermissions(updated);
  };

  // حفظ الصلاحيات بالسيرفر
  const handleSavePermissions = async () => {
    if (!selectedUserId) {
      alert('يرجى اختيار مستخدم أولاً');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/user-permissions/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage('✅ تم حفظ وتطبيق الصلاحيات بنجاح!');
        // تحديث القائمة المحلية
        setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, permissions } : u));
        setTimeout(() => setToastMessage(''), 3000);
      } else {
        alert('❌ ' + (data.error || 'فشل حفظ الصلاحيات'));
      }
    } catch (err) {
      console.error(err);
      alert('❌ تعذر الاتصال بالسيرفر لحفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold">جاري تحميل سجل الصلاحيات والمستخدمين...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl">
      {/* Toast message */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600/90 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {toastMessage}
          </span>
        </div>
      )}

      {/* Header & User Picker Card */}
      <div className={cardClass}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isNeon ? 'bg-purple-950/60 border border-purple-500/30 text-purple-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100">🛡️ تخصيص الصلاحيات الدقيقة للمستخدمين (Granular Permissions)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                حدد صلاحيات العرض (View)، التعديل (Edit)، والحذف (Delete) لكل قسم ومستند لكل موظف في الشركة بشكل دقيق.
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={saving || !selectedUserId}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save size={15} />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات 💾'}</span>
          </button>
        </div>

        {/* User Dropdown Selector */}
        <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            <label className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
              <UserCheck size={16} className="text-purple-400" />
              <span>اختر الموظف / المستخدم:</span>
            </label>
            <select
              value={selectedUserId}
              onChange={e => handleUserSelect(e.target.value)}
              className={`w-full sm:w-80 px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputClass}`}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role || 'موظف'}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCheckAll(true)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              تحديد الكل (منح كامل)
            </button>
            <button
              onClick={handleSetViewOnly}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              مشاهدة فقط 👁️
            </button>
            <button
              onClick={() => handleCheckAll(false)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              إلغاء الكل 🚫
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Table Card */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔑</span>
            <h4 className="text-xs font-bold text-slate-200">
              جدول الصلاحيات الدقيقة للمستخدم: <span className="text-purple-400 font-black">{selectedUser?.name || 'غير محدد'}</span>
            </h4>
          </div>
          {selectedUser?.role === 'admin' && (
            <span className="px-2.5 py-0.5 bg-purple-950 border border-purple-500/40 text-purple-300 text-[10px] font-bold rounded-full">
              ⚡ مسؤول النظام (Admin) يتملك كامل الصلاحيات تلقائياً
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className={isNeon ? 'bg-[#151522] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-200'}>
                <th className="p-3">القسم / الوحدة التشغيلية</th>
                <th className="p-3 w-28 text-center">
                  <span className="flex items-center justify-center gap-1 text-blue-400">
                    <Eye size={13} />
                    <span>مشاهدة (View)</span>
                  </span>
                </th>
                <th className="p-3 w-28 text-center">
                  <span className="flex items-center justify-center gap-1 text-emerald-400">
                    <Edit3 size={13} />
                    <span>تعديل (Edit)</span>
                  </span>
                </th>
                <th className="p-3 w-28 text-center">
                  <span className="flex items-center justify-center gap-1 text-rose-400">
                    <Trash2 size={13} />
                    <span>حذف (Delete)</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {Object.entries(MODULE_LABELS).map(([mKey, mMeta]) => {
                const p = permissions[mKey] || { view: false, edit: false, delete: false };

                return (
                  <tr key={mKey} className={isNeon ? 'hover:bg-purple-950/20 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{mMeta.icon}</span>
                        <div>
                          <div className="font-black text-slate-200 text-xs">{mMeta.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{mMeta.desc}</div>
                        </div>
                      </div>
                    </td>

                    {/* Checkbox: View */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mKey, 'view')}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          p.view
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {p.view ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>

                    {/* Checkbox: Edit */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mKey, 'edit')}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          p.edit
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {p.edit ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>

                    {/* Checkbox: Delete */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mKey, 'delete')}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          p.delete
                            ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {p.delete ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSavePermissions}
            disabled={saving || !selectedUserId}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ وتطبيق صلاحيات المستخدم 💾'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsTab;
