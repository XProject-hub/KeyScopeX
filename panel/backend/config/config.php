<?php
/**
 * KeyScopeX Panel - Application Configuration
 * LineWatchX Project
 */

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Timezone
date_default_timezone_set('UTC');

// Error reporting (DISABLE IN PRODUCTION!)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 0 in production
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

// Site configuration
define('SITE_NAME', 'KeyScopeX Panel');
define('SITE_URL', 'https://keyscopex.xproject.live');
define('PANEL_URL', SITE_URL . '/panel');
define('API_URL', PANEL_URL . '/backend/api');

// License configuration
define('FREE_LICENSE_DAYS', 365); // 1 year
define('PREMIUM_LICENSE_DAYS', 365); // 1 year
define('MAX_KEYS_PER_FREE_USER', 10000);

// Security
define('PASSWORD_MIN_LENGTH', 8);
define('SESSION_LIFETIME', 3600 * 24); // 24 hours
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// API Rate limiting
define('API_RATE_LIMIT', 100); // requests per minute
define('API_RATE_LIMIT_WINDOW', 60); // seconds

// Paths
define('ROOT_PATH', dirname(dirname(__DIR__)));
define('BACKEND_PATH', ROOT_PATH . '/backend');
define('LOGS_PATH', ROOT_PATH . '/logs');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

// Create necessary directories
$dirs = [LOGS_PATH, UPLOADS_PATH];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// CORS headers for API - Allow extension access
function setCorsHeaders() {
    // Allow from any origin (including chrome-extension://)
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-License-Key, X-Extension-Version');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json; charset=UTF-8');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Helper functions
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit();
}

function getClientIP() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    
    // Check for proxies
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    }
    
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
}

function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function generateLicenseKey() {
    return sprintf(
        'KSX-%s-%s-%s',
        bin2hex(random_bytes(4)),
        bin2hex(random_bytes(4)),
        bin2hex(random_bytes(4))
    );
}

function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function isStrongPassword($password) {
    return strlen($password) >= PASSWORD_MIN_LENGTH &&
           preg_match('/[A-Z]/', $password) &&
           preg_match('/[a-z]/', $password) &&
           preg_match('/[0-9]/', $password);
}

function logActivity($userId, $action, $details = null, $ipAddress = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO extension_activity (user_id, license_key, action, details, ip_address, created_at)
            SELECT u.id, u.license_key, :action, :details, :ip, NOW()
            FROM users u
            WHERE u.id = :user_id
        ");
        $stmt->execute([
            'user_id' => $userId,
            'action' => $action,
            'details' => $details ? json_encode($details) : null,
            'ip' => $ipAddress ?? getClientIP()
        ]);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

function logAdminAction($adminId, $action, $targetUserId = null, $details = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO admin_logs (admin_id, action, target_user_id, details, ip_address)
            VALUES (:admin_id, :action, :target_user_id, :details, :ip)
        ");
        $stmt->execute([
            'admin_id' => $adminId,
            'action' => $action,
            'target_user_id' => $targetUserId,
            'details' => $details ? json_encode($details) : null,
            'ip' => getClientIP()
        ]);
    } catch (Exception $e) {
        error_log("Failed to log admin action: " . $e->getMessage());
    }
}

function trackVisitor($page = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO visitors (ip_address, user_agent, page, referrer)
            VALUES (:ip, :ua, :page, :ref)
        ");
        $stmt->execute([
            'ip' => getClientIP(),
            'ua' => getUserAgent(),
            'page' => $page ?? $_SERVER['REQUEST_URI'] ?? '/',
            'ref' => $_SERVER['HTTP_REFERER'] ?? null
        ]);
    } catch (Exception $e) {
        error_log("Failed to track visitor: " . $e->getMessage());
    }
}

// Rate limiting
function checkRateLimit($identifier, $limit = API_RATE_LIMIT, $window = API_RATE_LIMIT_WINDOW) {
    $key = 'rate_limit_' . md5($identifier);
    $file = sys_get_temp_dir() . '/' . $key;
    
    $now = time();
    $requests = [];
    
    if (file_exists($file)) {
        $requests = json_decode(file_get_contents($file), true) ?? [];
    }
    
    // Remove old requests
    $requests = array_filter($requests, function($timestamp) use ($now, $window) {
        return ($now - $timestamp) < $window;
    });
    
    if (count($requests) >= $limit) {
        return false;
    }
    
    $requests[] = $now;
    file_put_contents($file, json_encode($requests));
    
    return true;
}

// Include database config
require_once __DIR__ . '/database.php';

// LineWatchX Project - Made with 🧡
?>

