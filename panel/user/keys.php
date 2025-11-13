<?php
/**
 * KeyScopeX Panel - My Keys Page
 * View all collected keys for logged-in user
 * LineWatchX Project
 */

session_start();
require_once '../backend/config/config.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: ../public/login.php');
    exit();
}

$username = $_SESSION['username'];
$licenseType = $_SESSION['license_type'];

// Get user's license key
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT license_key FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    $licenseKey = $user['license_key'] ?? '';
} catch (Exception $e) {
    $licenseKey = '';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Keys - KeyScopeX Panel</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">
                        <h1>🔑 KeyScopeX Panel</h1>
                        <p>My Collected Keys</p>
                    </div>
                </div>
                <nav class="nav">
                    <div class="user-info">
                        <span class="username"><?php echo htmlspecialchars($username); ?></span>
                        <span class="license-badge"><?php echo $licenseType; ?></span>
                    </div>
                    <a href="index.php" class="btn btn-secondary btn-sm">Dashboard</a>
                    <a href="profile.php" class="btn btn-secondary btn-sm">Profile</a>
                    <a href="../public/logout.php" class="btn btn-danger btn-sm">Logout</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="container" style="padding: var(--spacing-xl) var(--spacing-lg);">
        
        <!-- Filters -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">Filters & Search</h2>
                <button onclick="exportKeys()" class="btn btn-primary btn-sm">Export All Keys</button>
            </div>
            <div class="card-body">
                <div class="grid grid-3">
                    <div class="form-group">
                        <label class="form-label">Search</label>
                        <input type="text" id="searchInput" class="form-input" placeholder="Search PSSH, key ID, URL...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">DRM Type</label>
                        <select id="drmTypeFilter" class="form-select">
                            <option value="">All Types</option>
                            <option value="Widevine">Widevine</option>
                            <option value="PlayReady">PlayReady</option>
                            <option value="ClearKey">ClearKey</option>
                        </select>
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
                <h2 class="card-title">
                    My Collected Keys (<span id="totalCount">0</span>)
                    <?php if ($licenseType === 'PREMIUM'): ?>
                    <span class="badge badge-primary">PREMIUM: Access to ALL keys</span>
                    <?php endif; ?>
                </h2>
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
                                <th>Content</th>
                                <th>Captured</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="keysTable">
                            <tr>
                                <td colspan="7" class="text-center">
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

    <footer class="footer">
        <p>Developed by <span class="footer-brand">X Project</span> | Version 1.0.1</p>
    </footer>

    <script>
        const LICENSE_KEY = '<?php echo $licenseKey; ?>';
        const LICENSE_TYPE = '<?php echo $licenseType; ?>';
        let currentPage = 1;
        const perPage = 50;

        async function loadKeys(page = 1) {
            currentPage = page;
            const drmType = document.getElementById('drmTypeFilter').value;

            const params = new URLSearchParams({
                page: currentPage,
                per_page: perPage,
                drm_type: drmType
            });

            const action = LICENSE_TYPE === 'PREMIUM' ? 'list_all' : 'list';

            try {
                const response = await fetch(`../backend/api/keys.php?action=${action}&${params}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-License-Key': LICENSE_KEY
                    },
                    body: JSON.stringify({ license_key: LICENSE_KEY })
                });

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
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No keys collected yet. Capture some DRM keys with the extension!</td></tr>';
                return;
            }

            tbody.innerHTML = keys.map(key => `
                <tr>
                    <td>${key.id}</td>
                    <td><span class="badge badge-primary">${escapeHtml(key.drm_type)}</span></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_id, 20)}</code></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_value, 20)}</code></td>
                    <td>${key.content_title || truncate(key.manifest_url || 'N/A', 30)}</td>
                    <td>${formatDate(key.captured_at)}</td>
                    <td>
                        <button onclick="viewKey(${key.id})" class="btn btn-sm btn-secondary">View</button>
                        <button onclick="copyKey('${key.key_id}', '${key.key_value}')" class="btn btn-sm btn-primary">Copy</button>
                        ${!key.collected_by ? `<button onclick="deleteKey(${key.id})" class="btn btn-sm btn-danger">Delete</button>` : ''}
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

        function viewKey(keyId) {
            alert('View key details - ID: ' + keyId);
        }

        function copyKey(keyId, keyValue) {
            const text = `${keyId}:${keyValue}`;
            navigator.clipboard.writeText(text).then(() => {
                alert('Key copied to clipboard!');
            });
        }

        async function deleteKey(keyId) {
            if (!confirm('Delete this key?')) return;

            try {
                const response = await fetch(`../backend/api/keys.php?action=delete&id=${keyId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-License-Key': LICENSE_KEY
                    }
                });

                const data = await response.json();

                if (data.success) {
                    alert('Key deleted successfully');
                    loadKeys(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                alert('Error deleting key');
            }
        }

        async function exportKeys() {
            window.open(`../backend/api/keys.php?action=export&license_key=${LICENSE_KEY}`, '_blank');
        }

        function showError(message) {
            const tbody = document.getElementById('keysTable');
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--error);">${message}</td></tr>`;
        }

        function escapeHtml(text) {
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

        loadKeys();
    </script>
</body>
</html>
