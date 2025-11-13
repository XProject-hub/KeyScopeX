<?php
/**
 * KeyScopeX Panel - Authentication API
 * Handles: Register, Login, Logout, Session verification
 * LineWatchX Project
 */

require_once '../config/config.php';

setCorsHeaders();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    case 'register':
        handleRegister($input);
        break;
    
    case 'login':
        handleLogin($input);
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    case 'verify':
        handleVerify();
        break;
    
    case 'check_username':
        checkUsername($input);
        break;
    
    case 'check_email':
        checkEmail($input);
        break;
    
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

/**
 * Register new user
 */
function handleRegister($input) {
    // Validate input
    $username = sanitizeInput($input['username'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'All fields are required'], 400);
    }
    
    // Validate username (alphanumeric, underscore, 3-20 chars)
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        jsonResponse([
            'success' => false,
            'message' => 'Username must be 3-20 characters (letters, numbers, underscore only)'
        ], 400);
    }
    
    // Validate email
    if (!isValidEmail($email)) {
        jsonResponse(['success' => false, 'message' => 'Invalid email address'], 400);
    }
    
    // Validate password strength
    if (!isStrongPassword($password)) {
        jsonResponse([
            'success' => false,
            'message' => 'Password must be at least 8 characters with uppercase, lowercase, and number'
        ], 400);
    }
    
    // Rate limiting
    if (!checkRateLimit('register_' . getClientIP(), 5, 3600)) {
        jsonResponse(['success' => false, 'message' => 'Too many registration attempts. Try again later.'], 429);
    }
    
    try {
        $db = getDB();
        
        // Check if username exists
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Username already taken'], 400);
        }
        
        // Check if email exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Email already registered'], 400);
        }
        
        // Generate license key
        $licenseKey = generateLicenseKey();
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Insert user
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password, license_key, license_type, license_status, ip_address, user_agent)
            VALUES (?, ?, ?, ?, 'FREE', 'ACTIVE', ?, ?)
        ");
        
        $stmt->execute([
            $username,
            $email,
            $passwordHash,
            $licenseKey,
            getClientIP(),
            getUserAgent()
        ]);
        
        $userId = $db->lastInsertId();
        
        // Log license creation
        $stmt = $db->prepare("
            INSERT INTO license_history (user_id, action, new_type, new_expires, ip_address)
            VALUES (?, 'CREATED', 'FREE', DATE_ADD(NOW(), INTERVAL ? DAY), ?)
        ");
        $stmt->execute([$userId, FREE_LICENSE_DAYS, getClientIP()]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Registration successful! Your FREE license is active.',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'license_key' => $licenseKey,
                'license_type' => 'FREE',
                'license_days' => FREE_LICENSE_DAYS
            ]
        ], 201);
        
    } catch (PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Registration failed. Please try again.'], 500);
    }
}

/**
 * User login
 */
function handleLogin($input) {
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Email and password are required'], 400);
    }
    
    // Rate limiting
    if (!checkRateLimit('login_' . getClientIP(), 10, 300)) {
        jsonResponse(['success' => false, 'message' => 'Too many login attempts. Try again later.'], 429);
    }
    
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT id, username, email, password, license_key, license_type, license_status, is_admin
            FROM users
            WHERE email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password'])) {
            jsonResponse(['success' => false, 'message' => 'Invalid email or password'], 401);
        }
        
        if ($user['license_status'] !== 'ACTIVE') {
            jsonResponse(['success' => false, 'message' => 'Your account is ' . strtolower($user['license_status'])], 403);
        }
        
        // Update last login
        $stmt = $db->prepare("UPDATE users SET last_login = NOW(), ip_address = ? WHERE id = ?");
        $stmt->execute([getClientIP(), $user['id']]);
        
        // Create session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['license_type'] = $user['license_type'];
        $_SESSION['is_admin'] = (bool)$user['is_admin'];
        $_SESSION['login_time'] = time();
        
        // Log activity
        logActivity($user['id'], 'LOGIN', ['ip' => getClientIP()]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user_id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'license_key' => $user['license_key'],
                'license_type' => $user['license_type'],
                'is_admin' => (bool)$user['is_admin']
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Login failed. Please try again.'], 500);
    }
}

/**
 * User logout
 */
function handleLogout() {
    if (isset($_SESSION['user_id'])) {
        logActivity($_SESSION['user_id'], 'LOGOUT');
    }
    
    session_destroy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Verify session
 */
function handleVerify() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => 'Not authenticated'], 401);
    }
    
    // Check session timeout
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
        session_destroy();
        jsonResponse(['success' => false, 'message' => 'Session expired'], 401);
    }
    
    jsonResponse([
        'success' => true,
        'data' => [
            'user_id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'license_type' => $_SESSION['license_type'],
            'is_admin' => $_SESSION['is_admin'] ?? false
        ]
    ]);
}

/**
 * Check if username is available
 */
function checkUsername($input) {
    $username = sanitizeInput($input['username'] ?? '');
    
    if (empty($username)) {
        jsonResponse(['available' => false, 'message' => 'Username is required'], 400);
    }
    
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        
        $available = !$stmt->fetch();
        
        jsonResponse([
            'available' => $available,
            'message' => $available ? 'Username is available' : 'Username is taken'
        ]);
        
    } catch (PDOException $e) {
        jsonResponse(['available' => false, 'message' => 'Error checking username'], 500);
    }
}

/**
 * Check if email is available
 */
function checkEmail($input) {
    $email = sanitizeInput($input['email'] ?? '');
    
    if (empty($email) || !isValidEmail($email)) {
        jsonResponse(['available' => false, 'message' => 'Valid email is required'], 400);
    }
    
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        $available = !$stmt->fetch();
        
        jsonResponse([
            'available' => $available,
            'message' => $available ? 'Email is available' : 'Email is already registered'
        ]);
        
    } catch (PDOException $e) {
        jsonResponse(['available' => false, 'message' => 'Error checking email'], 500);
    }
}

// LineWatchX Project - Made with 🧡
?>

