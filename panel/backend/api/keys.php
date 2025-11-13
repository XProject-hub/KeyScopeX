<?php
/**
 * KeyScopeX Panel - DRM Keys API
 * Handles key submission from extension and retrieval for users
 * LineWatchX Project
 */

require_once '../config/config.php';

setCorsHeaders();

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Get license key
$licenseKey = $_SERVER['HTTP_X_LICENSE_KEY'] ?? $input['license_key'] ?? '';

switch ($action) {
    case 'submit':
        submitKeys($licenseKey, $input);
        break;
    
    case 'list':
        listKeys($licenseKey, $_GET);
        break;
    
    case 'list_all':
        listAllKeys($licenseKey, $_GET);
        break;
    
    case 'search':
        searchKeys($licenseKey, $_GET);
        break;
    
    case 'get':
        getKey($_GET['id'] ?? 0, $licenseKey);
        break;
    
    case 'delete':
        deleteKey($_GET['id'] ?? 0, $licenseKey);
        break;
    
    case 'export':
        exportKeys($licenseKey, $_GET);
        break;
    
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

/**
 * Submit new DRM keys from extension
 */
function submitKeys($licenseKey, $input) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 401);
    }
    
    // Rate limiting
    if (!checkRateLimit('submit_keys_' . $licenseKey, 50, 60)) {
        jsonResponse(['success' => false, 'message' => 'Rate limit exceeded'], 429);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("
            SELECT id, license_type, license_status
            FROM users
            WHERE license_key = ? AND license_status = 'ACTIVE'
        ");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid or inactive license'], 403);
        }
        
        // Check if FREE user has reached limit
        if ($user['license_type'] === 'FREE') {
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM drm_keys WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $count = $stmt->fetch()['count'];
            
            if ($count >= MAX_KEYS_PER_FREE_USER) {
                jsonResponse([
                    'success' => false,
                    'message' => 'FREE license key limit reached. Upgrade to PREMIUM for unlimited keys.'
                ], 403);
            }
        }
        
        // Extract data
        $drmType = sanitizeInput($input['drm_type'] ?? '');
        $pssh = sanitizeInput($input['pssh'] ?? '');
        $keys = $input['keys'] ?? [];
        $licenseUrl = sanitizeInput($input['license_url'] ?? '');
        $manifestUrl = sanitizeInput($input['manifest_url'] ?? '');
        $contentTitle = sanitizeInput($input['content_title'] ?? '');
        $contentUrl = sanitizeInput($input['content_url'] ?? '');
        $extensionVersion = $_SERVER['HTTP_X_EXTENSION_VERSION'] ?? '1.0.0';
        
        if (empty($drmType) || empty($pssh) || empty($keys)) {
            jsonResponse(['success' => false, 'message' => 'DRM type, PSSH, and keys are required'], 400);
        }
        
        // Insert keys
        $stmt = $db->prepare("
            INSERT INTO drm_keys (
                user_id, drm_type, pssh, key_id, key_value,
                license_url, manifest_url, content_title, content_url,
                ip_address, extension_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $keysSaved = 0;
        foreach ($keys as $key) {
            $keyId = $key['key_id'] ?? $key['keyId'] ?? '';
            $keyValue = $key['key'] ?? $key['key_value'] ?? '';
            
            if (!empty($keyId) && !empty($keyValue)) {
                try {
                    $stmt->execute([
                        $user['id'],
                        $drmType,
                        $pssh,
                        $keyId,
                        $keyValue,
                        $licenseUrl,
                        $manifestUrl,
                        $contentTitle,
                        $contentUrl,
                        getClientIP(),
                        $extensionVersion
                    ]);
                    $keysSaved++;
                } catch (PDOException $e) {
                    // Skip duplicates
                    if ($e->getCode() != 23000) {
                        throw $e;
                    }
                }
            }
        }
        
        // Log activity
        logActivity($user['id'], 'KEYS_SUBMITTED', [
            'drm_type' => $drmType,
            'keys_count' => $keysSaved
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => "$keysSaved key(s) saved successfully",
            'keys_saved' => $keysSaved
        ], 201);
        
    } catch (PDOException $e) {
        error_log("Keys submission error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error saving keys'], 500);
    }
}

/**
 * List user's own keys
 */
function listKeys($licenseKey, $params) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 401);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("SELECT id FROM users WHERE license_key = ? AND license_status = 'ACTIVE'");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        // Pagination
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        // Filters
        $drmType = sanitizeInput($params['drm_type'] ?? '');
        
        $where = "user_id = ?";
        $bindings = [$user['id']];
        
        if (!empty($drmType)) {
            $where .= " AND drm_type = ?";
            $bindings[] = $drmType;
        }
        
        // Get total count
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM drm_keys WHERE $where");
        $stmt->execute($bindings);
        $total = $stmt->fetch()['total'];
        
        // Get keys
        $stmt = $db->prepare("
            SELECT 
                id, drm_type, pssh, key_id, key_value,
                license_url, manifest_url, content_title, content_url,
                captured_at
            FROM drm_keys
            WHERE $where
            ORDER BY captured_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($bindings);
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
        error_log("List keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving keys'], 500);
    }
}

/**
 * List ALL keys (PREMIUM users only)
 */
function listAllKeys($licenseKey, $params) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 401);
    }
    
    try {
        $db = getDB();
        
        // Verify PREMIUM license
        $stmt = $db->prepare("
            SELECT id, license_type
            FROM users
            WHERE license_key = ? AND license_status = 'ACTIVE'
        ");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        if ($user['license_type'] !== 'PREMIUM') {
            jsonResponse([
                'success' => false,
                'message' => 'This feature requires PREMIUM license'
            ], 403);
        }
        
        // Pagination
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(10, (int)($params['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        
        // Filters
        $drmType = sanitizeInput($params['drm_type'] ?? '');
        
        $where = "1=1";
        $bindings = [];
        
        if (!empty($drmType)) {
            $where .= " AND dk.drm_type = ?";
            $bindings[] = $drmType;
        }
        
        // Get total count
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM drm_keys dk WHERE $where");
        $stmt->execute($bindings);
        $total = $stmt->fetch()['total'];
        
        // Get ALL keys from ALL users
        $stmt = $db->prepare("
            SELECT 
                dk.id, dk.drm_type, dk.pssh, dk.key_id, dk.key_value,
                dk.license_url, dk.manifest_url, dk.content_title, dk.content_url,
                dk.captured_at,
                u.username as collected_by
            FROM drm_keys dk
            JOIN users u ON dk.user_id = u.id
            WHERE $where
            ORDER BY dk.captured_at DESC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($bindings);
        $keys = $stmt->fetchAll();
        
        // Log PREMIUM feature usage
        logActivity($user['id'], 'VIEWED_ALL_KEYS', ['keys_count' => count($keys)]);
        
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
        error_log("List all keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving keys'], 500);
    }
}

/**
 * Search keys
 */
function searchKeys($licenseKey, $params) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 401);
    }
    
    $query = sanitizeInput($params['q'] ?? '');
    if (empty($query)) {
        jsonResponse(['success' => false, 'message' => 'Search query is required'], 400);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("
            SELECT id, license_type
            FROM users
            WHERE license_key = ? AND license_status = 'ACTIVE'
        ");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        // PREMIUM users search all keys, FREE users search only their keys
        $whereUser = ($user['license_type'] === 'PREMIUM') ? "" : "dk.user_id = {$user['id']} AND";
        
        $stmt = $db->prepare("
            SELECT 
                dk.id, dk.drm_type, dk.pssh, dk.key_id, dk.key_value,
                dk.license_url, dk.manifest_url, dk.content_title,
                dk.captured_at
            FROM drm_keys dk
            WHERE $whereUser (
                dk.pssh LIKE ? OR
                dk.key_id LIKE ? OR
                dk.key_value LIKE ? OR
                dk.content_title LIKE ? OR
                dk.manifest_url LIKE ?
            )
            ORDER BY dk.captured_at DESC
            LIMIT 100
        ");
        
        $searchTerm = "%$query%";
        $stmt->execute(array_fill(0, 5, $searchTerm));
        $keys = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $keys,
            'count' => count($keys)
        ]);
        
    } catch (PDOException $e) {
        error_log("Search keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error searching keys'], 500);
    }
}

/**
 * Get single key details
 */
function getKey($id, $licenseKey) {
    if (empty($licenseKey) || empty($id)) {
        jsonResponse(['success' => false, 'message' => 'License key and key ID are required'], 400);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("
            SELECT id, license_type
            FROM users
            WHERE license_key = ? AND license_status = 'ACTIVE'
        ");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        // Get key (check ownership for FREE users)
        $whereUser = ($user['license_type'] === 'PREMIUM') ? "" : "AND user_id = {$user['id']}";
        
        $stmt = $db->prepare("
            SELECT *
            FROM drm_keys
            WHERE id = ? $whereUser
        ");
        $stmt->execute([$id]);
        $key = $stmt->fetch();
        
        if (!$key) {
            jsonResponse(['success' => false, 'message' => 'Key not found or access denied'], 404);
        }
        
        jsonResponse([
            'success' => true,
            'data' => $key
        ]);
        
    } catch (PDOException $e) {
        error_log("Get key error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error retrieving key'], 500);
    }
}

/**
 * Delete key (own keys only)
 */
function deleteKey($id, $licenseKey) {
    if (empty($licenseKey) || empty($id)) {
        jsonResponse(['success' => false, 'message' => 'License key and key ID are required'], 400);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("SELECT id FROM users WHERE license_key = ? AND license_status = 'ACTIVE'");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        // Delete key (only own keys)
        $stmt = $db->prepare("DELETE FROM drm_keys WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        
        if ($stmt->rowCount() === 0) {
            jsonResponse(['success' => false, 'message' => 'Key not found or access denied'], 404);
        }
        
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
 * Export keys as JSON
 */
function exportKeys($licenseKey, $params) {
    if (empty($licenseKey)) {
        jsonResponse(['success' => false, 'message' => 'License key is required'], 401);
    }
    
    try {
        $db = getDB();
        
        // Verify license
        $stmt = $db->prepare("
            SELECT id, username, license_type
            FROM users
            WHERE license_key = ? AND license_status = 'ACTIVE'
        ");
        $stmt->execute([$licenseKey]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Invalid license'], 403);
        }
        
        // Get keys based on license type
        $whereUser = ($user['license_type'] === 'PREMIUM') ? "" : "WHERE user_id = {$user['id']}";
        
        $stmt = $db->prepare("
            SELECT 
                drm_type, pssh, key_id, key_value,
                license_url, manifest_url, content_title,
                captured_at
            FROM drm_keys
            $whereUser
            ORDER BY captured_at DESC
        ");
        $stmt->execute();
        $keys = $stmt->fetchAll();
        
        $export = [
            'exported_by' => $user['username'],
            'license_type' => $user['license_type'],
            'exported_at' => date('Y-m-d H:i:s'),
            'total_keys' => count($keys),
            'keys' => $keys
        ];
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="keyscopex-export-' . date('Y-m-d-His') . '.json"');
        echo json_encode($export, JSON_PRETTY_PRINT);
        exit();
        
    } catch (PDOException $e) {
        error_log("Export keys error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Error exporting keys'], 500);
    }
}

// LineWatchX Project - Made with 🧡
?>

