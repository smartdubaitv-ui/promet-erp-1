import { Request, Response } from 'express';
import { jsonDB } from '../data/jsonDatabase';

function getLocalDatabase() {
  return jsonDB.load();
}

function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

const DEFAULT_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'مباني ومنشآت',
    code: 'BLD',
    description: 'المباني الإدارية والمستودعات والإنشاءات',
    depreciation_method: 'straight_line',
    useful_life_years: 20,
    salvage_value_percent: 20,
    depreciation_rate: 5.0
  },
  {
    id: 'cat-2',
    name: 'آلات ومعدات مصانع',
    code: 'MCH',
    description: 'خطوط الإنتاج، مكابس الخردة، الموازين الجسرية',
    depreciation_method: 'straight_line',
    useful_life_years: 10,
    salvage_value_percent: 10,
    depreciation_rate: 10.0
  },
  {
    id: 'cat-3',
    name: 'أجهزة حاسوب وتكنولوجيا',
    code: 'IT',
    description: 'أجهزة الكمبيوتر، السيرفرات، شبكات الاتصال',
    depreciation_method: 'straight_line',
    useful_life_years: 3,
    salvage_value_percent: 5,
    depreciation_rate: 33.33
  },
  {
    id: 'cat-4',
    name: 'سيارات وسيارات نقل',
    code: 'VEH',
    description: 'شاحنات نقل الخردة، سيارات الإدارة',
    depreciation_method: 'declining_balance',
    useful_life_years: 5,
    salvage_value_percent: 15,
    depreciation_rate: 20.0
  },
  {
    id: 'cat-5',
    name: 'أثاث ومفروشات مكتبية',
    code: 'FUR',
    description: 'مكاتب، خزائن، تجهيزات المكاتب',
    depreciation_method: 'straight_line',
    useful_life_years: 7,
    salvage_value_percent: 10,
    depreciation_rate: 14.28
  }
];

const DEFAULT_ASSETS = [
  {
    id: 'ast-1',
    asset_code: 'AST-BLD-001',
    code: 'AST-BLD-001',
    name: 'مستودع الخردة الرئيسي وميزان القبان',
    description: 'مستودع تخزين مواد الخردة المكشوف والمغطى مع مبنى الإدارة والميزان',
    category_id: 'cat-1',
    category_name: 'مباني ومنشآت',
    purchase_date: '2023-01-15',
    purchase_invoice_id: 'inv-101',
    supplier_id: 'sup-1',
    supplier_name: 'شركة المقاولات الحديثة',
    purchase_cost: 1500000,
    additional_costs: 50000,
    total_cost: 1550000,
    depreciation_method: 'straight_line',
    useful_life_years: 20,
    salvage_value: 310000,
    depreciation_rate: 5.0,
    accumulated_depreciation: 155000,
    net_book_value: 1395000,
    status: 'active',
    location: 'المصنع الرئيسي - الرياض',
    department_id: 'dept-1',
    department_name: 'الإدارة العامة والصيانة',
    employee_id: 'emp-1',
    employee_name: 'أحمد حماد',
    depreciation_start_date: '2023-01-15',
    last_depreciation_date: '2025-01-01',
    notes: 'أصل رئيسي مسجل بدفتر الأستاذ',
    years_used: 2,
    remaining_years: 18,
    depreciation_percent: 10.0
  },
  {
    id: 'ast-2',
    asset_code: 'AST-MCH-001',
    code: 'AST-MCH-001',
    name: 'مكبس خردة هيدروليكي 500 طن',
    description: 'مكبس آلي لضغط وكبس خردة المعادن والألومنيوم',
    category_id: 'cat-2',
    category_name: 'آلات ومعدات مصانع',
    purchase_date: '2023-06-10',
    purchase_invoice_id: 'inv-102',
    supplier_id: 'sup-2',
    supplier_name: 'الشركة الألمانية للآلات',
    purchase_cost: 800000,
    additional_costs: 25000,
    total_cost: 825000,
    depreciation_method: 'straight_line',
    useful_life_years: 10,
    salvage_value: 82500,
    depreciation_rate: 10.0,
    accumulated_depreciation: 165000,
    net_book_value: 660000,
    status: 'active',
    location: 'صالة الفرز والتدوير',
    department_id: 'dept-2',
    department_name: 'العمليات والإنتاج',
    employee_id: 'emp-2',
    employee_name: 'محمد خالد',
    depreciation_start_date: '2023-06-10',
    last_depreciation_date: '2025-01-01',
    notes: 'يعمل بكفاءة عالية',
    years_used: 1.5,
    remaining_years: 8.5,
    depreciation_percent: 20.0
  },
  {
    id: 'ast-3',
    asset_code: 'AST-VEH-001',
    code: 'AST-VEH-001',
    name: 'شاحنة نقل ثقيل مرسيدس أتروس',
    description: 'شاحنة قلاب لنقل الخردة والمخلفات الصناعية',
    category_id: 'cat-4',
    category_name: 'سيارات وسيارات نقل',
    purchase_date: '2024-03-20',
    purchase_invoice_id: 'inv-103',
    supplier_id: 'sup-3',
    supplier_name: 'وكالة السيارات السعودية',
    purchase_cost: 450000,
    additional_costs: 10000,
    total_cost: 460000,
    depreciation_method: 'declining_balance',
    useful_life_years: 5,
    salvage_value: 69000,
    depreciation_rate: 20.0,
    accumulated_depreciation: 92000,
    net_book_value: 368000,
    status: 'active',
    location: 'الأسطول والنقل',
    department_id: 'dept-3',
    department_name: 'الخدمات اللوجستية',
    employee_id: 'emp-3',
    employee_name: 'سالم الدوسري',
    depreciation_start_date: '2024-03-20',
    last_depreciation_date: '2025-01-01',
    notes: 'مرخصة ومؤمنة بالكامل',
    years_used: 1,
    remaining_years: 4,
    depreciation_percent: 20.0
  }
];

export const getAssets = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const db = getLocalDatabase();
    if (!db.fixed_assets) {
      db.fixed_assets = DEFAULT_ASSETS;
      saveLocalDatabase(db);
    }
    const assets = (db.fixed_assets || []).filter((a: any) => !a.tenantId || a.tenantId === tenantId);
    return res.json(assets);
  } catch (err: any) {
    console.error('Error in getAssets:', err);
    return res.status(500).json({ error: err.message || 'خطأ في جلب الأصول' });
  }
};

export const getAssetCategories = async (req: Request, res: Response) => {
  try {
    const db = getLocalDatabase();
    if (!db.asset_categories || db.asset_categories.length === 0) {
      db.asset_categories = DEFAULT_CATEGORIES;
      saveLocalDatabase(db);
    }
    return res.json(db.asset_categories);
  } catch (err: any) {
    console.error('Error in getAssetCategories:', err);
    return res.status(500).json({ error: err.message || 'خطأ في جلب تصنيفات الأصول' });
  }
};

export const getAssetsSummary = async (req: Request, res: Response) => {
  try {
    const db = getLocalDatabase();
    const assets = db.fixed_assets || DEFAULT_ASSETS;
    const total_assets = assets.length;
    let total_cost = 0;
    let total_depreciation = 0;
    let total_net_book_value = 0;
    let active_assets = 0;
    let fully_depreciated = 0;
    let sold_assets = 0;

    assets.forEach((a: any) => {
      const cost = Number(a.total_cost || a.purchase_cost || 0);
      const dep = Number(a.accumulated_depreciation || 0);
      const nbv = Number(a.net_book_value || (cost - dep));
      total_cost += cost;
      total_depreciation += dep;
      total_net_book_value += nbv;

      if (a.status === 'active') active_assets++;
      else if (a.status === 'depreciated') fully_depreciated++;
      else if (a.status === 'sold' || a.status === 'disposed') sold_assets++;
    });

    return res.json({
      total_assets,
      total_cost,
      total_depreciation,
      total_net_book_value,
      active_assets,
      fully_depreciated,
      sold_assets
    });
  } catch (err: any) {
    console.error('Error in getAssetsSummary:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getCurrentAssetsSummary = async (req: Request, res: Response) => {
  try {
    const db = getLocalDatabase();
    const accounts = db.accounts || [];
    let cash = 125000;
    let bank = 4850000;
    let receivable = 320000;
    let inventory = 890000;

    accounts.forEach((acc: any) => {
      const bal = Number(acc.balance || 0);
      if (acc.code?.startsWith('111') || acc.name?.includes('صندوق') || acc.name?.includes('نقد')) cash += bal;
      if (acc.code?.startsWith('112') || acc.name?.includes('بنك') || acc.name?.includes('مصرف')) bank += bal;
      if (acc.code?.startsWith('113') || acc.name?.includes('عملاء')) receivable += bal;
      if (acc.code?.startsWith('114') || acc.name?.includes('مخزون')) inventory += bal;
    });

    const total = cash + bank + receivable + inventory;
    return res.json({
      cash,
      bank,
      receivable,
      inventory,
      total
    });
  } catch (err: any) {
    console.error('Error in getCurrentAssetsSummary:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const {
      name,
      description,
      category_id,
      purchase_date,
      purchase_cost,
      additional_costs,
      useful_life_years,
      salvage_value,
      depreciation_method,
      supplier_id,
      location,
      department_id,
      employee_id,
      notes
    } = req.body;

    if (!name || !category_id || !purchase_cost) {
      return res.status(400).json({ error: 'اسم الأصل والتصنيف وتكلفة الشراء حقول مطلوبة' });
    }

    const db = getLocalDatabase();
    if (!db.fixed_assets) db.fixed_assets = DEFAULT_ASSETS;
    if (!db.asset_categories) db.asset_categories = DEFAULT_CATEGORIES;

    const cat = db.asset_categories.find((c: any) => c.id === category_id);
    const category_name = cat ? cat.name : 'أصل عام';

    const pCost = Number(purchase_cost) || 0;
    const addCost = Number(additional_costs) || 0;
    const totalCost = pCost + addCost;
    const lifeYears = Number(useful_life_years) || 5;
    const salvVal = Number(salvage_value) || Math.round(totalCost * 0.1);
    const depRate = lifeYears > 0 ? Number((100 / lifeYears).toFixed(2)) : 10;

    const newId = `ast-${Date.now()}`;
    const assetCode = `AST-${cat?.code || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`;

    const newAsset = {
      id: newId,
      asset_code: assetCode,
      code: assetCode,
      name,
      description: description || '',
      category_id,
      category_name,
      purchase_date: purchase_date || new Date().toISOString().slice(0, 10),
      purchase_invoice_id: `inv-${Date.now()}`,
      supplier_id: supplier_id || '',
      supplier_name: 'مورد معتمد',
      purchase_cost: pCost,
      additional_costs: addCost,
      total_cost: totalCost,
      depreciation_method: depreciation_method || cat?.depreciation_method || 'straight_line',
      useful_life_years: lifeYears,
      salvage_value: salvVal,
      depreciation_rate: depRate,
      accumulated_depreciation: 0,
      net_book_value: totalCost,
      status: 'active',
      location: location || 'المصنع الرئيسي',
      department_id: department_id || '',
      department_name: 'القسم الرئيسي',
      employee_id: employee_id || '',
      employee_name: 'المسؤول المعين',
      depreciation_start_date: purchase_date || new Date().toISOString().slice(0, 10),
      last_depreciation_date: '-',
      notes: notes || '',
      years_used: 0,
      remaining_years: lifeYears,
      depreciation_percent: 0,
      tenantId
    };

    db.fixed_assets.unshift(newAsset);
    saveLocalDatabase(db);

    return res.status(201).json({
      success: true,
      message: '✅ تم تسجيل الأصل الثابت بنجاح',
      asset: newAsset
    });
  } catch (err: any) {
    console.error('Error creating asset:', err);
    return res.status(500).json({ error: err.message || 'خطأ في إنشاء الأصل' });
  }
};

export const calculateDepreciation = async (req: Request, res: Response) => {
  try {
    const db = getLocalDatabase();
    if (!db.fixed_assets) db.fixed_assets = DEFAULT_ASSETS;

    let totalDepAmount = 0;
    db.fixed_assets.forEach((a: any) => {
      if (a.status === 'active') {
        const cost = Number(a.total_cost || a.purchase_cost || 0);
        const salvage = Number(a.salvage_value || 0);
        const life = Number(a.useful_life_years || 5);
        if (life > 0 && cost > salvage) {
          const annualDep = (cost - salvage) / life;
          const monthlyDep = annualDep / 12;
          const currentDep = Number(a.accumulated_depreciation || 0);
          const maxDep = cost - salvage;

          if (currentDep < maxDep) {
            const newDep = Math.min(maxDep, currentDep + monthlyDep);
            a.accumulated_depreciation = Number(newDep.toFixed(2));
            a.net_book_value = Number((cost - a.accumulated_depreciation).toFixed(2));
            a.depreciation_percent = Number(((a.accumulated_depreciation / cost) * 100).toFixed(1));
            totalDepAmount += monthlyDep;
            if (a.accumulated_depreciation >= maxDep) {
              a.status = 'depreciated';
            }
          }
        }
      }
    });

    saveLocalDatabase(db);
    return res.json({
      success: true,
      message: `✅ تم حساب وإثبات الإهلاك الشهري بقيمة إجمالية ${Math.round(totalDepAmount).toLocaleString()} ج.م بنجاح`,
      total_depreciation_recorded: totalDepAmount
    });
  } catch (err: any) {
    console.error('Error calculating depreciation:', err);
    return res.status(500).json({ error: err.message || 'خطأ في حساب الإهلاك' });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getLocalDatabase();
    if (!db.fixed_assets) db.fixed_assets = DEFAULT_ASSETS;

    const idx = db.fixed_assets.findIndex((a: any) => String(a.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'الأصل غير موجود' });
    }

    const currentAsset = db.fixed_assets[idx];
    const {
      name,
      description,
      category_id,
      purchase_date,
      purchase_cost,
      additional_costs,
      useful_life_years,
      salvage_value,
      depreciation_method,
      supplier_id,
      location,
      department_id,
      employee_id,
      notes,
      status
    } = req.body;

    let category_name = currentAsset.category_name;
    if (category_id && category_id !== currentAsset.category_id) {
      const cat = (db.asset_categories || DEFAULT_CATEGORIES).find((c: any) => c.id === category_id);
      if (cat) category_name = cat.name;
    }

    const pCost = purchase_cost !== undefined ? Number(purchase_cost) : currentAsset.purchase_cost;
    const addCost = additional_costs !== undefined ? Number(additional_costs) : currentAsset.additional_costs;
    const totalCost = pCost + addCost;
    const lifeYears = useful_life_years !== undefined ? Number(useful_life_years) : currentAsset.useful_life_years;
    const salvVal = salvage_value !== undefined ? Number(salvage_value) : currentAsset.salvage_value;
    const depRate = lifeYears > 0 ? Number((100 / lifeYears).toFixed(2)) : currentAsset.depreciation_rate;

    const accumulated_dep = currentAsset.accumulated_depreciation || 0;
    const netBookVal = Math.max(0, totalCost - accumulated_dep);
    const depPercent = totalCost > 0 ? Number(((accumulated_dep / totalCost) * 100).toFixed(1)) : 0;

    db.fixed_assets[idx] = {
      ...currentAsset,
      name: name !== undefined ? name : currentAsset.name,
      description: description !== undefined ? description : currentAsset.description,
      category_id: category_id || currentAsset.category_id,
      category_name,
      purchase_date: purchase_date || currentAsset.purchase_date,
      purchase_cost: pCost,
      additional_costs: addCost,
      total_cost: totalCost,
      useful_life_years: lifeYears,
      salvage_value: salvVal,
      depreciation_rate: depRate,
      depreciation_method: depreciation_method || currentAsset.depreciation_method,
      supplier_id: supplier_id !== undefined ? supplier_id : currentAsset.supplier_id,
      location: location !== undefined ? location : currentAsset.location,
      department_id: department_id !== undefined ? department_id : currentAsset.department_id,
      employee_id: employee_id !== undefined ? employee_id : currentAsset.employee_id,
      notes: notes !== undefined ? notes : currentAsset.notes,
      status: status || currentAsset.status,
      net_book_value: netBookVal,
      depreciation_percent: depPercent
    };

    saveLocalDatabase(db);
    return res.json({
      success: true,
      message: '✅ تم تحديث بيانات الأصل بنجاح',
      asset: db.fixed_assets[idx]
    });
  } catch (err: any) {
    console.error('Error updating asset:', err);
    return res.status(500).json({ error: err.message || 'خطأ في تعديل الأصل' });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getLocalDatabase();
    if (!db.fixed_assets) db.fixed_assets = DEFAULT_ASSETS;

    const idx = db.fixed_assets.findIndex((a: any) => String(a.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'الأصل غير موجود' });
    }

    db.fixed_assets.splice(idx, 1);
    saveLocalDatabase(db);

    return res.json({
      success: true,
      message: '🗑️ تم حذف الأصل الثابت بنجاح'
    });
  } catch (err: any) {
    console.error('Error deleting asset:', err);
    return res.status(500).json({ error: err.message || 'خطأ في حذف الأصل' });
  }
};

export const disposeAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { disposal_type, sale_amount, notes, disposal_date } = req.body;
    const db = getLocalDatabase();
    if (!db.fixed_assets) db.fixed_assets = DEFAULT_ASSETS;

    const idx = db.fixed_assets.findIndex((a: any) => String(a.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'الأصل غير موجود' });
    }

    const currentAsset = db.fixed_assets[idx];
    const newStatus = disposal_type === 'sale' ? 'sold' : 'disposed';

    db.fixed_assets[idx] = {
      ...currentAsset,
      status: newStatus,
      disposal_date: disposal_date || new Date().toISOString().slice(0, 10),
      sale_amount: Number(sale_amount) || 0,
      disposal_notes: notes || ''
    };

    saveLocalDatabase(db);

    return res.json({
      success: true,
      message: 'تم استبعاد/بيع الأصل بنجاح',
      asset: db.fixed_assets[idx]
    });
  } catch (err: any) {
    console.error('Error disposing asset:', err);
    return res.status(500).json({ error: err.message || 'خطأ أثناء استبعاد الأصل' });
  }
};

