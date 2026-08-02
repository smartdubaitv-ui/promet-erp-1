import { Router } from 'express';
import {
  getProjects,
  getProjectDashboard,
  createProject,
  getProjectTasks,
  createProjectTask,
  getProjectTeam,
  addProjectTeamMember,
  updateTaskStatus,
  exportProjectsPdf,
  exportProjectsExcel
} from '../controllers/projects.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.get('/dashboard', getProjectDashboard);
router.post('/', createProject);

router.get('/export/pdf', exportProjectsPdf);
router.get('/export/excel', exportProjectsExcel);

router.get('/:id/tasks', getProjectTasks);
router.post('/:id/tasks', createProjectTask);

router.get('/:id/team', getProjectTeam);
router.post('/:id/team', addProjectTeamMember);

router.put('/tasks/:taskId/status', updateTaskStatus);

export default router;
