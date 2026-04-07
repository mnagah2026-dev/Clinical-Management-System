/**
 * Admin Dashboard Logic — Enhanced with KPIs, Charts, and Health Checks
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Admin');
    updateNavAuth();

    // Simulated logs styling
    document.getElementById('log-time-1').textContent = new Date().toISOString();

    // Fetch real stats
    try {
        const stats = await api.get('/portal/admin/stats');

        // KPI Cards
        document.getElementById('kpi-doctors').textContent = stats.total_doctors;
        document.getElementById('kpi-nurses').textContent = stats.total_nurses;
        document.getElementById('kpi-patients').textContent = stats.total_patients;
        document.getElementById('kpi-appts').textContent = stats.appointments_today;
        document.getElementById('active-users-count').textContent = stats.total_users;

        // Chart 1: Appointment status breakdown (Doughnut)
        const ctx1 = document.getElementById('chart-appts');
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Scheduled', 'Completed', 'Cancelled'],
                datasets: [{
                    data: [stats.scheduled_today, stats.completed_today, stats.cancelled_today],
                    backgroundColor: ['#6CB8FF', '#7AE8A0', '#FF6E84'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#C5C6D0', padding: 16 } } },
                cutout: '60%'
            }
        });

        // Chart 2: Specialty Distribution (Pie)
        if (stats.specialty_distribution && stats.specialty_distribution.length > 0) {
            const specData = stats.specialty_distribution;
            const colors = ['#6CB8FF','#B5A4FF','#7AE8A0','#FFD166','#FF6E84','#FF9F43','#54A0FF','#5F27CD','#01A3A4','#EE5A24'];
            const ctx2 = document.getElementById('chart-specs');
            new Chart(ctx2, {
                type: 'pie',
                data: {
                    labels: specData.map(s => s.name),
                    datasets: [{
                        data: specData.map(s => s.count),
                        backgroundColor: colors.slice(0, specData.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'right', labels: { color: '#C5C6D0', padding: 8, font: { size: 11 } } } }
                }
            });
        }

    } catch (err) {
        console.error('Failed to load admin stats', err);
        Toast.error('Failed to load system stats.');
    }

    // Health check (real Redis/RabbitMQ status)
    try {
        const health = await api.get('/portal/admin/health');
        const redisEl = document.getElementById('health-redis');
        const rabbitEl = document.getElementById('health-rabbitmq');
        redisEl.textContent = health.redis === 'online' ? 'Online' : 'Offline';
        redisEl.style.color = health.redis === 'online' ? 'var(--success)' : 'var(--error)';
        rabbitEl.textContent = health.rabbitmq === 'online' ? 'Online' : 'Offline';
        rabbitEl.style.color = health.rabbitmq === 'online' ? 'var(--success)' : 'var(--error)';
    } catch (e) {
        document.getElementById('health-redis').textContent = 'Unknown';
        document.getElementById('health-rabbitmq').textContent = 'Unknown';
    }
});
