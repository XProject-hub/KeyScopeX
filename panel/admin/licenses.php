<?php
/**
 * KeyScopeX Panel - License Management
 * Create, upgrade, revoke licenses
 * LineWatchX Project
 */

session_start();
require_once '../backend/config/config.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['is_admin']) {
    header('Location: ../public/login.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Management - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>License Management</p>
                    </div>
                </div>
                <nav class="nav">
                    <a href="index.php" class="btn btn-secondary btn-sm">Dashboard</a>
                    <a href="users.php" class="btn btn-secondary btn-sm">Users</a>
                    <a href="keys.php" class="btn btn-secondary btn-sm">Keys</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- Create Premium License -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">Create Premium License</h2>
            </div>
            <div class="card-body">
                <form id="createLicenseForm">
                    <div class="grid grid-3">
                        <div class="form-group">
                            <label class="form-label">User ID</label>
                            <input type="number" id="userId" class="form-input" placeholder="Enter user ID" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Duration (Days)</label>
                            <input type="number" id="days" class="form-input" value="365" required>
                        </div>
                        <div class="form-group" style="display: flex; align-items: flex-end;">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Create PREMIUM License</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-3 mb-lg">
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="color: var(--primary); margin-bottom: var(--spacing-md);">Upgrade User</h3>
                    <button onclick="upgradeUserPrompt()" class="btn btn-primary">Upgrade to PREMIUM</button>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="color: var(--warning); margin-bottom: var(--spacing-md);">Revoke License</h3>
                    <button onclick="revokeLicensePrompt()" class="btn btn-danger">Revoke License</button>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 style="color: var(--success); margin-bottom: var(--spacing-md);">Extend License</h3>
                    <button onclick="extendLicensePrompt()" class="btn btn-success">Extend Duration</button>
                </div>
            </div>
        </div>

        <!-- License History -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Recent License Changes</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Action</th>
                                <th>Old Type</th>
                                <th>New Type</th>
                                <th>Expires</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody id="historyTable">
                            <tr><td colspan="6" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
    </footer>

    <script>
        document.getElementById('createLicenseForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const userId = document.getElementById('userId').value;
            const days = document.getElementById('days').value;

            try {
                const response = await fetch('../backend/api/admin.php?action=create_license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: parseInt(userId),
                        license_type: 'PREMIUM',
                        days: parseInt(days)
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert('PREMIUM license created successfully!');
                    document.getElementById('createLicenseForm').reset();
                    loadHistory();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error creating license');
            }
        });

        function upgradeUserPrompt() {
            const userId = prompt('Enter User ID to upgrade to PREMIUM:');
            if (!userId) return;

            upgradeToPremium(parseInt(userId), 365);
        }

        async function upgradeToPremium(userId, days) {
            try {
                const response = await fetch('../backend/api/admin.php?action=upgrade_license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, days: days })
                });

                const data = await response.json();
                alert(data.success ? 'User upgraded to PREMIUM!' : 'Error: ' + data.message);
                if (data.success) loadHistory();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function revokeLicensePrompt() {
            const userId = prompt('Enter User ID to revoke license:');
            if (!userId) return;

            const reason = prompt('Reason for revocation:');
            revokeLicense(parseInt(userId), reason);
        }

        async function revokeLicense(userId, reason) {
            try {
                const response = await fetch('../backend/api/admin.php?action=revoke_license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, reason: reason })
                });

                const data = await response.json();
                alert(data.success ? 'License revoked' : 'Error: ' + data.message);
                if (data.success) loadHistory();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function extendLicensePrompt() {
            const userId = prompt('Enter User ID to extend:');
            if (!userId) return;

            const days = prompt('Extend by how many days?', '30');
            if (!days) return;

            extendLicense(parseInt(userId), parseInt(days));
        }

        async function extendLicense(userId, days) {
            try {
                const response = await fetch('../backend/api/admin.php?action=extend_license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, days: days })
                });

                const data = await response.json();
                alert(data.success ? `License extended by ${days} days!` : 'Error: ' + data.message);
                if (data.success) loadHistory();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function loadHistory() {
            // Load license history - placeholder
            document.getElementById('historyTable').innerHTML = '<tr><td colspan="6" class="text-center">License history will appear here</td></tr>';
        }

        loadHistory();
    </script>
</body>
</html>

