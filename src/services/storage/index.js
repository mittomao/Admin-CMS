'use strict';

const LocalStorageProvider = require('./LocalStorageProvider');

let currentProvider = null;

function getStorageProvider() {
  if (!currentProvider) {
    const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    switch (providerType) {
      case 'local':
      default:
        currentProvider = new LocalStorageProvider();
        break;
    }
  }

  return currentProvider;
}

// Cho phép inject mock provider trong unit test
function setStorageProvider(provider) {
  currentProvider = provider;
}

module.exports = {
  getStorageProvider,
  setStorageProvider,
  LocalStorageProvider
};

