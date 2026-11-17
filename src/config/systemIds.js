'use strict';

/**
 * Treecraft CMS - Fixed Deterministic System IDs (DEC-058 / Phase S-Parity)
 * Single Source of Truth for system skeleton node IDs and system template IDs.
 * Guarantees 100% Tree Parity across all new projects and environments.
 */

const SYSTEM_IDS = {
  // 6 Root Nodes
  '/root': '6ae95cc6b1e541e051fd4162',
  '/root/content': '6ae95cc6b1e541e051fd4165',
  '/root/layout': '6aea24d7fb85fae7f0a409a8',
  '/root/media library': '6ae95cc6b1e541e051fd4168',
  '/root/system': '6ae95cc6b1e541e051fd416e',
  '/root/templates': '6ae95cc6b1e541e051fd416b',

  // System Languages Folder
  '/root/system/Languages': '6af17b670ffbbe032133f2b8',

  // Common Branches
  '/root/templates/common': '6aeaf46de620d879bafc23d2',
  '/root/templates/common/Folder': '6ae95cc6b1e541e051fd413e',

  // 13 System Templates
  '/root/templates/System': '6aeae251248055b9172f85f4',
  '/root/templates/System/Layout': '6aea24d7fb85fae7f0a4098a',
  '/root/templates/System/Layout Folder': '6aea24d7fb85fae7f0a40977',
  '/root/templates/System/Page': '6ae95cc6b1e541e051fd4142',
  '/root/templates/System/Placeholder': '6aeaccf0b200083aee587041',
  '/root/templates/System/Placeholder Folder': '6aeaccf0b200083aee587033',
  '/root/templates/System/Rendering': '6aea24d7fb85fae7f0a40992',
  '/root/templates/System/Rendering Folder': '6aea24d7fb85fae7f0a4097c',
  '/root/templates/System/Sample Item': '6ae95cc6b1e541e051fd414d',
  '/root/templates/System/Standard Template': '6aeafc0648c8829413fffede',
  '/root/templates/System/Template': '6aeae250248055b9172f85eb',
  '/root/templates/System/Template Folder': '6aeae250248055b9172f85e7',
  '/root/templates/System/_BasePage': '6ae97d27093120b9b6fcba58',
};

// Name-based mapping for system templates
const TEMPLATE_NAME_IDS = {
  _BasePage: '6ae97d27093120b9b6fcba58',
  'Standard Template': '6aeafc0648c8829413fffede',
  Folder: '6ae95cc6b1e541e051fd413e',
  Page: '6ae95cc6b1e541e051fd4142',
  'Sample Item': '6ae95cc6b1e541e051fd414d',
  Template: '6aeae250248055b9172f85eb',
  'Template Folder': '6aeae250248055b9172f85e7',
  Layout: '6aea24d7fb85fae7f0a4098a',
  'Layout Folder': '6aea24d7fb85fae7f0a40977',
  Rendering: '6aea24d7fb85fae7f0a40992',
  'Rendering Folder': '6aea24d7fb85fae7f0a4097c',
  Placeholder: '6aeaccf0b200083aee587041',
  'Placeholder Folder': '6aeaccf0b200083aee587033',
  'Language Root': '6af17b660ffbbe032133f29e',
};

function getSystemIdByPath(itemPath) {
  return SYSTEM_IDS[itemPath] || null;
}

function getSystemTemplateIdByName(name) {
  return TEMPLATE_NAME_IDS[name] || null;
}

module.exports = {
  SYSTEM_IDS,
  TEMPLATE_NAME_IDS,
  getSystemIdByPath,
  getSystemTemplateIdByName,
};

