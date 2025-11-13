<?php
/**
 * KeyScopeX Panel - My Keys
 * User's collected DRM keys viewer
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
        
        <?php if ($licenseType === 'PREMIUM'): ?>
        <!-- PREMIUM Feature Toggle -->
        <div class="card mb-lg" style="border-color: var(--primary); background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05));">
            <div class="card-body">
                <div class="flex" style="justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="color: var(--primary); margin-bottom: var(--spacing-sm);">🌟 PREMIUM Feature Active</h3>
                        <p style="color: var(--text-muted);">You can view keys from all users globally</p>
                    </div>
                    <div>
                        <label style="display: flex; align-items: center; gap: var(--spacing-md); cursor: pointer;">
                            <span>Show Global Keys</span>
                            <input type="checkbox" id="globalToggle" style="width: 20px; height: 20px;">
                        </label>
                    </div>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Filters -->
        <div class="card mb-lg">
            <div class="card-header">
                <h2 class="card-title">Filters</h2>
                <button onclick="exportMyKeys()" class="btn btn-success btn-sm">Export Keys</button>
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
                        <input type="text" id="searchInput" class="form-input" placeholder="PSSH or content title">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button onclick="loadKeys()" class="btn btn-primary" style="width: 100%;">Apply</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Keys Table -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <span id="tableTitle">My Keys</span> (<span id="totalCount">0</span>)
                </h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>DRM Type</th>
                                <th>Key ID</th>
                                <th>Key Value</th>
                                <?php if ($licenseType === 'PREMIUM'): ?>
                                <th>Collected By</th>
                                <?php endif; ?>
                                <th>Captured</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="keysTable">
                            <tr><td colspan="<?php echo $licenseType === 'PREMIUM' ? '6' : '5'; ?>" class="text-center"><div class="spinner"></div></td></tr>
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
        const isPremium = <?php echo $licenseType === 'PREMIUM' ? 'true' : 'false'; ?>;
        let showGlobal = false;
        let currentPage = 1;

        <?php if ($licenseType === 'PREMIUM'): ?>
        document.getElementById('globalToggle').addEventListener('change', (e) => {
            showGlobal = e.target.checked;
            document.getElementById('tableTitle').textContent = showGlobal ? 'Global Keys (All Users)' : 'My Keys';
            loadKeys();
        });
        <?php endif; ?>

        async function loadKeys(page = 1) {
            currentPage = page;
            const licenseKey = 'USER_LICENSE_KEY'; // Would get from session/storage
            
            const endpoint = showGlobal && isPremium ? 'list_all' : 'list';
            const params = new URLSearchParams({
                page: currentPage,
                per_page: 50,
                drm_type: document.getElementById('drmTypeFilter').value
            });

            try {
                const response = await fetch(`../backend/api/keys.php?action=${endpoint}&${params}`, {
                    method: 'GET',
                    headers: { 'X-License-Key': licenseKey }
                });
                
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
                tbody.innerHTML = `<tr><td colspan="${isPremium ? '6' : '5'}" class="text-center">
                    No keys found. Start using the extension to collect keys!
                </td></tr>`;
                return;
            }

            tbody.innerHTML = keys.map(key => `
                <tr>
                    <td><span class="badge badge-primary">${key.drm_type}</span></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_id, 20)}</code></td>
                    <td><code style="font-size: 0.75rem;">${truncate(key.key_value, 20)}</code></td>
                    ${isPremium ? `<td>${escapeHtml(key.collected_by || 'You')}</td>` : ''}
                    <td>${formatDate(key.captured_at)}</td>
                    <td>
                        <button onclick="copyKey('${key.key_id}:${key.key_value}')" class="btn btn-sm btn-primary">Copy</button>
                        ${!showGlobal ? `<button onclick="deleteKey(${key.id})" class="btn btn-sm btn-danger">Delete</button>` : ''}
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

        function copyKey(keyPair) {
            navigator.clipboard.writeText(keyPair).then(() => {
                alert('Key copied to clipboard!');
            });
        }

        function deleteKey(id) {
            if (!confirm('Delete this key?')) return;
            alert('Delete key ID: ' + id);
        }

        function exportMyKeys() {
            window.location.href = '../backend/api/keys.php?action=export&license_key=USER_LICENSE';
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
            return new Date(dateString).toLocaleString();
        }

        loadKeys();
    </script>
</body>
</html>

