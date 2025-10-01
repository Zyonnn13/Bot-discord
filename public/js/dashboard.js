// Ynov Discord Bot - Dashboard JavaScript

// Configuration
const API_BASE = '';
let currentUser = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    setupEventListeners();
    loadDashboardData();
});

// Initialisation du dashboard
function initDashboard() {
    // Vérifier l'authentification
    checkAuth();
    
    // Mettre à jour l'heure
    updateClock();
    setInterval(updateClock, 1000);
    
    // Initialiser les graphiques si disponibles
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
}

// Vérification de l'authentification
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
            currentUser = await response.json();
            updateUserInfo();
        } else {
            // Rediriger vers la page de connexion si nécessaire
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Erreur de vérification auth:', error);
    }
}

// Mise à jour des informations utilisateur
function updateUserInfo() {
    if (currentUser) {
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => el.textContent = currentUser.username);
        
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => el.textContent = currentUser.role);
    }
}

// Horloge en temps réel
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR');
        const dateString = now.toLocaleDateString('fr-FR');
        clockElement.innerHTML = `
            <div class="time">${timeString}</div>
            <div class="date">${dateString}</div>
        `;
    }
}

// Chargement des données du dashboard
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Charger les statistiques
        const statsResponse = await fetch('/api/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateStats(stats);
        }
        
        // Charger les utilisateurs récents
        const usersResponse = await fetch('/api/users/recent');
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            updateRecentUsers(users);
        }
        
        // Charger les logs récents
        const logsResponse = await fetch('/api/logs/recent');
        if (logsResponse.ok) {
            const logs = await logsResponse.json();
            updateRecentLogs(logs);
        }
        
    } catch (error) {
        console.error('Erreur de chargement des données:', error);
        showAlert('Erreur de chargement des données', 'error');
    } finally {
        showLoading(false);
    }
}

// Mise à jour des statistiques
function updateStats(stats) {
    updateStatCard('total-users', stats.totalUsers || 0);
    updateStatCard('verified-users', stats.verifiedUsers || 0);
    updateStatCard('pending-verifications', stats.pendingVerifications || 0);
    updateStatCard('daily-verifications', stats.dailyVerifications || 0);
}

function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        const numberElement = element.querySelector('.stat-number');
        if (numberElement) {
            // Animation du compteur
            animateCounter(numberElement, 0, value, 1000);
        }
    }
}

// Animation du compteur
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (range * progress));
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Mise à jour des utilisateurs récents
function updateRecentUsers(users) {
    const container = document.getElementById('recent-users');
    if (container && users.length > 0) {
        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <strong>${escapeHtml(user.username)}</strong>
                    <span class="user-email">${escapeHtml(user.email)}</span>
                </div>
                <div class="user-status">
                    <span class="status ${user.verified ? 'status-online' : 'status-offline'}"></span>
                    ${user.verified ? 'Vérifié' : 'En attente'}
                </div>
            </div>
        `).join('');
    }
}

// Mise à jour des logs récents
function updateRecentLogs(logs) {
    const container = document.getElementById('recent-logs');
    if (container && logs.length > 0) {
        container.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-time">${new Date(log.timestamp).toLocaleString('fr-FR')}</div>
                <div class="log-action">${escapeHtml(log.action)}</div>
                <div class="log-user">${escapeHtml(log.username || 'Système')}</div>
            </div>
        `).join('');
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Formulaires
    const forms = document.querySelectorAll('form[data-ajax]');
    forms.forEach(form => {
        form.addEventListener('submit', handleAjaxForm);
    });
    
    // Boutons d'action
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', handleAction);
    });
    
    // Actualisation automatique
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadDashboardData();
            showAlert('Données actualisées', 'success');
        });
    }
    
    // Recherche en temps réel
    const searchInput = document.getElementById('search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 300);
        });
    }
}

// Gestion des formulaires AJAX
async function handleAjaxForm(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // Désactiver le bouton
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading"></span> Traitement...';
        }
        
        const response = await fetch(form.action, {
            method: form.method,
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message || 'Opération réussie', 'success');
            if (result.redirect) {
                window.location.href = result.redirect;
            } else {
                loadDashboardData(); // Actualiser les données
            }
        } else {
            showAlert(result.error || 'Erreur lors de l\'opération', 'error');
        }
        
    } catch (error) {
        console.error('Erreur formulaire:', error);
        showAlert('Erreur de connexion', 'error');
    } finally {
        // Réactiver le bouton
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalText || 'Envoyer';
        }
    }
}

// Gestion des actions
async function handleAction(e) {
    const button = e.target;
    const action = button.dataset.action;
    const target = button.dataset.target;
    
    if (action === 'delete' && !confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span>';
        
        const response = await fetch(`/api/action/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            loadDashboardData();
        } else {
            showAlert(result.error, 'error');
        }
        
    } catch (error) {
        console.error('Erreur action:', error);
        showAlert('Erreur lors de l\'action', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.textContent;
    }
}

// Recherche
async function performSearch(query) {
    if (query.length < 2) return;
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const results = await response.json();
            displaySearchResults(results);
        }
    } catch (error) {
        console.error('Erreur de recherche:', error);
    }
}

// Affichage des résultats de recherche
function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    if (container) {
        if (results.length === 0) {
            container.innerHTML = '<p>Aucun résultat trouvé</p>';
        } else {
            container.innerHTML = results.map(result => `
                <div class="search-result">
                    <h4>${escapeHtml(result.title)}</h4>
                    <p>${escapeHtml(result.description)}</p>
                </div>
            `).join('');
        }
    }
}

// Affichage des alertes
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alerts') || document.body;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Affichage du loading
function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
}

// Utilitaires
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation des graphiques (si Chart.js est disponible)
function initCharts() {
    // Graphique des vérifications par jour
    const ctx = document.getElementById('verificationsChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // À remplir avec les données
                datasets: [{
                    label: 'Vérifications',
                    data: [],
                    borderColor: '#7289da',
                    backgroundColor: 'rgba(114, 137, 218, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}