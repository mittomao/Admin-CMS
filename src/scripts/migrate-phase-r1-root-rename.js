/**
 * Database Migration Script: Phase R1 - Rebrand & Root Rename
 * Renames root node and all materialized paths from /sitecore to /root
 * Migrates domains from "sitecore" to "treecraft"
 *
 * Usage:
 *   node src/scripts/migrate-phase-r1-root-rename.js --dry-run
 *   node src/scripts/migrate-phase-r1-root-rename.js
 *   node src/scripts/migrate-phase-r1-root-rename.js --rollback
 */

'use strict';

const mongoose = require('mongoose');
const env = require('../config/env');
const branding = require('../config/branding');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const Domain = require('../models/Domain');
const User = require('../models/User');
const Role = require('../models/Role');

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

const getMaskedUri = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '');

function replacePrefix(currentPath, fromPrefix, toPrefix) {
  if (!currentPath) return currentPath;
  if (currentPath === fromPrefix) return toPrefix;
  if (currentPath.toLowerCase().startsWith(fromPrefix.toLowerCase() + '/')) {
    return toPrefix + currentPath.slice(fromPrefix.length);
  }
  return currentPath;
}

async function run() {
  const fromPrefix = isRollback ? '/root' : '/sitecore';
  const toPrefix = isRollback ? '/sitecore' : '/root';
  const fromDomain = isRollback ? branding.DEFAULT_DOMAIN : 'sitecore';
  const toDomain = isRollback ? 'sitecore' : branding.DEFAULT_DOMAIN;
  const rootName = isRollback ? 'sitecore' : branding.ROOT_NAME;
  const rootDisplayName = isRollback ? 'Sitecore' : branding.ROOT_NAME;

  console.log('================================================================');
  console.log(`Phase R1 Migration: ${isRollback ? 'ROLLBACK (/root -> /sitecore)' : 'EXECUTE (/sitecore -> /root)'}`);
  console.log(`Dry Run Mode: ${isDryRun ? 'YES (No DB changes will be made)' : 'NO (Live DB Updates)'}`);
  console.log(`Connecting to: ${getMaskedUri(env.MONGO_URI)}`);
  console.log('================================================================\n');

  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  try {
    const fromRegex = new RegExp(`^${fromPrefix}($|/)`, 'i');

    // 1. Audit Target Counts
    const masterItems = await Item.find({ path: fromRegex }).lean();
    const webItems = await PublishedItem.find({ path: fromRegex }).lean();
    const templates = await Template.find({ path: fromRegex }).lean();
    const templatesWithSource = await Template.find({
      'sections.fields.source': { $regex: fromRegex },
    }).lean();
    const domainsToMigrate = await Domain.find({ name: fromDomain }).lean();
    const usersToMigrate = await User.find({ domain: fromDomain }).lean();
    const rolesToMigrate = await Role.find({ domain: fromDomain }).lean();

    console.log(`Found ${masterItems.length} items in items_master matching "${fromPrefix}*"`);
    console.log(`Found ${webItems.length} items in items_web matching "${fromPrefix}*"`);
    console.log(`Found ${templates.length} templates matching "${fromPrefix}*"`);
    console.log(`Found ${templatesWithSource.length} templates with field.source matching "${fromPrefix}*"`);
    console.log(`Found ${domainsToMigrate.length} domain matching "${fromDomain}"`);
    console.log(`Found ${usersToMigrate.length} users with domain "${fromDomain}"`);
    console.log(`Found ${rolesToMigrate.length} roles with domain "${fromDomain}"`);

    if (isDryRun) {
      console.log('\n[DRY RUN PREVIEW]');
      if (masterItems.length > 0) {
        console.log('Sample master item path transformations:');
        masterItems.slice(0, 5).forEach((item) => {
          console.log(`  "${item.path}" -> "${replacePrefix(item.path, fromPrefix, toPrefix)}"`);
        });
      }
      console.log('\nDry run completed successfully. No changes were applied.');
      return;
    }

    // 2. Perform Migration on items_master
    console.log(`\n1. Migrating items_master (${masterItems.length} documents)...`);
    const masterOps = masterItems.map((item) => {
      const newPath = replacePrefix(item.path, fromPrefix, toPrefix);
      const updateFields = { path: newPath };
      // If this is the root node, also update its name and displayName
      if (item.path.toLowerCase() === fromPrefix.toLowerCase()) {
        updateFields.name = rootName;
        updateFields.displayName = rootDisplayName;
      }
      return {
        updateOne: {
          filter: { _id: item._id },
          update: { $set: updateFields },
        },
      };
    });

    if (masterOps.length > 0) {
      const res = await Item.bulkWrite(masterOps);
      console.log(`   items_master updated: ${res.modifiedCount} modified.`);
    } else {
      console.log('   items_master: 0 items to update (already migrated).');
    }

    // 3. Perform Migration on items_web
    console.log(`\n2. Migrating items_web (${webItems.length} documents)...`);
    const webOps = webItems.map((item) => {
      const newPath = replacePrefix(item.path, fromPrefix, toPrefix);
      const updateFields = { path: newPath };
      if (item.path.toLowerCase() === fromPrefix.toLowerCase()) {
        updateFields.name = rootName;
        updateFields.displayName = rootDisplayName;
      }
      return {
        updateOne: {
          filter: { _id: item._id },
          update: { $set: updateFields },
        },
      };
    });

    if (webOps.length > 0) {
      const res = await PublishedItem.bulkWrite(webOps);
      console.log(`   items_web updated: ${res.modifiedCount} modified.`);
    } else {
      console.log('   items_web: 0 items to update (already migrated).');
    }

    // 4. Perform Migration on templates (paths)
    console.log(`\n3. Migrating templates paths (${templates.length} documents)...`);
    const templateOps = templates.map((tpl) => {
      const newPath = replacePrefix(tpl.path, fromPrefix, toPrefix);
      return {
        updateOne: {
          filter: { _id: tpl._id },
          update: { $set: { path: newPath } },
        },
      };
    });

    if (templateOps.length > 0) {
      const res = await Template.bulkWrite(templateOps);
      console.log(`   templates path updated: ${res.modifiedCount} modified.`);
    } else {
      console.log('   templates path: 0 to update.');
    }

    // 5. Perform Migration on templates field.source
    console.log(`\n4. Migrating templates sections.fields.source (${templatesWithSource.length} documents)...`);
    for (const tpl of templatesWithSource) {
      let changed = false;
      if (Array.isArray(tpl.sections)) {
        tpl.sections.forEach((sec) => {
          if (Array.isArray(sec.fields)) {
            sec.fields.forEach((f) => {
              if (f.source && f.source.toLowerCase().startsWith(fromPrefix.toLowerCase())) {
                f.source = replacePrefix(f.source, fromPrefix, toPrefix);
                changed = true;
              }
            });
          }
        });
      }
      if (changed) {
        await Template.updateOne(
          { _id: tpl._id },
          { $set: { sections: tpl.sections } }
        );
        console.log(`   Updated field.source on template: "${tpl.name}" (${tpl._id})`);
      }
    }

    // 6. Perform Migration on Domain
    console.log(`\n5. Migrating Domain "${fromDomain}" -> "${toDomain}"...`);
    if (domainsToMigrate.length > 0) {
      // Check if target domain already exists
      const targetDomainExists = await Domain.findOne({ name: toDomain });
      if (!targetDomainExists) {
        await Domain.updateOne(
          { name: fromDomain },
          { $set: { name: toDomain, displayName: toDomain.toUpperCase() } }
        );
        console.log(`   Renamed domain "${fromDomain}" -> "${toDomain}".`);
      } else {
        await Domain.deleteOne({ name: fromDomain });
        console.log(`   Domain "${toDomain}" already exists. Removed legacy domain "${fromDomain}".`);
      }
    } else {
      // Ensure target domain exists
      const targetExists = await Domain.findOne({ name: toDomain });
      if (!targetExists) {
        await Domain.create({
          name: toDomain,
          displayName: toDomain.toUpperCase(),
          isDefault: true,
        });
        console.log(`   Created default domain "${toDomain}".`);
      } else {
        console.log(`   Domain "${toDomain}" already in place.`);
      }
    }

    // 7. Perform Migration on Users
    console.log(`\n6. Migrating User domain "${fromDomain}" -> "${toDomain}"...`);
    const userRes = await User.updateMany(
      { domain: fromDomain },
      { $set: { domain: toDomain } }
    );
    console.log(`   Updated ${userRes.modifiedCount} users to domain "${toDomain}".`);

    // 8. Perform Migration on Roles
    console.log(`\n7. Migrating Role domain "${fromDomain}" -> "${toDomain}"...`);
    const roleRes = await Role.updateMany(
      { domain: fromDomain },
      { $set: { domain: toDomain } }
    );
    console.log(`   Updated ${roleRes.modifiedCount} roles to domain "${toDomain}".`);

    // 9. Post-migration Verification
    console.log('\n8. Post-migration verification checks...');
    const remainingMaster = await Item.countDocuments({ path: fromRegex });
    const remainingWeb = await PublishedItem.countDocuments({ path: fromRegex });
    const remainingTemplates = await Template.countDocuments({ path: fromRegex });
    const rootCheck = await Item.findOne({ path: toPrefix });

    console.log(`   Remaining items with "${fromPrefix}*" in items_master: ${remainingMaster}`);
    console.log(`   Remaining items with "${fromPrefix}*" in items_web: ${remainingWeb}`);
    console.log(`   Remaining templates with "${fromPrefix}*" in templates: ${remainingTemplates}`);
    console.log(`   Root node verified at "${toPrefix}": ${rootCheck ? `FOUND (_id: ${rootCheck._id}, name: "${rootCheck.name}")` : 'NOT FOUND!'}`);

    if (remainingMaster > 0 || remainingWeb > 0 || remainingTemplates > 0 || !rootCheck) {
      console.error('\n[WARNING] Verification checks detected anomalies! Please review output above.');
    } else {
      console.log('\n================================================================');
      console.log(`[SUCCESS] Migration ${isRollback ? 'Rollback' : 'Phase R1'} completed with 100% integrity.`);
      console.log('================================================================');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

