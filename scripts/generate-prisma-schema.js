import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');
const SCHEMA_FILE = path.join(process.cwd(), 'prisma/schema.prisma');

// القوالب والتعريفات اليدوية لضمان دقة الجداول الأساسية والفارغة
const manualModelDefinitions = {
  eta_settings: `model eta_settings {
  id              String   @id @default(uuid())
  company_name    String?
  tax_id          String?
  company_address String?
  activity_code   String?
  branch_code     String?
  building_number String?
  floor_number    String?
  room_number     String?
  postal_code     String?
  api_url         String?
  client_id       String?
  client_secret   String?
  is_active       Boolean? @default(true)
}`,
  role_permissions: `model role_permissions {
  id            String @id @default(uuid())
  role_id       String
  permission_id String
}`,
  modules: `model modules {
  id          String   @id
  code        String?
  name        String?
  description String?
  icon        String?
  is_active   Boolean?
  is_core     Boolean?
  order_index Int?
  created_at  String?
}`
};

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Error: database.json not found!');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const keys = Object.keys(db);

  let schemaContent = `// This is your Prisma schema file,
// generated automatically from database.json structure.

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider = "sqlite"
}

`;

  for (const key of keys) {
    // إذا كان هناك تعريف يدوي مخصص، نستخدمه
    if (manualModelDefinitions[key]) {
      schemaContent += manualModelDefinitions[key] + '\n\n';
      continue;
    }

    const items = db[key];
    const fields = new Map();

    // نحدد حقل المعرف الافتراضي
    fields.set('id', { type: 'String', isPk: true, isOptional: false });

    // إذا كان الجدول يحتوي على بيانات، نحلل أنواع الحقول من أول عنصر
    if (Array.isArray(items) && items.length > 0) {
      const sample = items[0];
      for (const [fieldKey, value] of Object.entries(sample)) {
        if (fieldKey === 'id') continue;

        let type = 'String';
        let isOptional = true;

        if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'Int' : 'Float';
        } else if (typeof value === 'boolean') {
          type = 'Boolean';
        } else if (value && (typeof value === 'object' || Array.isArray(value))) {
          // الحقول المعقدة مثل المصفوفات والكائنات نخزنها كـ String (JSON stringified) في SQLite
          type = 'String';
        }

        fields.set(fieldKey, { type, isPk: false, isOptional });
      }
    } else {
      // جداول فارغة - نحدد حقولاً أساسية شائعة لضمان إمكانية عملها
      fields.set('tenantId', { type: 'String', isPk: false, isOptional: true });
      fields.set('createdAt', { type: 'String', isPk: false, isOptional: true });
      fields.set('updatedAt', { type: 'String', isPk: false, isOptional: true });
    }

    // بناء كود الموديل لـ Prisma
    let modelStr = `model ${key} {\n`;
    for (const [fieldKey, info] of fields.entries()) {
      // تنظيف اسم الحقل ليتوافق مع Prisma (عدم احتواءه على مسافات أو رموز خاصة)
      const cleanFieldKey = fieldKey.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanFieldKey) continue;

      let fieldLine = `  ${cleanFieldKey} ${info.type}`;
      if (info.isOptional && !info.isPk) {
        fieldLine += '?';
      }
      if (info.isPk) {
        fieldLine += ' @id';
      }
      modelStr += fieldLine + '\n';
    }
    modelStr += '}\n\n';
    schemaContent += modelStr;
  }

  // التأكد من وجود المجلد prisma
  const prismaDir = path.dirname(SCHEMA_FILE);
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  fs.writeFileSync(SCHEMA_FILE, schemaContent, 'utf-8');
  console.log('✅ prisma/schema.prisma generated successfully!');
}

main();
