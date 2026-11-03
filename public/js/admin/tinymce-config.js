/**
 * TinyMCE 6 Configuration & Integration Module
 * Tích hợp TinyMCE 6 Community Edition với Media Library, Internal Links, và Auto-upload
 */

import { MediaPicker } from './media-picker.js';
import { compressImageClient } from '../utils/image-compressor.js';

export function initRichTextEditors(container = document, options = {}) {
  if (typeof tinymce === 'undefined') {
    return;
  }

  const textareas = container.querySelectorAll('textarea.rich-editor');
  if (!textareas || textareas.length === 0) return;

  const csrfToken =
    options.csrfToken ||
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
    '';

  textareas.forEach((textarea) => {
    // Nếu editor đã được khởi tạo trên textarea này, hủy trước khi init lại (khi đổi partial AJAX)
    const existingEditor = tinymce.get(textarea.id || textarea.name);
    if (existingEditor) {
      existingEditor.destroy();
    }

    // Đảm bảo textarea có ID duy nhất
    if (!textarea.id) {
      textarea.id = 'editor_' + Math.random().toString(36).substring(2, 9);
    }

    tinymce.init({
      target: textarea,
      menubar: false,
      branding: false,
      height: 350,
      plugins: 'link image media table lists preview code advlist',
      toolbar:
        'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist | link media_library media table | code preview',
      image_title: true,
      automatic_uploads: true,
      file_picker_types: 'image',

      // 1. Custom Button: Media Library
      setup: (editor) => {
        editor.ui.registry.addButton('media_library', {
          icon: 'image',
          tooltip: 'Browse Media Library',
          onAction: () => {
            MediaPicker.open({
              type: 'image',
              onSelect: (assets) => {
                if (!assets || assets.length === 0) return;
                const asset = assets[0];
                const fileUrl = `/media/file/${asset._id}`;
                const altText = asset.displayName || asset.name || '';
                const imgHtml = `<p><img src="${fileUrl}" data-media-id="${asset._id}" alt="${altText}" style="max-width: 100%; height: auto;" loading="lazy" /></p>`;
                editor.focus();
                editor.insertContent(imgHtml);
                editor.save();
                if (typeof window.__markFormDirty === 'function') {
                  window.__markFormDirty();
                }
              }
            });
          }
        });

        // Đánh dấu dirty state cho form khi nội dung thay đổi
        editor.on('change keyup NodeChange', () => {
          editor.save();
          if (typeof window.__markFormDirty === 'function') {
            window.__markFormDirty();
          }
        });
      },

      // 2. Chặn File Picker mặc định của TinyMCE để mở MediaPicker
      file_picker_callback: (callback, value, meta) => {
        if (meta.filetype === 'image') {
          MediaPicker.open({
            type: 'image',
            onSelect: (assets) => {
              if (!assets || assets.length === 0) return;
              const asset = assets[0];
              editor.focus();
              callback(`/media/file/${asset._id}`, {
                alt: asset.displayName || asset.name || ''
              });
              editor.save();
              if (typeof window.__markFormDirty === 'function') {
                window.__markFormDirty();
              }
            }
          });
        }
      },

      // 3. Xử lý Paste & Kéo thả ảnh trực tiếp vào Editor (Auto-upload via Canvas Compression)
      images_upload_handler: (blobInfo, progress) =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/media/upload');
          xhr.setRequestHeader('CSRF-Token', csrfToken);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              progress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 401) {
              reject('Session expired. Please login again.');
              return;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
              reject('HTTP Error: ' + xhr.status);
              return;
            }
            try {
              const json = JSON.parse(xhr.responseText);
              if (!json || (!json.location && !json.url)) {
                reject('Invalid response from upload server');
                return;
              }
              resolve(json.location || json.url);
            } catch {
              reject('Failed to parse upload response');
            }
          };

          xhr.onerror = () => {
            reject('Network error during image upload');
          };

          // Nén ảnh client trước khi gửi
          compressImageClient(blobInfo.blob(), 1600, 1600, 0.85)
            .then((compressedBlob) => {
              const formData = new FormData();
              formData.append('files', compressedBlob, blobInfo.filename());
              xhr.send(formData);
            })
            .catch(() => {
              const formData = new FormData();
              formData.append('files', blobInfo.blob(), blobInfo.filename());
              xhr.send(formData);
            });
        })
    });
  });
}

if (typeof window !== 'undefined') {
  window.initRichTextEditors = initRichTextEditors;
}

