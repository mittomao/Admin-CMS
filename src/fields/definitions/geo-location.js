module.exports = {
  type: 'Geo Location',
  displayName: 'Geo Location (Tọa độ bản đồ)',
  category: 'Advanced',
  icon: 'ti ti-map-pin',
  viewSlug: 'geo-location',
  defaultConfig: {
    defaultLat: 21.028511,
    defaultLng: 105.854444,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    let obj = val;
    if (typeof val === 'string' && val.trim()) {
      try {
        obj = JSON.parse(val);
      } catch {
        obj = null;
      }
    }
    if (isRequired && (!obj || (obj.lat === undefined && obj.lng === undefined && !obj.address))) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return { lat: null, lng: null, address: '' };
    if (typeof val === 'object') {
      const lat = val.lat !== null && val.lat !== undefined && val.lat !== '' ? Number(val.lat) : null;
      const lng = val.lng !== null && val.lng !== undefined && val.lng !== '' ? Number(val.lng) : null;
      return {
        lat: Number.isNaN(lat) ? null : lat,
        lng: Number.isNaN(lng) ? null : lng,
        address: val.address ? String(val.address).trim() : '',
      };
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === 'object') {
          const lat = parsed.lat !== null && parsed.lat !== undefined && parsed.lat !== '' ? Number(parsed.lat) : null;
          const lng = parsed.lng !== null && parsed.lng !== undefined && parsed.lng !== '' ? Number(parsed.lng) : null;
          return {
            lat: Number.isNaN(lat) ? null : lat,
            lng: Number.isNaN(lng) ? null : lng,
            address: parsed.address ? String(parsed.address).trim() : '',
          };
        }
      } catch {
        return { lat: null, lng: null, address: val.trim() };
      }
    }
    return { lat: null, lng: null, address: '' };
  },
};

