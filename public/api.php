<?php
/**
 * REST API Backend for KAGUM App (MySQL / cPanel Integration)
 * File ini ditempatkan di folder root hosting (misal: /public_html/api.php)
 * Kompatibel dengan PHP 7.4, 8.0, 8.1, 8.2, 8.3+
 */

// Matikan tampilan error HTML agar tidak merusak output JSON
ini_set('display_errors', '0');
error_reporting(0);

// Mulai buffer output untuk membersihkan output tidak terduga
ob_start();

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code(200);
    exit();
}

// Helper untuk mengirim response JSON yang bersih
function sendJsonResponse($data, $statusCode = 200) {
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// Handler khusus download ZIP tanpa memerlukan koneksi database
if (isset($_GET['action']) && $_GET['action'] === 'download_zip') {
    $zipPath = __DIR__ . '/cpanel-siap-upload.zip';
    if (file_exists($zipPath) && filesize($zipPath) > 100000) {
        while (ob_get_level()) { ob_end_clean(); }
        header('Content-Type: application/zip');
        header('Content-Length: ' . filesize($zipPath));
        header('Content-Disposition: attachment; filename="cpanel-siap-upload.zip"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        readfile($zipPath);
        exit();
    } else {
        sendJsonResponse([
            'status' => 'error',
            'code' => 'ZIP_NOT_FOUND',
            'message' => 'File cpanel-siap-upload.zip tidak ditemukan di folder hosting ini.'
        ], 404);
    }
}

// =========================================================================
// KONFIGURASI DATABASE MYSQL CPANEL
// =========================================================================
$db_host = 'localhost';
$db_name = 'minp1908_kagum';
$db_user = 'minp1908_kagum';
$db_pass = 'Adm1n456';

// Cek jika ada file konfigurasi terpisah (db_config.php)
if (file_exists(__DIR__ . '/db_config.php')) {
    @include __DIR__ . '/db_config.php';
}

// Cek parameter testing kredensial khusus dari request jika ada
if (isset($_GET['test_host']) && !empty($_GET['test_host'])) {
    $db_host = trim($_GET['test_host']);
}
if (isset($_GET['test_db']) && !empty($_GET['test_db'])) {
    $db_name = trim($_GET['test_db']);
}
if (isset($_GET['test_user']) && !empty($_GET['test_user'])) {
    $db_user = trim($_GET['test_user']);
}
if (isset($_GET['test_pass'])) {
    $db_pass = trim($_GET['test_pass']);
}

// =========================================================================
// CEK EKSTENSI PHP UNTUK MYSQL (PHP 8.1 / 8.2 COMPATIBILITY)
// =========================================================================
$has_pdo = extension_loaded('pdo') && extension_loaded('pdo_mysql');
$has_mysqli = extension_loaded('mysqli');

if (!$has_pdo && !$has_mysqli) {
    sendJsonResponse([
        'status' => 'error',
        'code' => 'PHP_EXTENSION_MISSING',
        'php_version' => phpversion(),
        'message' => 'Ekstensi MySQL belum diaktifkan di PHP ' . phpversion() . ' cPanel Anda!',
        'detail' => 'Ekstensi pdo_mysql dan mysqli tidak aktif di PHP saat ini.',
        'hint' => 'Buka cPanel -> Masuk ke "Select PHP Version" -> Klik tab "Extensions" -> Centang ekstensi: pdo_mysql, mysqli, dan nd_pdo_mysql.'
    ], 200);
}

// =========================================================================
// KONEKSI DATABASE (DENGAN RECOVERY AUTO-FALLBACK)
// =========================================================================
$pdo = null;
$mysqli = null;
$connection_error = '';
$driver_used = '';
$connected_host = $db_host;

// Coba koneksi menggunakan PDO terlebih dahulu
if ($has_pdo) {
    // Percobaan 1: Menggunakan host yang ditentukan (misal: localhost)
    try {
        $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]);
        $driver_used = 'pdo_mysql (' . $db_host . ')';
    } catch (Throwable $e) {
        $connection_error = $e->getMessage();
        
        // Jika gagal karena socket localhost di PHP 8.1/8.2, coba dengan 127.0.0.1 (TCP port 3306)
        if ($db_host === 'localhost') {
            try {
                $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 5
                ]);
                $connected_host = '127.0.0.1';
                $driver_used = 'pdo_mysql (127.0.0.1:3306)';
                $connection_error = '';
            } catch (Throwable $e2) {
                $connection_error = $e2->getMessage();
            }
        }
    }
}

// Jika PDO gagal atau tidak ada, coba fallback ke MySQLi
if (!$pdo && $has_mysqli) {
    try {
        $mysqli = @new mysqli($db_host, $db_user, $db_pass, $db_name);
        if ($mysqli->connect_error) {
            if ($db_host === 'localhost') {
                $mysqli = @new mysqli('127.0.0.1', $db_user, $db_pass, $db_name, 3306);
                if (!$mysqli->connect_error) {
                    $connected_host = '127.0.0.1';
                    $driver_used = 'mysqli (127.0.0.1:3306)';
                    $mysqli->set_charset('utf8mb4');
                    $connection_error = '';
                } else {
                    $connection_error = $mysqli->connect_error;
                }
            } else {
                $connection_error = $mysqli->connect_error;
            }
        } else {
            $driver_used = 'mysqli (' . $db_host . ')';
            $mysqli->set_charset('utf8mb4');
            $connection_error = '';
        }
    } catch (Throwable $e3) {
        $connection_error = $e3->getMessage();
    }
}

// Jika semua cara koneksi gagal, kembalikan analisa error yang sangat spesifik
if (!$pdo && (!$mysqli || $mysqli->connect_error)) {
    $code = 'DB_CONNECTION_FAILED';
    $hint = 'Periksa kredensial database di cPanel.';

    if (stripos($connection_error, 'Access denied') !== false) {
        $code = 'DB_ACCESS_DENIED';
        $hint = 'User database "' . $db_user . '" belum diberi hak akses atau password salah. Di cPanel -> menu "MySQL Databases" -> scroll ke "Add User To Database" -> pilih User & Database -> Klik Add -> Centang "ALL PRIVILEGES" -> Klik "Make Changes".';
    } elseif (stripos($connection_error, 'Unknown database') !== false) {
        $code = 'DB_NOT_FOUND';
        $hint = 'Database "' . $db_name . '" belum dibuat di cPanel. Di cPanel -> menu "MySQL Databases" -> Buat Database Baru dengan nama "' . $db_name . '".';
    } elseif (stripos($connection_error, 'could not find driver') !== false) {
        $code = 'DRIVER_NOT_FOUND';
        $hint = 'Driver pdo_mysql belum aktif di PHP ' . phpversion() . '. Buka cPanel -> "Select PHP Version" -> tab "Extensions" -> centang pdo_mysql dan mysqli.';
    } elseif (stripos($connection_error, 'Connection refused') !== false || stripos($connection_error, 'No such file') !== false) {
        $code = 'HOST_UNREACHABLE';
        $hint = 'Server MySQL tidak merespons di ' . $db_host . '. Coba ubah host ke "127.0.0.1" atau "localhost".';
    }

    sendJsonResponse([
        'status' => 'error',
        'code' => $code,
        'connected' => false,
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown Server',
        'tested_host' => $db_host,
        'tested_database' => $db_name,
        'tested_user' => $db_user,
        'message' => 'Gagal terhubung ke Database MySQL cPanel!',
        'detail' => $connection_error,
        'hint' => $hint
    ], 200);
}

// =========================================================================
// OTOMATIS MEMBUAT TABEL APP_DATA JIKA BELUM ADA
// =========================================================================
$tableCreated = false;
$createTableSql = "CREATE TABLE IF NOT EXISTS `app_data` (
  `data_key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `data_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

try {
    if ($pdo) {
        $pdo->exec($createTableSql);
        $tableCreated = true;
    } elseif ($mysqli) {
        $mysqli->query($createTableSql);
        $tableCreated = true;
    }
} catch (Throwable $e) {
    // Abaikan jika tabel sudah ada atau permission read-only
}

// =========================================================================
// ROUTING AKSI API
// =========================================================================
$action = $_GET['action'] ?? 'status';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'test' || $action === 'status') {
        $total_keys = 0;
        try {
            if ($pdo) {
                $stmt = $pdo->query("SELECT COUNT(*) as total_keys FROM app_data");
                $row = $stmt->fetch();
                $total_keys = (int)($row['total_keys'] ?? 0);
            } elseif ($mysqli) {
                $res = $mysqli->query("SELECT COUNT(*) as total_keys FROM app_data");
                if ($res && $row = $res->fetch_assoc()) {
                    $total_keys = (int)($row['total_keys'] ?? 0);
                }
            }
        } catch (Throwable $e) {
            $total_keys = 0;
        }

        sendJsonResponse([
            'status' => 'success',
            'connected' => true,
            'php_version' => phpversion(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Apache / cPanel',
            'driver' => $driver_used,
            'message' => 'Koneksi ke Database MySQL Berhasil!',
            'db_name' => $db_name,
            'db_user' => $db_user,
            'db_host' => $connected_host,
            'table_ready' => $tableCreated,
            'total_keys_stored' => $total_keys
        ]);
    } elseif ($action === 'get_all') {
        $data = [];
        try {
            if ($pdo) {
                $stmt = $pdo->query("SELECT data_key, data_value FROM app_data");
                $results = $stmt->fetchAll();
                foreach ($results as $row) {
                    $data[$row['data_key']] = json_decode($row['data_value'], true);
                }
            } elseif ($mysqli) {
                $res = $mysqli->query("SELECT data_key, data_value FROM app_data");
                if ($res) {
                    while ($row = $res->fetch_assoc()) {
                        $data[$row['data_key']] = json_decode($row['data_value'], true);
                    }
                }
            }
        } catch (Throwable $e) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Gagal membaca data dari MySQL: ' . $e->getMessage()
            ], 500);
        }

        sendJsonResponse([
            'status' => 'success',
            'data' => $data
        ]);
    } elseif ($action === 'get_key') {
        $key = $_GET['key'] ?? '';
        $found = false;
        $val = null;

        try {
            if ($pdo) {
                $stmt = $pdo->prepare("SELECT data_value FROM app_data WHERE data_key = ?");
                $stmt->execute([$key]);
                $row = $stmt->fetch();
                if ($row) {
                    $found = true;
                    $val = json_decode($row['data_value'], true);
                }
            } elseif ($mysqli) {
                $stmt = $mysqli->prepare("SELECT data_value FROM app_data WHERE data_key = ?");
                $stmt->bind_param('s', $key);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($res && $row = $res->fetch_assoc()) {
                    $found = true;
                    $val = json_decode($row['data_value'], true);
                }
            }
        } catch (Throwable $e) {
            sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }

        if ($found) {
            sendJsonResponse(['status' => 'success', 'data' => $val]);
        } else {
            sendJsonResponse(['status' => 'not_found', 'data' => null]);
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if ($action === 'save_all' && is_array($input)) {
        try {
            if ($pdo) {
                $stmt = $pdo->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
                $pdo->beginTransaction();
                foreach ($input as $k => $v) {
                    $jsonVal = json_encode($v, JSON_UNESCAPED_UNICODE);
                    $stmt->execute([$k, $jsonVal]);
                }
                $pdo->commit();
            } elseif ($mysqli) {
                $mysqli->begin_transaction();
                $stmt = $mysqli->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
                foreach ($input as $k => $v) {
                    $jsonVal = json_encode($v, JSON_UNESCAPED_UNICODE);
                    $stmt->bind_param('ss', $k, $jsonVal);
                    $stmt->execute();
                }
                $mysqli->commit();
            }

            sendJsonResponse([
                'status' => 'success',
                'message' => 'Seluruh data aplikasi (' . count($input) . ' kategori) berhasil disimpan ke Database MySQL cPanel!'
            ]);
        } catch (Throwable $e) {
            if ($pdo && $pdo->inTransaction()) { $pdo->rollBack(); }
            if ($mysqli) { $mysqli->rollback(); }
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Gagal menyimpan data ke MySQL: ' . $e->getMessage()
            ], 500);
        }
    } elseif ($action === 'save_key' && isset($input['key']) && isset($input['value'])) {
        try {
            $jsonVal = json_encode($input['value'], JSON_UNESCAPED_UNICODE);
            if ($pdo) {
                $stmt = $pdo->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
                $stmt->execute([$input['key'], $jsonVal]);
            } elseif ($mysqli) {
                $stmt = $mysqli->prepare("INSERT INTO app_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = NOW()");
                $stmt->bind_param('ss', $input['key'], $jsonVal);
                $stmt->execute();
            }

            sendJsonResponse([
                'status' => 'success',
                'message' => "Key '{$input['key']}' berhasil disimpan ke MySQL"
            ]);
        } catch (Throwable $e) {
            sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

sendJsonResponse(['status' => 'error', 'message' => 'Aksi atau Request Method tidak valid'], 400);
