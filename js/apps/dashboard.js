/* ===== Dashboard App ===== */
const DashboardApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/></svg>`;

    const CHART_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Track chart instances for cleanup
    let chartInstances = [];
    // Guards against a stale load overwriting a newer one
    let loadSeq = 0;

    function destroyCharts() {
        chartInstances.forEach(c => c.destroy());
        chartInstances = [];
    }

    function skeletonHTML() {
        const statCard = `
            <div class="stat-card">
                <div class="skl skl-label"></div>
                <div class="skl skl-value"></div>
                <div class="skl skl-sub"></div>
            </div>`;
        const section = `
            <div class="dash-section">
                <h3><span class="skl skl-title"></span></h3>
                <div class="skl-body">
                    <div class="skl skl-line"></div>
                    <div class="skl skl-line"></div>
                    <div class="skl skl-line short"></div>
                </div>
            </div>`;
        return `
            <div class="dash-stats" aria-hidden="true">${statCard.repeat(4)}</div>
            <div class="dash-widget-grid" aria-hidden="true">${section.repeat(6)}</div>
            <span class="sr-only" role="status">Loading dashboard</span>
        `;
    }

    async function launch() {
        const html = `
            <div class="app-container dashboard">
                ${skeletonHTML()}
            </div>
        `;

        WindowManager.createWindow('dashboard', 'Dashboard', html, {
            width: 960, height: 700,
            onReady: async (win) => {
                await loadDashboard(win);
            }
        });
    }

    /* Cross-app navigation: elements carry data-nav="<appId>" and optionally
       data-set="<sessionStorage key>:<value>" (same handoff pattern as quotes → rfq). */
    function navigateTo(el) {
        const set = el.dataset.set;
        if (set) {
            const idx = set.indexOf(':');
            sessionStorage.setItem(set.slice(0, idx), set.slice(idx + 1));
        }
        Router.navigate(el.dataset.nav);
    }

    function navAttrs(app, set, label) {
        const setAttr = set ? ` data-set="${set}"` : '';
        return `data-nav="${app}"${setAttr} tabindex="0" role="link" aria-label="${Utils.escapeHtml(label)}"`;
    }

    function widgetError(label) {
        return `<div class="dash-widget-error"><span>Couldn't load ${label}</span><button type="button" class="btn-edit dash-retry-btn">Retry</button></div>`;
    }

    async function loadDashboard(win) {
        const body = win.querySelector('.app-container');
        const token = ++loadSeq;
        destroyCharts();
        body.innerHTML = skeletonHTML();

        const esc = Utils.escapeHtml;
        const now = new Date();
        // Cash chart window: first day of the month, 5 months back
        const cashWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const cashWindowISO = `${cashWindowStart.getFullYear()}-${String(cashWindowStart.getMonth() + 1).padStart(2, '0')}-01`;

        const queryDefs = {
            projects: SupabaseClient.from('projects').select('id, reference, status, health, contract_value, client:clients(name)'),
            variations: SupabaseClient.from('variations').select('id, amount, status, payment_status'),
            boqs: SupabaseClient.from('boq').select('id, status'),
            invoices: SupabaseClient.from('invoices').select('id, reference, amount, paid_amount, status, due_date, project:projects(reference, client:clients(name))'),
            tasks: SupabaseClient.from('schedule_tasks').select('id, task_name, due_date, project_id, status, project:projects(reference)').order('due_date', { ascending: true }).limit(100),
            reports: SupabaseClient.from('daily_reports').select('id, report_date, notes, project_id, project:projects(reference)').order('report_date', { ascending: false }).limit(5),
            payments: SupabaseClient.from('payments').select('amount, payment_date').gte('payment_date', cashWindowISO),
        };

        const names = Object.keys(queryDefs);
        const results = await Promise.allSettled(Object.values(queryDefs));

        // A newer load started (or the user navigated away) while we were fetching
        if (token !== loadSeq || !body.isConnected) return;

        const data = {};
        const failed = [];
        names.forEach((name, i) => {
            const r = results[i];
            if (r.status === 'fulfilled' && !r.value.error) {
                data[name] = r.value.data || [];
            } else {
                data[name] = [];
                failed.push(name);
            }
        });
        const ok = (...deps) => deps.every(d => !failed.includes(d));

        const { projects, variations, boqs, invoices, tasks, reports, payments } = data;

        const pipeline = projects.filter(p => Utils.PIPELINE_STATUSES.includes(p.status));
        const active = projects.filter(p => Utils.ACTIVE_STATUSES.includes(p.status));
        const completed = projects.filter(p => p.status === 'complete');

        const pipelineValue = pipeline.reduce((s, p) => s + (p.contract_value || 0), 0);
        const activeValue = active.reduce((s, p) => s + (p.contract_value || 0), 0);

        const unpaidVariations = variations.filter(v => v.payment_status !== 'paid' && v.status !== 'rejected');
        const unpaidVariationTotal = unpaidVariations.reduce((s, v) => s + (v.amount || 0), 0);

        const pendingBoqs = boqs.filter(b => b.status === 'pending' || b.status === 'review');

        const overdueInvoices = invoices.filter(i =>
            (i.status === 'sent' || i.status === 'overdue') &&
            i.due_date && new Date(i.due_date) < now
        );
        const overdueTotal = overdueInvoices.reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);

        const totalOutstanding = invoices
            .filter(i => i.status !== 'cancelled' && i.status !== 'paid')
            .reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);

        const topActive = active.slice(0, 5);

        // Attention items — each one navigates to where the work happens
        let attentionHTML = '';
        if (overdueInvoices.length > 0) {
            attentionHTML += `<div class="attention-item warning dash-nav" ${navAttrs('invoices', 'invoices_filter:overdue', 'Open overdue invoices')}><span class="attention-icon" aria-hidden="true">🚨</span><span>${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} (${Utils.formatCurrencyShort(overdueTotal)})</span></div>`;
        }
        if (pendingBoqs.length > 0) {
            attentionHTML += `<div class="attention-item warning dash-nav" ${navAttrs('quotes', null, 'Open BOQs pending approval')}><span class="attention-icon" aria-hidden="true">📋</span><span>${pendingBoqs.length} BOQ${pendingBoqs.length > 1 ? 's' : ''} pending approval</span></div>`;
        }
        if (unpaidVariations.length > 0) {
            attentionHTML += `<div class="attention-item warning dash-nav" ${navAttrs('variations', null, 'Open unpaid variations')}><span class="attention-icon" aria-hidden="true">💰</span><span>${unpaidVariations.length} unpaid variation${unpaidVariations.length > 1 ? 's' : ''} (${Utils.formatCurrencyShort(unpaidVariationTotal)})</span></div>`;
        }
        if (totalOutstanding > 0 && totalOutstanding !== overdueTotal) {
            attentionHTML += `<div class="attention-item warning dash-nav" ${navAttrs('invoices', null, 'Open invoices')}><span class="attention-icon" aria-hidden="true">📄</span><span>${Utils.formatCurrencyShort(totalOutstanding)} outstanding across invoices</span></div>`;
        }
        if (!attentionHTML) {
            attentionHTML = '<div class="attention-item ok"><span class="attention-icon" aria-hidden="true">✅</span><span>All clear — nothing needs attention</span></div>';
        }

        const monthlyCash = buildMonthlyCash(payments, 6, now);
        const funnelData = buildPipelineFunnel(projects);
        const healthData = buildHealthBreakdown(active);
        const upcomingDeadlines = buildUpcomingDeadlines(invoices, tasks, now);
        const recentActivityHTML = buildRecentActivity(reports);

        const cashAria = `Cash received per month: ${monthlyCash.labels.map((l, i) => `${l} ${Utils.formatCurrencyShort(monthlyCash.values[i])}`).join(', ')}`;
        const funnelAria = `Pipeline funnel: ${funnelData.map(d => `${d.label} ${d.count}`).join(', ')}`;

        const statValue = (depsOk, html) => depsOk ? html : '<span class="stat-value">—</span>';

        const errorBanner = failed.length > 0 ? `
            <div class="dash-error-banner" role="alert">
                <span>Some data failed to load (${failed.join(', ')}) — figures shown may be incomplete.</span>
                <button type="button" class="btn-edit dash-retry-btn">Retry</button>
            </div>` : '';

        body.innerHTML = `
            ${errorBanner}
            <div class="dash-stats">
                <div class="stat-card dash-nav" ${navAttrs('projects', 'projects_filter:pipeline', 'Open pipeline projects')}>
                    <div class="stat-label">Pipeline</div>
                    ${statValue(ok('projects'), `<div class="stat-value">${pipeline.length}</div><div class="stat-sub">${Utils.formatCurrencyShort(pipelineValue)}</div>`)}
                </div>
                <div class="stat-card accent dash-nav" ${navAttrs('projects', 'projects_filter:active', 'Open active projects')}>
                    <div class="stat-label">Active Projects</div>
                    ${statValue(ok('projects'), `<div class="stat-value">${active.length}</div><div class="stat-sub">${Utils.formatCurrencyShort(activeValue)}</div>`)}
                </div>
                <div class="stat-card dash-nav" ${navAttrs('projects', 'projects_filter:complete', 'Open completed projects')}>
                    <div class="stat-label">Completed</div>
                    ${statValue(ok('projects'), `<div class="stat-value">${completed.length}</div><div class="stat-sub">All time</div>`)}
                </div>
                <div class="stat-card ${overdueInvoices.length > 0 ? 'warning' : ''} dash-nav" ${navAttrs('invoices', overdueInvoices.length > 0 ? 'invoices_filter:overdue' : null, 'Open invoices')}>
                    <div class="stat-label">Outstanding</div>
                    ${statValue(ok('invoices'), `<div class="stat-value">${Utils.formatCurrencyShort(totalOutstanding)}</div><div class="stat-sub">${overdueInvoices.length > 0 ? overdueInvoices.length + ' overdue' : 'All current'}</div>`)}
                </div>
            </div>

            <div class="dash-widget-grid">
                <div class="dash-section">
                    <h3>Cash Received</h3>
                    ${ok('payments')
                        ? `<div class="dash-chart"><canvas id="dash-revenue-chart" role="img" aria-label="${esc(cashAria)}"></canvas></div>`
                        : widgetError('payment data')}
                </div>

                <div class="dash-section">
                    <h3>Pipeline Funnel</h3>
                    ${ok('projects')
                        ? `<div class="dash-chart"><canvas id="dash-funnel-chart" role="img" aria-label="${esc(funnelAria)}"></canvas></div>`
                        : widgetError('pipeline data')}
                </div>

                <div class="dash-section">
                    <h3>Needs Attention</h3>
                    ${ok('invoices', 'boqs', 'variations')
                        ? `<div class="attention-list">${attentionHTML}</div>`
                        : (failed.includes('invoices') && failed.includes('boqs') && failed.includes('variations')
                            ? widgetError('attention items')
                            : `<div class="attention-list">${attentionHTML}</div>`)}
                </div>

                <div class="dash-section">
                    <h3>Active Projects</h3>
                    ${ok('projects') ? `
                    <div class="dash-table">
                        <table>
                            <thead><tr><th>Reference</th><th>Client</th><th>Status</th><th>Value</th></tr></thead>
                            <tbody>
                                ${topActive.length > 0 ? topActive.map(p => `
                                    <tr class="dash-nav" ${navAttrs('projects', `projects_open_id:${p.id}`, `Open project ${p.reference || ''}`)}>
                                        <td class="ref-link">${esc(p.reference) || '—'}</td>
                                        <td>${esc(p.client?.name) || '—'}</td>
                                        <td>${Utils.statusBadge(p.status)}</td>
                                        <td>${Utils.formatCurrencyShort(p.contract_value)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" class="empty-row">No active projects yet — accepted quotes land here</td></tr>'}
                            </tbody>
                        </table>
                    </div>` : widgetError('projects')}
                </div>

                <div class="dash-section">
                    <h3>Project Health</h3>
                    ${ok('projects') ? `
                    <div class="dash-health-list">
                        ${healthData.length > 0 ? healthData.map(h => `
                            <div class="health-row">
                                <span class="health-row-icon" aria-hidden="true">${Utils.HEALTH_ICONS[h.key] || '—'}</span>
                                <span class="health-row-label">${Utils.HEALTH_LABELS[h.key] || esc(h.key)}</span>
                                <span class="health-row-count">${h.count}</span>
                                <div class="health-row-bar"><div class="health-row-fill" style="width:${h.pct}%;background:${h.color}"></div></div>
                            </div>
                        `).join('') : '<div class="dash-empty">No active projects to track yet</div>'}
                    </div>` : widgetError('project health')}
                </div>

                <div class="dash-section">
                    <h3>Upcoming Deadlines</h3>
                    ${ok('invoices') || ok('tasks') ? `
                    <div class="dash-deadline-list">
                        ${upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => `
                            <div class="deadline-item dash-nav" ${navAttrs(d.nav, d.navSet, `Open ${d.plainLabel}`)}>
                                <span class="deadline-icon" aria-hidden="true">${d.icon}</span>
                                <div class="deadline-info">
                                    <span class="deadline-label">${d.label}</span>
                                    <span class="deadline-sub">${d.sub}</span>
                                </div>
                                <span class="deadline-date ${d.urgent ? 'deadline-urgent' : ''}">${d.dateStr}</span>
                            </div>
                        `).join('') : '<div class="dash-empty">No upcoming deadlines — nothing due</div>'}
                    </div>` : widgetError('deadlines')}
                </div>

                <div class="dash-section">
                    <h3>Recent Activity</h3>
                    ${ok('reports')
                        ? `<div class="dash-activity-list">${recentActivityHTML}</div>`
                        : widgetError('recent activity')}
                </div>
            </div>
        `;

        // Wire navigation + retry via delegation (onclick assignment: safe across re-renders)
        body.onclick = (e) => {
            const retry = e.target.closest('.dash-retry-btn');
            if (retry) { loadDashboard(win); return; }
            const nav = e.target.closest('.dash-nav');
            if (nav) navigateTo(nav);
        };
        body.onkeydown = (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const nav = e.target.closest('.dash-nav');
            if (nav) { e.preventDefault(); navigateTo(nav); }
        };

        // Render charts
        if (typeof Chart !== 'undefined') {
            if (ok('payments')) renderCashChart(body, monthlyCash);
            if (ok('projects')) renderFunnelChart(body, funnelData);
        }
    }

    // --- Data builders ---

    /* Actual cash in the bank: payments grouped by payment month.
       (Not invoice totals — cancelled/unpaid invoices are not revenue.) */
    function buildMonthlyCash(payments, months, now) {
        const labels = [];
        const values = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
            labels.push(label);
            const monthTotal = payments
                .filter(p => p.payment_date && p.payment_date.startsWith(key))
                .reduce((s, p) => s + (p.amount || 0), 0);
            values.push(monthTotal);
        }
        return { labels, values };
    }

    function buildPipelineFunnel(projects) {
        const stages = [
            { key: 'enquiry', label: 'Enquiry' },
            { key: 'qualifying', label: 'Qualifying' },
            { key: 'site_visit_scheduled', label: 'Site Visit' },
            { key: 'boq_in_progress', label: 'BOQ' },
            { key: 'quoted', label: 'Quoted' },
            { key: 'accepted', label: 'Accepted' },
        ];
        return stages.map(s => ({
            label: s.label,
            count: projects.filter(p => p.status === s.key).length,
        }));
    }

    function buildHealthBreakdown(activeProjects) {
        const counts = { on_track: 0, minor_delay: 0, behind: 0, blocked: 0 };
        const colors = { on_track: '#22c55e', minor_delay: '#f59e0b', behind: '#ef4444', blocked: '#6b7280' };
        activeProjects.forEach(p => {
            const h = p.health || 'on_track';
            if (counts[h] !== undefined) counts[h]++;
        });
        const total = activeProjects.length || 1;
        return Object.entries(counts).map(([key, count]) => ({
            key,
            count,
            pct: Math.round((count / total) * 100),
            color: colors[key],
        }));
    }

    function buildUpcomingDeadlines(invoices, tasks, now) {
        const esc = Utils.escapeHtml;
        const items = [];
        // Invoice due dates
        invoices.forEach(inv => {
            if (inv.due_date && (inv.status === 'sent' || inv.status === 'overdue')) {
                const due = new Date(inv.due_date);
                const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                const ref = inv.reference || `#${String(inv.id).slice(0, 8)}`;
                const client = inv.project?.client?.name || '';
                items.push({
                    date: due,
                    icon: '📄',
                    label: `Invoice ${esc(ref)}`,
                    plainLabel: `invoice ${ref}`,
                    sub: `${client ? esc(client) + ' · ' : ''}${Utils.formatCurrencyShort(inv.amount)}`,
                    dateStr: Utils.formatDate(inv.due_date),
                    urgent: daysLeft <= 3,
                    nav: 'invoices',
                    navSet: `invoices_open_id:${inv.id}`,
                });
            }
        });
        // Task deadlines
        tasks.forEach(t => {
            if (t.due_date && t.status !== 'complete' && t.status !== 'completed') {
                const due = new Date(t.due_date);
                const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                items.push({
                    date: due,
                    icon: '📋',
                    label: esc(t.task_name || 'Task'),
                    plainLabel: `task ${t.task_name || ''} in schedule`,
                    sub: esc(t.project?.reference || ''),
                    dateStr: Utils.formatDate(t.due_date),
                    urgent: daysLeft <= 3,
                    nav: 'schedule',
                    navSet: null,
                });
            }
        });
        items.sort((a, b) => a.date - b.date);
        return items.slice(0, 5);
    }

    function buildRecentActivity(reports) {
        const esc = Utils.escapeHtml;
        if (!reports || reports.length === 0) {
            return '<div class="dash-empty">No site reports yet — daily reports from Site Work show up here</div>';
        }
        return reports.map(r => `
            <div class="activity-item dash-nav" ${navAttrs('sitework', null, `Open site work for ${r.project?.reference || 'project'}`)}>
                <span class="activity-icon" aria-hidden="true">📝</span>
                <div class="activity-info">
                    <span class="activity-label">${esc(r.project?.reference) || 'Unknown project'}</span>
                    <span class="activity-sub">${r.notes ? esc(r.notes.length > 60 ? r.notes.substring(0, 60) + '...' : r.notes) : 'Daily report'}</span>
                </div>
                <span class="activity-date">${Utils.formatRelativeDate(r.report_date)}</span>
            </div>
        `).join('');
    }

    // --- Chart renderers (theming scoped per chart; no global Chart.defaults mutation) ---

    function renderCashChart(container, data) {
        const canvas = container.querySelector('#dash-revenue-chart');
        if (!canvas) return;
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: 'rgba(233, 69, 96, 0.7)',
                    borderColor: '#e94560',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: { color: '#aab', font: { size: 11, family: CHART_FONT } },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: {
                            color: '#aab',
                            font: { size: 11, family: CHART_FONT },
                            callback: v => {
                                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                                return v;
                            }
                        },
                        beginAtZero: true,
                    }
                }
            }
        });
        chartInstances.push(chart);
    }

    function renderFunnelChart(container, data) {
        const canvas = container.querySelector('#dash-funnel-chart');
        if (!canvas) return;
        const colors = ['#e94560', '#f472b6', '#a855f7', '#6366f1', '#3b82f6', '#22c55e'];
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: { color: '#aab', font: { size: 11, family: CHART_FONT }, stepSize: 1 },
                        beginAtZero: true,
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#aab', font: { size: 11, family: CHART_FONT } },
                    }
                }
            }
        });
        chartInstances.push(chart);
    }

    return { id: 'dashboard', name: 'Dashboard', icon: ICON, launch };
})();
