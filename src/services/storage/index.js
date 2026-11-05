'use strict';

const CloudinaryStorageProvider = require('./CloudinaryStorageProvider');

let currentProvider = null;

function getStorageProvider() {
  if (!currentProvider) {
    currentProvider = new CloudinaryStorageProvider();
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
  CloudinaryStorageProvider
};
