import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import fs from 'fs';
import path from 'path';

import { jsonDB } from '../data/jsonDatabase';

// Helper to read local database.json safely
function getLocalDatabase(): any {
  return jsonDB.load();
}

// Helper to write local database.json safely
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

// Helper to log audit trail
async function logAuditHelper(action: {
  userId?: string;
  userName?: string;
  userRole?: string;
  actionType: string;
  tableName: string;
  recordId?: any;
  recordIdentifier?: string;
  description: string;
}) {
  const timestamp = new Date().toISOString();
  if (isFirebaseConnected() && firestore) {
    try {
      await firestore.collection('audit_log').add({
        session_id: `sess-${Date.now()}`,
        user_id: action.userId || 'u-1',
        user_name: action.userName || 'أحمد حماد',
        user_role: action.userRole || 'admin',
        action_type: action.actionType,
        table_name: action.tableName,
        record_id: String(action.recordId || ''),
        record_identifier: action.recordIdentifier || '',
        description: action.description,
        timestamp,
        status: 'success'
      });
    } catch (e) {
      console.error('Failed to log audit to Firebase:', e);
    }
  } else {
    const dbData = getLocalDatabase();
    if (!dbData.audit_log) dbData.audit_log = [];
    const newId = dbData.audit_log.length > 0 ? Math.max(...dbData.audit_log.map((l: any) => Number(l.id || 0))) + 1 : 1;
    dbData.audit_log.push({
      id: newId,
      session_id: `sess-${Date.now()}`,
      user_id: action.userId || 'u-1',
      user_name: action.userName || 'أحمد حماد',
      user_role: action.userRole || 'admin',
      action_type: action.actionType,
      table_name: action.tableName,
      record_id: action.recordId || '',
      record_identifier: action.recordIdentifier || '',
      description: action.description,
      timestamp,
      status: 'success'
    });
    saveLocalDatabase(dbData);
  }
}

// Helper to get collection data
async function getCollectionData(collectionName: string, tenantId: string): Promise<any[]> {
  try {
    if (isFirebaseConnected() && firestore) {
      const snap = await firestore.collection(collectionName).where('tenantId', '==', tenantId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      return (db[collectionName] || []).filter((item: any) => item.tenantId === tenantId);
    }
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} for tenant ${tenantId}:`, error);
    return [];
  }
}

// Helper to save item to collection
async function saveCollectionItem(collectionName: string, item: any, tenantId: string): Promise<any> {
  const dataWithTenant = { ...item, tenantId };
  if (isFirebaseConnected() && firestore) {
    if (dataWithTenant.id) {
      await firestore.collection(collectionName).doc(dataWithTenant.id).set(dataWithTenant, { merge: true });
    } else {
      const docRef = await firestore.collection(collectionName).add(dataWithTenant);
      dataWithTenant.id = docRef.id;
      await docRef.update({ id: docRef.id });
    }
  } else {
    const db = getLocalDatabase();
    if (!db[collectionName]) db[collectionName] = [];
    if (dataWithTenant.id) {
      const idx = db[collectionName].findIndex((x: any) => x.id === dataWithTenant.id);
      if (idx !== -1) {
        db[collectionName][idx] = { ...db[collectionName][idx], ...dataWithTenant };
      } else {
        db[collectionName].push(dataWithTenant);
      }
    } else {
      dataWithTenant.id = `${collectionName}-${Date.now()}`;
      db[collectionName].push(dataWithTenant);
    }
    saveLocalDatabase(db);
  }
  return dataWithTenant;
}

// Map fields to have both styles for backward compatibility
function mapTransactionFields(s: any): any {
  const driver = s.driverName || s.driver_name || "";
  const car = s.vehicleNumber || s.car_number || "";
  const qty = Number(s.loadQuantity !== undefined ? s.loadQuantity : (s.quantity !== undefined ? s.quantity : 0));
  const fPrice = Number(s.factoryPricePerTon !== undefined ? s.factoryPricePerTon : (s.factory_price_per_ton !== undefined ? s.factory_price_per_ton : 0));
  const diff = Number(s.salePriceDifference !== undefined ? s.salePriceDifference : (s.selling_price_diff !== undefined ? s.selling_price_diff : 0));
  const aram = Number(s.aramiat !== undefined ? s.aramiat : (s.aramiyat !== undefined ? s.aramiyat : 0));
  const equip = Number(s.equipmentCost !== undefined ? s.equipmentCost : (s.equipment_cost !== undefined ? s.equipment_cost : 0));
  const trans = Number(s.transportationCost !== undefined ? s.transportationCost : (s.transportation_cost !== undefined ? s.transportation_cost : 0));
  const totalSale = Number(s.totalSaleAmount !== undefined ? s.totalSaleAmount : (s.total_sales !== undefined ? s.total_sales : (qty * fPrice + diff + aram + equip + trans)));
  const dateStr = s.transactionDate || s.date || new Date().toISOString().split('T')[0];
  const dateObj = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString().split('T')[0];

  return {
    id: s.id,
    tenantId: s.tenantId,
    
    // CamelCase fields for custom form & model
    driverName: driver,
    vehicleNumber: car,
    loadQuantity: qty,
    factoryPricePerTon: fPrice,
    salePriceDifference: diff,
    aramiat: aram,
    equipmentCost: equip,
    transportationCost: trans,
    totalSaleAmount: totalSale,
    transactionDate: dateObj,
    invoiceNumber: s.invoiceNumber || s.invoice_number || "",
    status: s.status || "APPROVED",
    notes: s.notes || "",
    metadata: s.metadata || { transactionType: 'SCRAP', weightUnit: 'TON' },
    createdAt: s.createdAt || s.created_at || new Date().toISOString(),
    updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
    createdBy: s.createdBy || "",
    approvedBy: s.approvedBy || "",
    approvedAt: s.approvedAt || null,

    // Snake case for existing UI logic compatibility
    driver_name: driver,
    car_number: car,
    quantity: qty,
    factory_price_per_ton: fPrice,
    selling_price_diff: diff,
    aramiyat: aram,
    equipment_cost: equip,
    transportation_cost: trans,
    total_sales: totalSale,
    date: dateObj,
    created_at: s.createdAt || s.created_at || new Date().toISOString()
  };
}

// 1. Create a Shipping Transaction
export const createTransaction = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const rawData = req.body;
    
    // Basic validation
    const driver = rawData.driverName || rawData.driver_name;
    const vehicle = rawData.vehicleNumber || rawData.car_number;
    const qty = Number(rawData.loadQuantity !== undefined ? rawData.loadQuantity : rawData.quantity);
    const fPrice = Number(rawData.factoryPricePerTon !== undefined ? rawData.factoryPricePerTon : rawData.factory_price_per_ton);

    if (!driver || !vehicle || isNaN(qty) || qty <= 0 || isNaN(fPrice) || fPrice <= 0) {
      return res.status(400).json({ error: 'اسم السائق ورقم السيارة والكمية وسعر الطن حقول مطلوبة ويجب أن تكون قيم موجبة' });
    }

    const itemMapped = mapTransactionFields({
      ...rawData,
      tenantId,
      id: `shipping-${Date.now()}`
    });

    const savedItem = await saveCollectionItem('shipping_transactions', itemMapped, tenantId);

    // Double Entry Accounting integration for automated record keeping
    const entryId = `entry-shipping-${Date.now()}`;
    const description = `إثبات شحنة توريد خردة جلخ - سيارة ${savedItem.vehicleNumber} - سائق ${savedItem.driverName}`;

    const newEntry = {
      id: entryId,
      tenantId,
      entry_date: savedItem.transactionDate,
      description,
      reference_type: "shipping_transaction",
      reference_id: savedItem.id,
      created_at: new Date().toISOString()
    };

    await saveCollectionItem('accountingEntries', newEntry, tenantId);

    const details = [];
    // 1. Debit Account: Inventory Scrap (1311) - Amount representing the value of the scrap material
    details.push({
      id: `det-${Date.now()}-1`,
      entry_id: entryId,
      account_code: "1311",
      account_name: "مخزون الخردة (مواد خام)",
      debit: savedItem.totalSaleAmount,
      credit: 0,
      notes: `توريد جلخ حمولة ${savedItem.loadQuantity} طن بسعر مصنع ${savedItem.factoryPricePerTon} ج.م`
    });

    // 2. Credit Account: Revenue from scrap sales (4030)
    details.push({
      id: `det-${Date.now()}-2`,
      entry_id: entryId,
      account_code: "4030",
      account_name: "إيرادات بيع الخردة والمواد المعاد تدويرها",
      debit: 0,
      credit: savedItem.totalSaleAmount,
      notes: `إثبات مبيعات شحنة سيارة ${savedItem.vehicleNumber}`
    });

    // 3. Additional operating/service expenses (aramiat, equipment, transportation)
    const extraCosts = savedItem.aramiat + savedItem.equipmentCost + savedItem.transportationCost;
    if (extraCosts > 0) {
      // Debit: Cost of scrap sold / transport services (5015)
      details.push({
        id: `det-${Date.now()}-3`,
        entry_id: entryId,
        account_code: "5015",
        account_name: "تكلفة الخردة المباعة",
        debit: extraCosts,
        credit: 0,
        notes: `مصاريف تشغيلية إضافية لشحنة ${savedItem.vehicleNumber}`
      });

      // Credit: Cash in hand/vault (1020)
      details.push({
        id: `det-${Date.now()}-4`,
        entry_id: entryId,
        account_code: "1020",
        account_name: "النقدية في الصندوق (الخزينة)",
        debit: 0,
        credit: extraCosts,
        notes: `سداد مصاريف توريد شحنة سيارة ${savedItem.vehicleNumber} نقداً`
      });

      // Update balances in local/Firestore DB
      if (isFirebaseConnected() && firestore) {
        const cashSnap = await firestore.collection('accounts')
          .where('tenantId', '==', tenantId)
          .where('code', '==', '1020')
          .get();
        if (!cashSnap.empty) {
          const doc = cashSnap.docs[0];
          const b = (Number(doc.data().balance) || 0) - extraCosts;
          await doc.ref.update({ balance: b });
        }

        const costSnap = await firestore.collection('accounts')
          .where('tenantId', '==', tenantId)
          .where('code', '==', '5015')
          .get();
        if (!costSnap.empty) {
          const doc = costSnap.docs[0];
          const b = (Number(doc.data().balance) || 0) + extraCosts;
          await doc.ref.update({ balance: b });
        }
      } else {
        const db = getLocalDatabase();
        const cashAcc = (db.accounts || []).find((a: any) => a.code === "1020" && a.tenantId === tenantId);
        if (cashAcc) cashAcc.balance = (Number(cashAcc.balance) || 0) - extraCosts;
        const costAcc = (db.accounts || []).find((a: any) => a.code === "5015" && a.tenantId === tenantId);
        if (costAcc) costAcc.balance = (Number(costAcc.balance) || 0) + extraCosts;
        saveLocalDatabase(db);
      }
    }

    // Update main account balances (1311 and 4030)
    if (isFirebaseConnected() && firestore) {
      const scrapSnap = await firestore.collection('accounts')
        .where('tenantId', '==', tenantId)
        .where('code', '==', '1311')
        .get();
      if (!scrapSnap.empty) {
        const doc = scrapSnap.docs[0];
        const b = (Number(doc.data().balance) || 0) + savedItem.totalSaleAmount;
        await doc.ref.update({ balance: b });
      }

      const revSnap = await firestore.collection('accounts')
        .where('tenantId', '==', tenantId)
        .where('code', '==', '4030')
        .get();
      if (!revSnap.empty) {
        const doc = revSnap.docs[0];
        const b = (Number(doc.data().balance) || 0) + savedItem.totalSaleAmount;
        await doc.ref.update({ balance: b });
      }
    } else {
      const db = getLocalDatabase();
      const scrapAcc = (db.accounts || []).find((a: any) => a.code === "1311" && a.tenantId === tenantId);
      if (scrapAcc) scrapAcc.balance = (Number(scrapAcc.balance) || 0) + savedItem.totalSaleAmount;
      const revAcc = (db.accounts || []).find((a: any) => a.code === "4030" && a.tenantId === tenantId);
      if (revAcc) revAcc.balance = (Number(revAcc.balance) || 0) + savedItem.totalSaleAmount;
      saveLocalDatabase(db);
    }

    // Save accounting details
    for (const d of details) {
      await saveCollectionItem('accountingEntryDetails', d, tenantId);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'CREATE_SHIPPING_TX',
      tableName: 'shipping_transactions',
      recordId: savedItem.id,
      recordIdentifier: savedItem.driverName,
      description: `تم إنشاء حركة شحن جديدة للسائق "${savedItem.driverName}" وسيارة "${savedItem.vehicleNumber}" بقيمة إجمالية ${savedItem.totalSaleAmount} ج.م.`
    });

    return res.status(201).json({
      success: true,
      message: '✅ تم تسجيل الشحنة بنجاح وتوليد القيد المحاسبي المزدوج',
      transaction: savedItem
    });
  } catch (error: any) {
    console.error('Error creating shipping transaction:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 2. Get All Shipping Transactions
export const getTransactions = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const mapped = list.map(mapTransactionFields);
    mapped.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    return res.json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 3. Get Shipping Transaction by ID
export const getTransactionById = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const found = list.find(x => String(x.id) === String(id));
    if (!found) {
      return res.status(404).json({ error: 'الشحنة المطلوبة غير موجودة' });
    }
    return res.json(mapTransactionFields(found));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 4. Update Shipping Transaction
export const updateTransaction = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const found = list.find(x => String(x.id) === String(id));
    if (!found) {
      return res.status(404).json({ error: 'الشحنة غير موجودة للتعديل' });
    }

    const updatedMapped = mapTransactionFields({
      ...found,
      ...req.body,
      id,
      tenantId,
      updatedAt: new Date().toISOString()
    });

    await saveCollectionItem('shipping_transactions', updatedMapped, tenantId);

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'UPDATE_SHIPPING_TX',
      tableName: 'shipping_transactions',
      recordId: id,
      recordIdentifier: updatedMapped.driverName,
      description: `تم تعديل بيانات حركة الشحن ذات المعرف ${id} للسائق "${updatedMapped.driverName}" وسيارة "${updatedMapped.vehicleNumber}".`
    });

    return res.json({
      success: true,
      message: '✅ تم تعديل الشحنة بنجاح',
      transaction: updatedMapped
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 5. Delete Shipping Transaction
export const deleteTransaction = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const found = list.find(x => String(x.id) === String(id));
    const driverName = found ? (found.driverName || found.driver_name || "") : "";

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('shipping_transactions').doc(id).delete();
    } else {
      const db = getLocalDatabase();
      if (db.shipping_transactions) {
        db.shipping_transactions = db.shipping_transactions.filter((x: any) => String(x.id) !== String(id));
        saveLocalDatabase(db);
      }
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'DELETE_SHIPPING_TX',
      tableName: 'shipping_transactions',
      recordId: id,
      recordIdentifier: driverName,
      description: `تم حذف حركة الشحن ذات المعرف ${id} التابعة للسائق "${driverName}".`
    });

    return res.json({
      success: true,
      message: '✅ تم حذف الشحنة بنجاح من الدفاتر والمخزون'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 6. Get Daily Report
export const getDailyReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const mapped = list.map(mapTransactionFields);
    
    // Group by date
    const grouped: Record<string, { count: number, totalQty: number, totalAmount: number, transactions: any[] }> = {};
    for (const item of mapped) {
      const d = item.transactionDate;
      if (!grouped[d]) {
        grouped[d] = { count: 0, totalQty: 0, totalAmount: 0, transactions: [] };
      }
      grouped[d].count += 1;
      grouped[d].totalQty += item.loadQuantity;
      grouped[d].totalAmount += item.totalSaleAmount;
      grouped[d].transactions.push(item);
    }
    
    return res.json(grouped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 7. Get Report by Driver Name
export const getDriverReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { driverName } = req.params;
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const filtered = list.map(mapTransactionFields).filter(x => x.driverName.includes(driverName) || driverName.includes(x.driverName));
    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 8. Get Report by Vehicle Number
export const getVehicleReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { vehicleNumber } = req.params;
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const filtered = list.map(mapTransactionFields).filter(x => x.vehicleNumber.includes(vehicleNumber) || vehicleNumber.includes(x.vehicleNumber));
    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 9. Get Shipping Statistics
export const getShippingStats = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const list = await getCollectionData('shipping_transactions', tenantId);
    const mapped = list.map(mapTransactionFields);

    const totalQuantity = mapped.reduce((sum, t) => sum + t.loadQuantity, 0);
    const totalAmount = mapped.reduce((sum, t) => sum + t.totalSaleAmount, 0);
    const totalAramiat = mapped.reduce((sum, t) => sum + t.aramiat, 0);
    const totalEquipment = mapped.reduce((sum, t) => sum + t.equipmentCost, 0);
    const totalTransportation = mapped.reduce((sum, t) => sum + t.transportationCost, 0);
    const totalExpenses = totalAramiat + totalEquipment + totalTransportation;

    // Driver leaderboard
    const driverStats: Record<string, { loadQuantity: number, count: number, totalAmount: number }> = {};
    for (const t of mapped) {
      if (!driverStats[t.driverName]) {
        driverStats[t.driverName] = { loadQuantity: 0, count: 0, totalAmount: 0 };
      }
      driverStats[t.driverName].loadQuantity += t.loadQuantity;
      driverStats[t.driverName].count += 1;
      driverStats[t.driverName].totalAmount += t.totalSaleAmount;
    }

    return res.json({
      totalQuantity,
      totalAmount,
      totalExpenses,
      totalAramiat,
      totalEquipment,
      totalTransportation,
      averagePricePerTon: totalQuantity > 0 ? totalAmount / totalQuantity : 0,
      totalShipmentsCount: mapped.length,
      driverLeaderboard: Object.entries(driverStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.loadQuantity - a.loadQuantity)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
