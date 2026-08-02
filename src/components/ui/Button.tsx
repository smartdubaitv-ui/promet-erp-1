import React, { useState, useEffect } from 'react';
import { colors, borderRadius, typography } from '../../theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
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

  const getVariantStyles = () => {
    if (isNeon) {
      switch (variant) {
        case 'primary':
          return 'btn-neon text-white font-semibold shadow-purple-500/20';
        case 'secondary':
          return 'bg-purple-950/50 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 font-semibold';
        case 'danger':
          return 'bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-500/30 font-semibold';
        case 'warning':
          return 'bg-yellow-950/50 hover:bg-yellow-900/40 text-yellow-400 border border-yellow-500/30 font-semibold';
        case 'ghost':
          return 'bg-transparent hover:bg-purple-950/20 text-purple-300 border border-transparent hover:border-purple-500/10';
        default:
          return 'btn-neon text-white font-semibold';
      }
    }

    switch (variant) {
      case 'primary':
        return `bg-${colors.primary[600]} hover:bg-${colors.primary[700]} text-white`;
      case 'secondary':
        return `bg-${colors.secondary[600]} hover:bg-${colors.secondary[700]} text-white`;
      case 'danger':
        return `bg-${colors.danger[600]} hover:bg-${colors.danger[700]} text-white`;
      case 'warning':
        return `bg-${colors.warning[500]} hover:bg-${colors.warning[600]} text-white`;
      case 'ghost':
        return `bg-transparent hover:bg-${colors.neutral[100]} text-${colors.neutral[700]}`;
      default:
        return `bg-${colors.primary[600]} hover:bg-${colors.primary[700]} text-white`;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${disabledStyles}
        font-semibold rounded-${borderRadius.md}
        transition-all duration-200
        flex items-center justify-center gap-2
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
