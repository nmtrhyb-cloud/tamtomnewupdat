import { dbStorage } from '../db.js';
import { auditLogs } from '../../shared/schema.js';

export interface LogActivityParams {
  req: any;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
}

const ACTION_LABELS: Record<string, string> = {
  create_sub_admin: 'إضافة مشرف فرعي',
  update_sub_admin: 'تعديل مشرف فرعي',
  delete_sub_admin: 'حذف مشرف فرعي',
  create_driver: 'إضافة سائق',
  update_driver: 'تعديل سائق',
  delete_driver: 'حذف سائق',
  update_order_status: 'تغيير حالة طلب',
  assign_driver: 'تعيين سائق للطلب',
  update_menu_item: 'تعديل منتج',
  create_menu_item: 'إضافة منتج',
  delete_menu_item: 'حذف منتج',
  create_category: 'إضافة تصنيف',
  update_category: 'تعديل تصنيف',
  delete_category: 'حذف تصنيف',
  create_coupon: 'إضافة كوبون',
  update_coupon: 'تعديل كوبون',
  delete_coupon: 'حذف كوبون',
  update_setting: 'تعديل إعداد',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
};

export { ACTION_LABELS };

export async function logActivity({ req, action, entityType, entityId, oldData, newData }: LogActivityParams): Promise<void> {
  try {
    if (!req.admin?.id) return;
    await dbStorage.db.insert(auditLogs).values({
      adminId: req.admin.id,
      action,
      entityType,
      entityId,
      oldData: oldData !== undefined ? JSON.stringify(oldData) : null,
      newData: newData !== undefined ? JSON.stringify(newData) : null,
      ipAddress: (req.ip || req.socket?.remoteAddress || 'unknown').replace('::ffff:', ''),
    });
  } catch {
    // نسجّل بصمت — لا نُفشل الطلب الأصلي
  }
}
