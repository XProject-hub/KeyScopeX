<?php
/**
 * KeyScopeX Panel - Admin Authentication Middleware
 * Ensures only admins can access admin API endpoints
 * LineWatchX Project
 */

function requireAdmin() {
    // Check if session is started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        jsonResponse([
            'success' => false,
            'message' => 'Authentication required'
        ], 401);
    }
    
    // Check session timeout
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
        session_destroy();
        jsonResponse([
            'success' => false,
            'message' => 'Session expired'
        ], 401);
    }
    
    // Check if user is admin
    if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
        jsonResponse([
            'success' => false,
            'message' => 'Admin access required'
        ], 403);
    }
    
    return true;
}

function requireAuth() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['user_id'])) {
        jsonResponse([
            'success' => false,
            'message' => 'Authentication required'
        ], 401);
    }
    
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
        session_destroy();
        jsonResponse([
            'success' => false,
            'message' => 'Session expired'
        ], 401);
    }
    
    return true;
}

// LineWatchX Project - Made with 🧡
?>

