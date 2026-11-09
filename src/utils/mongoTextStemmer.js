'use strict';

/**
 * MongoDB Text Search Stemmer Helper (DEC-049 / Phase L1)
 * Maps BCP 47 language codes to MongoDB-supported stemmer languages.
 * Defaults/fallbacks to 'none' for unsupported languages (including Vietnamese 'vi').
 */

const MONGO_STEMMERS = {
  da: 'danish',
  nl: 'dutch',
  en: 'english',
  fi: 'finnish',
  fr: 'french',
  de: 'german',
  hu: 'hungarian',
  it: 'italian',
  nb: 'norwegian',
  nn: 'norwegian',
  no: 'norwegian',
  pt: 'portuguese',
  ro: 'romanian',
  ru: 'russian',
  es: 'spanish',
  sv: 'swedish',
  tr: 'turkish',
};

/**
 * Get MongoDB text index stemmer for a given BCP 47 code
 * @param {string} bcp47Code
 * @returns {string} MongoDB stemmer language or 'none'
 */
function getMongoStemmer(bcp47Code) {
  if (!bcp47Code || typeof bcp47Code !== 'string') {
    return 'none';
  }

  const clean = bcp47Code.trim().toLowerCase();
  const primaryTag = clean.split('-')[0];

  if (MONGO_STEMMERS[primaryTag]) {
    return MONGO_STEMMERS[primaryTag];
  }

  return 'none';
}

module.exports = {
  MONGO_STEMMERS,
  getMongoStemmer,
};

