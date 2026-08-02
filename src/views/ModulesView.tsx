import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { colors, typography } from '../theme';
import { 
  RefreshCw, 
  Settings, 
  Shield, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Puzzle,
  Sparkles
} from 'lucide-react';

interface Module {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  is_core: boolean;
  is_enabled?: boolean;
}

export const ModulesView: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const userId = '1'; // مؤقتاً للمستخدم التجريبي النشط

  useEffect(() => {
    loadModules();
  }, [activeTab]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'system' 
        ? '/api/modules' 
        : `/api/modules/user/${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setModules(data);
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error('❌ فشل جلب الوحدات:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (code: string, is_active: boolean) => {
    const actionText = is_active ? 'تفعيل' : 'تعطيل';
    if (!confirm(`هل أنت متأكد من ${actionText} هذه الوحدة لجميع مستخدمي النظام؟`)) return;
    
    try {
      const res = await fetch(`/api/modules/${code}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active })
      });
      if (res.ok) {
        loadModules();
      } else {
        const err = await res.json();
        alert(err.error || '❌ فشل تحديث الوحدة');
      }
    } catch (error) {
      alert('❌ فشل الاتصال بالخادم لتحديث الوحدة');
    }
  };

  const toggleUserModule = async (code: string, is_enabled: boolean) => {
    const updatedModules = modules.map(m => 
      m.code === code ? { ...m, is_enabled } : m
    );
    
    try {
      const res = await fetch(`/api/modules/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: updatedModules })
      });
      if (res.ok) {
        setModules(updatedModules);
      } else {
        alert('❌ فشل تحديث تفضيلات المستخدم');
      }
    } catch (error) {
      alert('❌ فشل الاتصال بالخادم لتحديث الإعدادات');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Block with high contrast info and trigger */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Puzzle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              🧩 إدارة الوحدات والأنظمة المرنة
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">التحكم الذكي</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              قم بتخصيص وبناء بيئة العمل الخاصة بك عن طريق تفعيل أو تعطيل الأجزاء والأنظمة وفقاً لاحتياجات وموارد شركتك.
            </p>
          </div>
        </div>
        <Button 
          onClick={loadModules} 
          className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          🔄 تحديث فوري للوحدات
        </Button>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all flex items-center gap-2 focus:outline-none ${
            activeTab === 'system'
              ? 'border-blue-600 text-blue-600 font-black bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-lg'
          }`}
        >
          <Settings size={14} />
          ⚙️ إعدادات النظام وتراخيص الشركة
        </button>
        <button
          onClick={() => setActiveTab('user')}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all flex items-center gap-2 focus:outline-none ${
            activeTab === 'user'
              ? 'border-blue-600 text-blue-600 font-black bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-lg'
          }`}
        >
          <User size={14} />
          👤 تفضيلات واجهة المستخدم الشخصية
        </button>
      </div>

      {/* Intro info panel */}
      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">تلميح ذكي:</span>{' '}
          {activeTab === 'system' 
            ? 'تعديل حالة الوحدات هنا يؤثر على جميع الموظفين في الشركة. عند تعطيل وحدة، ستختفي تماماً من شريط التنقل الجانبي ولن يتمكن أي مستخدم من تشغيلها.'
            : 'هنا يمكنك التحكم بظهور أو إخفاء الوحدات النشطة في شريط التنقل الخاص بك لتنظيم بيئة عملك الشخصية دون التأثير على زملائك.'}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-slate-500 font-bold">جاري تحميل مصفوفة الوحدات وإعدادات التراخيص...</p>
          </div>
        ) : modules.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs">
            <HelpCircle size={40} className="text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">لا توجد وحدات معرّفة حالياً</p>
            <p className="text-xs text-slate-400 mt-1">تأكد من تشغيل التهيئات الافتراضية للنظام في الخادم.</p>
          </div>
        ) : (
          modules.map((module) => (
            <Card key={module.id} className="relative overflow-hidden transition-all hover:shadow-md border border-slate-200 hover:border-slate-300">
              {/* Highlight ribbon for Core system units */}
              {module.is_core && (
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-br-lg shadow-xs flex items-center gap-1">
                  <Lock size={8} />
                  أساسي
                </div>
              )}

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-2 bg-slate-50 border border-slate-100 rounded-xl shrink-0 select-none">
                      {module.icon}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{module.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal line-clamp-2 h-8">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meta info tags */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">CODE: {module.code}</span>
                  
                  <div className="flex items-center gap-1.5">
                    {activeTab === 'system' ? (
                      module.is_core ? (
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md flex items-center gap-1">
                          <Lock size={10} />
                          غير قابل للتعطيل
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleModule(module.code, !module.is_active)}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 focus:outline-none ${
                            module.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {module.is_active ? (
                            <>
                              <CheckCircle size={10} className="text-emerald-500" />
                              <span>نشط بالكامل</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={10} className="text-red-500" />
                              <span>معطل حالياً</span>
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => toggleUserModule(module.code, !module.is_enabled)}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 focus:outline-none ${
                          module.is_enabled !== false
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {module.is_enabled !== false ? (
                          <>
                            <Eye size={10} className="text-blue-500" />
                            <span>ظاهر بالقائمة</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={10} className="text-slate-400" />
                            <span>مخفي بالقائمة</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ModulesView;
