import fs from 'fs';
import path from 'path';
import { prisma } from '../../services/prisma.service';

export let cachedDb: any = {};
const DB_FILE_NAME = 'database.json';

const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;

export async function initDbInterceptor() {
  console.log("🔄 Virtual SQLite/Prisma interceptor for database.json is initializing...");
  const modelNames = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  
  for (const model of modelNames) {
    try {
      const items = await (prisma as any)[model].findMany();
      // Restore values from JSON strings if they were stringified objects
      cachedDb[model] = items.map((item: any) => {
        const clean: any = {};
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
              clean[key] = JSON.parse(val);
            } catch {
              clean[key] = val;
            }
          } else {
            clean[key] = val;
          }
        }
        return clean;
      });
    } catch (e) {
      cachedDb[model] = [];
    }
  }
  console.log(`✅ Virtual database.json interceptor successfully loaded with ${Object.keys(cachedDb).length} collections.`);
}

export async function syncToSqlite(data: any) {
  const modelNames = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  
  for (const model of modelNames) {
    if (!data[model]) continue;
    
    const items = data[model];
    const prismaModel = (prisma as any)[model];
    if (!prismaModel) continue;

    for (const item of items) {
      if (!item.id) continue;
      const id = String(item.id);
      
      const cleanData: any = {};
      for (const [k, v] of Object.entries(item)) {
        if (v && (typeof v === 'object' || Array.isArray(v))) {
          cleanData[k] = JSON.stringify(v);
        } else {
          cleanData[k] = v;
        }
      }
      
      // Handle the boolean normalizations
      if (model === 'modules' && cleanData.is_core !== undefined) {
        cleanData.is_core = (cleanData.is_core === 1 || cleanData.is_core === true || String(cleanData.is_core).toLowerCase() === 'true');
      }
      if (model === 'role_permissions') {
        if (cleanData.role_id) cleanData.role_id = String(cleanData.role_id);
        if (cleanData.permission_id) cleanData.permission_id = String(cleanData.permission_id);
      }

      try {
        await prismaModel.upsert({
          where: { id },
          update: cleanData,
          create: cleanData,
        });
      } catch (err) {
        // Safe skip on error
      }
    }
    
    // Sync deletions
    try {
      const existing = await prismaModel.findMany({ select: { id: true } });
      const existingIds = existing.map((x: any) => String(x.id));
      const currentIds = items.map((x: any) => String(x.id)).filter(Boolean);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await prismaModel.deleteMany({
          where: { id: { in: toDelete } }
        });
      }
    } catch (err) {
      // Safe skip
    }
  }
}

// Override fs methods
const originalStatSync = fs.statSync;
const originalStat = fs.stat;
const originalPromisesStat = fs.promises?.stat;
const originalPromisesReadFile = fs.promises?.readFile;
const originalPromisesWriteFile = fs.promises?.writeFile;

(fs as any).existsSync = function (p: fs.PathLike): boolean {
  const pStr = String(p);
  if (pStr.endsWith(DB_FILE_NAME)) {
    return true;
  }
  return originalExistsSync.apply(this, arguments as any);
};

(fs as any).statSync = function (p: fs.PathLike, options?: any): any {
  const pStr = String(p);
  if (pStr.endsWith(DB_FILE_NAME)) {
    return {
      isFile: () => true,
      isDirectory: () => false,
      isSymbolicLink: () => false,
      size: JSON.stringify(cachedDb).length,
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date()
    } as any;
  }
  return originalStatSync.apply(this, arguments as any);
};

(fs as any).stat = Object.assign(function (p: fs.PathLike, optionsOrCallback?: any, callback?: any): void {
  const pStr = String(p);
  if (pStr.endsWith(DB_FILE_NAME)) {
    const mockStats = {
      isFile: () => true,
      isDirectory: () => false,
      isSymbolicLink: () => false,
      size: JSON.stringify(cachedDb).length,
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date()
    } as any;
    if (typeof optionsOrCallback === 'function') {
      optionsOrCallback(null, mockStats);
    } else if (typeof callback === 'function') {
      callback(null, mockStats);
    }
    return;
  }
  return originalStat.apply(this, arguments as any);
}, { __promisify__: originalStat.__promisify__ });

if (fs.promises) {
  if (originalPromisesStat) {
    fs.promises.stat = async function (p: fs.PathLike, options?: any): Promise<any> {
      const pStr = String(p);
      if (pStr.endsWith(DB_FILE_NAME)) {
        return {
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
          size: JSON.stringify(cachedDb).length,
          mtime: new Date(),
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date()
        } as any;
      }
      return originalPromisesStat.apply(this, arguments as any);
    };
  }

  if (originalPromisesReadFile) {
    fs.promises.readFile = async function (p: fs.PathLike | fs.promises.FileHandle, options?: any): Promise<any> {
      const pStr = String(p);
      if (pStr.endsWith(DB_FILE_NAME)) {
        const data = JSON.stringify(cachedDb, null, 2);
        if (options && (options === 'utf8' || options.encoding === 'utf8')) {
          return data;
        }
        return Buffer.from(data);
      }
      return originalPromisesReadFile.apply(this, arguments as any);
    };
  }

  if (originalPromisesWriteFile) {
    fs.promises.writeFile = async function (p: fs.PathLike | fs.promises.FileHandle, data: any, options?: any): Promise<any> {
      const pStr = String(p);
      if (pStr.endsWith(DB_FILE_NAME)) {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          cachedDb = parsed;
          await syncToSqlite(parsed);
          return;
        } catch (e) {
          console.error("❌ Error intercepting write to database.json via promises:", e);
        }
      }
      return originalPromisesWriteFile.apply(this, arguments as any);
    };
  }
}

(fs as any).readFileSync = function (p: fs.PathOrFileDescriptor, options?: any): any {
  const pStr = String(p);
  if (pStr.endsWith(DB_FILE_NAME)) {
    return JSON.stringify(cachedDb, null, 2);
  }
  return originalReadFileSync.apply(this, arguments as any);
};

(fs as any).writeFileSync = function (p: fs.PathOrFileDescriptor, data: any, options?: any): void {
  const pStr = String(p);
  if (pStr.endsWith(DB_FILE_NAME)) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      cachedDb = parsed;
      syncToSqlite(parsed).catch(err => {
        console.error("❌ Failed to sync in-memory writes to SQLite:", err);
      });
      return;
    } catch (e) {
      console.error("❌ Error intercepting write to database.json:", e);
    }
  }
  return originalWriteFileSync.apply(this, arguments as any);
};
