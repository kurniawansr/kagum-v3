/**
 * Script Deployment Otomatis ke cPanel via FTP / FTPS
 * Dijalankan oleh GitHub Actions setelah kompilasi build selesai.
 */
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');
const dns = require('dns').promises;

async function resolveIpv4(hostname) {
  try {
    const res = await dns.lookup(hostname, { family: 4 });
    return res.address;
  } catch (err) {
    return hostname;
  }
}

async function connectClient(host, port, user, password, servername) {
  // Strategi 1: Explicit FTPS (TLSv1.2/1.3) dengan toleransi sertifikat
  console.log(`⏳ Menghubungkan ke ${host}:${port} menggunakan FTPS (Explicit TLS)...`);
  let client = new ftp.Client();
  client.ftp.verbose = true;
  client.ftp.timeout = 45000;

  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false,
        servername: servername || undefined,
      },
    });
    console.log('✅ Berhasil terhubung dan terautentikasi (FTPS TLS Terproteksi)!');
    return client;
  } catch (tlsErr) {
    console.warn(`⚠️ FTPS gagal (${tlsErr.message}). Mencoba fallback Plain FTP...`);
    client.close();
  }

  // Strategi 2: Plain FTP jika server menolak negosiasi TLS
  client = new ftp.Client();
  client.ftp.verbose = true;
  client.ftp.timeout = 45000;

  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure: false,
    });
    console.log('✅ Berhasil terhubung dan terautentikasi (Plain FTP)!');
    return client;
  } catch (plainErr) {
    client.close();
    throw new Error(`Koneksi FTP & FTPS gagal: ${plainErr.message}`);
  }
}

async function deploy() {
  console.log('====================================================');
  console.log('🚀 MEMULAI DEPLOYMENT OTOMATIS KE CPANEL HOSTING');
  console.log('====================================================\n');

  // Ambil parameter host dari environment
  let rawHost =
    process.env.FTP_SERVER ||
    process.env.FTP_HOST ||
    process.env.CPANEL_FTP_HOST ||
    process.env.CPANEL_SERVER ||
    process.env.CPANEL_HOST ||
    process.env.HOST ||
    process.env.SERVER ||
    'kagum.min1purbalingga.sch.id';

  // Bersihkan format host jika pengguna memasukkan url seperti ftp:// atau port di belakang
  let cleanHost = rawHost.trim().replace(/^ftps?:\/\//i, '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  let port = parseInt(process.env.FTP_PORT || '21', 10);
  if (cleanHost.includes(':')) {
    const parts = cleanHost.split(':');
    cleanHost = parts[0];
    port = parseInt(parts[1], 10) || port;
  }

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

  let remoteDir =
    process.env.FTP_SERVER_DIR ||
    process.env.FTP_DIR ||
    process.env.SERVER_DIR ||
    process.env.REMOTE_DIR ||
    process.env.TARGET_DIR ||
    'public_html/kagum.min1purbalingga.sch.id/';

  console.log(`📍 Hostname Target  : ${cleanHost}:${port}`);
  
  // Resolve ke IPv4 secara eksplisit untuk mencegah masalah passive port pada IPv6
  const targetIp = await resolveIpv4(cleanHost);
  if (targetIp !== cleanHost) {
    console.log(`🌐 Resolved IPv4    : ${targetIp}`);
  }
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

  let client;
  try {
    // Hubungkan menggunakan IP IPv4 jika berhasil di-resolve, atau hostname aslinya
    client = await connectClient(targetIp, port, user, password, cleanHost);

    // Navigasi ke direktori target di cPanel
    console.log(`\n📂 Menavigasi ke direktori target: "${remoteDir}"...`);
    let activeRemoteDir = remoteDir;
    let cdSuccess = false;

    // Cek posisi awal direktori (PWD)
    const initialPwd = await client.pwd();
    console.log(`📍 Posisi direktori awal (PWD): ${initialPwd}`);

    // Coba masuk ke remoteDir yang diminta
    try {
      await client.cd(remoteDir);
      cdSuccess = true;
      console.log(`✅ Berhasil masuk ke "${remoteDir}".`);
    } catch (cdErr) {
      console.warn(`⚠️ Tidak dapat langsung masuk ke "${remoteDir}": ${cdErr.message}`);
      console.log('🔍 Menganalisis struktur direktori akun FTP...');

      // Jika akun FTP dibuat khusus subdomain di cPanel, folder root-nya sudah di dalam subdomain
      const cleanSubdir = remoteDir.replace(/^public_html\/?/, '').replace(/^\/+/, '');
      if (cleanSubdir) {
        try {
          await client.cd(cleanSubdir);
          cdSuccess = true;
          activeRemoteDir = cleanSubdir;
          console.log(`✅ Berhasil masuk ke subfolder: "${cleanSubdir}".`);
        } catch (subErr) {
          // Lewati
        }
      }

      if (!cdSuccess) {
        // Cek isi direktori saat ini
        const list = await client.list();
        const hasPublicHtml = list.some((item) => item.name === 'public_html');
        const hasExistingApp = list.some((item) => item.name === 'index.html' || item.name === 'api.php');

        if (hasExistingApp) {
          console.log(`📁 Akun FTP sudah berakar langsung pada folder aplikasi website (${initialPwd}). Menggunakan posisi ini.`);
          activeRemoteDir = initialPwd;
          cdSuccess = true;
        } else if (hasPublicHtml) {
          console.log('📁 Terdeteksi folder public_html di posisi ini, menavigasi ke public_html/kagum.min1purbalingga.sch.id...');
          await client.ensureDir('public_html/kagum.min1purbalingga.sch.id');
          cdSuccess = true;
          activeRemoteDir = 'public_html/kagum.min1purbalingga.sch.id';
        } else {
          console.log(`📁 Menggunakan folder aktif (${initialPwd}) sebagai target pengunggahan.`);
          activeRemoteDir = initialPwd;
          cdSuccess = true;
        }
      }
    }

    console.log(`\n📤 Memulai pengunggahan seluruh file aplikasi ke cPanel (${activeRemoteDir})...`);
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
    console.error(`Pesan: ${error.message}`);
    if (error.code) console.error(`Kode Error: ${error.code}`);

    if (error.code === 530 || error.message.includes('530')) {
      console.error('\n💡 PETUNJUK KREDENSIAL:');
      console.error('Server menolak login (530 Authentication failed).');
      console.error('1. Jika menggunakan Akun FTP khusus cPanel, pastikan username berformat lengkap: user@domain (misal: sulis@kagum.min1purbalingga.sch.id).');
      console.error('2. Pastikan password di GitHub Secrets (FTP_PASSWORD) cocok dengan password akun FTP di cPanel.');
    } else if (error.code === 425 || error.message.includes('425')) {
      console.error('\n💡 PETUNJUK PORT PASSIVE (425):');
      console.error('Koneksi data diblokir firewall hosting. Pastikan Pure-FTPd di cPanel membuka Passive Port Range (biasanya 49152-65534).');
    }

    process.exit(1);
  } finally {
    if (client) {
      client.close();
    }
  }
}

deploy();
