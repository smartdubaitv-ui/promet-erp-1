require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({});
const DB_FILE = path.join(process.cwd(), 'database.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ database.json not found!');
    process.exit(1);
  }

  console.log('🔄 Loading database.json...');
  const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const collections = Object.keys(dbData);

  console.log('💾 Copying data to SQLite via Prisma...');

  for (const collection of collections) {
    const items = dbData[collection];
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`ℹ️ Collection [${collection}] is empty, skipping.`);
      continue;
    }

    console.log(`⏳ Migrating ${items.length} records to table [${collection}]...`);

    // لتفادي المشاكل مع الجداول غير المتوافقة أو الحقول الزائدة
    const prismaModel = prisma[collection];
    if (!prismaModel) {
      console.warn(`⚠️ Warning: Model [${collection}] does not exist in Prisma Client, skipping.`);
      continue;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      const cleanData = {};
      
      // نقوم بتنظيف ومعالجة الحقول لتطابق بنية SQLite والـ Schema
      for (const [key, value] of Object.entries(item)) {
        // تنظيف اسم المفتاح ليطابق الـ Schema المتولدة
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        if (!cleanKey) continue;

        if (cleanKey === 'is_core') {
          cleanData[cleanKey] = (value === 1 || value === true || value === '1' || String(value).toLowerCase() === 'true');
        } else if (cleanKey === 'role_id' || cleanKey === 'permission_id') {
          cleanData[cleanKey] = value !== null && value !== undefined ? String(value) : value;
        } else if (value && (typeof value === 'object' || Array.isArray(value))) {
          // تحويل الكائنات والمصفوفات إلى نصوص JSON متوافقة مع SQLite
          cleanData[cleanKey] = JSON.stringify(value);
        } else {
          cleanData[cleanKey] = value;
        }
      }

      // التأكد من وجود معرّف ID، وإذا لم يوجد نقوم بتوليد معرّف عشوائي
      if (!cleanData.id) {
        cleanData.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      cleanData.id = String(cleanData.id);

      try {
        await prismaModel.upsert({
          where: { id: String(cleanData.id) },
          update: cleanData,
          create: cleanData,
        });
        successCount++;
      } catch (err) {
        // إذا فشل الإدخال بسبب حقل غير موجود في الـ schema، نقوم بحذفه وإعادة المحاولة بحقول منقّحة
        console.error(`❌ Error migrating record in [${collection}] ID: ${cleanData.id}. Retrying with strict fields...`);
        try {
          // جلب الحقول المسموح بها في هذا الجدول من Prisma dmmf
          const allowedFields = Object.keys(prismaModel.fields || {});
          if (allowedFields.length > 0) {
            const strictData = {};
            for (const f of allowedFields) {
              if (cleanData[f] !== undefined) strictData[f] = cleanData[f];
            }
            await prismaModel.upsert({
              where: { id: String(cleanData.id) },
              update: strictData,
              create: strictData,
            });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (innerErr) {
          console.error(`❌ Double failure for record ID: ${cleanData.id}:`, innerErr.message);
          errorCount++;
        }
      }
    }

    console.log(`✅ Table [${collection}] migration finished: ${successCount} success, ${errorCount} failed.`);
  }

  console.log('🎉 Data migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Data migration failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
