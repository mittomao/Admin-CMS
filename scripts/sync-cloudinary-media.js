#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const mediaSyncService = require('../src/services/mediaSyncService');
const logger = require('../src/utils/logger');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rootFolderArg = args.find((a) => a.startsWith('--root='));
  const rootFolder = rootFolderArg ? rootFolderArg.split('=')[1] : (process.env.CLOUDINARY_API_FOLDER || 'AdminCMS');
  const dirArg = args.find((a) => a.startsWith('--direction='));
  const direction = dirArg ? dirArg.split('=')[1].toLowerCase() : 'both';

  console.log('====================================================');
  console.log(' Cloudinary <-> CMS Two-Way Media Sync CLI');
  console.log(` Target Cloudinary Root: ${rootFolder}`);
  console.log(` Direction: ${direction.toUpperCase()}`);
  console.log(` Mode: ${dryRun ? 'DRY-RUN (Simulated)' : 'LIVE EXECUTION'}`);
  console.log('====================================================\n');

  try {
    const mongoUri = env.MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/treecraft_cms';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB.');

    let report = null;
    if (direction === 'pull') {
      report = await mediaSyncService.syncFromCloudinary({ dryRun, rootFolder });
      console.log('\n---------------- PULL SYNC SUMMARY ----------------');
      console.log(` Assets Created: ${report.created}`);
      console.log(` Assets Updated: ${report.updated}`);
      console.log(` Assets Missing on Cloudinary: ${report.missing}`);
    } else if (direction === 'push') {
      report = await mediaSyncService.syncToCloudinary({ dryRun, rootFolder });
      console.log('\n---------------- PUSH SYNC SUMMARY ----------------');
      console.log(` Folders Created on Cloudinary: ${report.foldersCreated}`);
      console.log(` Assets Verified on Cloudinary: ${report.verified}`);
      console.log(` Assets Purged from Cloudinary: ${report.purged}`);
      console.log(` Assets Missing on Cloudinary: ${report.missing}`);
      console.log(` Unlinked CMS Items: ${report.unlinked}`);
    } else {
      report = await mediaSyncService.syncBoth({ dryRun, rootFolder });
      console.log('\n---------------- TWO-WAY SYNC SUMMARY ----------------');
      console.log(` [Pull] Assets Created: ${report.pull.created}`);
      console.log(` [Pull] Assets Updated: ${report.pull.updated}`);
      console.log(` [Push] Folders Created on Cloudinary: ${report.push.foldersCreated}`);
      console.log(` [Push] Assets Verified on Cloudinary: ${report.push.verified}`);
      console.log(` [Push] Assets Purged from Cloudinary: ${report.push.purged}`);
      console.log(` [Push] Assets Missing on Cloudinary: ${report.push.missing}`);
      console.log(` [Push] Unlinked CMS Items: ${report.push.unlinked}`);
    }

    if (report.errors && report.errors.length > 0) {
      console.log(` Errors encountered (${report.errors.length}):`);
      report.errors.forEach((e) => console.log(`   - ${e}`));
    }
    console.log('------------------------------------------------------\n');

    await mongoose.disconnect();
    process.exit((report.errors && report.errors.length > 0) ? 1 : 0);
  } catch (err) {
    console.error('Fatal Sync Error:', err);
    process.exit(1);
  }
}

main();

