import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, CATEGORY_PREFIXES } from '../src/data/catalog-config.js';
import { PRODUCTS as LEGACY_PRODUCTS } from '../products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const imagesRoot = path.join(repoRoot, 'images');
const seedPath = path.join(repoRoot, 'src', 'data', 'catalog-seed.json');
const manifestPath = path.join(repoRoot, 'src', 'data', 'image-manifest.json');

const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));
const categoryPrefixEntries = Object.entries(CATEGORY_PREFIXES).flatMap(([categoryId, prefixes]) =>
  prefixes.map((prefix) => [normalize(prefix), categoryId]),
);

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tokenize(value) {
  return normalize(value).split(' ').filter(Boolean);
}

function findPhrase(tokens, phrases) {
  let bestMatch = null;

  for (const phrase of phrases) {
    const phraseTokens = tokenize(phrase.value);
    if (!phraseTokens.length) {
      continue;
    }

    for (let start = 0; start <= tokens.length - phraseTokens.length; start += 1) {
      const matches = phraseTokens.every((token, index) => tokens[start + index] === token);
      if (!matches) {
        continue;
      }

      const candidate = {
        start,
        end: start + phraseTokens.length,
        value: phrase.value,
      };

      if (!bestMatch || candidate.start < bestMatch.start || (candidate.start === bestMatch.start && phraseTokens.length > (bestMatch.end - bestMatch.start))) {
        bestMatch = candidate;
      }
    }
  }

  return bestMatch;
}

function removeSpan(tokens, span) {
  if (!span) {
    return [...tokens];
  }

  return tokens.filter((_, index) => index < span.start || index >= span.end);
}

function detectCategory(baseName) {
  const normalized = normalize(baseName);

  for (const [prefix, categoryId] of categoryPrefixEntries) {
    if (normalized === prefix || normalized.startsWith(`${prefix} `)) {
      const remainder = normalized.slice(prefix.length).trim();
      return { categoryId, remainder, recognized: true };
    }
  }

  return { categoryId: 'grocery', remainder: normalized, recognized: false };
}

function parseImageName(fileName) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const { categoryId, remainder, recognized } = detectCategory(baseName);
  const category = categoryById.get(categoryId);
  const tokens = tokenize(remainder);

  const brandMatch = findPhrase(
    tokens,
    (category?.brands ?? []).map((value) => ({ value })),
  );
  const tokensWithoutBrand = removeSpan(tokens, brandMatch);
  const subcategoryMatch = findPhrase(
    tokensWithoutBrand,
    (category?.subcategories ?? []).map((value) => ({ value })),
  );
  const remainingTokens = removeSpan(tokensWithoutBrand, subcategoryMatch);

  const brand = brandMatch?.value ?? '';
  const subcategory = subcategoryMatch?.value ?? '';
  const name = remainingTokens.length
    ? titleCase(remainingTokens.join(' '))
    : titleCase(subcategory ? tokensWithoutBrand.join(' ') : tokens.join(' '));

  return {
    category: categoryId,
    brand,
    subcategory,
    name: name || titleCase(baseName.replace(/[-_]+/g, ' ')),
    visible: recognized,
    image: `images/${fileName}`,
    sourceFile: fileName,
    recognized,
  };
}

function convertHeicToJpg(sourcePath, targetPath) {
  const conversion = spawnSync(
    'magick',
    [sourcePath, '-auto-orient', '-strip', '-resize', '1400x1400>', '-quality', '82', targetPath],
    { stdio: 'pipe' },
  );

  if (conversion.status !== 0) {
    const stderr = conversion.stderr?.toString().trim();
    throw new Error(stderr || `No se pudo convertir ${path.basename(sourcePath)} a JPG.`);
  }
}

async function ensureDisplayImage(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension !== '.heic' && extension !== '.heif') {
    return fileName;
  }

  const sourcePath = path.join(imagesRoot, fileName);
  const jpgName = `${path.basename(fileName, path.extname(fileName))}.jpg`;
  const targetPath = path.join(imagesRoot, jpgName);

  try {
    await fs.access(targetPath);
  } catch {
    convertHeicToJpg(sourcePath, targetPath);
  }

  return jpgName;
}

function buildLegacyManifestEntries(products, parsedImages) {
  const manifest = {};
  const parsedByLookup = new Map(
    parsedImages.map((item) => [normalize(`${item.category}|${item.brand}|${item.name}`), item]),
  );

  LEGACY_PRODUCTS.forEach((product) => {
    const key = normalize(`${product.category}|${product.brand}|${product.name}`);
    const match = parsedByLookup.get(key);

    if (!match) {
      return;
    }

    manifest[`/${product.image}`] = `/${match.image}`;
    manifest[product.image] = `/${match.image}`;
    manifest[path.basename(product.image)] = `/${match.image}`;
    manifest[path.basename(product.image, path.extname(product.image))] = `/${match.image}`;
  });

  parsedImages.forEach((item) => {
    manifest[`/${item.image}`] = `/${item.image}`;
    manifest[item.image] = `/${item.image}`;
    manifest[item.sourceFile] = `/${item.image}`;
    manifest[path.basename(item.sourceFile, path.extname(item.sourceFile))] = `/${item.image}`;
  });

  return manifest;
}

async function main() {
  const imageFiles = (await fs.readdir(imagesRoot))
    .filter((fileName) => /\.(heic|heif|jpg|jpeg|png|webp|avif)$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  const groupedByBaseName = new Map();

  imageFiles.forEach((fileName) => {
    const baseName = path.basename(fileName, path.extname(fileName)).toLowerCase();
    const files = groupedByBaseName.get(baseName) ?? [];
    files.push(fileName);
    groupedByBaseName.set(baseName, files);
  });

  const preferredFiles = [];

  for (const files of groupedByBaseName.values()) {
    const preferredExisting =
      files.find((fileName) => /\.(jpg|jpeg|png|webp|avif)$/i.test(fileName)) ?? files[0];
    const displayFile = await ensureDisplayImage(preferredExisting);
    preferredFiles.push(displayFile);
  }

  const parsedImages = preferredFiles
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const parsed = parseImageName(fileName);
      parsed.image = `images/${fileName}`;
      parsed.displayFile = fileName;
      return parsed;
    });
  const seedProducts = parsedImages.map((item, index) => ({
    id: 1000 + index,
    name: item.name,
    brand: item.brand,
    sku: '',
    unit_size: '',
    category: item.category,
    subcategory: item.subcategory,
    description: '',
    image: item.image,
    visible: item.visible,
    featured: false,
    sort_order: index,
    metadata: {
      source_file: item.sourceFile,
      generated_from_image_name: true,
      needs_review: !item.recognized,
    },
  }));

  const manifest = buildLegacyManifestEntries(seedProducts, parsedImages);

  await fs.writeFile(seedPath, `${JSON.stringify(seedProducts, null, 2)}\n`, 'utf8');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Generated ${seedProducts.length} seed products.`);
  console.log(`Updated ${seedPath}`);
  console.log(`Updated ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});