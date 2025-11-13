<?php
/**
 * KeyScopeX Panel - User Dashboard
 * Main dashboard for regular users
 * LineWatchX Project
 */

session_start();
require_once '../backend/config/config.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: ../public/login.php');
    exit();
}

$userId = $_SESSION['user_id'];
$username = $_SESSION['username'];
$licenseType = $_SESSION['license_type'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>Welcome back, <?php echo htmlspecialchars($username); ?>!</p>
                    </div>
                </div>
                <nav class="nav">
                    <div class="user-info">
                        <span class="username"><?php echo htmlspecialchars($username); ?></span>
                        <span class="license-badge <?php echo $licenseType === 'PREMIUM' ? '' : 'badge-success'; ?>">
                            <?php echo $licenseType; ?>
                        </span>
                    </div>
                    <a href="keys.php" class="btn btn-primary btn-sm">My Keys</a>
                    <a href="profile.php" class="btn btn-secondary btn-sm">Profile</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- License Info Card -->
        <div class="card mb-lg <?php echo $licenseType === 'PREMIUM' ? 'pulse' : ''; ?>">
            <div class="card-header">
                <h2 class="card-title">Your License</h2>
                <span class="badge badge-<?php echo $licenseType === 'PREMIUM' ? 'primary' : 'success'; ?> badge-lg">
                    <?php echo $licenseType; ?> LICENSE
                </span>
            </div>
            <div class="card-body">
                <div class="grid grid-2">
                    <div>
                        <p style="color: var(--text-muted); margin-bottom: var(--spacing-sm);">License Key:</p>
                        <p style="font-family: 'Courier New', monospace; font-size: 1.1rem; color: var(--primary); font-weight: 700;" id="licenseKey">
                            Loading...
                        </p>
                        <button onclick="copyLicenseKey()" class="btn btn-sm btn-primary" style="margin-top: var(--spacing-sm);">
                            Copy License Key
                        </button>
                    </div>
                    <div>
                        <p style="color: var(--text-muted); margin-bottom: var(--spacing-sm);">Status:</p>
                        <p style="font-size: 1.1rem;">
                            <span class="status-indicator status-active"></span>
                            ACTIVE
                        </p>
                        <?php if ($licenseType === 'FREE'): ?>
                        <div style="margin-top: var(--spacing-lg);">
                            <p style="color: var(--text-muted); margin-bottom: var(--spacing-sm);">Upgrade to PREMIUM to:</p>
                            <ul style="margin-left: var(--spacing-lg); color: var(--primary);">
                                <li>Access ALL keys from ALL users</li>
                                <li>Unlimited key storage</li>
                                <li>Global search access</li>
                            </ul>
                            <button class="btn btn-primary" style="margin-top: var(--spacing-md);" onclick="alert('Contact admin for premium upgrade!')">
                                Upgrade to PREMIUM
                            </button>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-3 mb-lg">
            <div class="stat-card">
                <div class="stat-value" id="totalKeys">-</div>
                <div class="stat-label">Keys Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayKeys">-</div>
                <div class="stat-label">Keys Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="lastCapture">-</div>
                <div class="stat-label">Last Capture</div>
            </div>
        </div>

        <!-- Recent Keys -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Recent Captures</h2>
                <a href="keys.php" class="btn btn-primary btn-sm">View All Keys</a>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>DRM Type</th>
                                <th>Key ID</th>
                                <th>Content</th>
                                <th>Captured</th>
                            </tr>
                        </thead>
                        <tbody id="recentKeysTable">
                            <tr>
                                <td colspan="4" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Extension Integration Guide -->
        <div class="card mt-lg">
            <div class="card-header">
                <h2 class="card-title">Extension Setup</h2>
            </div>
            <div class="card-body">
                <p style="margin-bottom: var(--spacing-md);">To use KeyScopeX extension with your account:</p>
                <ol style="margin-left: var(--spacing-lg); line-height: 2;">
                    <li>Install the KeyScopeX browser extension</li>
                    <li>Open extension settings</li>
                    <li>Paste your license key: <code id="licenseKeyInline" style="color: var(--primary); font-weight: 700;"></code></li>
                    <li>Click "Activate License"</li>
                    <li>Captured keys will automatically appear in your dashboard!</li>
                </ol>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
        <p>KeyScopeX Panel v1.0.0</p>
    </footer>

    <script>
        let userLicenseKey = '';

        async function loadDashboardData() {
            try {
                // Get license info (includes key)
                const response = await fetch('../backend/api/license.php?action=info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: <?php echo $userId; ?> })
                });

                // For now, just set placeholder - full implementation would use session
                userLicenseKey = 'Loading...';
                
                // Load user's keys
                loadRecentKeys();
                loadStats();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadStats() {
            // This would call an API to get user stats
            // For now, placeholder
            document.getElementById('totalKeys').textContent = '0';
            document.getElementById('todayKeys').textContent = '0';
            document.getElementById('lastCapture').textContent = 'Never';
        }

        async function loadRecentKeys() {
            try {
                // This would load user's recent keys
                // Placeholder for now
                document.getElementById('recentKeysTable').innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">
                            No keys captured yet. Install the extension and start capturing!
                        </td>
                    </tr>
                `;
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function copyLicenseKey() {
            // In production, this would copy the actual license key
            alert('License key copy functionality - integrate with API');
        }

        // Load data on page load
        loadDashboardData();
    </script>
</body>
</html>

