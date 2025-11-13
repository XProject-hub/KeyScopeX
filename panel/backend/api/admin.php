<?php
/**
 * KeyScopeX Panel - Admin API
 * Admin-only operations: user management, license control, system stats
 * LineWatchX Project
 */

require_once '../config/config.php';
require_once '../includes/admin_auth.php';

setCorsHeaders();

// Verify admin authentication
requireAdmin();

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    // Statistics
    case 'stats':
        getSystemStats();
        break;
    
    case 'dashboard':
        getDashboardData();
        break;
    
    // User Management
    case 'users':
        listUsers($_GET);
        break;
    
    case 'user_details':
        getUserDetails($_GET['id'] ?? 0);
        break;
    
    case 'update_user':
        updateUser($input);
        break;
    
    case 'delete_user':
        deleteUser($_GET['id'] ?? 0);
        break;
    
    // License Management
    case 'create_license':
        createLicense($input);
        break;
    
    case 'upgrade_license':
        upgradeLicense($input);
        break;
    
    case 'revoke_license':
        revokeLicense($input);
        break;
    
    case 'extend_license':
        extendLicense($input);
        break;
    
    // Keys Management
    case 'all_keys':
        getAllKeys($_GET);
        break;
    
    case 'add_key':
        addKeyManually($input);
        break;
    
    case 'delete_key':
        deleteKeyAdmin($_GET['id'] ?? 0);
        break;
    
    // Logs & Activity
    case 'activity_logs':
        getActivityLogs($_GET);
        break;
    
    case 'admin_logs':
        getAdminLogs($_GET);
        break;
    
    // Export
    case 'export_all_keys':
        exportAllKeys();
        break;
    
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

/**
 * Get system statistics
 */
function getSystemStats() {
    try {
        $db = getDB();
        
        $stmt = $db->query("CALL get_system_stats()");
        $stats = $stmt->fetch();
        
        // Additional stats
        $stmt = $db->query("
            SELECT 
                COUNT(DISTINCT DATE(captured_at)) as active_days,
                COUNT(DISTINCT user_id) as active_users_with_keys
            FROM drm_keys
            WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $additionalStats = $stmt->fetch();
        
        $stmt = $db->query("
            SELECT drm_type, COUNT(*) as count
            FROM drm_keys
            GROUP BY drm_type
        ");
        $keysByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        jsonResponse([
            'success' => true,
            'data' => array_merge($stats, $additionalStats, [
                'keys_by_type' => $keysByType
            ])
        ]);
        
    } catch (PDOException $e) {
        error_log("Stats error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving stats'], 500);
    }
}

/**
 * Get admin dashboard data
 */
function getDashboardData() {
    try {
        $db = getDB();
        
        // Recent users
        $stmt = $db->query("
            SELECT id, username, email, license_type, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        ");
        $recentUsers = $stmt->fetchAll();
        
        // Recent keys
        $stmt = $db->query("
            SELECT dk.*, u.username
            FROM drm_keys dk
            JOIN users u ON dk.user_id = u.id
            ORDER BY dk.captured_at DESC
            LIMIT 20
        ");
        $recentKeys = $stmt->fetchAll();
        
        // Active extensions (last hour)
        $stmt = $db->query("
            SELECT COUNT(DISTINCT user_id) as count
            FROM extension_activity
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $activeExtensions = $stmt->fetch()['count'];
        
        // License expiring soon
        $stmt = $db->query("
            SELECT id, username, email, license_expires
            FROM users
            WHERE license_expires IS NOT NULL
            AND license_expires <= DATE_ADD(NOW(), INTERVAL 7 DAY)
            AND license_status = 'ACTIVE'
            ORDER BY license_expires ASC
        ");
        $expiringLicenses = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => [
                'recent_users' => $recentUsers,
                'recent_keys' => $recentKeys,
                'active_extensions' => $activeExtensions,
                'expiring_licenses' => $expiringLicenses
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Dashboard data error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving dashboard data'], 500);
    }
}

/**
 * List all users with filters
 */
function listUsers($params) {
    try {
        $db = getDB();
        
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        $licenseType = $params['license_type'] ?? '';
        $licenseStatus = $params['license_status'] ?? '';
        $search = sanitizeInput($params['search'] ?? '');
        
        $where = [];
        $bindings = [];
        
        if (!empty($licenseType)) {
            $where[] = "license_type = ?";
            $bindings[] = $licenseType;
        }
        
        if (!empty($licenseStatus)) {
            $where[] = "license_status = ?";
            $bindings[] = $licenseStatus;
        }
        
        if (!empty($search)) {
            $where[] = "(username LIKE ? OR email LIKE ?)";
            $bindings[] = "%$search%";
            $bindings[] = "%$search%";
        }
        
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        
        // Get total
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM users $whereClause");
        $stmt->execute($bindings);
        $total = $stmt->fetch()['total'];
        
        // Get users
        $stmt = $db->prepare("
            SELECT 
                u.id, u.username, u.email, u.license_key, u.license_type,
                u.license_status, u.license_expires, u.created_at, u.last_login,
                COUNT(DISTINCT dk.id) as total_keys
            FROM users u
            LEFT JOIN drm_keys dk ON u.id = dk.user_id
            $whereClause
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($bindings);
        $users = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $users,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int)$total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("List users error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving users'], 500);
    }
}

/**
 * Get detailed user information
 */
function getUserDetails($userId) {
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        // User info
        $stmt = $db->prepare("
            SELECT 
                u.*,
                COUNT(DISTINCT dk.id) as total_keys,
                MAX(dk.captured_at) as last_key_capture
            FROM users u
            LEFT JOIN drm_keys dk ON u.id = dk.user_id
            WHERE u.id = ?
            GROUP BY u.id
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'User not found'], 404);
        }
        
        // Recent activity
        $stmt = $db->prepare("
            SELECT action, details, created_at
            FROM extension_activity
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $stmt->execute([$userId]);
        $activity = $stmt->fetchAll();
        
        // License history
        $stmt = $db->prepare("
            SELECT *
            FROM license_history
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $licenseHistory = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => [
                'user' => $user,
                'activity' => $activity,
                'license_history' => $licenseHistory
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("User details error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving user details'], 500);
    }
}

/**
 * Update user information
 */
function updateUser($input) {
    $userId = $input['user_id'] ?? 0;
    
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $updates = [];
        $bindings = [];
        
        if (isset($input['license_type'])) {
            $updates[] = "license_type = ?";
            $bindings[] = $input['license_type'];
        }
        
        if (isset($input['license_status'])) {
            $updates[] = "license_status = ?";
            $bindings[] = $input['license_status'];
        }
        
        if (empty($updates)) {
            jsonResponse(['success' => false, 'message' => 'No updates provided'], 400);
        }
        
        $bindings[] = $userId;
        
        $stmt = $db->prepare("
            UPDATE users
            SET " . implode(", ", $updates) . "
            WHERE id = ?
        ");
        $stmt->execute($bindings);
        
        logAdminAction($_SESSION['user_id'], 'USER_UPDATED', $userId, $input);
        
        jsonResponse([
            'success' => true,
            'message' => 'User updated successfully'
        ]);
        
    } catch (PDOException $e) {
        error_log("Update user error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error updating user'], 500);
    }
}

/**
 * Delete user
 */
function deleteUser($userId) {
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    // Prevent deleting yourself
    if ($userId == $_SESSION['user_id']) {
        jsonResponse(['success' => false, 'message' => 'Cannot delete your own account'], 403);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        logAdminAction($_SESSION['user_id'], 'USER_DELETED', $userId);
        
        jsonResponse([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
        
    } catch (PDOException $e) {
        error_log("Delete user error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error deleting user'], 500);
    }
}

/**
 * Create new license for user
 */
function createLicense($input) {
    $userId = $input['user_id'] ?? 0;
    $licenseType = $input['license_type'] ?? 'FREE';
    $days = (int)($input['days'] ?? PREMIUM_LICENSE_DAYS);
    
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("SELECT license_type FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $oldType = $stmt->fetch()['license_type'] ?? null;
        
        if (!$oldType) {
            jsonResponse(['success' => false, 'message' => 'User not found'], 404);
        }
        
        $expires = ($licenseType === 'PREMIUM') ? "DATE_ADD(NOW(), INTERVAL $days DAY)" : "NULL";
        
        $stmt = $db->prepare("
            UPDATE users
            SET license_type = ?, license_expires = $expires, license_status = 'ACTIVE'
            WHERE id = ?
        ");
        $stmt->execute([$licenseType, $userId]);
        
        // Log in history
        $stmt = $db->prepare("
            INSERT INTO license_history (user_id, action, old_type, new_type, new_expires, performed_by, ip_address)
            VALUES (?, 'UPGRADED', ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?)
        ");
        $stmt->execute([
            $userId,
            $oldType,
            $licenseType,
            $days,
            $_SESSION['user_id'],
            getClientIP()
        ]);
        
        logAdminAction($_SESSION['user_id'], 'LICENSE_CREATED', $userId, [
            'type' => $licenseType,
            'days' => $days
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => "License created: $licenseType for $days days"
        ]);
        
    } catch (PDOException $e) {
        error_log("Create license error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error creating license'], 500);
    }
}

/**
 * Upgrade user to PREMIUM
 */
function upgradeLicense($input) {
    $userId = $input['user_id'] ?? 0;
    $days = (int)($input['days'] ?? PREMIUM_LICENSE_DAYS);
    
    $input['license_type'] = 'PREMIUM';
    createLicense($input);
}

/**
 * Revoke license
 */
function revokeLicense($input) {
    $userId = $input['user_id'] ?? 0;
    $reason = sanitizeInput($input['reason'] ?? '');
    
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            UPDATE users
            SET license_status = 'REVOKED'
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
        
        $stmt = $db->prepare("
            INSERT INTO license_history (user_id, action, performed_by, reason, ip_address)
            VALUES (?, 'REVOKED', ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $_SESSION['user_id'],
            $reason,
            getClientIP()
        ]);
        
        logAdminAction($_SESSION['user_id'], 'LICENSE_REVOKED', $userId, ['reason' => $reason]);
        
        jsonResponse([
            'success' => true,
            'message' => 'License revoked successfully'
        ]);
        
    } catch (PDOException $e) {
        error_log("Revoke license error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error revoking license'], 500);
    }
}

/**
 * Extend license expiration
 */
function extendLicense($input) {
    $userId = $input['user_id'] ?? 0;
    $days = (int)($input['days'] ?? 30);
    
    if (empty($userId)) {
        jsonResponse(['success' => false, 'message' => 'User ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            UPDATE users
            SET license_expires = COALESCE(DATE_ADD(license_expires, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY))
            WHERE id = ?
        ");
        $stmt->execute([$days, $days, $userId]);
        
        logAdminAction($_SESSION['user_id'], 'LICENSE_EXTENDED', $userId, ['days' => $days]);
        
        jsonResponse([
            'success' => true,
            'message' => "License extended by $days days"
        ]);
        
    } catch (PDOException $e) {
        error_log("Extend license error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error extending license'], 500);
    }
}

/**
 * Get all keys (admin view)
 */
function getAllKeys($params) {
    try {
        $db = getDB();
        
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM drm_keys");
        $stmt->execute();
        $total = $stmt->fetch()['total'];
        
        $stmt = $db->prepare("
            SELECT 
                dk.*,
                u.username, u.license_type
            FROM drm_keys dk
            JOIN users u ON dk.user_id = u.id
            ORDER BY dk.captured_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute();
        $keys = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $keys,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int)$total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get all keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving keys'], 500);
    }
}

/**
 * Manually add key to database
 */
function addKeyManually($input) {
    $userId = $input['user_id'] ?? $_SESSION['user_id'];
    $drmType = sanitizeInput($input['drm_type'] ?? '');
    $pssh = sanitizeInput($input['pssh'] ?? '');
    $keyId = sanitizeInput($input['key_id'] ?? '');
    $keyValue = sanitizeInput($input['key_value'] ?? '');
    $manifestUrl = sanitizeInput($input['manifest_url'] ?? '');
    $licenseUrl = sanitizeInput($input['license_url'] ?? '');
    
    if (empty($drmType) || empty($pssh) || empty($keyId) || empty($keyValue)) {
        jsonResponse(['success' => false, 'message' => 'Required fields missing'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            INSERT INTO drm_keys (
                user_id, drm_type, pssh, key_id, key_value,
                manifest_url, license_url, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $drmType,
            $pssh,
            $keyId,
            $keyValue,
            $manifestUrl,
            $licenseUrl,
            getClientIP()
        ]);
        
        logAdminAction($_SESSION['user_id'], 'KEY_ADDED_MANUALLY', $userId, [
            'drm_type' => $drmType,
            'key_id' => $keyId
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Key added successfully',
            'id' => $db->lastInsertId()
        ], 201);
        
    } catch (PDOException $e) {
        error_log("Add key manually error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error adding key'], 500);
    }
}

/**
 * Delete key (admin)
 */
function deleteKeyAdmin($keyId) {
    if (empty($keyId)) {
        jsonResponse(['success' => false, 'message' => 'Key ID is required'], 400);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("DELETE FROM drm_keys WHERE id = ?");
        $stmt->execute([$keyId]);
        
        logAdminAction($_SESSION['user_id'], 'KEY_DELETED', null, ['key_id' => $keyId]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Key deleted successfully'
        ]);
        
    } catch (PDOException $e) {
        error_log("Delete key error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error deleting key'], 500);
    }
}

/**
 * Get extension activity logs
 */
function getActivityLogs($params) {
    try {
        $db = getDB();
        
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        $userId = $params['user_id'] ?? null;
        $action = $params['action'] ?? null;
        
        $where = [];
        $bindings = [];
        
        if ($userId) {
            $where[] = "ea.user_id = ?";
            $bindings[] = $userId;
        }
        
        if ($action) {
            $where[] = "ea.action = ?";
            $bindings[] = $action;
        }
        
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM extension_activity ea $whereClause");
        $stmt->execute($bindings);
        $total = $stmt->fetch()['total'];
        
        $stmt = $db->prepare("
            SELECT 
                ea.*,
                u.username
            FROM extension_activity ea
            JOIN users u ON ea.user_id = u.id
            $whereClause
            ORDER BY ea.created_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($bindings);
        $logs = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $logs,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int)$total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Activity logs error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving activity logs'], 500);
    }
}

/**
 * Get admin action logs
 */
function getAdminLogs($params) {
    try {
        $db = getDB();
        
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM admin_logs");
        $stmt->execute();
        $total = $stmt->fetch()['total'];
        
        $stmt = $db->prepare("
            SELECT 
                al.*,
                admin.username as admin_username,
                target.username as target_username
            FROM admin_logs al
            JOIN users admin ON al.admin_id = admin.id
            LEFT JOIN users target ON al.target_user_id = target.id
            ORDER BY al.created_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute();
        $logs = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $logs,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int)$total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Admin logs error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving admin logs'], 500);
    }
}

/**
 * Export all keys as JSON
 */
function exportAllKeys() {
    try {
        $db = getDB();
        
        $stmt = $db->query("
            SELECT 
                dk.id,
                dk.drm_type,
                dk.pssh,
                dk.key_id,
                dk.key_value,
                dk.license_url,
                dk.manifest_url,
                dk.content_title,
                dk.content_url,
                dk.captured_at,
                u.username,
                u.license_type
            FROM drm_keys dk
            JOIN users u ON dk.user_id = u.id
            ORDER BY dk.captured_at DESC
        ");
        $keys = $stmt->fetchAll();
        
        $export = [
            'exported_by' => 'Admin',
            'exported_at' => date('Y-m-d H:i:s'),
            'total_keys' => count($keys),
            'format' => 'MPD_Link + KID:Key',
            'keys' => array_map(function($key) {
                return [
                    'mpd_link' => $key['manifest_url'],
                    'kid_key' => $key['key_id'] . ':' . $key['key_value'],
                    'drm_type' => $key['drm_type'],
                    'pssh' => $key['pssh'],
                    'content_title' => $key['content_title'],
                    'collected_by' => $key['username'],
                    'license_type' => $key['license_type'],
                    'captured_at' => $key['captured_at']
                ];
            }, $keys)
        ];
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="keyscopex-all-keys-' . date('Y-m-d-His') . '.json"');
        echo json_encode($export, JSON_PRETTY_PRINT);
        exit();
        
    } catch (PDOException $e) {
        error_log("Export all keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error exporting keys'], 500);
    }
}

// X Project - Developed by X Project | Version 1.0.1
?>

