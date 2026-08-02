import fs from 'fs';
import path from 'path';
import { generateBackupData } from '../controllers/backup.controller';

const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startAutoBackupScheduler() {
  console.log("⚙️ Starting automatic backup background scheduler...");
  
  // Run an immediate check on startup (delayed slightly to let system initialize)
  setTimeout(() => {
    runAutoBackupCheck().catch(err => {
      console.error("❌ Error running startup auto backup check:", err);
    });
  }, 10000);

  // Set up periodic check
  setInterval(() => {
    runAutoBackupCheck().catch(err => {
      console.error("❌ Error running periodic auto backup check:", err);
    });
  }, BACKUP_INTERVAL_MS);
}

async function runAutoBackupCheck() {
  const tenantId = "tenant-promet-sa";
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all existing automatic backups
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json') && file.startsWith('auto_backup_'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        time: stats.birthtime.getTime() || stats.mtime.getTime()
      };
    })
    .sort((a, b) => b.time - a.time);

  let shouldBackup = false;

  if (files.length === 0) {
    console.log("📝 No previous automatic backups found. Triggering first auto-backup...");
    shouldBackup = true;
  } else {
    const latestBackup = files[0];
    const now = Date.now();
    const timeDiff = now - latestBackup.time;

    if (timeDiff >= ONE_DAY_MS) {
      console.log(`🕒 Latest automatic backup (${latestBackup.filename}) is older than 24 hours. Triggering daily auto-backup...`);
      shouldBackup = true;
    }
  }

  if (shouldBackup) {
    try {
      const backupData = await generateBackupData(tenantId);
      const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const filename = `auto_backup_${dateStr}.json`;
      const filePath = path.join(backupDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(`✅ Automatic daily backup successfully saved: ${filename}`);

      // Prune old backups to maintain the limit of last 10 backups
      const updatedFiles = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json') && f.startsWith('auto_backup_'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).birthtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (updatedFiles.length > 10) {
        const toDelete = updatedFiles.slice(10);
        for (const f of toDelete) {
          fs.unlinkSync(path.join(backupDir, f.name));
          console.log(`🧹 Pruned old automated backup file: ${f.name}`);
        }
      }
    } catch (err) {
      console.error("❌ Failed to generate background automatic backup:", err);
    }
  }
}
