// Ynov Discord Bot - Dashboard JavaScript

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard Ynov Bot - Chargement...');
    initDashboard();
    loadAllData();
});

// Initialisation du dashboard
function initDashboard() {
    updateClock();
    setInterval(updateClock, 1000);
    showAlert('Dashboard chargé avec succès ! 🎉', 'success');
}

// Horloge en temps réel
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR');
        const dateString = now.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        clockElement.innerHTML = `📅 ${dateString} - ⏰ ${timeString}`;
    }
}

// Chargement de toutes les données
async function loadAllData() {
    try {
        showLoading(true);
        await Promise.all([
            loadStats(),
            loadUsers(),
            loadLogs()
        ]);
        showAlert('Données mises à jour ! ✅', 'success');
    } catch (error) {
        console.error('Erreur chargement:', error);
        showAlert('Erreur lors du chargement des données ❌', 'error');
    } finally {
        showLoading(false);
    }
}

// Charger les statistiques
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            const stats = await response.json();
            updateStatCard('total-users', stats.totalUsers || 0);
            updateStatCard('verified-users', stats.verifiedUsers || 0);
            updateStatCard('pending-verifications', stats.pendingVerifications || 0);
            updateStatCard('daily-verifications', stats.dailyVerifications || 0);
        }
    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

// Charger les utilisateurs
async function loadUsers() {
    try {
        const response = await fetch('/api/users/recent');
        if (response.ok) {
            const users = await response.json();
            updateUsersList(users);
        }
    } catch (error) {
        console.error('Erreur users:', error);
    }
}

// Charger les logs
async function loadLogs() {
    try {
        const response = await fetch('/api/logs/recent');
        if (response.ok) {
            const logs = await response.json();
            updateLogsList(logs);
        }
    } catch (error) {
        console.error('Erreur logs:', error);
    }
}

// Mettre à jour une carte de statistique
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        animateNumber(element, 0, value, 1000);
    }
}

// Animation des nombres
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (range * progress));
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Mettre à jour la liste des utilisateurs
function updateUsersList(users) {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="loading">Aucun utilisateur trouvé</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <div>
                <strong>${escapeHtml(user.username)}</strong><br>
                <small style="color: var(--text-secondary);">${escapeHtml(user.email)}</small>
            </div>
            <div>
                <span style="color: var(--success); font-weight: bold;">✅ Vérifié</span><br>
                <small style="color: var(--text-secondary);">
                    ${user.verifiedAt ? new Date(user.verifiedAt).toLocaleDateString('fr-FR') : 'N/A'}
                </small>
            </div>
        </div>
    `).join('');
}

// Mettre à jour la liste des logs
function updateLogsList(logs) {
    const container = document.getElementById('logs-list');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="loading">Aucun log trouvé</div>';
        return;
    }
    
    container.innerHTML = logs.map(log => `
        <div class="log-item">
            <div>
                <strong>${escapeHtml(log.action)}</strong><br>
                <small style="color: var(--text-secondary);">
                    ${escapeHtml(log.username || 'Système')}
                </small>
            </div>
            <div style="text-align: right;">
                <small style="color: var(--text-secondary);">
                    ${new Date(log.timestamp).toLocaleString('fr-FR')}
                </small>
            </div>
        </div>
    `).join('');
}

// Fonctions d'actions
function refreshAll() {
    showAlert('Actualisation en cours... 🔄', 'info');
    loadAllData();
}

function exportData() {
    showAlert('Export des données... 📊', 'info');
    // Logique d'export ici
}

function viewLogs() {
    showAlert('Affichage de tous les logs... 📋', 'info');
    // Redirection vers page complète des logs
}

function systemStatus() {
    showAlert('Vérification du statut système... ⚡', 'info');
    // Vérification du statut
}

// Afficher/Masquer le loading
function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
}

// Afficher une alerte
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alerts');
    if (!alertContainer) return;
    
    const alertId = 'alert-' + Date.now();
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <button onclick="document.getElementById('${alertId}').remove()" 
                style="float: right; background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem;">
            ×
        </button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

// Utilitaire d'échappement HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Actualisation automatique toutes les 30 secondes
setInterval(() => {
    loadStats();
}, 30000);

console.log('✅ Dashboard JavaScript chargé avec succès!');