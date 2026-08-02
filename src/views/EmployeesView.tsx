import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Plus,
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2,
  DollarSign, 
  Calendar, 
  CreditCard,
  UserCheck,
  Users
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table, Column } from '../components/ui/Table';
import { Employee } from '../types';
import { Modal } from '../components/Modal';

export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Form states
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form field states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowance, setAllowance] = useState<number>(0);
  const [iban, setIban] = useState<string>('');
  const [joinDate, setJoinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [phone, setPhone] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const [formError, setFormError] = useState<string>('');
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Departments State
  const DEFAULT_DEPARTMENTS = [
    'الإدارة العامة',
    'المبيعات والتسويق',
    'الحسابات والمالية',
    'إدارة المخازن والخردة',
    'تشغيل ميزان البسكول',
    'الحركة والسطحات واللوجستيات',
    'الفرز والتصنيف',
    'الصيانة والورش',
    'الموارد البشرية'
  ];

  const [departmentsList, setDepartmentsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('promet_departments_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading departments list:', e);
    }
    return DEFAULT_DEPARTMENTS;
  });

  const [showDepartmentManager, setShowDepartmentManager] = useState<boolean>(false);
  const [newDepartmentInput, setNewDepartmentInput] = useState<string>('');

  const handleAddDepartment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDepartmentInput.trim();
    if (!trimmed) return;
    if (departmentsList.includes(trimmed)) {
      setDepartment(trimmed);
      setNewDepartmentInput('');
      return;
    }
    const updated = [...departmentsList, trimmed];
    setDepartmentsList(updated);
    try {
      localStorage.setItem('promet_departments_list', JSON.stringify(updated));
      await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
    } catch (err) {
      console.error(err);
    }
    setDepartment(trimmed);
    setNewDepartmentInput('');
    showToast(`تمت إضافة قسم "${trimmed}" بنجاح`);
  };

  const handleDeleteDepartment = async (depToDelete: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذا القسم (${depToDelete})؟`)) return;
    const updated = departmentsList.filter(d => d !== depToDelete);
    setDepartmentsList(updated);
    try {
      localStorage.setItem('promet_departments_list', JSON.stringify(updated));
      await fetch(`/api/departments/${encodeURIComponent(depToDelete)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error(err);
    }
    if (department === depToDelete) {
      setDepartment(updated.length > 0 ? updated[0] : '');
    }
    showToast('تم حذف القسم بنجاح');
  };

  // Position / Job Types State
  const DEFAULT_POSITION_TYPES = [
    'مدير عام',
    'مدير مبيعات',
    'محاسب عام',
    'أمين مخزن خردة',
    'مسؤول ميزان بسكول',
    'فني فرز وتصنيف',
    'سائق نقل ثقيل',
    'مشرف تشغيل',
    'مسؤول موارد بشرية',
    'فني صيانة',
    'عامل تشغيل',
    'مشتريات وتوريدات'
  ];

  const [positionTypes, setPositionTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('promet_job_position_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading position types:', e);
    }
    return DEFAULT_POSITION_TYPES;
  });

  const [showPositionManager, setShowPositionManager] = useState<boolean>(false);
  const [newPositionTypeInput, setNewPositionTypeInput] = useState<string>('');

  const handleAddPositionType = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPositionTypeInput.trim();
    if (!trimmed) return;
    if (positionTypes.includes(trimmed)) {
      setPosition(trimmed);
      setNewPositionTypeInput('');
      return;
    }
    const updated = [...positionTypes, trimmed];
    setPositionTypes(updated);
    try {
      localStorage.setItem('promet_job_position_types', JSON.stringify(updated));
      await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
    } catch (err) {
      console.error(err);
    }
    setPosition(trimmed);
    setNewPositionTypeInput('');
    showToast(`تمت إضافة الوظيفة "${trimmed}" بنجاح`);
  };

  const handleDeletePositionType = async (titleToDelete: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف نوع الوظيفة / المسمى الوظيفي (${titleToDelete})؟`)) return;
    const updated = positionTypes.filter(p => p !== titleToDelete);
    setPositionTypes(updated);
    try {
      localStorage.setItem('promet_job_position_types', JSON.stringify(updated));
      await fetch(`/api/positions/${encodeURIComponent(titleToDelete)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error(err);
    }
    if (position === titleToDelete) {
      setPosition(updated.length > 0 ? updated[0] : '');
    }
    showToast('تم حذف الوظيفة بنجاح');
  };

  useEffect(() => {
    fetchEmployees();
    fetchCustomFields();
    fetchDepartmentsAndPositions();
  }, []);

  const fetchDepartmentsAndPositions = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/positions')
      ]);
      if (deptRes.ok) {
        const depts = await deptRes.json();
        if (Array.isArray(depts) && depts.length > 0) {
          const names = depts.map((d: any) => typeof d === 'string' ? d : d.name).filter(Boolean);
          setDepartmentsList(prev => Array.from(new Set([...names, ...prev])));
        }
      }
      if (posRes.ok) {
        const positions = await posRes.json();
        if (Array.isArray(positions) && positions.length > 0) {
          const names = positions.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
          setPositionTypes(prev => Array.from(new Set([...names, ...prev])));
        }
      }
    } catch (e) {
      console.error("Error fetching departments/positions:", e);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await fetch('/api/custom-fields?entity_type=employee');
      if (res.ok) {
        const data = await res.json();
        setCustomFields(data || []);
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers, 'Content-Type': 'application/json' } as HeadersInit;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch employees');
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setPosition('');
    setDepartment('');
    setBasicSalary(0);
    setAllowance(0);
    setIban('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setPhone('');
    setIsActive(true);
    setFormError('');
    setSuccessMsg('');
    setDynamicValues({});
    setShowForm(true);
  };

  const handleOpenEditForm = (emp: any) => {
    setEditingEmployee(emp);
    setName(emp.name || '');
    setEmail(emp.email || '');
    setPosition(emp.position || '');
    setDepartment(emp.department || '');
    setBasicSalary(Number(emp.basicSalary) || 0);
    setAllowance(Number(emp.allowance) || 0);
    setIban(emp.iban || '');
    setJoinDate(emp.joinDate ? emp.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setPhone(emp.phone || '');
    setIsActive(emp.isActive !== false);
    setFormError('');
    setSuccessMsg('');

    const customVals: Record<string, any> = {};
    customFields.forEach(f => {
      customVals[f.field_name] = emp[f.field_name] !== undefined ? emp[f.field_name] : '';
    });
    setDynamicValues(customVals);

    setShowForm(true);
  };

  const handleDeleteEmployee = async (id: string | number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً؟')) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/employees/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        setEmployees(prev => prev.filter(e => String(e.id) !== String(id)));
        showToast('تم حذف الموظف بنجاح');
      } else {
        alert(data.error || 'فشل حذف الموظف من قاعدة البيانات');
      }
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      alert('حدث خطأ أثناء حذف الموظف: ' + (err.message || 'خطأ في الاتصال'));
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!name.trim()) {
      setFormError('الرجاء إدخال اسم الموظف');
      setFormLoading(false);
      return;
    }

    const payload = {
      name,
      email,
      position,
      department,
      basicSalary: Number(basicSalary),
      allowance: Number(allowance),
      iban,
      joinDate,
      phone,
      isActive,
      ...dynamicValues
    };

    try {
      if (editingEmployee) {
        // Update employee
        const res = await fetchWithAuth(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updated = await res.json();
          setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...updated } : e));
          showToast('تم تحديث بيانات الموظف بنجاح');
          setShowForm(false);
        } else {
          const errData = await res.json();
          setFormError(errData.error || 'فشل تحديث بيانات الموظف');
        }
      } else {
        // Create new employee
        const res = await fetchWithAuth('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          setEmployees(prev => [created, ...prev]);
          showToast('تم إضافة الموظف الجديد بنجاح');
          setShowForm(false);
        } else {
          const errData = await res.json();
          setFormError(errData.error || 'فشل إضافة الموظف الجديد');
        }
      }
    } catch (err) {
      setFormError('حدث خطأ في الاتصال بالخادم، الرجاء المحاولة لاحقاً');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const term = searchQuery.toLowerCase();
    return (
      (emp.name || '').toLowerCase().includes(term) ||
      (emp.email || '').toLowerCase().includes(term) ||
      (emp.position || '').toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term)
    );
  });

  // Table Columns config
  const baseColumns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'الموظف',
      render: (emp) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
            {(emp.name || 'م')[0]}
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{emp.name}</h4>
            <p className="text-xs text-slate-400 font-medium">{emp.position || 'بدون مسمى وظيفي'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'القسم',
      render: (emp) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
          <Briefcase size={12} />
          {emp.department || 'عام'}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'بيانات الاتصال',
      render: (emp) => (
        <div className="space-y-1 text-xs">
          {emp.email && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span>{emp.email}</span>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span className="font-mono">{emp.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'الراتب الإجمالي',
      render: (emp) => {
        const total = (Number(emp.basicSalary) || 0) + (Number(emp.allowance) || 0);
        return (
          <div>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {total.toLocaleString()} ج.م
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              أساسي: {Number(emp.basicSalary || 0).toLocaleString()} | بدلات: {Number(emp.allowance || 0).toLocaleString()}
            </p>
          </div>
        );
      },
    },
    {
      key: 'iban',
      header: 'رقم الحساب (IBAN)',
      render: (emp) => (
        <div className="flex items-center gap-1 text-xs text-slate-400 max-w-[150px] truncate" title={emp.iban}>
          <CreditCard size={12} className="text-slate-400 shrink-0" />
          <span className="font-mono text-[11px]">{emp.iban || 'غير متوفر'}</span>
        </div>
      ),
    },
    {
      key: 'joinDate',
      header: 'تاريخ التعيين',
      render: (emp) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Calendar size={12} className="text-slate-400" />
          <span className="font-mono">{emp.joinDate ? emp.joinDate.split('T')[0] : 'غير متوفر'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (emp) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
          emp.isActive !== false 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {emp.isActive !== false ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'العمليات',
      align: 'left',
      render: (emp) => (
        <div className="flex items-center gap-2 justify-start">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditForm(emp);
            }}
            title="تعديل الموظف"
            className="p-2 hover:bg-slate-700/60 rounded-xl text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Edit2 size={15} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEmployee(emp.id);
            }}
            title="حذف الموظف"
            className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const columns: Column<Employee>[] = [...baseColumns];
  customFields.forEach(f => {
    columns.splice(columns.length - 1, 0, {
      key: f.field_name,
      header: f.field_label,
      render: (emp: any) => {
        if (f.field_type === 'checkbox') {
          return <span className="font-bold text-xs text-indigo-300">{emp[f.field_name] ? '✓ نعم' : '✗ لا'}</span>;
        }
        return <span className="font-semibold text-xs text-slate-300">{emp[f.field_name] !== undefined && emp[f.field_name] !== null ? String(emp[f.field_name]) : '-'}</span>;
      }
    });
  });

  return (
    <MainLayout
      title="👥 الموظفين والموارد البشرية"
      description="إدارة شاملة لملفات الموظفين، الرواتب، البدلات، وتفاصيل الحسابات البنكية ومستندات العمل"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowDepartmentManager(true)}
            className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Building2 size={15} />
            <span>➕ إضافة / إدارة الأقسام</span>
          </button>
          <button 
            type="button"
            onClick={() => setShowPositionManager(true)}
            className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Briefcase size={15} />
            <span>➕ إضافة / إدارة الوظائف</span>
          </button>
          <button 
            type="button"
            onClick={handleOpenAddForm}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6" dir="rtl">
        {/* Toast Notification */}
        {successMsg && (
          <div className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-sm font-semibold animate-bounce">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Header Summary Banner */}
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/80 shadow-md flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">سجل الموظفين والكادر البشري</h2>
              <p className="text-xs text-slate-400 mt-0.5">عرض الموظفين المسجلين، رواتبهم الأساسية والبدلات، مع دعم تخصيص البيانات</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-xl text-xs flex items-center gap-4">
              <div>
                <span className="text-slate-400">إجمالي الموظفين: </span>
                <span className="text-white font-bold font-mono text-sm ml-1">{employees.length}</span>
              </div>
              <div className="w-px h-4 bg-slate-700"></div>
              <div>
                <span className="text-slate-400">النشطين: </span>
                <span className="text-emerald-400 font-bold font-mono text-sm ml-1">
                  {employees.filter(e => e.isActive !== false).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for Add / Edit Employee */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingEmployee ? `تعديل ملف الموظف: ${editingEmployee.name}` : 'إضافة موظف جديد للشركة'}
          icon={<UserCheck size={18} className="text-blue-400" />}
          headerColorClass="text-blue-400"
          maxWidthClass="max-w-3xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم الكامل <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="أحمد علي محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الهاتف</label>
                <input
                  type="text"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">القسم</label>
                  <button
                    type="button"
                    onClick={() => setShowDepartmentManager(true)}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>إضافة قسم</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={departmentsList.includes(department) ? department : (department ? '__custom__' : '')}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowDepartmentManager(true);
                      } else if (e.target.value === '__custom__') {
                        // retain current custom department
                      } else {
                        setDepartment(e.target.value);
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex-1 text-white focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="">-- اختر القسم --</option>
                    {departmentsList.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                    {!departmentsList.includes(department) && department && (
                      <option value="__custom__">خاص: {department}</option>
                    )}
                    <option value="__add_new__" className="text-blue-400 font-bold">➕ إضافة قسم جديد...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowDepartmentManager(true)}
                    title="إضافة وتعديل الأقسام"
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Building2 size={16} />
                  </button>
                </div>
                {(!department || !departmentsList.includes(department)) && (
                  <input
                    type="text"
                    placeholder="أو اكتب اسم القسم يدويّاً..."
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-2 bg-slate-900 border border-slate-700 p-2 rounded-lg w-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">المسمى الوظيفي / نوع الوظيفة</label>
                  <button
                    type="button"
                    onClick={() => setShowPositionManager(true)}
                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>إضافة وظيفة</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={positionTypes.includes(position) ? position : (position ? '__custom__' : '')}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowPositionManager(true);
                      } else if (e.target.value === '__custom__') {
                        // retain current custom position
                      } else {
                        setPosition(e.target.value);
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex-1 text-white focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="">-- اختر المسمى الوظيفي --</option>
                    {positionTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                    {!positionTypes.includes(position) && position && (
                      <option value="__custom__">خاص: {position}</option>
                    )}
                    <option value="__add_new__" className="text-purple-400 font-bold">➕ إضافة مسمى وظيفي جديد...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowPositionManager(true)}
                    title="إضافة وتعديل الوظائف"
                    className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 px-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Briefcase size={16} />
                  </button>
                </div>
                {(!position || !positionTypes.includes(position)) && (
                  <input
                    type="text"
                    placeholder="أو اكتب المسمى الوظيفي يدويّاً..."
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="mt-2 bg-slate-900 border border-slate-700 p-2 rounded-lg w-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">تاريخ التعيين</label>
                <input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الراتب الأساسي (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={basicSalary || ''}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">البدلات والمكافآت (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="1500"
                  value={allowance || ''}
                  onChange={(e) => setAllowance(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الآيبان البنكي (IBAN)</label>
                <input
                  type="text"
                  placeholder="EG0000000000000000000000"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-left"
                />
              </div>
            </div>

            {customFields.length > 0 && (
              <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-700/80 space-y-4">
                <span className="font-bold text-xs text-indigo-300 block border-b border-slate-700 pb-2">
                  📋 حقول مخصصة ديناميكية للنشاط الحالي
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {customFields.map(f => (
                    <div key={f.id} className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">
                        {f.field_label} {f.is_required && <span className="text-rose-400">*</span>}
                      </label>
                      {f.field_type === 'checkbox' ? (
                        <div className="flex items-center h-9">
                          <input
                            type="checkbox"
                            checked={!!dynamicValues[f.field_name]}
                            onChange={(e) => setDynamicValues(prev => ({ ...prev, [f.field_name]: e.target.checked }))}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      ) : f.field_type === 'date' ? (
                        <input
                          type="date"
                          required={!!f.is_required}
                          value={dynamicValues[f.field_name] || ''}
                          onChange={(e) => setDynamicValues(prev => ({ ...prev, [f.field_name]: e.target.value }))}
                          className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                        />
                      ) : f.field_type === 'number' ? (
                        <input
                          type="number"
                          required={!!f.is_required}
                          placeholder={f.field_label}
                          value={dynamicValues[f.field_name] !== undefined ? dynamicValues[f.field_name] : ''}
                          onChange={(e) => setDynamicValues(prev => ({ ...prev, [f.field_name]: e.target.value === '' ? '' : Number(e.target.value) }))}
                          className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          required={!!f.is_required}
                          placeholder={f.field_label}
                          value={dynamicValues[f.field_name] || ''}
                          onChange={(e) => setDynamicValues(prev => ({ ...prev, [f.field_name]: e.target.value }))}
                          className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full text-white focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-700/80 pt-4">
              <input
                type="checkbox"
                id="is-active-checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="is-active-checkbox" className="text-xs font-medium text-slate-200 cursor-pointer select-none">
                الموظف على رأس العمل ونشط في النظام
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-700/80 pt-4 mt-6">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                disabled={formLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 px-5 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
              >
                {formLoading ? 'جاري الحفظ...' : (editingEmployee ? 'تحديث البيانات' : 'حفظ وإضافة الموظف')}
              </button>
            </div>
          </form>
        </Modal>

        {/* Search Bar */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث عن موظف بالاسم، القسم أو الوظيفة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-xs rounded-xl bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md p-4 overflow-hidden">
          <Table<Employee>
            columns={columns}
            data={filteredEmployees}
            rowKey={(emp) => emp.id}
            loading={loading}
            emptyMessage="لا يوجد موظفون مضافون حالياً يطابقون خيارات البحث"
          />
        </div>

        {/* Departments Manager Modal */}
        {showDepartmentManager && (
          <Modal
            isOpen={showDepartmentManager}
            onClose={() => setShowDepartmentManager(false)}
            title="🏢 إدارة الأقسام الإدارية والتنظيمية"
          >
            <div className="space-y-4 text-right dir-rtl">
              <p className="text-xs text-slate-400 leading-relaxed">
                تتيح لك هذه الشاشة إضافة أقسام إدارية وتشغيلية جديدة لتنسدل تلقائياً عند إضافة الموظفين، أو حذف الأقسام غير المستخدمة.
              </p>

              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="اكتب اسم القسم الجديد (مثال: قسم الجودة والسلامة، قسم الشحن)..."
                  value={newDepartmentInput}
                  onChange={(e) => setNewDepartmentInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-500 text-xs px-4">
                  + إضافة قسم
                </Button>
              </form>

              <div className="border-t border-slate-700/60 pt-3">
                <label className="block text-xs font-bold text-slate-300 mb-2">الأقسام المسجلة حالياً ({departmentsList.length}):</label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {departmentsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">لا توجد أقسام مسجلة.</p>
                  ) : (
                    departmentsList.map((dep) => (
                      <div
                        key={dep}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-700/60 p-2.5 rounded-xl text-xs hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                            <Building2 size={14} />
                          </span>
                          <span className="font-semibold text-white">{dep}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dep)}
                          className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                          title="حذف هذا القسم"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-700/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDepartmentManager(false)}
                  className="text-xs"
                >
                  حفظ وإغلاق
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Position Types Manager Modal */}
        {showPositionManager && (
          <Modal
            isOpen={showPositionManager}
            onClose={() => setShowPositionManager(false)}
            title="💼 إدارة أنواع الوظائف والمسميات الوظيفية"
          >
            <div className="space-y-4 text-right dir-rtl">
              <p className="text-xs text-slate-400 leading-relaxed">
                تتيح لك هذه الشاشة إضافة مسميات وظيفية جديدة لتنسدل خياراتها تلقائياً عند إضافة الموظفين، أو حذف المسميات غير المرغوبة.
              </p>

              <form onSubmit={handleAddPositionType} className="flex gap-2">
                <input
                  type="text"
                  placeholder="اكتب اسم الوظيفة الجديدة (مثال: سائق رافعة شوكية، مشرف فرز)..."
                  value={newPositionTypeInput}
                  onChange={(e) => setNewPositionTypeInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-500 text-xs px-4">
                  + إضافة
                </Button>
              </form>

              <div className="border-t border-slate-700/60 pt-3">
                <label className="block text-xs font-bold text-slate-300 mb-2">أنواع الوظائف المتاحة حالياً ({positionTypes.length}):</label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {positionTypes.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">لا يوجد مسميات وظيفية مسجلة.</p>
                  ) : (
                    positionTypes.map((pt) => (
                      <div
                        key={pt}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-700/60 p-2.5 rounded-xl text-xs hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                            <Briefcase size={14} />
                          </span>
                          <span className="font-semibold text-white">{pt}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePositionType(pt)}
                          className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                          title="حذف هذا المسمى الوظيفي"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-700/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPositionManager(false)}
                  className="text-xs"
                >
                  حفظ وإغلاق
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
};

export default EmployeesView;

