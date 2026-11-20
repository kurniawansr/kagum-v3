<?php
/**
 * =======================================================================
 * KAGUM - Sistem Informasi Administrasi Guru & Manajemen Madrasah
 * MIN 1 Purbalingga
 * Entry Point Utama untuk LiteSpeed / Apache Web Server
 * =======================================================================
 * File ini memastikan saat domain utama (https://kagum.min1purbalingga.sch.id/)
 * diakses, web server langsung memuat aplikasi Single Page Application (SPA)
 * dan tidak menampilkan halaman direktori ("Index of /").
 */

// Cegah cache berlebih pada file HTML agar pembaruan aplikasi langsung terlihat
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: text/html; charset=UTF-8');

$indexPath = __DIR__ . '/index.html';

if (file_exists($indexPath)) {
    readfile($indexPath);
    exit;
} else {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>KAGUM - File Index Hilang</title></head>';
    echo '<body style="font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">';
    echo '<div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">';
    echo '<h2 style="color:#0f172a;margin-top:0;">File index.html Belum Ditemukan</h2>';
    echo '<p style="color:#64748b;font-size:14px;line-height:1.6;">Pastikan Anda telah mengekstrak seluruh isi file <code>cpanel-siap-upload.zip</code> ke folder domain ini.</p>';
    echo '</div>';
    echo '</body></html>';
    exit;
}
