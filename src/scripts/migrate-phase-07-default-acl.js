/**
 * Migration Script: Phase 7 Default Item-Level ACL & System Security
 * Usage:
 *   node src/scripts/migrate-phase-07-default-acl.js [--dry-run] [--rollback]
 *
 * IMPORTANT: PLEASE BACKUP YOUR DATABASE (mongodump) BEFORE RUNNING IN PRODUCTION.
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const Item = require('../models/Item');
const Role = require('../models/Role');
const User = require('../models/User');
const Domain = require('../models/Domain');
const AccessControl = require('../models/AccessControl');
const { RIGHTS } = require('../config/permissions');
const logger = require('../utils/logger');

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

async function runMigration() {
  console.log('===============================================================');
  console.log(' MIGRATION: GĐ 7 - ITEM-LEVEL ACL & SYSTEM SECURITY MIGRATION');
  console.log(` Mode: ${isRollback ? 'ROLLBACK' : 'MIGRATE'} ${isDryRun ? '[DRY-RUN - NO CHANGES SAVED]' : '[LIVE EXECUTION]'}`);
  console.log(' NOTICE: Please ensure you have backed up your database before running.');
  console.log('===============================================================');

  const mongoUri = env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing from environment.');
  }

  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB successfully.');

  try {
    if (isRollback) {
      console.log('\n--- EXECUTING ROLLBACK ---');
      const count = await AccessControl.countDocuments({});
      console.log(` Found ${count} ACL entries.`);
      if (!isDryRun) {
        await AccessControl.deleteMany({});
        console.log(' [OK] Successfully removed all AccessControl entries.');
      } else {
        console.log(' [DRY-RUN] Would remove all AccessControl entries.');
      }
      return;
    }

    // 1. Ensure Default Domain
    console.log('\n1. Ensuring default "treecraft" domain...');
    let defaultDomain = await Domain.findOne({ name: 'treecraft' });
    if (!defaultDomain) {
      if (!isDryRun) {
        defaultDomain = await Domain.create({
          name: 'treecraft',
          displayName: 'Treecraft Local Domain',
          description: 'Default authentication and authorization domain',
          isDefault: true,
        });
        console.log(' Created default domain "treecraft".');
      } else {
        console.log(' [DRY-RUN] Would create default domain "treecraft".');
      }
    } else {
      console.log(' Default domain "treecraft" already exists.');
    }

    // 2. Fetch or seed necessary roles
    console.log('\n2. Verifying system roles...');
    const rolesMap = {};
    const roleNames = ['Administrator', 'Author', 'Editor', 'Approver', 'Developer'];

    for (const rName of roleNames) {
      let roleDoc = await Role.findOne({ name: rName });
      if (!roleDoc && !isDryRun) {
        roleDoc = await Role.create({
          name: rName,
          domain: 'treecraft',
          description: `System role for ${rName}`,
          isSystem: rName === 'Administrator',
          memberOf: [],
        });
        console.log(` Created missing role: ${rName}`);
      } else if (roleDoc && !roleDoc.domain && !isDryRun) {
        roleDoc.domain = 'treecraft';
        await roleDoc.save();
      }
      if (roleDoc) {
        rolesMap[rName] = roleDoc;
      }
    }

    // 3. Update existing users with domain and admin flag
    console.log('\n3. Normalizing user domain and admin properties...');
    const users = await User.find({}).populate('roles');
    for (const u of users) {
      let changed = false;
      if (!u.domain) {
        u.domain = 'treecraft';
        changed = true;
      }
      const hasAdminRole = u.roles && u.roles.some((r) => r.name === 'Administrator');
      if (hasAdminRole && !u.isAdmin) {
        u.isAdmin = true;
        changed = true;
      }
      if (!u.displayName) {
        u.displayName = u.fullName || u.username;
        changed = true;
      }
      if (changed && !isDryRun) {
        await u.save();
      }
    }
    console.log(` Normalized ${users.length} users.`);

    // 4. Fetch Core Root Items
    console.log('\n4. Locating core system items for default ACLs...');
    const rootTreecraft = await Item.findOne({ path: '/root', deleted: { $ne: true } });
    const rootContent = await Item.findOne({ path: '/root/content', deleted: { $ne: true } });
    const rootLayout = await Item.findOne({ path: '/root/layout', deleted: { $ne: true } });
    const rootMedia = await Item.findOne({ path: '/root/media library', deleted: { $ne: true } });
    const rootTemplates = await Item.findOne({ path: '/root/templates', deleted: { $ne: true } });
    const rootSystem = await Item.findOne({ path: '/root/system', deleted: { $ne: true } });

    if (!rootTreecraft) {
      console.warn(' [WARN] Root item "/root" not found! Default ACLs will be skipped.');
      return;
    }

    // 5. Construct Default ACL Rules Matrix
    console.log('\n5. Generating baseline ACL entries for backwards compatibility...');
    const defaultAclRules = [];

    // Helper to add rule
    const addRule = (item, roleName, right, access, inheritance = 'both') => {
      if (!item || !rolesMap[roleName]) return;
      defaultAclRules.push({
        itemId: item._id,
        principalType: 'role',
        principalId: rolesMap[roleName]._id,
        right,
        access,
        inheritance,
      });
    };

    // A. Root /root rules (inherited by entire tree)
    // - Administrator has all rights
    const allRights = [
      RIGHTS.READ,
      RIGHTS.WRITE,
      RIGHTS.CREATE,
      RIGHTS.RENAME,
      RIGHTS.DELETE,
      RIGHTS.PUBLISH,
      RIGHTS.ADMINISTER,
      RIGHTS.PRESENTATION_READ,
      RIGHTS.PRESENTATION_WRITE,
      'workflow:execute:Submit',
      'workflow:execute:Approve',
      'workflow:execute:Reject',
    ];
    for (const r of allRights) {
      addRule(rootTreecraft, 'Administrator', r, 'allow', 'both');
    }

    // - Author: can read, write, create, rename content; read presentation; submit workflow
    addRule(rootTreecraft, 'Author', RIGHTS.READ, 'allow', 'both');
    addRule(rootTreecraft, 'Author', RIGHTS.WRITE, 'allow', 'both');
    addRule(rootTreecraft, 'Author', RIGHTS.CREATE, 'allow', 'both');
    addRule(rootTreecraft, 'Author', RIGHTS.RENAME, 'allow', 'both');
    addRule(rootTreecraft, 'Author', RIGHTS.PRESENTATION_READ, 'allow', 'both');
    addRule(rootTreecraft, 'Author', 'workflow:execute:Submit', 'allow', 'both');

    // - Editor: author rights + delete
    addRule(rootTreecraft, 'Editor', RIGHTS.READ, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', RIGHTS.WRITE, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', RIGHTS.CREATE, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', RIGHTS.RENAME, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', RIGHTS.DELETE, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', RIGHTS.PRESENTATION_READ, 'allow', 'both');
    addRule(rootTreecraft, 'Editor', 'workflow:execute:Submit', 'allow', 'both');

    // - Approver: editor rights + publish + approve + reject
    addRule(rootTreecraft, 'Approver', RIGHTS.READ, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.WRITE, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.CREATE, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.RENAME, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.DELETE, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.PUBLISH, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', RIGHTS.PRESENTATION_READ, 'allow', 'both');
    addRule(rootTreecraft, 'Approver', 'workflow:execute:Submit', 'allow', 'both');
    addRule(rootTreecraft, 'Approver', 'workflow:execute:Approve', 'allow', 'both');
    addRule(rootTreecraft, 'Approver', 'workflow:execute:Reject', 'allow', 'both');

    // B. Protection Overrides on /root/layout (only Admin/Dev can write)
    if (rootLayout) {
      addRule(rootLayout, 'Author', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootLayout, 'Author', RIGHTS.PRESENTATION_WRITE, 'deny', 'both');
      addRule(rootLayout, 'Editor', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootLayout, 'Editor', RIGHTS.PRESENTATION_WRITE, 'deny', 'both');
      addRule(rootLayout, 'Approver', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootLayout, 'Approver', RIGHTS.PRESENTATION_WRITE, 'deny', 'both');
      if (rolesMap['Developer']) {
        addRule(rootLayout, 'Developer', RIGHTS.WRITE, 'allow', 'both');
        addRule(rootLayout, 'Developer', RIGHTS.PRESENTATION_WRITE, 'allow', 'both');
      }
    }

    // C. Protection Overrides on /root/templates
    if (rootTemplates) {
      addRule(rootTemplates, 'Author', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootTemplates, 'Author', RIGHTS.DELETE, 'deny', 'both');
      addRule(rootTemplates, 'Editor', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootTemplates, 'Editor', RIGHTS.DELETE, 'deny', 'both');
      addRule(rootTemplates, 'Approver', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootTemplates, 'Approver', RIGHTS.DELETE, 'deny', 'both');
    }

    // D. Protection Overrides on /root/system
    if (rootSystem) {
      addRule(rootSystem, 'Author', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootSystem, 'Author', RIGHTS.DELETE, 'deny', 'both');
      addRule(rootSystem, 'Editor', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootSystem, 'Editor', RIGHTS.DELETE, 'deny', 'both');
      addRule(rootSystem, 'Approver', RIGHTS.WRITE, 'deny', 'both');
      addRule(rootSystem, 'Approver', RIGHTS.DELETE, 'deny', 'both');
    }

    // 6. Execute Upserts (Idempotent)
    console.log(`\n6. Applying ${defaultAclRules.length} baseline ACL rules...`);
    let upsertedCount = 0;
    for (const rule of defaultAclRules) {
      const filter = {
        itemId: rule.itemId,
        principalType: rule.principalType,
        principalId: rule.principalId,
        right: rule.right,
      };

      if (!isDryRun) {
        await AccessControl.findOneAndUpdate(filter, { $set: rule }, { upsert: true, new: true });
      }
      upsertedCount++;
    }

    console.log(`\n===============================================================`);
    console.log(` [SUCCESS] Migration completed!`);
    console.log(` - Dry Run: ${isDryRun}`);
    console.log(` - Baseline ACL entries applied: ${upsertedCount}`);
    console.log(`===============================================================`);
  } catch (err) {
    console.error('\n [ERROR] Migration failed:', err.message, err.stack);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

