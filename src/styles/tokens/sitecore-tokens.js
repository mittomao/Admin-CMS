/**
 * Sitecore Design Tokens
 * Chuẩn hóa màu sắc, phông chữ, khoảng cách và đổ bóng cho CMS
 */

module.exports = {
  colors: {
    sc: {
      red: {
        DEFAULT: '#eb1c24',
        hover: '#c9151c',
        active: '#a80e14',
        light: '#fef2f2'
      },
      navy: {
        DEFAULT: '#1b2a47',
        dark: '#23282d',
        light: '#27303f'
      },
      taskbar: {
        DEFAULT: '#1f2429',
        active: '#2d343c',
        text: '#d1d5db'
      },
      ribbon: {
        tab: '#27303f',
        tabActive: '#f5f6f8',
        body: '#f5f6f8',
        border: '#d2d6dc'
      },
      section: {
        bar: '#474747',
        accent: '#d93829',
        bg: '#f4f4f4'
      },
      border: {
        light: '#e2e8f0',
        medium: '#cbd5e1',
        dark: '#94a3b8'
      },
      surface: {
        app: '#f0f2f5',
        card: '#ffffff'
      },
      text: {
        main: '#1e293b',
        muted: '#64748b',
        subtle: '#94a3b8'
      }
    }
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
  },
  boxShadow: {
    'admin-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
    'admin-sm': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
    'admin-md': '0 4px 14px rgba(0, 0, 0, 0.08)',
    'admin-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)'
  }
};

