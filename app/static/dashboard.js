let refreshTimer = null;
let currentAnomalies = [];
let currentUsers = [];
let currentSort = { key: 'timestamp', dir: 'desc' };
let trendData = { events: [], anomalies: [], timestamps: [] };
let charts = {};
let notifications = [];

function applyTheme() {
    const dark = document.getElementById('darkToggle')?.checked;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function getFilters() {
    const minScore = parseFloat(document.getElementById('minScore')?.value || '0') || 0;
    const channel = document.getElementById('channelFilter')?.value || '';
    const minAmount = parseFloat(document.getElementById('minAmount')?.value) || null;
    const maxAmount = parseFloat(document.getElementById('maxAmount')?.value) || null;
    const riskLevel = document.getElementById('riskLevel')?.value || '';
    const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    return { minScore, channel, minAmount, maxAmount, riskLevel, search };
}

function filteredAnomalies() {
    const { minScore, channel, minAmount, maxAmount, riskLevel, search } = getFilters();
    return currentAnomalies.filter(a => {
        if (isNaN(minScore) ? false : a.score < minScore) return false;
        if (channel && a.channel !== channel) return false;
        if (minAmount !== null && a.amount < minAmount) return false;
        if (maxAmount !== null && a.amount > maxAmount) return false;
        if (riskLevel) {
            if (riskLevel === 'high' && a.score < 0.9) return false;
            if (riskLevel === 'medium' && (a.score < 0.7 || a.score >= 0.9)) return false;
            if (riskLevel === 'low' && a.score >= 0.7) return false;
        }
        if (search && !a.user_id.toLowerCase().includes(search) && !a.id.toString().includes(search)) return false;
        return true;
    });
}

function sortAnomalies(rows) {
    const { key, dir } = currentSort;
    const sorted = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
}

async function loadMetrics() {
    const r = await fetch('/api/v1/metrics');
    const m = await r.json();
    document.getElementById('ingested').textContent = m.ingested_events;
    document.getElementById('anoms').textContent = m.anomaly_count;
    
    // Calculate additional metrics
    const highRisk = currentAnomalies.filter(a => a.score >= 0.9).length;
    const uniqueUsers = new Set(currentAnomalies.map(a => a.user_id)).size;
    
    document.getElementById('highRisk').textContent = highRisk;
    document.getElementById('activeUsers').textContent = uniqueUsers;
    
    // Update trend data
    const now = new Date();
    trendData.timestamps.push(now);
    trendData.events.push(m.ingested_events);
    trendData.anomalies.push(m.anomaly_count);
    
    // Keep only last 20 data points
    if (trendData.timestamps.length > 20) {
        trendData.timestamps.shift();
        trendData.events.shift();
        trendData.anomalies.shift();
    }
    
    updateTrendChart();
}

async function loadAnomalies() {
    const r = await fetch('/api/v1/anomalies');
    const data = await r.json();
    currentAnomalies = data.map(d => ({ ...d }));
    renderAnomalies();
}

function renderAnomalies() {
    const tbody = document.querySelector('#anomTable tbody');
    tbody.innerHTML = '';
    const rows = sortAnomalies(filteredAnomalies());
    for (const row of rows) {
        const tr = document.createElement('tr');
        const severity = row.score >= 0.9 ? 'sev-high' : row.score >= 0.7 ? 'sev-med' : 'sev-low';
        tr.className = severity;
        tr.innerHTML = `<td>${row.id}</td><td>${row.user_id}</td><td>${row.score.toFixed(3)}</td><td>${row.channel}</td><td>${row.amount.toFixed(2)}</td><td>${new Date(row.timestamp).toLocaleString()}</td><td>${row.reasons.join(', ')}</td>`;
        tr.addEventListener('click', () => openDetailModal(row));
        tbody.appendChild(tr);
    }
}

function setAutoRefresh(enabled) {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    if (enabled) {
        const ms = parseInt(document.getElementById('refreshInterval')?.value || '4000', 10);
        refreshTimer = setInterval(refresh, ms);
    }
}

async function refresh() {
    await Promise.all([loadMetrics(), loadAnomalies()]);
}

function exportCsv() {
    const rows = sortAnomalies(filteredAnomalies());
    const header = ['id','user_id','score','channel','amount','timestamp','reasons'];
    const lines = [header.join(',')];
    for (const r of rows) {
        const vals = [r.id, r.user_id, r.score.toFixed(3), r.channel, r.amount.toFixed(2), new Date(r.timestamp).toISOString(), '"' + r.reasons.join('; ') + '"'];
        lines.push(vals.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomalies_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openDetailModal(row) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <div class="kv"><span>ID</span><span>${row.id}</span></div>
        <div class="kv"><span>User</span><span>${row.user_id}</span></div>
        <div class="kv"><span>Score</span><span>${row.score.toFixed(3)}</span></div>
        <div class="kv"><span>Channel</span><span>${row.channel}</span></div>
        <div class="kv"><span>Amount</span><span>${row.amount.toFixed(2)}</span></div>
        <div class="kv"><span>Time</span><span>${new Date(row.timestamp).toLocaleString()}</span></div>
        <div class="kv"><span>Reasons</span><span>${row.reasons.join(', ')}</span></div>
    `;
    modal.style.display = 'block';
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
}

function setupSorting() {
    const headers = document.querySelectorAll('#anomTable thead th');
    const keys = ['id','user_id','score','channel','amount','timestamp','reasons'];
    headers.forEach((th, idx) => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const key = keys[idx];
            if (currentSort.key === key) {
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = key;
                currentSort.dir = 'asc';
            }
            renderAnomalies();
        });
    });
}

function initUI() {
    document.getElementById('darkToggle')?.addEventListener('change', () => { applyTheme(); });
    document.getElementById('autoRefresh')?.addEventListener('change', (e) => setAutoRefresh(e.target.checked));
    document.getElementById('refreshInterval')?.addEventListener('change', () => setAutoRefresh(document.getElementById('autoRefresh')?.checked));
    document.getElementById('manualRefresh')?.addEventListener('click', refresh);
    document.getElementById('minScore')?.addEventListener('input', renderAnomalies);
    document.getElementById('channelFilter')?.addEventListener('change', renderAnomalies);
    document.getElementById('exportCsv')?.addEventListener('click', exportCsv);

    // Modal
    const closeBtn = document.getElementById('detailClose');
    closeBtn?.addEventListener('click', closeDetailModal);
    const modal = document.getElementById('detailModal');
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeDetailModal(); });

    applyTheme();
    setAutoRefresh(true);
    setupSorting();
}

// Chart functions
function updateTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (trendData.events.length < 2) return;
    
    // Normalize data
    const maxEvents = Math.max(...trendData.events);
    const maxAnomalies = Math.max(...trendData.anomalies);
    const maxValue = Math.max(maxEvents, maxAnomalies);
    
    // Draw events line
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trendData.events.forEach((value, index) => {
        const x = (index / (trendData.events.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw anomalies line
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trendData.anomalies.forEach((value, index) => {
        const x = (index / (trendData.anomalies.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Add legend
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(10, 10, 15, 10);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('Events', 30, 18);
    
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(10, 25, 15, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('Anomalies', 30, 33);
}

function updateAnalyticsCharts() {
    updateChannelChart();
    updateRiskChart();
}

function updateChannelChart() {
    const canvas = document.getElementById('channelChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Count channels
    const channelCounts = {};
    currentAnomalies.forEach(a => {
        channelCounts[a.channel] = (channelCounts[a.channel] || 0) + 1;
    });
    
    const channels = Object.keys(channelCounts);
    if (channels.length === 0) return;
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    const total = Object.values(channelCounts).reduce((a, b) => a + b, 0);
    
    let startAngle = 0;
    channels.forEach((channel, index) => {
        const count = channelCounts[channel];
        const sliceAngle = (count / total) * 2 * Math.PI;
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.arc(width/2, height/2, Math.min(width, height)/3, startAngle, startAngle + sliceAngle);
        ctx.lineTo(width/2, height/2);
        ctx.fill();
        
        startAngle += sliceAngle;
    });
}

function updateRiskChart() {
    const canvas = document.getElementById('riskChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Create histogram
    const bins = 10;
    const binSize = 1 / bins;
    const histogram = new Array(bins).fill(0);
    
    currentAnomalies.forEach(a => {
        const binIndex = Math.min(Math.floor(a.score / binSize), bins - 1);
        histogram[binIndex]++;
    });
    
    const maxCount = Math.max(...histogram);
    const barWidth = width / bins;
    
    histogram.forEach((count, index) => {
        const barHeight = (count / maxCount) * height * 0.8;
        const x = index * barWidth;
        const y = height - barHeight;
        
        ctx.fillStyle = count > 0 ? '#FF5722' : '#E0E0E0';
        ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
}

// User risk dashboard
async function loadUsers() {
    // Simulate user data from anomalies
    const userMap = new Map();
    currentAnomalies.forEach(anomaly => {
        const userId = anomaly.user_id;
        if (!userMap.has(userId)) {
            userMap.set(userId, {
                user_id: userId,
                risk_score: 0,
                last_activity: anomaly.timestamp,
                channel: anomaly.channel,
                anomaly_count: 0
            });
        }
        const user = userMap.get(userId);
        user.risk_score = Math.max(user.risk_score, anomaly.score);
        user.anomaly_count++;
        if (new Date(anomaly.timestamp) > new Date(user.last_activity)) {
            user.last_activity = anomaly.timestamp;
            user.channel = anomaly.channel;
        }
    });
    
    currentUsers = Array.from(userMap.values());
    renderUsers();
}

function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    currentUsers.forEach(user => {
        const tr = document.createElement('tr');
        const severity = user.risk_score >= 0.9 ? 'sev-high' : user.risk_score >= 0.7 ? 'sev-med' : 'sev-low';
        tr.className = severity;
        tr.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.risk_score.toFixed(3)}</td>
            <td>${new Date(user.last_activity).toLocaleString()}</td>
            <td>${user.channel}</td>
            <td>${user.anomaly_count}</td>
            <td><button onclick="viewUserDetails('${user.user_id}')">View Details</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function viewUserDetails(userId) {
    const userAnomalies = currentAnomalies.filter(a => a.user_id === userId);
    const user = currentUsers.find(u => u.user_id === userId);
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <div class="kv"><span>User ID</span><span>${userId}</span></div>
        <div class="kv"><span>Risk Score</span><span>${user.risk_score.toFixed(3)}</span></div>
        <div class="kv"><span>Anomaly Count</span><span>${user.anomaly_count}</span></div>
        <div class="kv"><span>Last Activity</span><span>${new Date(user.last_activity).toLocaleString()}</span></div>
        <div class="kv"><span>Primary Channel</span><span>${user.channel}</span></div>
        <h4>Recent Anomalies:</h4>
        <div style="max-height: 200px; overflow-y: auto;">
            ${userAnomalies.slice(0, 10).map(a => `
                <div style="padding: 8px; border-bottom: 1px solid #eee;">
                    <strong>Score:</strong> ${a.score.toFixed(3)} | 
                    <strong>Amount:</strong> ${a.amount.toFixed(2)} | 
                    <strong>Time:</strong> ${new Date(a.timestamp).toLocaleString()}
                </div>
            `).join('')}
        </div>
    `;
    modal.style.display = 'block';
}

// Notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Tab functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load data for the tab
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'analytics') {
        updateAnalyticsCharts();
    }
}

// Export functions
function exportJson() {
    const data = {
        anomalies: sortAnomalies(filteredAnomalies()),
        exportTime: new Date().toISOString(),
        filters: getFilters()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomalies_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearFilters() {
    document.getElementById('minScore').value = '0.00';
    document.getElementById('channelFilter').value = '';
    document.getElementById('minAmount').value = '';
    document.getElementById('maxAmount').value = '';
    document.getElementById('riskLevel').value = '';
    document.getElementById('searchInput').value = '';
    renderAnomalies();
}

async function bootstrap() {
    initUI();
    
    // Add tab event listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Add new event listeners
    document.getElementById('minAmount')?.addEventListener('input', renderAnomalies);
    document.getElementById('maxAmount')?.addEventListener('input', renderAnomalies);
    document.getElementById('riskLevel')?.addEventListener('change', renderAnomalies);
    document.getElementById('searchInput')?.addEventListener('input', renderAnomalies);
    document.getElementById('exportJson')?.addEventListener('click', exportJson);
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
    
    await refresh();
}

bootstrap();
