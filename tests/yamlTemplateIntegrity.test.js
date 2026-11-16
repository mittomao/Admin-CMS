'use strict';

/**
 * yamlTemplateIntegrity.test.js
 * Kiểm thử tính toàn vẹn 100% của tất cả Template trong Serialization và starter/corporate
 * Đảm bảo không xảy ra lỗi "templateId: Path templateId is required" hay "Thiếu Template"
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const mongoose = require('mongoose');

function scanYamlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(scanYamlFiles(fullPath));
    } else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
      if (!entry.endsWith('.manifest.yml')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

describe('Kiểm tra toàn vẹn Template Serialization (Chống lỗi templateId is required)', () => {
  const targetDirs = [
    { name: 'Core Serialization', dir: path.join(__dirname, '..', 'Serialization') },
    { name: 'Starter Corporate Serialization', dir: path.join(__dirname, '..', 'starter', 'corporate', 'serialization') },
  ];

  targetDirs.forEach(({ name, dir }) => {
    describe(`Kiểm tra cấu hình YAML: ${name}`, () => {
      const files = scanYamlFiles(dir);

      test(`Có tệp YAML để kiểm tra trong ${name}`, () => {
        expect(files.length).toBeGreaterThan(0);
      });

      test('Tất cả tệp YAML cú pháp hợp lệ và có path, name', () => {
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          const doc = yaml.load(content);
          expect(doc).toBeDefined();
          expect(typeof doc).toBe('object');
          expect(doc.path).toBeDefined();
          expect(typeof doc.path).toBe('string');
          expect(doc.name).toBeDefined();
          expect(typeof doc.name).toBe('string');

          if (doc._id) {
            expect(mongoose.Types.ObjectId.isValid(doc._id)).toBe(true);
          }
        }
      });

      test('Không có template folder nào bị trỏ sai template (ví dụ trỏ vào Folder con thay vì Template Folder)', () => {
        for (const file of files) {
          const doc = yaml.load(fs.readFileSync(file, 'utf8'));
          if (doc.path && doc.path.startsWith('/root/templates') && !Array.isArray(doc.sections)) {
            // Đây là thư mục tổ chức template (Template Folder)
            expect(doc.template).toBeDefined();
            expect(doc.template.name).toBe('Template Folder');
            expect(doc.template.path).toBe('/root/templates/System/Template Folder');
          }
        }
      });

      test('Tất cả Item đều có template tham chiếu hợp lệ (100% resolve được)', () => {
        const docs = files.map((f) => ({ file: f, doc: yaml.load(fs.readFileSync(f, 'utf8')) }));
        const definedPaths = new Set(docs.map((d) => d.doc.path));
        const definedIds = new Set(docs.map((d) => String(d.doc._id)).filter(Boolean));
        const definedNames = new Set(docs.map((d) => d.doc.name));

        for (const { file, doc } of docs) {
          if (doc.path === '/root') continue;

          expect(doc.template).toBeDefined();
          const t = doc.template;
          const hasPath = t.path && (definedPaths.has(t.path) || t.path.startsWith('/root/templates/System'));
          const hasId = t.id && definedIds.has(String(t.id));
          const hasName = t.name && (definedNames.has(t.name) || ['Template', 'Template Folder', 'Folder', 'Layout', 'Layout Folder', 'Rendering', 'Rendering Folder', 'Placeholder', 'Placeholder Folder', 'Standard Template'].includes(t.name));

          const isValidRef = hasPath || hasId || hasName;
          if (!isValidRef) {
            throw new Error(`Tệp ${file} chứa template không thể phân giải: ${JSON.stringify(t)}`);
          }
          expect(isValidRef).toBe(true);
        }
      });

      test('Tất cả Template định nghĩa sections và fields đều có schema hợp lệ', () => {
        for (const file of files) {
          const doc = yaml.load(fs.readFileSync(file, 'utf8'));
          if (Array.isArray(doc.sections)) {
            for (const sec of doc.sections) {
              expect(sec.name).toBeDefined();
              expect(typeof sec.name).toBe('string');
              if (sec.id) {
                expect(mongoose.Types.ObjectId.isValid(sec.id)).toBe(true);
              }
              if (Array.isArray(sec.fields)) {
                for (const f of sec.fields) {
                  expect(f.name).toBeDefined();
                  expect(typeof f.name).toBe('string');
                  expect(f.type).toBeDefined();
                  expect(typeof f.type).toBe('string');
                  if (f.id) {
                    expect(mongoose.Types.ObjectId.isValid(f.id)).toBe(true);
                  }
                }
              }
            }
          }
        }
      });
    });
  });
});

