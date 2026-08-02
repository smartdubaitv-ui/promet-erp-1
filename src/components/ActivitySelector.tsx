import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Check, Search, Briefcase, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityItem {
  code: string;
  name: string;
  icon: string;
  description?: string;
  is_custom?: boolean;
}

interface ActivitySelectorProps {
  currentActivity: string;
  onSelectActivity: (code: string) => void;
  appTheme?: 'light' | 'neon' | 'classic';
}

const EMOJI_OPTIONS = [
  '🧹', '🛒', '🏗️', '🚛', '🏭', '🏨', '🏥', '🎓', 
  '🌾', '🚗', '💊', '✈️', '⚖️', '🍞', '🔧', '💼', 
  '📱', '💎', '⛽', '🏢', '⛵', '🥩', '🎨', '⚙️'
];

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { code: 'retail', name: 'تجزئة ومبيعات مباشرة', icon: '🛒', description: 'مبيعات التجزئة وفواتير نقاط البيع والعملاء' },
  { code: 'scrap', name: 'الخردة وإعادة التدوير', icon: '🧹', description: 'إدارة مخزون الخردة والسكراب والمصانع' },
  { code: 'construction', name: 'مقاولات وتطوير عقاري', icon: '🏗️', description: 'المستخلصات والمستودعات والمشاريع والعمالة' },
  { code: 'transport', name: 'نقل وشحن', icon: '🚛', description: 'إدارة الأسطول والشحنات وبولصات الشحن' },
  { code: 'manufacturing', name: 'تصنيع', icon: '🏭', description: 'أوامر الإنتاج والمواد الخام والتصنيع' },
  { code: 'logistics', name: 'خدمات لوجستية', icon: '📦', description: 'التخزين والتوزيع وتقارير المخزون' },
  { code: 'import_export', name: 'استيراد وتصدير', icon: '🌍', description: 'الشحن الدولي والاعتمادات والجمارك' },
  { code: 'it_services', name: 'تكنولوجيا معلومات', icon: '💻', description: 'تطوير البرمجيات والبنية التحتية والاشتراكات' },
  { code: 'agriculture', name: 'زراعة وثروة حيوانية', icon: '🌾', description: 'المحاصيل والثروة الحيوانية والتخزين الزراعي' },
  { code: 'maintenance', name: 'صيانة وتشغيل', icon: '🔧', description: 'عقود الصيانة وقطع الغيار وفرق الفنيين' },
  { code: 'hospitality', name: 'ضيافة وسياحة', icon: '🏨', description: 'إدارة الفنادق والحجوزات والنزلاء' },
  { code: 'education', name: 'تعليم وتدريب', icon: '🎓', description: 'إدارة الطلاب والرسوم الكادر التعليمي' },
  { code: 'consulting', name: 'استشارات إدارية ومالية', icon: '📋', description: 'الدراسات والمشروعات والدعم الاستشاري' }
];

export const ActivitySelector: React.FC<ActivitySelectorProps> = ({
  currentActivity,
  onSelectActivity,
  appTheme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Activity Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityCode, setNewActivityCode] = useState('');
  const [newActivityIcon, setNewActivityIcon] = useState('💼');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch activities from API
  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-types');
      if (res.ok) {
        const data = await res.json();
        setActivities(data || []);
      }
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Find currently active item object
  const activeItem = activities.find(a => a.code === currentActivity) || {
    code: currentActivity,
    name: currentActivity === 'scrap' ? 'الخردة وإعادة التدوير' 
        : currentActivity === 'retail' ? 'تجزئة ومبيعات مباشرة'
        : currentActivity === 'construction' ? 'مقاولات وتطوير عقاري'
        : currentActivity === 'transport' ? 'نقل وشحن ودعم لوجستي'
        : currentActivity === 'manufacturing' ? 'تصنيع وإنتاج ميكانيكي'
        : currentActivity,
    icon: currentActivity === 'scrap' ? '🧹' 
        : currentActivity === 'retail' ? '🛒' 
        : currentActivity === 'construction' ? '🏗️' 
        : currentActivity === 'transport' ? '🚛' 
        : currentActivity === 'manufacturing' ? '🏭' 
        : '💼'
  };

  const filteredActivities = activities.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;

    setSubmitting(true);
    try {
      const generatedCode = newActivityCode.trim() 
        ? newActivityCode.trim().toLowerCase().replace(/\s+/g, '_')
        : `act_${Date.now()}`;

      const res = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newActivityName.trim(),
          code: generatedCode,
          icon: newActivityIcon,
          description: newActivityDesc.trim() || 'نشاط تجاري مسجل'
        })
      });

      if (res.ok) {
        const created = await res.json();
        await fetchActivities();
        // Automatically switch to the newly registered activity
        const newCode = created.code || generatedCode;
        onSelectActivity(newCode);
        
        // Reset form
        setNewActivityName('');
        setNewActivityCode('');
        setNewActivityIcon('💼');
        setNewActivityDesc('');
        setShowAddModal(false);
        setIsOpen(false);
      } else {
        alert('حدث خطأ أثناء تسجيل النشاط الجديد.');
      }
    } catch (err) {
      console.error("Error creating activity:", err);
      alert('تعذر تسجيل النشاط الجديد.');
    } finally {
      setSubmitting(false);
    }
  };

  const isNeon = appTheme === 'neon';

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      {/* Current Activity Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer select-none ${
          isNeon
            ? 'bg-[#1a1628]/90 text-purple-200 border-purple-500/30 hover:border-purple-400 hover:bg-purple-950/50'
            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <span className="text-sm shrink-0">{activeItem.icon}</span>
        <span className="truncate max-w-[130px] sm:max-w-[180px]">{activeItem.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden ${
              isNeon
                ? 'bg-[#120e20] border-purple-500/30 text-white divide-purple-900/30'
                : 'bg-white border-slate-200 text-slate-800 divide-slate-100'
            }`}
          >
            {/* Header */}
            <div className={`p-3 border-b flex items-center justify-between ${
              isNeon ? 'bg-purple-950/40 border-purple-500/20' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <Briefcase size={15} className={isNeon ? 'text-purple-400' : 'text-blue-600'} />
                <span className="text-xs font-black">الأنشطة التجارية والتشغيلية</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isNeon ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-50 text-blue-700'
              }`}>
                {activities.length} نشاط
              </span>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-slate-100 dark:border-purple-900/20">
              <div className="relative">
                <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في الأنشطة المتاحة..."
                  className={`w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border outline-none font-medium transition-colors ${
                    isNeon
                      ? 'bg-purple-950/30 border-purple-500/20 text-white placeholder-purple-300/40 focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Activities List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400 font-bold">
                  جاري تحميل الأنشطة...
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  لا توجد أنشطة تطابق البحث
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const isSelected = act.code === currentActivity;
                  return (
                    <button
                      key={act.code}
                      onClick={() => {
                        onSelectActivity(act.code);
                        setIsOpen(false);
                      }}
                      className={`w-full text-right p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? isNeon
                            ? 'bg-purple-900/60 text-white border border-purple-500/40 shadow-sm'
                            : 'bg-blue-50 text-blue-800 border border-blue-200 shadow-sm'
                          : isNeon
                            ? 'hover:bg-purple-950/40 text-purple-200'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0 p-1 rounded-lg bg-slate-100/10">{act.icon}</span>
                        <div className="truncate">
                          <p className="truncate font-black text-xs">{act.name}</p>
                          {act.description && (
                            <p className={`text-[10px] truncate font-normal ${isNeon ? 'text-purple-300/70' : 'text-slate-400'}`}>
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {act.is_custom && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            isNeon ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            مسجّل
                          </span>
                        )}
                        {isSelected && (
                          <Check size={16} className={isNeon ? 'text-purple-400' : 'text-blue-600'} />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Action: Register New Activity */}
            <div className={`p-2 border-t ${isNeon ? 'bg-purple-950/30 border-purple-500/20' : 'bg-slate-50 border-slate-100'}`}>
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setIsOpen(false);
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isNeon
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Plus size={15} />
                <span>تسجيل نشاط تجاري جديد</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Register New Activity */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
                isNeon
                  ? 'bg-[#151124] border-purple-500/30 text-white'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isNeon ? 'bg-purple-950/50 border-purple-500/20' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${isNeon ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-100 text-blue-700'}`}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">تسجيل نشاط تجاري جديد</h3>
                    <p className={`text-[10px] ${isNeon ? 'text-purple-300/70' : 'text-slate-500'}`}>
                      أضف نشاطك للشركة ليظهر في قائمة الأنشطة المتاحة للتبديل
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isNeon ? 'hover:bg-purple-900/50 text-purple-300' : 'hover:bg-slate-200 text-slate-500'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateActivity} className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    اسم النشاط التجاري <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newActivityName}
                    onChange={(e) => {
                      setNewActivityName(e.target.value);
                      if (!newActivityCode) {
                        setNewActivityCode(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                      }
                    }}
                    placeholder="مثال: تجارة السيارات والمركبات، صيدليات وأدوية"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium transition-colors ${
                      isNeon
                        ? 'bg-purple-950/30 border-purple-500/30 text-white placeholder-purple-300/30 focus:border-purple-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Emoji Icon Picker */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    اختر رمز / أيقونة النشاط
                  </label>
                  <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl border bg-slate-50/50 dark:bg-purple-950/20 dark:border-purple-500/20">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewActivityIcon(emoji)}
                        className={`text-lg p-1.5 rounded-lg transition-all text-center cursor-pointer ${
                          newActivityIcon === emoji
                            ? 'bg-blue-600 text-white scale-110 shadow-sm'
                            : 'hover:bg-slate-200 dark:hover:bg-purple-900/50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    وصف مختصر للنشاط (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    placeholder="مثال: إدارة مبيعات قطع الغيار والصيانة والمستودعات"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium transition-colors ${
                      isNeon
                        ? 'bg-purple-950/30 border-purple-500/30 text-white placeholder-purple-300/30 focus:border-purple-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-purple-900/30">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isNeon ? 'bg-purple-950/50 text-purple-300 hover:bg-purple-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newActivityName.trim()}
                    className={`px-5 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${
                      isNeon
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {submitting ? 'جاري التسجيل...' : 'حفظ وتسجيل النشاط'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
