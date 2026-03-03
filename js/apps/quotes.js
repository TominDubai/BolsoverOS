/* ===== Quotes / BOQ App ===== */
const QuotesApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

    const QUOTE_STATUSES = {
        draft: { label: 'Draft', bg: '#f3f4f6', text: '#374151' },
        pending: { label: 'Pending Review', bg: '#fef3c7', text: '#92400e' },
        sent: { label: 'Sent', bg: '#dbeafe', text: '#1e40af' },
        accepted: { label: 'Accepted', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
        revised: { label: 'Revised', bg: '#ede9fe', text: '#6b21a8' },
    };

    function quoteBadge(status) {
        const s = QUOTE_STATUSES[status] || QUOTE_STATUSES.draft;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function formatNum(n) {
        return new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
    }

    function generateQuotePDF(quote, lineItems) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ml = 14, mr = 14;
        const cw = pw - ml - mr;
        let y = 0;

        const VAT_RATE = 5;
        const companyName = 'Bolsover Building Contracting LLC';
        const companyAddress = 'Dubai\nUnited Arab Emirates';
        const companyEmail = 'tom@bolsovercontracting.com';
        const companyTRN = 'TRN: 104540872900003';

        // --- Header band with logo ---
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, pw, 32, 'F');

        // "B" logo box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(ml, 7, 18, 18, 2, 2, 'F');
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 46);
        doc.text('B', ml + 9, 19.5, { align: 'center' });

        // Company name in header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('B O L S O V E R', ml + 22, 13);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('B U I L D I N G', ml + 22, 18);
        doc.text('C O N T R A C T I N G', ml + 22, 23);

        y = 40;

        // --- Company info (left) ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, ml, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Dubai', ml, y + 5);
        doc.text('United Arab Emirates', ml, y + 9);
        doc.text(companyEmail, ml, y + 13);
        doc.text(companyTRN, ml, y + 17);

        // --- "Quote" title (right) ---
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Quote', pw - mr, y, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`# ${quote.reference || '—'}`, pw - mr, y + 8, { align: 'right' });

        y += 26;

        // --- Bill To (left) ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To', ml, y);
        doc.setFont('helvetica', 'bold');
        const clientName = quote.project?.client?.name || '—';
        doc.text(clientName, ml, y + 5);
        doc.setFont('helvetica', 'normal');

        // --- Quote Date (right) ---
        const quoteDate = new Date(quote.sent_to_client_at || quote.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.setFont('helvetica', 'normal');
        doc.text('Quote Date :', pw - mr - 40, y);
        doc.text(quoteDate, pw - mr, y, { align: 'right' });

        y += 12;

        // --- Subject ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Subject :', ml, y);
        doc.text(quote.project?.reference || '—', ml, y + 5);

        y += 14;

        // --- Line items table ---
        // Calculate VAT per item: prices are tax-inclusive, so tax = price * VAT_RATE / (100 + VAT_RATE)
        const tableBody = lineItems.map((item, i) => {
            const rate = item.client_unit_price || 0;
            const amount = item.price || 0;
            const taxAmount = amount * VAT_RATE / (100 + VAT_RATE);
            return [
                String(i + 1),
                item.description || '',
                formatNum(item.quantity),
                formatNum(rate),
                `${VAT_RATE}.00`,
                formatNum(taxAmount),
                formatNum(amount),
            ];
        });

        // Helper to draw continuation page header
        let firstTablePage = true;
        function drawPageHeader(d) {
            d.setFillColor(26, 26, 46);
            d.roundedRect(ml, 5, 12, 12, 1.5, 1.5, 'F');
            d.setFontSize(10);
            d.setFont('helvetica', 'bold');
            d.setTextColor(255, 255, 255);
            d.text('B', ml + 6, 13, { align: 'center' });
            d.setTextColor(26, 26, 46);
            d.setFontSize(7);
            d.text('B O L S O V E R', ml + 16, 9);
            d.text('B U I L D I N G', ml + 16, 12.5);
            d.text('C O N T R A C T I N G', ml + 16, 16);
        }

        doc.autoTable({
            startY: y,
            margin: { left: ml, right: mr, top: 32 },
            head: [['#', 'Item & Description', 'Qty', 'Rate', 'Tax %', 'Tax', 'Amount']],
            body: tableBody,
            rowPageBreak: 'avoid',
            styles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
                lineColor: [229, 231, 235],
                lineWidth: 0.3,
            },
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: [100, 116, 139],
                fontStyle: 'bold',
                fontSize: 7,
            },
            columnStyles: {
                0: { cellWidth: 14, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 22, halign: 'right' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 24, halign: 'right' },
            },
            didDrawPage: (data) => {
                // Draw logo on every page except the first (which has the full header)
                if (!firstTablePage) {
                    drawPageHeader(doc);
                }
                firstTablePage = false;
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    data.cell.styles.textColor = [51, 51, 51];
                }
            },
        });

        y = doc.lastAutoTable.finalY + 2;

        // --- Totals ---
        const subTotal = lineItems.reduce((s, i) => s + (i.price || 0), 0);
        const totalTax = subTotal * VAT_RATE / (100 + VAT_RATE);
        const taxableAmount = subTotal - totalTax;

        // Check if totals block fits on current page (needs ~30mm)
        if (y + 30 > ph - 20) { doc.addPage(); y = 32; }

        const totalsX = pw - mr - 70;
        const valX = pw - mr;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text('Sub Total', totalsX, y + 6, { align: 'right' });
        doc.setFontSize(7);
        doc.text('(Tax Inclusive)', totalsX, y + 10, { align: 'right' });
        doc.setFontSize(8);
        doc.text(formatNum(subTotal), valX, y + 6, { align: 'right' });

        y += 14;
        doc.text(`Standard Rate (${VAT_RATE}%)`, totalsX, y, { align: 'right' });
        doc.text(formatNum(totalTax), valX, y, { align: 'right' });

        y += 6;
        doc.setFillColor(254, 243, 199);
        doc.rect(totalsX - 10, y - 3, valX - totalsX + 14, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Total', totalsX, y + 2, { align: 'right' });
        doc.text(`AED${formatNum(subTotal)}`, valX, y + 2, { align: 'right' });

        y += 16;

        // --- Tax Summary ---
        if (y + 40 > ph - 20) { doc.addPage(); y = 32; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Tax Summary', ml, y);
        y += 4;

        doc.autoTable({
            startY: y,
            margin: { left: ml, right: mr, top: 32 },
            head: [['Tax Details', 'Taxable Amount (AED)', 'Tax Amount (AED)']],
            body: [
                [`Standard Rate (${VAT_RATE}%)`, `${formatNum(taxableAmount)}`, `${formatNum(totalTax)}`],
                ['Total', `AED${formatNum(taxableAmount)}`, `AED${formatNum(totalTax)}`],
            ],
            styles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
                lineColor: [229, 231, 235],
                lineWidth: 0.3,
            },
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: [100, 116, 139],
                fontStyle: 'bold',
                fontSize: 7,
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 40, halign: 'right' },
                2: { cellWidth: 40, halign: 'right' },
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });

        y = doc.lastAutoTable.finalY + 10;

        // --- Notes ---
        if (y + 20 > ph - 30) { doc.addPage(); y = 32; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Notes', ml, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Looking forward for your business.', ml, y + 6);

        y += 14;

        // --- Terms & Conditions ---
        if (y + 20 > ph - 30) { doc.addPage(); y = 32; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Terms & Conditions', ml, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Payment Terms:', ml, y + 6);
        doc.text('50% Deposit', ml, y + 10);
        doc.text('50% Upon Progress', ml, y + 14);

        // --- Footer line + page numbers on every page, logo on non-table continuation pages ---
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            // Bottom colored line
            doc.setDrawColor(26, 26, 46);
            doc.setLineWidth(1);
            doc.line(ml, ph - 12, pw - mr, ph - 12);
            // Page number
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(String(p), pw - mr, ph - 6, { align: 'right' });

            // Draw logo on pages that weren't handled by autoTable's didDrawPage
            if (p > 1) {
                drawPageHeader(doc);
            }
        }

        return doc;
    }

    async function launch() {
        const html = `
            <div class="app-container quotes">
                <div class="app-loading">Loading quotes...</div>
            </div>
        `;
        WindowManager.createWindow('quotes', 'Quotes', html, {
            width: 920, height: 600,
            onReady: async (win) => {
                await loadList(win);
            }
        });
    }

    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: quotes, error } = await SupabaseClient.from('boq')
                .select('*, project:projects(reference, client:clients(name, email, phone))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const all = quotes || [];

            const draftCount = all.filter(q => q.status === 'draft').length;
            const sentCount = all.filter(q => q.status === 'sent').length;
            const acceptedCount = all.filter(q => q.status === 'accepted').length;
            const totalValue = all.filter(q => q.status !== 'rejected').reduce((s, q) => s + (q.client_price || q.total_cost || 0), 0);

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small">
                        <div class="stat-label">Drafts</div>
                        <div class="stat-value">${draftCount}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Sent</div>
                        <div class="stat-value">${sentCount}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Accepted</div>
                        <div class="stat-value">${acceptedCount}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Pipeline Value</div>
                        <div class="stat-value">${Utils.formatCurrencyShort(totalValue)}</div>
                    </div>
                </div>
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search quotes..." id="q-search">
                    <select class="app-filter" id="q-filter">
                        <option value="all">All Statuses</option>
                        ${Object.entries(QUOTE_STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                    </select>
                    <button class="import-btn" id="q-new-btn">+ New Quote</button>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Cost</th>
                            <th>Client Price</th>
                            <th>Date</th>
                        </tr></thead>
                        <tbody id="q-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#q-tbody');
            const search = body.querySelector('#q-search');
            const filter = body.querySelector('#q-filter');

            body.querySelector('#q-new-btn').addEventListener('click', () => showNewQuoteForm(win));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(q => `
                    <tr class="clickable-row" data-id="${q.id}">
                        <td class="ref-link">${q.reference || '—'}</td>
                        <td>${q.project?.reference || '—'}</td>
                        <td>${q.project?.client?.name || '—'}</td>
                        <td>${quoteBadge(q.status)}</td>
                        <td>${Utils.formatCurrency(q.total_cost)}</td>
                        <td>${Utils.formatCurrency(q.client_price)}</td>
                        <td>${Utils.formatRelativeDate(q.created_at)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="7" class="empty-row">No quotes yet</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const quote = all.find(q => q.id === row.dataset.id);
                        if (quote) loadDetail(win, quote);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const f = filter.value;
                let filtered = all;
                if (q) {
                    filtered = filtered.filter(item =>
                        (item.reference || '').toLowerCase().includes(q) ||
                        (item.project?.reference || '').toLowerCase().includes(q) ||
                        (item.project?.client?.name || '').toLowerCase().includes(q)
                    );
                }
                if (f !== 'all') filtered = filtered.filter(item => item.status === f);
                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            filter.addEventListener('change', applyFilters);
            render(all);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load quotes: ${err.message}</div>`;
        }
    }

    async function showNewQuoteForm(win) {
        const body = win.querySelector('.app-container');

        let projects = [];
        try {
            const { data } = await SupabaseClient.from('projects')
                .select('id, reference, client:clients(name)')
                .order('created_at', { ascending: false });
            projects = data || [];
        } catch (e) {}

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="q-form-back">← Back</button>
                    <h2>New Quote</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Quote Details</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select project —</option>
                                    ${projects.map(p => `<option value="${p.id}" data-ref="${p.reference || ''}">${p.reference || 'Untitled'} — ${p.client?.name || 'No client'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quote Reference</label>
                                <input type="text" id="f-reference" placeholder="e.g. Q-2026-001">
                            </div>
                            <div class="form-group">
                                <label>Margin %</label>
                                <input type="number" id="f-margin" step="0.01" value="15" placeholder="15">
                            </div>
                        </div>
                    </div>
                    <div id="q-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="q-form-cancel">Cancel</button>
                    <button class="btn-save" id="q-form-save">Create Quote</button>
                </div>
            </div>
        `;

        const goBack = () => loadList(win);
        body.querySelector('#q-form-back').addEventListener('click', goBack);
        body.querySelector('#q-form-cancel').addEventListener('click', goBack);

        // Auto-fill quote reference from selected project
        const projectSelect = body.querySelector('#f-project');
        const refInput = body.querySelector('#f-reference');
        projectSelect.addEventListener('change', () => {
            const selected = projectSelect.selectedOptions[0];
            const projRef = selected ? selected.dataset.ref : '';
            if (projRef) refInput.value = projRef;
        });

        body.querySelector('#q-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#q-form-save');
            const errEl = body.querySelector('#q-form-error');
            errEl.innerHTML = '';

            const projectId = body.querySelector('#f-project').value;
            if (!projectId) {
                errEl.innerHTML = '<div class="form-error">Please select a project</div>';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating...';

            try {
                const { data, error } = await SupabaseClient.from('boq').insert({
                    project_id: projectId,
                    reference: body.querySelector('#f-reference').value.trim() || null,
                    status: 'draft',
                    total_cost: 0,
                    client_price: 0,
                    margin_percent: parseFloat(body.querySelector('#f-margin').value) || 15,
                    version: 1,
                }).select().single();

                if (error) throw error;

                const { data: quote } = await SupabaseClient.from('boq')
                    .select('*, project:projects(reference, client:clients(name, email, phone))')
                    .eq('id', data.id)
                    .single();
                loadDetail(win, quote || data);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Create Quote';
            }
        });
    }

    async function loadDetail(win, quote) {
        const body = win.querySelector('.app-container');
        body.innerHTML = '<div class="app-loading">Loading quote...</div>';

        try {
            // Fetch categories for this BOQ
            const { data: categories } = await SupabaseClient.from('boq_categories')
                .select('*')
                .eq('boq_id', quote.id)
                .order('sort_order', { ascending: true });
            const cats = categories || [];

            // Fetch line items
            const { data: items, error } = await SupabaseClient.from('boq_items')
                .select('*, category:boq_categories(name)')
                .eq('boq_id', quote.id)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            const lineItems = items || [];
            const calcCost = lineItems.reduce((s, i) => s + (i.cost || 0), 0);
            const calcPrice = lineItems.reduce((s, i) => s + (i.price || 0), 0);

            const statusOptions = Object.entries(QUOTE_STATUSES)
                .filter(([k]) => k !== quote.status)
                .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="q-back">← Back</button>
                        <h2>${quote.reference || 'Quote'}</h2>
                        <div class="status-advance">
                            ${quoteBadge(quote.status)}
                            <select id="q-status-select">${statusOptions}</select>
                            <button id="q-status-go">Update</button>
                        </div>
                        <button class="btn-edit" id="q-edit-btn">Edit Details</button>
                        <button class="import-btn" id="q-download-pdf">Download PDF</button>
                        ${quote.status !== 'accepted' && quote.status !== 'sent' ? `<button class="import-btn" id="q-send-client">Send to Client</button>` : ''}
                        <button class="import-btn" id="q-manage-rfqs">Manage RFQs →</button>
                    </div>

                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item">
                                <span class="field-label">Project</span>
                                <span class="field-value">${quote.project?.reference || '—'}</span>
                            </div>
                            <div class="boq-meta-item">
                                <span class="field-label">Client</span>
                                <span class="field-value">${quote.project?.client?.name || '—'}</span>
                            </div>
                            <div class="boq-meta-item">
                                <span class="field-label">Total Cost</span>
                                <span class="field-value strong">${Utils.formatCurrency(calcCost)}</span>
                            </div>
                            <div class="boq-meta-item">
                                <span class="field-label">Client Price</span>
                                <span class="field-value strong">${Utils.formatCurrency(calcPrice)}</span>
                            </div>
                            <div class="boq-meta-item">
                                <span class="field-label">Margin</span>
                                <span class="field-value">${quote.margin_percent || 0}%</span>
                            </div>
                            <div class="boq-meta-item">
                                <span class="field-label">Items</span>
                                <span class="field-value">${lineItems.length}</span>
                            </div>
                        </div>

                        <div class="boq-items-header">
                            <h3>Line Items</h3>
                            <div style="display:flex;gap:8px">
                                <button class="import-btn" id="q-add-cat">+ Category</button>
                                <button class="import-btn" id="q-add-item">+ Add Item</button>
                                <button class="import-btn" id="q-upload-boq">📤 Upload BOQ</button>
                                <input type="file" id="q-boq-file" accept=".xlsx,.xls" style="display:none">
                            </div>
                        </div>

                        <div class="app-table-wrap">
                            <table class="app-table" id="boq-items-table">
                                <thead><tr>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Cost</th>
                                    <th>Client Price</th>
                                    <th></th>
                                </tr></thead>
                                <tbody id="boq-items-tbody">
                                    ${lineItems.length > 0 ? lineItems.map(item => `
                                        <tr data-id="${item.id}">
                                            <td>${item.category?.name || '—'}</td>
                                            <td>${item.description || '—'}</td>
                                            <td>${item.quantity || 0}</td>
                                            <td>${item.unit || '—'}</td>
                                            <td>${Utils.formatCurrency(item.unit_cost)}</td>
                                            <td class="strong">${Utils.formatCurrency(item.cost)}</td>
                                            <td class="strong">${Utils.formatCurrency(item.price)}</td>
                                            <td>
                                                <button class="btn-edit boq-edit-item" data-id="${item.id}" title="Edit">✎</button>
                                                <button class="btn-edit boq-del-item" data-id="${item.id}" title="Delete">✕</button>
                                            </td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="8" class="empty-row">No line items — click "+ Add Item" to start building the BOQ</td></tr>'}
                                </tbody>
                                ${lineItems.length > 0 ? `
                                    <tfoot>
                                        <tr>
                                            <td colspan="5" style="text-align:right;font-weight:600;color:var(--text-primary)">Total Cost</td>
                                            <td class="strong">${Utils.formatCurrency(calcCost)}</td>
                                            <td class="strong">${Utils.formatCurrency(calcPrice)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // Back
            body.querySelector('#q-back').addEventListener('click', () => loadList(win));

            // Download PDF
            body.querySelector('#q-download-pdf').addEventListener('click', () => {
                const doc = generateQuotePDF(quote, lineItems);
                doc.save(`${quote.reference || 'Quote'}.pdf`);
            });

            // Send to Client
            const sendBtn = body.querySelector('#q-send-client');
            if (sendBtn) {
                sendBtn.addEventListener('click', async () => {
                    const clientEmail = quote.project?.client?.email;
                    const clientName = quote.project?.client?.name || 'Client';
                    if (!clientEmail) {
                        alert('No email address found for this client. Please update the client record first.');
                        return;
                    }
                    if (!confirm(`Send quote PDF to ${clientName} (${clientEmail})?`)) return;

                    sendBtn.disabled = true;
                    sendBtn.textContent = 'Sending...';

                    try {
                        const doc = generateQuotePDF(quote, lineItems);
                        const pdfBase64 = doc.output('datauristring').split(',')[1];

                        const res = await fetch(
                            'https://ckvprducwuhhnrkbzaoo.supabase.co/functions/v1/send-quote',
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${(await SupabaseClient.getSession())?.access_token}`,
                                },
                                body: JSON.stringify({
                                    client_email: clientEmail,
                                    client_name: clientName,
                                    quote_reference: quote.reference || '',
                                    project_reference: quote.project?.reference || '',
                                    total_price: calcPrice,
                                    pdf_base64: pdfBase64,
                                }),
                            }
                        );
                        const result = await res.json();
                        if (!result.success) throw new Error(result.error || 'Failed to send email');

                        // Update status to sent
                        await SupabaseClient.from('boq').update({
                            status: 'sent',
                            sent_to_client_at: new Date().toISOString(),
                        }).eq('id', quote.id);

                        const { data: refreshed } = await SupabaseClient.from('boq')
                            .select('*, project:projects(reference, client:clients(name, email, phone))')
                            .eq('id', quote.id).single();
                        loadDetail(win, refreshed || quote);
                    } catch (err) {
                        alert('Failed to send quote: ' + err.message);
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Send to Client';
                    }
                });
            }

            // Status update
            body.querySelector('#q-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#q-status-select').value;

                // Intercept "accepted" to show workflow
                if (newStatus === 'accepted') {
                    showAcceptanceWorkflow(win, quote, lineItems, calcPrice);
                    return;
                }

                const btn = body.querySelector('#q-status-go');
                btn.disabled = true;
                btn.textContent = '...';
                try {
                    const updates = { status: newStatus };
                    if (newStatus === 'sent') updates.sent_to_client_at = new Date().toISOString();
                    const { error } = await SupabaseClient.from('boq').update(updates).eq('id', quote.id);
                    if (error) throw error;
                    const { data: refreshed } = await SupabaseClient.from('boq')
                        .select('*, project:projects(reference, client:clients(name, email, phone))')
                        .eq('id', quote.id).single();
                    loadDetail(win, refreshed || quote);
                } catch (err) {
                    btn.textContent = 'Error';
                    btn.disabled = false;
                }
            });

            // Edit quote details
            body.querySelector('#q-edit-btn').addEventListener('click', () => showEditQuoteForm(win, quote));

            // Manage RFQs
            body.querySelector('#q-manage-rfqs').addEventListener('click', () => {
                sessionStorage.setItem('rfq_boq_id', quote.id);
                Router.navigate('rfq');
            });

            // Add category
            body.querySelector('#q-add-cat').addEventListener('click', async () => {
                const catName = prompt('Category name:');
                if (!catName) return;
                try {
                    const { error } = await SupabaseClient.from('boq_categories').insert({
                        boq_id: quote.id,
                        name: catName.trim(),
                        sort_order: cats.length,
                    });
                    if (error) throw error;
                    const { data: refreshed } = await SupabaseClient.from('boq')
                        .select('*, project:projects(reference, client:clients(name, email, phone))')
                        .eq('id', quote.id).single();
                    loadDetail(win, refreshed || quote);
                } catch (err) {
                    alert('Error: ' + err.message);
                }
            });

            // Add item
            body.querySelector('#q-add-item').addEventListener('click', () => showItemForm(win, quote, null, cats));

            // Upload BOQ
            const boqFileInput = body.querySelector('#q-boq-file');
            body.querySelector('#q-upload-boq').addEventListener('click', () => boqFileInput.click());
            boqFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleBoqUpload(win, quote, file);
            });

            // Edit item buttons
            body.querySelectorAll('.boq-edit-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = lineItems.find(i => i.id === btn.dataset.id);
                    if (item) showItemForm(win, quote, item, cats);
                });
            });

            // Delete item buttons
            body.querySelectorAll('.boq-del-item').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this line item?')) return;
                    try {
                        const { error } = await SupabaseClient.from('boq_items').delete().eq('id', btn.dataset.id);
                        if (error) throw error;
                        await recalcBoqTotals(quote.id);
                        const { data: refreshed } = await SupabaseClient.from('boq')
                            .select('*, project:projects(reference, client:clients(name, email, phone))')
                            .eq('id', quote.id).single();
                        loadDetail(win, refreshed || quote);
                    } catch (err) {
                        alert('Error deleting item: ' + err.message);
                    }
                });
            });

            // Update stored totals if they drifted
            if (calcCost !== (quote.total_cost || 0) || calcPrice !== (quote.client_price || 0)) {
                await SupabaseClient.from('boq').update({ total_cost: calcCost, client_price: calcPrice }).eq('id', quote.id);
            }
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load quote details: ${err.message}</div>`;
        }
    }

    async function recalcBoqTotals(boqId) {
        const { data: allItems } = await SupabaseClient.from('boq_items')
            .select('cost, price')
            .eq('boq_id', boqId);
        const totalCost = (allItems || []).reduce((s, i) => s + (i.cost || 0), 0);
        const totalPrice = (allItems || []).reduce((s, i) => s + (i.price || 0), 0);
        await SupabaseClient.from('boq').update({ total_cost: totalCost, client_price: totalPrice }).eq('id', boqId);
    }

    async function showEditQuoteForm(win, quote) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="qe-back">← Back</button>
                    <h2>Edit Quote Details</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Quote Reference</label>
                                <input type="text" id="f-reference" value="${quote.reference || ''}">
                            </div>
                            <div class="form-group">
                                <label>Margin %</label>
                                <input type="number" id="f-margin" step="0.01" value="${quote.margin_percent || ''}">
                            </div>
                            <div class="form-group">
                                <label>Version</label>
                                <input type="number" id="f-version" value="${quote.version || 1}">
                            </div>
                        </div>
                    </div>
                    <div id="qe-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="qe-cancel">Cancel</button>
                    <button class="btn-save" id="qe-save">Save</button>
                </div>
            </div>
        `;

        const goBack = () => loadDetail(win, quote);
        body.querySelector('#qe-back').addEventListener('click', goBack);
        body.querySelector('#qe-cancel').addEventListener('click', goBack);

        body.querySelector('#qe-save').addEventListener('click', async () => {
            const btn = body.querySelector('#qe-save');
            const errEl = body.querySelector('#qe-error');
            errEl.innerHTML = '';
            btn.disabled = true;
            btn.textContent = 'Saving...';
            try {
                const { error } = await SupabaseClient.from('boq').update({
                    reference: body.querySelector('#f-reference').value.trim() || null,
                    margin_percent: parseFloat(body.querySelector('#f-margin').value) || null,
                    version: parseInt(body.querySelector('#f-version').value) || 1,
                }).eq('id', quote.id);
                if (error) throw error;
                const { data: refreshed } = await SupabaseClient.from('boq')
                    .select('*, project:projects(reference, client:clients(name, email, phone))')
                    .eq('id', quote.id).single();
                loadDetail(win, refreshed || quote);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Save';
            }
        });
    }

    async function showItemForm(win, quote, existing, cats) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const item = existing || {};

        const commonUnits = ['nr', 'lm', 'm\u00B2', 'm\u00B3', 'kg', 'lot', 'item', 'day', 'hr', 'set'];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="item-back">← Back to Quote</button>
                    <h2>${isEdit ? 'Edit Line Item' : 'Add Line Item'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Category</label>
                                <select id="f-category">
                                    <option value="">— No category —</option>
                                    ${(cats || []).map(c => `<option value="${c.id}" ${c.id === item.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Unit</label>
                                <select id="f-unit">
                                    ${commonUnits.map(u => `<option ${u === (item.unit || 'nr') ? 'selected' : ''}>${u}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Description *</label>
                                <textarea id="f-desc">${item.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Quantity</label>
                                <input type="number" id="f-qty" step="0.01" value="${item.quantity || ''}">
                            </div>
                            <div class="form-group">
                                <label>Unit Cost (AED)</label>
                                <input type="number" id="f-unit-cost" step="0.01" value="${item.unit_cost || ''}">
                            </div>
                            <div class="form-group">
                                <label>Markup %</label>
                                <input type="number" id="f-markup" step="0.01" value="${item.markup_percent || quote.margin_percent || ''}">
                            </div>
                            <div class="form-group full">
                                <label>Calculated</label>
                                <div id="f-calc-area" style="font-size:14px;color:var(--text-primary);padding:8px 0;display:flex;gap:24px;">
                                    <span>Cost: <strong id="f-calc-cost">AED 0</strong></span>
                                    <span>Client Price: <strong id="f-calc-price">AED 0</strong></span>
                                    <span>Profit: <strong id="f-calc-profit">AED 0</strong></span>
                                </div>
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${item.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="item-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="item-cancel">Cancel</button>
                    <button class="btn-save" id="item-save">${isEdit ? 'Save Changes' : 'Add Item'}</button>
                </div>
            </div>
        `;

        const qtyInput = body.querySelector('#f-qty');
        const unitCostInput = body.querySelector('#f-unit-cost');
        const markupInput = body.querySelector('#f-markup');

        function recalc() {
            const qty = parseFloat(qtyInput.value) || 0;
            const uc = parseFloat(unitCostInput.value) || 0;
            const markup = parseFloat(markupInput.value) || 0;
            const cost = qty * uc;
            const price = cost * (1 + markup / 100);
            const profit = price - cost;
            body.querySelector('#f-calc-cost').textContent = Utils.formatCurrency(cost);
            body.querySelector('#f-calc-price').textContent = Utils.formatCurrency(price);
            body.querySelector('#f-calc-profit').textContent = Utils.formatCurrency(profit);
        }
        qtyInput.addEventListener('input', recalc);
        unitCostInput.addEventListener('input', recalc);
        markupInput.addEventListener('input', recalc);
        recalc();

        const goBack = () => loadDetail(win, quote);
        body.querySelector('#item-back').addEventListener('click', goBack);
        body.querySelector('#item-cancel').addEventListener('click', goBack);

        body.querySelector('#item-save').addEventListener('click', async () => {
            const btn = body.querySelector('#item-save');
            const errEl = body.querySelector('#item-form-error');
            errEl.innerHTML = '';

            const description = body.querySelector('#f-desc').value.trim();
            if (!description) {
                errEl.innerHTML = '<div class="form-error">Description is required</div>';
                return;
            }

            const qty = parseFloat(qtyInput.value) || 0;
            const unitCost = parseFloat(unitCostInput.value) || 0;
            const markupPct = parseFloat(markupInput.value) || 0;
            const cost = qty * unitCost;
            const clientUnitPrice = unitCost * (1 + markupPct / 100);
            const price = qty * clientUnitPrice;
            const markupValue = price - cost;
            const profit = markupValue;

            const record = {
                boq_id: quote.id,
                category_id: body.querySelector('#f-category').value || null,
                description,
                quantity: qty,
                unit: body.querySelector('#f-unit').value,
                unit_cost: unitCost,
                cost,
                markup_percent: markupPct,
                markup_value: markupValue,
                client_unit_price: clientUnitPrice,
                price,
                profit,
                notes: body.querySelector('#f-notes').value.trim() || null,
            };

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let result;
                if (isEdit) {
                    result = await SupabaseClient.from('boq_items').update(record).eq('id', item.id);
                } else {
                    result = await SupabaseClient.from('boq_items').insert(record);
                }
                if (result.error) throw result.error;

                await recalcBoqTotals(quote.id);

                const { data: refreshed } = await SupabaseClient.from('boq')
                    .select('*, project:projects(reference, client:clients(name, email, phone))')
                    .eq('id', quote.id).single();
                loadDetail(win, refreshed || quote);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Add Item';
            }
        });
    }

    function handleBoqUpload(win, quote, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (!allRows.length) {
                    alert('No data found in the spreadsheet.');
                    return;
                }

                // Scan rows to find the header row containing known column names
                const descMatches = ['work description', 'description', 'desc', 'item'];
                const qtyMatches = ['qty', 'quantity'];
                const unitMatches = ['unit', 'uom'];
                const ucMatches = ['unit cost', 'unit_cost', 'rate', 'unit price', 'unit_price', 'price vat inc.', 'price vat inc', 'price'];

                let headerIdx = -1;
                let colMap = {};
                for (let r = 0; r < Math.min(allRows.length, 40); r++) {
                    const row = allRows[r];
                    if (!row || !row.length) continue;
                    const cells = row.map(c => String(c || '').toLowerCase().trim());
                    const di = cells.findIndex(c => descMatches.includes(c));
                    if (di !== -1) {
                        headerIdx = r;
                        colMap.desc = di;
                        colMap.qty = cells.findIndex(c => qtyMatches.includes(c));
                        colMap.unit = cells.findIndex(c => unitMatches.includes(c));
                        colMap.uc = cells.findIndex(c => ucMatches.includes(c));
                        break;
                    }
                }

                if (headerIdx === -1) {
                    const sampleHeaders = allRows.slice(0, 10).map((r, i) => `Row ${i + 1}: ${(r || []).join(', ')}`).join('\n');
                    alert('Could not find a Description column. Expected headers: Work Description, Description, Desc, or Item.\n\nFirst rows:\n' + sampleHeaders);
                    return;
                }

                const dataRows = allRows.slice(headerIdx + 1);
                const margin = quote.margin_percent || 0;

                // In Bolsover BOQs, the description is often in col 2 (col 0 has item numbers).
                // Detect: if header col is 0 but data rows have descriptions in col 2, use col 2.
                let descIdx = colMap.desc;
                if (descIdx === 0 && dataRows.length > 0) {
                    const sample = dataRows.slice(0, 10).filter(r => r && r.length > 2);
                    const col2HasText = sample.filter(r => r[2] && String(r[2]).trim().length > 10).length;
                    const col0IsRef = sample.filter(r => r[0] && /^[A-Z]\d|^\d+$/.test(String(r[0]).trim())).length;
                    if (col2HasText >= 3 && col0IsRef >= 2) descIdx = 2;
                }

                const parsed = dataRows
                    .filter(row => {
                        if (!row || !row[descIdx]) return false;
                        const desc = String(row[descIdx]).trim().toLowerCase();
                        if (!desc) return false;
                        // Skip category headers, sub-total rows, and summary labels
                        if (desc.startsWith('sub-total') || desc.startsWith('subtotal')) return false;
                        if (/^[a-z]\.\s/i.test(desc) && desc.length < 60 && !row[colMap.qty]) return false;
                        // Skip rows with no qty, no unit, and no cost (summary/label rows)
                        const hasQty = colMap.qty !== -1 && row[colMap.qty];
                        const hasUnit = colMap.unit !== -1 && row[colMap.unit];
                        const hasCost = colMap.uc !== -1 && row[colMap.uc];
                        if (!hasQty && !hasUnit && !hasCost) return false;
                        return true;
                    })
                    .map(row => {
                        const qty = colMap.qty !== -1 ? Math.round((parseFloat(row[colMap.qty]) || 0) * 100) / 100 : 0;
                        const unitCost = colMap.uc !== -1 ? Math.round((parseFloat(row[colMap.uc]) || 0) * 100) / 100 : 0;
                        const unit = colMap.unit !== -1 && row[colMap.unit] ? String(row[colMap.unit]).trim() : 'nr';
                        const cost = qty * unitCost;
                        const clientUnitPrice = unitCost * (1 + margin / 100);
                        const price = qty * clientUnitPrice;
                        return {
                            description: String(row[descIdx]).trim(),
                            quantity: qty,
                            unit,
                            unit_cost: unitCost,
                            cost,
                            markup_percent: margin,
                            markup_value: price - cost,
                            client_unit_price: clientUnitPrice,
                            price,
                            profit: price - cost,
                        };
                    });

                if (!parsed.length) {
                    alert('No valid rows found (all descriptions were empty).');
                    return;
                }

                showBoqPreview(win, quote, parsed);
            } catch (err) {
                alert('Error reading Excel file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function showAcceptanceWorkflow(win, quote, lineItems, calcPrice) {
        const body = win.querySelector('.app-container');
        const clientEmail = quote.project?.client?.email || '';
        const clientName = quote.project?.client?.name || '';
        const today = new Date().toISOString().split('T')[0];
        const dueDateDefault = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="aw-back">← Back</button>
                    <h2>Quote Accepted — Next Steps</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Contract Documents</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>
                                    <input type="checkbox" id="aw-docusign" checked>
                                    Send contract documents via DocuSign
                                </label>
                            </div>
                            <div class="form-group" id="aw-ds-fields">
                                <label>Signer Email</label>
                                <input type="email" id="aw-signer-email" value="${clientEmail}">
                            </div>
                            <div class="form-group" id="aw-ds-fields2">
                                <label>Signer Name</label>
                                <input type="text" id="aw-signer-name" value="${clientName}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>First Payment Invoice</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>
                                    <input type="checkbox" id="aw-invoice" checked>
                                    Create first payment invoice
                                </label>
                            </div>
                            <div class="form-group" id="aw-inv-fields">
                                <label>Amount (AED)</label>
                                <input type="number" id="aw-inv-amount" step="0.01" value="${Math.round(calcPrice * 0.5 * 100) / 100}" placeholder="Deposit amount">
                            </div>
                            <div class="form-group" id="aw-inv-fields2">
                                <label>Invoice Type</label>
                                <select id="aw-inv-type">
                                    <option value="deposit" selected>Deposit</option>
                                    <option value="progress_claim">Progress Claim</option>
                                    <option value="milestone">Milestone</option>
                                </select>
                            </div>
                            <div class="form-group" id="aw-inv-fields3">
                                <label>Due Date</label>
                                <input type="date" id="aw-inv-due" value="${dueDateDefault}">
                            </div>
                        </div>
                    </div>
                    <div id="aw-error"></div>
                    <div id="aw-progress" style="display:none;padding:12px 0;font-size:13px;color:var(--text-secondary)"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="aw-cancel">Cancel</button>
                    <button class="btn-save" id="aw-proceed">Proceed</button>
                </div>
            </div>
        `;

        // Toggle field visibility based on checkboxes
        const dsCheck = body.querySelector('#aw-docusign');
        const invCheck = body.querySelector('#aw-invoice');
        dsCheck.addEventListener('change', () => {
            const show = dsCheck.checked;
            body.querySelector('#aw-ds-fields').style.display = show ? '' : 'none';
            body.querySelector('#aw-ds-fields2').style.display = show ? '' : 'none';
        });
        invCheck.addEventListener('change', () => {
            const show = invCheck.checked;
            body.querySelector('#aw-inv-fields').style.display = show ? '' : 'none';
            body.querySelector('#aw-inv-fields2').style.display = show ? '' : 'none';
            body.querySelector('#aw-inv-fields3').style.display = show ? '' : 'none';
        });

        const goBack = () => loadDetail(win, quote);
        body.querySelector('#aw-back').addEventListener('click', goBack);
        body.querySelector('#aw-cancel').addEventListener('click', goBack);

        body.querySelector('#aw-proceed').addEventListener('click', async () => {
            const btn = body.querySelector('#aw-proceed');
            const errEl = body.querySelector('#aw-error');
            const progressEl = body.querySelector('#aw-progress');
            errEl.innerHTML = '';
            btn.disabled = true;
            btn.textContent = 'Processing...';
            progressEl.style.display = 'block';

            try {
                // Step 1: Update BOQ status to accepted
                progressEl.textContent = 'Updating quote status...';
                await SupabaseClient.from('boq').update({
                    status: 'accepted',
                    approved_at: new Date().toISOString(),
                }).eq('id', quote.id);

                // Step 2: Update project status
                progressEl.textContent = 'Updating project...';
                await SupabaseClient.from('projects').update({
                    status: 'accepted',
                    contract_value: calcPrice,
                }).eq('id', quote.project_id);

                // Step 3: DocuSign (if checked)
                if (dsCheck.checked) {
                    progressEl.textContent = 'Sending contract via DocuSign...';
                    const signerEmail = body.querySelector('#aw-signer-email').value.trim();
                    const signerName = body.querySelector('#aw-signer-name').value.trim();
                    if (!signerEmail) throw new Error('Signer email is required for DocuSign');

                    const doc = generateQuotePDF(quote, lineItems);
                    const pdfBase64 = doc.output('datauristring').split(',')[1];

                    const dsRes = await fetch(
                        'https://ckvprducwuhhnrkbzaoo.supabase.co/functions/v1/send-docusign',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${(await SupabaseClient.getSession())?.access_token}`,
                            },
                            body: JSON.stringify({
                                signer_email: signerEmail,
                                signer_name: signerName,
                                quote_reference: quote.reference || '',
                                project_reference: quote.project?.reference || '',
                                pdf_base64: pdfBase64,
                            }),
                        }
                    );
                    const dsText = await dsRes.text();
                    let dsResult;
                    try { dsResult = JSON.parse(dsText); } catch { throw new Error('DocuSign edge function error: ' + dsText.slice(0, 500)); }
                    if (!dsResult.success) throw new Error('DocuSign: ' + (dsResult.error || JSON.stringify(dsResult).slice(0, 500)));

                    // Store envelope ID
                    if (dsResult.envelope_id) {
                        await SupabaseClient.from('boq').update({
                            docusign_envelope_id: dsResult.envelope_id,
                        }).eq('id', quote.id);
                    }
                }

                // Step 4: Create invoice (if checked)
                if (invCheck.checked) {
                    progressEl.textContent = 'Creating invoice...';
                    const invAmount = parseFloat(body.querySelector('#aw-inv-amount').value) || 0;
                    const invType = body.querySelector('#aw-inv-type').value;
                    const invDue = body.querySelector('#aw-inv-due').value || null;

                    if (invAmount <= 0) throw new Error('Invoice amount must be greater than 0');

                    const { data: invData, error: invErr } = await SupabaseClient.from('invoices').insert({
                        project_id: quote.project_id,
                        reference: `INV-${quote.reference || 'QUOTE'}`,
                        invoice_type: invType,
                        status: 'draft',
                        amount: invAmount,
                        due_date: invDue,
                        description: `${invType === 'deposit' ? 'Deposit' : 'Payment'} for ${quote.reference || 'Quote'}`,
                    }).select().single();
                    if (invErr) throw invErr;

                    // Sync to Zoho Books
                    if (invData) {
                        progressEl.textContent = 'Syncing invoice to Zoho Books...';
                        try {
                            await fetch(
                                'https://ckvprducwuhhnrkbzaoo.supabase.co/functions/v1/zoho-sync',
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${(await SupabaseClient.getSession())?.access_token}`,
                                    },
                                    body: JSON.stringify({
                                        action: 'sync-invoice',
                                        invoice_id: invData.id,
                                    }),
                                }
                            );
                        } catch (zohoErr) {
                            console.warn('Zoho sync failed (non-blocking):', zohoErr);
                        }
                    }
                }

                progressEl.textContent = 'Done! Opening RFQ assignment...';
                sessionStorage.setItem('rfq_boq_id', quote.id);
                Router.navigate('rfq');
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Proceed';
                progressEl.style.display = 'none';
            }
        });
    }

    function showBoqPreview(win, quote, parsedItems) {
        const body = win.querySelector('.app-container');
        const totalCost = parsedItems.reduce((s, i) => s + i.cost, 0);
        const totalPrice = parsedItems.reduce((s, i) => s + i.price, 0);

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="boq-preview-cancel">← Cancel</button>
                    <h2>BOQ Upload Preview</h2>
                </div>
                <div class="boq-detail-body">
                    <div class="boq-meta">
                        <div class="boq-meta-item">
                            <span class="field-label">Items to Import</span>
                            <span class="field-value strong">${parsedItems.length}</span>
                        </div>
                        <div class="boq-meta-item">
                            <span class="field-label">Total Cost</span>
                            <span class="field-value strong">${Utils.formatCurrency(totalCost)}</span>
                        </div>
                        <div class="boq-meta-item">
                            <span class="field-label">Client Price (${quote.margin_percent || 0}% margin)</span>
                            <span class="field-value strong">${Utils.formatCurrency(totalPrice)}</span>
                        </div>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Unit Cost</th>
                                <th>Cost</th>
                                <th>Client Price</th>
                            </tr></thead>
                            <tbody>
                                ${parsedItems.map((item, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${item.description}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.unit}</td>
                                        <td>${Utils.formatCurrency(item.unit_cost)}</td>
                                        <td>${Utils.formatCurrency(item.cost)}</td>
                                        <td>${Utils.formatCurrency(item.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" style="text-align:right;font-weight:600">Totals</td>
                                    <td class="strong">${Utils.formatCurrency(totalCost)}</td>
                                    <td class="strong">${Utils.formatCurrency(totalPrice)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
                        <button class="back-btn" id="boq-import-cancel">Cancel</button>
                        <button class="btn-save" id="boq-import-go">Import ${parsedItems.length} Items</button>
                    </div>
                    <div id="boq-import-error"></div>
                </div>
            </div>
        `;

        const goBack = async () => {
            const { data: refreshed } = await SupabaseClient.from('boq')
                .select('*, project:projects(reference, client:clients(name, email, phone))')
                .eq('id', quote.id).single();
            loadDetail(win, refreshed || quote);
        };

        body.querySelector('#boq-preview-cancel').addEventListener('click', goBack);
        body.querySelector('#boq-import-cancel').addEventListener('click', goBack);

        body.querySelector('#boq-import-go').addEventListener('click', async () => {
            const btn = body.querySelector('#boq-import-go');
            const errEl = body.querySelector('#boq-import-error');
            btn.disabled = true;
            btn.textContent = 'Importing...';

            try {
                const records = parsedItems.map(item => ({
                    boq_id: quote.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_cost: item.unit_cost,
                    cost: item.cost,
                    markup_percent: item.markup_percent,
                    markup_value: item.markup_value,
                    client_unit_price: item.client_unit_price,
                    price: item.price,
                    profit: item.profit,
                }));

                const { error } = await SupabaseClient.from('boq_items').insert(records);
                if (error) throw error;

                await recalcBoqTotals(quote.id);

                const { data: refreshed } = await SupabaseClient.from('boq')
                    .select('*, project:projects(reference, client:clients(name, email, phone))')
                    .eq('id', quote.id).single();
                loadDetail(win, refreshed || quote);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Import failed: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = `Import ${parsedItems.length} Items`;
            }
        });
    }

    return { id: 'quotes', name: 'Quotes', icon: ICON, launch };
})();
