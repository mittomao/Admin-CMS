/**
 * Data-driven Ribbon Configuration for Content Editor
 * Supports Sitecore tabs & groups hierarchy.
 */
const ribbonConfig = {
  activeTab: 'home',
  tabs: [
    {
      id: 'home',
      title: 'Home',
      isActive: true,
      isDisabled: false,
      groups: [
        {
          id: 'write',
          title: 'Write',
          actions: [
            {
              id: 'btn-save',
              title: 'Save',
              icon: 'ti ti-device-floppy',
              size: 'large',
              tooltip: 'Save item fields (Ctrl+S)',
              action: 'save',
            },
            {
              id: 'btn-refresh',
              title: 'Refresh',
              icon: 'ti ti-refresh',
              size: 'small',
              tooltip: 'Reload current item',
              action: 'refresh',
            },
          ],
        },
        {
          id: 'insert',
          title: 'Insert',
          actions: [
            {
              id: 'btn-insert-template',
              title: 'Insert from template',
              icon: 'ti ti-file-plus',
              size: 'large',
              tooltip: 'Create new child item under current node',
              action: 'insert-modal',
            },
          ],
        },
        {
          id: 'operations',
          title: 'Operations',
          actions: [
            {
              id: 'btn-duplicate',
              title: 'Duplicate',
              icon: 'ti ti-copy',
              size: 'small',
              tooltip: 'Duplicate this item and its subitems',
              action: 'duplicate',
            },
            {
              id: 'btn-copy-to',
              title: 'Copy To',
              icon: 'ti ti-clipboard-copy',
              size: 'small',
              tooltip: 'Copy this item to another parent',
              action: 'copy-modal',
            },
            {
              id: 'btn-move-to',
              title: 'Move To',
              icon: 'ti ti-arrows-move',
              size: 'small',
              tooltip: 'Move this item to another parent node',
              action: 'move-modal',
            },
            {
              id: 'btn-delete',
              title: 'Delete',
              icon: 'ti ti-trash',
              size: 'large',
              isDestructive: true,
              tooltip: 'Soft delete this item',
              action: 'delete-modal',
            },
          ],
        },
        {
          id: 'rename',
          title: 'Rename',
          actions: [
            {
              id: 'btn-rename',
              title: 'Rename',
              icon: 'ti ti-cursor-text',
              size: 'large',
              tooltip: 'Change technical name and display name',
              action: 'rename-modal',
            },
          ],
        },
        {
          id: 'sorting',
          title: 'Sorting',
          actions: [
            {
              id: 'btn-sort-up',
              title: 'Up',
              icon: 'ti ti-arrow-up',
              size: 'small',
              tooltip: 'Move item up within siblings',
              action: 'sort-up',
            },
            {
              id: 'btn-sort-down',
              title: 'Down',
              icon: 'ti ti-arrow-down',
              size: 'small',
              tooltip: 'Move item down within siblings',
              action: 'sort-down',
            },
            {
              id: 'btn-sort-first',
              title: 'First',
              icon: 'ti ti-arrow-bar-to-up',
              size: 'small',
              tooltip: 'Move item to first position',
              action: 'sort-first',
            },
            {
              id: 'btn-sort-last',
              title: 'Last',
              icon: 'ti ti-arrow-bar-to-down',
              size: 'small',
              tooltip: 'Move item to last position',
              action: 'sort-last',
            },
          ],
        },
      ],
    },
    {
      id: 'navigate',
      title: 'Navigate',
      isActive: false,
      isDisabled: true,
      phaseNotice: 'Will be enabled in GĐ 10 (Full-Text Search & Tree Quick Navigation)',
      groups: [],
    },
    {
      id: 'review',
      title: 'Review',
      isActive: false,
      isDisabled: true,
      phaseNotice: 'Review tab remains disabled per Phase 8 design. Use the Workflow tab for approval actions.',
      groups: [],
    },
    {
      id: 'workflow',
      title: 'Workflow',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'workflow-actions',
          title: 'Approval & State',
          actions: [
            {
              id: 'btn-workflow-execute',
              title: 'Lệnh duyệt...',
              icon: 'ti ti-send',
              size: 'large',
              tooltip: 'Thực thi lệnh chuyển bước quy trình (Submit, Approve, Reject...)',
              action: 'workflow:execute-command',
            },
            {
              id: 'btn-workflow-history',
              title: 'History',
              icon: 'ti ti-history',
              size: 'large',
              tooltip: 'Xem lịch sử chuyển bước và nhận xét duyệt của item',
              action: 'workflow:view-history',
            },
            {
              id: 'btn-open-workbox',
              title: 'Open Workbox',
              icon: 'ti ti-checkbox',
              size: 'small',
              tooltip: 'Mở ứng dụng Workbox để quản lý duyệt hàng loạt',
              action: 'workflow:open-workbox',
            },
          ],
        },
      ],
    },
    {
      id: 'publish',
      title: 'Publish',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'publish-actions',
          title: 'Publishing',
          actions: [
            {
              id: 'btn-publish-item',
              title: 'Publish Item',
              icon: 'ti ti-cloud-upload',
              size: 'large',
              tooltip: 'Xuất bản item này sang kho Web (kèm tùy chọn subitems & related)',
              action: 'publish:open-dialog',
            },
            {
              id: 'btn-unpublish-item',
              title: 'Unpublish',
              icon: 'ti ti-cloud-off',
              size: 'large',
              tooltip: 'Gỡ bỏ item này khỏi kho Web công khai',
              action: 'publish:unpublish-item',
            },
            {
              id: 'btn-publish-manager',
              title: 'Publish Manager',
              icon: 'ti ti-dashboard',
              size: 'small',
              tooltip: 'Mở trang quản lý tiến trình xuất bản toàn trang',
              action: 'publish:open-manager',
            },
          ],
        },
      ],
    },
    {
      id: 'versions',
      title: 'Versions',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'version-lifecycle',
          title: 'Lifecycle',
          actions: [
            {
              id: 'btn-add-version',
              title: 'Add Version',
              icon: 'ti ti-file-plus',
              size: 'large',
              tooltip: 'Tạo phiên bản mới cho ngôn ngữ hiện tại',
              action: 'add-version',
            },
            {
              id: 'btn-version-history',
              title: 'History',
              icon: 'ti ti-timeline',
              size: 'large',
              tooltip: 'Xem lịch sử các phiên bản của item',
              action: 'version-history-modal',
            },
            {
              id: 'btn-restore-version',
              title: 'Restore',
              icon: 'ti ti-history',
              size: 'small',
              tooltip: 'Khôi phục từ một phiên bản cũ (tạo version mới)',
              action: 'restore-version-modal',
            },
            {
              id: 'btn-delete-version',
              title: 'Remove',
              icon: 'ti ti-file-minus',
              size: 'small',
              isDestructive: true,
              tooltip: 'Xóa phiên bản đang chọn (chặn nếu là version cuối)',
              action: 'delete-version-modal',
            },
          ],
        },
        {
          id: 'version-compare',
          title: 'Compare',
          actions: [
            {
              id: 'btn-compare-versions',
              title: 'Compare',
              icon: 'ti ti-columns',
              size: 'large',
              tooltip: 'So sánh khác biệt giữa 2 phiên bản',
              action: 'compare-versions-modal',
            },
          ],
        },
        {
          id: 'version-languages',
          title: 'Languages',
          actions: [
            {
              id: 'btn-add-language',
              title: 'Add Language',
              icon: 'ti ti-world-plus',
              size: 'large',
              tooltip: 'Thêm bản dịch ngôn ngữ mới cho item',
              action: 'add-language-modal',
            },
          ],
        },
      ],
    },
    {
      id: 'configure',
      title: 'Configure',
      isActive: false,
      isDisabled: true,
      phaseNotice: 'Will be enabled in GĐ 3 (Template Manager & Insert Options)',
      groups: [],
    },
    {
      id: 'presentation',
      title: 'Presentation',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'layout-details',
          title: 'Layout',
          actions: [
            {
              id: 'btn-presentation-details',
              title: 'Details',
              icon: 'ti ti-layout-grid',
              size: 'large',
              action: 'presentation:details',
              tooltip: 'Mở cửa sổ quản trị Presentation Details (Bố cục, Renderings, Placeholders)',
            },
            {
              id: 'btn-presentation-reset',
              title: 'Reset',
              icon: 'ti ti-rotate-clockwise',
              size: 'small',
              action: 'presentation:reset',
              tooltip: 'Khôi phục bố cục về Standard Presentation của Template',
            },
          ],
        },
        {
          id: 'dev-preview',
          title: 'Developer',
          actions: [
            {
              id: 'btn-presentation-preview-json',
              title: 'Preview JSON',
              icon: 'ti ti-code',
              size: 'large',
              action: 'presentation:preview-json',
              tooltip: 'Xem cấu trúc JSON Presentation sau khi hợp nhất',
            },
          ],
        },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'manage-permissions',
          title: 'Permissions',
          actions: [
            {
              id: 'btn-security-editor',
              title: 'Security Editor',
              icon: 'ti ti-shield-lock',
              size: 'large',
              tooltip: 'Chỉnh sửa phân quyền chi tiết cho Item này (Item ACL Matrix)',
              action: 'security:editor',
            },
            {
              id: 'btn-access-viewer',
              title: 'Access Viewer',
              icon: 'ti ti-lock-access',
              size: 'large',
              tooltip: 'Xem quyền truy cập hiệu lực và lý do phân giải quyền',
              action: 'security:access-viewer',
            },
            {
              id: 'btn-security-assign',
              title: 'Assign',
              icon: 'ti ti-user-plus',
              size: 'small',
              tooltip: 'Gán quyền cho User hoặc Role trên mục này',
              action: 'security:assign',
            },
            {
              id: 'btn-security-reset',
              title: 'Reset',
              icon: 'ti ti-arrow-back-up',
              size: 'small',
              tooltip: 'Khôi phục toàn bộ quyền của mục này về kế thừa từ mục cha',
              action: 'security:reset',
            },
          ],
        },
        {
          id: 'security-tools',
          title: 'Security Tools',
          actions: [
            {
              id: 'btn-user-manager-nav',
              title: 'User Manager',
              icon: 'ti ti-users',
              size: 'large',
              tooltip: 'Mở Quản lý Người dùng (User Manager)',
              action: 'security:open-users',
            },
            {
              id: 'btn-role-manager-nav',
              title: 'Role Manager',
              icon: 'ti ti-shield',
              size: 'large',
              tooltip: 'Mở Quản lý Vai trò (Role Manager)',
              action: 'security:open-roles',
            },
          ],
        },
      ],
    },
    {
      id: 'view',
      title: 'View',
      isActive: false,
      isDisabled: false,
      groups: [
        {
          id: 'database-switch',
          title: 'Database',
          actions: [
            {
              id: 'btn-db-master',
              title: 'Master DB',
              icon: 'ti ti-database',
              size: 'large',
              tooltip: 'Chuyển sang soạn thảo trên Master Database (Đọc / Ghi)',
              action: 'switch-db-master',
            },
            {
              id: 'btn-db-web',
              title: 'Web DB',
              icon: 'ti ti-world-download',
              size: 'large',
              tooltip: 'Chuyển sang xem Web Database (Chỉ đọc)',
              action: 'switch-db-web',
            },
          ],
        },
        {
          id: 'tree-options',
          title: 'Tree Options',
          actions: [
            {
              id: 'btn-toggle-publish-badges',
              title: 'Publish Badges',
              icon: 'ti ti-badge',
              size: 'large',
              tooltip: 'Bật / tắt huy hiệu trạng thái xuất bản trên cây nội dung',
              action: 'toggle-publish-badges',
            },
          ],
        },
      ],
    },
  ],
};

module.exports = ribbonConfig;

