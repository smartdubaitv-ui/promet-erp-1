import { HelmetOptions } from 'helmet';

// ============================================================
// 1. تحديد البيئة
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';

// ============================================================
// 2. سياسة CSP للإنتاج (مرنة لبيئة المعاينة والتطوير المشترك)
// ============================================================

const productionCSP = {
  directives: {
    // المصادر الافتراضية
    defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
    
    // Scripts - تفعيل unsafe-inline و unsafe-eval لتوافق تام مع حزم الويب والمعاينة
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https:',
      'http:'
    ],
    
    // Styles
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
      'https:',
      'http:'
    ],
    
    // Images
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http:',
    ],
    
    // Connections (API calls)
    connectSrc: [
      "'self'",
      'https:',
      'http:',
      'ws:',
      'wss:',
    ],
    
    // Fonts
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
      'https:',
      'http:'
    ],
    
    // Objects
    objectSrc: ["'none'"],
    
    // Frames
    frameAncestors: ["'self'", "https://*.run.app", "https://*.google.com", "https://*.googleusercontent.com", "https://*.aistudio.google.com", "https://aistudio.google.com"],
    
    // Forms
    formAction: ["'self'"],
  },
};

// ============================================================
// 3. سياسة CSP للتطوير (مرنة للغاية)
// ============================================================

const developmentCSP = {
  directives: {
    defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
    imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
    connectSrc: ["'self'", "http://localhost:*", "https://*", "ws:", "wss:"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https:", "http:"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'", "https://*.run.app", "https://*.google.com", "https://*.googleusercontent.com", "https://*.aistudio.google.com", "https://aistudio.google.com"],
    formAction: ["'self'"],
  },
};

// ============================================================
// 4. إعدادات Helmet الكاملة
// ============================================================

export const helmetConfig: HelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: isProduction ? productionCSP : developmentCSP,
  
  // Frame Options - السماح بتضمين التطبيق في iframes للمعاينة
  frameguard: false,
  
  // XSS Protection
  xXssProtection: true,
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // No Sniff - منع تخمين نوع المحتوى
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
};

export default helmetConfig;
