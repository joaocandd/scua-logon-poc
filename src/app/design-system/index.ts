// API pública do design system. As features importam daqui, não dos arquivos internos.
// Exceção: telas fora da casca (core/auth/) importam direto do arquivo do componente. Este índice
// também traz o Toast e o ConfirmDialog, e com eles uns 55 kB do CDK que o login não usa.
export { Button, type ButtonSize, type ButtonVariant } from './button/button';
export { ConfirmDialog, type ConfirmOptions } from './confirm-dialog/confirm-dialog';
export { EmptyState } from './empty-state/empty-state';
export { ErrorState } from './error-state/error-state';
export { Field, FieldControl } from './field/field';
export { Icon } from './icon/icon';
export { type IconName } from './icon/icons';
export { PageHeader } from './page-header/page-header';
export { STATUS_INFO, StatusBadge, type Status } from './status-badge/status-badge';
export { Toast, type ToastOptions } from './toast/toast';
export {
  WorkdayTimeline,
  type TimelineSegment,
  type TimelineSegmentKind,
} from './workday-timeline/workday-timeline';
