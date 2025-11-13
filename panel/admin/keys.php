<?php
/**
 * KeyScopeX Panel - Admin Keys Management
 * View and manage all DRM keys from all users
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
    <title>Keys Database - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>Keys Database</p>
                    </div>
                </div>
                <nav class="nav">
                    <a href="index.php" class="btn btn-secondary btn-sm">Dashboard</a>
                    <a href="users.php" class="btn btn-secondary btn-sm">Users</a>
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
                <h2 class="card-title">Filters</h2>
                <button onclick="openAddKeyModal()" class="btn btn-primary btn-sm">Add Key Manually</button>
            </div>
            <div class="card-body">
                <div class="grid grid-3">
                    <div class="form-group">
                        <label class="form-label">DRM Type</label>
                        <select id="drmTypeFilter" class="form-select">
                            <option value="">All Types</option>
                            <option value="Widevine">Widevine</option>
                            <option value="PlayReady">PlayReady</option>
                            <option value="ClearKey">ClearKey</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Search</label>
                        <input type="text" id="searchInput" class="form-input" placeholder="PSSH, Key ID, or content title">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button onclick="loadKeys()" class="btn btn-primary" style="width: 100%;">Apply Filters</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Keys Table -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">All Keys (<span id="totalCount">0</span>)</h2>
                <button onclick="exportKeys()" class="btn btn-success btn-sm">Export All</button>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>DRM Type</th>
                                <th>Key ID</th>
                                <th>Key Value</th>
                                <th>User</th>
                                <th>License Type</th>
                                <th>Captured</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="keysTable">
                            <tr><td colspan="8" class="text-center"><div class="spinner"></div></td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="pagination" class="pagination"></div>
            </div>
        </div>

    </div>

    <footer class="footer">
        <p>Made with 🧡 by <span class="footer-brand">LineWatchX Project</span></p>
    </footer>

    <script>
        let currentPage = 1;
        const perPage = 50;

        async function loadKeys(page = 1) {
            currentPage = page;
            const drmType = document.getElementById('drmTypeFilter').value;
            const search = document.getElementById('searchInput').value;

            const params = new URLSearchParams({
                page: currentPage,
                per_page: perPage,
                drm_type: drmType,
                search: search
            });

            try {
                const response = await fetch(`../backend/api/admin.php?action=all_keys&${params}`);
                const data = await response.json();

                if (data.success) {
                    displayKeys(data.data);
                    displayPagination(data.pagination);
                    document.getElementById('totalCount').textContent = data.pagination.total;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function displayKeys(keys) {
            const tbody = document.getElementById('keysTable');
            
            if (!keys || keys.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">No keys found</td></tr>';
                return;
            }

            tbody.innerHTML = keys.map(key => `
                <tr>
                    <td>${key.id}</td>
                    <td><span class="badge badge-primary">${key.drm_type}</span></td>
                    <td><code style="font-size: 0.8rem;">${truncate(key.key_id, 16)}</code></td>
                    <td><code style="font-size: 0.8rem;">${truncate(key.key_value, 16)}</code></td>
                    <td>${escapeHtml(key.username)}</td>
                    <td><span class="badge badge-${key.license_type === 'PREMIUM' ? 'primary' : 'success'}">${key.license_type}</span></td>
                    <td>${formatDate(key.captured_at)}</td>
                    <td>
                        <button onclick="viewKey(${key.id})" class="btn btn-sm btn-secondary">View</button>
                        <button onclick="deleteKey(${key.id})" class="btn btn-sm btn-danger">Delete</button>
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
            if (pagination.page > 1) {
                html += `<button class="page-btn" onclick="loadKeys(${pagination.page - 1})">Previous</button>`;
            }
            for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.total_pages, pagination.page + 2); i++) {
                html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="loadKeys(${i})">${i}</button>`;
            }
            if (pagination.page < pagination.total_pages) {
                html += `<button class="page-btn" onclick="loadKeys(${pagination.page + 1})">Next</button>`;
            }
            container.innerHTML = html;
        }

        function viewKey(id) {
            alert('View key details - ID: ' + id);
        }

        async function deleteKey(id) {
            if (!confirm('Delete this key? This cannot be undone!')) return;

            try {
                const response = await fetch(`../backend/api/admin.php?action=delete_key&id=${id}`, {
                    method: 'POST'
                });
                const data = await response.json();

                if (data.success) {
                    alert('Key deleted');
                    loadKeys(currentPage);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function openAddKeyModal() {
            alert('Add Key Modal - Form to manually add keys');
        }

        function exportKeys() {
            window.location.href = '../backend/api/admin.php?action=export_keys';
        }

        function truncate(str, len) {
            return str.length > len ? str.substring(0, len) + '...' : str;
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

        loadKeys();
    </script>
</body>
</html>

