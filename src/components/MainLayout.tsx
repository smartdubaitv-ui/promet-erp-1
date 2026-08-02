import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { colors, typography } from '../theme';

interface MainLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  title,
  description,
  actions,
  children,
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
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-purple-500/10 pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h1>
            {description && (
              <p className="text-xs text-purple-300 mt-1.5 font-medium leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 self-start md:self-center">
              {actions}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="w-full">
          {children}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h1>
          {description && (
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 self-start md:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {children}
      </div>
    </motion.div>
  );
};

export default MainLayout;
