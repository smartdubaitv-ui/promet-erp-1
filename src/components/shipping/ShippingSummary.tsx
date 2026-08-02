import React from 'react';
import { Card } from '../ui/Card';
import { Truck, Scale, Coins, User, TrendingUp } from 'lucide-react';

export interface ShippingTransaction {
  id: string;
  driverName: string;
  vehicleNumber: string;
  loadQuantity: number;
  factoryPricePerTon: number;
  salePriceDifference: number;
  aramiat: number;
  equipmentCost: number;
  transportationCost: number;
  totalSaleAmount: number;
  transactionDate: string;
  invoiceNumber?: string;
  notes?: string;
}

interface ShippingSummaryProps {
  transactions: ShippingTransaction[];
}

export const ShippingSummary: React.FC<ShippingSummaryProps> = ({ transactions }) => {
  // Statistics and Calculations
  const totalQuantity = transactions.reduce((sum, t) => sum + Number(t.loadQuantity || 0), 0);
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.totalSaleAmount || 0), 0);
  const totalExpenses = transactions.reduce((sum, t) => {
    return sum + Number(t.aramiat || 0) + Number(t.equipmentCost || 0) + Number(t.transportationCost || 0);
  }, 0);
  
  const avgPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
  
  // Most Active Drivers
  const topDrivers = transactions.reduce((acc, t) => {
    acc[t.driverName] = (acc[t.driverName] || 0) + Number(t.loadQuantity || 0);
    return acc;
  }, {} as Record<string, number>);

  const sortedDrivers = Object.entries(topDrivers)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Cards stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quantity */}
        <Card className="p-4 bg-[#161622]/40 border border-[#23232F] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A0A0B0] mb-1">إجمالي الحمولة المنقولة</p>
            <p className="text-xl font-black text-white font-mono">{totalQuantity.toFixed(2)} <span className="text-xs font-sans text-[#A0A0B0]">طن</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="p-4 bg-[#161622]/40 border border-[#23232F] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A0A0B0] mb-1">إجمالي مبيعات الجلخ والخرام</p>
            <p className="text-xl font-black text-emerald-400 font-mono">{totalAmount.toLocaleString()} <span className="text-xs font-sans text-[#A0A0B0]">ج.م</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
        </Card>

        {/* Expenses / Operating Fees */}
        <Card className="p-4 bg-[#161622]/40 border border-[#23232F] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A0A0B0] mb-1">إجمالي أراميات ومصاريف النقل</p>
            <p className="text-xl font-black text-amber-400 font-mono">{totalExpenses.toLocaleString()} <span className="text-xs font-sans text-[#A0A0B0]">ج.م</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
        </Card>

        {/* Average Price */}
        <Card className="p-4 bg-[#161622]/40 border border-[#23232F] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#A0A0B0] mb-1">متوسط العائد التقديري للطن</p>
            <p className="text-xl font-black text-blue-400 font-mono">{avgPrice.toFixed(2)} <span className="text-xs font-sans text-[#A0A0B0]">ج.م/طن</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Drivers Leaderboard */}
        <Card className="p-5 bg-[#161622]/30 border border-[#23232F]">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>🏆 السائقون الأكثر نشاطاً ونقلاً للحمولات</span>
          </h4>
          
          <div className="space-y-3.5">
            {sortedDrivers.length === 0 ? (
              <p className="text-xs text-[#A0A0B0] py-4 text-center">لا توجد بيانات للسائقين حالياً</p>
            ) : (
              sortedDrivers.map(([name, quantity], index) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-[#23232F]/60 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black font-mono">
                      {index + 1}
                    </span>
                    <span className="text-sm text-white font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-sm text-purple-400 font-bold">{Number(quantity).toFixed(2)}</span>
                    <span className="text-[10px] text-[#A0A0B0] font-sans">طن</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Calculations Formula Insight */}
        <Card className="p-5 bg-[#161622]/30 border border-[#23232F] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>📊</span> تفاصيل المعادلة المالية وتوزيع الإضافات
            </h4>
            <p className="text-xs text-[#A0A0B0] leading-relaxed mb-4">
              تحتسب القيمة التراكمية للرحلة بناءً على السعر الأساسي للطن في المصنع مضافاً إليه فرق سعر البيع والمصاريف الإضافية (الأراميات، المعدات، النقل البري) التي يتم قيدها مباشرة كعائدات ومصروفات تشغيلية في شجرة الحسابات والدفتر العام.
            </p>
          </div>
          
          <div className="bg-[#1C1C28]/60 p-4 rounded-xl border border-[#23232F] space-y-2 text-xs font-mono">
            <div className="flex justify-between text-white">
              <span>القيمة الأساسية للطن:</span>
              <span className="text-[#A0A0B0]">الكمية (طن) × سعر المصنع للطن</span>
            </div>
            <div className="flex justify-between text-white">
              <span>المصاريف والتشغيل:</span>
              <span className="text-[#A0A0B0]">الأراميات + المعدات + النقل</span>
            </div>
            <div className="flex justify-between text-purple-400 font-bold pt-1.5 border-t border-[#23232F]">
              <span>إجمالي البيع المرحل:</span>
              <span>القيمة الأساسية + الفروقات + المصاريف</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
