import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// ✅ Schema validation using Zod
const shippingSchema = z.object({
  driverName: z.string().min(2, 'اسم السائق مطلوب (حرفين على الأقل)'),
  vehicleNumber: z.string().min(1, 'رقم السيارة مطلوب'),
  loadQuantity: z.number().min(0.01, 'الكمية يجب أن تكون أكبر من صفر'),
  factoryPricePerTon: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي صفر'),
  salePriceDifference: z.number().min(0),
  aramiat: z.number().min(0),
  equipmentCost: z.number().min(0),
  transportationCost: z.number().min(0),
  totalSaleAmount: z.number().min(0, 'إجمالي البيع مطلوب'),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string().optional(),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

interface ShippingTransactionFormProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export const ShippingTransactionForm: React.FC<ShippingTransactionFormProps> = ({ onSuccess, isModal = true }) => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      driverName: '',
      vehicleNumber: '',
      loadQuantity: undefined as any,
      factoryPricePerTon: 488.48,
      salePriceDifference: 0,
      aramiat: 0,
      equipmentCost: 0,
      transportationCost: 0,
      totalSaleAmount: 0,
      invoiceNumber: '',
      notes: '',
      transactionDate: new Date().toISOString().split('T')[0]
    }
  });

  // Watch fields to dynamically compute total
  const watchedValues = watch();

  // Helper calculation
  const calculateTotal = () => {
    const qty = Number(watchedValues.loadQuantity) || 0;
    const price = Number(watchedValues.factoryPricePerTon) || 0;
    const basePrice = qty * price;
    const extras = (Number(watchedValues.salePriceDifference) || 0) +
                   (Number(watchedValues.aramiat) || 0) +
                   (Number(watchedValues.equipmentCost) || 0) +
                   (Number(watchedValues.transportationCost) || 0);
    return basePrice + extras;
  };

  // Live trigger to update form total
  const triggerAutoCalc = () => {
    const total = calculateTotal();
    setValue('totalSaleAmount', Number(total.toFixed(2)));
  };

  const onSubmit = async (data: ShippingFormData) => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/shipping/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const resData = await response.json();

      if (response.ok) {
        setSuccessMessage('✅ تم تسجيل الشحنة بنجاح وترحيل القيد المحاسبي!');
        reset({
          driverName: '',
          vehicleNumber: '',
          loadQuantity: undefined as any,
          factoryPricePerTon: 488.48,
          salePriceDifference: 0,
          aramiat: 0,
          equipmentCost: 0,
          transportationCost: 0,
          totalSaleAmount: 0,
          invoiceNumber: '',
          notes: '',
          transactionDate: new Date().toISOString().split('T')[0]
        });
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(resData.error || 'حدث خطأ أثناء تسجيل الشحنة');
      }
    } catch (error) {
      console.error('❌ فشل تسجيل الشحنة:', error);
      setErrorMessage('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const basePriceComputed = (Number(watchedValues.loadQuantity) || 0) * (Number(watchedValues.factoryPricePerTon) || 0);

  return (
    <div className={isModal ? "space-y-4" : "p-6 bg-[#161622]/30 border border-[#23232F] rounded-2xl"}>
      {!isModal && (
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🚛</span> تسجيل شحنة نقل خردة وجلخ جديدة
        </h3>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {successMessage && (
          <div className="p-3 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 text-xs flex items-start">
            <CheckCircle className="w-4 h-4 ml-2 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded bg-red-950/40 text-red-400 border border-red-500/20 text-xs flex items-start">
            <AlertCircle className="w-4 h-4 ml-2 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ==================== بيانات الشحنة الأساسية ==================== */}
        <div className="bg-[#1C1C28]/60 p-5 rounded-xl border border-[#23232F] space-y-4">
          <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
            <span>📋</span> بيانات الشحنة الأساسية
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 👤 اسم السائق */}
            <div>
              <Input
                label="👤 اسم السائق المسؤول *"
                placeholder="أدخل اسم السائق"
                className="bg-[#13131A] text-white"
                error={errors.driverName?.message}
                {...register('driverName')}
              />
            </div>

            {/* 🚗 رقم السيارة */}
            <div>
              <Input
                label="🚗 رقم السيارة *"
                placeholder="مثال: س ص ١٢٣٤"
                className="bg-[#13131A] text-white"
                error={errors.vehicleNumber?.message}
                {...register('vehicleNumber')}
              />
            </div>

            {/* 📦 كمية الحمولة */}
            <div>
              <Input
                label="📦 كمية الحمولة (طن) *"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.loadQuantity?.message}
                {...register('loadQuantity', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>

            {/* 💰 سعر الطن في المصنع */}
            <div>
              <Input
                label="💰 سعر الطن في المصنع *"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.factoryPricePerTon?.message}
                {...register('factoryPricePerTon', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>
          </div>
        </div>

        {/* ==================== البيانات المالية ==================== */}
        <div className="bg-[#1C1C28]/60 p-5 rounded-xl border border-[#23232F] space-y-4">
          <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <span>💵</span> البيانات والخدمات المالية الإضافية
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 📈 فرق سعر البيع */}
            <div>
              <Input
                label="📈 فرق سعر البيع الإضافي"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.salePriceDifference?.message}
                {...register('salePriceDifference', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>

            {/* ⚙️ الأراميات */}
            <div>
              <Input
                label="⚙️ الأراميات (مصاريف إضافية)"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.aramiat?.message}
                {...register('aramiat', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>

            {/* 🔧 المعدات */}
            <div>
              <Input
                label="🔧 تكلفة المعدات واللوادر"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.equipmentCost?.message}
                {...register('equipmentCost', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>

            {/* 🚛 النقل */}
            <div>
              <Input
                label="🚛 تكلفة النقل البري الملحق"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#13131A] text-white font-mono"
                error={errors.transportationCost?.message}
                {...register('transportationCost', { 
                  valueAsNumber: true,
                  onChange: triggerAutoCalc
                })}
              />
            </div>
          </div>
        </div>

        {/* ==================== الإجمالي النهائي ==================== */}
        <div className="bg-purple-950/20 p-5 rounded-xl border border-purple-500/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white">
              <span className="text-base font-bold block">💲 إجمالي القيمة والبيع للرحلة:</span>
              <span className="text-xs text-[#A0A0B0] mt-1 block">تحتسب تلقائياً من المعادلة المالية</span>
            </div>
            
            <div className="text-center md:text-left">
              <div className="text-2xl font-black text-purple-400 font-mono">
                {(Number(watchedValues.totalSaleAmount) || 0).toLocaleString()} <span className="text-xs font-semibold font-sans">ج.م</span>
              </div>
              <div className="text-[10px] text-[#A0A0B0] mt-1 font-mono">
                القيمة الأساسية: {basePriceComputed.toLocaleString()} ج.م
              </div>
            </div>

            <button
              type="button"
              onClick={triggerAutoCalc}
              className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800 border border-purple-500/30 rounded-lg text-white transition flex items-center gap-2 text-xs font-bold font-sans cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث الحساب التلقائي</span>
            </button>
          </div>
        </div>

        {/* ==================== بيانات إضافية ==================== */}
        <div className="bg-[#1C1C28]/60 p-5 rounded-xl border border-[#23232F] space-y-4">
          <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
            <span>📝</span> بيانات التوثيق والتاريخ
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* رقم الفاتورة */}
            <div>
              <Input
                label="📄 رقم الفاتورة أو المستند"
                placeholder="INV-2026-001"
                className="bg-[#13131A] text-white"
                error={errors.invoiceNumber?.message}
                {...register('invoiceNumber')}
              />
            </div>

            {/* تاريخ التوريد */}
            <div>
              <Input
                label="📅 تاريخ الحركة المالية"
                type="date"
                className="bg-[#13131A] text-white"
                error={errors.transactionDate?.message}
                {...register('transactionDate')}
              />
            </div>

            {/* ملاحظات */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#A0A0B0] mb-1">📝 ملاحظات إضافية</label>
              <textarea
                className="w-full px-3 py-2 bg-[#13131A] border border-[#23232F] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                placeholder="أدخل أي ملاحظات توريد، نوع الخردة، أو جهة الحمولة..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </div>
        </div>

        {/* ==================== أزرار التحكم ==================== */}
        <div className="flex gap-4 pt-2">
          <Button
            type="submit"
            className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-sm"
            loading={loading}
          >
            {loading ? 'جاري الحفظ والترحيل...' : '💾 حفظ وترحيل الشحنة للدفاتر'}
          </Button>
          <button
            type="button"
            onClick={() => {
              reset();
              triggerAutoCalc();
            }}
            className="px-6 py-2 bg-[#23232F] hover:bg-[#2D2D3F] border border-[#2D2D3F] text-white rounded-lg text-sm transition"
          >
            🔄 إعادة تعيين
          </button>
        </div>
      </form>
    </div>
  );
};
