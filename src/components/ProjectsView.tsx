import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DragDropContextComponent = DragDropContext as any;
const DroppableComponent = Droppable as any;
const DraggableComponent = Draggable as any;

import { 
  Plus, 
  FolderKanban, 
  Briefcase, 
  Users, 
  Calendar, 
  DollarSign, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  User,
  ArrowLeft,
  Activity,
  CheckSquare,
  FileSpreadsheet
} from 'lucide-react';

interface ProjectsViewProps {
  userRole: string;
}

export default function ProjectsView({ userRole }: ProjectsViewProps) {
  // Main lists
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({});
  
  // Active Project Detail
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [projectTeam, setProjectTeam] = useState<any[]>([]);

  // Modals & UI Toggles
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [taskViewTab, setTaskViewTab] = useState<'table' | 'kanban' | 'gantt'>('table');
  
  // Loading & Alerts
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form States - Project
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    client_id: '',
    project_manager_id: '',
    department_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: '',
    priority: 'medium',
    status: 'planning'
  });

  // Form States - Task
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    estimated_hours: '',
    priority: 'medium'
  });

  // Form States - Team Member
  const [teamForm, setTeamForm] = useState({
    employee_id: '',
    role: 'member'
  });

  // Load all projects, dashboard, employees, and contacts
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProj, resDash, resEmp, resContact] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/projects/dashboard').then(r => r.json()),
        fetch('/api/employees').then(r => r.json().catch(() => [])),
        fetch('/api/contacts').then(r => r.json().catch(() => []))
      ]);
      setProjects(Array.isArray(resProj) ? resProj : []);
      setDashboardStats(resDash || {});
      setEmployees(Array.isArray(resEmp) ? resEmp : []);
      setContacts(Array.isArray(resContact) ? resContact : []);
    } catch (err) {
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch specific details when activeProject changes
  const fetchProjectDetails = async (projId: number) => {
    try {
      const [resTasks, resTeam] = await Promise.all([
        fetch(`/api/projects/${projId}/tasks`).then(r => r.json().catch(() => [])),
        fetch(`/api/projects/${projId}/team`).then(r => r.json().catch(() => []))
      ]);
      setProjectTasks(resTasks);
      setProjectTeam(resTeam);
    } catch (err) {
      console.error('Error fetching project details:', err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchProjectDetails(activeProject.id);
    }
  }, [activeProject]);

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.code) {
      setErrorMsg('يرجى ملء الحقول الإجبارية (اسم المشروع والكود).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في إنشاء المشروع.');
      }

      setSuccessMsg('✅ تم إنشاء المشروع بنجاح!');
      setShowProjectModal(false);
      setProjectForm({
        name: '',
        code: '',
        description: '',
        client_id: '',
        project_manager_id: '',
        department_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: '',
        priority: 'medium',
        status: 'planning'
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !activeProject) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${activeProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm)
      });

      if (!res.ok) throw new Error('فشل في إضافة المهمة.');

      setSuccessMsg('✅ تم إضافة المهمة بنجاح!');
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        assigned_to: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        estimated_hours: '',
        priority: 'medium'
      });
      fetchProjectDetails(activeProject.id);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Team Member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.employee_id || !activeProject) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${activeProject.id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل في إضافة العضو لفريق العمل.');
      }

      setSuccessMsg('✅ تم إضافة الموظف لفريق المشروع!');
      setShowTeamModal(false);
      setTeamForm({ employee_id: '', role: 'member' });
      fetchProjectDetails(activeProject.id);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Task Status Change
  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSuccessMsg('🔄 تم تحديث حالة المهمة بنجاح.');
        if (activeProject) {
          fetchProjectDetails(activeProject.id);
          // Update the local list to keep the UI perfectly synced
          const updatedProj = await fetch(`/api/projects`).then(r => r.json());
          setProjects(updatedProj);
          const current = updatedProj.find((p: any) => p.id === activeProject.id);
          if (current) setActiveProject(current);
        }
        setTimeout(() => setSuccessMsg(''), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Drag End in Kanban Board
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    await handleUpdateTaskStatus(Number(draggableId), newStatus);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Dynamic Success Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2 animate-bounce">
          <span>✨</span> {successMsg}
        </div>
      )}

      {/* Dynamic Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Check if deep view is active */}
      {!activeProject ? (
        <>
          {/* Main header block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700/80 shadow-sm">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                📂 منظومة إدارة المشاريع والمهام (PM)
              </h2>
              <p className="text-xs text-slate-400 mt-1">تخطيط مبادرات الشركة، توزيع المهام على الموظفين، متابعة وتوثيق نسب الإنجاز والميزانيات فورياً.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a 
                href="/api/projects/export/pdf" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs p-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>📄</span> تصدير PDF
              </a>
              <a 
                href="/api/projects/export/excel" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs p-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>📊</span> تصدير Excel
              </a>
              {userRole !== 'viewer' && (
                <button 
                  onClick={() => setShowProjectModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  <Plus size={16} />
                  تأسيس مشروع جديد
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm text-center">
              <span className="text-2xl font-black text-white block">
                {dashboardStats.total_projects || 0}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">إجمالي المشاريع</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm text-center">
              <span className="text-2xl font-black text-emerald-400 block">
                {dashboardStats.active_projects || 0}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">🟢 مشاريع نشطة</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm text-center">
              <span className="text-2xl font-black text-indigo-400 block">
                {dashboardStats.completed_projects || 0}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">✅ مشاريع مكتملة</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm text-center">
              <span className="text-2xl font-black text-amber-400 block">
                {dashboardStats.on_hold_projects || 0}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">⏸️ قيد التعليق</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm text-center col-span-2 md:col-span-1">
              <span className="text-lg font-black text-white block">
                {Number(dashboardStats.total_budget || 0).toLocaleString()} ج.م
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">💰 الميزانية الكلية</span>
            </div>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full bg-slate-800 rounded-2xl p-12 text-center border border-slate-700/80 text-slate-400 text-xs">
                📭 لا توجد مشاريع مسجلة في النظام بعد. ابدأ بإنشاء أول مشروع للشركة!
              </div>
            ) : (
              projects.map((p) => {
                const progress = p.progress_percent || 0;
                let statusColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
                let statusLabel = 'تخطيط';
                
                if (p.status === 'active') {
                  statusColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
                  statusLabel = 'نشط';
                } else if (p.status === 'completed') {
                  statusColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
                  statusLabel = 'مكتمل';
                } else if (p.status === 'on_hold') {
                  statusColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
                  statusLabel = 'معلق';
                } else if (p.status === 'cancelled') {
                  statusColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
                  statusLabel = 'ملغي';
                }

                let priorityLabel = 'متوسطة';
                let priorityColor = 'text-slate-400';
                if (p.priority === 'high') {
                  priorityLabel = 'عالية';
                  priorityColor = 'text-orange-400 font-bold';
                } else if (p.priority === 'critical') {
                  priorityLabel = 'حرجة جداً';
                  priorityColor = 'text-red-400 font-black';
                } else if (p.priority === 'low') {
                  priorityLabel = 'منخفضة';
                  priorityColor = 'text-slate-400';
                }

                return (
                  <div key={p.id} className="bg-slate-800 rounded-2xl border border-slate-700/80 shadow-sm p-5 hover:border-slate-600 transition-all flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-300 font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700/50">{p.code}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm mt-3">{p.name}</h3>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">{p.description || "بدون وصف إضافي"}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 border-t border-slate-700/50 pt-3">
                        <div><b>العميل:</b> {p.client_name || "عام / داخلي"}</div>
                        <div><b>المدير:</b> {p.manager_name || "غير محدد"}</div>
                        <div><b>الأولوية:</b> <span className={priorityColor}>{priorityLabel}</span></div>
                        <div><b>الميزانية:</b> {Number(p.budget || 0).toLocaleString()} ج.م</div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3">
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-300">
                          <span>نسبة الإنجاز</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>📅 {p.start_date || "-"}</span>
                        <span>{p.team_size || 0} موظفين في الفريق</span>
                      </div>

                      <button
                        onClick={() => setActiveProject(p)}
                        className="w-full text-center py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-black text-xs rounded-xl border border-indigo-500/30 transition-all cursor-pointer"
                      >
                        📊 استعراض لوحة المهام والفريق
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Detailed single project view */
        <div className="space-y-6">
          {/* Back button header */}
          <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700/80 shadow-sm">
            <button
              onClick={() => {
                setActiveProject(null);
                fetchData();
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
            >
              <ArrowLeft size={16} />
              الرجوع لكافة المشاريع
            </button>
            <div className="text-left">
              <span className="font-mono text-[10px] bg-slate-900 text-slate-300 font-bold p-1 px-2.5 rounded-lg border border-slate-700/50">{activeProject.code}</span>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700/80 p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h2 className="text-base font-black text-white">{activeProject.name}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{activeProject.description || "لا يوجد وصف إضافي متوفر للمشروع."}</p>
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <div><b>العميل:</b> {activeProject.client_name || "عام / داخلي"}</div>
              <div><b>مدير المشروع:</b> {activeProject.manager_name || "غير محدد"}</div>
              <div><b>الميزانية المعتمدة:</b> {Number(activeProject.budget || 0).toLocaleString()} ج.م</div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-300">
                  <span>نسبة تقدم المشروع الإجمالية</span>
                  <span>{activeProject.progress_percent || 0}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${activeProject.progress_percent || 0}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>البدء: {activeProject.start_date || "-"}</span>
                <span>النهاية: {activeProject.end_date || "مفتوح"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Tasks Board */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-2xl border border-slate-700/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <CheckSquare size={16} className="text-indigo-400" />
                      إدارة وتتبع المهام والتنفيذ ({projectTasks.length})
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">جدول المهام المسندة لموظفي الفريق ومتابعة الحالات.</p>
                  </div>
                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="p-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      ➕ إسناد مهمة جديدة
                    </button>
                  )}
                </div>

                {/* View Tabs */}
                <div className="flex border-b border-slate-700/80 pb-1 gap-4">
                  <button
                    onClick={() => setTaskViewTab('table')}
                    className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                      taskViewTab === 'table' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📋 جدول المهام
                  </button>
                  <button
                    onClick={() => setTaskViewTab('kanban')}
                    className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                      taskViewTab === 'kanban' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🗂️ لوحة كانبان
                  </button>
                  <button
                    onClick={() => setTaskViewTab('gantt')}
                    className={`pb-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                      taskViewTab === 'gantt' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📅 مخطط غانت (Gantt)
                  </button>
                </div>

                {/* Table View */}
                {taskViewTab === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900/80 text-slate-300">
                        <tr>
                          <th className="py-2.5 px-3">المهمة</th>
                          <th className="py-2.5 px-3">المسؤول</th>
                          <th className="py-2.5 px-3">تاريخ الاستحقاق</th>
                          <th className="py-2.5 px-3 text-center">الأولوية</th>
                          <th className="py-2.5 px-3 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-[11px]">
                        {projectTasks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">لا توجد مهام مسندة للمشروع حتى الآن.</td>
                          </tr>
                        ) : (
                          projectTasks.map((task) => {
                            const assignedEmp = employees.find(e => Number(e.id) === Number(task.assigned_to));
                            return (
                              <tr key={task.id} className="hover:bg-slate-700/30">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-white">{task.title}</div>
                                  {task.description && <div className="text-[9px] text-slate-400 mt-0.5">{task.description}</div>}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-300">
                                  {assignedEmp?.name || "غير مسند"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                                  {task.due_date || "-"}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    task.priority === 'low' ? 'bg-slate-700 text-slate-300' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {task.priority === 'critical' ? 'حرجة' :
                                     task.priority === 'high' ? 'عالية' :
                                     task.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                    disabled={userRole === 'viewer'}
                                    className="p-1 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-200 font-bold focus:outline-none"
                                  >
                                    <option value="pending">⏳ قيد الانتظار</option>
                                    <option value="in_progress">⚙️ قيد التنفيذ</option>
                                    <option value="review">🔍 تحت المراجعة</option>
                                    <option value="completed">✅ مكتملة</option>
                                    <option value="blocked">❌ معطلة</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Kanban View */}
                {taskViewTab === 'kanban' && (
                  <DragDropContextComponent onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 overflow-x-auto min-w-[700px]">
                      {[
                        { id: 'pending', title: '⏳ قيد الانتظار', color: 'bg-slate-900/60 border-slate-700 text-slate-300' },
                        { id: 'in_progress', title: '⚙️ قيد التنفيذ', color: 'bg-blue-950/40 border-blue-800/50 text-blue-300' },
                        { id: 'review', title: '🔍 تحت المراجعة', color: 'bg-amber-950/40 border-amber-800/50 text-amber-300' },
                        { id: 'completed', title: '✅ مكتملة', color: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' },
                        { id: 'blocked', title: '❌ معطلة', color: 'bg-rose-950/40 border-rose-800/50 text-rose-300' }
                      ].map(column => {
                        const columnTasks = projectTasks.filter(t => t.status === column.id);
                        return (
                          <DroppableComponent key={column.id} droppableId={column.id}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-3 rounded-xl border ${column.color} flex flex-col min-h-[350px]`}
                              >
                                <div className="font-bold text-xs mb-3 flex items-center justify-between border-b pb-1.5 border-current/10">
                                  <span>{column.title}</span>
                                  <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">{columnTasks.length}</span>
                                </div>
                                <div className="space-y-2 flex-1">
                                  {columnTasks.map((task, index) => {
                                    const assignedEmp = employees.find(e => Number(e.id) === Number(task.assigned_to));
                                    return (
                                      <DraggableComponent key={String(task.id)} draggableId={String(task.id)} index={index}>
                                        {(provided: any, snapshot: any) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 space-y-2 text-right transition-all hover:border-slate-600 ${
                                              snapshot.isDragging ? 'ring-2 ring-indigo-500 scale-95' : ''
                                            }`}
                                          >
                                            <div className="font-black text-xs text-white">{task.title}</div>
                                            {task.description && (
                                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
                                            )}
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[9px] text-slate-400">
                                              <span className="font-semibold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                                {assignedEmp ? (assignedEmp.name || assignedEmp.full_name) : 'غير مسند'}
                                              </span>
                                              <span className="font-mono text-[8px]">{task.due_date || '-'}</span>
                                            </div>
                                          </div>
                                        )}
                                      </DraggableComponent>
                                    );
                                  })}
                                  {provided.placeholder}
                                  {columnTasks.length === 0 && (
                                    <div className="text-center text-[10px] text-slate-500 py-10">اسحب المهمة هنا</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </DroppableComponent>
                        );
                      })}
                    </div>
                  </DragDropContextComponent>
                )}

                {/* Gantt View */}
                {taskViewTab === 'gantt' && (() => {
                  const dates = projectTasks
                    .flatMap(t => [t.start_date, t.due_date])
                    .filter(Boolean)
                    .map(d => new Date(d));

                  if (projectTasks.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400">لا توجد مهام متاحة لعرض مخطط غانت.</div>
                    );
                  }

                  const today = new Date();
                  let minDate = new Date();
                  let maxDate = new Date();

                  if (dates.length > 0) {
                    minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                    maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                  }
                  
                  // Padding
                  minDate.setDate(minDate.getDate() - 2);
                  maxDate.setDate(maxDate.getDate() + 3);

                  const totalMs = maxDate.getTime() - minDate.getTime();

                  // Generate timeline headers
                  const ticks = [];
                  const tickCount = 6;
                  for (let i = 0; i < tickCount; i++) {
                    const tickDate = new Date(minDate.getTime() + (totalMs / (tickCount - 1)) * i);
                    ticks.push(tickDate);
                  }

                  return (
                    <div className="space-y-4 pt-2 overflow-x-auto">
                      <div className="min-w-[650px] border border-slate-700/80 rounded-xl overflow-hidden bg-slate-900/50">
                        {/* Timeline Header Row */}
                        <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-700/80 text-[10px] font-bold text-slate-300 py-2.5">
                          <div className="col-span-4 px-3 text-right">المهمة والمنفذ</div>
                          <div className="col-span-8 relative px-2">
                            <div className="absolute inset-0 flex justify-between pr-2 pl-2">
                              {ticks.map((tick, i) => (
                                <span key={i} className="font-mono text-[9px] text-slate-400">{tick.toISOString().split('T')[0].substring(5)}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Task Rows */}
                        <div className="divide-y divide-slate-700/50 bg-slate-800">
                          {projectTasks.map(task => {
                            const start = task.start_date ? new Date(task.start_date) : minDate;
                            const end = task.due_date ? new Date(task.due_date) : (task.start_date ? new Date(task.start_date) : maxDate);
                            
                            // Clamp values
                            const leftPercent = Math.max(0, Math.min(100, ((start.getTime() - minDate.getTime()) / totalMs) * 100));
                            const widthPercent = Math.max(3, Math.min(100 - leftPercent, ((end.getTime() - start.getTime()) / totalMs) * 100));

                            const assignedEmp = employees.find(e => Number(e.id) === Number(task.assigned_to));

                            const statusColors: any = {
                              completed: 'bg-emerald-500',
                              in_progress: 'bg-blue-500',
                              review: 'bg-amber-500',
                              blocked: 'bg-rose-500',
                              pending: 'bg-slate-500'
                            };

                            return (
                              <div key={task.id} className="grid grid-cols-12 items-center py-3 hover:bg-slate-700/30">
                                <div className="col-span-4 px-3 text-right">
                                  <div className="font-black text-xs text-white truncate">{task.title}</div>
                                  <div className="text-[9px] text-slate-400 truncate mt-0.5">👤 {assignedEmp?.name || 'غير مسند'}</div>
                                </div>
                                <div className="col-span-8 relative h-6">
                                  {/* Grid Lines helper */}
                                  <div className="absolute inset-y-0 left-0 right-0 flex justify-between px-2 pointer-events-none">
                                    {ticks.map((_, i) => (
                                      <div key={i} className="w-[1px] h-full bg-slate-700/30"></div>
                                    ))}
                                  </div>
                                  
                                  {/* Bar */}
                                  <div 
                                    className={`absolute h-4 top-1 rounded-full ${statusColors[task.status] || 'bg-indigo-500'} opacity-90 text-white text-[8px] font-bold flex items-center justify-center px-2 shadow-sm transition-all truncate hover:opacity-100 cursor-pointer`}
                                    style={{ right: `${100 - (leftPercent + widthPercent)}%`, width: `${widthPercent}%` }}
                                    title={`${task.title} (${task.start_date || '?'} إلى ${task.due_date || '?'})`}
                                  >
                                    <span className="truncate pr-1 pl-1">
                                      {task.status === 'completed' ? '✅ ' : ''}
                                      {task.due_date ? task.due_date.substring(5) : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold text-slate-400 pt-2">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> قيد الانتظار</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> قيد التنفيذ</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> تحت المراجعة</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> مكتملة</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> معطلة</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Col: Team Members */}
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl border border-slate-700/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-400" />
                      فريق العمل المشارك ({projectTeam.length})
                    </h3>
                  </div>
                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => setShowTeamModal(true)}
                      className="p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-[10px] rounded-lg border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      ➕ ضم موظف
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {projectTeam.length === 0 ? (
                    <p className="text-slate-400 text-[10px] text-center py-4">لا يوجد موظفون مضافون لفريق العمل بعد.</p>
                  ) : (
                    projectTeam.map((member) => {
                      const emp = employees.find(e => Number(e.id) === Number(member.employee_id));
                      return (
                        <div key={member.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                              {emp?.name?.charAt(0) || "م"}
                            </div>
                            <div>
                              <div className="font-bold text-white text-[11px]">{emp?.name || "موظف"}</div>
                              <div className="text-[9px] text-slate-400">{emp?.position || "وظيفة إدارية"}</div>
                            </div>
                          </div>
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-black p-1 px-2.5 rounded-lg border border-indigo-500/30">
                            {member.role === 'member' ? 'عضو فريق' : member.role}
                          </span>
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

      {/* POPUP: Add Project */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/80 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">تأسيس مشروع كودي جديد</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">اسم المشروع *</label>
                  <input
                    type="text"
                    required
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    placeholder="مثال: تطوير نظام البوابة السحابية"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">كود المشروع الكودي *</label>
                  <input
                    type="text"
                    required
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({...projectForm, code: e.target.value})}
                    placeholder="PRJ-2026-001"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 font-mono text-left focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">العميل المقترن (دفتر العناوين)</label>
                <select
                  value={projectForm.client_id}
                  onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- اختر عميل من دفتر العناوين --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type === 'customer' ? 'عميل' : 'مورد'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">مدير المشروع المسؤول</label>
                  <select
                    value={projectForm.project_manager_id}
                    onChange={(e) => setProjectForm({...projectForm, project_manager_id: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- اختر مدير المشروع --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الميزانية التقديرية (ج.م)</label>
                  <input
                    type="number"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ البدء *</label>
                  <input
                    type="date"
                    required
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={projectForm.end_date}
                    onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">مستوى الأهمية / الأولوية</label>
                  <select
                    value={projectForm.priority}
                    onChange={(e) => setProjectForm({...projectForm, priority: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="critical">حرجة عاجلة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">حالة المشروع الافتتاحية</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="planning">تخطيط (Planning)</option>
                    <option value="active">نشط ومستمر (Active)</option>
                    <option value="on_hold">معلق (On Hold)</option>
                    <option value="completed">مكتمل تام (Completed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">وصف نطاق العمل والأهداف</label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  placeholder="وصف تفصيلي لأهداف المشروع ومخرجاته النهائية..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ وتأسيس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Add Task */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">إسناد مهمة جديدة لفريق التنفيذ</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleAddTask} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان المهمة *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  placeholder="مثال: تصميم نموذج واجهات التطبيق"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الموظف المسؤول *</label>
                <select
                  required
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- اختر الموظف المسؤول --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الساعات المقدرة</label>
                  <input
                    type="number"
                    value={taskForm.estimated_hours}
                    onChange={(e) => setTaskForm({...taskForm, estimated_hours: e.target.value})}
                    placeholder="مثال: 12"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">مستوى الأهمية</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">شرح موجز للمهمة والمخرجات</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  placeholder="ملاحظات وشروط قبول المهمة..."
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ وإسناد المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: Add Team Member */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/80 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/80 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">إضافة موظف لفريق المشروع</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleAddTeamMember} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">الموظف من الكادر الوظيفي *</label>
                <select
                  required
                  value={teamForm.employee_id}
                  onChange={(e) => setTeamForm({...teamForm, employee_id: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- اختر الموظف لضمه --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الدور الفني داخل المشروع *</label>
                <input
                  type="text"
                  required
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({...teamForm, role: e.target.value})}
                  placeholder="مثال: مطور رئيسي، مصمم واجهات، مهندس ميكانيكا"
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  إضافة للفريق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
