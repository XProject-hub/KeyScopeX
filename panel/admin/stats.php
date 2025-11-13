<?php
/**
 * KeyScopeX Panel - Statistics & Logs
 * Complete system analytics for admins
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
    <title>Statistics - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>Statistics & Analytics</p>
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
        
        <!-- System Overview -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">System Overview</h2>
            </div>
            <div class="card-body">
                <div class="grid grid-4">
                    <div class="stat-card">
                        <div class="stat-value" id="totalUsers">-</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalKeys">-</div>
                        <div class="stat-label">Total Keys</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="activeExtensions">-</div>
                        <div class="stat-label">Active Extensions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="visitorsToday">-</div>
                        <div class="stat-label">Visitors Today</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Extension Activity Logs -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">Extension Activity</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Action</th>
                                <th>IP Address</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody id="activityLogsTable">
                            <tr><td colspan="4" class="text-center"><div class="spinner"></div></td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="activityPagination" class="pagination"></div>
            </div>
        </div>

        <!-- Admin Action Logs -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Admin Actions</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Admin</th>
                                <th>Action</th>
                                <th>Target User</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody id="adminLogsTable">
                            <tr><td colspan="4" class="text-center"><div class="spinner"></div></td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="adminPagination" class="pagination"></div>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
    </footer>

    <script>
        async function loadStats() {
            try {
                const response = await fetch('../backend/api/admin.php?action=stats');
                const data = await response.json();

                if (data.success) {
                    const stats = data.data;
                    document.getElementById('totalUsers').textContent = stats.total_users || 0;
                    document.getElementById('totalKeys').textContent = stats.total_keys || 0;
                    document.getElementById('activeExtensions').textContent = stats.active_extensions_today || 0;
                    document.getElementById('visitorsToday').textContent = stats.visitors_today || 0;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadActivityLogs(page = 1) {
            try {
                const response = await fetch(`../backend/api/admin.php?action=activity_logs&page=${page}&per_page=20`);
                const data = await response.json();

                if (data.success) {
                    const tbody = document.getElementById('activityLogsTable');
                    tbody.innerHTML = data.data.map(log => `
                        <tr>
                            <td>${escapeHtml(log.username)}</td>
                            <td><span class="badge badge-primary">${log.action}</span></td>
                            <td><code>${log.ip_address}</code></td>
                            <td>${formatDate(log.created_at)}</td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadAdminLogs(page = 1) {
            try {
                const response = await fetch(`../backend/api/admin.php?action=admin_logs&page=${page}&per_page=20`);
                const data = await response.json();

                if (data.success) {
                    const tbody = document.getElementById('adminLogsTable');
                    tbody.innerHTML = data.data.map(log => `
                        <tr>
                            <td>${escapeHtml(log.admin_username)}</td>
                            <td><span class="badge badge-warning">${log.action}</span></td>
                            <td>${log.target_username || 'N/A'}</td>
                            <td>${formatDate(log.created_at)}</td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function openAddKeyModal() {
            const drmType = prompt('DRM Type (Widevine/PlayReady/ClearKey):');
            if (!drmType) return;
            
            const pssh = prompt('PSSH:');
            if (!pssh) return;
            
            const keyId = prompt('Key ID:');
            if (!keyId) return;
            
            const keyValue = prompt('Key Value:');
            if (!keyValue) return;

            addKeyManually(drmType, pssh, keyId, keyValue);
        }

        async function addKeyManually(drmType, pssh, keyId, keyValue) {
            try {
                const response = await fetch('../backend/api/admin.php?action=add_key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        drm_type: drmType,
                        pssh: pssh,
                        key_id: keyId,
                        key_value: keyValue
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Key added successfully!');
                    window.location.href = 'keys.php';
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error adding key');
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString();
        }

        // Load data
        loadStats();
        loadActivityLogs();
        loadAdminLogs();

        // Auto-refresh every 30 seconds
        setInterval(() => {
            loadStats();
            loadActivityLogs();
        }, 30000);
    </script>
</body>
</html>

