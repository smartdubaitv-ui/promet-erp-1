import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
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
}

export const ActivitySetup: React.FC = () => {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    code: '',
    description: '',
    icon: '📌',
    color: '#6C2BD9',
    default_modules: ['dashboard']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // جلب الأنشطة
      const activitiesRes = await fetch('/api/activity-types');
      const activitiesData = await activitiesRes.json();
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);

      // جلب إعدادات الشركة الحالية
      const settingsRes = await fetch('/api/company-settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData && settingsData.activity_code) {
          setSelectedActivity(settingsData.activity_code);
        }
      }

      // جلب الوحدات
      await loadModules();
    } catch (error) {
      console.error('❌ فشل تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const res = await fetch('/api/company-modules');
      if (res.ok) {
        const data = await res.json();
        setModules(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('❌ فشل تحميل الوحدات:', error);
    }
  };

  const handleSelectActivity = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/company-settings/activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_code: code })
      });

      if (res.ok) {
        setSelectedActivity(code);
        // نعطي النظام وقت يطبق التغييرات
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const data = await res.json();
        alert('❌ ' + data.error);
      }
    } catch (error) {
      console.error('❌ فشل تحديث النشاط:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (code: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/company-modules/${code}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !isEnabled })
      });

      if (res.ok) {
        await loadModules();
      }
    } catch (error) {
      console.error('❌ فشل تحديث الوحدة:', error);
    }
  };

  const getActivityIcon = (icon: string) => {
    return icon || '📌';
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.name || !newActivity.code) {
      alert('❌ يرجى إدخال اسم وكود النشاط');
      return;
    }

    try {
      const res = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      });

      if (res.ok) {
        alert('✅ تم إضافة النشاط الجديد بنجاح');
        setShowAddActivity(false);
        setNewActivity({ name: '', code: '', description: '', icon: '📌', color: '#6C2BD9', default_modules: ['dashboard'] });
        await loadData();
      } else {
        const data = await res.json();
        alert('❌ ' + (data.error || 'فشل إضافة النشاط'));
      }
    } catch (error) {
      console.error('❌ فشل إضافة النشاط:', error);
      alert('❌ فشل إضافة النشاط بسبب خطأ في الشبكة');
    }
  };

  if (loading) {
    return (
      <MainLayout title="⚙️ إعدادات نشاط الشركة" description="جاري تحميل الإعدادات...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#6C2BD9] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[#A0A0B0]">⏳ جاري تحميل الإعدادات...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="⚙️ إعدادات نشاط الشركة"
      description="اختر نشاط شركتك لتخصيص الوحدات والحقول وفقاً لمجال عملك"
    >
      <div className="space-y-6" dir="rtl">
        {/* شريط الإضافة السريعة للأنشطة */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#13131A]/30 p-4 rounded-xl border border-purple-500/10 gap-4">
          <div>
            <h3 className="text-md font-bold text-white">⚙️ هل ترغب في تخصيص نشاط جديد بالكامل؟</h3>
            <p className="text-xs text-[#A0A0B0] mt-0.5">يمكنك إضافة نشاط تجاري أو خدمي فريد وتخصيص وحداته الخاصة</p>
          </div>
          <Button 
            className="text-xs py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
            onClick={() => setShowAddActivity(!showAddActivity)}
          >
            {showAddActivity ? '✕ إغلاق النموذج' : '➕ إضافة نشاط جديد'}
          </Button>
        </div>

        {/* نموذج إضافة نشاط جديد */}
        {showAddActivity && (
          <Card className="card-glow p-6 border-purple-500/20 bg-[#13131A]/60">
            <h2 className="text-lg font-bold text-white mb-4">➕ إضافة نشاط جديد</h2>
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">اسم النشاط الجديد *</label>
                  <Input
                    type="text"
                    placeholder="مثال: خدمات تقنية، عقارات، استشارات"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    required
                    className="bg-[#13131A] text-white border-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">الكود الفريد (بالأحرف الإنجليزية فقط) *</label>
                  <Input
                    type="text"
                    placeholder="مثال: tech_services, real_estate"
                    value={newActivity.code}
                    onChange={(e) => setNewActivity({ ...newActivity, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    required
                    className="bg-[#13131A] text-white border-purple-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">وصف مختصر لمجال العمل</label>
                  <Input
                    type="text"
                    placeholder="شرح مبسط لطبيعة هذا النشاط"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="bg-[#13131A] text-white border-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">الأيقونة (رمز تعبيري Emoji)</label>
                  <Input
                    type="text"
                    placeholder="📌"
                    value={newActivity.icon}
                    onChange={(e) => setNewActivity({ ...newActivity, icon: e.target.value })}
                    className="bg-[#13131A] text-white text-center border-purple-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">الوحدات الأساسية المفعلة تلقائياً للنشاط الجديد</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {modules.map((m) => {
                    const isChecked = newActivity.default_modules.includes(m.code);
                    return (
                      <label key={m.code} className="flex items-center gap-2 p-2 bg-[#1C1C24]/50 rounded-lg border border-slate-800 cursor-pointer hover:bg-slate-800/50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={m.is_core}
                          onChange={(e) => {
                            let updated = [...newActivity.default_modules];
                            if (e.target.checked) {
                              if (!updated.includes(m.code)) updated.push(m.code);
                            } else {
                              updated = updated.filter(code => code !== m.code);
                            }
                            setNewActivity({ ...newActivity, default_modules: updated });
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs text-white flex items-center gap-1">
                          <span>{m.icon}</span>
                          <span>{m.name}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5"
                  onClick={() => setShowAddActivity(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 font-bold">
                  💾 حفظ النشاط الجديد
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* اختيار النشاط */}
        <Card className="card-glow p-6">
          <h2 className="text-lg font-bold text-white mb-4">🏢 اختر نشاط شركتك</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activities.map((activity) => (
              <button
                key={activity.code}
                onClick={() => handleSelectActivity(activity.code)}
                disabled={saving}
                className={`
                  p-4 rounded-xl text-center transition-all
                  ${selectedActivity === activity.code
                    ? 'bg-[#6C2BD9]/20 border-2 border-[#8B5CF6]'
                    : 'bg-[#13131A]/40 hover:border-[#6C2BD9]/50 border border-transparent'
                  }
                  ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="text-3xl">{getActivityIcon(activity.icon)}</div>
                <p className="text-sm font-bold text-white mt-2">{activity.name}</p>
                <p className="text-xs text-[#A0A0B0] mt-1">{activity.description}</p>
                {selectedActivity === activity.code && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full">
                    ✅ نشط
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* الوحدات النشطة */}
        <Card className="card-glow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">📋 الوحدات النشطة</h2>
            <span className="text-sm text-[#A0A0B0]">
              {modules.filter(m => m.is_enabled).length} / {modules.length} مفعلة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((module) => (
              <div
                key={module.code}
                className={`
                  flex items-center justify-between p-3 rounded-xl
                  ${module.is_enabled
                    ? 'bg-[#6C2BD9]/10 border border-[#6C2BD9]/30'
                    : 'bg-[#13131A]/50 border border-[#2D2D3A]'
                  }
                  ${module.is_core ? 'opacity-75' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{module.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{module.name}</p>
                    <p className="text-xs text-[#A0A0B0]">{module.description}</p>
                  </div>
                  {module.is_core && (
                    <span className="text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">
                      أساسية
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleModule(module.code, module.is_enabled)}
                  disabled={module.is_core}
                  className={`
                    w-12 h-6 rounded-full transition-all flex items-center p-0.5
                    ${module.is_enabled
                      ? 'bg-[#6C2BD9]'
                      : 'bg-[#2D2D3A]'
                    }
                    ${module.is_core ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div
                    className={`
                      w-5 h-5 rounded-full bg-white transition-all
                      ${module.is_enabled ? 'translate-x-6' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* الحقول المخصصة */}
        <Card className="card-glow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">➕ الحقول المخصصة</h2>
              <p className="text-sm text-[#A0A0B0]">أضف حقولاً مخصصة حسب احتياجات نشاطك</p>
            </div>
            <Button className="btn-neon">
              ➕ إضافة حقل
            </Button>
          </div>
          <div className="mt-4 text-center py-8 text-[#A0A0B0]">
            سيتم إضافة الحقول المخصصة في التحديث القادم
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ActivitySetup;
