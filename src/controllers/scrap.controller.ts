import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import fs from 'fs';
import path from 'path';

import { jsonDB } from '../data/jsonDatabase';
import { TreasuryService } from '../services/treasury.service';

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

// Unified helper to get collections safely for both Firestore and local DB, filtered by tenantId
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

// Seeding default scrap materials dynamically for any new tenant
async function ensureScrapTables(tenantId: string) {
  try {
    const materials = await getCollectionData('scrap_materials', tenantId);
    if (materials.length === 0) {
      const defaultMaterials = [
        { name: "حديد خردة (سنگين/خفيف)", category: "حديد", unit: "طن", current_price: 25000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "نحاس أحمر خردة", category: "نحاس", unit: "طن", current_price: 480000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "نحاس أصفر خردة", category: "نحاس", unit: "طن", current_price: 360000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "ألومنيوم خردة (كبائس/خام)", category: "ألومنيوم", unit: "طن", current_price: 135000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "بلاستيك ونفايات صلبة", category: "بلاستيك", unit: "طن", current_price: 18000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "خرس وركام / جلخ المصانع (Slag)", category: "خرس وركام", unit: "طن", current_price: 12000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "خردة مشكلة غير مفروزة (Raw Mixed)", category: "مشكل", unit: "طن", current_price: 20000.00, is_active: true, created_at: new Date().toISOString() },
        { name: "ورق وكرتون خردة", category: "ورق", unit: "طن", current_price: 8500.00, is_active: true, created_at: new Date().toISOString() }
      ];

      let count = 1;
      for (const m of defaultMaterials) {
        const docId = `sm-${tenantId}-${count++}`;
        await saveCollectionItem('scrap_materials', { ...m, id: docId }, tenantId);
      }
    }
  } catch (error) {
    console.error(`Error in ensureScrapTables for tenant ${tenantId}:`, error);
  }
}

export const addMaterial = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const { name, category, unit, current_price, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم المادة حقل مطلوب' });
    }

    const price = parseFloat(current_price || '0');
    const newMaterial = {
      id: `sm-${tenantId}-${Date.now()}`,
      name: name.trim(),
      category: category || 'عام',
      unit: unit || 'طن',
      current_price: isNaN(price) ? 0 : price,
      description: description || '',
      is_active: true,
      created_at: new Date().toISOString()
    };

    await saveCollectionItem('scrap_materials', newMaterial, tenantId);
    return res.status(201).json({
      success: true,
      message: '✅ تم تسجيل نوع الخردة بنجاح',
      material: newMaterial
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMaterials = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const materials = await getCollectionData('scrap_materials', tenantId);
    const activeMaterials = materials.filter((m: any) => m.is_active !== false);
    return res.json(activeMaterials);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getInventory = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const scrap_inventory = await getCollectionData('scrap_inventory', tenantId);
    const scrap_materials = await getCollectionData('scrap_materials', tenantId);
    const contacts = await getCollectionData('contacts', tenantId);

    const list = scrap_inventory.map((si: any) => {
      const material = scrap_materials.find((sm: any) => String(sm.id) === String(si.material_id));
      const contact = si.supplier_id ? contacts.find((c: any) => String(c.id) === String(si.supplier_id)) : null;
      return {
        ...si,
        material_name: material ? material.name : (si.material_name || "خردة غير معروفة"),
        material_category: material ? material.category : (si.material_category || "عام"),
        current_price: material ? material.current_price : 0,
        supplier_name: contact ? contact.name : (si.supplier_name || si.supplier_id || "مورد غير معروف")
      };
    });
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const createScrapPurchase = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const { 
      material_id, 
      weight_kg, 
      gross_weight_kg, 
      tare_weight_kg,
      impurity_deduction_kg,
      impurity_percentage,
      unit_price, 
      supplier_id, 
      supplier_name,
      contractor_name,
      driver_name,
      truck_number,
      scale_ticket_no,
      broker_name,
      commission_per_ton,
      commission_total,
      purchase_date, 
      quality, 
      notes,
      vault_id,
      vaultId
    } = req.body;

    const targetVaultId = vault_id || vaultId;

    if (!material_id || (!weight_kg && !gross_weight_kg) || !unit_price) {
      return res.status(400).json({ error: 'المادة والوزن وسعر الوحدة حقول مطلوبة' });
    }

    if (!targetVaultId) {
      return res.status(400).json({ error: 'الخزينة (vaultId) حقل إلزامي لخصم قيمة الشراء' });
    }

    // 1. Calculate Weights (Weighbridge - Scale Bridge in Tons)
    const gross = parseFloat(gross_weight_kg || '0');
    const tare = parseFloat(tare_weight_kg || '0');
    let calculatedNet = gross > 0 && tare > 0 ? (gross - tare) : parseFloat(weight_kg || '0');

    if (calculatedNet <= 0) {
      return res.status(400).json({ error: 'الوزن الصافي القائم يجب أن يكون أكبر من صفر' });
    }

    // 2. Impurity & Moisture Deductions (in Tons)
    let impurityDedKg = parseFloat(impurity_deduction_kg || '0');
    const impurityPct = parseFloat(impurity_percentage || '0');
    if (impurityPct > 0 && impurityDedKg === 0) {
      impurityDedKg = (calculatedNet * impurityPct) / 100;
    }

    const payableNetWeight = Math.max(0, calculatedNet - impurityDedKg);
    const price = parseFloat(unit_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'سعر الطن يجب أن يكون رقماً موجباً أكبر من صفر' });
    }

    const totalValue = payableNetWeight * price;

    // Execute Payment Voucher via TreasuryService to deduct money from the selected vault
    let voucherResult: any = null;
    try {
      voucherResult = await TreasuryService.createPaymentVoucher(tenantId, (req as any).user, {
        vault_id: targetVaultId,
        amount: totalValue,
        date: purchase_date || new Date().toISOString().split('T')[0],
        type: 'scrap_supplier_payment',
        notes: notes || `سداد قيمة شراء خردة شاحنة ${truck_number || ''}`,
        contact_id: supplier_id,
        contact_name: supplier_name || contractor_name
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "فشلت عملية خصم قيمة شراء الخردة من الخزينة" });
    }

    // 3. Commission calculation per ton
    const commPerTon = parseFloat(commission_per_ton || '0');
    let commTotal = parseFloat(commission_total || '0');
    if (commPerTon > 0 && commTotal === 0) {
      commTotal = payableNetWeight * commPerTon;
    }

    const scrap_materials = await getCollectionData('scrap_materials', tenantId);
    const material = scrap_materials.find((sm: any) => String(sm.id) === String(material_id));

    const newInventoryId = `si-${Date.now()}`;
    const newInventoryItem = {
      id: newInventoryId,
      material_id: String(material_id),
      material_name: material ? material.name : 'خردة',
      material_category: material ? material.category : 'عام',
      weight_kg: payableNetWeight,
      gross_weight_kg: gross,
      tare_weight_kg: tare,
      calculated_net_weight_kg: calculatedNet,
      impurity_deduction_kg: impurityDedKg,
      unit_price: price,
      total_value: totalValue,
      quality: quality || 'raw',
      supplier_id: supplier_id || "",
      supplier_name: supplier_name || contractor_name || "مورد خردة",
      contractor_name: contractor_name || "",
      driver_name: driver_name || "",
      truck_number: truck_number || "",
      scale_ticket_no: scale_ticket_no || `TK-${Math.floor(100000 + Math.random() * 900000)}`,
      broker_name: broker_name || "",
      commission_per_ton: commPerTon,
      commission_total: commTotal,
      vault_id: targetVaultId,
      voucher_id: voucherResult?.voucher?.id,
      voucher_number: voucherResult?.voucher?.voucher_number,
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      notes: notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newTxId = `st-${Date.now()}`;
    const newTx = {
      id: newTxId,
      material_id: String(material_id),
      transaction_type: 'purchase',
      weight_kg: payableNetWeight,
      gross_weight_kg: gross,
      tare_weight_kg: tare,
      impurity_deduction_kg: impurityDedKg,
      unit_price: price,
      total_amount: totalValue,
      scale_ticket_no: newInventoryItem.scale_ticket_no,
      truck_number: truck_number || "",
      driver_name: driver_name || "",
      broker_name: broker_name || "",
      commission_total: commTotal,
      vault_id: targetVaultId,
      voucher_id: voucherResult?.voucher?.id,
      transaction_date: purchase_date || new Date().toISOString().split('T')[0],
      contact_id: supplier_id || "",
      notes: notes || "",
      created_at: new Date().toISOString()
    };

    // If commission exists, create commission log
    if (commTotal > 0 && broker_name) {
      const commRecord = {
        id: `comm-${Date.now()}`,
        broker_name: broker_name.trim(),
        scale_ticket_no: newInventoryItem.scale_ticket_no,
        material_name: material ? material.name : 'خردة',
        weight_tons: Number(payableNetWeight.toFixed(3)),
        rate_per_ton: commPerTon,
        total_commission: commTotal,
        date: purchase_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: `عمولة شراء خردة كارتة ${newInventoryItem.scale_ticket_no}`
      };
      await saveCollectionItem('scrap_commissions', commRecord, tenantId);
    }

    const entryId = `entry-scrap-${Date.now()}`;
    const entryDate = purchase_date || new Date().toISOString().split('T')[0];
    const description = `شراء خردة ميزان بسكول (كارتة #${newInventoryItem.scale_ticket_no}) - ${material ? material.name : 'مواد خردة'}`;

    const newEntry = {
      id: entryId,
      entry_date: entryDate,
      description,
      reference_type: "scrap_purchase",
      reference_id: newInventoryId,
      created_at: new Date().toISOString()
    };

    const details = [];
    details.push({
      id: `det-${Date.now()}-1`,
      entry_id: entryId,
      account_code: "1311",
      account_name: "مخزون الخردة (مواد خام)",
      debit: totalValue,
      credit: 0,
      notes: `شراء وزن صافي ${payableNetWeight.toFixed(2)} كجم (بعد خصم شوائب ${impurityDedKg} كجم) بسعر ${price} ج.م`
    });

    details.push({
      id: `det-${Date.now()}-2`,
      entry_id: entryId,
      account_code: "1020",
      account_name: "النقدية في الصندوق (الخزينة)",
      debit: 0,
      credit: totalValue,
      notes: `سداد قيمة شراء خردة شاحنة ${truck_number || ''}`
    });

    if (commTotal > 0) {
      details.push({
        id: `det-${Date.now()}-3`,
        entry_id: entryId,
        account_code: "5025",
        account_name: "مصروفات عمولات وسمسرة خردة",
        debit: commTotal,
        credit: 0,
        notes: `عمولة سمسرة للمندوب/الوسيط: ${broker_name}`
      });
      details.push({
        id: `det-${Date.now()}-4`,
        entry_id: entryId,
        account_code: "2030",
        account_name: "مستحقات سمسار/وسيط خردة",
        debit: 0,
        credit: commTotal,
        notes: `مستحقات عمولة ${broker_name}`
      });
    }

    // Save inventory & transaction & accounting entry
    await saveCollectionItem('scrap_inventory', newInventoryItem, tenantId);
    await saveCollectionItem('scrap_transactions', newTx, tenantId);
    await saveCollectionItem('accountingEntries', newEntry, tenantId);
    
    for (const d of details) {
      await saveCollectionItem('accountingEntryDetails', d, tenantId);
    }

    // Update inventory account balance dynamically
    if (isFirebaseConnected() && firestore) {
      const scrapAccSnap = await firestore.collection('accounts')
        .where('tenantId', '==', tenantId)
        .where('code', '==', '1311')
        .get();
      if (!scrapAccSnap.empty) {
        const doc = scrapAccSnap.docs[0];
        const newBalance = (Number(doc.data().balance) || 0) + totalValue;
        await doc.ref.update({ balance: newBalance });
      }
    } else {
      const db = getLocalDatabase();
      const scrapAcc = (db.accounts || []).find((a: any) => a.code === "1311" && a.tenantId === tenantId);
      if (scrapAcc) {
        scrapAcc.balance = (Number(scrapAcc.balance) || 0) + totalValue;
      }
      saveLocalDatabase(db);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'ADD_SCRAP_WEIGHBRIDGE',
      tableName: 'scrap_inventory',
      recordId: newInventoryId,
      recordIdentifier: material ? material.name : 'مواد خردة',
      description: `تم إضافة خردة بميزان بسكول (كارتة #${newInventoryItem.scale_ticket_no}): مادة "${material ? material.name : 'خردة'}" بوزن صافي ${payableNetWeight} كجم وشاحنة ${truck_number || '-'} بإجمالي ${totalValue} ج.م.`
    });

    return res.status(201).json({ 
      success: true,
      message: '✅ تم توزين وتسجيل الشحنة بنجاح وحساب الصافي وتوليد القيود المحاسبية والعمولات', 
      inventoryId: newInventoryId,
      scaleTicketNo: newInventoryItem.scale_ticket_no
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const processScrapSorting = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const { source_inventory_id, sorted_weight_kg, outputs, notes } = req.body;

    if (!source_inventory_id || !sorted_weight_kg || !Array.isArray(outputs) || outputs.length === 0) {
      return res.status(400).json({ error: 'الدفعة المصدر والوزن المفروز ومخرجات التصنيف حقول مطلوبة' });
    }

    const sortedKg = parseFloat(sorted_weight_kg);
    if (isNaN(sortedKg) || sortedKg <= 0) {
      return res.status(400).json({ error: 'الوزن المراد فرزه يجب أن يكون أكبر من صفر' });
    }

    // 1. Get Source Inventory Item
    const scrap_inventory = await getCollectionData('scrap_inventory', tenantId);
    const sourceItem = scrap_inventory.find((si: any) => String(si.id) === String(source_inventory_id));

    if (!sourceItem) {
      return res.status(404).json({ error: 'دفعة الخردة المصدر غير موجودة' });
    }

    if ((sourceItem.weight_kg || 0) < sortedKg) {
      return res.status(400).json({ error: `الوزن المتوفر في الشحنة المصدر (${sourceItem.weight_kg} كجم) أقل من الوزن المطلوب فرزه (${sortedKg} كجم)` });
    }

    // Deduct weight from source inventory item
    sourceItem.weight_kg = Math.max(0, (sourceItem.weight_kg || 0) - sortedKg);
    sourceItem.total_value = (sourceItem.weight_kg || 0) * (sourceItem.unit_price || 0);
    sourceItem.updated_at = new Date().toISOString();
    await saveCollectionItem('scrap_inventory', sourceItem, tenantId);

    // 2. Add Sorted Output Materials to Inventory
    const scrap_materials = await getCollectionData('scrap_materials', tenantId);
    let totalOutputWeight = 0;

    for (const out of outputs) {
      const outWeight = parseFloat(out.weight_kg || '0');
      if (outWeight > 0) {
        totalOutputWeight += outWeight;
        const mat = scrap_materials.find((sm: any) => String(sm.id) === String(out.material_id));
        const unitPrice = parseFloat(out.unit_price || (mat ? mat.current_price : 0) || sourceItem.unit_price || 0);

        const newSortedItem = {
          id: `si-sorted-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          material_id: String(out.material_id),
          material_name: mat ? mat.name : 'مادة مفروزة',
          material_category: mat ? mat.category : 'مفرز',
          weight_kg: outWeight,
          unit_price: unitPrice,
          total_value: outWeight * unitPrice,
          quality: 'sorted',
          supplier_id: sourceItem.supplier_id || '',
          supplier_name: sourceItem.supplier_name || 'نتيجة فرز وتصنيف',
          purchase_date: new Date().toISOString().split('T')[0],
          notes: `ناتج فرز وتصنيف من دفعة #${sourceItem.id} - ${notes || ''}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await saveCollectionItem('scrap_inventory', newSortedItem, tenantId);
      }
    }

    const wasteWeight = Math.max(0, sortedKg - totalOutputWeight);

    // Log Sorting Transaction
    const sortingTx = {
      id: `st-sort-${Date.now()}`,
      transaction_type: 'sorting',
      source_inventory_id,
      input_weight_kg: sortedKg,
      output_weight_kg: totalOutputWeight,
      waste_weight_kg: wasteWeight,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: `فرز وتصنيف دفعة خردة (هالك فرز: ${wasteWeight.toFixed(2)} كجم) - ${notes || ''}`,
      created_at: new Date().toISOString()
    };
    await saveCollectionItem('scrap_transactions', sortingTx, tenantId);

    return res.status(200).json({
      success: true,
      message: `✅ تم فرز وتصنيف الشحنة بنجاح! ناتج الفرز الصافي: ${totalOutputWeight} كجم، والهالك غير القابل للتدوير: ${wasteWeight} كجم`,
      sortingResult: {
        input_weight_kg: sortedKg,
        output_weight_kg: totalOutputWeight,
        waste_weight_kg: wasteWeight
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getCommissions = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const commissions = await getCollectionData('scrap_commissions', tenantId);
    commissions.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    return res.json(commissions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const { date_from, date_to, material_id } = req.query;

    const scrap_transactions = await getCollectionData('scrap_transactions', tenantId);
    const scrap_materials = await getCollectionData('scrap_materials', tenantId);
    const contacts = await getCollectionData('contacts', tenantId);

    let list = scrap_transactions;

    if (material_id) {
      list = list.filter((st: any) => String(st.material_id) === String(material_id));
    }
    if (date_from) {
      list = list.filter((st: any) => st.transaction_date >= String(date_from));
    }
    if (date_to) {
      list = list.filter((st: any) => st.transaction_date <= String(date_to));
    }

    const populated = list.map((st: any) => {
      const material = scrap_materials.find((sm: any) => String(sm.id) === String(st.material_id));
      const contact = st.contact_id ? contacts.find((c: any) => String(c.id) === String(st.contact_id)) : null;
      return {
        ...st,
        material_name: material ? material.name : "خردة غير معروفة",
        contact_name: contact ? contact.name : (st.contact_id || "مورد/عميل غير معروف")
      };
    });

    populated.sort((a: any, b: any) => b.transaction_date.localeCompare(a.transaction_date));
    return res.json(populated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getReportsSummary = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await ensureScrapTables(tenantId);
    const scrap_materials = await getCollectionData('scrap_materials', tenantId);
    const scrap_inventory = await getCollectionData('scrap_inventory', tenantId);

    const materials = scrap_materials.filter((m: any) => m.is_active !== false);

    const materialsWithSummary = materials.map((sm: any) => {
      const items = scrap_inventory.filter((si: any) => String(si.material_id) === String(sm.id));
      const totalWeight = items.reduce((sum: number, si: any) => sum + (Number(si.weight_kg) || 0), 0);
      const totalValue = items.reduce((sum: number, si: any) => sum + (Number(si.total_value) || 0), 0);
      return {
        material_id: sm.id,
        material_name: sm.name,
        total_weight: totalWeight,
        total_value: totalValue,
        current_price: sm.current_price,
        items_count: items.length
      };
    });

    const totalWeight = materialsWithSummary.reduce((sum: number, m: any) => sum + m.total_weight, 0);
    const totalValue = materialsWithSummary.reduce((sum: number, m: any) => sum + m.total_value, 0);

    return res.json({
      materials: materialsWithSummary,
      summary: {
        total_weight: totalWeight,
        total_value: totalValue,
        materials_count: materials.length
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Helper to delete collection item safely across both Firestore and local DB
async function deleteCollectionItem(collectionName: string, id: string, tenantId: string): Promise<boolean> {
  try {
    if (isFirebaseConnected() && firestore) {
      await firestore.collection(collectionName).doc(String(id)).delete();
    }
  } catch (e) {
    console.error(`Firestore delete error in ${collectionName}:`, e);
  }
  try {
    const db = getLocalDatabase();
    if (db[collectionName] && Array.isArray(db[collectionName])) {
      db[collectionName] = db[collectionName].filter((x: any) => String(x.id) !== String(id));
      saveLocalDatabase(db);
    }
  } catch (e) {
    console.error(`Local DB delete error in ${collectionName}:`, e);
  }
  return true;
}

export const updateScrapTransaction = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const transactions = await getCollectionData('scrap_transactions', tenantId);
    const existingTx = transactions.find((t: any) => String(t.id) === String(id));
    if (!existingTx) {
      return res.status(404).json({ error: 'كارتة الميزان غير موجودة' });
    }

    const {
      material_id,
      gross_weight_kg,
      tare_weight_kg,
      impurity_deduction_kg,
      unit_price,
      scale_ticket_no,
      truck_number,
      driver_name,
      broker_name,
      commission_total,
      transaction_date,
      notes
    } = req.body;

    const gross = parseFloat(gross_weight_kg || existingTx.gross_weight_kg || '0');
    const tare = parseFloat(tare_weight_kg || existingTx.tare_weight_kg || '0');
    let calculatedNet = gross > 0 && tare > 0 ? (gross - tare) : parseFloat(req.body.weight_kg || existingTx.weight_kg || '0');
    const impurity = parseFloat(impurity_deduction_kg || existingTx.impurity_deduction_kg || '0');
    const payableNet = Math.max(0, calculatedNet - impurity);
    const price = parseFloat(unit_price || existingTx.unit_price || '0');
    const totalAmount = payableNet * price;

    const updatedTx = {
      ...existingTx,
      material_id: material_id ? String(material_id) : existingTx.material_id,
      weight_kg: payableNet,
      gross_weight_kg: gross,
      tare_weight_kg: tare,
      impurity_deduction_kg: impurity,
      unit_price: price,
      total_amount: totalAmount,
      scale_ticket_no: scale_ticket_no || existingTx.scale_ticket_no,
      truck_number: truck_number !== undefined ? truck_number : existingTx.truck_number,
      driver_name: driver_name !== undefined ? driver_name : existingTx.driver_name,
      broker_name: broker_name !== undefined ? broker_name : existingTx.broker_name,
      commission_total: commission_total !== undefined ? parseFloat(commission_total) : existingTx.commission_total,
      transaction_date: transaction_date || existingTx.transaction_date,
      notes: notes !== undefined ? notes : existingTx.notes,
      updated_at: new Date().toISOString()
    };

    await saveCollectionItem('scrap_transactions', updatedTx, tenantId);

    await logAuditHelper({
      actionType: 'UPDATE',
      tableName: 'scrap_transactions',
      recordId: id,
      recordIdentifier: updatedTx.scale_ticket_no,
      description: `تعديل كارتة الميزان #${updatedTx.scale_ticket_no}`
    });

    return res.json({ success: true, message: '✅ تم تعديل كارتة الميزان بنجاح', transaction: updatedTx });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteScrapTransaction = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const transactions = await getCollectionData('scrap_transactions', tenantId);
    const existingTx = transactions.find((t: any) => String(t.id) === String(id) || String(t.scale_ticket_no) === String(id));

    const inventory = await getCollectionData('scrap_inventory', tenantId);
    const existingInv = inventory.find((i: any) => String(i.id) === String(id) || String(i.scale_ticket_no) === String(id) || (existingTx && String(i.scale_ticket_no) === String(existingTx.scale_ticket_no)));

    if (!existingTx && !existingInv) {
      // Fallback: direct delete attempts
      await deleteCollectionItem('scrap_transactions', id, tenantId);
      await deleteCollectionItem('scrap_inventory', id, tenantId);
      return res.json({ success: true, message: '🗑️ تم طلب حذف السجل' });
    }

    if (existingTx) {
      await deleteCollectionItem('scrap_transactions', String(existingTx.id), tenantId);
    }
    if (existingInv) {
      await deleteCollectionItem('scrap_inventory', String(existingInv.id), tenantId);
    }
    // Extra safety: delete by raw param ID as well
    await deleteCollectionItem('scrap_transactions', id, tenantId);
    await deleteCollectionItem('scrap_inventory', id, tenantId);

    const ticketNo = existingTx?.scale_ticket_no || existingInv?.scale_ticket_no || id;

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'DELETE_SCRAP_RECORD',
      tableName: 'scrap_transactions',
      recordId: id,
      recordIdentifier: String(ticketNo),
      description: `حذف كارتة الميزان / دفعة الخردة رقم #${ticketNo}`
    });

    return res.json({ success: true, message: `🗑️ تم حذف السجل رقم #${ticketNo} بنجاح من الميزان والمستودع` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل حذف السجل' });
  }
};

export const deleteScrapInventory = async (req: Request, res: Response) => {
  return deleteScrapTransaction(req, res);
};

export const deleteCommission = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    await deleteCollectionItem('scrap_commissions', id, tenantId);
    return res.json({ success: true, message: '🗑️ تم حذف عمولة السمسار بنجاح' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateCommission = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const commissions = await getCollectionData('scrap_commissions', tenantId);
    const existing = commissions.find((c: any) => String(c.id) === String(id));
    if (!existing) {
      return res.status(404).json({ error: 'العمولة غير موجودة' });
    }

    const { broker_name, weight_tons, rate_per_ton, notes, date } = req.body;
    const w = weight_tons !== undefined ? parseFloat(weight_tons) : existing.weight_tons;
    const r = rate_per_ton !== undefined ? parseFloat(rate_per_ton) : existing.rate_per_ton;

    const updated = {
      ...existing,
      broker_name: broker_name || existing.broker_name,
      weight_tons: w,
      rate_per_ton: r,
      total_commission: w * r,
      notes: notes !== undefined ? notes : existing.notes,
      date: date || existing.date,
      updated_at: new Date().toISOString()
    };

    await saveCollectionItem('scrap_commissions', updated, tenantId);
    return res.json({ success: true, message: '✅ تم تعديل العمولة بنجاح', commission: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    const materials = await getCollectionData('scrap_materials', tenantId);
    const existing = materials.find((m: any) => String(m.id) === String(id));
    if (!existing) {
      return res.status(404).json({ error: 'صنف الخردة غير موجود' });
    }

    const { name, category, unit, current_price, description } = req.body;
    const updated = {
      ...existing,
      name: name || existing.name,
      category: category || existing.category,
      unit: unit || existing.unit,
      current_price: current_price !== undefined ? parseFloat(current_price) : existing.current_price,
      description: description !== undefined ? description : existing.description,
      updated_at: new Date().toISOString()
    };

    await saveCollectionItem('scrap_materials', updated, tenantId);
    return res.json({ success: true, message: '✅ تم تعديل صنف الخردة بنجاح', material: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  try {
    await deleteCollectionItem('scrap_materials', id, tenantId);
    return res.json({ success: true, message: '🗑️ تم حذف صنف الخردة بنجاح' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};


