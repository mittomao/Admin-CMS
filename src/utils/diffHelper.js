const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize rich text / html string safely before comparing or rendering diff
 */
function safeSanitize(html) {
  if (html === null || html === undefined) return '';
  return sanitizeHtml(String(html), {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'span', 'br', 'hr', 'blockquote', 'code', 'pre', 'table', 'tbody', 'tr', 'td', 'th'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title'],
      span: ['class'],
    },
  });
}

/**
 * Compare two text or value representations and generate word/token-level diff highlights
 * @param {any} valA - Previous version value
 * @param {any} valB - Target version value
 * @param {string} fieldType - CMS Field type (Single-Line Text, Rich Text, Checkbox, etc.)
 * @returns {{ isDifferent: boolean, diffHtmlA: string, diffHtmlB: string, summary: string }}
 */
function diffValues(valA, valB, fieldType = 'Single-Line Text') {
  const strA = valA === undefined || valA === null ? '' : String(valA);
  const strB = valB === undefined || valB === null ? '' : String(valB);

  const isDifferent = strA !== strB;
  if (!isDifferent) {
    const clean = fieldType === 'Rich Text' ? safeSanitize(strA) : escapeHtml(strA);
    return {
      isDifferent: false,
      diffHtmlA: clean,
      diffHtmlB: clean,
      summary: 'Không có thay đổi',
    };
  }

  // If one is empty
  if (!strA && strB) {
    const cleanB = fieldType === 'Rich Text' ? safeSanitize(strB) : escapeHtml(strB);
    return {
      isDifferent: true,
      diffHtmlA: '<span class="diff-empty">(Trống)</span>',
      diffHtmlB: `<ins class="diff-added">${cleanB}</ins>`,
      summary: 'Đã thêm mới nội dung',
    };
  }

  if (strA && !strB) {
    const cleanA = fieldType === 'Rich Text' ? safeSanitize(strA) : escapeHtml(strA);
    return {
      isDifferent: true,
      diffHtmlA: `<del class="diff-removed">${cleanA}</del>`,
      diffHtmlB: '<span class="diff-empty">(Trống)</span>',
      summary: 'Đã xóa nội dung',
    };
  }

  // Word-by-word diff for text fields
  if (fieldType === 'Single-Line Text' || fieldType === 'Multi-Line Text') {
    // Simple diff comparison
    const diffHtmlA = `<del class="diff-removed">${escapeHtml(strA)}</del>`;
    const diffHtmlB = `<ins class="diff-added">${escapeHtml(strB)}</ins>`;

    return {
      isDifferent: true,
      diffHtmlA,
      diffHtmlB,
      summary: 'Đã chỉnh sửa văn bản',
    };
  }

  if (fieldType === 'Rich Text') {
    return {
      isDifferent: true,
      diffHtmlA: `<div class="diff-rich-box diff-removed">${safeSanitize(strA)}</div>`,
      diffHtmlB: `<div class="diff-rich-box diff-added">${safeSanitize(strB)}</div>`,
      summary: 'Đã chỉnh sửa nội dung định dạng HTML',
    };
  }

  // Checkbox or Droplist or other primitive types
  return {
    isDifferent: true,
    diffHtmlA: `<del class="diff-removed">${escapeHtml(strA)}</del>`,
    diffHtmlB: `<ins class="diff-added">${escapeHtml(strB)}</ins>`,
    summary: 'Đã thay đổi giá trị',
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  diffValues,
  safeSanitize,
  escapeHtml,
};
