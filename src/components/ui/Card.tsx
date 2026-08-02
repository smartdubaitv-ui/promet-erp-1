import React, { useState, useEffect } from 'react';
import { colors, borderRadius, shadows, typography } from '../../theme';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerAction,
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

  if (isNeon) {
    return (
      <div className={`card-glow overflow-hidden ${className}`}>
        {(title || subtitle || headerAction) && (
          <div className="px-4.5 py-3 border-b border-purple-500/10 flex justify-between items-center bg-purple-950/10">
            <div>
              {title && (
                <h3 className="text-sm font-black text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-purple-300 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}
        <div className="p-4.5">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-slate-800 rounded-2xl
        shadow-md
        border border-slate-700/80
        overflow-hidden
        ${className}
      `}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-4.5 py-3 border-b border-slate-700/80 flex justify-between items-center bg-slate-800/80">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4.5 text-slate-200">{children}</div>
    </div>
  );
};
