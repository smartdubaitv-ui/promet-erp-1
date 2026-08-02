import crypto from 'crypto';
import { isFirebaseConnected, firestore } from '../../services/firebase.service';
import { jsonDB } from '../data/jsonDatabase';
import { logger } from '../config/logger';

export interface AuditLog {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  action?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  changes?: string | null;
  prevHash?: string | null;
  currentHash?: string | null;
  createdAt?: string | null; // Optional timestamp for sorting
}

export class AuditService {
  /**
   * Calculates SHA-256 hash of a log record to ensure data integrity.
   */
  static calculateHash(record: {
    id: string;
    tenantId?: string | null;
    userId?: string | null;
    userEmail?: string | null;
    action?: string | null;
    resource?: string | null;
    resourceId?: string | null;
    changes?: string | null;
    prevHash?: string | null;
    createdAt?: string | null;
  }): string {
    const dataToHash = [
      record.id,
      record.tenantId || '',
      record.userId || '',
      record.userEmail || '',
      record.action || '',
      record.resource || '',
      record.resourceId || '',
      record.changes || '',
      record.prevHash || '',
      record.createdAt || ''
    ].join('|');

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Creates, signs, chains, and persists a new Audit Log.
   */
  static async createAuditLog(params: {
    tenantId?: string | null;
    userId?: string | null;
    userEmail?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    changes?: string | any | null;
  }): Promise<AuditLog> {
    const logId = `aud-chain-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    
    // Ensure changes is serialized to a string
    let changesStr = '';
    if (params.changes) {
      if (typeof params.changes === 'object') {
        try {
          changesStr = JSON.stringify(params.changes);
        } catch {
          changesStr = String(params.changes);
        }
      } else {
        changesStr = String(params.changes);
      }
    }

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Default Genesis Hash

    // 1. Fetch previous record's hash to form the cryptographic chain
    try {
      if (isFirebaseConnected() && firestore) {
        const snap = await firestore
          .collection('AuditLog')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (!snap.empty) {
          const lastRecord = snap.docs[0].data();
          if (lastRecord.currentHash) {
            prevHash = lastRecord.currentHash;
          }
        }
      } else {
        const db = jsonDB.load();
        const logs = db.AuditLog || [];
        if (logs.length > 0) {
          // Sort or pick the last element assuming push-only array
          const lastRecord = logs[logs.length - 1];
          if (lastRecord && lastRecord.currentHash) {
            prevHash = lastRecord.currentHash;
          }
        }
      }
    } catch (err) {
      logger.error('Failed to retrieve last audit log hash. Falling back to genesis hash.', err);
    }

    // 2. Build the current log record
    const newLog: AuditLog = {
      id: logId,
      tenantId: params.tenantId || null,
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || null,
      changes: changesStr || null,
      prevHash,
      currentHash: '',
      createdAt
    };

    // 3. Compute SHA-256 current hash
    newLog.currentHash = this.calculateHash(newLog);

    // 4. Save to Database
    try {
      if (isFirebaseConnected() && firestore) {
        await firestore.collection('AuditLog').doc(logId).set(newLog);
      } else {
        const db = jsonDB.load();
        if (!db.AuditLog) {
          db.AuditLog = [];
        }
        db.AuditLog.push(newLog);
        jsonDB.save(db);
      }
      logger.info(`🛡️ [CHAINED AUDIT LOG] Created tamper-evident log ${logId} (Action: ${params.action})`);
    } catch (saveErr) {
      logger.error(`❌ Failed to persist chained audit log: ${logId}`, saveErr);
    }

    return newLog;
  }

  /**
   * Fetches the complete audit log chain for verification.
   */
  static async getAuditLogChain(tenantId?: string): Promise<AuditLog[]> {
    try {
      let logs: AuditLog[] = [];
      if (isFirebaseConnected() && firestore) {
        let q = firestore.collection('AuditLog');
        if (tenantId) {
          const snap = await q.where('tenantId', '==', tenantId).get();
          logs = snap.docs.map(doc => doc.data() as AuditLog);
        } else {
          const snap = await q.get();
          logs = snap.docs.map(doc => doc.data() as AuditLog);
        }
      } else {
        const db = jsonDB.load();
        const allLogs = db.AuditLog || [];
        logs = tenantId ? allLogs.filter(log => log.tenantId === tenantId) : allLogs;
      }

      // Sort chronological
      return logs.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    } catch (err) {
      logger.error('Failed to fetch audit log chain:', err);
      return [];
    }
  }

  /**
   * Verifies the cryptographic integrity of the entire audit log chain.
   * Returns true if the chain is perfectly valid and untampered, or false with an error report.
   */
  static async verifyChainIntegrity(tenantId?: string): Promise<{ isValid: boolean; corruptedLogs: string[] }> {
    const logs = await this.getAuditLogChain(tenantId);
    const corruptedLogs: string[] = [];

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      
      // 1. Recalculate hash of current log
      const recalculated = this.calculateHash(current);
      if (recalculated !== current.currentHash) {
        logger.error(`🚨 Cryptographic corruption detected in log ${current.id}. Stored: ${current.currentHash}, Calculated: ${recalculated}`);
        corruptedLogs.push(current.id);
        continue;
      }

      // 2. Check back-link to the previous log hash
      if (i > 0) {
        const prev = logs[i - 1];
        if (current.prevHash !== prev.currentHash) {
          logger.error(`🚨 Chain breakage detected! Log ${current.id} references prevHash ${current.prevHash}, but previous log ${prev.id} has hash ${prev.currentHash}`);
          corruptedLogs.push(current.id);
        }
      } else {
        // First log (or oldest retrieved) check against genesis if we can be sure it's the absolute first
        // If not, we just ensure it has a non-empty prevHash or matches default genesis.
        if (!current.prevHash) {
          logger.error(`🚨 Genesis log ${current.id} has no prevHash.`);
          corruptedLogs.push(current.id);
        }
      }
    }

    return {
      isValid: corruptedLogs.length === 0,
      corruptedLogs
    };
  }
}
