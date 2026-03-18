import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const imageRoot = path.join(repoRoot, 'images');
const manifestPath = path.join(repoRoot, 'src', 'data', 'image-manifest.json');
const tempRoot = path.join(repoRoot, '.cache', 'image-upload');

function parseEnvFile(content) {
  const entries = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, '');
    entries[key] = value;
  }

  return entries;
}

async function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  try {
    const file = await fs.readFile(envPath, 'utf8');
    return { ...parseEnvFile(file), ...process.env };
  } catch {
    return { ...process.env };
  }
}

async function walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }

      return [fullPath];
    }),
  );

  return files.flat();
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.avif') return 'image/avif';
  return 'application/octet-stream';
}

function convertHeicToJpg(sourcePath, targetPath) {
  const conversion = spawnSync(
    'magick',
    [sourcePath, '-auto-orient', '-strip', '-resize', '1600x1600>', '-quality', '82', targetPath],
    { stdio: 'pipe' },
  );

  if (conversion.status !== 0) {
    const stderr = conversion.stderr?.toString().trim();
    throw new Error(stderr || `ImageMagick failed converting ${path.basename(sourcePath)}`);
  }
}

async function ensureConvertedUpload(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension !== '.heic' && extension !== '.heif') {
    return { uploadPath: sourcePath, uploadExtension: extension };
  }

  const relativePath = path.relative(imageRoot, sourcePath);
  const convertedRelativePath = relativePath.replace(/\.[^.]+$/, '.jpg');
  const convertedPath = path.join(tempRoot, convertedRelativePath);
  await fs.mkdir(path.dirname(convertedPath), { recursive: true });

  try {
    await fs.access(convertedPath);
  } catch {
    convertHeicToJpg(sourcePath, convertedPath);
  }

  return { uploadPath: convertedPath, uploadExtension: '.jpg' };
}

function addManifestEntries(manifest, relativePath, publicUrl, uploadExtension) {
  const normalizedRelative = relativePath.split(path.sep).join('/');
  const baseName = normalizedRelative.replace(/\.[^.]+$/, '');
  const uploadedRelative = `${baseName}${uploadExtension}`;
  const keys = [
    `/images/${normalizedRelative}`,
    `images/${normalizedRelative}`,
    `/images/${uploadedRelative}`,
    `images/${uploadedRelative}`,
    path.basename(normalizedRelative),
    path.basename(baseName),
  ];

  for (const key of keys) {
    manifest[key] = publicUrl;
  }
}

async function main() {
  const env = await loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.SUPABASE_IMAGE_BUCKET || 'product-images';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running this script.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = (await walkFiles(imageRoot)).filter((filePath) => !filePath.toLowerCase().endsWith('.ds_store'));
  const manifest = {};
  let uploadedCount = 0;

  for (const sourcePath of files) {
    const relativePath = path.relative(imageRoot, sourcePath);
    const { uploadPath, uploadExtension } = await ensureConvertedUpload(sourcePath);
    const storagePath = `catalog/${relativePath.replace(/\.[^.]+$/, uploadExtension).split(path.sep).join('/')}`;
    const fileBuffer = await fs.readFile(uploadPath);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: contentTypeFor(uploadPath),
      cacheControl: '3600',
    });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    addManifestEntries(manifest, relativePath, publicUrl, uploadExtension);
    uploadedCount += 1;
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Uploaded ${uploadedCount} images to ${bucket}.`);
  console.log(`Updated manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});