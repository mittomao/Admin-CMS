/**
 * Launchpad Controller (GĐ 0 Placeholder)
 * Note: Session authentication & role-based tile filtering will be activated in GĐ 1.
 */
const getLaunchpad = (req, res) => {
  res.render('launchpad/index', {
    layout: 'layouts/shell',
    title: 'Sitecore Launchpad',
    activeApp: 'launchpad',
    topbarTheme: 'navy',
    user: {
      fullName: 'System Administrator',
      username: 'admin',
    },
  });
};

module.exports = {
  getLaunchpad,
};

