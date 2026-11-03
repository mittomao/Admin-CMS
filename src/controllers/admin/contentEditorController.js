/**
 * Content Editor Controller (GĐ 0 Placeholder)
 * Note: Dynamic tree lazy-loading & item CRUD will be implemented in GĐ 2.
 */
const getContentEditor = (req, res) => {
  res.render('content-editor/index', {
    layout: 'layouts/shell',
    title: 'Content Editor - sitecore\\admin',
    activeApp: 'content-editor',
    topbarTheme: 'dark',
    user: {
      fullName: 'System Administrator',
      username: 'admin',
    },
  });
};

module.exports = {
  getContentEditor,
};
