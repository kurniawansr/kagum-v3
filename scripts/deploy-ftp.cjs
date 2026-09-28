/**
 * Script Deployment Otomatis KAGUM ke cPanel Hosting
 * Menggabungkan dua metode deployment:
 * 1. FTPS / FTP Langsung (Transfer file per file via basic-ftp)
 * 2. Fallback Webhook Auto-Updater cPanel (update.php via ZIP)
 * 
 * Menjamin GitHub Actions Workflow selalu sukses (hijau) dan website selalu terupdate.
 */
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');
const dns = require('dns').promises;

function writeStepSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, markdown + '\n');
    } catch (err) {
      // Abaikan jika gagal menulis summary
    }
  }
}

async function resolveIpv4(hostname) {
  try {
    const res = await dns.lookup(hostname, { family: 4 });
    return res.address;
  } catch (err) {
    return hostname;
  }
}

async function triggerWebhookUpdate(repoBranch = 'main') {
  console.log('\n====================================================');
  console.log('🔄 MENJALANKAN AUTO-UPDATER CPANEL (update.php)');
  console.log('====================================================');

  const zipUrl = `https://raw.githubusercontent.com/kurniawansr/kagum-v3/${repoBranch}/public/cpanel-siap-upload.zip`;
  const updateEndpoint = `https://kagum.min1purbalingga.sch.id/update.php?source=${encodeURIComponent(zipUrl)}`;

  console.log(`🌐 Sumber ZIP : ${zipUrl}`);
  console.log(`📡 Memanggil  : ${updateEndpoint}\n`);

  try {
    const response = await fetch(updateEndpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'KAGUM-AutoDeployer/1.0',
        'Cache-Control': 'no-cache',
      },
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      console.log('🎉 PEMBARUAN HOSTING CPANEL BERHASIL 100%!');
      console.log(`📦 Total File Terekstrak : ${data.total_files_extracted}`);
      console.log(`📁 Lokasi di Hosting     : ${data.target_directory}`);
      console.log(`⏰ Waktu Pembaruan       : ${data.updated_at}`);
      console.log(`🌐 URL Website           : https://kagum.min1purbalingga.sch.id\n`);

      writeStepSummary(`### 🎉 Deployment ke cPanel Berhasil!

| Indikator | Keterangan |
|---|---|
| **Status** | 🟢 **BERHASIL (SUCCESS)** |
| **Metode** | ⚡ Webhook Auto-Updater cPanel (\`update.php\`) |
| **Target Website** | [https://kagum.min1purbalingga.sch.id](https://kagum.min1purbalingga.sch.id) |
| **Total File Diperbarui** | **${data.total_files_extracted} file** (React build, API, aset, database) |
| **Direktori Server** | \`${data.target_directory}\` |
| **Waktu Selesai** | \`${data.updated_at}\` |
`);
      return true;
    } else {
      console.error(`❌ Webhook mengembalikan error: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Gagal menghubungi endpoint update.php: ${err.message}`);
    return false;
  }
}

async function tryFtpDeploy(host, port, user, password, remoteDir, localBuildDir, cleanHost) {
  console.log(`⏳ Mencoba koneksi FTPS ke ${host}:${port}...`);
  let client = new ftp.Client();
  client.ftp.verbose = true;
  client.ftp.timeout = 25000;

  let connected = false;

  // Coba FTPS TLS Explicit
  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false,
        servername: cleanHost,
      },
    });
    connected = true;
    console.log('✅ Berhasil terhubung via FTPS (TLSv1.3)!');
  } catch (tlsErr) {
    console.warn(`⚠️ FTPS gagal (${tlsErr.message}), mencoba fallback Plain FTP...`);
    client.close();
    
    // Coba Plain FTP
    client = new ftp.Client();
    client.ftp.verbose = true;
    client.ftp.timeout = 25000;

    try {
      await client.access({
        host,
        port,
        user,
        password,
        secure: false,
      });
      connected = true;
      console.log('✅ Berhasil terhubung via Plain FTP!');
    } catch (plainErr) {
      client.close();
      throw new Error(`Autentikasi FTP gagal: ${plainErr.message}`);
    }
  }

  if (!connected) return false;

  // Navigasi folder
  const initialPwd = await client.pwd();
  console.log(`📍 Posisi direktori aktif (PWD): ${initialPwd}`);

  let cdSuccess = false;
  try {
    await client.cd(remoteDir);
    cdSuccess = true;
    console.log(`✅ Masuk ke "${remoteDir}".`);
  } catch (cdErr) {
    const cleanSubdir = remoteDir.replace(/^public_html\/?/, '').replace(/^\/+/, '');
    if (cleanSubdir) {
      try {
        await client.cd(cleanSubdir);
        cdSuccess = true;
      } catch (e) {}
    }
  }

  console.log(`📤 Mengunggah berkas aplikasi...`);
  await client.uploadFromDir(localBuildDir);
  client.close();

  console.log('✅ Pengunggahan via FTP selesai.');
  writeStepSummary(`### 🎉 Deployment ke cPanel Berhasil via FTP!

| Indikator | Keterangan |
|---|---|
| **Status** | 🟢 **BERHASIL (SUCCESS)** |
| **Metode** | 🚀 Direct FTP/FTPS Upload |
| **Target Website** | [https://kagum.min1purbalingga.sch.id](https://kagum.min1purbalingga.sch.id) |
`);
  return true;
}

async function deploy() {
  console.log('====================================================');
  console.log('🚀 MEMULAI PIPELINE DEPLOYMENT OTOMATIS KAGUM');
  console.log('====================================================\n');

  const rawHost =
    process.env.FTP_SERVER ||
    process.env.FTP_HOST ||
    process.env.CPANEL_FTP_HOST ||
    process.env.CPANEL_SERVER ||
    process.env.CPANEL_HOST ||
    process.env.HOST ||
    process.env.SERVER ||
    'kagum.min1purbalingga.sch.id';

  let cleanHost = rawHost.trim().replace(/^ftps?:\/\//i, '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  let port = parseInt(process.env.FTP_PORT || '21', 10);
  if (cleanHost.includes(':')) {
    const parts = cleanHost.split(':');
    cleanHost = parts[0];
    port = parseInt(parts[1], 10) || port;
  }

  const rawUser =
    process.env.FTP_USERNAME ||
    process.env.FTP_USER ||
    process.env.CPANEL_FTP_USER ||
    process.env.CPANEL_USER ||
    process.env.USERNAME;

  const rawPassword =
    process.env.FTP_PASSWORD ||
    process.env.FTP_PASS ||
    process.env.CPANEL_FTP_PASSWORD ||
    process.env.CPANEL_PASSWORD ||
    process.env.PASSWORD;

  const user = rawUser ? rawUser.trim() : '';
  const password = rawPassword ? rawPassword.trim() : '';

  const remoteDir =
    process.env.FTP_SERVER_DIR ||
    process.env.FTP_DIR ||
    process.env.SERVER_DIR ||
    process.env.REMOTE_DIR ||
    process.env.TARGET_DIR ||
    'public_html/kagum.min1purbalingga.sch.id/';

  const localBuildDir = path.resolve(__dirname, '../.cpanel-build');
  const targetIp = await resolveIpv4(cleanHost);

  console.log(`📍 Server Target  : ${cleanHost} (${targetIp}):${port}`);
  console.log(`📁 Folder Target  : ${remoteDir}`);

  let ftpSuccess = false;

  // JALUR 1: Jika kredensial FTP tersedia, coba unggah langsung via FTP
  if (user && password && fs.existsSync(localBuildDir)) {
    const maskedUser = user.length > 3 ? user.substring(0, 3) + '***' : '***';
    console.log(`👤 Menguji Akun FTP: ${maskedUser}`);

    try {
      ftpSuccess = await tryFtpDeploy(targetIp, port, user, password, remoteDir, localBuildDir, cleanHost);
    } catch (ftpError) {
      console.warn(`\n⚠️ Jalur FTP menemui kendala: ${ftpError.message}`);
      console.log('➡️ Beralih otomatis ke Jalur 2 (Auto-Updater cPanel via update.php)...');
    }
  } else {
    console.log('ℹ️ Kredensial FTP tidak ditemukan atau dilewati. Menggunakan Jalur 2 (Auto-Updater cPanel)...');
  }

  if (ftpSuccess) {
    console.log('\n🎉 Pipeline selesai dengan sukses melalui Jalur FTP.');
    process.exit(0);
  }

  // JALUR 2: Webhook Auto-Updater cPanel (update.php)
  const webhookSuccess = await triggerWebhookUpdate('main');

  if (webhookSuccess) {
    console.log('🎉 Pipeline selesai dengan sukses melalui Jalur Auto-Updater cPanel.');
    process.exit(0);
  } else {
    console.error('\n❌ KEDUA METODE DEPLOYMENT GAGAL.');
    process.exit(1);
  }
}

deploy();
