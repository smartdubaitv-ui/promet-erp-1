import React, { useState, useEffect } from 'react';
import { colors, typography } from '../../theme';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'لا توجد بيانات لعرضها',
  className = '',
  onRowClick,
}: TableProps<T>) {
  const [isNeon, setIsNeon] = useState(false);

  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (isNeon) {
    return (
      <div className={`w-full overflow-x-auto ${className}`}>
        <table className="cyber-table w-full border-collapse text-right" dir="rtl">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-4 
                    text-xs font-semibold text-purple-300
                    ${column.align === 'left' ? 'text-left' : column.align === 'center' ? 'text-center' : 'text-right'}
                    ${column.className || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center">
                  <div className="flex justify-center items-center gap-2 text-purple-400">
                    <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>جاري تحميل البيانات الفضائية...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-xs font-semibold text-purple-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={rowKey(item, index)}
                  onClick={() => onRowClick && onRowClick(item, index)}
                  className={`
                    border-b border-purple-500/5 
                    hover:bg-purple-950/20 
                    transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        px-6 py-4 
                        text-xs text-slate-200 font-medium
                        ${column.align === 'left' ? 'text-left' : column.align === 'center' ? 'text-center' : 'text-right'}
                        ${column.className || ''}
                      `}
                    >
                      {column.render ? column.render(item, index) : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-right" dir="rtl">
        <thead>
          <tr className="border-b border-slate-700/80 bg-slate-900/60">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-6 py-4 
                  text-xs font-semibold text-slate-300
                  ${column.align === 'left' ? 'text-left' : column.align === 'center' ? 'text-center' : 'text-right'}
                  ${column.className || ''}
                `}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center">
                <div className="flex justify-center items-center gap-2 text-slate-400">
                  <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>جاري التحميل...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-xs font-semibold text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={rowKey(item, index)}
                onClick={() => onRowClick && onRowClick(item, index)}
                className={`
                  border-b border-slate-700/40 
                  hover:bg-slate-700/30 
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      px-6 py-4 
                      text-xs text-slate-200 font-medium
                      ${column.align === 'left' ? 'text-left' : column.align === 'center' ? 'text-center' : 'text-right'}
                      ${column.className || ''}
                    `}
                  >
                    {column.render ? column.render(item, index) : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
