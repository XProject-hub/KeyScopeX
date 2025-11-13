<?php
/**
 * KeyScopeX Panel - License Management API
 * Handles license validation for extension integration
 * LineWatchX Project
 */

require_once '../config/config.php';

setCorsHeaders();

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Get license key from header or body
$licenseKey = $_SERVER['HTTP_X_LICENSE_KEY'] ?? $input['license_key'] ?? '';

switch ($action) {
    case 'check':
        checkLicense($licenseKey);
        break;
    
    case 'activate':
        activateLicense($licenseKey);
        break;
    
    case 'info':
        getLicenseInfo($licenseKey);
        break;
    
    case 'validate':
        validateLicense($licenseKey);
        break;
    
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

/**
 * Check if license is valid (for extension)
 */
function checkLicense($licenseKey) {
    if (empty($licenseKey)) {
        jsonResponse(['valid' => false, 'message' => 'License key is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                u.id,
                u.username,
                u.email,
                u.license_type,
                u.license_status,
                u.license_expires,
                CASE
                    WHEN u.license_status != 'ACTIVE' THEN FALSE
                    WHEN u.license_expires IS NOT NULL AND u.license_expires < NOW() THEN FALSE
                    ELSE TRUE
                END as is_valid
            FROM users u
            WHERE u.license_key = ?
        ");
        
        $stmt->execute([$licenseKey]);
        $license = $stmt->fetch();
        
        if (!$license) {
            jsonResponse([
                'valid' => false,
                'message' => 'Invalid license key'
            ], 404);
        }
        
        // Log license check
        logActivity($license['id'], 'LICENSE_CHECK', [
            'valid' => $license['is_valid'],
            'type' => $license['license_type']
        ]);
        
        jsonResponse([
            'valid' => (bool)$license['is_valid'],
            'license_type' => $license['license_type'],
            'license_status' => $license['license_status'],
            'expires' => $license['license_expires'],
            'user' => [
                'id' => $license['id'],
                'username' => $license['username'],
                'email' => $license['email']
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("License check error: " . $e->getMessage());
        jsonResponse(['valid' => false, 'message' => 'Error checking license'], 500);
    }
}

/**
 * Activate license (first time setup)
 */
function activateLicense($licenseKey) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT id, username, license_type, license_status
            FROM users
            WHERE license_key = ?
        ");
        
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license key'], 404);
        }
        
        if ($user['license_status'] !== 'ACTIVE') {
            jsonResponse([
                'success' => false,
                'message' => 'License is ' . strtolower($user['license_status'])
            ], 403);
        }
        
        // Log activation
        logActivity($user['id'], 'LICENSE_ACTIVATED', [
            'type' => $user['license_type'],
            'extension_version' => $_SERVER['HTTP_X_EXTENSION_VERSION'] ?? '1.0.0'
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'License activated successfully',
            'license_type' => $user['license_type'],
            'username' => $user['username']
        ]);
        
    } catch (PDOException $e) {
        error_log("License activation error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error activating license'], 500);
    }
}

/**
 * Get detailed license information
 */
function getLicenseInfo($licenseKey) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 400);
    }
    
    try {
        $db = getDB();
        
        // Get license info
        $stmt = $db->prepare("
            SELECT 
                u.id,
                u.username,
                u.email,
                u.license_type,
                u.license_status,
                u.license_expires,
                u.created_at,
                u.last_login,
                COUNT(DISTINCT dk.id) as total_keys_collected,
                MAX(dk.captured_at) as last_key_capture
            FROM users u
            LEFT JOIN drm_keys dk ON u.id = dk.user_id
            WHERE u.license_key = ?
            GROUP BY u.id
        ");
        
        $stmt->execute([$licenseKey]);
        $info = $stmt->fetch();
        
        if (!$info) {
            jsonResponse(['success' => false, 'message' => 'Invalid license key'], 404);
        }
        
        // Get recent activity
        $stmt = $db->prepare("
            SELECT action, created_at
            FROM extension_activity
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        ");
        $stmt->execute([$info['id']]);
        $recentActivity = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $info['id'],
                    'username' => $info['username'],
                    'email' => $info['email']
                ],
                'license' => [
                    'key' => $licenseKey,
                    'type' => $info['license_type'],
                    'status' => $info['license_status'],
                    'expires' => $info['license_expires'],
                    'created_at' => $info['created_at']
                ],
                'stats' => [
                    'total_keys' => (int)$info['total_keys_collected'],
                    'last_key_capture' => $info['last_key_capture'],
                    'last_login' => $info['last_login']
                ],
                'recent_activity' => $recentActivity
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("License info error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving license info'], 500);
    }
}

/**
 * Validate license (quick check for extension)
 */
function validateLicense($licenseKey) {
    if (empty($licenseKey)) {
        jsonResponse(['valid' => false], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                CASE
                    WHEN license_status = 'ACTIVE' AND (license_expires IS NULL OR license_expires > NOW()) THEN 1
                    ELSE 0
                END as valid,
                license_type
            FROM users
            WHERE license_key = ?
        ");
        
        $stmt->execute([$licenseKey]);
        $result = $stmt->fetch();
        
        jsonResponse([
            'valid' => (bool)($result['valid'] ?? false),
            'type' => $result['license_type'] ?? null
        ]);
        
    } catch (PDOException $e) {
        jsonResponse(['valid' => false], 500);
    }
}

// LineWatchX Project - Made with 🧡
?>

