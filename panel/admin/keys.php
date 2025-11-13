<?php
/**
 * KeyScopeX Panel - Admin Keys Management
 * View all keys and manually add MPD + Keys
 * X Project
 */

session_start();
require_once '../backend/config/config.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['is_admin']) {
    header('Location: ../public/login.php');
    exit();
}

$pageTitle = "Keys Management";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: linear-gradient(135deg, var(--dark-blue), var(--secondary));
            border: 3px solid var(--primary);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>Keys Database Management</p>
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
                <button onclick="openAddKeyModal()" class="btn btn-primary">Add Key Manually</button>
            </div>
            <div class="card-body">
                <div class="grid grid-2">
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
                </div>
                <button onclick="loadKeys()" class="btn btn-primary" style="margin-top: var(--spacing-md);">Apply Filters</button>
            </div>
        </div>

        <!-- Keys Table -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">All Keys (<span id="totalCount">0</span>)</h2>
                <button onclick="exportAllKeys()" class="btn btn-success">Export All</button>
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
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="spinner"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div id="pagination" class="pagination"></div>
            </div>
        </div>

    </div>

    <!-- Add Key Modal -->
    <div id="addKeyModal" class="modal">
        <div class="modal-content">
            <h2 class="card-title" style="margin-bottom: var(--spacing-lg); color: var(--primary);">
                Add Key Manually
            </h2>
            
            <form id="addKeyForm">
                <div class="form-group">
                    <label class="form-label">MPD Link (Manifest URL)</label>
                    <input type="url" id="mpdLink" class="form-input" placeholder="https://example.com/manifest.mpd" required>
                    <div class="form-help">Full URL to the MPD/manifest file</div>
                </div>

                <div class="form-group">
                    <label class="form-label">DRM Type</label>
                    <select id="drmType" class="form-select" required>
                        <option value="">Select DRM Type</option>
                        <option value="Widevine">Widevine</option>
                        <option value="PlayReady">PlayReady</option>
                        <option value="ClearKey">ClearKey</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">PSSH (optional)</label>
                    <input type="text" id="pssh" class="form-input" placeholder="CAESEPrmF8...">
                    <div class="form-help">Protection System Specific Header (if available)</div>
                </div>

                <div class="form-group">
                    <label class="form-label">KID (Key ID)</label>
                    <input type="text" id="keyId" class="form-input" placeholder="abcd1234..." required>
                    <div class="form-help">Decryption key ID in hex format</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Key Value</label>
                    <input type="text" id="keyValue" class="form-input" placeholder="efgh5678..." required>
                    <div class="form-help">Decryption key in hex format</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Content Title (optional)</label>
                    <input type="text" id="contentTitle" class="form-input" placeholder="Movie Name, Show Title, etc">
                </div>

                <div class="flex gap-md" style="margin-top: var(--spacing-xl);">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Add Key</button>
                    <button type="button" onclick="closeAddKeyModal()" class="btn btn-danger" style="flex: 1;">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- View Key Modal -->
    <div id="viewKeyModal" class="modal">
        <div class="modal-content">
            <h2 class="card-title" style="margin-bottom: var(--spacing-lg); color: var(--primary);">
                Key Details
            </h2>
            <div id="keyDetailsContent"></div>
            <button onclick="closeViewKeyModal()" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-lg);">
                Close
            </button>
        </div>
    </div>

    <footer class="footer">
        <p>Developed by <span class="footer-brand">X Project</span> | Version 1.0.1</p>
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
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Error loading keys');
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
                    <td><span class="badge badge-primary">${escapeHtml(key.drm_type)}</span></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_id, 16)}</code></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_value, 16)}</code></td>
                    <td>${escapeHtml(key.username || 'Manual')}</td>
                    <td><span class="badge badge-${key.license_type === 'PREMIUM' ? 'primary' : 'success'}">${key.license_type || 'ADMIN'}</span></td>
                    <td>${formatDate(key.captured_at)}</td>
                    <td>
                        <button onclick='viewKeyDetails(${JSON.stringify(key).replace(/'/g, "&apos;")})' class="btn btn-sm btn-primary">View</button>
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

        function openAddKeyModal() {
            document.getElementById('addKeyModal').classList.add('active');
        }

        function closeAddKeyModal() {
            document.getElementById('addKeyModal').classList.remove('active');
            document.getElementById('addKeyForm').reset();
        }

        document.getElementById('addKeyForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const keyData = {
                drm_type: document.getElementById('drmType').value,
                pssh: document.getElementById('pssh').value || 'MANUAL_ENTRY',
                key_id: document.getElementById('keyId').value,
                key_value: document.getElementById('keyValue').value,
                manifest_url: document.getElementById('mpdLink').value,
                content_title: document.getElementById('contentTitle').value
            };

            try {
                const response = await fetch('../backend/api/admin.php?action=add_key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(keyData)
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Key added successfully!');
                    closeAddKeyModal();
                    loadKeys(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error adding key');
            }
        });

        function viewKeyDetails(key) {
            const content = document.getElementById('keyDetailsContent');
            content.innerHTML = `
                <div style="background: var(--darkest); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 2px solid var(--primary);">
                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">MPD Link (Manifest URL):</p>
                        <p style="font-family: monospace; font-size: 0.9rem; color: var(--primary); word-break: break-all;">${escapeHtml(key.manifest_url || 'N/A')}</p>
                        <button onclick="copyText('${escapeHtml(key.manifest_url)}')" class="btn btn-sm btn-primary" style="margin-top: var(--spacing-xs);">Copy MPD Link</button>
                    </div>
                    
                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">KID:Key Format:</p>
                        <p style="font-family: monospace; font-size: 0.9rem; color: var(--orange); word-break: break-all;">${escapeHtml(key.key_id)}:${escapeHtml(key.key_value)}</p>
                        <button onclick="copyText('${escapeHtml(key.key_id)}:${escapeHtml(key.key_value)}')" class="btn btn-sm btn-primary" style="margin-top: var(--spacing-xs);">Copy KID:Key</button>
                    </div>

                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">DRM Type:</p>
                        <p><span class="badge badge-primary">${escapeHtml(key.drm_type)}</span></p>
                    </div>

                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">PSSH:</p>
                        <p style="font-family: monospace; font-size: 0.8rem; word-break: break-all;">${escapeHtml(key.pssh)}</p>
                        <button onclick="copyText('${escapeHtml(key.pssh)}')" class="btn btn-sm btn-secondary" style="margin-top: var(--spacing-xs);">Copy PSSH</button>
                    </div>

                    ${key.license_url ? `
                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">License URL:</p>
                        <p style="font-family: monospace; font-size: 0.8rem; word-break: break-all;">${escapeHtml(key.license_url)}</p>
                    </div>
                    ` : ''}

                    ${key.content_title ? `
                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Content Title:</p>
                        <p>${escapeHtml(key.content_title)}</p>
                    </div>
                    ` : ''}

                    <div style="margin-bottom: var(--spacing-md);">
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Collected By:</p>
                        <p>${escapeHtml(key.username || 'Admin (Manual)')}</p>
                    </div>

                    <div>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Captured At:</p>
                        <p>${formatDate(key.captured_at)}</p>
                    </div>
                </div>
            `;
            document.getElementById('viewKeyModal').classList.add('active');
        }

        function closeViewKeyModal() {
            document.getElementById('viewKeyModal').classList.remove('active');
        }

        async function deleteKey(keyId) {
            if (!confirm('Delete this key? This cannot be undone!')) return;

            try {
                const response = await fetch(`../backend/api/admin.php?action=delete_key&id=${keyId}`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Key deleted successfully');
                    loadKeys(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting key');
            }
        }

        async function exportAllKeys() {
            window.open('../backend/api/admin.php?action=export_all_keys', '_blank');
        }

        function copyText(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ Copied to clipboard!');
            }).catch(err => {
                alert('Failed to copy');
            });
        }

        function showError(message) {
            const tbody = document.getElementById('keysTable');
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--error);">${message}</td></tr>`;
        }

        function escapeHtml(text) {
            if (!text) return 'N/A';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function truncate(str, length) {
            if (!str) return 'N/A';
            return str.length > length ? str.substring(0, length) + '...' : str;
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleString();
        }

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Initial load
        loadKeys();
    </script>
</body>
</html>
