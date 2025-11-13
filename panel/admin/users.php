<?php
/**
 * KeyScopeX Panel - User Management
 * Admin page for managing all users
 * LineWatchX Project
 */

session_start();
require_once '../backend/config/config.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['is_admin']) {
    header('Location: ../public/login.php');
    exit();
}

$pageTitle = "User Management";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>User Management</p>
                    </div>
                </div>
                <nav class="nav">
                    <a href="index.php" class="btn btn-secondary btn-sm">Dashboard</a>
                    <a href="keys.php" class="btn btn-secondary btn-sm">Keys</a>
                    <a href="stats.php" class="btn btn-secondary btn-sm">Stats</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- Filters -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">User Filters</h2>
            </div>
            <div class="card-body">
                <div class="grid grid-4">
                    <div class="form-group">
                        <label class="form-label">Search</label>
                        <input type="text" id="searchInput" class="form-input" placeholder="Username or email">
                    </div>
                    <div class="form-group">
                        <label class="form-label">License Type</label>
                        <select id="licenseTypeFilter" class="form-select">
                            <option value="">All Types</option>
                            <option value="FREE">FREE</option>
                            <option value="PREMIUM">PREMIUM</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="statusFilter" class="form-select">
                            <option value="">All Status</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="REVOKED">REVOKED</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button onclick="loadUsers()" class="btn btn-primary" style="width: 100%;">Apply Filters</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users Table -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">All Users (<span id="totalCount">0</span>)</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>License Type</th>
                                <th>Status</th>
                                <th>Keys</th>
                                <th>Registered</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTable">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="spinner"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                <div id="pagination" class="pagination"></div>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Developed by <span class="footer-brand">X Project</span> | Version 1.0.1</p>
    </footer>

    <script>
        let currentPage = 1;
        const perPage = 50;

        async function loadUsers(page = 1) {
            currentPage = page;
            const search = document.getElementById('searchInput').value;
            const licenseType = document.getElementById('licenseTypeFilter').value;
            const status = document.getElementById('statusFilter').value;

            const params = new URLSearchParams({
                page: currentPage,
                per_page: perPage,
                search: search,
                license_type: licenseType,
                license_status: status
            });

            try {
                const response = await fetch(`../backend/api/admin.php?action=users&${params}`);
                const data = await response.json();

                if (data.success) {
                    displayUsers(data.data);
                    displayPagination(data.pagination);
                    document.getElementById('totalCount').textContent = data.pagination.total;
                } else {
                    showError('Failed to load users');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Error loading users');
            }
        }

        function displayUsers(users) {
            const tbody = document.getElementById('usersTable');
            
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${escapeHtml(user.username)}</strong></td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>
                        <span class="badge badge-${user.license_type === 'PREMIUM' ? 'primary' : 'success'}">
                            ${user.license_type}
                        </span>
                    </td>
                    <td>
                        <span class="status-indicator status-${user.license_status === 'ACTIVE' ? 'active' : 'inactive'}"></span>
                        ${user.license_status}
                    </td>
                    <td>${user.total_keys || 0}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <button onclick="viewUser(${user.id})" class="btn btn-sm btn-secondary">View</button>
                        ${user.license_type === 'FREE' ? 
                            `<button onclick="upgradeToPremium(${user.id})" class="btn btn-sm btn-primary">Upgrade</button>` : 
                            ''}
                        <button onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')" class="btn btn-sm btn-danger">Delete</button>
                    </td>
                </tr>
            `).join('');
        }

        function displayPagination(pagination) {
            const container = document.getElementById('pagination');
            if (!pagination || pagination.total_pages <= 1) {
                container.innerHTML = '';
                return;
            }

            let html = '';
            
            // Previous button
            if (pagination.page > 1) {
                html += `<button class="page-btn" onclick="loadUsers(${pagination.page - 1})">Previous</button>`;
            }

            // Page numbers
            for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.total_pages, pagination.page + 2); i++) {
                html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
            }

            // Next button
            if (pagination.page < pagination.total_pages) {
                html += `<button class="page-btn" onclick="loadUsers(${pagination.page + 1})">Next</button>`;
            }

            container.innerHTML = html;
        }

        async function viewUser(userId) {
            try {
                const response = await fetch(`../backend/api/admin.php?action=user_details&id=${userId}`);
                const data = await response.json();

                if (data.success) {
                    const user = data.data.user;
                    alert(`User Details:\n\nID: ${user.id}\nUsername: ${user.username}\nEmail: ${user.email}\nLicense: ${user.license_type}\nKeys Collected: ${user.total_keys}\nLicense Key: ${user.license_key}`);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function upgradeToPremium(userId) {
            if (!confirm('Upgrade this user to PREMIUM for 365 days?')) return;

            try {
                const response = await fetch('../backend/api/admin.php?action=upgrade_license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        days: 365
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert('User upgraded to PREMIUM!');
                    loadUsers(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error upgrading user');
            }
        }

        async function deleteUser(userId, username) {
            if (!confirm(`Delete user "${username}"? This cannot be undone!`)) return;

            try {
                const response = await fetch(`../backend/api/admin.php?action=delete_user&id=${userId}`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    alert('User deleted successfully');
                    loadUsers(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting user');
            }
        }

        function showError(message) {
            const tbody = document.getElementById('usersTable');
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--error);">${message}</td></tr>`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }

        // Initial load
        loadUsers();
    </script>
</body>
</html>

