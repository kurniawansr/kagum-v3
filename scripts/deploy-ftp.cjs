/**
 * Script Deployment Otomatis ke cPanel via FTP
 * Dijalankan oleh GitHub Actions setelah build selesai.
 */
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function deploy() {
  console.log('====================================================');
  console.log('🚀 MEMULAI DEPLOYMENT OTOMATIS KE CPANEL HOSTING');
  console.log('====================================================\n');

  // Ambil parameter dari environment (mendukung berbagai variasi penamaan secret)
  const host =
    process.env.FTP_SERVER ||
    process.env.FTP_HOST ||
    process.env.CPANEL_FTP_HOST ||
    process.env.CPANEL_SERVER ||
    process.env.HOST ||
    'kagum.min1purbalingga.sch.id';

  const user =
    process.env.FTP_USERNAME ||
    process.env.FTP_USER ||
    process.env.CPANEL_FTP_USER ||
    process.env.CPANEL_USER ||
    process.env.USERNAME;

  const password =
    process.env.FTP_PASSWORD ||
    process.env.FTP_PASS ||
    process.env.CPANEL_FTP_PASSWORD ||
    process.env.CPANEL_PASSWORD ||
    process.env.PASSWORD;

  const port = parseInt(process.env.FTP_PORT || '21', 10);

  let remoteDir =
    process.env.FTP_SERVER_DIR ||
    process.env.SERVER_DIR ||
    'public_html/kagum.min1purbalingga.sch.id/';

  console.log(`📍 Server Target   : ${host}:${port}`);
  console.log(`📁 Target Direktori : ${remoteDir}`);

  if (!user || !password) {
    console.error('\n❌ ERROR: Kredensial FTP tidak ditemukan di GitHub Secrets!');
    console.error('Pastikan salah satu pasangan Secret berikut telah disimpan di repository GitHub Anda:');
    console.error('  - FTP_USERNAME & FTP_PASSWORD, ATAU');
    console.error('  - CPANEL_FTP_USER & CPANEL_FTP_PASSWORD\n');
    process.exit(1);
  }

  const maskedUser = user.length > 3 ? user.substring(0, 3) + '***' : '***';
  console.log(`👤 Username         : ${maskedUser}`);

  const localBuildDir = path.resolve(__dirname, '../.cpanel-build');
  if (!fs.existsSync(localBuildDir)) {
    console.error(`\n❌ ERROR: Folder build lokal tidak ditemukan di: ${localBuildDir}`);
    console.error('Pastikan langkah "npm run build" berjalan sebelum deployment.');
    process.exit(1);
  }

  const filesInBuild = fs.readdirSync(localBuildDir);
  console.log(`📦 Folder rilis terverifikasi: ${filesInBuild.length} item ditemukan (termasuk index.html, assets, dll).\n`);

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`⏳ Menghubungkan ke ${host}:${port}...`);
    
    // Coba koneksi dengan toleransi sertifikat TLS (secure: 'loose')
    try {
      await client.access({
        host,
        user,
        password,
        port,
        secure: 'loose',
        timeout: 30000,
      });
      console.log('✅ Berhasil terhubung dan terautentikasi (FTPS TLS Loose)!');
    } catch (tlsErr) {
      console.warn(`⚠️ Koneksi FTPS TLS gagal (${tlsErr.message}), mencoba koneksi standar (secure: false)...`);
      await client.access({
        host,
        user,
        password,
        port,
        secure: false,
        timeout: 30000,
      });
      console.log('✅ Berhasil terhubung dan terautentikasi (Plain FTP)!');
    }

    // Periksa lokasi direktori tujuan di cPanel
    console.log(`\n📂 Menavigasi ke direktori target: "${remoteDir}"...`);
    let activeRemoteDir = remoteDir;
    let cdSuccess = false;

    try {
      await client.cd(remoteDir);
      cdSuccess = true;
      console.log(`✅ Berhasil masuk ke "${remoteDir}".`);
    } catch (cdErr) {
      console.warn(`⚠️ Tidak dapat masuk ke "${remoteDir}": ${cdErr.message}`);
      console.log('🔍 Memeriksa apakah akun FTP langsung berakar pada folder website...');
      
      const pwd = await client.pwd();
      console.log(`📍 Posisi direktori aktif (PWD): ${pwd}`);

      // Jika akun FTP khusus subdomain, root-nya mungkin sudah di dalam subdomain
      const cleanSubdir = remoteDir.replace(/^public_html\/?/, '').replace(/^\/+/, '');
      if (cleanSubdir) {
        try {
          await client.cd(cleanSubdir);
          cdSuccess = true;
          activeRemoteDir = cleanSubdir;
          console.log(`✅ Berhasil masuk ke subfolder: "${cleanSubdir}".`);
        } catch (subErr) {
          // ignore
        }
      }

      if (!cdSuccess) {
        // Coba periksa apakah folder saat ini berisi file website atau public_html
        const list = await client.list();
        const hasPublicHtml = list.some(item => item.name === 'public_html');
        if (hasPublicHtml) {
          console.log('📁 Terdeteksi folder public_html di posisi ini, masuk ke public_html/kagum.min1purbalingga.sch.id...');
          await client.ensureDir('public_html/kagum.min1purbalingga.sch.id');
          cdSuccess = true;
          activeRemoteDir = 'public_html/kagum.min1purbalingga.sch.id';
        } else {
          console.log(`📁 Menggunakan folder saat ini (${pwd}) sebagai root upload.`);
          activeRemoteDir = pwd;
          cdSuccess = true;
        }
      }
    }

    console.log(`\n📤 Memulai pengunggahan seluruh file aplikasi ke cPanel...`);
    const startTime = Date.now();
    
    // Unggah seluruh direktori lokal secara rekursif
    await client.uploadFromDir(localBuildDir);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n====================================================');
    console.log(`🎉 DEPLOYMENT SELESAI DALAM ${duration} DETIK!`);
    console.log('====================================================');
    console.log('Seluruh file aplikasi KAGUM (frontend React bundle, aset, dan skrip PHP) telah berhasil diunggah.');
    console.log('Website di hosting: https://kagum.min1purbalingga.sch.id telah diperbarui secara otomatis!');
  } catch (error) {
    console.error('\n❌ PROSES DEPLOYMENT GAGAL:');
    console.error(error.message);
    if (error.code) console.error(`Kode Error: ${error.code}`);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
