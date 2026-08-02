import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

export interface DynamicSelectOption {
  value: string;
  label: string;
}

export interface DynamicSelectProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  addLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | DynamicSelectOption)[];
  onAddNew?: (newValue: string) => void | Promise<void>;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  required?: boolean;
  isNeon?: boolean;
  allowAdd?: boolean;
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  id,
  name,
  label,
  placeholder = 'تحديد القسم / الفرع المستفيد',
  addLabel = 'قسم جديد',
  value,
  onChange,
  options,
  onAddNew,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  isNeon = true,
  allowAdd = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const [localOptions, setLocalOptions] = useState<(string | DynamicSelectOption)[]>([]);

  // Format options into standardized array
  const allOptions: DynamicSelectOption[] = [
    ...options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt),
    ...localOptions.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
  ];

  // Remove duplicates
  const uniqueOptions = allOptions.filter((opt, index, self) =>
    index === self.findIndex(t => t.value === opt.value)
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (selectedVal === '__ADD_NEW__') {
      setIsModalOpen(true);
      return;
    }
    onChange(selectedVal);
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemValue.trim();
    if (!trimmed) return;

    if (onAddNew) {
      await onAddNew(trimmed);
    }

    setLocalOptions(prev => [...prev, trimmed]);
    onChange(trimmed);
    setNewItemValue('');
    setIsModalOpen(false);
  };

  const selectBgClass = isNeon
    ? 'bg-[#13131A] border-[#23232F] text-white focus:border-purple-500'
    : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500';

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className={`block text-xs font-semibold ${isNeon ? 'text-[#A0A0B0]' : 'text-slate-600'}`}>
            {label}
            {required && <span className="text-rose-500 mr-1">*</span>}
          </label>
          {allowAdd && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] text-pink-400 hover:text-pink-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              + إضافة {addLabel}
            </button>
          )}
        </div>
      )}

      <div className="relative flex items-center gap-1">
        <select
          id={id}
          name={name}
          value={value}
          onChange={handleSelectChange}
          disabled={disabled}
          required={required}
          className={`w-full px-3 py-2 rounded-lg text-xs border transition-all cursor-pointer outline-none ${selectBgClass} ${className}`}
        >
          <option value="" className={isNeon ? 'bg-[#13131A] text-slate-400' : 'bg-white text-slate-400'}>
            {placeholder}
          </option>

          {uniqueOptions.map((opt, idx) => (
            <option
              key={`${opt.value}-${idx}`}
              value={opt.value}
              className={isNeon ? 'bg-[#13131A] text-white' : 'bg-white text-slate-800'}
            >
              {opt.label}
            </option>
          ))}

          {allowAdd && (
            <option
              value="__ADD_NEW__"
              className={isNeon ? 'bg-[#1F132B] text-pink-400 font-bold' : 'bg-pink-50 text-pink-600 font-bold'}
            >
              + إضافة {addLabel}
            </option>
          )}
        </select>
      </div>

      {/* Quick Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border shadow-2xl space-y-4 dir-rtl ${
            isNeon ? 'bg-[#161622] border-[#2A2A3D] text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-700/50">
              <h3 className="text-sm font-bold flex items-center gap-2 text-pink-400">
                <Plus className="w-4 h-4" />
                إضافة {addLabel}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-300">
                  اسم {addLabel}:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={`أدخل اسم ${addLabel}...`}
                  value={newItemValue}
                  onChange={e => setNewItemValue(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${
                    isNeon ? 'bg-[#13131A] border-[#2E2E42] text-white focus:border-pink-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newItemValue.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  حفظ وإضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
