<?php
/**
 * KeyScopeX Panel - User Profile
 * User settings and profile management
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
$email = $_SESSION['email'];
$licenseType = $_SESSION['license_type'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>My Profile</p>
                    </div>
                </div>
                <nav class="nav">
                    <a href="index.php" class="btn btn-secondary btn-sm">Dashboard</a>
                    <a href="keys.php" class="btn btn-primary btn-sm">My Keys</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- Profile Info -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">Profile Information</h2>
            </div>
            <div class="card-body">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-input" value="<?php echo htmlspecialchars($username); ?>" disabled>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" value="<?php echo htmlspecialchars($email); ?>" disabled>
                    </div>
                </div>
            </div>
        </div>

        <!-- License Info -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">License Information</h2>
                <span class="badge badge-<?php echo $licenseType === 'PREMIUM' ? 'primary' : 'success'; ?> badge-lg">
                    <?php echo $licenseType; ?>
                </span>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Your License Key</label>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="text" id="licenseKeyDisplay" class="form-input" style="font-family: 'Courier New', monospace;" value="Loading..." disabled>
                        <button onclick="copyLicenseKey()" class="btn btn-primary">Copy</button>
                    </div>
                    <p class="form-help">Use this license key in the KeyScopeX browser extension</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Status</label>
                    <p><span class="status-indicator status-active"></span> ACTIVE</p>
                </div>

                <?php if ($licenseType === 'FREE'): ?>
                <div class="alert alert-info" style="margin-top: var(--spacing-lg);">
                    <strong>📈 Upgrade to PREMIUM</strong>
                    <p>Access ALL keys from ALL users globally. Contact admin to upgrade!</p>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Account Settings -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Account Settings</h2>
            </div>
            <div class="card-body">
                <h3 style="color: var(--primary); margin-bottom: var(--spacing-lg);">Change Password</h3>
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" id="currentPassword" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newPassword" class="form-input" minlength="8" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-input" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Update Password</button>
                </form>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
    </footer>

    <script>
        function copyLicenseKey() {
            const licenseKey = document.getElementById('licenseKeyDisplay').value;
            navigator.clipboard.writeText(licenseKey).then(() => {
                alert('License key copied to clipboard!');
            });
        }

        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (newPass !== confirm) {
                alert('New passwords do not match!');
                return;
            }

            // API call to change password would go here
            alert('Password change functionality - integrate with API');
        });
    </script>
</body>
</html>

