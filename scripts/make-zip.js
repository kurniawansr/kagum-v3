import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const distDir = path.resolve('dist');
const publicDir = path.resolve('public');
const tempBuildDir = path.resolve('.cpanel-build');
const outputZipPath = path.resolve('public/cpanel-siap-upload.zip');

// Clean and recreate temp build dir
if (fs.existsSync(tempBuildDir)) {
  fs.rmSync(tempBuildDir, { recursive: true, force: true });
}
fs.mkdirSync(tempBuildDir, { recursive: true });

// Copy dist/ to tempBuildDir
if (fs.existsSync(distDir)) {
  fs.cpSync(distDir, tempBuildDir, { recursive: true });
}

// Copy public assets if needed (api.php, .htaccess, schema.sql)
const extraFiles = ['api.php', '.htaccess', 'schema.sql', 'favicon.svg', 'favicon.jpg', 'logo.jpg'];
for (const file of extraFiles) {
  const src = path.join(publicDir, file);
  const dest = path.join(tempBuildDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Ensure .htaccess fix for relative paths/SPA in index.html
const indexHtmlPath = path.join(tempBuildDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  // Replace absolute src="/assets..." or href="/assets..." with relative "./assets..." so it works in any folder
  content = content.replace(/src="\/assets\//g, 'src="./assets/').replace(/href="\/assets\//g, 'href="./assets/');
  fs.writeFileSync(indexHtmlPath, content);
}

// Create ZIP
const zip = new JSZip();

function addFilesRecursively(dirPath, zipFolder) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item.endsWith('.zip')) continue;

    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const newZipFolder = zipFolder.folder(item);
      addFilesRecursively(fullPath, newZipFolder);
    } else {
      zipFolder.file(item, fs.readFileSync(fullPath));
    }
  }
}

console.log('Generating ZIP from', tempBuildDir);
addFilesRecursively(tempBuildDir, zip);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }).then((buffer) => {
  fs.writeFileSync(outputZipPath, buffer);
  console.log('Successfully created', outputZipPath, `(${buffer.length} bytes)`);

  const distZipPath = path.resolve('dist/cpanel-siap-upload.zip');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(distZipPath, buffer);
    console.log('Successfully copied zip to', distZipPath);
  }

  // Clean up temp dir
  if (fs.existsSync(tempBuildDir)) {
    fs.rmSync(tempBuildDir, { recursive: true, force: true });
  }
}).catch((err) => {
  console.error('Failed to create ZIP:', err);
  process.exit(1);
});
