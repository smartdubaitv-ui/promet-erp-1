import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  headerColorClass?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  headerColorClass = "text-amber-400",
  maxWidthClass = "max-w-md",
  children
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-slate-800 border border-slate-700 rounded-2xl ${maxWidthClass} w-full p-6 shadow-2xl dir-rtl my-auto max-h-[90vh] overflow-y-auto custom-scrollbar`}
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4 sticky top-0 bg-slate-800 z-10">
            <h3 className={`text-base font-bold ${headerColorClass} flex items-center gap-2`}>
              {icon}
              <span>{title}</span>
            </h3>
            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1.5 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          <div className="text-xs text-slate-200">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
