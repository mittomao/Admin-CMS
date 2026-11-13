/**
 * Cấu hình Dự án Site (DEC-056)
 * Starter: Corporate
 */

module.exports = {
  // Tên hiển thị của website dự án
  projectName: 'Corporate Starter Site',

  // Tên node gốc trong cây phân cấp CMS (mặc định: 'root')
  rootName: 'root',

  // Ngôn ngữ mặc định và danh sách ngôn ngữ kích hoạt
  defaultLanguage: 'vi',
  languages: ['vi', 'en'],

  // Thư mục lưu trữ media trên Cloudinary theo từng môi trường
  cloudinaryRootFolder: {
    development: 'corporate_dev',
    staging: 'corporate_staging',
    production: 'corporate_prod',
  },

  // Tên database MongoDB (Master & Web) theo chuẩn DEC-052
  mongoDbMaster: {
    development: 'treecraft_corporate_master',
    staging: 'treecraft_corporate_staging',
    production: 'treecraft_corporate_prod_master',
  },
  mongoDbWeb: {
    development: 'treecraft_corporate_web',
    staging: 'treecraft_corporate_staging_web',
    production: 'treecraft_corporate_prod_web',
  },

  // Ràng buộc phiên bản Core tương thích
  requiresCore: '>=1.0.0',

  // Tên bộ mẫu đã dùng để khởi tạo
  starter: 'corporate',

  // Phiên bản cấu hình Site
  siteApiVersion: '1.0.0',
};

