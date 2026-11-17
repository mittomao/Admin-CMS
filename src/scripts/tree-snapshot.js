'use strict';

/**
 * Treecraft CMS - Content Tree Snapshot Generator (DEC-058 / Phase S-Parity)
 * Dumps deterministic snapshot of items_master to starter/corporate/tree.manifest.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('../config/env');
const sitePaths = require('../config/sitePaths');
const branding = require('../config/branding');

function hashObject(obj) {
  if (!obj) return null;
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

async function generateSnapshot(outputPath) {
  const targetPath = outputPath || path.join(sitePaths.STARTER_DIR, 'corporate', 'tree.manifest.json');
  console.log(`Connecting to MongoDB [${env.MONGO_URI}] dbName=[${env.MONGO_DB_NAME}]...`);

  await mongoose.connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 5000,
  });

  const masterColl = mongoose.connection.collection('items_master');
  const items = await masterColl.find({ deleted: { $ne: true } }).sort({ path: 1 }).toArray();

  console.log(`Found ${items.length} items in items_master. Generating snapshot...`);

  const nodes = items.map((it) => {
    const fieldsHash = hashObject(it.fields ? Object.fromEntries(new Map(Object.entries(it.fields))) : {});
    const sharedFieldsHash = hashObject(it.sharedFields ? Object.fromEntries(new Map(Object.entries(it.sharedFields))) : {});

    return {
      id: it._id.toString(),
      name: it.name,
      displayName: it.displayName || it.name,
      path: it.path,
      templateId: it.templateId ? it.templateId.toString() : null,
      parentId: it.parentId ? it.parentId.toString() : null,
      sortOrder: it.sortOrder !== undefined ? it.sortOrder : 100,
      hasPresentation: Boolean(
        it.presentation && (it.presentation.layoutId || (it.presentation.renderings && it.presentation.renderings.length))
      ),
      fieldsHash,
      sharedFieldsHash,
      languages: it.languages ? it.languages.map((l) => l.code).sort() : ['vi'],
    };
  });

  const manifest = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalItems: nodes.length,
    dbName: env.MONGO_DB_NAME,
    sha256: crypto.createHash('sha256').update(JSON.stringify(nodes)).digest('hex'),
    nodes,
  };

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`✅ Tree snapshot written to: ${targetPath} (${manifest.totalItems} nodes, hash: ${manifest.sha256.slice(0, 10)})`);
  await mongoose.disconnect();
  return manifest;
}

if (require.main === module) {
  const outArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  generateSnapshot(outArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Snapshot error:', err);
      process.exit(1);
    });
}

module.exports = { generateSnapshot };

