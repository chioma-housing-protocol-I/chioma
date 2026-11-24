/**
 * ConfirmDialog now lives alongside the other dialog variants (Modal,
 * AlertDialog, Drawer) in `./Dialog`. This module is kept so existing
 * `@/components/ui/ConfirmDialog` imports keep working.
 */
export { ConfirmDialog, type ConfirmDialogProps } from './Dialog';
