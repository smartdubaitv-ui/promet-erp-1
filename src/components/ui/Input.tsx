import React, { useState, useEffect } from 'react';
import { colors, borderRadius, typography } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  className = '',
  id,
  ...props
}) => {
  const [isNeon, setIsNeon] = useState(false);

  useEffect(() => {
    setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    const observer = new MutationObserver(() => {
      setIsNeon(document.documentElement.classList.contains('theme-neon-active'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  if (isNeon) {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-purple-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={`
            w-full px-4 py-2
            bg-white/5 border border-purple-500/20 rounded-md
            text-sm text-white placeholder-slate-500
            transition-all duration-200
            focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500
            ${error ? 'border-red-500 bg-red-950/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-[11px] text-red-400">
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="mt-1 text-[11px] text-purple-400">
            {helper}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-300 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2
          bg-slate-900 border border-slate-700/80 rounded-xl
          text-xs text-white placeholder-slate-500
          transition-all duration-200
          focus:outline-none focus:border-blue-500
          ${error ? 'border-rose-500 bg-rose-950/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-rose-400">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1 text-xs text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
};
