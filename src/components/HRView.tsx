import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { motion } from 'motion/react';
import { 
  Users, 
  Briefcase, 
  Building2,
  DollarSign, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Coins,
  FileSpreadsheet,
  Tag
} from 'lucide-react';
import { Employee, Payroll, LeaveRequest, Department } from '../types';

interface HRViewProps {
  onRefreshAll: () => void;
  currency: string;
}

export default function HRView({ onRefreshAll, currency }: HRViewProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subTab, setSubTab] = useState<'dashboard' | 'employees' | 'payroll' | 'leaves' | 'attendance' | 'performance_reviews' | 'trainings' | 'recruitment' | 'employee_portal' | 'installments'>('dashboard');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New HR features state
  const [reviews, setReviews] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [activeEnrollments, setActiveEnrollments] = useState<any[]>([]);

  // 💰 Installments State
  const [installments, setInstallments] = useState<any[]>([]);
  const [instTypes, setInstTypes] = useState<any[]>([]);
  const [instStats, setInstStats] = useState<any>({
    total_installments: 0,
    active_installments: 0,
    completed_installments: 0,
    total_amount: 0,
    total_paid: 0,
    total_pending: 0,
    total_overdue: 0,
    collection_rate: 0
  });
  const [showInstForm, setShowInstForm] = useState(false);
  const [instForm, setInstForm] = useState({
    employee_id: '',
    installment_type_id: '',
    total_amount: '',
    total_months: '',
    start_date: new Date().toISOString().split('T')[0],
    interest_rate: '0',
    notes: '',
    contract_number: ''
  });
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    installment_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'salary_deduction',
    notes: ''
  });
  const [selectedInstallmentPayments, setSelectedInstallmentPayments] = useState<any[]>([]);
  const [showPaymentsDrawer, setShowPaymentsDrawer] = useState(false);
  const [selectedInstName, setSelectedInstName] = useState('');
  const [instFilterEmployee, setInstFilterEmployee] = useState('');
  const [instFilterStatus, setInstFilterStatus] = useState('');
  const [instFilterType, setInstFilterType] = useState('');
  const [showInstTypeForm, setShowInstTypeForm] = useState(false);
  const [showDepartmentManager, setShowDepartmentManager] = useState(false);
  const [newDepartmentInput, setNewDepartmentInput] = useState('');

  const handleAddDepartmentApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDepartmentInput.trim();
    if (!trimmed) return;
    try {
      const res = await fetchWithAuth('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok) {
        const newDept = await res.json();
        setDepartments(prev => {
          if (prev.some(d => d.name === newDept.name)) return prev;
          return [...prev, newDept];
        });
        setEmpForm(prev => ({ ...prev, department: newDept.name }));
        setSuccessMsg(`تمت إضافة قسم "${trimmed}" بنجاح`);
        setNewDepartmentInput('');
      }
    } catch (err) {
      console.error("Error adding department:", err);
    }
  };

  const handleDeleteDepartmentApi = async (deptId: string, deptName: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${deptName}"؟`)) return;
    try {
      await fetchWithAuth(`/api/departments/${deptId || encodeURIComponent(deptName)}`, { method: 'DELETE' });
      setDepartments(prev => prev.filter(d => d.id !== deptId && d.name !== deptName));
      setSuccessMsg("تم حذف القسم بنجاح");
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };
  const [instTypeForm, setInstTypeForm] = useState({
    name: '',
    icon: '💰',
    description: ''
  });

  const handleCreateInstType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instTypeForm.name) {
      setError('يرجى إدخال اسم نوع التقسيط');
      return;
    }
    try {
      setError(null);
      const res = await fetch('/api/installment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instTypeForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowInstTypeForm(false);
        setInstTypeForm({ name: '', icon: '💰', description: '' });
        // Refresh installment types
        const typesRes = await fetch('/api/installment-types');
        const typesData = await typesRes.json();
        setInstTypes(typesData);
        if (data.installment_type) {
          setInstForm(prev => ({ ...prev, installment_type_id: String(data.installment_type.id) }));
        }
      } else {
        setError(data.error || 'فشل في إضافة نوع التقسيط');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  // Forms and dialog triggers
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ employeeId: '', score: 5, comments: '' });

  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ title: '', description: '', trainer: '', duration: '', startDate: '' });

  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', department: 'المالية', description: '', requirements: '', salaryRange: '' });

  const [showAppForm, setShowAppForm] = useState(false);
  const [appFormState, setAppFormState] = useState({ jobOpeningId: '', fullName: '', email: '', phone: '' });

  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ jobApplicationId: '', interviewDate: '', interviewTime: '', type: 'online', interviewer: '' });

  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form states
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    department: 'المبيعات',
    position: '',
    basicSalary: 0,
    allowance: 0,
    iban: '',
    joinDate: new Date().toISOString().split('T')[0],
    nationalId: '',
    birthDate: '',
    socialInsuranceNumber: '',
    address: '',
    phone: '',
    status: 'active' as 'active' | 'terminated' | 'on_leave',
    worker_type: 'employee' as 'employee' | 'daily_worker' | 'probation',
    is_daily_worker: false,
    daily_wage: 0,
    is_available: true,
    subject_to_social_insurance: false
  });

  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    month: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    basicSalary: 0,
    allowance: 0,
    deductions: 0,
    status: 'draft' as 'draft' | 'approved' | 'paid'
  });

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    type: 'سنوية',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers, 'Content-Type': 'application/json' } as HeadersInit;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  // Fetch all HR Data
  const fetchHRData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resEmp, resPay, resLev, resDept, resRev, resTrn, resEnr, resJobs, resApps, resInts] = await Promise.all([
        fetchWithAuth('/api/employees').then(r => r.json()).catch(() => []),
        fetchWithAuth(`/api/payroll?month=${payrollMonth}`).then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/leaves').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/departments').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/performance-reviews').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/trainings').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/training-enrollments').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/job-openings').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/job-applications').then(r => r.json()).catch(() => []),
        fetchWithAuth('/api/interviews').then(r => r.json()).catch(() => [])
      ]);

      const emps = Array.isArray(resEmp) ? resEmp : [];
      setEmployees(emps);
      setPayroll(Array.isArray(resPay) ? resPay : []);
      setLeaves(Array.isArray(resLev) ? resLev : []);
      setDepartments(Array.isArray(resDept) ? resDept : []);
      setReviews(Array.isArray(resRev) ? resRev : []);
      setTrainings(Array.isArray(resTrn) ? resTrn : []);
      setActiveEnrollments(Array.isArray(resEnr) ? resEnr : []);
      setJobOpenings(Array.isArray(resJobs) ? resJobs : []);
      setJobApplications(Array.isArray(resApps) ? resApps : []);
      setInterviews(Array.isArray(resInts) ? resInts : []);
      
      // Also fetch attendance for current date
      fetchAttendance(attendanceDate, emps);
    } catch (err: any) {
      console.error("Failed to load HR data:", err);
      setError("خطأ في الاتصال بالخادم لجلب بيانات الموارد البشرية");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (date: string, currentEmployees = employees) => {
    try {
      setAttendanceLoading(true);
      const res = await fetchWithAuth(`/api/attendance?date=${date}`);
      if (!res.ok) throw new Error("فشل تحميل بيانات الحضور");
      const records = await res.json();
      
      const activeEmps = currentEmployees.filter(emp => emp.status === 'active' || emp.status === 'on_leave');

      const merged = activeEmps.map(emp => {
        const record = records.find((r: any) => String(r.employee_id) === String(emp.id) || String(r.employeeId) === String(emp.id));
        return {
          employee_id: emp.id,
          employee_name: emp.name,
          department_name: emp.department || 'غير محدد',
          check_in: record?.check_in || '',
          check_out: record?.check_out || '',
          overtime_hours: record?.overtime_hours || 0,
          status: record?.status || 'absent',
          notes: record?.notes || '',
          id: record?.id || null
        };
      });

      setAttendance(merged);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendance(attendanceDate, employees);
    }
  }, [attendanceDate]);

  const handleSaveAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: attendanceDate,
          records: attendance
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ الحضور");

      setSuccessMsg("✅ تم حفظ سجلات حضور وانصراف الموظفين بنجاح لهذا اليوم");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchAttendance(attendanceDate);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const markAllPresent = () => {
    setAttendance(prev => prev.map(item => ({
      ...item,
      status: 'present',
      check_in: item.check_in || '09:00',
      check_out: item.check_out || '17:00'
    })));
  };

  const updateAttendanceField = (empId: string, field: string, value: any) => {
    setAttendance(prev => prev.map(item => {
      if (item.employee_id === empId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const fetchPayrollByMonth = async (month: string) => {
    try {
      setPayrollLoading(true);
      const res = await fetchWithAuth(`/api/payroll?month=${month}`);
      if (!res.ok) throw new Error("فشل تحميل مسيرات الرواتب");
      const data = await res.json();
      setPayroll(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "خطأ في الاتصال بالخادم");
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    try {
      setPayrollLoading(true);
      setError(null);
      const res = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: payrollMonth })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حساب الرواتب");
      setSuccessMsg("✅ تم حساب الرواتب بنجاح لشهر " + payrollMonth);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchPayrollByMonth(payrollMonth);
    } catch (err: any) {
      setError(err.message || "فشل حساب الرواتب");
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleApprovePayroll = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/payroll/${id}/approve`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل اعتماد الراتب");
      setSuccessMsg("✅ تم اعتماد الراتب بنجاح");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchPayrollByMonth(payrollMonth);
    } catch (err: any) {
      setError(err.message || "فشل اعتماد الراتب");
    }
  };

  const handleApproveAllPayroll = async () => {
    try {
      setPayrollLoading(true);
      setError(null);
      const res = await fetch('/api/payroll/approve-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: payrollMonth })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل اعتماد جميع الرواتب");
      setSuccessMsg(data.message || "✅ تم اعتماد جميع الرواتب بنجاح");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchPayrollByMonth(payrollMonth);
    } catch (err: any) {
      setError(err.message || "فشل اعتماد جميع الرواتب");
    } finally {
      setPayrollLoading(false);
    }
  };

  const handlePostPayroll = async () => {
    if (!payrollMonth) {
      setError("الرجاء اختيار الشهر أولاً");
      return;
    }

    const approvedPayrolls = payroll.filter((p: any) => p.status === 'approved');
    if (approvedPayrolls.length === 0) {
      setError("❌ لا توجد رواتب معتمدة لهذا الشهر. قم باعتماد الرواتب أولاً.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من ترحيل رواتب شهر ${payrollMonth} للقيود المحاسبية؟`)) {
      return;
    }

    try {
      setPayrollLoading(true);
      setError(null);
      const res = await fetch('/api/payroll/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: payrollMonth })
      });

      const result = await res.json();
      if (res.ok) {
        setSuccessMsg(result.message || "✅ تم ترحيل الرواتب للقيود المحاسبية بنجاح");
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchPayrollByMonth(payrollMonth);
        fetchHRData();
      } else {
        throw new Error(result.error || "فشل ترحيل الرواتب");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الترحيل للمحاسبة");
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    if (payrollMonth) {
      fetchPayrollByMonth(payrollMonth);
    }
  }, [payrollMonth]);

  useEffect(() => {
    fetchHRData();
  }, []);

  const fetchInstallmentsData = async () => {
    try {
      const [resInsts, resTypes, resStats] = await Promise.all([
        fetch('/api/installments').then(r => r.json()).catch(() => []),
        fetch('/api/installment-types').then(r => r.json()).catch(() => []),
        fetch('/api/installments/statistics').then(r => r.json()).catch(() => ({
          total_installments: 0,
          active_installments: 0,
          completed_installments: 0,
          total_amount: 0,
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          collection_rate: 0
        }))
      ]);
      setInstallments(Array.isArray(resInsts) ? resInsts : []);
      setInstTypes(Array.isArray(resTypes) ? resTypes : []);
      
      // Map properties safely from the statistics endpoint
      setInstStats({
        total_installments: resStats?.total_installments || resStats?.count || 0,
        active_installments: resStats?.active_installments || 0,
        completed_installments: resStats?.completed_installments || 0,
        total_amount: resStats?.total_amount || resStats?.totalAmount || 0,
        total_paid: resStats?.total_paid || resStats?.paidAmount || 0,
        total_pending: resStats?.total_pending || resStats?.remainingAmount || 0,
        total_overdue: resStats?.total_overdue || 0,
        collection_rate: resStats?.collection_rate || 0
      });
    } catch (err) {
      console.error("Failed to fetch installments data:", err);
      setInstallments([]);
      setInstTypes([]);
    }
  };

  useEffect(() => {
    if (subTab === 'installments') {
      fetchInstallmentsData();
    }
  }, [subTab]);

  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.employee_id || !instForm.installment_type_id || !instForm.total_amount || !instForm.total_months || !instForm.start_date) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: instForm.employee_id,
          installment_type_id: Number(instForm.installment_type_id),
          total_amount: Number(instForm.total_amount),
          total_months: Number(instForm.total_months),
          start_date: instForm.start_date,
          interest_rate: Number(instForm.interest_rate || 0),
          notes: instForm.notes,
          contract_number: instForm.contract_number
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل القسط");
      setSuccessMsg("✅ تم تسجيل القسط بنجاح");
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowInstForm(false);
      setInstForm({
        employee_id: '',
        installment_type_id: '',
        total_amount: '',
        total_months: '',
        start_date: new Date().toISOString().split('T')[0],
        interest_rate: '0',
        notes: '',
        contract_number: ''
      });
      fetchInstallmentsData();
    } catch (err: any) {
      setError(err.message || "فشل عملية الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const handlePayInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.installment_id) {
      setError("يرجى تحديد القسط");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/installments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installment_id: payForm.installment_id,
          payment_date: payForm.payment_date,
          amount: payForm.amount ? Number(payForm.amount) : null,
          payment_method: payForm.payment_method,
          notes: payForm.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدفعة");
      setSuccessMsg("✅ تم تسجيل السداد بنجاح");
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowPayForm(false);
      setPayForm({
        installment_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'salary_deduction',
        notes: ''
      });
      fetchInstallmentsData();
    } catch (err: any) {
      setError(err.message || "فشل عملية السداد");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentsSchedule = async (inst: any) => {
    try {
      setLoading(true);
      setSelectedInstName(inst.employee_name + " - " + inst.installment_type_name);
      const res = await fetch(`/api/installments/${inst.id}/payments`);
      const data = await res.json();
      setSelectedInstallmentPayments(data);
      setShowPaymentsDrawer(true);
    } catch (err) {
      console.error("Failed to load payments schedule:", err);
    } finally {
      setLoading(false);
    }
  };



  const handleOpenEmpAdd = () => {
    setEditingEmpId(null);
    setEmpForm({
      name: '',
      email: '',
      department: departments[0]?.name || 'المبيعات',
      position: '',
      basicSalary: 8000,
      allowance: 1000,
      iban: '',
      joinDate: new Date().toISOString().split('T')[0],
      nationalId: '',
      birthDate: '',
      socialInsuranceNumber: '',
      address: '',
      phone: '',
      status: 'active',
      worker_type: 'employee',
      is_daily_worker: false,
      daily_wage: 0,
      is_available: true,
      subject_to_social_insurance: false
    });
    setShowEmpForm(true);
  };

  const handleOpenEmpEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    const wt = emp.worker_type || (emp.employment_type === "daily" ? "daily_worker" : emp.employment_type === "probation" ? "probation" : "employee");
    const isDaily = emp.is_daily_worker !== undefined ? emp.is_daily_worker : (wt === "daily_worker");
    const wage = Number(emp.daily_wage !== undefined ? emp.daily_wage : (emp.daily_rate !== undefined ? emp.daily_rate : 0));
    const available = emp.is_available !== undefined ? emp.is_available : true;

    setEmpForm({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      basicSalary: emp.basicSalary,
      allowance: emp.allowance,
      iban: emp.iban,
      joinDate: emp.joinDate,
      nationalId: emp.nationalId || '',
      birthDate: emp.birthDate || '',
      socialInsuranceNumber: emp.socialInsuranceNumber || '',
      address: emp.address || '',
      phone: emp.phone || '',
      status: emp.status || (emp.isActive ? 'active' : 'terminated'),
      worker_type: wt,
      is_daily_worker: isDaily,
      daily_wage: wage,
      is_available: available,
      subject_to_social_insurance: emp.subject_to_social_insurance || false
    });
    setShowEmpForm(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!empForm.name || !empForm.position) {
      setError("يرجى إدخال اسم الموظف والمسمى الوظيفي");
      return;
    }
    
    if (empForm.nationalId && empForm.nationalId.length !== 14) {
      setError("الرقم القومي يجب أن يتكون من 14 رقمًا بالتمام.");
      return;
    }
    
    try {
      setLoading(true);
      const url = editingEmpId ? `/api/employees/${editingEmpId}` : '/api/employees';
      const method = editingEmpId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...empForm,
          isActive: empForm.status === 'active'
        })
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "فشل حفظ بيانات الموظف");
      }

      setSuccessMsg(editingEmpId ? "تم تحديث بيانات الموظف بنجاح" : "تم إضافة الموظف الجديد بنجاح");
      setShowEmpForm(false);
      fetchHRData();
      onRefreshAll();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الموظف؟")) return;
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.success) throw new Error(data.error || "فشل حذف الموظف");
      
      setEmployees(prev => prev.filter(e => String(e.id) !== String(id)));
      setSuccessMsg("تم حذف الموظف بنجاح");
      fetchHRData();
      onRefreshAll();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حذف الموظف");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setPayrollForm(prev => ({
        ...prev,
        employeeId: empId,
        basicSalary: emp.basicSalary,
        allowance: emp.allowance,
        deductions: 0
      }));
    }
  };

  const handleSavePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollForm.employeeId) {
      setError("يرجى اختيار الموظف أولاً");
      return;
    }
    const emp = employees.find(x => x.id === payrollForm.employeeId);
    try {
      setLoading(true);
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payrollForm,
          employeeName: emp?.name || ''
        })
      });

      if (!res.ok) throw new Error("فشل حفظ مسير الراتب");

      setSuccessMsg("تم إنشاء كشف الراتب وإدراجه بالمسيرات");
      setShowPayrollForm(false);
      fetchHRData();
      onRefreshAll();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPayrollPaid = async (payr: Payroll) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll/${payr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      if (!res.ok) throw new Error("فشل تحديث حالة الصرف");
      setSuccessMsg(`تم صرف راتب الموظف ${payr.employeeName} وتوليد حركة الصرف بالبنك`);
      fetchHRData();
      onRefreshAll();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.employeeId || !leaveForm.reason) {
      setError("يرجى تحديد الموظف وكتابة سبب الإجازة");
      return;
    }
    const emp = employees.find(x => x.id === leaveForm.employeeId);
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      setLoading(true);
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leaveForm,
          employeeName: emp?.name || '',
          days: diffDays
        })
      });

      if (!res.ok) throw new Error("فشل إرسال طلب الإجازة");
      setSuccessMsg("تم إرسال طلب الإجازة بنجاح");
      setShowLeaveForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.employeeId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/performance-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reviewForm,
          reviewDate: new Date().toISOString().split('T')[0]
        })
      });
      if (!res.ok) throw new Error("فشل حفظ التقييم");
      setSuccessMsg("تم حفظ التقييم بنجاح");
      setShowReviewForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingForm)
      });
      if (!res.ok) throw new Error("فشل إضافة الدورة التدريبية");
      setSuccessMsg("تم إضافة الدورة بنجاح");
      setShowTrainingForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJobOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/job-openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...jobForm, status: 'active', postedDate: new Date().toISOString().split('T')[0] })
      });
      if (!res.ok) throw new Error("فشل نشر الوظيفة الشاغرة");
      setSuccessMsg("تم نشر الفرصة بنجاح");
      setShowJobForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJobApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appFormState, status: 'applied', appliedDate: new Date().toISOString().split('T')[0] })
      });
      if (!res.ok) throw new Error("فشل تقديم الطلب");
      setSuccessMsg("تم تقديم الطلب بنجاح");
      setShowAppForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...interviewForm, status: 'scheduled' })
      });
      if (!res.ok) throw new Error("فشل جدولة المقابلة");
      setSuccessMsg("تمت جدولة المقابلة وإرسال التنبيه");
      setShowInterviewForm(false);
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("فشل تحديث حالة الإجازة");
      setSuccessMsg(status === 'approved' ? "تم الموافقة على الإجازة" : "تم رفض الإجازة");
      fetchHRData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.nationalId || '').includes(searchQuery) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchDept = !deptFilter || emp.department === deptFilter || emp.departmentId === deptFilter;
    
    // Status can be active (which is maps to isActive or status==='active')
    let empStatus = emp.status || (emp.isActive ? 'active' : 'terminated');
    const matchStatus = !statusFilter || empStatus === statusFilter;
    
    return matchSearch && matchDept && matchStatus;
  });

  // Financial Metrics for HR
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.isActive).length;
  const totalPayrollCost = payroll.reduce((sum, p) => sum + (p.status === 'paid' ? p.netSalary : 0), 0);
  const pendingPayrollCost = payroll.reduce((sum, p) => sum + (p.status !== 'paid' ? p.netSalary : 0), 0);

  return (
    <div className="space-y-6" id="hr-management-view">
      {/* Top Header Card with HR Stats */}
      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              إدارة الموارد البشرية وشؤون الموظفين HR
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              تنظيم عقود الموظفين، إدارة مسيرات الرواتب المتكاملة مع الحسابات، ومتابعة الإجازات والحضور.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSubTab('dashboard')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'dashboard' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-dashboard-btn"
            >
              📊 لوحة التحكم
            </button>
            <button
              onClick={() => setSubTab('employees')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'employees' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-employees-btn"
            >
              دليل الموظفين
            </button>
            <button
              onClick={() => setSubTab('payroll')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'payroll' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-payroll-btn"
            >
              مسيرات الرواتب
            </button>
            <button
              onClick={() => setSubTab('leaves')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'leaves' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-leaves-btn"
            >
              طلبات الإجازات
            </button>
            <button
              onClick={() => setSubTab('attendance')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'attendance' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-attendance-btn"
            >
              ⏱️ الحضور والانصراف
            </button>
            <button
              onClick={() => setSubTab('performance_reviews')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'performance_reviews' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-reviews-btn"
            >
              ⭐️ تقييم الأداء
            </button>
            <button
              onClick={() => setSubTab('trainings')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'trainings' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-trainings-btn"
            >
              🎓 التدريب والتطوير
            </button>
            <button
              onClick={() => setSubTab('recruitment')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'recruitment' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-recruitment-btn"
            >
              💼 التوظيف والفرص
            </button>
            <button
              onClick={() => setSubTab('employee_portal')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'employee_portal' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-portal-btn"
            >
              🚀 بوابة الموظفين
            </button>
            <button
              onClick={() => setSubTab('installments')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${subTab === 'installments' ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 border-slate-700/80'}`}
              id="subtab-installments-btn"
            >
              💰 نظام الأقساط
            </button>
          </div>
        </div>

        {/* HR KPI Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 flex items-center gap-4">
            <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">إجمالي الموظفين</div>
              <div className="text-lg font-bold text-slate-100">{totalEmployees} موظف</div>
              <div className="text-[10px] text-emerald-400">النشطين: {activeEmployees}</div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 flex items-center gap-4">
            <div className="p-3 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">الرواتب المنصرفة</div>
              <div className="text-lg font-bold text-slate-100">{totalPayrollCost.toLocaleString()} {currency}</div>
              <div className="text-[10px] text-indigo-400">متكاملة مع الحسابات</div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 flex items-center gap-4">
            <div className="p-3 bg-amber-900/40 text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">رواتب معلقة بالمسير</div>
              <div className="text-lg font-bold text-slate-100">{pendingPayrollCost.toLocaleString()} {currency}</div>
              <div className="text-[10px] text-amber-400">بانتظار تأكيد الصرف</div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 flex items-center gap-4">
            <div className="p-3 bg-sky-900/40 text-sky-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">طلبات الإجازات النشطة</div>
              <div className="text-lg font-bold text-slate-100">{leaves.filter(l => l.status === 'pending').length} طلب</div>
              <div className="text-[10px] text-sky-400">بانتظار المراجعة والرد</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg p-3 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* SUBTAB 0: HR Dashboard */}
      {subTab === 'dashboard' && (
        <div className="space-y-6" dir="rtl">
          {/* Dashboard Header */}
          <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-xs text-slate-100">
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>📊</span> لوحة التحكم - الهضبة
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">مؤشرات الأداء العامة، إحصائيات الدوام، طلبات الإجازات وحركة مسيرات الرواتب لشهر {payrollMonth}</p>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-lg">
              {new Date().toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </span>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="statsGrid">
            {/* Card 1: Total Employees */}
            <button
              onClick={() => setSubTab('employees')}
              className="bg-slate-800 p-5 rounded-2xl shadow-xs border-r-4 border-blue-500 border border-slate-700/80 flex flex-col justify-between hover:bg-slate-750 transition-all text-right group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-2xl font-black text-slate-100 font-mono block group-hover:text-blue-400 transition-colors">
                    {employees.length}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block mt-1">إجمالي الموظفين</span>
                </div>
                <span className="text-2xl shrink-0">👥</span>
              </div>
            </button>

            {/* Card 2: Today's Present */}
            <button
              onClick={() => setSubTab('attendance')}
              className="bg-slate-800 p-5 rounded-2xl shadow-xs border-r-4 border-emerald-500 border border-slate-700/80 flex flex-col justify-between hover:bg-slate-750 transition-all text-right group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-2xl font-black text-emerald-400 font-mono block group-hover:scale-105 origin-right transition-transform">
                    {attendance.filter(a => a.status === 'present' || a.status === 'late').length}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block mt-1">الحضور اليوم</span>
                </div>
                <span className="text-2xl shrink-0">✅</span>
              </div>
            </button>

            {/* Card 3: Pending Leaves */}
            <button
              onClick={() => setSubTab('leaves')}
              className="bg-slate-800 p-5 rounded-2xl shadow-xs border-r-4 border-amber-500 border border-slate-700/80 flex flex-col justify-between hover:bg-slate-750 transition-all text-right group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-2xl font-black text-amber-400 font-mono block group-hover:scale-105 origin-right transition-transform">
                    {leaves.filter(l => l.status === 'pending').length}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block mt-1">إجازات منتظرة</span>
                </div>
                <span className="text-2xl shrink-0">⏳</span>
              </div>
            </button>

            {/* Card 4: Today's Absent */}
            <button
              onClick={() => setSubTab('attendance')}
              className="bg-slate-800 p-5 rounded-2xl shadow-xs border-r-4 border-red-500 border border-slate-700/80 flex flex-col justify-between hover:bg-slate-750 transition-all text-right group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-2xl font-black text-red-400 font-mono block group-hover:scale-105 origin-right transition-transform">
                    {attendance.filter(a => a.status === 'absent').length}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block mt-1">الغياب اليوم</span>
                </div>
                <span className="text-2xl shrink-0">❌</span>
              </div>
            </button>

            {/* Card 5: Total Payroll */}
            <button
              onClick={() => setSubTab('payroll')}
              className="bg-slate-800 p-5 rounded-2xl shadow-xs border-r-4 border-purple-500 border border-slate-700/80 flex flex-col justify-between hover:bg-slate-750 transition-all text-right group col-span-1 sm:col-span-2 lg:col-span-1"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-lg font-black text-purple-400 font-mono block truncate group-hover:scale-102 origin-right transition-transform">
                    {payroll.reduce((sum, p) => sum + Number(p.net_salary || p.netSalary || 0), 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-bold block mt-1">إجمالي الرواتب ({payrollMonth})</span>
                </div>
                <span className="text-2xl shrink-0">💰</span>
              </div>
            </button>
          </div>

          {/* Charts and Activities Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Distribution (Dynamic Bar Chart) */}
            <div className="lg:col-span-2 bg-slate-800 rounded-2xl shadow-sm border border-slate-700/80 p-5 text-slate-100">
              <h3 className="text-xs font-bold text-slate-100 mb-4 flex items-center gap-1.5">
                <span>📈</span> توزيع الموظفين حسب الأقسام
              </h3>
              <div className="space-y-4" id="departmentBars">
                {(() => {
                  const deptCount: { [key: string]: number } = {};
                  employees.forEach(emp => {
                    const dept = emp.department || 'غير محدد';
                    deptCount[dept] = (deptCount[dept] || 0) + 1;
                  });
                  const maxDeptCount = Math.max(...Object.values(deptCount), 1);
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

                  if (Object.keys(deptCount).length === 0) {
                    return <p className="text-center py-6 text-slate-400 text-xs">لا يوجد موظفين لعرض التوزيع حالياً.</p>;
                  }

                  return Object.entries(deptCount).map(([name, count], index) => {
                    const percent = (count / maxDeptCount) * 100;
                    const color = colors[index % colors.length];
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-24 text-xs font-bold text-slate-300 truncate">{name}</span>
                        <div className="flex-1 h-6 bg-slate-900 rounded-full overflow-hidden relative border border-slate-700/50">
                          <div 
                            className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-3 text-white text-[10px] font-black"
                            style={{ width: `${percent}%`, backgroundColor: color }}
                          >
                            {count}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Recent Activities List */}
            <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700/80 p-5 text-slate-100">
              <h3 className="text-xs font-bold text-slate-100 mb-4 flex items-center gap-1.5">
                <span>🕒</span> آخر النشاطات
              </h3>
              <ul className="divide-y divide-slate-700/50" id="activityList">
                {(() => {
                  const list: Array<{ text: string; time: string; dot: 'green' | 'blue' | 'yellow' | 'red' }> = [];

                  // Recent leaves
                  const recentLeaves = [...leaves].slice(0, 2);
                  recentLeaves.forEach(l => {
                    const empName = l.employeeName || l.employee_name || "موظف";
                    const statusText = l.status === 'pending' ? '⏳ قيد الانتظار' : l.status === 'approved' ? '✅ موافق عليه' : l.status === 'rejected' ? '❌ مرفوض' : '📌 ملغي';
                    const typeText = l.type === 'annual' ? 'إجازة سنوية' : l.type === 'sick' ? 'إجازة مرضية' : l.type === 'casual' ? 'إجازة عارضة' : l.type === 'unpaid' ? 'إجازة بدون أجر' : 'إجازة أخرى';
                    list.push({
                      text: `طلب ${typeText} للموظف ${empName}: ${statusText}`,
                      time: l.startDate || l.start_date || "مؤخراً",
                      dot: l.status === 'pending' ? 'yellow' : l.status === 'approved' ? 'green' : 'red'
                    });
                  });

                  // Approved payrolls
                  const approvedPayrolls = payroll.filter(p => p.status === 'approved' || p.status === 'paid').slice(0, 1);
                  approvedPayrolls.forEach(p => {
                    const empName = p.employeeName || p.employee_name || "موظف";
                    list.push({
                      text: `اعتماد وصرف راتب شهر ${p.month || p.month_year} للموظف ${empName}`,
                      time: "الآن",
                      dot: 'blue'
                    });
                  });

                  // New employees
                  const recentEmployees = [...employees].slice(0, 2);
                  recentEmployees.forEach(e => {
                    const empName = e.name || e.full_name || "موظف";
                    list.push({
                      text: `إضافة موظف جديد: ${empName} - ${e.position || 'موظف'}`,
                      time: e.joinDate || "مؤخراً",
                      dot: 'green'
                    });
                  });

                  // Fallback
                  if (list.length === 0) {
                    list.push({
                      text: "لا توجد نشاطات مسجلة حالياً.",
                      time: "الآن",
                      dot: "blue"
                    });
                  }

                  return list.slice(0, 5).map((act, idx) => {
                    const dotColors = {
                      green: 'bg-emerald-400',
                      blue: 'bg-blue-400',
                      yellow: 'bg-amber-400',
                      red: 'bg-red-400'
                    };
                    return (
                      <li key={idx} className="py-2.5 flex items-start gap-2.5 text-xs">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColors[act.dot]}`}></span>
                        <div className="flex-1">
                          <p className="text-slate-200 leading-tight">{act.text}</p>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">{act.time}</span>
                        </div>
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          </div>

          {/* Top 5 Salaries Table */}
          <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700/80 p-5 text-slate-100">
            <h3 className="text-xs font-bold text-slate-100 mb-4 flex items-center gap-1.5">
              <span>💰</span> أعلى 5 رواتب هذا الشهر ({payrollMonth})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700/80 text-slate-300">
                    <th className="py-2.5 px-3 font-semibold text-slate-300">الموظف</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-300">القسم والمسمى الوظيفي</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-300 text-left">صافي الراتب</th>
                  </tr>
                </thead>
                <tbody id="topSalaries">
                  {(() => {
                    const sorted = [...payroll].sort((a, b) => {
                      const netA = Number(a.net_salary !== undefined ? a.net_salary : (a.netSalary || 0));
                      const netB = Number(b.net_salary !== undefined ? b.net_salary : (b.netSalary || 0));
                      return netB - netA;
                    }).slice(0, 5);

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-slate-400">لا توجد رواتب مسجلة لهذا الشهر حتى الآن.</td>
                        </tr>
                      );
                    }

                    return sorted.map((p, index) => {
                      const netVal = Number(p.net_salary !== undefined ? p.net_salary : (p.netSalary || p.net_amount || 0));
                      const emp = employees.find(e => String(e.id) === String(p.employeeId || p.employee_id));
                      return (
                        <tr key={`payroll-item-${p.id || p.employee_id || index}-${index}`} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                          <td className="py-3 px-3 font-bold text-slate-100">
                            {p.employeeName || p.employee_name}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-indigo-900/50 text-indigo-300 font-bold ml-1.5 border border-indigo-700/50">
                              {emp?.department || 'غير محدد'}
                            </span>
                            <span>{emp?.position || '-'}</span>
                          </td>
                          <td className="py-3 px-3 font-black text-left text-indigo-400 font-mono" dir="ltr">
                            {netVal.toLocaleString()} {currency}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: Employees directory */}
      {subTab === 'employees' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 overflow-hidden text-slate-100">
          <div className="p-4 border-b border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم، الرقم القومي أو المسمى..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full sm:w-44 p-2 text-xs rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="">كل الأقسام</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 p-2 text-xs rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="">جميع الحالات</option>
                <option value="active">نشط / على رأس العمل</option>
                <option value="on_leave">في إجازة</option>
                <option value="terminated">موقوف / منهي الخدمة</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowDepartmentManager(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/80 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                id="manage-depts-btn"
              >
                <Building2 className="w-4 h-4" />
                <span>إدارة الأقسام ({departments.length})</span>
              </button>
              <button
                onClick={handleOpenEmpAdd}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all hover:scale-102 cursor-pointer"
                id="add-employee-btn"
              >
                <Plus className="w-4 h-4" />
                إضافة موظف جديد
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 uppercase border-b border-slate-700/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">الموظف وبياناته</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">القسم والمسمى</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">الراتب والبدلات</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">التأمينات والآيبان</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">تاريخ التعيين</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300 text-center">الحالة</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      لا يوجد موظفين مسجلين حالياً يطابقون خيارات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => (
                    <tr key={`emp-row-${emp.id || index}`} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-100">{emp.name}</div>
                          {(() => {
                            const wt = emp.worker_type || (emp.employment_type === "daily" ? "daily_worker" : emp.employment_type === "probation" ? "probation" : "employee");
                            if (wt === 'daily_worker') {
                              return <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-orange-900/50 text-orange-300 border border-orange-700/50 font-bold">عامل يومي ⚙️</span>;
                            } else if (wt === 'probation') {
                              return <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-blue-900/50 text-blue-300 border border-blue-700/50 font-bold">فترة تجربة 📝</span>;
                            } else {
                              return <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 font-bold">موظف رسمي 🧑💼</span>;
                            }
                          })()}
                        </div>
                        {emp.nationalId && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">الرقم القومي: {emp.nationalId}</div>
                        )}
                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 items-center mt-0.5">
                          <span>{emp.email}</span>
                          {emp.phone && (
                            <>
                              <span className="opacity-50">•</span>
                              <span className="font-mono text-indigo-400">{emp.phone}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 mb-1">
                          {emp.department}
                        </span>
                        <div className="text-slate-300 font-semibold">{emp.position}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {(() => {
                          const wt = emp.worker_type || (emp.employment_type === "daily" ? "daily_worker" : emp.employment_type === "probation" ? "probation" : "employee");
                          if (wt === 'daily_worker') {
                            const wage = Number(emp.daily_wage !== undefined ? emp.daily_wage : (emp.daily_rate !== undefined ? emp.daily_rate : 0));
                            return (
                              <>
                                <div className="text-slate-200 font-bold font-mono">{wage.toLocaleString()} {currency} / يوم</div>
                                <div className="text-[10px] text-slate-400">مستحقات يومية منفصلة</div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="text-slate-200 font-mono">{emp.basicSalary.toLocaleString()} {currency}</div>
                                <div className="text-[10px] text-emerald-400 font-semibold">بدل: +{emp.allowance.toLocaleString()} {currency}</div>
                              </>
                            );
                          }
                        })()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-400 text-[10px]">{emp.iban || 'آيبان غير مسجل'}</div>
                        {emp.socialInsuranceNumber && (
                          <div className="text-[9px] text-slate-400 mt-0.5">تأمين: {emp.socialInsuranceNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {emp.joinDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            emp.status === 'on_leave' 
                              ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                              : emp.isActive || emp.status === 'active'
                                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' 
                                : 'bg-red-900/50 text-red-300 border border-red-700/50'
                          }`}>
                            {emp.status === 'on_leave' 
                              ? 'في إجازة'
                              : emp.isActive || emp.status === 'active'
                                ? 'نشط' 
                                : 'موقوف/منهي'}
                          </span>
                          {(() => {
                            const wt = emp.worker_type || (emp.employment_type === "daily" ? "daily_worker" : emp.employment_type === "probation" ? "probation" : "employee");
                            if (wt === 'daily_worker') {
                              const isAvail = emp.is_available !== undefined ? emp.is_available : true;
                              return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                  isAvail ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 bg-slate-900'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                  {isAvail ? 'متاح للطلب' : 'غير متاح'}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEmpEdit(emp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/40 rounded-lg transition-colors"
                            title="تعديل الموظف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/40 rounded-lg transition-colors"
                            title="حذف الموظف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Payroll */}
      {subTab === 'payroll' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 overflow-hidden text-slate-100" dir="rtl">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-700/80 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                حساب الرواتب الشهرية للموظفين
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                توليد ومراجعة مسيرات الرواتب تلقائياً بالاعتماد على سجل الحضور، الغياب، الإضافي، والإجازات المعتمدة.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleCalculatePayroll}
                disabled={payrollLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                🧮 حساب الرواتب
              </button>
              <button
                type="button"
                onClick={handleApproveAllPayroll}
                disabled={payrollLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                ✅ اعتماد الكل
              </button>
              <button
                type="button"
                onClick={handlePostPayroll}
                disabled={payrollLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                id="postBtn"
              >
                📤 ترحيل للمحاسبة
              </button>
            </div>
          </div>

          {/* Month Selector */}
          <div className="p-5 border-b border-slate-700/80 bg-slate-900/40 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-300">📅 الشهر الحالي لرواتب الدوام:</label>
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="p-2 text-xs rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchPayrollByMonth(payrollMonth)}
              disabled={payrollLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/80 flex items-center gap-1.5"
            >
              🔄 عرض البيانات
            </button>
            <button
              type="button"
              onClick={() => window.open(`/api/export/payroll/pdf?month=${payrollMonth}`, '_blank')}
              className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-bold rounded-xl transition-all border border-red-700/50 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-red-400" />
              📄 تصدير PDF
            </button>
            <button
              type="button"
              onClick={() => window.open(`/api/export/payroll/excel?month=${payrollMonth}`, '_blank')}
              className="px-4 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold rounded-xl transition-all border border-emerald-700/50 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              📊 تصدير Excel
            </button>
          </div>

          {/* Summary Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-slate-700/80 bg-slate-900/30">
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-4 text-center">
              <span className="text-xl md:text-2xl font-bold text-slate-100 font-mono block">
                {payroll.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">👥 عدد الموظفين المشمولين</span>
            </div>
            <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-2xl p-4 text-center">
              <span className="text-xl md:text-2xl font-bold text-indigo-300 font-mono block">
                {payroll.reduce((sum, item) => sum + Number(item.net_salary || item.netSalary || 0), 0).toLocaleString()} <span className="text-xs">{currency}</span>
              </span>
              <span className="text-[10px] text-indigo-400 font-medium mt-1 block">💰 إجمالي صافي الرواتب</span>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-2xl p-4 text-center">
              <span className="text-xl md:text-2xl font-bold text-emerald-300 font-mono block">
                {payroll.filter(p => p.status === 'approved' || p.status === 'paid').length}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium mt-1 block">✅ معتمدة للصرف</span>
            </div>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4 text-center">
              <span className="text-xl md:text-2xl font-bold text-amber-300 font-mono block">
                {payroll.filter(p => p.status === 'draft').length}
              </span>
              <span className="text-[10px] text-amber-400 font-medium mt-1 block">⏳ قيد المراجعة والتدقيق</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-3 font-semibold text-slate-300 w-10 text-center">#</th>
                  <th className="py-3 px-3 font-semibold text-slate-300">الموظف</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">الراتب الأساسي</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">حضور (يوم)</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">غياب (يوم)</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">إجازات (يوم)</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">إضافي (ساعة)</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">البدلات</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">المكافآت</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">الاستقطاعات</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center">التأمينات</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-left">صافي الراتب</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center w-24">الحالة</th>
                  <th className="py-3 px-3 font-semibold text-slate-300 text-center w-28">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {payroll.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-10 text-slate-400">
                      {payrollLoading ? "جاري تحميل وتوليد كشوف الرواتب..." : "لا توجد رواتب محسوبة لهذا الشهر بعد. يرجى الضغط على زر 'حساب الرواتب' بالرأس للبدء."}
                    </td>
                  </tr>
                ) : (
                  payroll.map((item, index) => {
                    const basicVal = Number(item.basic_salary !== undefined ? item.basic_salary : (item.basicSalary || item.base_salary || 0));
                    const presentVal = Number(item.present_days !== undefined ? item.present_days : (item.presentDays || 0));
                    const absentVal = Number(item.absent_days !== undefined ? item.absent_days : (item.absentDays || 0));
                    const leaveVal = Number(item.leave_days !== undefined ? item.leave_days : (item.leaveDays || 0));
                    const overtimeH = Number(item.overtime_hours !== undefined ? item.overtime_hours : (item.overtimeHours || 0));
                    const allowancesVal = Number(item.allowances !== undefined ? item.allowances : (item.allowance || 0));
                    const bonusesVal = Number(item.bonuses !== undefined ? item.bonuses : (item.bonus || 0));
                    const deductionsVal = Number(item.deductions !== undefined ? item.deductions : 0);
                    const insuranceVal = Number(item.social_insurance !== undefined ? item.social_insurance : (item.socialInsurance || 0));
                    const netVal = Number(item.net_salary !== undefined ? item.net_salary : (item.netSalary || 0));

                    return (
                      <tr key={`payroll-row-${item.id || index}-${index}`} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-100 block">{item.employee_name || item.employeeName}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                          {basicVal.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold font-mono">
                          {presentVal}
                        </td>
                        <td className="py-3.5 px-3 text-center text-red-400 font-semibold font-mono">
                          {absentVal}
                        </td>
                        <td className="py-3.5 px-3 text-center text-indigo-400 font-semibold font-mono">
                          {leaveVal}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                          {overtimeH}
                        </td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-mono">
                          {allowancesVal > 0 ? `+${allowancesVal.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-mono">
                          {bonusesVal > 0 ? `+${bonusesVal.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3.5 px-3 text-center text-red-400 font-mono">
                          {deductionsVal > 0 ? `-${deductionsVal.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3.5 px-3 text-center text-amber-400 font-mono">
                          {insuranceVal > 0 ? `-${insuranceVal.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3.5 px-3 text-left font-bold text-indigo-400 font-mono" dir="ltr">
                          {netVal.toLocaleString()} {currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'paid' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' :
                            item.status === 'approved' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50' :
                            'bg-slate-900 text-slate-400 border border-slate-700/80'
                          }`}>
                            {item.status === 'paid' ? '💰 مدفوع' : item.status === 'approved' ? '✅ معتمد' : '⏳ مسودة'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {item.status === 'draft' ? (
                            <button
                              type="button"
                              onClick={() => handleApprovePayroll(item.id)}
                              className="px-2.5 py-1 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 text-[10px] font-bold rounded-lg transition-all border border-indigo-700/50"
                            >
                              ✅ اعتماد
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">تم الإجراء</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Leaves */}
      {subTab === 'leaves' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 overflow-hidden text-slate-100">
          <div className="p-4 border-b border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">طلبات الإجازات السنوية والمرضية والخاصة</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">تقديم طلبات إجازة للموظفين والتحكم بقبولها أو رفضها مع احتساب المدة الكلية للطلب.</p>
            </div>
            <button
              onClick={() => {
                if (employees.length === 0) {
                  setError("يرجى إضافة موظفين أولاً لتقديم طلب إجازة");
                  return;
                }
                setLeaveForm({
                  employeeId: employees[0].id,
                  type: 'سنوية',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  reason: ''
                });
                setShowLeaveForm(true);
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
              id="new-leave-btn"
            >
              <Plus className="w-4 h-4" />
              تقديم طلب إجازة
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 border-b border-slate-700/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">الموظف</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">نوع الإجازة</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">من تاريخ</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">إلى تاريخ</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300 text-center">المدة باليوم</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300">السبب والشرح</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300 text-center">الحالة</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-300 text-center">موافقة / رفض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      لا يوجد طلبات إجازة مسجلة.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l, idx) => (
                    <tr key={`leave-row-${l.id || idx}`} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                      <td className="py-3 px-4 font-medium text-slate-100">{l.employeeName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{l.startDate}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{l.endDate}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{l.days} أيام</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">{l.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          l.status === 'approved' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' :
                          l.status === 'rejected' ? 'bg-red-900/50 text-red-300 border border-red-700/50' :
                          'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                        }`}>
                          {l.status === 'approved' ? 'مقبولة' : l.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {l.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'approved')}
                              className="p-1 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-700/50 transition-colors"
                              title="موافقة"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'rejected')}
                              className="p-1 bg-red-900/50 hover:bg-red-900 text-red-300 rounded border border-red-700/50 transition-colors"
                              title="رفض"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">مكتمل</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Attendance */}
      {subTab === 'attendance' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 overflow-hidden text-slate-100" dir="rtl">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-700/80 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                سجل الحضور والانصراف اليومي للموظفين
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تتبع ساعات الدوام، التأخير، الإضافي والغياب بشكل يومي لكل الموظفين النشطين.
              </p>
            </div>
            
            {/* Action Bar */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">📅 تاريخ اليوم:</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="p-2 text-xs rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={markAllPresent}
                className="px-4 py-2 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 text-xs font-bold rounded-xl transition-all border border-indigo-700/50 flex items-center gap-1.5"
              >
                ✅ تسجيل حضور للكل
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={attendanceLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
              >
                {attendanceLoading ? "جاري الحفظ..." : "💾 حفظ الحضور والإنصراف"}
              </button>
            </div>
          </div>

          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5 border-b border-slate-700/80 bg-slate-900/30">
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-2xl p-3.5 text-center transition-all hover:shadow-sm">
              <span className="text-xl md:text-2xl font-bold text-emerald-300 font-mono block">
                {attendance.filter(a => a.status === 'present').length}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium mt-1 block">✅ حاضر</span>
            </div>
            <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-3.5 text-center transition-all hover:shadow-sm">
              <span className="text-xl md:text-2xl font-bold text-red-300 font-mono block">
                {attendance.filter(a => a.status === 'absent').length}
              </span>
              <span className="text-[10px] text-red-400 font-medium mt-1 block">❌ غائب</span>
            </div>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-3.5 text-center transition-all hover:shadow-sm">
              <span className="text-xl md:text-2xl font-bold text-amber-300 font-mono block">
                {attendance.filter(a => a.status === 'late').length}
              </span>
              <span className="text-[10px] text-amber-400 font-medium mt-1 block">⏰ متأخر</span>
            </div>
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-3.5 text-center transition-all hover:shadow-sm">
              <span className="text-xl md:text-2xl font-bold text-blue-300 font-mono block">
                {attendance.filter(a => a.status === 'leave').length}
              </span>
              <span className="text-[10px] text-blue-400 font-medium mt-1 block">📝 إجازة</span>
            </div>
            <div className="bg-purple-900/30 border border-purple-700/50 rounded-2xl p-3.5 text-center transition-all hover:shadow-sm col-span-2 md:col-span-1">
              <span className="text-xl md:text-2xl font-bold text-purple-300 font-mono block">
                {attendance.filter(a => a.status === 'holiday').length}
              </span>
              <span className="text-[10px] text-purple-400 font-medium mt-1 block">🏖️ عطلة رسمية</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-12 text-center">#</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">الموظف والقسم</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-32">وقت الحضور</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-32">وقت الانصراف</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-28 text-center">إضافي (ساعة)</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-40">حالة الدوام</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">ملاحظات</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 w-28 text-center">تغيير سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      {attendanceLoading ? "جاري تحميل سجلات الحضور..." : "لا يوجد موظفين نشطين لتسجيل حضورهم حالياً."}
                    </td>
                  </tr>
                ) : (
                  attendance.map((item, index) => (
                    <tr key={`attendance-${item.employee_id || index}-${index}`} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{item.employee_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.department_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={item.check_in}
                          onChange={(e) => updateAttendanceField(item.employee_id, 'check_in', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={item.check_out}
                          onChange={(e) => updateAttendanceField(item.employee_id, 'check_out', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.overtime_hours}
                          onChange={(e) => updateAttendanceField(item.employee_id, 'overtime_hours', Number(e.target.value))}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-700/80 bg-slate-900 text-slate-100 text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => updateAttendanceField(item.employee_id, 'status', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-700/80 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-semibold"
                        >
                          <option value="present">✅ حاضر / مكتمل</option>
                          <option value="absent">❌ غائب</option>
                          <option value="late">⏰ متأخر</option>
                          <option value="leave">📝 إجازة</option>
                          <option value="holiday">🏖️ عطلة</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="ملاحظات الحضور أو الغياب..."
                          value={item.notes}
                          onChange={(e) => updateAttendanceField(item.employee_id, 'notes', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-700/80 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateAttendanceField(item.employee_id, 'status', 'present');
                              if (!item.check_in) updateAttendanceField(item.employee_id, 'check_in', '09:00');
                              if (!item.check_out) updateAttendanceField(item.employee_id, 'check_out', '17:00');
                            }}
                            className="px-1.5 py-1 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 rounded text-[10px] font-bold transition-all border border-emerald-700/50"
                            title="تعيين حاضر"
                          >
                            حضور
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateAttendanceField(item.employee_id, 'status', 'absent');
                              updateAttendanceField(item.employee_id, 'check_in', '');
                              updateAttendanceField(item.employee_id, 'check_out', '');
                            }}
                            className="px-1.5 py-1 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold transition-all border border-red-700/50"
                            title="تعيين غائب"
                          >
                            غياب
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: Performance Reviews */}
      {subTab === 'performance_reviews' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-6 text-slate-100" dir="rtl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                ⭐️ تقييم أداء الموظفين والتقارير الدورية
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">تسجيل تقييمات الأداء الدورية ومتابعة الدرجات والملاحظات لتحفيز الكفاءات.</p>
            </div>
            <button
              onClick={() => {
                if (employees.length === 0) {
                  setError("يرجى إضافة موظفين أولاً لتسجيل تقييم");
                  return;
                }
                setReviewForm({ employeeId: employees[0].id, score: 5, comments: '' });
                setShowReviewForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              ➕ تسجيل تقييم أداء جديد
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 text-center">
              <span className="text-2xl font-bold text-slate-100 block">
                {(reviews.reduce((acc, curr) => acc + Number(curr.score), 0) / (reviews.length || 1)).toFixed(1)} / 5
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">متوسط تقييمات الشركة</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 text-center">
              <span className="text-2xl font-bold text-slate-100 block">{reviews.length}</span>
              <span className="block text-[11px] text-slate-400 mt-1">إجمالي التقارير المعتمدة</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 text-center">
              <span className="text-2xl font-bold text-indigo-400 block">
                {reviews.filter(r => r.score >= 4).length}
              </span>
              <span className="block text-[11px] text-indigo-300 mt-1">موظفين ذوي أداء متميز (⭐⭐⭐⭐+)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-300 border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-300">الموظف</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">تاريخ التقييم</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 text-center">الدرجة</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">الملاحظات والتوصيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">لا توجد تقييمات مسجلة حتى الآن.</td>
                  </tr>
                ) : (
                  reviews.map((r, idx) => {
                    const emp = employees.find(e => String(e.id) === String(r.employeeId));
                    return (
                      <tr key={idx} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                        <td className="py-3 px-4 font-bold text-slate-100">{emp?.name || r.employeeName || "موظف غير معروف"}</td>
                        <td className="py-3 px-4 text-slate-400">{r.reviewDate}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">⭐️ {r.score} / 5</td>
                        <td className="py-3 px-4 text-slate-300 max-w-sm truncate" title={r.comments}>
                          {r.comments || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 6: Trainings */}
      {subTab === 'trainings' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-6 text-slate-100" dir="rtl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                🎓 خطط التدريب والدورات التطويرية
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">بناء مهارات فريق العمل عبر تنظيم الورش التدريبية وتسجيل الموظفين.</p>
            </div>
            <button
              onClick={() => {
                setTrainingForm({ title: '', description: '', trainer: '', duration: '', startDate: '' });
                setShowTrainingForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              ➕ إضافة دورة تدريبية جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* List of Courses */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-200 text-xs border-b border-slate-700/80 pb-2">الدورات التدريبية المتاحة</h4>
              <div className="space-y-3">
                {trainings.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">لا توجد دورات مسجلة حالياً.</p>
                ) : (
                  trainings.map((t, idx) => (
                    <div key={idx} className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm">{t.title}</span>
                        <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 text-[10px] font-bold px-2 py-0.5 rounded">المدة: {t.duration}</span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{t.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span><b>المدرب:</b> {t.trainer}</span>
                        <span><b>تاريخ البدء:</b> {t.startDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* List of Enrollments */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-200 text-xs border-b border-slate-700/80 pb-2">سجل حضور الدورات (الموظفين المسجلين)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">الموظف</th>
                      <th className="py-2.5 px-3">الدورة التدريبية</th>
                      <th className="py-2.5 px-3">تاريخ التسجيل</th>
                      <th className="py-2.5 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {activeEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">لا يوجد موظفون مسجلون في أي دورة بعد.</td>
                      </tr>
                    ) : (
                      activeEnrollments.map((e, idx) => {
                        const emp = employees.find(x => String(x.id) === String(e.employeeId));
                        const trn = trainings.find(t => String(t.id) === String(e.trainingId));
                        return (
                          <tr key={idx} className="border-b border-slate-700/40">
                            <td className="py-2.5 px-3 font-bold text-slate-100">{emp?.name || "موظف"}</td>
                            <td className="py-2.5 px-3 text-slate-300">{trn?.title || "دورة تدريبية"}</td>
                            <td className="py-2.5 px-3 text-slate-400">{e.enrollDate}</td>
                            <td className="py-2.5 px-3">
                              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold px-2 py-0.5 rounded">مسجل</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: Recruitment */}
      {subTab === 'recruitment' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-6 text-slate-100" dir="rtl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                💼 نظام التوظيف وإدارة المتقدمين (ATS)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">إدارة الفرص الوظيفية الشاغرة، وتتبع طلبات المتقدمين وجدولة المقابلات.</p>
            </div>
            <button
              onClick={() => {
                setJobForm({ title: '', department: 'المالية', description: '', requirements: '', salaryRange: '' });
                setShowJobForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              ➕ نشر فرصة وظيفية جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Job Openings */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-200 text-xs border-b border-slate-700/80 pb-2">الفرص الوظيفية المفتوحة ({jobOpenings.length})</h4>
              <div className="space-y-3">
                {jobOpenings.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">لا توجد وظائف معلنة حالياً.</p>
                ) : (
                  jobOpenings.map((job, idx) => {
                    const appsCount = jobApplications.filter(a => String(a.jobOpeningId) === String(job.id)).length;
                    return (
                      <div key={idx} className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100 text-xs">{job.title}</span>
                          <span className="bg-blue-900/50 text-blue-300 border border-blue-700/50 text-[9px] font-bold px-2 py-0.5 rounded">{job.department}</span>
                        </div>
                        <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-2">{job.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                          <span>الراتب: {job.salaryRange || 'غير محدد'}</span>
                          <span className="font-bold text-indigo-400">📩 {appsCount} متقدم</span>
                        </div>
                        <button
                          onClick={() => {
                            setAppFormState({ jobOpeningId: job.id, fullName: '', email: '', phone: '' });
                            setShowAppForm(true);
                          }}
                          className="w-full text-center py-1.5 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 font-bold text-[10px] rounded-lg mt-1 transition-all"
                        >
                          ➕ تقديم طلب مرشح جديد
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Applications */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-bold text-slate-200 text-xs border-b border-slate-700/80 pb-2">طلبات التوظيف والمتقدمين</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">المرشح</th>
                      <th className="py-2.5 px-3">الوظيفة المطلومة</th>
                      <th className="py-2.5 px-3">البريد والهاتف</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                      <th className="py-2.5 px-3 text-center">الخيار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {jobApplications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">لا توجد طلبات توظيف مقدمة.</td>
                      </tr>
                    ) : (
                      jobApplications.map((app, idx) => {
                        const job = jobOpenings.find(j => String(j.id) === String(app.jobOpeningId));
                        return (
                          <tr key={idx} className="hover:bg-slate-700/40 border-b border-slate-700/40">
                            <td className="py-2.5 px-3 font-bold text-slate-100">{app.fullName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{job?.title || "وظيفة عامة"}</td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                              <div>{app.email}</div>
                              <div>{app.phone}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                                {app.status === 'applied' ? 'طلب جديد' : app.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setInterviewForm({ jobApplicationId: app.id, interviewDate: new Date().toISOString().split('T')[0], interviewTime: '10:00', type: 'online', interviewer: '' });
                                  setShowInterviewForm(true);
                                }}
                                className="px-2 py-1 bg-slate-900 text-slate-200 border border-slate-700/80 font-bold text-[9px] rounded hover:bg-slate-700 transition-colors"
                              >
                                ⏱️ جدولة مقابلة
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Scheduled Interviews */}
              <div className="pt-4 border-t border-slate-700/80">
                <h4 className="font-bold text-slate-200 text-xs mb-3">المقابلات المجدولة ({interviews.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {interviews.length === 0 ? (
                    <p className="text-slate-400 text-[10px]">لا توجد مقابلات مجدولة حالياً.</p>
                  ) : (
                    interviews.map((int, idx) => {
                      const app = jobApplications.find(a => String(a.id) === String(int.jobApplicationId));
                      return (
                        <div key={idx} className="p-3 bg-indigo-900/30 rounded-xl border border-indigo-700/50 text-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between font-bold text-slate-100">
                              <span>{app?.fullName || "مرشح"}</span>
                              <span className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.5 rounded">{int.type === 'online' ? 'عن بعد' : 'حضوري'}</span>
                            </div>
                            <p className="text-slate-400 text-[10px] mt-1"><b>المقابل:</b> {int.interviewer || 'لجنة الموارد البشرية'}</p>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between border-t border-indigo-700/30 pt-1.5">
                            <span>📅 {int.interviewDate}</span>
                            <span>⏱️ {int.interviewTime}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 8: Employee Portal Preview */}
      {subTab === 'employee_portal' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-6 text-slate-100" dir="rtl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                🚀 معاينة تفاعلية لبوابة الموظفين (Employee Portal)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تتيح البوابة للموظفين مراجعة ملفاتهم، تقديم طلبات إجازة، قراءة تقييمات الأداء والالتحاق بالتدريبات.
              </p>
            </div>
            <a
              href="/employee_portal.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/50 flex items-center gap-2"
            >
              🌐 فتح البوابة في صفحة منفصلة
            </a>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-red-400 block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400 block"></span>
              <span className="w-3 h-3 rounded-full bg-green-400 block"></span>
              <span className="text-[10px] text-slate-400 font-mono select-none mr-2 font-bold">https://hadaba-erp.cloud/employee_portal.html</span>
            </div>
            <iframe
              src="/employee_portal.html"
              className="w-full h-[600px] rounded-xl border border-slate-700 bg-slate-900"
              title="Employee Portal Live Preview"
            ></iframe>
          </div>
        </div>
      )}

      {/* SUBTAB 9: Employee Installments Management */}
      {subTab === 'installments' && (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/80 p-6 space-y-6 text-slate-100" dir="rtl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                💰 نظام القروض والذمم المالية والأقساط الشهرية
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تتبع التسهيلات المالية والسلفيات الممنوحة للموظفين، وجدولة الاستقطاعات التلقائية من مسيرات الرواتب.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setInstForm({
                    employee_id: employees[0]?.id || '',
                    installment_type_id: instTypes[0]?.id || '1',
                    total_amount: '',
                    total_months: '',
                    start_date: new Date().toISOString().split('T')[0],
                    interest_rate: '0',
                    notes: '',
                    contract_number: ''
                  });
                  setShowInstForm(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                تسجيل قسط / سلفة جديدة
              </button>
              <button
                onClick={() => setShowInstTypeForm(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Tag className="w-4 h-4" />
                إضافة نوع تقسيط جديد
              </button>
              <button
                onClick={() => {
                  const firstInst = installments[0];
                  setPayForm({
                    installment_id: firstInst?.id || '',
                    payment_date: new Date().toISOString().split('T')[0],
                    amount: '',
                    payment_method: 'cash',
                    notes: ''
                  });
                  setShowPayForm(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Coins className="w-4 h-4" />
                تسجيل سداد يدوي
              </button>
            </div>
          </div>

          {/* Stats Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/80">
              <span className="text-[10px] font-bold text-slate-400 block">إجمالي التمويلات الممنوحة</span>
              <span className="text-lg font-extrabold text-slate-100 mt-1 block">{(instStats.total_amount || 0).toLocaleString()} {currency}</span>
              <span className="text-[9px] text-slate-400 mt-1 block">الأقساط النشطة: {instStats.active_installments || 0}</span>
            </div>
            <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
              <span className="text-[10px] font-bold text-emerald-400 block">المحصل / المسترد فعلياً</span>
              <span className="text-lg font-extrabold text-emerald-300 mt-1 block">{(instStats.total_paid || 0).toLocaleString()} {currency}</span>
              <span className="text-[9px] text-emerald-400 mt-1 block">بنسبة تحصيل: {instStats.collection_rate || 0}%</span>
            </div>
            <div className="bg-amber-950/40 rounded-2xl p-4 border border-amber-800/40">
              <span className="text-[10px] font-bold text-amber-400 block">المتبقي قيد الانتظار</span>
              <span className="text-lg font-extrabold text-amber-300 mt-1 block">{(instStats.total_paid !== undefined ? (instStats.total_amount - instStats.total_paid) : 0).toLocaleString()} {currency}</span>
              <span className="text-[9px] text-amber-400 mt-1 block">مجدولة على الأشهر القادمة</span>
            </div>
            <div className="bg-rose-950/40 rounded-2xl p-4 border border-rose-800/40">
              <span className="text-[10px] font-bold text-rose-400 block">الأقساط المتعثرة</span>
              <span className="text-lg font-extrabold text-rose-300 mt-1 block">{(instStats.total_overdue || 0).toLocaleString()} {currency}</span>
              <span className="text-[9px] text-rose-400 mt-1 block">متجاوزة تاريخ الاستحقاق</span>
            </div>
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">كفاءة تحصيل القروض</span>
                <span className="text-md font-bold text-slate-200 mt-1 block">{instStats.collection_rate || 0}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${instStats.collection_rate || 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Filters Control Bar */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 flex flex-wrap gap-3 items-center text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">الموظف:</span>
              <select
                value={instFilterEmployee}
                onChange={(e) => setInstFilterEmployee(e.target.value)}
                className="p-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none"
              >
                <option value="">الكل</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">الحالة:</span>
              <select
                value={instFilterStatus}
                onChange={(e) => setInstFilterStatus(e.target.value)}
                className="p-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none"
              >
                <option value="">الكل</option>
                <option value="active">🟢 نشط</option>
                <option value="completed">✅ مكتمل</option>
                <option value="defaulted">🔴 متعثر</option>
                <option value="cancelled">⏸️ ملغي</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">النوع:</span>
              <select
                value={instFilterType}
                onChange={(e) => setInstFilterType(e.target.value)}
                className="p-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none"
              >
                <option value="">الكل</option>
                {instTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
            </div>

            {(instFilterEmployee || instFilterStatus || instFilterType) && (
              <button
                onClick={() => {
                  setInstFilterEmployee('');
                  setInstFilterStatus('');
                  setInstFilterType('');
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px] font-bold text-slate-200 transition-colors"
              >
                إلغاء التصفية
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-700/80 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700/80">
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">نوع التمويل</th>
                  <th className="p-3.5">رقم العقد / المستند</th>
                  <th className="p-3.5 text-center">المبلغ الإجمالي</th>
                  <th className="p-3.5 text-center">القسط الشهري</th>
                  <th className="p-3.5 text-center">المدفوع حتى الآن</th>
                  <th className="p-3.5 text-center">المتبقي</th>
                  <th className="p-3.5 text-center">نسبة الإنجاز</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {installments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400">
                      لا توجد سجلات أقساط مسجلة حالياً تطابق شروط التصفية.
                    </td>
                  </tr>
                ) : (
                  installments
                    .filter(inst => {
                      if (instFilterEmployee && String(inst.employee_id) !== String(instFilterEmployee)) return false;
                      if (instFilterStatus && inst.status !== instFilterStatus) return false;
                      if (instFilterType && String(inst.installment_type_id) !== String(instFilterType)) return false;
                      return true;
                    })
                    .map((inst, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/40 transition-colors border-b border-slate-700/40">
                        <td className="p-3.5 font-bold text-slate-100">{inst.employee_name}</td>
                        <td className="p-3.5 text-slate-300">
                          <span className="mr-1">{inst.installment_type_icon}</span>
                          {inst.installment_type_name}
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{inst.contract_number || 'بدون رقم'}</td>
                        <td className="p-3.5 text-center font-bold text-slate-100">{inst.total_amount?.toLocaleString()} {currency}</td>
                        <td className="p-3.5 text-center text-slate-300">{inst.monthly_amount?.toLocaleString()} {currency} / شهر</td>
                        <td className="p-3.5 text-center text-emerald-400 font-bold">{inst.paid_amount?.toLocaleString()} {currency}</td>
                        <td className="p-3.5 text-center text-slate-400">{inst.remaining_amount?.toLocaleString()} {currency}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${inst.progress}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{inst.progress}%</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            inst.status === 'active' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' :
                            inst.status === 'completed' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50' :
                            inst.status === 'defaulted' ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50' :
                            'bg-slate-700 text-slate-300 border border-slate-600'
                          }`}>
                            {inst.status_text}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPaymentsSchedule(inst)}
                              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-colors text-[10px]"
                            >
                              📋 جدول السداد
                            </button>
                            {inst.status === 'active' && (
                              <button
                                onClick={() => {
                                  setPayForm({
                                    installment_id: inst.id,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    amount: String(inst.monthly_amount),
                                    payment_method: 'salary_deduction',
                                    notes: `سداد قسط شهر ${new Date().toLocaleString('ar-EG', { month: 'long' })}`
                                  });
                                  setShowPayForm(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-[10px]"
                              >
                                💳 سداد دفعة
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POPUP: Add/Edit Employee Form */}
      {showEmpForm && (
        <div 
          onClick={() => setShowEmpForm(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: -350, bottom: 350 }}
            dragElastic={0.15}
            dragMomentum={false}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 max-w-2xl w-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing max-h-[90vh] my-auto select-none" 
            dir="rtl"
          >
            {/* Drag Handle Indicator */}
            <div className="pt-2.5 pb-1 flex flex-col items-center justify-center bg-slate-900/80 border-b border-slate-700/80 shrink-0">
              <div className="w-14 h-1.5 bg-slate-600 rounded-full cursor-ns-resize hover:bg-slate-500 transition-colors" title="اسحب الشاشة لأعلى أو لأسفل" />
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">💡 اسحب الشاشة للأعلى/الأسفل لتوفير مساحة، وانقر بالخارج للإغلاق</span>
            </div>

            {/* Header */}
            <div className="p-5 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-900/40 text-emerald-400 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {editingEmpId ? "تعديل بيانات الموظف المطور" : "➕ إضافة موظف جديد"}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">يرجى ملء الحقول المطلوبة لبناء السجل الوظيفي والمالي للموظف بدقة.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowEmpForm(false)} 
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1 rounded-lg text-lg transition-colors font-bold"
              >
                ×
              </button>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="mx-5 mt-4 p-3 bg-red-950/50 border border-red-800/60 text-red-300 text-[11px] rounded-xl flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                <span className="font-semibold">تنبيه: {error}</span>
              </div>
            )}

            <form 
              onSubmit={handleSaveEmployee} 
              onPointerDown={(e) => e.stopPropagation()}
              className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(90vh-180px)] select-text"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full name */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={empForm.name}
                    onChange={(e) => setEmpForm({...empForm, name: e.target.value})}
                    placeholder="أدخل الاسم الرباعي"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* National ID */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الرقم القومي (14 رقم) *</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={empForm.nationalId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ''); // Allow digits only
                      setEmpForm({...empForm, nationalId: val});
                    }}
                    placeholder="29012345678901"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={empForm.birthDate}
                    onChange={(e) => setEmpForm({...empForm, birthDate: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Hire Date / Join Date */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">تاريخ التعيين / المباشرة *</label>
                  <input
                    type="date"
                    required
                    value={empForm.joinDate}
                    onChange={(e) => setEmpForm({...empForm, joinDate: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Department (Dynamic loaded from departments endpoint) */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">القسم *</label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({...empForm, department: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="المبيعات">المبيعات</option>
                        <option value="المشتريات">المشتريات</option>
                        <option value="المخازن">المخازن</option>
                        <option value="المحاسبة">المحاسبة</option>
                        <option value="الإدارة">الإدارة</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Job Title / Position */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={empForm.position}
                    onChange={(e) => setEmpForm({...empForm, position: e.target.value})}
                    placeholder="مثال: محاسب قانوني / أمين مخزن"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Worker Type */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">نوع العمالة *</label>
                  <select
                    value={empForm.worker_type || 'employee'}
                    onChange={(e) => {
                      const val = e.target.value as 'employee' | 'daily_worker' | 'probation';
                      setEmpForm({
                        ...empForm,
                        worker_type: val,
                        is_daily_worker: val === 'daily_worker'
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="employee">🧑💼 موظف رسمي (دوام كامل)</option>
                    <option value="probation">📝 موظف فترة تجربة</option>
                    <option value="daily_worker">🧑🔧 عامل يومي (عند الطلب)</option>
                  </select>
                </div>

                {empForm.worker_type === 'daily_worker' ? (
                  <>
                    {/* Daily Wage */}
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">الأجر اليومي (ج.م) *</label>
                      <input
                        type="number"
                        required={empForm.worker_type === 'daily_worker'}
                        step="0.01"
                        value={empForm.daily_wage || 0}
                        onChange={(e) => setEmpForm({...empForm, daily_wage: Number(e.target.value)})}
                        placeholder="مثال: 150"
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">يتم حساب الأجر = الأجر اليومي × عدد أيام العمل</p>

                      {/* Availability status */}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isAvailableCheckbox"
                          checked={empForm.is_available}
                          onChange={(e) => setEmpForm({...empForm, is_available: e.target.checked})}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                        />
                        <label htmlFor="isAvailableCheckbox" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                          🟢 متاح للعمل والطلب
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Base Salary */}
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">الراتب الأساسي (ج.م) *</label>
                      <input
                        type="number"
                        required={(empForm.worker_type as any) !== 'daily_worker'}
                        step="0.01"
                        value={empForm.basicSalary}
                        onChange={(e) => setEmpForm({...empForm, basicSalary: Number(e.target.value)})}
                        placeholder="0.00"
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}

                {/* Allowance */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">البدلات الشهرية</label>
                  <input
                    type="number"
                    step="0.01"
                    value={empForm.allowance}
                    onChange={(e) => setEmpForm({...empForm, allowance: Number(e.target.value)})}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Social Insurance Number */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">رقم التأمينات الاجتماعية</label>
                  <input
                    type="text"
                    value={empForm.socialInsuranceNumber}
                    onChange={(e) => setEmpForm({...empForm, socialInsuranceNumber: e.target.value})}
                    placeholder="أدخل الرقم التأميني"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Subject to Social Insurance Checkbox */}
                <div className="col-span-full bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="subject_to_social_insurance_checkbox"
                    checked={empForm.subject_to_social_insurance}
                    onChange={(e) => setEmpForm({...empForm, subject_to_social_insurance: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                  />
                  <label htmlFor="subject_to_social_insurance_checkbox" className="text-sm font-bold text-slate-200 cursor-pointer select-none">
                    خاضع للتأمينات الاجتماعية (تطبيق خصم 14% من الراتب الأساسي)
                  </label>
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الهاتف</label>
                  <input
                    type="tel"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({...empForm, phone: e.target.value})}
                    placeholder="01xxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({...empForm, email: e.target.value})}
                    placeholder="employee@elhadaba.eg"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">حالة الموظف الحالي</label>
                  <select
                    value={empForm.status}
                    onChange={(e) => setEmpForm({...empForm, status: e.target.value as any})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="active">نشط / على رأس العمل</option>
                    <option value="on_leave">في إجازة رسمية</option>
                    <option value="terminated">موقوف / تم إنهاء الخدمة</option>
                  </select>
                </div>

                {/* IBAN Bank Account */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">رقم الآيبان IBAN البنكي أو الحساب البنكي</label>
                  <input
                    type="text"
                    value={empForm.iban}
                    onChange={(e) => setEmpForm({...empForm, iban: e.target.value})}
                    placeholder="EG1234..."
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">العنوان السكني بالكامل</label>
                  <textarea
                    rows={2}
                    value={empForm.address}
                    onChange={(e) => setEmpForm({...empForm, address: e.target.value})}
                    placeholder="أدخل العنوان الحالي بالتفصيل"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEmpForm(false)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-all"
                >
                  إلغاء التغييرات
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {loading ? "جاري المعالجة..." : "💾 حفظ سجل الموظف"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* POPUP: Create Payroll slip */}
      {showPayrollForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">توليد مسير راتب موظف</h3>
              <button onClick={() => setShowPayrollForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSavePayroll} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اختر الموظف المستحق *</label>
                <select
                  required
                  value={payrollForm.employeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الشهر المستحق (السنة-الشهر) *</label>
                <input
                  type="month"
                  required
                  value={payrollForm.month}
                  onChange={(e) => setPayrollForm({...payrollForm, month: e.target.value})}
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">الراتب الأساسي</label>
                  <input
                    type="number"
                    required
                    value={payrollForm.basicSalary}
                    onChange={(e) => setPayrollForm({...payrollForm, basicSalary: Number(e.target.value)})}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">البدلات</label>
                  <input
                    type="number"
                    value={payrollForm.allowance}
                    onChange={(e) => setPayrollForm({...payrollForm, allowance: Number(e.target.value)})}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الخصميات</label>
                  <input
                    type="number"
                    value={payrollForm.deductions}
                    onChange={(e) => setPayrollForm({...payrollForm, deductions: Number(e.target.value)})}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/80 flex items-center justify-between">
                <span className="font-semibold text-slate-300">صافي المستحق:</span>
                <span className="text-sm font-bold text-slate-100">
                  {(payrollForm.basicSalary + payrollForm.allowance - payrollForm.deductions).toLocaleString()} {currency}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">حالة المسير</label>
                <select
                  value={payrollForm.status}
                  onChange={(e) => setPayrollForm({...payrollForm, status: e.target.value as any})}
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="draft">مسودة بانتظار الاعتماد</option>
                  <option value="paid">معتمد وصرف فوراً</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayrollForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  {loading ? "جاري التوليد..." : "توليد كشف الراتب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Create Leave request */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">تقديم طلب إجازة موظف</h3>
              <button onClick={() => setShowLeaveForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveLeave} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">الموظف طالب الإجازة *</label>
                <select
                  required
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({...leaveForm, employeeId: e.target.value})}
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="" className="bg-slate-900 text-white">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">نوع الإجازة *</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="سنوية" className="bg-slate-900 text-white">إجازة سنوية اعتيادية</option>
                  <option value="مرضية" className="bg-slate-900 text-white">إجازة مرضية طارئة</option>
                  <option value="عارضة" className="bg-slate-900 text-white">إجازة عارضة</option>
                  <option value="بدون راتب" className="bg-slate-900 text-white">إجازة بدون راتب</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ البدء *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ الانتهاء *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">السبب وتوضيحات الطلب *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  placeholder="يرجى كتابة تفاصيل وسبب طلب الإجازة..."
                  className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  {loading ? "جاري الإرسال..." : "إرسال الطلب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Create Performance Review */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">تسجيل تقييم أداء جديد</h3>
              <button onClick={() => setShowReviewForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveReview} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">الموظف *</label>
                <select
                  required
                  value={reviewForm.employeeId}
                  onChange={(e) => setReviewForm({...reviewForm, employeeId: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="" className="bg-slate-900 text-white">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الدرجة والتقييم (من 1 إلى 5) *</label>
                <select
                  value={reviewForm.score}
                  onChange={(e) => setReviewForm({...reviewForm, score: Number(e.target.value)})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5/5) ممتاز جداً</option>
                  <option value="4">⭐⭐⭐⭐ (4/5) جيد جداً</option>
                  <option value="3">⭐⭐⭐ (3/5) متوسط</option>
                  <option value="2">⭐⭐ (2/5) مقبول</option>
                  <option value="1">⭐ (1/5) ضعيف</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">التعليقات والملاحظات والتوصيات *</label>
                <textarea
                  required
                  rows={4}
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({...reviewForm, comments: e.target.value})}
                  placeholder="اكتب تفاصيل التقييم والتوصيات لتطوير الموظف..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  حفظ التقييم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Create Training Course */}
      {showTrainingForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">إضافة دورة تدريبية جديدة</h3>
              <button onClick={() => setShowTrainingForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveTraining} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الدورة التدريبية *</label>
                <input
                  type="text"
                  required
                  value={trainingForm.title}
                  onChange={(e) => setTrainingForm({...trainingForm, title: e.target.value})}
                  placeholder="مثال: مهارات القيادة الإدارية"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">اسم المدرب / الجهة المنظمة *</label>
                <input
                  type="text"
                  required
                  value={trainingForm.trainer}
                  onChange={(e) => setTrainingForm({...trainingForm, trainer: e.target.value})}
                  placeholder="مثال: د. أحمد المحاسب"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">المدة الكلية *</label>
                  <input
                    type="text"
                    required
                    value={trainingForm.duration}
                    onChange={(e) => setTrainingForm({...trainingForm, duration: e.target.value})}
                    placeholder="مثال: 5 أيام (15 ساعة)"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ البدء *</label>
                  <input
                    type="date"
                    required
                    value={trainingForm.startDate}
                    onChange={(e) => setTrainingForm({...trainingForm, startDate: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">وصف الدورة والأهداف التدريبية *</label>
                <textarea
                  required
                  rows={3}
                  value={trainingForm.description}
                  onChange={(e) => setTrainingForm({...trainingForm, description: e.target.value})}
                  placeholder="اكتب أهداف الدورة والمخرجات المتوقعة للموظفين..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrainingForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  إضافة الدورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Create Job Opening */}
      {showJobForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">نشر فرصة وظيفية جديدة</h3>
              <button onClick={() => setShowJobForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveJobOpening} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الفرصة الوظيفية *</label>
                <input
                  type="text"
                  required
                  value={jobForm.title}
                  onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                  placeholder="مثال: محاسب قانوني أول"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">القسم المسؤول *</label>
                  <select
                    value={jobForm.department}
                    onChange={(e) => setJobForm({...jobForm, department: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  >
                    <option value="المالية">المالية والحسابات</option>
                    <option value="الموارد البشرية">الموارد البشرية</option>
                    <option value="تكنولوجيا المعلومات">تكنولوجيا المعلومات</option>
                    <option value="المبيعات">المبيعات والتسويق</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">نطاق الراتب المتوقع</label>
                  <input
                    type="text"
                    value={jobForm.salaryRange}
                    onChange={(e) => setJobForm({...jobForm, salaryRange: e.target.value})}
                    placeholder="مثال: 12,000 - 15,000 ج.م"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">وصف الدور الوظيفي *</label>
                <textarea
                  required
                  rows={3}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                  placeholder="تفاصيل المهام والمسؤوليات اليومية..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">متطلبات التقديم والشروط *</label>
                <textarea
                  required
                  rows={3}
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({...jobForm, requirements: e.target.value})}
                  placeholder="المؤهلات المطلوبة وسنوات الخبرة..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJobForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  نشر الوظيفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Create Job Application */}
      {showAppForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">تسجيل مرشح لفرصة وظيفية</h3>
              <button onClick={() => setShowAppForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveJobApplication} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">الاسم الكامل للمرشح *</label>
                <input
                  type="text"
                  required
                  value={appFormState.fullName}
                  onChange={(e) => setAppFormState({...appFormState, fullName: e.target.value})}
                  placeholder="مثال: يوسف ممدوح الهاشمي"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">البريد الإلكتروني للمرشح *</label>
                <input
                  type="email"
                  required
                  value={appFormState.email}
                  onChange={(e) => setAppFormState({...appFormState, email: e.target.value})}
                  placeholder="youssef@example.com"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رقم الهاتف الجوال *</label>
                <input
                  type="text"
                  required
                  value={appFormState.phone}
                  onChange={(e) => setAppFormState({...appFormState, phone: e.target.value})}
                  placeholder="01xxxxxxxxx"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  تسجيل المرشح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Schedule Interview */}
      {showInterviewForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">جدولة مقابلة عمل للمرشح</h3>
              <button onClick={() => setShowInterviewForm(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveInterview} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ المقابلة *</label>
                  <input
                    type="date"
                    required
                    value={interviewForm.interviewDate}
                    onChange={(e) => setInterviewForm({...interviewForm, interviewDate: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الوقت المختار *</label>
                  <input
                    type="time"
                    required
                    value={interviewForm.interviewTime}
                    onChange={(e) => setInterviewForm({...interviewForm, interviewTime: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">نوع المقابلة *</label>
                <select
                  value={interviewForm.type}
                  onChange={(e) => setInterviewForm({...interviewForm, type: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                >
                  <option value="online">عن بعد عبر Google Meet (أونلاين)</option>
                  <option value="onsite">حضوري بمقر الشركة (أوفلاين)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">المحاور / لجنة المقابلة المسؤولية *</label>
                <input
                  type="text"
                  required
                  value={interviewForm.interviewer}
                  onChange={(e) => setInterviewForm({...interviewForm, interviewer: e.target.value})}
                  placeholder="مثال: م. تامر عبدالحميد (رئيس القسم)"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInterviewForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  جدولة وحفظ المقابلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Add New Installment / Loan */}
      {showInstForm && (
        <div 
          onClick={() => setShowInstForm(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: -350, bottom: 350 }}
            dragElastic={0.15}
            dragMomentum={false}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 max-w-lg w-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing max-h-[95vh] my-auto select-none" 
            dir="rtl"
          >
            {/* Drag Handle Indicator */}
            <div className="pt-2.5 pb-1 flex flex-col items-center justify-center bg-slate-900/80 border-b border-slate-700/80 shrink-0">
              <div className="w-14 h-1.5 bg-slate-600 rounded-full cursor-ns-resize hover:bg-slate-500 transition-colors" title="اسحب الشاشة لأعلى أو لأسفل" />
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">💡 اسحب الشاشة للأعلى/الأسفل لتوفير مساحة، وانقر بالخارج للإغلاق</span>
            </div>

            {/* Header */}
            <div className="p-5 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-900/40 text-emerald-400 rounded-lg">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">💰 تسجيل قسط / تمويل جديد للموظف</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">يرجى تسجيل بيانات التمويل لتوزيع الأقساط الشهرية وجدولتها تلقائياً.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowInstForm(false)} 
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1 rounded-lg text-lg transition-colors font-bold"
              >
                ×
              </button>
            </div>

            {/* Error alerts inside modal */}
            {error && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-xl flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 block shrink-0" />
                <span className="font-semibold">تنبيه: {error}</span>
              </div>
            )}

            <form 
              onSubmit={handleSaveInstallment} 
              onPointerDown={(e) => e.stopPropagation()}
              className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(95vh-180px)] select-text"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee select */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الموظف المستفيد *</label>
                  <select
                    required
                    value={instForm.employee_id}
                    onChange={(e) => setInstForm({...instForm, employee_id: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="" className="bg-slate-900 text-white">اختر الموظف...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id} className="bg-slate-900 text-white">{e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Installment Type select */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">نوع التمويل / القسط *</label>
                  <select
                    required
                    value={instForm.installment_type_id}
                    onChange={(e) => setInstForm({...instForm, installment_type_id: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="" className="bg-slate-900 text-white">اختر النوع...</option>
                    {instTypes.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Total amount */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">المبلغ الإجمالي الممنوح ({currency}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={instForm.total_amount}
                    onChange={(e) => setInstForm({...instForm, total_amount: e.target.value})}
                    placeholder="مثال: 24000"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Total months */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">مدة السداد (بالأشهر) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={instForm.total_months}
                    onChange={(e) => setInstForm({...instForm, total_months: e.target.value})}
                    placeholder="مثال: 12"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Start date */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">تاريخ أول استحقاق *</label>
                  <input
                    type="date"
                    required
                    value={instForm.start_date}
                    onChange={(e) => setInstForm({...instForm, start_date: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Contract number */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">رقم العقد / المستند الإثباتي</label>
                  <input
                    type="text"
                    value={instForm.contract_number}
                    onChange={(e) => setInstForm({...instForm, contract_number: e.target.value})}
                    placeholder="مثال: CNT-2026-981"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">نسبة الفائدة السنوية (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={instForm.interest_rate}
                    onChange={(e) => setInstForm({...instForm, interest_rate: e.target.value})}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Expected monthly installment indicator (calculated dynamically) */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400">القسط الشهري المتوقع:</span>
                  <span className="text-sm font-extrabold text-slate-200 mt-1">
                    {instForm.total_amount && instForm.total_months 
                      ? (Number(instForm.total_amount) / Number(instForm.total_months)).toFixed(2)
                      : '0.00'
                    } {currency} / شهر
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">ملاحظات وشروط إضافية</label>
                <textarea
                  value={instForm.notes}
                  onChange={(e) => setInstForm({...instForm, notes: e.target.value})}
                  rows={2}
                  placeholder="أدخل أي شروط استرداد أو تفاصيل إضافية هنا..."
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInstForm(false)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-all text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs"
                >
                  {loading ? "جاري الحفظ..." : "تسجيل وحفظ التمويل"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* POPUP: Record Manual Repayment */}
      {showPayForm && (
        <div 
          onClick={() => setShowPayForm(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: -350, bottom: 350 }}
            dragElastic={0.15}
            dragMomentum={false}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 max-w-md w-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing max-h-[90vh] my-auto select-none" 
            dir="rtl"
          >
            {/* Drag Handle Indicator */}
            <div className="pt-2.5 pb-1 flex flex-col items-center justify-center bg-slate-900/80 border-b border-slate-700/80 shrink-0">
              <div className="w-14 h-1.5 bg-slate-600 rounded-full cursor-ns-resize hover:bg-slate-500 transition-colors" title="اسحب الشاشة لأعلى أو لأسفل" />
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">💡 اسحب الشاشة للأعلى/الأسفل لتوفير مساحة، وانقر بالخارج للإغلاق</span>
            </div>

            {/* Header */}
            <div className="p-5 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-900/40 text-blue-400 rounded-lg">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">💵 تسجيل سداد يدوي / دفعة تمويل</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">تسجيل تحصيل قسط يدوي أو خصم من حساب بنكي خارج مسير الرواتب.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPayForm(false)} 
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1 rounded-lg text-lg transition-colors font-bold"
              >
                ×
              </button>
            </div>

            {/* Error alerts inside modal */}
            {error && (
              <div className="mx-5 mt-4 p-3 bg-red-900/40 border border-red-700 text-red-200 text-[11px] rounded-xl flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                <span className="font-semibold">تنبيه: {error}</span>
              </div>
            )}

            <form 
              onSubmit={handlePayInstallmentSubmit} 
              onPointerDown={(e) => e.stopPropagation()}
              className="p-5 space-y-4 text-xs select-text"
            >
              {/* Select Installment */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اختر القسط / التمويل المطلوب سداده *</label>
                <select
                  required
                  value={payForm.installment_id}
                  onChange={(e) => {
                    const inst = installments.find(i => String(i.id) === String(e.target.value));
                    setPayForm({
                      ...payForm, 
                      installment_id: e.target.value,
                      amount: inst ? String(inst.monthly_amount) : ''
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="" className="bg-slate-900 text-white">اختر القسط الفعال...</option>
                  {installments.filter(i => i.status === 'active').map(i => (
                    <option key={i.id} value={i.id} className="bg-slate-900 text-white">
                      {i.employee_name} ({i.installment_type_name} - متبقي: {i.remaining_amount} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Repayment Date */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">تاريخ السداد *</label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({...payForm, payment_date: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">المبلغ المسدد ({currency}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({...payForm, amount: e.target.value})}
                    placeholder="مثال: 2000"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">طريقة السداد / التحصيل *</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({...payForm, payment_method: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="cash" className="bg-slate-900 text-white">💵 نقداً (خزينة الشركة)</option>
                  <option value="bank_transfer" className="bg-slate-900 text-white">🏦 تحويل بنكي</option>
                  <option value="salary_deduction" className="bg-slate-900 text-white">💼 استقطاع مباشر من الراتب</option>
                  <option value="cheque" className="bg-slate-900 text-white">✍️ شيك بنكي مقبول الدفع</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">ملاحظات التحصيل / إشارة مرجعية</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                  placeholder="مثال: سداد يدوي بموجب إيصال رقم #512"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-all text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs"
                >
                  {loading ? "جاري الحفظ..." : "تسجيل عملية السداد"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* POPUP: Detailed Repayment Schedule Breakdown */}
      {showPaymentsDrawer && (
        <div 
          onClick={() => setShowPaymentsDrawer(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: -350, bottom: 350 }}
            dragElastic={0.15}
            dragMomentum={false}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 max-w-xl w-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing max-h-[90vh] my-auto select-none" 
            dir="rtl"
          >
            {/* Drag Handle Indicator */}
            <div className="pt-2.5 pb-1 flex flex-col items-center justify-center bg-slate-900/80 border-b border-slate-700/80 shrink-0">
              <div className="w-14 h-1.5 bg-slate-600 rounded-full cursor-ns-resize hover:bg-slate-500 transition-colors" title="اسحب الشاشة لأعلى أو لأسفل" />
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">💡 اسحب الشاشة للأعلى/الأسفل لتوفير مساحة، وانقر بالخارج للإغلاق</span>
            </div>

            {/* Header */}
            <div className="p-5 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-900/40 text-indigo-400 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">📋 جدول استحقاقات الدفعات الشهرية</h3>
                  <p className="text-[10px] text-indigo-400 mt-0.5">{selectedInstName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPaymentsDrawer(false)} 
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1 rounded-lg text-lg transition-colors font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)] select-text text-xs space-y-4">
              <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-900/60">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-700/80">
                      <th className="p-3">رقم الدفعة</th>
                      <th className="p-3 text-center">تاريخ الاستحقاق</th>
                      <th className="p-3 text-center">المبلغ المطلوب</th>
                      <th className="p-3 text-center">حالة السداد</th>
                      <th className="p-3 text-center">طريقة السداد</th>
                      <th className="p-3 text-center">تاريخ الدفع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {selectedInstallmentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          لا توجد استحقاقات مسجلة لهذا القسط حالياً.
                        </td>
                      </tr>
                    ) : (
                      selectedInstallmentPayments.map((p, index) => (
                        <tr key={index} className="hover:bg-slate-800/60">
                          <td className="p-3 font-bold text-slate-200">الدفعة #{index + 1}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{p.due_date}</td>
                          <td className="p-3 text-center font-bold text-slate-100">{p.amount_due?.toLocaleString()} {currency}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'paid' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                            }`}>
                              {p.status === 'paid' ? '✅ مدفوعة' : '⏳ مستحقة'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            {p.payment_method === 'salary_deduction' ? '💼 خصم مرتب' :
                             p.payment_method === 'cash' ? '💵 نقداً' :
                             p.payment_method === 'bank_transfer' ? '🏦 تحويل بنكي' : '📝 أخرى'}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">{p.payment_date || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentsDrawer(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  إغلاق الجدول
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* POPUP: Add New Installment Type */}
      {showInstTypeForm && (
        <div 
          onClick={() => setShowInstTypeForm(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 max-w-md w-full overflow-hidden flex flex-col my-auto" 
            dir="rtl"
          >
            <div className="p-5 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-900/40 text-purple-400 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">➕ إضافة نوع تقسيط / تمويل جديد</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">أنشئ تصنيفاً مخصصاً لأنواع السلف والقروض</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowInstTypeForm(false)} 
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1 rounded-lg text-lg transition-colors font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateInstType} className="p-5 space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اسم نوع التمويل / القسط *</label>
                <input
                  type="text"
                  required
                  value={instTypeForm.name}
                  onChange={(e) => setInstTypeForm({...instTypeForm, name: e.target.value})}
                  placeholder="مثال: سلفة علاجية طارئة، سلفة أثاث..."
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">رمز تعبيري (أيقونة)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={5}
                    value={instTypeForm.icon}
                    onChange={(e) => setInstTypeForm({...instTypeForm, icon: e.target.value})}
                    className="w-20 p-2.5 text-center text-lg rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none"
                  />
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {['💵', '🏦', '💻', '🚗', '🏥', '🏠', '⚡', '🛠️', '📱', '🎓', '💎'].map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setInstTypeForm({...instTypeForm, icon})}
                        className={`p-2 rounded-lg border text-base hover:bg-slate-700 transition-colors ${instTypeForm.icon === icon ? 'bg-purple-900/60 border-purple-500' : 'bg-slate-900 border-slate-700'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">وصف موجز (اختياري)</label>
                <textarea
                  rows={2}
                  value={instTypeForm.description}
                  onChange={(e) => setInstTypeForm({...instTypeForm, description: e.target.value})}
                  placeholder="شروط أو تفاصيل حول نوع التمويل..."
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setShowInstTypeForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-all text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all text-xs shadow-md"
                >
                  حفظ وإضافة النوع
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 🏢 Department Manager Modal */}
      {showDepartmentManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-right dir-rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-base">
                <Building2 className="w-5 h-5" />
                <span>إدارة أقسام الشركة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDepartmentManager(false)}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDepartmentApi} className="flex gap-2">
              <input
                type="text"
                placeholder="إضافة اسم قسم جديد (مثال: الشؤون القانونية)..."
                value={newDepartmentInput}
                onChange={(e) => setNewDepartmentInput(e.target.value)}
                className="flex-1 p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-bold text-slate-300">الأقسام المتاحة حالياً ({departments.length}):</label>
              {departments.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-4">لا توجد أقسام مسجلة.</div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-200">{dept.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDepartmentApi(dept.id, dept.name)}
                      className="p-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 rounded-lg border border-red-800/50 transition-all cursor-pointer"
                      title="حذف القسم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDepartmentManager(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
