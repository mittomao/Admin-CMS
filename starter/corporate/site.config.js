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

  // Tên cơ sở dữ liệu MongoDB duy nhất của dự án (DEC-058)
  dbName: 'treecraft_corporate',

  // Ràng buộc phiên bản Core tương thích
  requiresCore: '>=1.0.0',

  // Tên bộ mẫu đã dùng để khởi tạo
  starter: 'corporate',

  // Phiên bản cấu hình Site
  siteApiVersion: '1.0.0',
};

