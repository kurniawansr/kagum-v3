<?php
/**
 * Script 1-Click Auto Updater KAGUM untuk cPanel
 * Lokasi: /public_html/kagum.min1purbalingga.sch.id/update.php
 *
 * Fungsi: Mengunduh paket ZIP rilis terbaru langsung dari server cloud AI Studio,
 * lalu mengekstraknya secara otomatis tanpa perlu Git atau terminal SSH.
 */

// Matikan error HTML
ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// URL Sumber Rilis Resmi KAGUM dari AI Studio
$defaultBuildUrl = 'https://ais-pre-gxjogmfn7sngsswx2xjtmh-234267802595.asia-east1.run.app/cpanel-siap-upload.zip';

// Jika pengguna mengirimkan URL sumber kustom
$sourceUrl = !empty($_GET['source']) ? trim($_GET['source']) : $defaultBuildUrl;

$targetDir = __DIR__;
$tempZipPath = $targetDir . '/temp_update_' . time() . '.zip';

// Fungsi untuk download file via cURL atau file_get_contents
function downloadFile($url, $dest) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $fp = fopen($dest, 'wb');
        if (!$fp) return false;

        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'KAGUM-Cpanel-Updater/1.0');

        $success = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);

        return ($success && $httpCode === 200 && filesize($dest) > 50000);
    } else {
        $data = @file_get_contents($url);
        if ($data && strlen($data) > 50000) {
            return @file_put_contents($dest, $data) !== false;
        }
    }
    return false;
}

// 1. Unduh file build ZIP
$downloaded = downloadFile($sourceUrl, $tempZipPath);

if (!$downloaded || !file_exists($tempZipPath) || filesize($tempZipPath) < 50000) {
    if (file_exists($tempZipPath)) { @unlink($tempZipPath); }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code' => 'DOWNLOAD_FAILED',
        'message' => 'Gagal mengunduh paket update dari server AI Studio.',
        'source_url' => $sourceUrl,
        'hint' => 'Pastikan server cPanel memiliki akses koneksi keluar (cURL aktif) atau gunakan cara upload file ZIP via File Manager cPanel.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// 2. Ekstrak ZIP ke folder direktori saat ini
if (!class_exists('ZipArchive')) {
    @unlink($tempZipPath);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code' => 'ZIPARCHIVE_NOT_FOUND',
        'message' => 'Ekstensi PHP ZipArchive belum aktif di cPanel Anda.',
        'hint' => 'Masuk ke cPanel -> Select PHP Version -> Extensions -> centang "zip".'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

$zip = new ZipArchive();
if ($zip->open($tempZipPath) === TRUE) {
    // Ekstrak seluruh file (index.html, assets, api.php, .htaccess, dll)
    $zip->extractTo($targetDir);
    $totalFiles = $zip->numFiles;
    $zip->close();

    // Hapus file zip sementara
    @unlink($tempZipPath);

    echo json_encode([
        'status' => 'success',
        'code' => 'UPDATE_COMPLETED',
        'message' => 'Aplikasi KAGUM berhasil diupdate secara otomatis ke versi terbaru!',
        'total_files_extracted' => $totalFiles,
        'target_directory' => $targetDir,
        'updated_at' => date('Y-m-d H:i:s'),
        'hint' => 'Silakan refresh halaman website Anda di browser untuk melihat perubahan.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
} else {
    @unlink($tempZipPath);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code' => 'EXTRACTION_FAILED',
        'message' => 'Gagal membuka atau mengekstrak file ZIP di server hosting.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}
