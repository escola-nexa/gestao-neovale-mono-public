require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

global.WebSocket = require('ws');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
    process.exit(1);
  }

  // To download from Supabase directly, we need the actual project URL if VITE_SUPABASE_URL is localhost.
  const prodSupabaseUrl = process.env.VITE_SUPABASE_PROJECT_ID 
    ? `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` 
    : supabaseUrl;

  console.log(`Connecting to Supabase at ${prodSupabaseUrl}...`);
  const supabase = createClient(prodSupabaseUrl, supabaseKey);

  console.log('Authenticating with admin user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'coordenacao@neovale.org',
    password: 'Coordenacao22'
  });

  if (authError) {
    console.error('Failed to login to Supabase:', authError.message);
    process.exit(1);
  }
  console.log('Successfully logged in as', authData.user.email);

  const minioClient = new Minio.Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: 'admin',
    secretKey: 'minio_password'
  });

  console.log('Connected to local MinIO.');

  // We use a hardcoded list of known buckets because listBuckets() requires service_role admin privileges
  const bucketNames = [
    'avatars',
    'branding',
    'tickets',
    'absence_attachments',
    'evidencias',
    'hiring_documents',
    'talent_resumes',
    'lesson_materials',
    'route_evidences',
    'professor_documents',
    'chat_attachments',
    'library',
    'financeiro',
    'booklets',
    'school_visits'
  ];

  const buckets = bucketNames.map(name => ({ name }));
  console.log(`Found ${buckets.length} buckets to migrate.`);

  const tempDir = path.join(__dirname, 'tmp_storage');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  for (const bucket of buckets) {
    const minioBucket = bucket.name.replace(/_/g, '-');
    console.log(`\nMigrating bucket: ${bucket.name} (MinIO: ${minioBucket})`);
    
    // Ensure MinIO bucket exists
    const exists = await minioClient.bucketExists(minioBucket).catch(() => false);
    if (!exists) {
      console.log(`Creating bucket ${minioBucket} in MinIO...`);
      await minioClient.makeBucket(minioBucket, 'us-east-1');
      // Make it public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: '*',
            Resource: [`arn:aws:s3:::${minioBucket}/*`]
          }
        ]
      };
      await minioClient.setBucketPolicy(minioBucket, JSON.stringify(policy));
    }

    // Since we don't have recursive list out of the box in Supabase JS sdk, we'll do a simple traverse
    async function migrateFolder(folderPath = '') {
      const { data: files, error: listError } = await supabase.storage.from(bucket.name).list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (listError) {
        console.error(`Error listing folder ${folderPath}:`, listError.message);
        return;
      }

      for (const file of files) {
        // file could be a folder (has id: null)
        const currentPath = folderPath ? `${folderPath}/${file.name}` : file.name;
        
        if (file.id === null) {
          // It's a folder (Supabase returns null id for folders usually, or empty file size)
          // Actually, sometimes it's an empty file. Let's list inside if it's not a real file.
          await migrateFolder(currentPath);
        } else {
          console.log(`Migrating file: ${currentPath} (${file.metadata?.mimetype || 'unknown'})`);
          
          // Download from Supabase
          const { data: downloadData, error: downloadError } = await supabase.storage.from(bucket.name).download(currentPath);
          if (downloadError) {
            console.error(`Failed to download ${currentPath}:`, downloadError.message);
            continue;
          }

          // Convert Blob to Buffer
          const buffer = Buffer.from(await downloadData.arrayBuffer());
          
          // Upload to MinIO
          const metaData = {
            'Content-Type': file.metadata?.mimetype || 'application/octet-stream',
          };

          try {
            await minioClient.putObject(minioBucket, currentPath, buffer, buffer.length, metaData);
            console.log(`  -> Uploaded ${currentPath} to MinIO successfully.`);
          } catch (err) {
            console.error(`  -> Failed to upload ${currentPath} to MinIO:`, err);
          }
        }
      }
    }

    await migrateFolder('');
  }

  console.log('\nMigration of Storage completed successfully!');
}

main().catch(console.error);
