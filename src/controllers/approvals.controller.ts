import { Request, Response } from 'express';
import { ApprovalService } from '../services/approval.service';
import { logger } from '../config/logger';

/**
 * جلب جميع طلبات الاعتماد
 * GET /api/approvals
 */
export async function getApprovals(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const { status } = req.query;

  try {
    const list = await ApprovalService.getApprovals(
      tenantId,
      status as 'pending' | 'approved' | 'rejected'
    );
    return res.status(200).json(list);
  } catch (error: any) {
    logger.error('❌ Failed to fetch approvals:', error);
    return res.status(500).json({ error: 'فشل في تحميل طلبات الاعتماد' });
  }
}

/**
 * تقديم مستند للاعتماد
 * POST /api/approvals/submit
 */
export async function submitApproval(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const { recordType, recordId, recordIdentifier, requesterId, requesterName } = req.body;

  if (!recordType || !recordId || !requesterId || !requesterName) {
    return res.status(400).json({ error: 'الرجاء توفير جميع البيانات المطلوبة لطلب الاعتماد' });
  }

  try {
    const id = `appr-${Date.now()}`;
    const approval = await ApprovalService.createApproval({
      id,
      tenantId,
      recordType,
      recordId,
      recordIdentifier,
      requesterId,
      requesterName
    });
    return res.status(201).json(approval);
  } catch (error: any) {
    logger.error('❌ Failed to submit approval:', error);
    return res.status(500).json({ error: 'فشل في تقديم طلب الاعتماد' });
  }
}

/**
 * الموافقة على طلب
 * POST /api/approvals/:id/approve
 */
export async function approveRecord(req: Request, res: Response) {
  const { id } = req.params;
  const { approverId, approverName, comments } = req.body;

  if (!approverId || !approverName) {
    return res.status(400).json({ error: 'معلومات المعتمد مطلوبة' });
  }

  try {
    const result = await ApprovalService.approveRecord(id, approverId, approverName, comments);
    if (!result) {
      return res.status(404).json({ error: 'طلب الاعتماد غير موجود' });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('❌ Failed to approve record:', error);
    return res.status(500).json({ error: 'فشل في اعتماد الطلب' });
  }
}

/**
 * رفض طلب
 * POST /api/approvals/:id/reject
 */
export async function rejectRecord(req: Request, res: Response) {
  const { id } = req.params;
  const { approverId, approverName, comments } = req.body;

  if (!approverId || !approverName) {
    return res.status(400).json({ error: 'معلومات المعتمد مطلوبة' });
  }

  try {
    const result = await ApprovalService.rejectRecord(id, approverId, approverName, comments);
    if (!result) {
      return res.status(404).json({ error: 'طلب الاعتماد غير موجود' });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('❌ Failed to reject record:', error);
    return res.status(500).json({ error: 'فشل في رفض الطلب' });
  }
}
