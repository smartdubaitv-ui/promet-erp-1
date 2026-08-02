import { Request, Response } from 'express';
import { loadDatabase, saveDatabase } from '../data/jsonDatabase';

export const getProjects = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projects = db.projects || [];
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في جلب المشاريع' });
  }
};

export const getProjectDashboard = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projects = db.projects || [];
    const total_projects = projects.length;
    const active_projects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'active').length;
    const completed_projects = projects.filter((p: any) => p.status === 'completed').length;
    const on_hold_projects = projects.filter((p: any) => p.status === 'on_hold' || p.status === 'planning').length;
    const total_budget = projects.reduce((sum: number, p: any) => sum + Number(p.budget || 0), 0);

    res.json({
      total_projects,
      active_projects,
      completed_projects,
      on_hold_projects,
      total_budget
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في جلب إحصائيات المشاريع' });
  }
};

export const createProject = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const {
      name,
      code,
      description,
      client_id,
      project_manager_id,
      department_id,
      start_date,
      end_date,
      budget,
      priority,
      status
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'اسم المشروع والكود حقلان إجباريان.' });
    }

    if (!db.projects) {
      db.projects = [];
    }

    const newProject = {
      id: Date.now(),
      name,
      code,
      description: description || '',
      client_id: client_id || '',
      client_name: 'عميل عام',
      project_manager_id: project_manager_id || '',
      project_manager_name: 'مدير المشروع',
      department_id: department_id || '',
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || '',
      budget: Number(budget || 0),
      priority: priority || 'medium',
      status: status || 'planning',
      progress: 0,
      tenantId,
      createdAt: new Date().toISOString()
    };

    db.projects.push(newProject);
    saveDatabase(db);

    res.status(201).json({ success: true, project: newProject });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في إنشاء المشروع' });
  }
};

export const getProjectTasks = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projId = Number(req.params.id);
    const tasks = (db.project_tasks || []).filter((t: any) => Number(t.project_id) === projId);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في جلب مهام المشروع' });
  }
};

export const createProjectTask = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projId = Number(req.params.id);
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const { title, description, assigned_to, start_date, due_date, estimated_hours, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
    }

    if (!db.project_tasks) {
      db.project_tasks = [];
    }

    const newTask = {
      id: Date.now(),
      project_id: projId,
      title,
      description: description || '',
      assigned_to: assigned_to || '',
      status: 'pending',
      priority: priority || 'medium',
      start_date: start_date || new Date().toISOString().split('T')[0],
      due_date: due_date || '',
      estimated_hours: Number(estimated_hours || 0),
      tenantId
    };

    db.project_tasks.push(newTask);
    saveDatabase(db);

    res.status(201).json({ success: true, task: newTask });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في إضافة المهمة' });
  }
};

export const getProjectTeam = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projId = Number(req.params.id);
    const team = (db.project_team || []).filter((t: any) => Number(t.project_id) === projId);
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في جلب فريق العمل' });
  }
};

export const addProjectTeamMember = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const projId = Number(req.params.id);
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const { employee_id, role } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'معرف الموظف مطلوب' });
    }

    if (!db.project_team) {
      db.project_team = [];
    }

    const employees = db.employees || [];
    const emp = employees.find((e: any) => String(e.id) === String(employee_id));

    const newMember = {
      id: Date.now(),
      project_id: projId,
      employee_id,
      employee_name: emp ? (emp.name || emp.fullName) : 'موظف',
      role: role || 'member',
      tenantId
    };

    db.project_team.push(newMember);
    saveDatabase(db);

    res.status(201).json({ success: true, member: newMember });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في إضافة العضو' });
  }
};

export const updateTaskStatus = (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const taskId = Number(req.params.taskId);
    const { status } = req.body;

    if (!db.project_tasks) db.project_tasks = [];

    const task = db.project_tasks.find((t: any) => Number(t.id) === taskId);
    if (!task) {
      return res.status(404).json({ error: 'المهمة غير موجودة' });
    }

    task.status = status;
    saveDatabase(db);

    const projTasks = db.project_tasks.filter((t: any) => Number(t.project_id) === Number(task.project_id));
    const completedCount = projTasks.filter((t: any) => t.status === 'completed').length;
    const progress = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;

    const proj = (db.projects || []).find((p: any) => Number(p.id) === Number(task.project_id));
    if (proj) {
      proj.progress = progress;
      if (progress === 100) proj.status = 'completed';
      saveDatabase(db);
    }

    res.json({ success: true, task, progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل في تحديث حالة المهمة' });
  }
};

export const exportProjectsPdf = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=projects-report.pdf');
  res.send(Buffer.from('%PDF-1.4 Projects Report PDF Export'));
};

export const exportProjectsExcel = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=projects-report.xlsx');
  res.send(Buffer.from('PK... Projects Excel Export'));
};
