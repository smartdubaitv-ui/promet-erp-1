import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'نظام إدارة المخزون والموظفين API',
      version: '1.0.0',
      description: 'توثيق واجهة برمجة التطبيقات (API) لنظام إدارة المخزون والموظفين مع نظام التحقق من الهوية والصلاحيات.',
      contact: {
        name: 'الدعم الفني',
        email: 'smartdubaitv@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'خادم التطوير المحلي',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل توكن JWT الخاص بك للوصول إلى المسارات المحمية.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user123' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'أحمد محمد' },
            role: { type: 'string', enum: ['admin', 'manager', 'user'], example: 'admin' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-07-02T13:00:00.000Z' },
            isActive: { type: 'boolean', example: true },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'prod123' },
            name: { type: 'string', example: 'طابعة ليزر HP' },
            category: { type: 'string', example: 'أجهزة مكتبية' },
            price: { type: 'number', example: 450.00 },
            stockQuantity: { type: 'integer', example: 15 },
            description: { type: 'string', example: 'طابعة ليزرية ملونة عالية الجودة' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: '123456' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: '123456' },
            name: { type: 'string', example: 'أحمد محمد' },
            role: { type: 'string', enum: ['admin', 'manager', 'user'], example: 'user' },
          },
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'تسجيل مستخدم جديد',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterRequest',
                },
              },
            },
          },
          responses: {
            201: {
              description: 'تم إنشاء الحساب بنجاح',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: '✅ تم إنشاء الحساب بنجاح' },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            400: { description: 'الحقول المطلوبة مفقودة' },
            409: { description: 'البريد الإلكتروني مسجل بالفعل' },
            500: { description: 'خطأ داخلي في الخادم' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'تسجيل الدخول للمستخدم',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'تم تسجيل الدخول بنجاح وتحصيل التوكن',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: '✅ تم تسجيل الدخول بنجاح' },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            400: { description: 'البريد الإلكتروني أو كلمة المرور مفقودة' },
            401: { description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
            500: { description: 'خطأ داخلي في الخادم' },
          },
        },
      },
      '/api/auth/verify': {
        get: {
          summary: 'التحقق من صلاحية وصحة توكن الـ JWT',
          tags: ['Authentication'],
          security: [
            {
              bearerAuth: [],
            },
          ],
          responses: {
            200: {
              description: 'التوكن صالح ومؤكد',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      valid: { type: 'boolean', example: true },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'user123' },
                          email: { type: 'string', example: 'user@example.com' },
                          role: { type: 'string', example: 'admin' },
                          iat: { type: 'integer', example: 1719912000 },
                          exp: { type: 'integer', example: 1720516800 },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'غير مصرح أو التوكن غير صالح' },
          },
        },
      },
      '/api/inventory': {
        get: {
          summary: 'جلب جميع منتجات المخزون',
          tags: ['Inventory'],
          responses: {
            200: {
              description: 'قائمة بجميع المنتجات',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Product',
                    },
                  },
                },
              },
            },
            500: { description: 'فشل جلب المنتجات' },
          },
        },
        post: {
          summary: 'إضافة منتج جديد للمخزون',
          tags: ['Inventory'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'price', 'stockQuantity'],
                  properties: {
                    name: { type: 'string', example: 'شاشة سامسونج 27 بوصة' },
                    category: { type: 'string', example: 'أجهزة مكتبية' },
                    price: { type: 'number', example: 299.99 },
                    stockQuantity: { type: 'integer', example: 10 },
                    description: { type: 'string', example: 'شاشة منحنية للألعاب والأعمال المكتبية' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'تم إضافة المنتج بنجاح',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            500: { description: 'فشل إضافة المنتج' },
          },
        },
      },
      '/api/inventory/{id}': {
        get: {
          summary: 'جلب منتج محدد بالمعرف',
          tags: ['Inventory'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'معرف المنتج المطلوب',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'بيانات المنتج المطلوب',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            404: { description: 'المنتج غير موجود' },
            500: { description: 'فشل جلب المنتج' },
          },
        },
        put: {
          summary: 'تحديث بيانات منتج بالمعرف',
          tags: ['Inventory'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'معرف المنتج المراد تحديثه',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'شاشة سامسونج 27 بوصة - إصدار مطور' },
                    category: { type: 'string', example: 'أجهزة مكتبية' },
                    price: { type: 'number', example: 320.00 },
                    stockQuantity: { type: 'integer', example: 8 },
                    description: { type: 'string', example: 'شاشة منحنية دقة 4K' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'تم تحديث المنتج بنجاح',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'تم تحديث المنتج' },
                    },
                  },
                },
              },
            },
            500: { description: 'فشل تحديث المنتج' },
          },
        },
        delete: {
          summary: 'حذف منتج من المخزون',
          tags: ['Inventory'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'معرف المنتج المراد حذفه',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'تم حذف المنتج بنجاح',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'تم حذف المنتج' },
                    },
                  },
                },
              },
            },
            500: { description: 'فشل حذف المنتج' },
          },
        },
      },
      '/api/inventory/{id}/stock': {
        patch: {
          summary: 'تحديث كمية المخزون لمنتج محدد',
          tags: ['Inventory'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'معرف المنتج',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['quantity'],
                  properties: {
                    quantity: { type: 'integer', example: 25 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'تم تحديث كمية المخزون بنجاح',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'تم تحديث المخزون إلى 25' },
                    },
                  },
                },
              },
            },
            500: { description: 'فشل تحديث المخزون' },
          },
        },
      },
      '/api/reports/export/excel': {
        get: {
          summary: 'تصدير التقارير المالية والأنشطة الـ23 إلى ملف Excel',
          tags: ['Reports'],
          parameters: [
            {
              name: 'type',
              in: 'query',
              required: true,
              description: 'نوع التقرير المراد تصديره (مثال: activities-23، general-ledger، trial-balance، profit-loss، balance-sheet، cash-flow، tax)',
              schema: {
                type: 'string',
                enum: ['activities-23', 'general-ledger', 'trial-balance', 'profit-loss', 'balance-sheet', 'cash-flow', 'tax']
              }
            },
            {
              name: 'token',
              in: 'query',
              required: false,
              description: 'توكن المصادقة JWT (مطلوب عند التحميل المباشر من المتصفح)',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'ملف Excel مجمع ومصمم بالكامل مع تنسيق RTL ودعم للغة العربية',
              content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                  schema: { type: 'string', format: 'binary' }
                }
              }
            },
            400: { description: 'نوع التقرير غير مدعوم' },
            401: { description: 'غير مصرح: يرجى تمرير التوكن للمصادقة' },
            500: { description: 'خطأ داخلي في الخادم أثناء إنشاء الملف' }
          }
        }
      },
    },
  },
  apis: [], // Can specify file paths if using JSDoc in routes, but specifying them inline is safer for ES/CommonJS compatibility issues
};

export const swaggerSpec = swaggerJSDoc(options);
