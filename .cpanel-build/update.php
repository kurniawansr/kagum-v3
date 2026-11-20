<?php
/**
 * Script 1-Click Auto Updater KAGUM untuk cPanel
 * Lokasi: /public_html/.../update.php
 *
 * Fungsi:
 * 1. Menerima file cpanel-siap-upload.zip via POST dari aplikasi KAGUM atau form web,
 *    lalu mengekstraknya secara otomatis tanpa perlu membuka File Manager cPanel.
 * 2. Menyediakan tampilan Web Updater ramah pengguna jika dibuka langsung di browser.
 */

ini_set('display_errors', '0');
error_reporting(0);

// Set header CORS agar bisa dipanggil langsung dari aplikasi KAGUM
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$isJsonRequest = (
    (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) ||
    (isset($_GET['format']) && $_GET['format'] === 'json') ||
    (isset($_POST['format']) && $_POST['format'] === 'json')
);

$targetDir = __DIR__;
$tempZipPath = $targetDir . '/temp_update_' . time() . '.zip';

// Fungsi helper ekstrak ZIP
function extractPackage($zipPath, $targetPath) {
    if (!class_exists('ZipArchive')) {
        return ['success' => false, 'code' => 'ZIPARCHIVE_NOT_FOUND', 'message' => 'Ekstensi PHP ZipArchive belum aktif di cPanel Anda. Silakan aktifkan via cPanel -> Select PHP Version -> Extensions.'];
    }

    $zip = new ZipArchive();
    $res = $zip->open($zipPath);
    if ($res === true) {
        $zip->extractTo($targetPath);
        $totalFiles = $zip->numFiles;
        $zip->close();
        @unlink($zipPath);
        return ['success' => true, 'total' => $totalFiles];
    } else {
        @unlink($zipPath);
        return ['success' => false, 'code' => 'EXTRACTION_FAILED', 'message' => 'Gagal membuka atau mengekstrak file ZIP di server hosting.'];
    }
}

// -------------------------------------------------------------
// JIKA METODE REQUEST ADALAH POST (KIRIM FILE ZIP)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploaded = false;

    if (!empty($_FILES['zip']['tmp_name']) && is_uploaded_file($_FILES['zip']['tmp_name'])) {
        if (move_uploaded_file($_FILES['zip']['tmp_name'], $tempZipPath)) {
            $uploaded = true;
        }
    }

    if (!$uploaded || !file_exists($tempZipPath) || filesize($tempZipPath) < 10000) {
        if (file_exists($tempZipPath)) { @unlink($tempZipPath); }
        if ($isJsonRequest) {
            http_response_code(400);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'code' => 'NO_VALID_ZIP',
                'message' => 'File ZIP pembaruan tidak ditemukan atau ukurannya tidak valid.'
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit();
        } else {
            $errorMessage = 'File cpanel-siap-upload.zip yang dipilih tidak valid atau gagal diunggah.';
        }
    } else {
        $result = extractPackage($tempZipPath, $targetDir);

        if ($result['success']) {
            if ($isJsonRequest) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'status' => 'success',
                    'code' => 'UPDATE_COMPLETED',
                    'message' => 'Aplikasi KAGUM berhasil diperbarui secara otomatis ke versi terbaru!',
                    'total_files_extracted' => $result['total'],
                    'updated_at' => date('Y-m-d H:i:s'),
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit();
            } else {
                $successMessage = 'Alhamdulillah, pembaruan KAGUM berhasil dipasang (' . $result['total'] . ' file diekstrak)!';
            }
        } else {
            if ($isJsonRequest) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'status' => 'error',
                    'code' => $result['code'],
                    'message' => $result['message']
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit();
            } else {
                $errorMessage = $result['message'];
            }
        }
    }
}

// -------------------------------------------------------------
// JIKA REQUEST JSON VIA GET (CONTOH DARI TOOL API)
// -------------------------------------------------------------
if ($isJsonRequest && $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'ready',
        'message' => 'Endpoint Web Updater KAGUM siap menerima file cpanel-siap-upload.zip via POST.',
        'php_version' => phpversion(),
        'zip_archive_active' => class_exists('ZipArchive'),
        'target_directory' => $targetDir,
        'is_writable' => is_writable($targetDir),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// -------------------------------------------------------------
// TAMPILAN WEB INTERFACE (HTML) JIKA DIBUKA DI BROWSER
// -------------------------------------------------------------
$hasZipExt = class_exists('ZipArchive');
$isWritable = is_writable($targetDir);
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KAGUM — 1-Click Auto Updater</title>
  <style>
    :root {
      --primary: #065f46;
      --primary-hover: #047857;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --success-bg: #ecfdf5;
      --success-border: #a7f3d0;
      --success-text: #065f46;
      --error-bg: #fef2f2;
      --error-border: #fecaca;
      --error-text: #991b1b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; max-width: 520px; width: 100%; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
    .status-box { display: flex; justify-content: space-around; background: #f1f5f9; border-radius: 16px; padding: 12px; margin-bottom: 20px; font-size: 11px; font-weight: 600; text-align: center; }
    .status-item span { display: block; color: var(--text-muted); font-size: 10px; margin-bottom: 2px; }
    .dropzone { border: 2px dashed #cbd5e1; border-radius: 18px; padding: 28px 16px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s; margin-bottom: 18px; }
    .dropzone:hover, .dropzone.dragover { border-color: var(--primary); background: #f0fdf4; }
    .dropzone-icon { font-size: 36px; margin-bottom: 8px; }
    .dropzone-text { font-size: 13px; font-weight: 700; color: #334155; }
    .dropzone-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .btn { display: block; width: 100%; background: var(--primary); color: white; border: none; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; text-align: center; text-decoration: none; }
    .btn:hover { background: var(--primary-hover); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert { padding: 14px; border-radius: 14px; font-size: 12px; line-height: 1.5; margin-bottom: 18px; font-weight: 600; }
    .alert-success { background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text); }
    .alert-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text); }
    .footer { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 24px; }
    #selected-file-name { font-size: 12px; font-weight: 700; color: #065f46; margin-top: 8px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">KAGUM AUTO-UPDATER</div>
      <h1 class="title">Pasang Pembaruan Aplikasi</h1>
      <p class="subtitle">Ekstrak otomatis paket pembaruan tanpa perlu membuka File Manager cPanel.</p>
    </div>

    <div class="status-box">
      <div class="status-item">
        <span>PHP VERSION</span>
        <?= phpversion(); ?>
      </div>
      <div class="status-item">
        <span>ZIP EXTENSION</span>
        <?= $hasZipExt ? '✅ Aktif' : '❌ Mati'; ?>
      </div>
      <div class="status-item">
        <span>IZIN FOLDER</span>
        <?= $isWritable ? '✅ Siap Tulis' : '❌ Read-Only'; ?>
      </div>
    </div>

    <?php if (!empty($successMessage)): ?>
      <div class="alert alert-success">
        🎉 <?= htmlspecialchars($successMessage); ?><br><br>
        Halaman aplikasi akan dimuat kembali dalam <strong><span id="countdown">3</span> detik</strong>...
      </div>
      <a href="index.html" class="btn">Buka Aplikasi KAGUM Sekarang</a>
      <script>
        var count = 3;
        var interval = setInterval(function() {
          count--;
          document.getElementById('countdown').innerText = count;
          if (count <= 0) {
            clearInterval(interval);
            window.location.href = 'index.html?updated=' + Date.now();
          }
        }, 1000);
      </script>
    <?php else: ?>
      <?php if (!empty($errorMessage)): ?>
        <div class="alert alert-error">
          ⚠️ <?= htmlspecialchars($errorMessage); ?>
        </div>
      <?php endif; ?>

      <form method="POST" enctype="multipart/form-data" id="upload-form">
        <input type="file" name="zip" id="zip-input" accept=".zip" style="display: none;" required>

        <div class="dropzone" id="dropzone" onclick="document.getElementById('zip-input').click();">
          <div class="dropzone-icon">📦</div>
          <div class="dropzone-text">Pilih atau Seret File <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">cpanel-siap-upload.zip</code></div>
          <div class="dropzone-sub">Klik di sini untuk memilih file dari komputer atau HP Anda</div>
          <div id="selected-file-name"></div>
        </div>

        <button type="submit" class="btn" id="submit-btn" disabled>
          ⚡ Pasang Pembaruan Sekarang
        </button>
      </form>
    <?php endif; ?>

    <div class="footer">
      KAGUM &copy; MIN 1 Purbalingga &bull; Versi Web Updater 2.0
    </div>
  </div>

  <script>
    const input = document.getElementById('zip-input');
    const dropzone = document.getElementById('dropzone');
    const btn = document.getElementById('submit-btn');
    const fileNameDisplay = document.getElementById('selected-file-name');

    if (input) {
      input.addEventListener('change', function() {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          fileNameDisplay.innerText = '📄 Terpilih: ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
          fileNameDisplay.style.display = 'block';
          btn.disabled = false;
        }
      });

      // Drag and drop support
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
        }, false);
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          input.files = files;
          const file = files[0];
          fileNameDisplay.innerText = '📄 Terpilih: ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
          fileNameDisplay.style.display = 'block';
          btn.disabled = false;
        }
      });
    }
  </script>
</body>
</html>
