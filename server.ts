import path from "path";
import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import { authenticate, authorize } from "./src/middleware/auth.middleware";

// استيراد التهيئة الموديلية من مجلد src
import { setupApp } from "./src/config/app";
import { setupRoutes } from "./src/routes";
import { logger } from "./src/config/logger";
import { loadDatabase } from "./src/data/jsonDatabase";
import { initializeDatabaseWithFirestore } from "./src/services/firestoreSync.service";
import { verifyFirebaseConnection } from "./services/firebase.service";
import { connectPostgres, isPostgresConnected } from "./services/postgres.service";
import { startAutoBackupScheduler } from "./src/services/auto-backup.service";
import { startAutomationScheduler } from "./src/services/automation.service";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

// ============================================================
// 1. تهيئة تطبيق Express الأساسي
// ============================================================
const app = setupApp();

// ============================================================
// 2. تهيئة عميل Gemini AI بشكل آمن وتلقائي
// ============================================================
let ai: any = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    logger.info("🤖 Gemini AI Client initialized successfully.");
  } catch (err) {
    logger.error("❌ Failed to initialize Gemini AI Client:", err);
  }
} else {
  logger.info("ℹ️ No GEMINI_API_KEY found. Running rule-based local simulation for AI features.");
}

// ============================================================
// 3. تسجيل المسارات الموديلية المشتركة (Router)
// ============================================================
setupRoutes(app);

// مسارات قديمة متوافقة مع بوابات HTML الكلاسيكية إذا لزم الأمر
app.get('/admin_dashboard.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'admin_dashboard.html'));
});

app.get('/welcome.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'welcome.html'));
});

app.get('/employee_portal.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'employee_portal.html'));
});

// ============================================================
// 3.5. مسار تحميل الكود المصدري كاملاً بصيغة ZIP
// ============================================================
app.get('/api/download-source-zip', authenticate, authorize('admin'), (req, res) => {
  try {
    logger.info("📦 Generating complete secure source code ZIP archive...");
    const zip = new AdmZip();
    const rootDir = process.cwd();
    const items = fs.readdirSync(rootDir);
    
    for (const item of items) {
      // استبعاد صارم للملفات الحساسة، المجلدات الضخمة، والملفات المضغوطة الأخرى
      if (
        item === "node_modules" || 
        item === "dist" || 
        item === ".git" || 
        item === "dev.db" || 
        item === "database.json" || // منع تسريب قاعدة البيانات الحية
        item === "database.json.bak" || 
        item.startsWith(".env") ||  // منع تسريب ملفات البيئة والأسرار (.env, .env.production, إلخ)
        item.endsWith(".zip")
      ) {
        continue;
      }
      
      const itemPath = path.join(rootDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        zip.addLocalFolder(itemPath, item);
      } else {
        zip.addLocalFile(itemPath);
      }
    }

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=source-code-${Date.now()}.zip`);
    logger.info("✅ Secure source code ZIP generated and dispatched successfully.");
    return res.send(zipBuffer);

  } catch (err: any) {
    logger.error("Backup download error:", err);
    return res.status(500).json({ error: "Failed to generate source backup" });
  }
});

// ============================================================
// 4. دمج Vite (التطوير) وخدمة الملفات الثابتة (الإنتاج)
// ============================================================
async function configureFrontendService() {
  if (process.env.NODE_ENV !== "production") {
    logger.info("🛠️ Starting server in development mode with Vite HMR Server...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const indexHtmlPath = path.join(process.cwd(), "index.html");
        let html = fs.readFileSync(indexHtmlPath, "utf-8");
        html = await vite.transformIndexHtml(url, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    logger.info("📦 Starting server in production mode (Serving built assets)...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// ============================================================
// 5. تشغيل الخادم والاتصال بقواعد البيانات
// ============================================================
async function startServer() {
  // تهيئة معترض قاعدة البيانات المدمج وتحميل بيانات SQLite
  try {
    const { initDbInterceptor } = await import("./src/data/db-interceptor");
    await initDbInterceptor();
  } catch (err) {
    logger.error("❌ Failed to initialize database interceptor:", err);
  }

  // التحقق من مفتاح الحماية في الإنتاج
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    logger.error("❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in production environment!");
    process.exit(1);
  }

  // إعداد خدمة الواجهة الأمامية
  await configureFrontendService();

  // الاستماع للمنفذ المعياري 3000
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Promet ERP Full-Stack Server listening on http://0.0.0.0:${PORT}`);
    
    // تشغيل نظام النسخ الاحتياطي التلقائي في الخلفية
    try {
      startAutoBackupScheduler();
    } catch (schedErr) {
      logger.error("❌ Failed to start auto-backup scheduler:", schedErr);
    }

    // تشغيل نظام الأتمتة المتقدم (الرواتب والمخزون)
    try {
      startAutomationScheduler();
    } catch (autoErr) {
      logger.error("❌ Failed to start automation scheduler:", autoErr);
    }
    
    // تحميل قاعدة البيانات المحلية الثنائية
    try {
      const db = loadDatabase();
      logger.info(`📂 Seed database loaded containing ${Object.keys(db).length} collections.`);
    } catch (dbErr) {
      logger.error("❌ Failed to seed or load local database JSON:", dbErr);
    }

    // الاتصال بقاعدة بيانات PostgreSQL السحابية
    connectPostgres().then(() => {
      if (isPostgresConnected()) {
        logger.info('✅ Connected to PostgreSQL Database via Sequelize successfully.');
      } else {
        logger.warn('⚠️ PostgreSQL Database skipped (local SQLite/JSON fallback active).');
      }
    });

    // المصادقة ومزامنة Firebase Firestore
    if (process.env.FIREBASE_ENABLED !== 'false') {
      verifyFirebaseConnection().then(async (connected) => {
        if (connected) {
          logger.info('🔥 Connected to Firebase Firestore with verified cloud privileges.');
          try {
            const syncResult = await initializeDatabaseWithFirestore();
            if (syncResult.success) {
              logger.info(`✅ Reconstituted ledger with ${syncResult.collectionsImported.length} Cloud collections.`);
            } else {
              logger.warn('⚠️ Firestore sync completed with zero records or skipped.');
            }
          } catch (syncErr) {
            logger.error("❌ Firestore synchronization error on startup:", syncErr);
          }
        } else {
          logger.warn('📁 Running under Local JSON Database fallback mode.');
        }
      });
    } else {
      logger.info('⚠️ Firebase disabled (FIREBASE_ENABLED=false), skipping connection attempt and using local JSON fallback.');
    }
  });
}

startServer();

export default app;
