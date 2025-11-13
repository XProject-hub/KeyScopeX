<?php
/**
 * KeyScopeX Panel - Admin Dashboard
 * Main admin dashboard with system overview
 * LineWatchX Project
 */

session_start();
require_once '../backend/config/config.php';

// Check admin authentication
if (!isset($_SESSION['user_id']) || !$_SESSION['is_admin']) {
    header('Location: ../public/login.php');
    exit();
}

$pageTitle = "Admin Dashboard";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
        }
        .chart-container {
            margin-top: var(--spacing-xl);
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>Admin Dashboard</p>
                    </div>
                </div>
                <nav class="nav">
                    <div class="user-info">
                        <span class="username"><?php echo htmlspecialchars($_SESSION['username']); ?></span>
                        <span class="license-badge">ADMIN</span>
                    </div>
                    <a href="users.php" class="btn btn-secondary btn-sm">Users</a>
                    <a href="keys.php" class="btn btn-secondary btn-sm">Keys</a>
                    <a href="stats.php" class="btn btn-secondary btn-sm">Stats</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- Stats Cards -->
        <div class="dashboard-grid" id="statsContainer">
            <div class="stat-card pulse">
                <div class="stat-value" id="totalUsers">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="premiumUsers">-</div>
                <div class="stat-label">Premium Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="totalKeys">-</div>
                <div class="stat-label">Total Keys</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="keysToday">-</div>
                <div class="stat-label">Keys Today</div>
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

        <div class="grid grid-2">
            <!-- Recent Users -->
            <div class="card fade-in">
                <div class="card-header">
                    <h2 class="card-title">Recent Users</h2>
                    <a href="users.php" class="btn btn-primary btn-sm">View All</a>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>License Type</th>
                                    <th>Registered</th>
                                </tr>
                            </thead>
                            <tbody id="recentUsersTable">
                                <tr>
                                    <td colspan="3" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Recent Keys -->
            <div class="card fade-in">
                <div class="card-header">
                    <h2 class="card-title">Recent Keys</h2>
                    <a href="keys.php" class="btn btn-primary btn-sm">View All</a>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>DRM Type</th>
                                    <th>User</th>
                                    <th>Captured</th>
                                </tr>
                            </thead>
                            <tbody id="recentKeysTable">
                                <tr>
                                    <td colspan="3" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="card mt-lg">
            <div class="card-header">
                <h2 class="card-title">Quick Actions</h2>
            </div>
            <div class="card-body">
                <div class="flex gap-md">
                    <button onclick="openCreateLicenseModal()" class="btn btn-primary">
                        Create Premium License
                    </button>
                    <button onclick="openAddKeyModal()" class="btn btn-secondary">
                        Add Key Manually
                    </button>
                    <a href="stats.php" class="btn btn-secondary">
                        View Full Statistics
                    </a>
                </div>
            </div>
        </div>

        <!-- Expiring Licenses Alert -->
        <div id="expiringLicensesAlert"></div>

    </div>

    <!-- Footer -->
    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
        <p>KeyScopeX Panel v1.0.0 • Admin Dashboard</p>
    </footer>

    <script>
        // Load dashboard data
        async function loadDashboardData() {
            try {
                // Load stats
                const statsResponse = await fetch('../backend/api/admin.php?action=stats');
                const statsData = await statsResponse.json();
                
                if (statsData.success) {
                    const stats = statsData.data;
                    document.getElementById('totalUsers').textContent = stats.total_users || 0;
                    document.getElementById('premiumUsers').textContent = stats.premium_users || 0;
                    document.getElementById('totalKeys').textContent = stats.total_keys || 0;
                    document.getElementById('keysToday').textContent = stats.keys_today || 0;
                    document.getElementById('activeExtensions').textContent = stats.active_extensions_today || 0;
                    document.getElementById('visitorsToday').textContent = stats.visitors_today || 0;
                }

                // Load dashboard data (recent users and keys)
                const dashResponse = await fetch('../backend/api/admin.php?action=dashboard');
                const dashData = await dashResponse.json();
                
                if (dashData.success) {
                    displayRecentUsers(dashData.data.recent_users);
                    displayRecentKeys(dashData.data.recent_keys);
                    displayExpiringLicenses(dashData.data.expiring_licenses);
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

        function displayRecentUsers(users) {
            const tbody = document.getElementById('recentUsersTable');
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">No users yet</td></tr>';
                return;
            }

            tbody.innerHTML = users.slice(0, 5).map(user => `
                <tr>
                    <td>${escapeHtml(user.username)}</td>
                    <td><span class="badge badge-${user.license_type === 'PREMIUM' ? 'primary' : 'success'}">${user.license_type}</span></td>
                    <td>${formatDate(user.created_at)}</td>
                </tr>
            `).join('');
        }

        function displayRecentKeys(keys) {
            const tbody = document.getElementById('recentKeysTable');
            if (!keys || keys.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">No keys yet</td></tr>';
                return;
            }

            tbody.innerHTML = keys.slice(0, 5).map(key => `
                <tr>
                    <td><span class="badge badge-primary">${escapeHtml(key.drm_type)}</span></td>
                    <td>${escapeHtml(key.username)}</td>
                    <td>${formatDate(key.captured_at)}</td>
                </tr>
            `).join('');
        }

        function displayExpiringLicenses(licenses) {
            const container = document.getElementById('expiringLicensesAlert');
            if (!licenses || licenses.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="alert alert-warning mt-lg">
                    <strong>⚠️ ${licenses.length} license(s) expiring soon:</strong>
                    <ul style="margin: var(--spacing-sm) 0 0 var(--spacing-lg);">
                        ${licenses.map(lic => `
                            <li>${escapeHtml(lic.username)} (${escapeHtml(lic.email)}) - Expires: ${formatDate(lic.license_expires)}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        function openCreateLicenseModal() {
            alert('Create License Modal - To be implemented');
            window.location.href = 'licenses.php';
        }

        function openAddKeyModal() {
            alert('Add Key Modal - To be implemented');
            window.location.href = 'keys.php';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleString();
        }

        // Auto-refresh every 30 seconds
        setInterval(loadDashboardData, 30000);

        // Initial load
        loadDashboardData();
    </script>
</body>
</html>

