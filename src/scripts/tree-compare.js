'use strict';

/**
 * Treecraft CMS - Content Tree Parity Comparator (DEC-058 / Phase S-Parity)
 * Compares two trees (snapshot manifest or active Mongo database)
 * Returns exit code 0 if 100% parity is achieved, non-zero on discrepancy.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

function hashObject(obj) {
  if (!obj) return null;
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

async function loadTreeSource(sourceStr) {
  if (!sourceStr) {
    throw new Error('Source string cannot be empty');
  }

  // Check if it is a JSON file
  if (fs.existsSync(sourceStr)) {
    const raw = fs.readFileSync(sourceStr, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.nodes || parsed;
  }

  // Treat as MongoDB URI
  const conn = await mongoose.createConnection(sourceStr, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  try {
    const items = await conn.collection('items_master').find({ deleted: { $ne: true } }).sort({ path: 1 }).toArray();
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
    await conn.close();
    return nodes;
  } catch (err) {
    await conn.close();
    throw err;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let a = null;
  let b = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--a' && i + 1 < args.length) a = args[i + 1];
    if (args[i] === '--b' && i + 1 < args.length) b = args[i + 1];
    if (args[i].startsWith('--a=')) a = args[i].slice(4);
    if (args[i].startsWith('--b=')) b = args[i].slice(4);
  }
  return { a, b };
}

async function compareTrees(sourceA, sourceB) {
  console.log(`[tree:compare] Loading Source A: ${sourceA}...`);
  const nodesA = await loadTreeSource(sourceA);
  console.log(`[tree:compare] Loading Source B: ${sourceB}...`);
  const nodesB = await loadTreeSource(sourceB);

  console.log(`\n=== KẾT QUẢ ĐỐI SOÁT CÂY NỘI DUNG (TREE PARITY) ===`);
  console.log(`Source A total nodes: ${nodesA.length}`);
  console.log(`Source B total nodes: ${nodesB.length}`);

  const mapA = new Map(nodesA.map((n) => [n.id, n]));
  const mapB = new Map(nodesB.map((n) => [n.id, n]));

  const missingInB = [];
  const extraInB = [];
  const modified = [];

  for (const [id, nodeA] of mapA.entries()) {
    if (!mapB.has(id)) {
      missingInB.push(nodeA);
    } else {
      const nodeB = mapB.get(id);
      const diffs = [];
      if (nodeA.path !== nodeB.path) diffs.push(`path: "${nodeA.path}" != "${nodeB.path}"`);
      if (nodeA.name !== nodeB.name) diffs.push(`name: "${nodeA.name}" != "${nodeB.name}"`);
      if (nodeA.templateId !== nodeB.templateId) diffs.push(`templateId: "${nodeA.templateId}" != "${nodeB.templateId}"`);
      if (nodeA.sortOrder !== nodeB.sortOrder) diffs.push(`sortOrder: ${nodeA.sortOrder} != ${nodeB.sortOrder}`);
      if (nodeA.hasPresentation !== nodeB.hasPresentation) diffs.push(`hasPresentation: ${nodeA.hasPresentation} != ${nodeB.hasPresentation}`);
      if (diffs.length > 0) {
        modified.push({ id, path: nodeA.path, diffs });
      }
    }
  }

  for (const [id, nodeB] of mapB.entries()) {
    if (!mapA.has(id)) {
      extraInB.push(nodeB);
    }
  }

  const isIdentical = missingInB.length === 0 && extraInB.length === 0 && modified.length === 0;

  if (isIdentical) {
    console.log(`\n✅ PARITY 100%: Hai cây nội dung hoàn toàn đồng nhất tuyệt đối! (${nodesA.length} nodes)`);
    return true;
  } else {
    console.error(`\n❌ PARITY MISMATCH: Phát hiện sai lệch giữa hai cây nội dung!`);
    if (missingInB.length > 0) {
      console.error(`\nNodes thiếu trong B (${missingInB.length}):`);
      missingInB.forEach((m) => console.error(`  - [${m.id}] ${m.path} (${m.name})`));
    }
    if (extraInB.length > 0) {
      console.error(`\nNodes thừa trong B (${extraInB.length}):`);
      extraInB.forEach((m) => console.error(`  + [${m.id}] ${m.path} (${m.name})`));
    }
    if (modified.length > 0) {
      console.error(`\nNodes bị thay đổi (${modified.length}):`);
      modified.forEach((m) => {
        console.error(`  * [${m.id}] ${m.path}:`);
        m.diffs.forEach((d) => console.error(`      ${d}`));
      });
    }
    return false;
  }
}

if (require.main === module) {
  const { a, b } = parseArgs();
  if (!a || !b) {
    console.error('Usage: npm run tree:compare -- --a <sourceA> --b <sourceB>');
    console.error('Example: npm run tree:compare -- --a starter/corporate/tree.manifest.json --b starter/corporate/tree.manifest.json');
    process.exit(1);
  }

  compareTrees(a, b)
    .then((identical) => {
      process.exit(identical ? 0 : 2);
    })
    .catch((err) => {
      console.error('Compare execution failed:', err);
      process.exit(1);
    });
}

module.exports = { compareTrees, loadTreeSource };

