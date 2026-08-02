import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import ExcelJS from 'exceljs';
import { cacheService } from '../services/cache.service';
import {
  ContactModel,
  InvoiceModel,
  ExpenseModel,
  AccountModel,
  ProductModel,
  EmployeeModel,
  PayrollModel,
  AuditLogModel,
  isPostgresConnected
} from '../../services/postgres.service';
import fs from 'fs';
import path from 'path';
import { jsonDB } from '../data/jsonDatabase';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to read local database.json safely with full tenant database sharding support
function getLocalDatabase(): any {
  return jsonDB.load();
}

// Helper to write local database.json safely with full tenant database sharding support
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

// Unified helper to get collections safely for both Firestore and local DB, filtered by tenantId
async function getCollectionData(collectionName: string, tenantId: string): Promise<any[]> {
  const cacheKey = `reports:collection:${collectionName}:${tenantId}`;
  try {
    const cachedData = await cacheService.get<any[]>(cacheKey);
    if (cachedData) {
      console.log(`Reports: Returning cached data for ${collectionName}`);
      return cachedData;
    }

    let result: any[] = [];
    if (isPostgresConnected()) {
      console.log(`Reports: Fetching ${collectionName} from PostgreSQL...`);
      if (collectionName === 'contacts') {
        const items = await ContactModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'invoices') {
        const items = await InvoiceModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'expenses') {
        const items = await ExpenseModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'accounts') {
        const items = await AccountModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'products') {
        const items = await ProductModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'employees') {
        const items = await EmployeeModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'payroll') {
        const items = await PayrollModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      } else if (collectionName === 'audit_logs') {
        const items = await AuditLogModel.findAll({ where: { tenantId } });
        result = items.map(x => x.get({ plain: true }));
      }
    } else if (isFirebaseConnected() && firestore) {
      const snap = await firestore.collection(collectionName).where('tenantId', '==', tenantId).get();
      result = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      result = (db[collectionName] || []).filter((item: any) => item.tenantId === tenantId);
    }

    // Cache the query results for 10 seconds to avoid repetitive database scans
    await cacheService.set(cacheKey, result, 10);
    return result;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} for tenant ${tenantId}:`, error);
    return [];
  }
}

// Keep track of the last time a tenant ran recalculation to throttle it (e.g. max once per 10 seconds)
const lastRecalculationTime = new Map<string, number>();

async function performFintechRecalculation(tenantId: string) {
  const now = Date.now();
  const lastRun = lastRecalculationTime.get(tenantId) || 0;
  if (now - lastRun < 10000) {
    console.log(`Reports: Throttling recalculation for tenant ${tenantId} (already ran within 10s)`);
    return;
  }
  lastRecalculationTime.set(tenantId, now);

  try {
    const contacts = await getCollectionData('contacts', tenantId);
    const invoices = await getCollectionData('invoices', tenantId);
    const expenses = await getCollectionData('expenses', tenantId);
    
    const changedContacts: any[] = [];
    contacts.forEach((contact: any) => {
      let unpaidSum = 0;
      if (contact.type === "customer") {
        unpaidSum = invoices
          .filter((inv: any) => inv.contactId === contact.id)
          .reduce((sum: number, inv: any) => sum + ((inv.totalAmount || inv.total || 0) - (inv.paidAmount || 0)), 0);
      } else {
        const expenseSum = expenses
          .filter((exp: any) => exp.contactId === contact.id)
          .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
        unpaidSum = Math.max(0, expenseSum);
      }

      if (contact.balance !== unpaidSum) {
        contact.balance = unpaidSum;
        changedContacts.push(contact);
      }
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const changedInvoices: any[] = [];
    invoices.forEach((inv: any) => {
      if (inv.status !== "paid" && inv.status !== "draft") {
        const expectedStatus = inv.dueDate < todayStr ? "overdue" : "unpaid";
        if (inv.status !== expectedStatus) {
          inv.status = expectedStatus;
          changedInvoices.push(inv);
        }
      }
    });

    if (changedContacts.length === 0 && changedInvoices.length === 0) {
      console.log('Reports: No fintech balances or invoice statuses changed. Skipping DB writes.');
      return;
    }

    console.log(`Reports: Saving ${changedContacts.length} updated contacts and ${changedInvoices.length} updated invoices...`);

    // Invalidate cached collections since we are writing new values
    await cacheService.del(`reports:collection:contacts:${tenantId}`);
    await cacheService.del(`reports:collection:invoices:${tenantId}`);

    if (isPostgresConnected()) {
      for (const c of changedContacts) {
        const contactModel = await ContactModel.findOne({ where: { id: c.id, tenantId } });
        if (contactModel) {
          await contactModel.update({ balance: c.balance });
        }
      }
      for (const i of changedInvoices) {
        const invoiceModel = await InvoiceModel.findOne({ where: { id: i.id, tenantId } });
        if (invoiceModel) {
          await invoiceModel.update({ status: i.status });
        }
      }
    } else if (isFirebaseConnected() && firestore) {
      const batch = firestore.batch();
      changedContacts.forEach((c: any) => {
        if (c.id) {
          const ref = firestore.collection('contacts').doc(c.id);
          batch.set(ref, c, { merge: true });
        }
      });
      changedInvoices.forEach((i: any) => {
        if (i.id) {
          const ref = firestore.collection('invoices').doc(i.id);
          batch.set(ref, i, { merge: true });
        }
      });
      await batch.commit();
    } else {
      const db = getLocalDatabase();
      if (db.contacts) {
        changedContacts.forEach((c: any) => {
          const idx = db.contacts.findIndex((item: any) => item.id === c.id);
          if (idx !== -1) db.contacts[idx] = c;
        });
      }
      if (db.invoices) {
        changedInvoices.forEach((i: any) => {
          const idx = db.invoices.findIndex((item: any) => item.id === i.id);
          if (idx !== -1) db.invoices[idx] = i;
        });
      }
      saveLocalDatabase(db);
    }
  } catch (error) {
    console.error(`Error performing fintech recalculation for tenant ${tenantId}:`, error);
  }
}

export const getFinancials = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await performFintechRecalculation(tenantId);

    const invoices = await getCollectionData('invoices', tenantId);
    const expenses = await getCollectionData('expenses', tenantId);
    const accounts = await getCollectionData('accounts', tenantId);

    const totalSalesInvoices = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.total || 0), 0);
    const paidSalesInvoices = invoices.filter((inv: any) => inv.status === "paid").reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0);
    const unpaidSalesInvoices = invoices.filter((inv: any) => inv.status !== "paid").reduce((sum: number, inv: any) => sum + ((inv.totalAmount || inv.total || 0) - (inv.paidAmount || 0)), 0);
    const totalExpensesAmount = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

    const revenueSummary = accounts.filter((a: any) => a.type === "revenue").reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
    const expenseSummary = accounts.filter((a: any) => a.type === "expense").reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
    
    const profitAndLoss = {
      grossRevenues: revenueSummary || totalSalesInvoices,
      costOfGoodsSold: accounts.find((a: any) => a.code === "5010")?.balance || 48000,
      grossProfit: (revenueSummary || totalSalesInvoices) - (accounts.find((a: any) => a.code === "5010")?.balance || 48000),
      operatingExpenses: accounts.filter((a: any) => a.type === "expense" && a.code !== "5010").map((a: any) => ({ name: a.name, value: a.balance })),
      totalExpenses: expenseSummary || totalExpensesAmount,
      netIncome: (revenueSummary || totalSalesInvoices) - (expenseSummary || totalExpensesAmount)
    };

    const assetAccounts = accounts.filter((a: any) => a.type === "asset").map((a: any) => ({ name: a.name, code: a.code, balance: a.balance }));
    const liabilityAccounts = accounts.filter((a: any) => a.type === "liability").map((a: any) => ({ name: a.name, code: a.code, balance: a.balance }));
    const equityAccounts = accounts.filter((a: any) => a.type === "equity").map((a: any) => ({ name: a.name, code: a.code, balance: a.balance }));

    const totalAssets = assetAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
    const totalEquity = equityAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

    return res.json({
      revenueSummary: {
        totalSalesInvoices,
        paidSalesInvoices,
        unpaidSalesInvoices,
        totalExpensesAmount,
        cashOnHand: accounts.find((a: any) => a.code === "1010")?.balance || 145000
      },
      profitAndLoss,
      balanceSheet: {
        assets: assetAccounts,
        liabilities: liabilityAccounts,
        equity: equityAccounts,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTrialBalance = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const accounts = await getCollectionData('accounts', tenantId);
    let totalDebits = 0;
    let totalCredits = 0;

    const formattedList = accounts.map((acc: any) => {
      const isDebitType = acc.type === 'asset' || acc.type === 'expense';
      const balance = Number(acc.balance) || 0;
      const debitVal = isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);
      const creditVal = !isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);

      totalDebits += debitVal;
      totalCredits += creditVal;

      return {
        id: acc.id || acc._id || acc.code,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        total_debit: debitVal,
        total_credit: creditVal,
        ending_debit: debitVal,
        ending_credit: creditVal,
        debit: debitVal,
        credit: creditVal
      };
    });

    return res.json({
      accounts: formattedList,
      summary: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.1
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getProfitLoss = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const accounts = await getCollectionData('accounts', tenantId);

    const revenues = accounts.filter((a: any) => a.type === "revenue");
    const expenses = accounts.filter((a: any) => a.type === "expense");
    const cogs = accounts.filter((a: any) => a.code?.startsWith("5") || a.type === "cogs");

    const totalRevenues = revenues.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalCogs = cogs.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);

    const grossProfit = totalRevenues - totalCogs;
    const netIncome = totalRevenues - totalExpenses;

    const formattedRevenues = revenues.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0, amount: Number(a.balance) || 0 }));
    const formattedExpenses = expenses.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0, amount: Number(a.balance) || 0 }));
    const formattedCogs = cogs.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0, amount: Number(a.balance) || 0 }));

    return res.json({
      revenues: formattedRevenues,
      expenses: formattedExpenses,
      cogs: formattedCogs,
      totalRevenues,
      total_revenue: totalRevenues,
      totalExpenses,
      total_expenses: totalExpenses,
      totalCogs,
      total_cogs: totalCogs,
      grossProfit,
      gross_profit: grossProfit,
      netIncome,
      net_income: netIncome
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getBalanceSheet = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const accounts = await getCollectionData('accounts', tenantId);

    const assets = accounts.filter((a: any) => a.type === "asset");
    const liabilities = accounts.filter((a: any) => a.type === "liability");
    const equity = accounts.filter((a: any) => a.type === "equity");
    const revenues = accounts.filter((a: any) => a.type === "revenue");
    const expenses = accounts.filter((a: any) => a.type === "expense");

    const totalAssets = assets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalLiabilities = liabilities.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalEquity = equity.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);

    const totalRevenues = revenues.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const retainedEarnings = totalRevenues - totalExpenses;

    const totalEquityAndRetained = totalEquity + retainedEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquityAndRetained;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

    const formattedAssets = assets.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0 }));
    const formattedLiabilities = liabilities.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0 }));
    const formattedEquity = equity.map((a: any) => ({ id: a.id || a._id || a.code, name: a.name, code: a.code, balance: Number(a.balance) || 0 }));

    return res.json({
      assets: formattedAssets,
      liabilities: formattedLiabilities,
      equity: formattedEquity,
      totalAssets,
      total_assets: totalAssets,
      totalLiabilities,
      total_liabilities: totalLiabilities,
      totalEquity,
      total_equity: totalEquity,
      retainedEarnings,
      retained_earnings: retainedEarnings,
      totalEquityAndRetained,
      total_equity_and_retained: totalEquityAndRetained,
      totalLiabilitiesAndEquity,
      total_liabilities_and_equity: totalLiabilitiesAndEquity,
      isBalanced,
      is_balanced: isBalanced
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getCashFlow = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const bankTransactions = await getCollectionData('bankTransactions', tenantId);

    const operatingInflows = bankTransactions.filter((tx: any) => tx.type === "deposit" && tx.category === "sales").reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
    const operatingOutflows = bankTransactions.filter((tx: any) => tx.type === "withdrawal" && (tx.category === "expense" || tx.category === "payroll")).reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

    const operatingNet = operatingInflows - operatingOutflows;
    const beginningCash = 100000;
    const endingCash = beginningCash + operatingNet;

    return res.json({
      operatingActivities: {
        inflow: operatingInflows,
        outflow: operatingOutflows,
        netCash: operatingNet
      },
      investingActivities: {
        inflow: 0,
        outflow: 0,
        netCash: 0
      },
      financingActivities: {
        inflow: 0,
        outflow: 0,
        netCash: 0
      },
      operating: {
        total: operatingNet,
        net_income: operatingInflows,
        ar_change: -operatingOutflows,
        inventory_change: 0,
        ap_change: 0
      },
      investing: {
        total: 0,
        asset_purchase: 0
      },
      financing: {
        total: 0,
        capital_change: 0,
        loan_change: 0
      },
      netIncreaseInCash: operatingNet,
      net_change: operatingNet,
      cashAtBeginning: beginningCash,
      beginning_cash: beginningCash,
      cashAtEnd: endingCash,
      ending_cash: endingCash
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getGeneralLedger = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const accounts = await getCollectionData('accounts', tenantId);
    const entries = await getCollectionData('accountingEntries', tenantId);
    const details = await getCollectionData('accountingEntryDetails', tenantId);

    const ledger = accounts.map((acc: any) => {
      const accDetails = details.filter((det: any) => det.account_code === acc.code || det.accountCode === acc.code);
      const populatedTx = accDetails.map((det: any) => {
        const entry = entries.find((e: any) => e.id === det.entry_id || e.id === det.entryId);
        return {
          id: det.id,
          date: entry ? (entry.entry_date || entry.entryDate) : new Date().toISOString().split('T')[0],
          description: entry ? entry.description : (det.notes || det.description),
          debit: det.debit || 0,
          credit: det.credit || 0
        };
      });

      return {
        accountCode: acc.code,
        accountName: acc.name,
        type: acc.type,
        currentBalance: acc.balance,
        transactions: populatedTx
      };
    });

    return res.json(ledger);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTaxReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const invoices = await getCollectionData('invoices', tenantId);
    const expenses = await getCollectionData('expenses', tenantId);

    const outputTax = invoices.filter((i: any) => i.status === "paid" || i.status === "unpaid" || i.status === "overdue").reduce((sum: number, i: any) => sum + (Number(i.taxAmount || i.tax) || 0), 0);
    const inputTax = expenses.reduce((sum: number, e: any) => sum + (Number(e.taxAmount || e.tax) || 0), 0);

    return res.json({
      salesWithTax: invoices.length,
      expensesWithTax: expenses.length,
      outputTax,
      inputTax,
      netTaxDue: outputTax - inputTax
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAgingReceivable = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const invoices = await getCollectionData('invoices', tenantId);
    const contacts = await getCollectionData('contacts', tenantId);

    const unpaidInvoices = invoices.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue');
    
    const aging = contacts.filter((c: any) => c.type === 'customer' || c.type === 'client').map((c: any) => {
      const customerInvs = unpaidInvoices.filter((i: any) => i.contactId === c.id);
      
      let current = 0;
      let age1to30 = 0;
      let age31to60 = 0;
      let ageOver60 = 0;

      const today = new Date();

      customerInvs.forEach((i: any) => {
        const due = new Date(i.dueDate || i.date || i.createdAt);
        const diffTime = today.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const amount = (i.totalAmount || i.total || 0) - (i.paidAmount || 0);

        if (diffDays <= 0) {
          current += amount;
        } else if (diffDays <= 30) {
          age1to30 += amount;
        } else if (diffDays <= 60) {
          age31to60 += amount;
        } else {
          ageOver60 += amount;
        }
      });

      return {
        customerId: c.id,
        customerName: c.name,
        current,
        age1to30,
        age31to60,
        ageOver60,
        total: current + age1to30 + age31to60 + ageOver60
      };
    });

    return res.json(aging);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAgingPayable = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const expenses = await getCollectionData('expenses', tenantId);
    const contacts = await getCollectionData('contacts', tenantId);

    const unpaidExpenses = expenses.filter((e: any) => e.status === 'unpaid' || e.status === 'pending');
    
    const aging = contacts.filter((c: any) => c.type === 'supplier' || c.type === 'both').map((c: any) => {
      const supplierExpenses = unpaidExpenses.filter((e: any) => e.contactId === c.id);
      
      let current = 0;
      let age1to30 = 0;
      let age31to60 = 0;
      let ageOver60 = 0;

      const today = new Date();

      supplierExpenses.forEach((e: any) => {
        const due = new Date(e.dueDate || e.date || e.expenseDate);
        const diffTime = today.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const amount = Number(e.amount) || 0;

        if (diffDays <= 0) {
          current += amount;
        } else if (diffDays <= 30) {
          age1to30 += amount;
        } else if (diffDays <= 60) {
          age31to60 += amount;
        } else {
          ageOver60 += amount;
        }
      });

      return {
        supplierId: c.id,
        supplierName: c.name,
        current,
        age1to30,
        age31to60,
        ageOver60,
        total: current + age1to30 + age31to60 + ageOver60
      };
    });

    return res.json(aging);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const invoices = await getCollectionData('invoices', tenantId);

    const salesByMonth: Record<string, number> = {};
    invoices.forEach((i: any) => {
      if (i.status === 'cancelled') return;
      const date = i.date || i.createdAt || '';
      const month = date.substring(0, 7); // YYYY-MM
      if (month) {
        salesByMonth[month] = (salesByMonth[month] || 0) + (Number(i.totalAmount || i.total) || 0);
      }
    });

    const list = Object.entries(salesByMonth).map(([month, total]) => ({ month, total }));
    list.sort((a, b) => a.month.localeCompare(b.month));

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getEmployeesPerformance = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const employees = await getCollectionData('employees', tenantId);

    const performance = employees.map((emp: any) => ({
      employeeId: emp.id,
      fullName: emp.fullName || emp.name,
      department: emp.department,
      rating: emp.performanceRating || emp.performance_rating || 4.5,
      tasksCompleted: emp.tasksCompleted || emp.tasks_completed || 15,
      attendanceRate: emp.attendanceRate || emp.attendance_rate || 95
    }));

    return res.json(performance);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getInventoryAnalytics = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const products = await getCollectionData('products', tenantId);

    const analytics = products.map((p: any) => {
      const stock = Number(p.stockQuantity !== undefined ? p.stockQuantity : p.stock || 0);
      const prc = Number(p.price || p.salePrice || p.unitPrice || 0);
      const reorder = Number(p.reorderPoint !== undefined ? p.reorderPoint : p.reorder_point || 5);
      return {
        productId: p.id,
        name: p.name,
        stock,
        price: prc,
        value: stock * prc,
        status: stock <= reorder ? 'low' : 'ok'
      };
    });

    return res.json(analytics);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const saveReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const newReport = {
      id: `report-${Date.now()}`,
      ...req.body,
      tenantId,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('saved_reports').doc(newReport.id).set(newReport);
    } else {
      const db = getLocalDatabase();
      if (!db.saved_reports) {
        db.saved_reports = [];
      }
      db.saved_reports.push(newReport);
      saveLocalDatabase(db);
    }

    return res.status(201).json(newReport);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSavedReports = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const saved = await getCollectionData('saved_reports', tenantId);
    return res.json(saved);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getActivityReport = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const companySettings = await getCollectionData('company_settings', tenantId);
    const settings = companySettings[0];
    const activityCode = settings?.activity_code || 'retail';
    
    return res.json({
      activity: activityCode,
      generatedAt: new Date().toISOString(),
      status: "active"
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const exportReportsToExcel = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { type } = req.query;

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام بروميت ERP';
    workbook.lastModifiedBy = 'نظام بروميت ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    if (type === 'activities-23') {
      const sheet = workbook.addWorksheet('الأنشطة الـ23 القياسية');
      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: 'م', key: 'id', width: 8 },
        { header: 'كود النشاط', key: 'code', width: 15 },
        { header: 'اسم النشاط (بالعربية)', key: 'name_ar', width: 40 },
        { header: 'اسم النشاط (بالإنجليزية)', key: 'name_en', width: 35 },
        { header: 'نسبة ضريبة القيمة المضافة', key: 'vat', width: 25 },
        { header: 'الحسابات المقترحة', key: 'accounts', width: 25 },
        { header: 'الوحدات الافتراضية المقترحة', key: 'modules', width: 45 }
      ];

      const standardActivities23 = [
        { id: 1, code: 'agriculture', name_ar: 'الزراعة وصيد الأسماك', name_en: 'Agriculture & Fishing', vat: '5%', accounts: '1010-1020-4010-5010', modules: 'المخزون، المبيعات، لوحة التحكم' },
        { id: 2, code: 'mining', name_ar: 'التعدين واستغلال المحاجر', name_en: 'Mining & Quarrying', vat: '14%', accounts: '1210-4010-5010-5020', modules: 'الأصول، المبيعات، الموظفين' },
        { id: 3, code: 'manufacturing', name_ar: 'الصناعات التحويلية (التصنيع)', name_en: 'Manufacturing', vat: '14%', accounts: '1220-1010-4010-5010', modules: 'التصنيع، المخزون، المعدات، المبيعات' },
        { id: 4, code: 'electricity', name_ar: 'إمدادات الكهرباء والغاز', name_en: 'Electricity & Gas Supply', vat: '14%', accounts: '1210-4010-5020', modules: 'لوحة التحكم، الموظفين، الفواتير' },
        { id: 5, code: 'water_waste', name_ar: 'إمدادات المياه والصرف وتدوير النفايات', name_en: 'Water Supply & Waste Recycling', vat: '14%', accounts: '1010-4010-5010', modules: 'لوحة التحكم، الفواتير، المخزون' },
        { id: 6, code: 'construction', name_ar: 'التشييد والبناء (المقاولات)', name_en: 'Construction & Real Estate', vat: '5%', accounts: '1230-1010-4010-5020', modules: 'المشاريع، الأصول، المعدات، المبيعات' },
        { id: 7, code: 'retail', name_ar: 'تجارة الجملة والتجزئة (التجارة)', name_en: 'Wholesale & Retail Trade', vat: '14%', accounts: '1010-1020-4010-5010', modules: 'المخزون، العلاقات العامة، المبيعات' },
        { id: 8, code: 'transport', name_ar: 'النقل والتخزين والشحن', name_en: 'Transportation & Storage', vat: '14%', accounts: '1210-4010-5020', modules: 'الأسطول، الشحنات، الفواتير' },
        { id: 9, code: 'hospitality', name_ar: 'خدمات الإقامة والطعام (الفنادق والمطاعم)', name_en: 'Hospitality & Food Services', vat: '14%', accounts: '1010-4010-5010', modules: 'العلاقات العامة، المبيعات، الفواتير' },
        { id: 10, code: 'telecom', name_ar: 'المعلومات والاتصالات والبرمجيات', name_en: 'Information & Communications', vat: '14%', accounts: '1010-4010-5020', modules: 'المشاريع، الفواتير، الموظفين' },
        { id: 11, code: 'financial', name_ar: 'الأنشطة المالية والتأمين', name_en: 'Financial & Insurance Activities', vat: '10%', accounts: '1010-1020-4010', modules: 'لوحة التحكم، العلاقات العامة، الموظفين' },
        { id: 12, code: 'real_estate', name_ar: 'الأنشطة العقارية وإدارة الأملاك', name_en: 'Real Estate Activities', vat: '14%', accounts: '1210-4010-5020', modules: 'الأصول، المشاريع، المبيعات' },
        { id: 13, code: 'professional', name_ar: 'الأنشطة المهنية والعلمية والتقنية', name_en: 'Professional & Technical Services', vat: '10%', accounts: '1010-4010-5020', modules: 'المشاريع، الموظفين، الفواتير' },
        { id: 14, code: 'administrative', name_ar: 'الأنشطة الإدارية وخدمات الدعم', name_en: 'Administrative & Support Services', vat: '14%', accounts: '1010-4010-5020', modules: 'لوحة التحكم، الفواتير، الموظفين' },
        { id: 15, code: 'public_admin', name_ar: 'الإدارة العامة والدفاع والضمان الاجتماعي', name_en: 'Public Administration & Security', vat: '0%', accounts: '1010-5020', modules: 'لوحة التحكم، الموظفين، الرواتب' },
        { id: 16, code: 'education', name_ar: 'التعليم والتدريب والمدارس', name_en: 'Education & Schools', vat: '0%', accounts: '1010-4010-5020', modules: 'الموظفين، الرواتب، العلاقات العامة' },
        { id: 17, code: 'healthcare', name_ar: 'صحة الإنسان والعمل الاجتماعي والعيادات', name_en: 'Human Health & Clinics', vat: '0%', accounts: '1010-4010-5010', modules: 'المستودعات، المبيعات، العلاقات العامة' },
        { id: 18, code: 'arts_entertainment', name_ar: 'الفنون والترفيه والتسلية', name_en: 'Arts, Entertainment & Recreation', vat: '14%', accounts: '1010-4010-5010', modules: 'لوحة التحكم، العلاقات العامة، الفواتير' },
        { id: 19, code: 'other_services', name_ar: 'الخدمات الشخصية والأخرى', name_en: 'Other Service Activities', vat: '14%', accounts: '1010-4010-5020', modules: 'لوحة التحكم، الفواتير، الموظفين' },
        { id: 20, code: 'scrap', name_ar: '🧹 جمع النفايات وتدوير الخردة وإعادة التصنيع', name_en: 'Waste & Scrap Recycling', vat: '14%', accounts: '1010-4010-5010-5020', modules: 'المخزون، الموظفين، الرواتب، الفواتير، حركة الخردة' },
        { id: 21, code: 'motor_repair', name_ar: 'إصلاح وصيانة المركبات وورش السيارات', name_en: 'Motor Vehicle Repair & Workshops', vat: '14%', accounts: '1010-4010-5010-5020', modules: 'المخزون، الفواتير، العلاقات العامة' },
        { id: 22, code: 'household', name_ar: 'الأنشطة المنزلية لإنتاج سلع وخدمات', name_en: 'Household Productive Activities', vat: '0%', accounts: '1010-4010-5020', modules: 'المخزون، الفواتير، المبيعات' },
        { id: 23, code: 'extraterritorial', name_ar: 'الأنشطة التنظيمية والهيئات الأجنبية', name_en: 'Extraterritorial Organizations', vat: '0%', accounts: '1010-5020', modules: 'لوحة التحكم، الموظفين، الرواتب' }
      ];

      sheet.addRows(standardActivities23);

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C2BD9' } };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.font = { size: 11, color: { argb: 'FF1F2937' } };
          row.alignment = { vertical: 'middle', horizontal: 'right' };
          if (rowNumber % 2 === 0) {
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        }
        row.height = 30;
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Standard_23_Economic_Activities.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'general-ledger') {
      const sheet = workbook.addWorksheet('دفتر الأستاذ العام');
      sheet.views = [{ rightToLeft: true }];
      
      const accounts = await getCollectionData('accounts', tenantId);
      const details = await getCollectionData('accountingEntryDetails', tenantId);

      sheet.columns = [
        { header: 'رقم الحساب', key: 'code', width: 15 },
        { header: 'اسم الحساب', key: 'name', width: 30 },
        { header: 'نوع الحساب', key: 'type', width: 20 },
        { header: 'المدين (Debit)', key: 'debit', width: 20 },
        { header: 'الدائن (Credit)', key: 'credit', width: 20 },
        { header: 'الرصيد النهائي', key: 'balance', width: 20 }
      ];

      accounts.forEach((acc: any) => {
        const accDetails = details.filter((det: any) => det.account_code === acc.code || det.accountCode === acc.code);
        const debit = accDetails.reduce((sum, det) => sum + (det.debit || 0), 0);
        const credit = accDetails.reduce((sum, det) => sum + (det.credit || 0), 0);
        sheet.addRow({
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit,
          credit,
          balance: acc.balance || 0
        });
      });

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.eachRow((row) => { row.height = 25; });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=General_Ledger_Report.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'trial-balance') {
      const sheet = workbook.addWorksheet('ميزان المراجعة');
      sheet.views = [{ rightToLeft: true }];
      const accounts = await getCollectionData('accounts', tenantId);

      sheet.columns = [
        { header: 'كود الحساب', key: 'code', width: 15 },
        { header: 'اسم الحساب', key: 'name', width: 35 },
        { header: 'الجانب المدين', key: 'debit', width: 20 },
        { header: 'الجانب الدائن', key: 'credit', width: 20 }
      ];

      let totalDebits = 0;
      let totalCredits = 0;

      accounts.forEach((acc: any) => {
        const isDebitType = acc.type === 'asset' || acc.type === 'expense';
        const balance = Number(acc.balance) || 0;
        const debitVal = isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);
        const creditVal = !isDebitType ? (balance >= 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0);
        totalDebits += debitVal;
        totalCredits += creditVal;

        sheet.addRow({
          code: acc.code,
          name: acc.name,
          debit: debitVal,
          credit: creditVal
        });
      });

      sheet.addRow({
        code: 'المجموع',
        name: 'إجمالي الأرصدة المدينة والدائنة',
        debit: totalDebits,
        credit: totalCredits
      });

      const lastRow = sheet.lastRow;
      if (lastRow) {
        lastRow.font = { bold: true };
        lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      }

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.eachRow((row) => { row.height = 25; });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Trial_Balance.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'profit-loss') {
      const sheet = workbook.addWorksheet('قائمة الدخل');
      sheet.views = [{ rightToLeft: true }];
      const accounts = await getCollectionData('accounts', tenantId);

      sheet.columns = [
        { header: 'البند المالي', key: 'name', width: 35 },
        { header: 'الكود الحسابي', key: 'code', width: 15 },
        { header: 'الرصيد المالي', key: 'balance', width: 20 }
      ];

      const revenues = accounts.filter((a: any) => a.type === "revenue");
      const expenses = accounts.filter((a: any) => a.type === "expense");

      sheet.addRow({ name: '--- الإيرادات والمبيعات ---', code: '', balance: '' });
      revenues.forEach((r: any) => {
        sheet.addRow({ name: r.name, code: r.code, balance: r.balance || 0 });
      });

      const totalRevenues = revenues.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
      sheet.addRow({ name: 'إجمالي الإيرادات', code: '', balance: totalRevenues });

      sheet.addRow({ name: '--- المصاريف والتكاليف ---', code: '', balance: '' });
      expenses.forEach((e: any) => {
        sheet.addRow({ name: e.name, code: e.code, balance: e.balance || 0 });
      });

      const totalExpenses = expenses.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
      sheet.addRow({ name: 'إجمالي المصاريف', code: '', balance: totalExpenses });

      sheet.addRow({ name: 'صافي الربح / الخسارة', code: '', balance: totalRevenues - totalExpenses });

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      sheet.eachRow((row) => {
        row.height = 25;
        const nameVal = String(row.getCell(1).value || '');
        if (nameVal.startsWith('---') || nameVal.includes('إجمالي') || nameVal.includes('صافي')) {
          row.font = { bold: true };
          if (nameVal.includes('صافي')) {
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          }
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Profit_And_Loss.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'balance-sheet') {
      const sheet = workbook.addWorksheet('الميزانية العمومية');
      sheet.views = [{ rightToLeft: true }];
      const accounts = await getCollectionData('accounts', tenantId);

      sheet.columns = [
        { header: 'البند الحسابي', key: 'name', width: 35 },
        { header: 'الكود', key: 'code', width: 15 },
        { header: 'الرصيد المالي', key: 'balance', width: 20 }
      ];

      const assets = accounts.filter((a: any) => a.type === "asset");
      const liabilities = accounts.filter((a: any) => a.type === "liability");
      const equity = accounts.filter((a: any) => a.type === "equity");

      sheet.addRow({ name: '--- الأصول (Assets) ---', code: '', balance: '' });
      assets.forEach((a: any) => {
        sheet.addRow({ name: a.name, code: a.code, balance: a.balance || 0 });
      });
      const totalAssets = assets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
      sheet.addRow({ name: 'إجمالي الأصول', code: '', balance: totalAssets });

      sheet.addRow({ name: '--- الالتزامات (Liabilities) ---', code: '', balance: '' });
      liabilities.forEach((l: any) => {
        sheet.addRow({ name: l.name, code: l.code, balance: l.balance || 0 });
      });
      const totalLiabilities = liabilities.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
      sheet.addRow({ name: 'إجمالي الالتزامات', code: '', balance: totalLiabilities });

      sheet.addRow({ name: '--- حقوق الملكية (Equity) ---', code: '', balance: '' });
      equity.forEach((eq: any) => {
        sheet.addRow({ name: eq.name, code: eq.code, balance: eq.balance || 0 });
      });
      const totalEquity = equity.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
      sheet.addRow({ name: 'إجمالي حقوق الملكية', code: '', balance: totalEquity });

      sheet.addRow({ name: 'إجمالي الالتزامات وحقوق الملكية', code: '', balance: totalLiabilities + totalEquity });

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      sheet.eachRow((row) => {
        row.height = 25;
        const nameVal = String(row.getCell(1).value || '');
        if (nameVal.startsWith('---') || nameVal.includes('إجمالي')) {
          row.font = { bold: true };
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Balance_Sheet.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'cash-flow') {
      const sheet = workbook.addWorksheet('التدفقات النقدية');
      sheet.views = [{ rightToLeft: true }];
      const bankTransactions = await getCollectionData('bankTransactions', tenantId);

      sheet.columns = [
        { header: 'النشاط النقدي', key: 'activity', width: 40 },
        { header: 'المقبوضات (Inflow)', key: 'inflow', width: 20 },
        { header: 'المدفوعات (Outflow)', key: 'outflow', width: 20 },
        { header: 'صافي التدفق النقدي', key: 'net', width: 20 }
      ];

      const operatingInflows = bankTransactions.filter((tx: any) => tx.type === "deposit" && tx.category === "sales").reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
      const operatingOutflows = bankTransactions.filter((tx: any) => tx.type === "withdrawal" && (tx.category === "expense" || tx.category === "payroll")).reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

      sheet.addRow({
        activity: 'الأنشطة التشغيلية (المبيعات والمصاريف والرواتب)',
        inflow: operatingInflows,
        outflow: operatingOutflows,
        net: operatingInflows - operatingOutflows
      });

      sheet.addRow({
        activity: 'الأنشطة الاستثمارية (شراء وبيع الأصول الثابتة)',
        inflow: 0,
        outflow: 0,
        net: 0
      });

      sheet.addRow({
        activity: 'الأنشطة التمويلية (زيادة رأس المال والقروض)',
        inflow: 0,
        outflow: 0,
        net: 0
      });

      sheet.addRow({
        activity: 'صافي الزيادة في النقدية خلال الفترة',
        inflow: operatingInflows,
        outflow: operatingOutflows,
        net: operatingInflows - operatingOutflows
      });

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF854D0E' } };
      sheet.eachRow((row) => { row.height = 25; });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Cash_Flow_Report.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'tax') {
      const sheet = workbook.addWorksheet('تقرير الإقرار الضريبي');
      sheet.views = [{ rightToLeft: true }];
      const invoices = await getCollectionData('invoices', tenantId);
      const expenses = await getCollectionData('expenses', tenantId);

      sheet.columns = [
        { header: 'المؤشر الضريبي', key: 'indicator', width: 35 },
        { header: 'العدد', key: 'count', width: 15 },
        { header: 'القيمة الضريبية المستحقة', key: 'amount', width: 25 }
      ];

      const outputTax = invoices.filter((i: any) => i.status === "paid" || i.status === "unpaid" || i.status === "overdue").reduce((sum: number, i: any) => sum + (Number(i.taxAmount || i.tax) || 0), 0);
      const inputTax = expenses.reduce((sum: number, e: any) => sum + (Number(e.taxAmount || e.tax) || 0), 0);

      sheet.addRow({ indicator: 'ضريبة المخرجات (المبيعات والفواتير الصادرة)', count: invoices.length, amount: outputTax });
      sheet.addRow({ indicator: 'ضريبة المدخلات (المشتريات والمصاريف الواردة)', count: expenses.length, amount: inputTax });
      sheet.addRow({ indicator: 'صافي الضريبة المستحقة لمصلحة الضرائب المصرية', count: '-', amount: outputTax - inputTax });

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
      sheet.eachRow((row) => { row.height = 25; });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Egypt_Tax_Report.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(400).json({ error: 'Unsupported report export type' });
  } catch (error: any) {
    console.error('Error generating Excel report:', error);
    return res.status(500).json({ error: 'Internal server error while generating Excel file' });
  }
};
