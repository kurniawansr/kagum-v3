<?php
/**
 * REST API Backend for KAGUM App (MySQL / cPanel Integration)
 * File ini ditempatkan di folder root hosting (misal: /public_html/api.php)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =========================================================================
// KONFIGURASI DATABASE MYSQL CPANEL MIN 1 PURBALINGGA
// =========================================================================
$db_host = 'localhost';
$db_name = 'minp1908_kagum';
$db_user = 'minp1908_kagum';
$db_pass = 'Adm1n456';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Otomatis buat tabel app_data jika belum ada di database MySQL
    $pdo->exec("CREATE TABLE IF NOT EXISTS `app_data` (
      `data_key` VARCHAR(100) NOT NULL PRIMARY KEY,
      `data_value` LONGTEXT NOT NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'code' => 'DB_CONNECTION_FAILED',
        'message' => 'Gagal terhubung ke Database MySQL cPanel!',
        'detail' => $e->getMessage(),
        'hint' => 'Pastikan User MySQL minp1908_kagum sudah diberi hak akses (ALL PRIVILEGES) ke database minp1908_kagum di menu MySQL Databases cPanel.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$action = $_GET['action'] ?? 'get_all';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'test' || $action === 'status') {
        $stmt = $pdo->query("SELECT COUNT(*) as total_keys FROM app_data");
        $row = $stmt->fetch();
        echo json_encode([
            'status' => 'success',
            'connected' => true,
            'message' => 'Koneksi ke Database MySQL Berhasil!',
            'db_name' => $db_name,
            'total_keys_stored' => $row['total_keys'] ?? 0
        ], JSON_UNESCAPED_UNICODE);
        exit();
    } elseif ($action === 'get_all') {
        $stmt = $pdo->query("SELECT data_key, data_value FROM app_data");
        $results = $stmt->fetchAll();
        $data = [];
        foreach ($results as $row) {
            $data[$row['data_key']] = json_decode($row['data_value'], true);
        }
        echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
        exit();
    } elseif ($action === 'get_key') {
        $key = $_GET['key'] ?? '';
        $stmt = $pdo->prepare("SELECT data_value FROM app_data WHERE data_key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        if ($row) {
            echo json_encode(['status' => 'success', 'data' => json_decode($row['data_value'], true)], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['status' => 'not_found', 'data' => null], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if ($action === 'save_all' && is_array($input)) {
        $stmt = $pdo->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
        $pdo->beginTransaction();
        foreach ($input as $key => $val) {
            $jsonVal = json_encode($val, JSON_UNESCAPED_UNICODE);
            $stmt->execute([$key, $jsonVal]);
        }
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Data berhasil disimpan ke Database MySQL'], JSON_UNESCAPED_UNICODE);
        exit();
    } elseif ($action === 'save_key' && isset($input['key']) && isset($input['value'])) {
        $stmt = $pdo->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
        $jsonVal = json_encode($input['value'], JSON_UNESCAPED_UNICODE);
        $stmt->execute([$input['key'], $jsonVal]);
        echo json_encode(['status' => 'success', 'message' => "Key {$input['key']} berhasil disimpan ke MySQL"], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

echo json_encode(['status' => 'error', 'message' => 'Action atau Request Method tidak valid'], JSON_UNESCAPED_UNICODE);
