import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Global Fetch Interceptor to attach Authorization Bearer token automatically for /api/ requests
const originalFetch = window.fetch;
const customFetch = async function (this: any, input: any, init?: any) {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as any).url || '';
  }

  // Only intercept relative or absolute API endpoints targeting /api
  if (url.startsWith('/api') || url.includes('/api/')) {
    const token = localStorage.getItem('token');
    if (token) {
      init = init || {};
      // Handle Headers object or record
      if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${token}`);
        }
      } else if (Array.isArray(init.headers)) {
        const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
        if (!hasAuth) {
          init.headers.push(['Authorization', `Bearer ${token}`]);
        }
      } else {
        const headers = init.headers ? { ...init.headers } : {};
        const keys = Object.keys(headers).map(k => k.toLowerCase());
        if (!keys.includes('authorization')) {
          (headers as any)['Authorization'] = `Bearer ${token}`;
        }
        init.headers = headers;
      }
    }
  }
  return originalFetch.apply(this, [input, init]);
};

try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: customFetch
  });
} catch (e) {
  console.warn("Failed to set fetch via Object.defineProperty on window, trying prototype...", e);
  try {
    Object.defineProperty(Window.prototype, 'fetch', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: customFetch
    });
  } catch (errProto) {
    console.warn("Failed to set fetch via prototype, attempting direct assignment fallback...", errProto);
    try {
      (window as any).fetch = customFetch;
    } catch (finalErr) {
      console.error("Critical: Unable to intercept fetch:", finalErr);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
