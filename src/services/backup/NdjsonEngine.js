const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { pipeline } = require('stream/promises');
const { EJSON } = require('bson');
const BackupCrypto = require('./backupCrypto');
const logger = require('../../utils/logger');

class NdjsonEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Determine whether a collection should be included
   */
  shouldIncludeCollection(collName, options = {}) {
    const alwaysExclude = ['sessions', 'testmaps'];
    if (alwaysExclude.includes(collName)) return false;

    if (options.excludeAudit) {
      if (collName === 'audit_logs' || collName === 'publish_histories') {
        return false;
      }
    }

    if (options.includeOnly && Array.isArray(options.includeOnly)) {
      return options.includeOnly.includes(collName);
    }

    return true;
  }

  /**
   * Stream a single collection to .ndjson.gz file
   */
  async dumpCollection(collName, outputFilePath) {
    const coll = this.db.collection(collName);
    const cursor = coll.find({});

    const writeStream = fs.createWriteStream(outputFilePath);
    const gzipStream = zlib.createGzip({ level: 6 });

    let count = 0;

    gzipStream.pipe(writeStream);

    for await (const doc of cursor) {
      const line = EJSON.stringify(doc) + '\n';
      if (!gzipStream.write(line)) {
        await new Promise((resolve) => gzipStream.once('drain', resolve));
      }
      count++;
    }

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      gzipStream.end();
    });

    const stat = await fsp.stat(outputFilePath);
    const checksum = await BackupCrypto.calculateFileSha256(outputFilePath);

    return {
      name: collName,
      count,
      sizeBytes: stat.size,
      checksum,
      file: path.basename(outputFilePath),
    };
  }

  /**
   * Restore a single collection from .ndjson.gz file into targetDb
   */
  async restoreCollection(targetDb, collName, inputFilePath, options = {}) {
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Tệp sao lưu không tồn tại: ${inputFilePath}`);
    }

    const coll = targetDb.collection(collName);

    if (options.dropExisting) {
      await coll.drop().catch(() => {});
    }

    const readStream = fs.createReadStream(inputFilePath);
    const gunzipStream = zlib.createGunzip();
    readStream.pipe(gunzipStream);

    const rl = readline.createInterface({
      input: gunzipStream,
      crlfDelay: Infinity,
    });

    let batch = [];
    let insertedCount = 0;
    const BATCH_SIZE = 500;

    for await (const line of rl) {
      if (!line || !line.trim()) continue;
      const doc = EJSON.parse(line);
      batch.push(doc);

      if (batch.length >= BATCH_SIZE) {
        await coll.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await coll.insertMany(batch, { ordered: false });
      insertedCount += batch.length;
      batch = [];
    }

    return {
      name: collName,
      restoredCount: insertedCount,
    };
  }

  /**
   * Run full backup of all collections using NDJSON stream
   */
  async backup(backupDir, options = {}, onProgress = null) {
    const dataDir = path.join(backupDir, 'data');
    await fsp.mkdir(dataDir, { recursive: true });

    const allCollections = await this.db.listCollections().toArray();
    const targetCollections = allCollections
      .map((c) => c.name)
      .filter((name) => this.shouldIncludeCollection(name, options));

    const results = [];
    let processed = 0;

    for (const collName of targetCollections) {
      const outputFilePath = path.join(dataDir, `${collName}.ndjson.gz`);
      logger.info(`[NdjsonEngine] Backing up collection "${collName}"...`);

      const meta = await this.dumpCollection(collName, outputFilePath);
      results.push(meta);
      processed++;

      if (typeof onProgress === 'function') {
        onProgress({
          collection: collName,
          processed,
          total: targetCollections.length,
          count: meta.count,
        });
      }
    }

    return results;
  }

  /**
   * Run restore of collections from backupDir to targetDb
   */
  async restore(targetDb, backupDir, manifestCollections, options = {}, onProgress = null) {
    const dataDir = path.join(backupDir, 'data');
    const results = [];
    let processed = 0;

    for (const collMeta of manifestCollections) {
      const collName = collMeta.name;
      if (!this.shouldIncludeCollection(collName, options)) {
        continue;
      }

      const inputFilePath = path.join(dataDir, collMeta.file || `${collName}.ndjson.gz`);
      logger.info(`[NdjsonEngine] Restoring collection "${collName}" (${collMeta.count} docs)...`);

      const res = await this.restoreCollection(targetDb, collName, inputFilePath, {
        dropExisting: options.inPlace || options.dropExisting,
      });

      results.push(res);
      processed++;

      if (typeof onProgress === 'function') {
        onProgress({
          collection: collName,
          processed,
          total: manifestCollections.length,
          restoredCount: res.restoredCount,
        });
      }
    }

    return results;
  }
}

module.exports = NdjsonEngine;

