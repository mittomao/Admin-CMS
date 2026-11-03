# New Project Implementation Guide – Hướng Dẫn Tích Hợp Vào Dự Án Mới

Tài liệu này là cẩm nang hướng dẫn thực hành từng bước (Step-by-Step Implementation Recipe) dành cho AI Coding Agent hoặc kỹ sư phần mềm khi triển khai lại hai module **Media Library** và **Rich Text Editor** trên một repository mới.

Hướng dẫn này đã được lọc sạch toàn bộ các thành phần di sản (loại bỏ `@flmngr`, bỏ link demo, bỏ schema mồ côi) để mang lại một kiến trúc tinh gọn, hiện đại và sẵn sàng cho môi trường Production.

---

## 1. Cấu Trúc Thư Mục Đề Xuất Trong Dự Án Mới

```
your-new-project/
├── .env                              # Biến môi trường (Cloudinary credentials)
├── package.json
├── src/ (hoặc root)
│   ├── config/
│   │   └── cloudinary.js             # Khởi tạo SDK & Multer Storage
│   ├── controllers/
│   │   └── mediaController.js        # Controller độc lập cho Media APIs
│   ├── routes/
│   │   └── mediaRoutes.js            # Định nghĩa các route RESTful /api/media/*
│   ├── views/ (hoặc components)
│   │   └── partials/
│   │       ├── media-browser-core.ejs # Template giao diện SPA Media Library
│   │       └── media-picker-modal.ejs # Modal bọc chế độ chọn ảnh
│   └── public/
│       └── js/
│           ├── utils/
│           │   └── image-compressor.js # Nén ảnh client Canvas
│           ├── modules/
│           │   ├── media-browser.js   # Class điều khiển Media Library
│           │   └── editor.js          # Khởi tạo & tích hợp TinyMCE
│           └── app.js                 # Entrypoint
```

---

## 2. Bước 1: Cài Đặt Dependencies Cần Thiết

Chạy lệnh cài đặt các thư viện lõi trên máy chủ Node.js:
```bash
npm install cloudinary multer multer-storage-cloudinary
```
*(Nếu chưa có express và express-session, cài thêm: `npm install express express-session dotenv`)*

---

## 3. Bước 2: Thiết Lập Biến Môi Trường (`.env`)

Khai báo các thông số Cloudinary vào tệp `.env`:
```env
PORT=3000
SESSION_SECRET=a_very_secure_random_session_secret_key_12345

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_API_FOLDER=YourAppMedia
```

---

## 4. Bước 3: Triển Khai Backend Storage Service (`config/cloudinary.js`)

Tạo tệp cấu hình lưu trữ với đầy đủ cơ chế bảo vệ, nén và tự động fallback:

```javascript
'use strict';
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000
});

const DEFAULT_ROOT_FOLDER = (process.env.CLOUDINARY_API_FOLDER || 'YourAppMedia').replace(/^\/+|\/+$/g, '');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let targetFolder = req.body?.folder || req.query?.folder || DEFAULT_ROOT_FOLDER;
    targetFolder = targetFolder.replace(/^\/+|\/+$/g, '');
    
    if (!targetFolder.startsWith(DEFAULT_ROOT_FOLDER)) {
      targetFolder = `${DEFAULT_ROOT_FOLDER}/${targetFolder}`.replace(/\/+/g, '/');
    }

    const cleanName = (file.originalname || 'image')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Tạo public_id an toàn chống trùng lặp microsecond
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    return {
      folder: targetFolder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      transformation: [
        { width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ],
      public_id: `${uniqueSuffix}-${cleanName}`
    };
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận tệp hình ảnh (.jpg, .png, .webp, .gif, .svg)'), false);
    }
    cb(null, true);
  }
});

module.exports = {
  cloudinary,
  upload,
  DEFAULT_ROOT_FOLDER,
  getSubFolders: async (parentFolder) => {
    try {
      const target = parentFolder ? parentFolder.replace(/^\/+|\/+$/g, '') : DEFAULT_ROOT_FOLDER;
      const res = await cloudinary.api.sub_folders(target);
      return { current: target, folders: res?.folders || [] };
    } catch {
      return { current: parentFolder || DEFAULT_ROOT_FOLDER, folders: [] };
    }
  },
  createFolder: (folderPath) => cloudinary.api.create_folder(folderPath.replace(/^\/+|\/+$/g, '')),
  deleteFolder: (folderPath) => cloudinary.api.delete_folder(folderPath.replace(/^\/+|\/+$/g, '')),
  getMediaAssets: async ({ folder = DEFAULT_ROOT_FOLDER, q = '', format = 'all', sort = 'created_at_desc', next_cursor = null, max_results = 40 } = {}) => {
    try {
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
      let expressions = [`folder="${cleanFolder}"`];
      if (format && format !== 'all') expressions.push(`format=${format.toLowerCase()}`);
      if (q && q.trim()) expressions.push(`(filename:*${q.trim().replace(/[*"']/g, '')}* OR public_id:*${q.trim().replace(/[*"']/g, '')}*)`);

      let searchReq = cloudinary.search.expression(expressions.join(' AND ')).max_results(Math.min(parseInt(max_results, 10) || 40, 100));
      if (next_cursor) searchReq = searchReq.next_cursor(next_cursor);
      
      switch (sort) {
        case 'created_at_asc': searchReq = searchReq.sort_by('created_at', 'asc'); break;
        case 'name_asc': searchReq = searchReq.sort_by('public_id', 'asc'); break;
        case 'name_desc': searchReq = searchReq.sort_by('public_id', 'desc'); break;
        case 'bytes_desc': searchReq = searchReq.sort_by('bytes', 'desc'); break;
        case 'bytes_asc': searchReq = searchReq.sort_by('bytes', 'asc'); break;
        default: searchReq = searchReq.sort_by('created_at', 'desc'); break;
      }
      const res = await searchReq.execute();
      return { assets: res.resources || [], total_count: res.total_count || 0, next_cursor: res.next_cursor || null };
    } catch (err) {
      // Fallback khi Search API lỗi
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
      const options = { type: 'upload', prefix: cleanFolder, max_results: 40 };
      if (next_cursor) options.next_cursor = next_cursor;
      const fallbackRes = await cloudinary.api.resources(options);
      let list = fallbackRes?.resources || [];
      if (format && format !== 'all') list = list.filter(a => (a.format || '').toLowerCase() === format.toLowerCase());
      if (q && q.trim()) list = list.filter(a => (a.public_id || '').toLowerCase().includes(q.trim().toLowerCase()));
      return { assets: list, total_count: list.length, next_cursor: fallbackRes?.next_cursor || null };
    }
  },
  deleteResources: (publicIds = []) => cloudinary.api.delete_resources(publicIds)
};
```

---

## 5. Bước 4: Tạo Controller & Router Cho Media APIs

### Controller (`controllers/mediaController.js`):
```javascript
'use strict';
const storage = require('../config/cloudinary');

module.exports = {
  getFolders: async (req, res) => {
    try {
      const data = await storage.getSubFolders(req.query.parent);
      return res.status(200).json({ success: true, ...data, rootFolder: storage.DEFAULT_ROOT_FOLDER });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  createFolder: async (req, res) => {
    try {
      const { parent = storage.DEFAULT_ROOT_FOLDER, name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Folder name is required' });
      const cleanName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanParent = parent ? parent.replace(/^\/+|\/+$/g, '') : storage.DEFAULT_ROOT_FOLDER;
      const fullPath = `${cleanParent}/${cleanName}`.replace(/\/+/g, '/');
      const result = await storage.createFolder(fullPath);
      return res.status(201).json({ success: true, folder: { name: cleanName, path: fullPath, result } });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  deleteFolder: async (req, res) => {
    try {
      const path = (req.body?.path || req.query?.path || '').replace(/^\/+|\/+$/g, '');
      if (!path || path === storage.DEFAULT_ROOT_FOLDER) {
        return res.status(400).json({ success: false, error: 'Invalid folder path' });
      }
      await storage.deleteFolder(path);
      return res.status(200).json({ success: true, message: 'Folder deleted successfully' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  getAssets: async (req, res) => {
    try {
      const result = await storage.getMediaAssets(req.query);
      return res.status(200).json({ success: true, currentFolder: req.query.folder || storage.DEFAULT_ROOT_FOLDER, ...result });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  uploadImage: async (req, res) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      if (!files.length) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const normalized = files.map(f => ({
        url: f.path,
        secure_url: f.path,
        location: f.path, // Cho TinyMCE
        public_id: f.filename,
        format: f.mimetype?.split('/')[1] || 'jpg',
        bytes: f.size,
        originalname: f.originalname
      }));
      return res.status(200).json({
        success: true,
        files: normalized,
        location: normalized[0].url,
        url: normalized[0].url
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  deleteAssets: async (req, res) => {
    try {
      let publicIds = req.body?.public_ids || req.query?.id;
      if (!publicIds) return res.status(400).json({ success: false, error: 'Missing public_ids' });
      if (!Array.isArray(publicIds)) publicIds = [publicIds];
      const result = await storage.deleteResources(publicIds);
      return res.status(200).json({ success: true, deleted: result.deleted || {} });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};
```

### Router (`routes/mediaRoutes.js`):
```javascript
const express = require('express');
const router = express.Router();
const media = require('../controllers/mediaController');
const { upload } = require('../config/cloudinary');

// Middleware xử lý Multer lỗi
const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    next();
  });
};

// Đăng ký toàn bộ RESTful API
router.get('/api/media/folders', media.getFolders);
router.post('/api/media/folders', media.createFolder);
router.delete('/api/media/folders', media.deleteFolder);
router.get('/api/media/assets', media.getAssets);
router.post('/api/media/upload', handleUpload, media.uploadImage);
router.delete('/api/media/assets', media.deleteAssets);

module.exports = router;
```

---

## 6. Bước 5: Tích Hợp Frontend Nén Ảnh (`public/js/utils/image-compressor.js`)

Sao chép hàm Canvas compressor:
```javascript
export async function compressImageClient(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width <= maxWidth && height <= maxHeight && file.size < 400 * 1024) return resolve(file);
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                canvas.toBlob((blob) => {
                    if (!blob || blob.size >= file.size) return resolve(file);
                    resolve(new File([blob], file.name || 'image.jpg', { type: outputType, lastModified: Date.now() }));
                }, outputType, quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
```

---

## 7. Bước 6: Khởi Tạo TinyMCE Chuẩn Hóa (`public/js/modules/editor.js`)

Sử dụng TinyMCE 6 chính thống:
```javascript
import { showMediaBrowserModal, setMediaPickerCallback } from './media-browser.js';
import { compressImageClient } from '../utils/image-compressor.js';

export function initEditor(selector = '#editor-content') {
    if (!document.querySelector(selector)) return;

    tinymce.init({
        selector,
        plugins: "link image media table advlist lists preview code",
        toolbar: "undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | numlist bullist | link image cloudinary_media media | code preview",
        image_title: true,
        automatic_uploads: true,
        images_upload_url: '/api/media/upload',
        file_picker_types: 'image',
        setup: (editor) => {
            editor.ui.registry.addButton('cloudinary_media', {
                icon: 'image',
                tooltip: 'Browse Media Library',
                onAction: () => {
                    setMediaPickerCallback((url, alt) => {
                        editor.insertContent(`<p><img src="${url}" alt="${alt || 'Image'}" style="max-width: 100%; height: auto;" loading="lazy" /></p>`);
                    });
                    showMediaBrowserModal();
                }
            });
        },
        file_picker_callback: (callback, value, meta) => {
            if (meta.filetype === 'image') {
                setMediaPickerCallback((url, alt) => {
                    callback(url, { alt: alt || 'Image' });
                });
                showMediaBrowserModal();
            }
        },
        images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/media/upload');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status === 401) return reject('Session expired. Please login again.');
                if (xhr.status < 200 || xhr.status >= 300) return reject('HTTP Error: ' + xhr.status);
                try {
                    const json = JSON.parse(xhr.responseText);
                    resolve(json.location || json.url);
                } catch { reject('Invalid response'); }
            };
            xhr.onerror = () => reject('Network error during upload');
            
            compressImageClient(blobInfo.blob(), 1600, 1600, 0.85).then(compressed => {
                const fd = new FormData();
                fd.append('files', compressed, blobInfo.filename());
                xhr.send(fd);
            }).catch(() => {
                const fd = new FormData();
                fd.append('files', blobInfo.blob(), blobInfo.filename());
                xhr.send(fd);
            });
        })
    });
}
```

---

## 8. Kịch Bản Kiểm Thử Xác Minh (Smoke Test Checklist)

Sau khi tích hợp vào dự án mới, hãy chạy checklist sau để đảm bảo 100% chức năng hoạt động chính xác:

- [ ] **Test 1: Mở Modal Media Library**: Click nút "Thư viện" hoặc nút icon `cloudinary_media` trên TinyMCE. Modal `#cloudinaryMediaModal` phải mở ra với cây thư mục gốc.
- [ ] **Test 2: Duyệt Cây Thư Mục**: Click mở rộng một thư mục con, quan sát request `GET /api/media/folders?parent=...` trả về thành công và render các nhánh con.
- [ ] **Test 3: Tạo Thư Mục Mới**: Nhấn "New Folder", nhập tên `test_folder`. Thư mục mới xuất hiện ngay trên cây thư mục.
- [ ] **Test 4: Drag & Drop Upload**: Kéo một tệp ảnh lớn (> 2MB) thả vào vùng lưới ảnh. Thanh tiến độ hoạt họa phần trăm hiển thị mượt mà. Ảnh upload thành công và hiển thị trên lưới.
- [ ] **Test 5: Nén Ảnh Canvas**: Kiểm tra log network dung lượng tệp gửi lên: File gốc 2MB phải được nén xuống còn khoảng 200-400KB trước khi gửi request.
- [ ] **Test 6: Chèn Ảnh Vào TinyMCE**: Double-click vào một ảnh trong modal. Modal tự động đóng, ảnh xuất hiện trong iframe của TinyMCE với thuộc tính `loading="lazy"`.
- [ ] **Test 7: Paste Trực Tiếp Vào Editor**: Chụp ảnh màn hình máy tính (`Cmd+Shift+4` trên Mac hoặc `Win+Shift+S` trên Windows) và nhấn `Ctrl+V` vào khung soạn thảo. Ảnh phải tự động tải lên và hiển thị URL Cloudinary.
- [ ] **Test 8: Sao Chép URL (Inspector)**: Chọn một ảnh, bấm icon copy trong Inspector bên phải. Dán ra một ô text để kiểm tra URL hợp lệ.
- [ ] **Test 9: Xóa Ảnh Hàng Loạt (Bulk Delete)**: Bật "Select Mode", tích chọn 2 ảnh và bấm "Delete Selected". Cả 2 ảnh biến mất khỏi lưới và phản hồi thông báo thành công.
- [ ] **Test 10: Xóa Thư Mục Trống**: Chuyển vào thư mục `test_folder` vừa tạo (chưa có ảnh), bấm "Delete Folder". Thư mục bị xóa và điều hướng trở lại thư mục cha.

