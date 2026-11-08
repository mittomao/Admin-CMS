const LaunchpadApp = require('../../models/LaunchpadApp');
require('../../models/Role');
const logger = require('../../utils/logger');

// Icon fallback mapping helper to ensure 100% Tabler icon font usage
const mapToTablerIcon = (icon) => {
  if (!icon) return 'ti ti-apps';
  if (icon.startsWith('ti-') || icon.startsWith('ti ')) {
    return icon.startsWith('ti ti-') ? icon : `ti ${icon}`;
  }

  const emojiMap = {
    '📑': 'ti ti-article',
    '🖥️': 'ti ti-device-desktop',
    '🖼️': 'ti ti-photo',
    '📥': 'ti ti-inbox',
    '👥': 'ti ti-users',
    '🛡️': 'ti ti-shield-lock',
    '🔍': 'ti ti-lock-access',
    '⚙️': 'ti ti-settings',
    '🗑️': 'ti ti-trash',
    '📜': 'ti ti-history',
  };

  return emojiMap[icon] || 'ti ti-apps';
};

// Group metadata for 2-Tier Card Hierarchy (Icons & Semantic colors)
const groupMetaMap = {
  'Content Editing': {
    titleEn: 'Content Editing',
    icon: 'ti ti-article',
    colorClass: 'text-primary',
    subtitle: 'Quản lý cây nội dung, biên tập và cấu trúc trang web',
  },
  'Access Management': {
    titleEn: 'Access Management',
    icon: 'ti ti-shield-lock',
    colorClass: 'text-purple',
    subtitle: 'Quản lý tài khoản, vai trò và bảng phân quyền truy cập',
  },
  'Control Panel & Maintenance': {
    titleEn: 'Control Panel & Tools',
    icon: 'ti ti-settings',
    colorClass: 'text-danger',
    subtitle: 'Cấu hình hệ thống, dọn dẹp thùng rác và nhật ký kiểm toán',
  },
};

const defaultFallbackApps = [
  {
    name: 'Content Editor',
    description: 'Manage hierarchical content tree and item fields',
    icon: 'ti ti-article',
    iconBg: 'blue',
    group: 'Content Editing',
    url: '/admin/content-editor',
  },
  {
    name: 'Experience Editor',
    description: 'WYSIWYG live page layout editing',
    icon: 'ti ti-device-desktop',
    iconBg: 'indigo',
    group: 'Content Editing',
    url: '#',
    isStub: true,
  },
  {
    name: 'Media Library',
    description: 'Upload, organize and manage digital assets',
    icon: 'ti ti-photo',
    iconBg: 'green',
    group: 'Content Editing',
    url: '/admin/media-library',
    isStub: false,
  },
  {
    name: 'Workbox',
    description: 'Review and approve workflow items',
    icon: 'ti ti-inbox',
    iconBg: 'amber',
    group: 'Content Editing',
    url: '/admin/workbox',
    isStub: false,
  },
  {
    name: 'User Manager',
    description: 'Create and manage administrator and editor accounts',
    icon: 'ti ti-users',
    iconBg: 'purple',
    group: 'Access Management',
    url: '/admin/security/users',
    isStub: false,
  },
  {
    name: 'Role Manager',
    description: 'Define user roles and group permissions',
    icon: 'ti ti-shield-lock',
    iconBg: 'purple',
    group: 'Access Management',
    url: '/admin/security/roles',
    isStub: false,
  },
  {
    name: 'Security Editor',
    description: 'Assign item-level access rights and permissions',
    icon: 'ti ti-lock',
    iconBg: 'purple',
    group: 'Access Management',
    url: '/admin/security/security-editor',
    isStub: false,
  },
  {
    name: 'Access Viewer',
    description: 'Inspect item-level security and permission inheritance',
    icon: 'ti ti-lock-access',
    iconBg: 'purple',
    group: 'Access Management',
    url: '/admin/security/access-viewer',
    isStub: false,
  },
  {
    name: 'Databases',
    description: 'Overview and reconciliation between Master and Web databases',
    icon: 'ti ti-database',
    iconBg: 'cyan',
    group: 'Control Panel & Maintenance',
    url: '/admin/databases',
    isStub: false,
  },
  {
    name: 'Control Panel',
    description: 'Configure database, rebuild indexes, and system settings',
    icon: 'ti ti-settings',
    iconBg: 'rose',
    group: 'Control Panel & Maintenance',
    url: '#',
    isStub: true,
  },
  {
    name: 'Recycle Bin',
    description: 'Restore or permanently delete removed items',
    icon: 'ti ti-trash',
    iconBg: 'rose',
    group: 'Control Panel & Maintenance',
    url: '#',
    isStub: true,
  },
  {
    name: 'Audit Log',
    description: 'Track author actions, publish history, and changes',
    icon: 'ti ti-history',
    iconBg: 'amber',
    group: 'Control Panel & Maintenance',
    url: '#',
    isStub: true,
  },
];

const getLaunchpad = async (req, res) => {
  try {
    const user = req.user || req.session.user;
    const userRoleIds = (user && user.roles) ? user.roles.map((r) => r.id || r._id ? (r.id || r._id).toString() : r.toString()) : [];
    const isAdmin = user && (user.isAdmin || (user.roleNames && user.roleNames.some((r) => r.toLowerCase() === 'administrator')));

    let apps = [];
    try {
      apps = await LaunchpadApp.find({ isEnabled: true })
        .populate('allowedRoles')
        .sort({ sortOrder: 1 });
    } catch (dbErr) {
      logger.warn(`Could not fetch Launchpad apps from DB (${dbErr.message}), using fallback apps.`);
    }

    if (!apps || apps.length === 0) {
      apps = defaultFallbackApps;
    }

    // Role-based filtering
    const visibleApps = apps.filter((app) => {
      if (isAdmin) return true;
      if (!app.allowedRoles || app.allowedRoles.length === 0) return true;
      return app.allowedRoles.some((role) => userRoleIds.includes((role._id || role).toString()));
    });

    // Normalize icons to Tabler class and resolve operational apps
    const normalizedApps = visibleApps.map((app) => {
      let resolvedUrl = app.url;
      let resolvedStub = Boolean(app.isStub);

      if (app.name === 'Media Library') {
        resolvedUrl = '/admin/media-library';
        resolvedStub = false;
      } else if (app.name === 'Workbox') {
        resolvedUrl = '/admin/workbox';
        resolvedStub = false;
      } else if (app.name === 'Databases') {
        resolvedUrl = '/admin/databases';
        resolvedStub = false;
      } else if (app.name === 'User Manager') {
        resolvedUrl = '/admin/security/users';
        resolvedStub = false;
      } else if (app.name === 'Role Manager') {
        resolvedUrl = '/admin/security/roles';
        resolvedStub = false;
      } else if (app.name === 'Security Editor') {
        resolvedUrl = '/admin/security/security-editor';
        resolvedStub = false;
      } else if (app.name === 'Access Viewer') {
        resolvedUrl = '/admin/security/access-viewer';
        resolvedStub = false;
      }

      return {
        name: app.name,
        description: app.description,
        icon: mapToTablerIcon(app.icon),
        iconBg: app.iconBg || 'blue',
        group: app.group || 'Content Editing',
        url: resolvedUrl,
        isStub: resolvedStub,
      };
    });

    // Group apps by category
    const groupedApps = normalizedApps.reduce((acc, app) => {
      const groupName = app.group || 'Applications';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(app);
      return acc;
    }, {});

    res.render('admin/launchpad/index', {
      layout: 'layouts/shell',
      title: 'Sitecore Launchpad',
      activeApp: 'launchpad',
      topbarTheme: 'navy',
      groupedApps,
      groupMetaMap,
      user,
    });
  } catch (error) {
    logger.error(`Error rendering Launchpad: ${error.message}`);
    res.status(500).render('errors/500', {
      title: 'Launchpad Error',
      statusCode: 500,
      message: 'Failed to load Launchpad tiles.',
      currentPath: req.originalUrl,
      activeApp: 'launchpad',
    });
  }
};

module.exports = {
  getLaunchpad,
};
