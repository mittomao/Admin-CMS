#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase 8: Workflow Engine, Workbox & Publishing (Master -> Web)
 * Usage:
 *   node src/scripts/migrate-phase-08-workflow-publish.js [--dry-run] [--rollback]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const Workflow = require('../models/Workflow');
const PublishJob = require('../models/PublishJob');
const PublishHistory = require('../models/PublishHistory');
const WorkflowHistory = require('../models/WorkflowHistory');
const workflowService = require('../services/workflowService');

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

async function runMigration() {
  logger.info(`=== Bắt đầu Migration GĐ 8 (dryRun: ${isDryRun}, rollback: ${isRollback}) ===`);

  await mongoose.connect(env.MONGO_URI, { autoIndex: true });
  logger.info('Connected to MongoDB.');

  if (isRollback) {
    logger.warn('[Rollback] Reverting Phase 8 database changes...');
    if (!isDryRun) {
      // 1. Remove items_web collection
      await PublishedItem.collection.drop().catch(() => {});
      logger.info('Dropped items_web collection.');

      // 2. Remove publish jobs & histories
      await PublishJob.deleteMany({});
      await PublishHistory.deleteMany({});
      await WorkflowHistory.deleteMany({});
      logger.info('Cleared publish jobs, publish histories, and workflow histories.');

      // 3. Reset workflowState on items
      const res = await Item.updateMany(
        {},
        {
          $unset: {
            'languages.$[].versions.$[].workflowState': '',
            'languages.$[].versions.$[].validFrom': '',
            'languages.$[].versions.$[].validTo': '',
            'languages.$[].versions.$[].neverPublish': '',
          },
        }
      );
      logger.info(`Reset workflowState on ${res.modifiedCount} items.`);
    } else {
      logger.info('[Dry Run] Would drop items_web and reset workflow fields on items.');
    }
    logger.info('=== Hoàn tất Rollback GĐ 8 ===');
    await mongoose.disconnect();
    return;
  }

  // 1. Ensure default Sample Workflow exists
  logger.info('1. Khởi tạo/Kiểm tra Sample Workflow...');
  let sampleWorkflow = null;
  if (!isDryRun) {
    sampleWorkflow = await workflowService.ensureDefaultWorkflow();
    logger.info(`Sample Workflow ID: ${sampleWorkflow._id}`);
  } else {
    logger.info('[Dry Run] Would create/ensure Sample Workflow.');
  }

  // 2. Assign workflow to Page and Home templates if not assigned
  logger.info('2. Gán Sample Workflow cho Page Templates...');
  const pageTemplates = await Template.find({
    name: { $in: ['Page', 'Home', 'Standard Template'] },
  });

  for (const tpl of pageTemplates) {
    if (!tpl.workflowId && sampleWorkflow) {
      logger.info(`Assigning Sample Workflow to Template "${tpl.name}"`);
      if (!isDryRun) {
        tpl.workflowId = sampleWorkflow._id;
        tpl.workflow = sampleWorkflow._id;
        await tpl.save();
      }
    }
  }

  // 3. Backfill workflowState on existing item versions
  logger.info('3. Backfill workflowState cho các versions hiện có...');
  const items = await Item.find({ isDeleted: { $ne: true } });
  let backfilledCount = 0;

  for (const item of items) {
    let modified = false;
    const wf = sampleWorkflow || (await workflowService.resolveWorkflowForItem(item));

    if (wf && wf.states && wf.states.length > 0) {
      const draftState = wf.states.find((s) => s.isInitial) || wf.states[0];

      if (Array.isArray(item.languages)) {
        for (const l of item.languages) {
          if (Array.isArray(l.versions)) {
            for (const v of l.versions) {
              if (!v.workflowState) {
                if (!isDryRun) {
                  v.workflowState = draftState._id;
                }
                modified = true;
                backfilledCount++;
              }
            }
          }
        }
      }
    }

    if (modified && !isDryRun) {
      await item.save();
    }
  }

  logger.info(`Đã backfill workflowState về Draft cho ${backfilledCount} phiên bản item.`);

  // 4. Ensure collection indexes
  logger.info('4. Đồng bộ indexes cho items_web, publish_jobs, publish_histories...');
  if (!isDryRun) {
    await PublishedItem.syncIndexes();
    await PublishJob.syncIndexes();
    await PublishHistory.syncIndexes();
    await WorkflowHistory.syncIndexes();
    await Workflow.syncIndexes();
    logger.info('Đã tạo đầy đủ indexes tối ưu cho truy vấn Web.');
  }

  logger.info('=== Hoàn tất Migration GĐ 8 Thành công ===');
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  logger.error(`Migration error: ${err.message}`, err);
  process.exit(1);
});
