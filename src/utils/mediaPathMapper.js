'use strict';

const branding = require('../config/branding');

const ROOT_MEDIA_PATH = branding.PATHS.MEDIA;
const LEGACY_ROOT_MEDIA_PATH = '/root/media library';
const DEFAULT_CLOUDINARY_ROOT = branding.CLOUDINARY_DEFAULT_ROOT || 'AdminCMS';

/**
 * Chuẩn hóa tên Item an toàn (không dấu, kebab-case, loại bỏ ký tự đặc biệt và đuôi mở rộng)
 * @param {string} name 
 * @returns {string}
 */
function sanitizeItemName(name) {
  if (!name || typeof name !== 'string') return 'unnamed';

  // 1. Loại bỏ extension nếu có trong chuỗi (ví dụ 'banner.jpg' -> 'banner')
  const withoutExt = name.replace(/\.[^/.]+$/, '').trim();

  // 2. Chuyển đổi tiếng Việt có dấu thành không dấu
  const nonAccent = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');

  // 3. Chuyển thành chữ thường, thay thế khoảng trắng và ký tự không hợp lệ bằng dấu gạch ngang
  const clean = nonAccent
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return clean || 'item';
}

/**
 * Chuẩn hóa đường dẫn thư mục (giữ các segment an toàn)
 * @param {string} folderPath 
 * @returns {string}
 */
function sanitizeFolderPath(folderPath) {
  if (!folderPath || typeof folderPath !== 'string') return '';
  return folderPath
    .split('/')
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0)
    .map((seg) => sanitizeItemName(seg))
    .filter(Boolean)
    .join('/');
}

/**
 * Chuyển đổi từ Item Path trên CMS sang Cloudinary public_id và asset_folder
 * @param {Object} params
 * @param {string} params.itemPath - Ví dụ '/root/media library/Banners/Hero/summer-sale'
 * @param {boolean} [params.isRaw=false] - True nếu là tệp raw (PDF, Zip...) cần đuôi trong public_id
 * @param {string} [params.ext=''] - Đuôi mở rộng nếu isRaw=true
 * @param {string} [params.rootFolder='AdminCMS'] - Thư mục gốc trên Cloudinary
 * @returns {{ assetFolder: string, publicId: string, itemName: string, itemPath: string }}
 */
function itemPathToCloudinary({ itemPath, isRaw = false, ext = '', rootFolder = DEFAULT_CLOUDINARY_ROOT }) {
  if (!itemPath || typeof itemPath !== 'string') {
    throw new Error('itemPath is required and must be a string.');
  }

  // Chuẩn hóa đường dẫn tương đối dưới /root/media library (chuẩn hóa đường dẫn media)
  let relativePath = itemPath.trim();
  if (relativePath.toLowerCase().startsWith(ROOT_MEDIA_PATH.toLowerCase())) {
    relativePath = relativePath.slice(ROOT_MEDIA_PATH.length);
  } else if (relativePath.toLowerCase().startsWith(LEGACY_ROOT_MEDIA_PATH)) {
    relativePath = relativePath.slice(LEGACY_ROOT_MEDIA_PATH.length);
  }
  relativePath = relativePath.replace(/^\/+|\/+$/g, '');

  if (!relativePath) {
    return {
      assetFolder: rootFolder,
      publicId: rootFolder,
      itemName: 'media-library',
      itemPath: ROOT_MEDIA_PATH
    };
  }

  const segments = relativePath.split('/');
  const rawItemName = segments.pop();
  const itemName = sanitizeItemName(rawItemName);
  const subFolders = segments.map((s) => sanitizeItemName(s)).filter(Boolean);

  const folderPath = subFolders.length > 0 ? `${rootFolder}/${subFolders.join('/')}` : rootFolder;
  const cleanExt = (ext || '').replace(/^\./, '').toLowerCase().trim();

  // Đối với image/video, Cloudinary public_id không kèm extension
  // Đối với raw file (PDF, Zip), Cloudinary public_id khuyến nghị kèm extension để URL giữ đúng tên
  const publicId = isRaw && cleanExt ? `${folderPath}/${itemName}.${cleanExt}` : `${folderPath}/${itemName}`;
  const canonicalItemPath = subFolders.length > 0
    ? `${ROOT_MEDIA_PATH}/${subFolders.join('/')}/${itemName}`
    : `${ROOT_MEDIA_PATH}/${itemName}`;

  return {
    assetFolder: folderPath,
    publicId,
    itemName,
    itemPath: canonicalItemPath
  };
}

/**
 * Chuyển đổi từ Cloudinary asset metadata sang CMS Item Path
 * @param {Object} params
 * @param {string} params.publicId - Ví dụ 'AdminCMS/Banners/Hero/summer-sale' hoặc 'summer-sale_uuid'
 * @param {string} [params.assetFolder] - Ví dụ 'AdminCMS/Banners/Hero'
 * @param {string} [params.format=''] - Ví dụ 'webp', 'jpg', 'pdf'
 * @param {string} [params.resourceType='image'] - 'image' | 'video' | 'raw'
 * @param {string} [params.rootFolder='AdminCMS'] - Thư mục gốc trên Cloudinary
 * @returns {{ itemPath: string, parentPath: string, itemName: string, extension: string }}
 */
function cloudinaryToItemPath({
  publicId,
  assetFolder = '',
  format = '',
  resourceType = 'image',
  rootFolder = DEFAULT_CLOUDINARY_ROOT
}) {
  if (!publicId || typeof publicId !== 'string') {
    throw new Error('publicId is required and must be a string.');
  }

  const cleanRoot = rootFolder.replace(/^\/+|\/+$/g, '');
  let resolvedFolder = (assetFolder || '').replace(/^\/+|\/+$/g, '');
  let rawBaseName = '';

  if (resolvedFolder) {
    // Nếu có asset_folder từ Dynamic Folder Mode
    if (resolvedFolder.toLowerCase().startsWith(cleanRoot.toLowerCase())) {
      resolvedFolder = resolvedFolder.slice(cleanRoot.length).replace(/^\/+|\/+$/g, '');
    }
    // Lấy tên file từ public_id (loại bỏ đường dẫn nếu publicId có chứa)
    rawBaseName = publicId.split('/').pop();
  } else {
    // Nếu publicId chứa toàn bộ đường dẫn: 'AdminCMS/Banners/Hero/summer-sale'
    let pathPart = publicId.replace(/^\/+|\/+$/g, '');
    if (pathPart.toLowerCase().startsWith(cleanRoot.toLowerCase())) {
      pathPart = pathPart.slice(cleanRoot.length).replace(/^\/+|\/+$/g, '');
    }
    const parts = pathPart.split('/');
    rawBaseName = parts.pop();
    resolvedFolder = parts.join('/');
  }

  // Tách extension nếu có trong rawBaseName (ví dụ 'doc.pdf' hoặc 'image.jpg')
  const extMatch = rawBaseName.match(/\.([a-zA-Z0-9]+)$/);
  const detectedExt = extMatch ? extMatch[1].toLowerCase() : (format || '').toLowerCase();
  const itemName = sanitizeItemName(rawBaseName);

  const subFolders = resolvedFolder
    .split('/')
    .map((s) => sanitizeItemName(s))
    .filter(Boolean);

  const parentPath = subFolders.length > 0
    ? `${ROOT_MEDIA_PATH}/${subFolders.join('/')}`
    : ROOT_MEDIA_PATH;

  const itemPath = `${parentPath}/${itemName}`;

  return {
    itemPath,
    parentPath,
    itemName,
    extension: detectedExt,
    resourceType
  };
}

module.exports = {
  ROOT_MEDIA_PATH,
  DEFAULT_CLOUDINARY_ROOT,
  sanitizeItemName,
  sanitizeFolderPath,
  itemPathToCloudinary,
  cloudinaryToItemPath
};
