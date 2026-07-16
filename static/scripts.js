/**
 * JCI UNIBEN TOYP - Master Admin Script
 * Includes: Nominations, Voting, Audit, and Category Scripts
 */


// 1. SYSTEM STATE & SECURITY (Requirement 2)
// At the very beginning (after imports)
const currentUser = {
    name: "Admin User",
    role: localStorage.getItem('activeUserRole') || 'super-admin',
    isAuthenticated: true
};


// Import Supabase client (requires `static/config.js` to set window.SUPABASE_URL and window.SUPABASE_ANON_KEY)
import { supabase } from './supabase-client.js';
window.__mergeLogs = [];   // store merge action logs

// 2. VIEW TEMPLATES (Requirement 3B - 3H)
const templateViews = {
    overview: {
        filePath: '/views/overview.html',
        htmlContent: '',
    },
    nominations: {
        filePath: '/views/nominations.html',
        htmlContent: '',
    },
    categories: {
        filePath: '/views/categories.html',
        htmlContent: '',
    },
    finalists: {
        filePath: '/views/finalists.html',
        htmlContent: '',
    },
    voting: {
        filePath: './views/voting.html',
        htmlContent: '',
    },
    audit: {
        filePath: '/views/audit.html',
        htmlContent: '',
    },
    logs: {
        filePath: '/views/logs.html',
        htmlContent: '',
    },
    content: {
        filePath: '/views/content.html',
        htmlContent: '',
    },
};


// 3. CORE FUNCTIONS
/**
 * Loads/Parses html template file and Inits it inot the htmlContnent param/key
 * 
 * @param {Object} templateView - The view obj which contains its file path param and a htmlContnet param to stire the parsed template
 * @returns {HTML} - The parsed html view.
 */
const loadHTMLTemplate = async (templateView) => {
    if (templateView.htmlContent) { // if htmlContent is already loaded
        return templateView.htmlContent;
    }

    const filePath = templateView.filePath;
    const resp = await fetch(filePath, { cache: 'no-cache' }); // Pls change cache to 'default', this allows good testing
    if (!resp.ok) {
        throw new Error(`Couldn\'nt fetch ${filePath}`);
    }

    // Load the template and assign its content to the templateView obj for reusabilty & editability
    try {
        const templateString = await resp.text();
        const documentObj = new DOMParser().parseFromString(templateString, 'text/html');
        const templateNode = documentObj.querySelector('template');  // if <template> wrapper is used

        templateView.htmlContent = templateNode
            ? templateNode.innerHTML.trim()
            : documentObj.body.innerHTML.trim(); // Some templates have a <template> tag while some use a <div>

        return templateView.htmlContent;
    } catch (error) {
        console.error(`Couldn\'t parse template at ${filePath}`, error);
        return '';  // 
    }
}

/**
 * Gets the editable view
 * 
 * @param {String} viewKey - The unique key that identifies the view to be retrieved. 
 * @returns { HTML | '' } - The editable markup view OR an empty string if the view isnt found.
 */
const getViewMarkup = async (viewKey) => {
    if (templateViews[viewKey]) {
        return loadHTMLTemplate(templateViews[viewKey]);
    }
    return '';
};

/**
 * Applies role-based access control by restricting UI elements based on current user role
 * 
 * @returns {void}
 */
function applySecurityRoles() {
    const badge = document.querySelector('.role-badge');
    if (badge) {
        badge.textContent = 'Super Admin';
        badge.className = 'role-badge super-admin';
    }
}

/**
 * Opens nomination details modal with nominee profile, achievement write-up, and approval actions
 * 
 * @returns {void}
 */
function openNominationModal(nomination = null) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    if (!nomination) {
        modalBody.innerHTML = '<div style="padding:20px">No nomination data available.</div>';
        modal.style.display = 'flex';
        return;
    }

    // Set modal title dynamically
    document.getElementById('modal-title').textContent = nomination.nominee_name;
    document.getElementById('modal-subtitle').textContent = nomination.category || 'Category not specified';

    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Profile header -->
            <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--jci-blue); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;">
                    ${nomination.nominee_name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: var(--jci-black);">${nomination.nominee_name}</h3>
                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">${nomination.nominee_email}</p>
                </div>
            </div>

            <!-- Detail grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Category</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">${nomination.category || '—'}</p>
                </div>
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Status</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">
                        <span class="status-badge ${nomination.status || 'pending'}">${nomination.status || 'Pending'}</span>
                    </p>
                </div>
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Nominator</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">${nomination.nominator_email || '—'}</p>
                    <p style="font-size: 13px; color: var(--text-muted);">${nomination.faculty || ''} ${nomination.department ? '— ' + nomination.department : ''}</p>
                </div>
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Date Submitted</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">${new Date(nomination.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            <!-- Achievement write-up -->
            <div>
                <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px;">Achievement Write-up</h4>
                <div style="background: var(--bg-slate); padding: 16px; border-radius: 10px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                    ${nomination.reason || 'No write-up provided.'}
                </div>
            </div>

            <!-- Contact (if available) -->
            ${nomination.whatsapp_contact ? `
            <div>
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">WhatsApp Contact</span>
                <p style="font-weight: 600; margin: 4px 0 0;">${nomination.whatsapp_contact}</p>
            </div>` : ''}

            <div style="margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
                <button class="btn-secondary close-modal">Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    applySecurityRoles();
}

/**
 * Opens category management modal for creating or editing award categories
 * 
 * @param {Boolean} isEdit - Whether the modal is for editing (true) or creating new (false)
 * @param {Object} data - Category data object containing name and description for edit mode
 * @returns {void}
 */
function openCategoryModal(isEdit = false, data = {}) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--bg-slate); padding-bottom: 15px;">
                    <h2 style="font-size: 18px; color: var(--jci-blue);">
                        ${isEdit ? '<i class="bx bx-edit"></i> Edit Category' : '<i class="bx bx-plus-circle"></i> New Category'}
                    </h2>
                    <p style="font-size: 12px; color: var(--text-muted);">Set the name and public description for this award.</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label class="modal-label">Category Name</label>
                        <input type="text" id="cat-name-input" value="${data.name || ''}" 
                            placeholder="e.g., Cultural Achievement" 
                            style="width: 100%; padding: 12px; border: 1px solid var(--bg-slate); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div>
                        <label class="modal-label">Public Description</label>
                        <textarea id="cat-desc-input" rows="5" 
                                style="width: 100%; padding: 12px; border: 1px solid var(--bg-slate); border-radius: 6px; font-family: inherit; font-size: 13px; line-height: 1.5;" 
                                placeholder="Describe the criteria for this category. This will be visible to nominators...">${data.desc || ''}</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 15px; border-top: 1px solid var(--bg-slate);">
                    <button class="view-btn" onclick="document.getElementById('detailsModal').style.display='none'">Cancel</button>
                    <button class="btn-primary" id="save-category-btn" style="background: var(--jci-teal); border: none; padding: 10px 25px;">
                        ${isEdit ? 'Update Category' : 'Save Category'}
                    </button>
                </div>
            </div>
        `;
    modal.style.display = 'flex';
    // mark save button with edit id when editing so handler knows to PATCH instead of POST
    const saveBtn = document.getElementById('save-category-btn');
    if (saveBtn) {
        if (isEdit && data && data.id) {
            saveBtn.dataset.editId = data.id;
        } else {
            delete saveBtn.dataset.editId;
        }
    }
}

/**
 * Opens detailed dossier modal displaying comprehensive nominee profile information
 * 
 * @returns {void}
 */
function openDossierModal() {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--bg-slate); padding-bottom: 10px; display: flex; justify-content: space-between;">
                    <h2 style="font-size: 18px; color: var(--jci-blue);">Nominee Profile</h2>
                    <span class="status-badge status-shortlisted">Shortlisted</span>
                </div>
                <div style="display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid var(--bg-slate);">
                    <button class="view-btn" onclick="document.getElementById('detailsModal').style.display='none'">Close Dossier</button>
                </div>
            </div>
        `;
    modal.style.display = 'flex';
}


// 4. CORE CONTROLLER
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
    }
    const contentArea = document.getElementById('content-area');
    const navItems = document.querySelectorAll('.nav-item');
    const modal = document.getElementById('detailsModal');
    // voting timer logic
    let timerInterval;

    function startTimer(durationInSeconds) {
        let timer = durationInSeconds;
        const display = document.getElementById('voting-timer');

        clearInterval(timerInterval); // Clear any existing timer

        timerInterval = setInterval(() => {
            let hours = Math.floor(timer / 3600);
            let minutes = Math.floor((timer % 3600) / 60);
            let seconds = Math.floor(timer % 60);

            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            if (display) display.textContent = hours + ":" + minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(timerInterval);
                if (display) display.textContent = "EXPIRED";
            }
        }, 1000);
    }

    // Update your Click Listener for Voting
    // Event Delegation
    document.addEventListener('click', async (e) => {
        const banner = document.getElementById('voting-banner');
        const statusLabel = document.getElementById('v-status');

        if (e.target.id === 'start-v') {
            // Toggle UI
            e.target.style.display = 'none';
            document.getElementById('stop-v').style.display = 'block';

            // Update Banner
            banner.className = "voting-banner active";
            banner.innerHTML = `<i class='bx bxs-megaphone'></i> <span>VOTING IS LIVE: Public portal is now accepting ballots.</span>`;

            // Update Status
            statusLabel.textContent = "Phase: Active";
            statusLabel.style.background = "#DCFCE7";
            statusLabel.style.color = "#166534";

            // Start 24-hour timer (86400 seconds)
            startTimer(86400);
        }

        if (e.target.id === 'stop-v') {
            e.target.style.display = 'none';
            document.getElementById('start-v').style.display = 'block';

            // Update Banner back to Locked
            banner.className = "voting-banner locked";
            banner.innerHTML = `<i class='bx bxs-lock'></i> <span>VOTING IS CURRENTLY LOCKED: Public access is disabled.</span>`;

            statusLabel.textContent = "Phase: Paused";
            statusLabel.style.background = "#FEE2E2";
            statusLabel.style.color = "#991B1B";

            clearInterval(timerInterval);
            document.getElementById('voting-timer').textContent = "00:00:00";
        }
    });

    // Default View
    await loadOverview();

    // Navigation Switcher Logic
    navItems.forEach(item => {
        item.addEventListener('click', async function (e) {
            if (this.classList.contains('logout')) return;
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            const viewKey = this.getAttribute('data-view');
            const viewMarkup = await getViewMarkup(viewKey);
            if (viewMarkup) {
                contentArea.innerHTML = viewMarkup;
                applySecurityRoles();
                if (viewKey === 'overview') await loadOverview();
                if (viewKey === 'nominations') await loadNominations();
                if (viewKey === 'categories') await loadCategories();
                if (viewKey === 'finalists') await loadFinalists();
            }
        });
    });

    // when cards are clicked in overview, navigate to matching view
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.stat-card');
        if (card) {
            let viewKey = card.getAttribute('data-view');
            if (!viewKey) {
                // fallback to index mapping
                const idx = Array.from(document.querySelectorAll('.stats-grid .stat-card')).indexOf(card);
                const mapping = ['nominations', 'categories', 'voting', 'nominations'];
                viewKey = mapping[idx] || 'overview';
            }
            const navItem = document.querySelector(`.nav-item[data-view="${viewKey}"]`);
            if (navItem) navItem.click();
        }
    });

    // helper to load overview data
    async function loadOverview() {
        const template = await getViewMarkup('overview');
        contentArea.innerHTML = template;

        // Attach event listeners only after DOM is updated
        const viewLogsBtn = document.querySelector('.view-btn');
        if (viewLogsBtn && viewLogsBtn.textContent.includes('View All Logs')) {
            viewLogsBtn.addEventListener('click', async () => {
                const viewMarkup = await getViewMarkup('logs');
                contentArea.innerHTML = viewMarkup;
                applySecurityRoles();
                await loadLogs();
            });
        }

        applySecurityRoles();

        // Refresh button (if exists)
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadOverview);
        }

        // --- Fetch Supabase data ---
        try {
            const [
                { count: nominations },
                { count: votes },
                { count: categories }
            ] = await Promise.all([
                supabase.from('nominations').select('id', { count: 'exact', head: true }),
                supabase.from('votes').select('id', { count: 'exact', head: true }),
                supabase.from('categories').select('id', { count: 'exact', head: true }),
            ]);

            let verified = 0;
            try {
                const { count: verifiedCount } = await supabase
                    .from('nominations')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'verified');
                verified = verifiedCount || 0;
            } catch (_) { /* ignore */ }

            const pending = (nominations || 0) - verified;

            // Update stats (only if elements exist)
            const setText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            setText('stat-total-nominations', nominations || '--');
            setText('stat-verified', verified || '--');
            setText('stat-pending', pending >= 0 ? pending : '--');
            setText('stat-categories', categories || '--');
            setText('stat-votes', votes || '--');
            setText('stat-voting-status', 'Closed'); // or fetch real status

        } catch (err) {
            console.error('Failed to fetch overview counts', err);
            document.querySelectorAll('.stats-grid h2').forEach(h2 => h2.textContent = '--');
        }

        // System status placeholders
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setText('db-status', 'Connected');
        setText('portal-status', 'Available');
        setText('backup-time', new Date().toLocaleString());
        setText('last-sync', new Date().toLocaleString());

        // Recent activity
        loadRecentActivityForOverview();
    }
    async function loadRecentActivityForOverview() {
        const tbody = document.getElementById('overview-logs-body');
        if (!tbody) return;

        try {
            const limit = 5;
            const [{ data: noms }, { data: vts }, { data: cats }] = await Promise.all([
                supabase.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit),
                supabase.from('votes').select('id, nomination_id, voter_email, created_at').order('created_at', { ascending: false }).limit(limit),
                supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
            ]);

            const events = [];
            (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
            (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: v.voter_email || 'anonymous', status: 'Voted' }));
            (cats || []).forEach(c => events.push({ time: c.created_at, activity: `Category Added: ${c.name}`, user: 'Admin', status: 'Created' }));

            events.sort((a, b) => new Date(b.time) - new Date(a.time));
            const recent = events.slice(0, limit);

            tbody.innerHTML = '';
            if (recent.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-muted);">No recent activity.</td></tr>';
                return;
            }

            recent.forEach(ev => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td style="padding:12px;">${new Date(ev.time).toLocaleString()}</td>
                <td style="padding:12px;">${ev.activity}</td>
                <td style="padding:12px;">${ev.user}</td>
                <td style="padding:12px;"><span class="status-badge">${ev.status}</span></td>
            `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Failed to load recent activity', err);
            tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-muted);">Could not load activity.</td></tr>';
        }
    }

    async function loadLogs() {
        try {
            const limit = 50;
            const [{ data: noms }, { data: vts }, { data: cats }] = await Promise.all([
                supabase.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit),
                supabase.from('votes').select('id, nomination_id, voter_email, created_at').order('created_at', { ascending: false }).limit(limit),
                supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
            ]);

            const events = [];
            (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
            (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: v.voter_email || 'anonymous', status: 'Voted' }));
            (cats || []).forEach(c => events.push({ time: c.created_at, activity: `Category Added: ${c.name}`, user: 'Admin', status: 'Created' }));

            events.sort((a, b) => new Date(b.time) - new Date(a.time));

            const tbody = document.getElementById('logs-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            events.slice(0, limit).forEach(ev => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px;">${new Date(ev.time).toLocaleString()}</td>
                    <td style="padding: 12px;">${ev.activity}</td>
                    <td style="padding: 12px;">${ev.user}</td>
                    <td style="padding: 12px;"><span class="status-badge">${ev.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('failed to load logs', err);
        }
    }

    // load categories list and populate categories view


    async function loadCategories() {
        const tbody = document.getElementById('category-table-body');
        const emptyState = document.getElementById('category-empty-state');

        if (!tbody) return;

        // Show loading state
        tbody.innerHTML = `<tr><td colspan="6" style="padding:15px; color:var(--text-muted); text-align:center;">
        <i class='bx bx-loader-alt bx-spin'></i> Loading categories...
    </td></tr>`;
        if (emptyState) emptyState.classList.add('hidden');

        // Build query – try ordering by display_order, fallback to created_at
        let query = supabase.from('categories').select('*');
        try {
            const { data: test, error: testErr } = await supabase
                .from('categories')
                .select('display_order')
                .limit(1);
            if (!testErr) {
                query = query.order('display_order', { ascending: true });
            } else {
                query = query.order('created_at', { ascending: true });
            }
        } catch (e) {
            query = query.order('created_at', { ascending: true });
        }

        const { data: cats, error } = await query;

        if (error) {
            console.error('Failed to load categories:', error);
            tbody.innerHTML = '<tr><td colspan="6" style="padding:15px; color:red; text-align:center;">Error loading categories</td></tr>';
            return;
        }

        // Fetch nomination counts per category (for the "Entries" column)
        let categoryCounts = {};
        try {
            const { data: allNominations, error: nomErr } = await supabase
                .from('nominations')
                .select('category');
            if (!nomErr && allNominations) {
                allNominations.forEach(function (nom) {
                    const cat = nom.category || 'Uncategorized';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });
            }
        } catch (e) {
            console.warn('Could not fetch nomination counts', e);
        }

        // Attach the count to each category object
        cats.forEach(function (cat) {
            cat._entries = categoryCounts[cat.name] || 0;
        });

        // Store globally
        window.__ALL_CATEGORIES__ = cats;

        // Get filter values
        const searchInput = document.getElementById('category-search');
        const statusFilter = document.getElementById('category-status-filter');
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const filterVal = statusFilter ? statusFilter.value : '';

        let filtered = cats || [];

        if (searchTerm) {
            filtered = filtered.filter(function (cat) {
                return (cat.name || '').toLowerCase().indexOf(searchTerm) !== -1 ||
                    (cat.description || '').toLowerCase().indexOf(searchTerm) !== -1;
            });
        }

        if (filterVal === 'visible') {
            filtered = filtered.filter(function (cat) { return cat.visible !== false; });
        } else if (filterVal === 'hidden') {
            filtered = filtered.filter(function (cat) { return cat.visible === false; });
        }

        // Update stats
        const total = cats ? cats.length : 0;
        const visibleCount = cats ? cats.filter(function (c) { return c.visible !== false; }).length : 0;
        const hiddenCount = total - visibleCount;

        document.getElementById('total-categories').textContent = total;
        document.getElementById('visible-categories').textContent = visibleCount;
        document.getElementById('hidden-categories').textContent = hiddenCount;
        document.getElementById('total-category-entries').textContent = cats.reduce((sum, cat) => sum + (cat._entries || 0), 0);

        // Render table
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        if (emptyState) emptyState.classList.add('hidden');

        filtered.forEach(function (cat) {
            var tr = document.createElement('tr');
            var visibleChecked = (cat.visible !== false) ? 'checked' : '';
            tr.innerHTML = `
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate);">
                <div style="font-weight: 600;">${cat.name}</div>
            </td>
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate); font-size: 13px; color: var(--text-muted);">
                ${cat.description || '—'}
            </td>
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                ${cat._entries != null ? cat._entries : '—'}
            </td>
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                <label class="switch-ui">
                    <input type="checkbox" class="cat-visibility-toggle" data-id="${cat.id}" ${visibleChecked}>
                    <span class="slider"></span>
                </label>
            </td>
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                <input type="number" class="display-order-input" data-id="${cat.id}" value="${cat.display_order || 0}" 
                    style="width: 60px; padding: 4px; text-align: center; border: 1px solid var(--border-color); border-radius: 4px;" min="0">
            </td>
            <td style="padding: 14px; border-bottom: 1px solid var(--bg-slate);">
                <div style="display: flex; gap: 8px;">
                    <button class="view-btn edit-cat-trigger" data-id="${cat.id}" data-name="${cat.name}" data-desc="${cat.description || ''}">
                        <i class='bx bx-edit-alt'></i> Edit
                    </button>
                    <button class="view-btn delete-cat" data-id="${cat.id}" style="color: #ef4444;">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                </div>
            </td>
        `;
            tbody.appendChild(tr);
        });

        // Attach event listeners for visibility toggles
        var toggles = document.querySelectorAll('.cat-visibility-toggle');
        for (var i = 0; i < toggles.length; i++) {
            toggles[i].onchange = async function (e) {
                var id = e.target.getAttribute('data-id');
                var visible = e.target.checked;
                var { error } = await supabase
                    .from('categories')
                    .update({ visible: visible })
                    .eq('id', id);
                if (error) {
                    console.error('Failed to update visibility', error);
                    e.target.checked = !visible;
                } else {
                    loadCategories();
                }
            };
        }

        // Attach event listeners for display order changes
        var orderInputs = document.querySelectorAll('.display-order-input');
        for (var j = 0; j < orderInputs.length; j++) {
            orderInputs[j].onchange = async function (e) {
                var id = e.target.getAttribute('data-id');
                var newOrder = parseInt(e.target.value, 10) || 0;
                var { error } = await supabase
                    .from('categories')
                    .update({ display_order: newOrder })
                    .eq('id', id);
                if (error) console.error('Failed to update display order', error);
            };
        }

        // Wire refresh button
        var refreshBtn = document.getElementById('refresh-categories');
        if (refreshBtn) refreshBtn.onclick = loadCategories;

        // Wire clear button
        var clearBtn = document.getElementById('clear-category-filters');
        if (clearBtn) {
            clearBtn.onclick = function () {
                var sInput = document.getElementById('category-search');
                var sSelect = document.getElementById('category-status-filter');
                if (sInput) sInput.value = '';
                if (sSelect) sSelect.value = '';
                loadCategories();
            };
        }

        // Search input with debounce
        var catSearch = document.getElementById('category-search');
        if (catSearch) {
            catSearch.oninput = function () {
                clearTimeout(window._catSearchTimeout);
                window._catSearchTimeout = setTimeout(loadCategories, 300);
            };
        }

        // Status filter
        var statusSelect = document.getElementById('category-status-filter');
        if (statusSelect) statusSelect.onchange = loadCategories;
    }

    async function loadFinalists() {
        // Fetch categories and finalists
        const [{ data: categories, error: catErr }, { data: finalists, error: finErr }] = await Promise.all([
            supabase.from('categories').select('*').order('display_order', { ascending: true }),
            supabase.from('nominations').select('*').eq('stage', 'finalist')
        ]);

        if (catErr) console.error('Failed to load categories', catErr);
        if (finErr) console.error('Failed to load finalists', finErr);

        const cats = categories || [];
        const finalistList = finalists || [];

        // Render category cards
        const container = document.getElementById('category-cards-container');
        if (container) {
            container.innerHTML = '';
            for (const cat of cats) {
                // Count total nominees in this category (global)
                let nomineeCount = 0;
                try {
                    const { count } = await supabase
                        .from('nominations')
                        .select('*', { count: 'exact', head: true })
                        .eq('category', cat.name);
                    nomineeCount = count || 0;
                } catch (e) { /* ignore */ }

                // Count finalists for this category
                const finalistCount = finalistList.filter(n => n.category === cat.name).length;
                const statusText = finalistCount > 0 ? 'Completed' : 'Not Started';
                const statusClass = finalistCount > 0 ? 'status-badge verified' : 'status-badge';

                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                <div class="card-header">
                    <h4>${cat.name}</h4>
                    <span class="${statusClass}">${statusText}</span>
                </div>
                <div class="card-stats">
                    <span><i class='bx bx-user'></i> ${nomineeCount} nominees</span>
                    <span><i class='bx bx-check-shield'></i> ${finalistCount} finalists</span>
                </div>
                <div class="card-actions">
                    <button class="view-btn begin-judgement" data-category="${cat.name}">Begin Judgement</button>
                </div>
            `;
                container.appendChild(card);
            }
        }

        // Render finalist table
        renderFinalistTable(finalistList);

        // inside loadFinalists, after renderFinalistTable(finalistList);
        const finalizeBtn = document.getElementById('finalize-notify-btn');
        if (finalizeBtn) {
            const allReady = await allCategoriesHaveFinalists();
            finalizeBtn.disabled = !allReady;
            finalizeBtn.title = allReady ? 'Lock finalists and send notifications' : 'Not all categories have finalists yet.';
        }

        // Refresh button
        document.getElementById('refresh-finalists')?.addEventListener('click', loadFinalists);
    }

    async function openWorkflowModal(categoryName) {
        // 1. Fetch all nominations for this category
        const { data: nominations, error } = await supabase
            .from('nominations')
            .select('*')
            .eq('category', categoryName);

        if (error || !nominations) {
            alert('Could not fetch nominations');
            return;
        }

        // 2. Group by normalized name, count nominations
        const groups = {};
        nominations.forEach(nom => {
            const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!groups[key]) {
                groups[key] = {
                    displayName: nom.nominee_name.trim(),
                    count: 0,
                    ids: [],
                    records: []
                };
            }
            groups[key].count++;
            groups[key].ids.push(nom.id);
            groups[key].records.push(nom);
        });

        const groupedList = Object.values(groups).sort((a, b) => b.count - a.count); // descending by count

        // Store for the modal steps
        const workflowData = {
            category: categoryName,
            groupedCandidates: groupedList,
            selectedCount: 5 // default
        };

        function showStep1() {
            const modal = document.getElementById('detailsModal');
            document.getElementById('modal-title').textContent = `Judgement: ${categoryName}`;
            document.getElementById('modal-subtitle').textContent = 'Step 1: Set finalist count';
            document.getElementById('modal-data').innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <p>How many finalists do you want to advance?</p>
                <input type="number" id="finalist-count-input" value="5" min="1" max="${groupedList.length}" 
                    style="width: 100px; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; text-align: center;">
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button class="btn-secondary close-modal">Cancel</button>
                    <button class="btn-primary" id="next-to-step2">Next</button>
                </div>
            </div>
        `;
            modal.style.display = 'flex';

            document.getElementById('next-to-step2').onclick = () => {
                const count = parseInt(document.getElementById('finalist-count-input').value, 10) || 5;
                workflowData.selectedCount = Math.min(count, groupedList.length);
                showStep2(workflowData);
            };
        }

        function showStep2(data) {
            const modal = document.getElementById('detailsModal');
            document.getElementById('modal-subtitle').textContent = 'Step 2: Review and adjust candidates';

            // Build the candidate list HTML
            let html = `<div style="max-height: 450px; overflow-y: auto;">`;
            html += `<p style="margin-bottom: 10px; color: var(--text-muted);">Top ${data.selectedCount} selected by nomination count. You can manually adjust.</p>`;
            html += `<table style="width: 100%; border-collapse: collapse;">`;
            html += `<thead><tr>
            <th></th>
            <th>Nominee</th>
            <th>Nominations</th>
            <th>Flagged</th>
            <th>Actions</th>
        </tr></thead><tbody>`;

            data.groupedCandidates.forEach((candidate, index) => {
                const checked = index < data.selectedCount ? 'checked' : '';
                const flagged = candidate.records.some(r => r.flagged);
                html += `<tr>
                <td style="padding: 8px;"><input type="checkbox" class="candidate-checkbox" data-index="${index}" ${checked}></td>
                <td style="padding: 8px; font-weight: 600;">${candidate.displayName}</td>
                <td style="padding: 8px;">${candidate.count}</td>
                <td style="padding: 8px;">${flagged ? '<i class="bx bxs-flag" style="color: #ef4444;"></i>' : '—'}</td>
                <td style="padding: 8px; display: flex; gap: 4px;">
                    <button class="view-btn flag-candidate-btn" data-name="${candidate.displayName}" data-ids="${candidate.ids.join(',')}">Flag</button>
                    <button class="view-btn merge-candidate-btn" data-name="${candidate.displayName}">Merge</button>
                    <button class="view-btn remove-candidate-btn" data-name="${candidate.displayName}" data-ids="${candidate.ids.join(',')}" style="color: #ef4444;">Remove</button>
                </td>
            </tr>`;
            });
            html += `</tbody></table></div>`;
            html += `<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button class="btn-secondary close-modal">Cancel</button>
            <button class="btn-primary" id="confirm-finalists">Confirm & Advance</button>
        </div>`;

            document.getElementById('modal-data').innerHTML = html;
            modal.style.display = 'flex';

            // Handle Confirm
            document.getElementById('confirm-finalists').onclick = async () => {
                const checkboxes = document.querySelectorAll('.candidate-checkbox:checked');
                const selectedNames = [];
                const selectedIds = [];
                checkboxes.forEach(cb => {
                    const idx = cb.getAttribute('data-index');
                    const candidate = data.groupedCandidates[idx];
                    selectedNames.push(candidate.displayName);
                    selectedIds.push(...candidate.ids);
                });

                if (selectedIds.length === 0) {
                    alert('Please select at least one finalist.');
                    return;
                }

                // Update stage to 'finalist' for selected, and keep others as 'nominated'
                try {
                    // First set all nominations in this category to 'nominated' (reset)
                    await supabase.from('nominations').update({ stage: 'nominated' }).eq('category', categoryName);
                    // Then set selected to 'finalist'
                    await supabase.from('nominations').update({ stage: 'finalist' }).in('id', selectedIds);
                    alert('Finalists advanced successfully!');
                    modal.style.display = 'none';
                    loadFinalists();
                } catch (err) {
                    console.error('Failed to update stages', err);
                    alert('Error updating finalists.');
                }
            };

            // Flag button handler (delegation inside modal)
            document.querySelectorAll('.flag-candidate-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const ids = btn.getAttribute('data-ids').split(',').map(Number);
                    const name = btn.getAttribute('data-name');
                    const flaggedStatus = !btn.classList.contains('flagged'); // toggle
                    await supabase.from('nominations').update({ flagged: flaggedStatus }).in('id', ids);
                    // Reload step2 to reflect changes
                    showStep2(data);
                };
            });

            // Merge button opens global merge modal (reuse existing)
            document.querySelectorAll('.merge-candidate-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    // Show merge suggestions; this will affect global data
                    showMergeSuggestions();
                    // After merge, we could refresh but easier to close and reopen workflow
                    // For simplicity, just call showMergeSuggestions and close current modal
                    document.getElementById('detailsModal').style.display = 'none';
                };
            });

            // Remove button (disqualify)
            document.querySelectorAll('.remove-candidate-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const ids = btn.getAttribute('data-ids').split(',').map(Number);
                    const name = btn.getAttribute('data-name');
                    if (!confirm(`Disqualify "${name}"? This will set stage to 'disqualified'.`)) return;
                    await supabase.from('nominations').update({ stage: 'disqualified' }).in('id', ids);
                    // Refresh step2
                    const updatedNominations = await supabase.from('nominations').select('*').eq('category', categoryName);
                    // Rebuild groups (quickly)
                    const newGroups = {};
                    (updatedNominations.data || []).forEach(nom => {
                        const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
                        if (!newGroups[key]) newGroups[key] = { displayName: nom.nominee_name.trim(), count: 0, ids: [], records: [] };
                        newGroups[key].count++;
                        newGroups[key].ids.push(nom.id);
                        newGroups[key].records.push(nom);
                    });
                    data.groupedCandidates = Object.values(newGroups).sort((a, b) => b.count - a.count);
                    showStep2(data);
                };
            });
        }

        showStep1();
    }

    function renderFinalistTable(finalists) {
        const tbody = document.getElementById('finalist-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (finalists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:15px; text-align:center; color:var(--text-muted);">No finalists yet.</td></tr>';
            return;
        }

        // Group by name for clean display
        const grouped = {};
        finalists.forEach(n => {
            const key = n.nominee_name.trim();
            if (!grouped[key]) grouped[key] = { name: key, categories: new Set(), votes: 0, flagged: false, ids: [] };
            grouped[key].categories.add(n.category);
            grouped[key].votes += n.votes || 0;
            if (n.flagged) grouped[key].flagged = true;
            grouped[key].ids.push(n.id);
        });

        Object.values(grouped).forEach(g => {
            const isFinalized = finalists.some(n => n.nominee_name.trim() === g.name && n.finalized_at);
            let actionsHtml = '';
            if (isFinalized) {
                actionsHtml = `<button class="view-btn view-nominee-finalist" data-ids="${g.ids.join(',')}" data-name="${g.name}">View</button>
                       <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">Locked</span>`;
            } else {
                actionsHtml = `<button class="view-btn view-nominee-finalist" data-ids="${g.ids.join(',')}" data-name="${g.name}">View</button>
                       <button class="view-btn remove-finalist-btn" data-ids="${g.ids.join(',')}" style="color: #ef4444;">Remove</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td style="padding: 12px; font-weight: 600;">${g.name}</td>
        <td style="padding: 12px;">${[...g.categories].join(', ')}</td>
        <td style="padding: 12px;">${g.votes}</td>
        <td style="padding: 12px;">${g.flagged ? '<i class="bx bxs-flag" style="color: #ef4444;"></i>' : '—'}</td>
        <td style="padding: 12px;">${actionsHtml}</td>
    `;
            tbody.appendChild(tr);
        });

const uniqueNames = new Set();
finalists.forEach(n => uniqueNames.add(n.nominee_name.trim()));
document.getElementById('finalist-count-badge').textContent = uniqueNames.size;
    }

function openFinalistProfileModal(name, ids) {
    const allRows = window.__ALL_NOMINATIONS__ || [];
    // Get all nominations matching these IDs (should be all rows for that grouped name)
    const records = allRows.filter(n => ids.includes(n.id));

    if (records.length === 0) {
        alert('No data found for this finalist.');
        return;
    }

    // Aggregate unique emails, phones, categories
    const emails = new Set();
    const phones = new Set();
    const categories = new Set();
    records.forEach(r => {
        if (r.nominee_email) emails.add(r.nominee_email);
        if (r.whatsapp_contact) phones.add(r.whatsapp_contact);
        if (r.category) categories.add(r.category);
    });

    // Aggregate achievements (reasons) – deduplicate and count occurrences
    const achievementMap = new Map(); // key: normalized reason, value: { text: original, count: N }
    records.forEach(r => {
        const raw = (r.reason || '').trim();
        if (raw === '') return;
        const key = raw.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
        if (achievementMap.has(key)) {
            achievementMap.get(key).count++;
        } else {
            achievementMap.set(key, { text: raw, count: 1 });
        }
    });
    const achievements = Array.from(achievementMap.values());

    const modal = document.getElementById('detailsModal');
    document.getElementById('modal-title').textContent = name;
    document.getElementById('modal-subtitle').textContent = 'Finalist Profile';

    // Use placeholder avatar for now (later you'll upload a picture)
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=100&background=0097D7&color=fff`;

    let html = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 16px;">
                <img src="${avatarUrl}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                <div>
                    <h3 style="margin: 0;">${name}</h3>
                    <p style="margin: 4px 0 0; color: var(--text-muted);">${[...categories].join(', ')}</p>
                </div>
            </div>

            <div>
                <h4 style="font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Contact Information</h4>
                <div style="background: var(--bg-slate); padding: 12px; border-radius: 8px;">
                    <p><strong>Email(s):</strong> ${[...emails].join(', ') || '—'}</p>
                    <p><strong>Phone(s):</strong> ${[...phones].join(', ') || '—'}</p>
                </div>
            </div>

            <div>
                <h4 style="font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Achievements & Write‑ups</h4>
                <div style="background: var(--bg-slate); padding: 12px; border-radius: 8px; max-height: 250px; overflow-y: auto;">
                    ${achievements.length === 0 ? '<p style="color:var(--text-muted);">No achievement descriptions provided.</p>' : ''}
                    ${achievements.map(a => `
                        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                            <p style="font-size: 13px; white-space: pre-wrap; margin: 0;">${a.text}</p>
                            ${a.count > 1 ? `<span style="font-size:11px; color:var(--text-muted);">(mentioned in ${a.count} nominations)</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn-secondary close-modal">Close</button>
                <button class="btn-primary" id="edit-finalist-profile-btn" data-name="${name}" data-ids="${ids.join(',')}">
                    <i class='bx bx-edit'></i> Edit Details
                </button>
            </div>
        </div>
    `;

    document.getElementById('modal-data').innerHTML = html;
    modal.style.display = 'flex';
}

function openEditFinalistModal(name, ids) {
    const allRows = window.__ALL_NOMINATIONS__ || [];
    const records = allRows.filter(n => ids.includes(n.id));

    if (records.length === 0) {
        alert('No data found for this finalist.');
        return;
    }

    // Gather current data
    const emails = new Set();
    const phones = new Set();
    records.forEach(r => {
        if (r.nominee_email) emails.add(r.nominee_email.trim());
        if (r.whatsapp_contact) phones.add(r.whatsapp_contact.trim());
    });

    // Build editable list HTML
    const buildList = (items, prefix) => {
        if (items.length === 0) return '<p style="color:var(--text-muted);">None</p>';
        return items.map(item => `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <input type="text" value="${item}" style="flex:1; padding:6px; border:1px solid var(--border-color); border-radius:4px;" data-prefix="${prefix}">
                <button class="view-btn remove-item-btn" data-prefix="${prefix}" data-value="${item}" style="color:#ef4444; font-size:12px;">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `).join('');
    };

    let html = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
                <label style="font-weight:600; display:block; margin-bottom:4px;">Full Name</label>
                <input type="text" id="edit-name" value="${name}" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:6px;">
            </div>

            <div>
                <label style="font-weight:600; display:block; margin-bottom:4px;">Emails</label>
                <div id="emails-container">
                    ${buildList([...emails], 'email')}
                </div>
                <button class="view-btn add-item-btn" data-prefix="email" style="margin-top:6px;">
                    <i class='bx bx-plus'></i> Add email
                </button>
            </div>

            <div>
                <label style="font-weight:600; display:block; margin-bottom:4px;">WhatsApp Numbers</label>
                <div id="phones-container">
                    ${buildList([...phones], 'phone')}
                </div>
                <button class="view-btn add-item-btn" data-prefix="phone" style="margin-top:6px;">
                    <i class='bx bx-plus'></i> Add phone
                </button>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
                <button class="btn-secondary close-modal">Cancel</button>
                <button class="btn-primary" id="save-finalist-details-btn" data-ids="${ids.join(',')}">
                    <i class='bx bx-save'></i> Save Changes
                </button>
            </div>
        </div>
    `;

    document.getElementById('modal-title').textContent = `Edit Details: ${name}`;
    document.getElementById('modal-subtitle').textContent = 'Update contact information';
    document.getElementById('modal-data').innerHTML = html;
    document.getElementById('detailsModal').style.display = 'flex';

    // Attach event listeners for add/remove buttons (inside modal)
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            btn.parentElement.remove();
        };
    });

    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const prefix = btn.getAttribute('data-prefix');
            const containerId = prefix === 'email' ? 'emails-container' : 'phones-container';
            const container = document.getElementById(containerId);
            const newInput = document.createElement('div');
            newInput.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:6px;';
            newInput.innerHTML = `
                <input type="text" placeholder="Add new ${prefix}" style="flex:1; padding:6px; border:1px solid var(--border-color); border-radius:4px;" data-prefix="${prefix}">
                <button class="view-btn remove-item-btn" style="color:#ef4444; font-size:12px;">
                    <i class='bx bx-x'></i>
                </button>
            `;
            container.appendChild(newInput);
            // Attach remove handler to the new button
            newInput.querySelector('.remove-item-btn').onclick = function() {
                newInput.remove();
            };
        };
    });
}


    async function allCategoriesHaveFinalists() {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('name');
        if (error || !categories) return false;

        for (const cat of categories) {
            const { count, error: countErr } = await supabase
                .from('nominations')
                .select('*', { count: 'exact', head: true })
                .eq('stage', 'finalist')
                .eq('category', cat.name);
            if (countErr || (count || 0) === 0) return false;
        }
        return true;
    }

    // fetch and display nominations list in nominations view
    // fetch and display nominations list in nominations view
    async function loadNominations() {
        window.__mergeLogs = [];   // clear previous merge logs
        await populateCategoryDropdown();
        // 1. Fetch all nominations (limit high to include everything)
        const { data: allNoms, error } = await supabase
            .from('nominations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

        if (error) {
            console.error('Error loading nominations', error);
            return;
        }

        // Store for export (full list)
        window.__ALL_NOMINATIONS__ = allNoms || [];
        // Build ID map for fast lookup when clicking "Details"
        window.__NOMINATIONS_MAP__ = {};
        (allNoms || []).forEach(nom => { window.__NOMINATIONS_MAP__[nom.id] = nom; });

        // 2. Get filter values
        const nameSearch = (document.getElementById('name-search')?.value || '').trim().toLowerCase();
        const categoryVal = document.getElementById('category-filter')?.value || 'all';
        const statusVal = document.getElementById('status-filter')?.value || 'all';

        // 3. Filter individual rows (so group counts reflect only matching entries)
        let filteredRows = allNoms || [];
        if (nameSearch) {
            filteredRows = filteredRows.filter(nom =>
                (nom.nominee_name || '').toLowerCase().includes(nameSearch)
            );
        }
        if (categoryVal !== 'all') {
            filteredRows = filteredRows.filter(nom => nom.category === categoryVal);
        }
        if (statusVal !== 'all') {
            filteredRows = filteredRows.filter(nom => nom.status === statusVal);
        }

        // 4. Group by normalized nominee name
        const groups = {};
        filteredRows.forEach(nom => {
            // Normalize: trim, lowercase, collapse multiple spaces
            const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!groups[key]) {
                groups[key] = {
                    displayName: nom.nominee_name.trim(), // keep original casing from first occurrence
                    count: 0,
                    lastDate: nom.created_at,
                    records: []
                };
            }
            groups[key].count++;
            groups[key].records.push(nom);
            // Update last submission date if newer
            if (new Date(nom.created_at) > new Date(groups[key].lastDate)) {
                groups[key].lastDate = nom.created_at;
            }
        });

        // 5. Render grouped table
        const tbody = document.getElementById('nominees-grouped-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const groupArray = Object.values(groups);
        if (groupArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; color:var(--text-muted); text-align:center;">No nominees match your filters.</td></tr>';
            return;
        }

        // Sort groups alphabetically (or by count, up to you)
        groupArray.sort((a, b) => a.displayName.localeCompare(b.displayName));

        groupArray.forEach(group => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">
                ${group.displayName}
            </td>
            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                <span class="status-badge" style="background: var(--jci-blue); color: white;">${group.count}</span>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">
                ${new Date(group.lastDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </td>
            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                <button class="view-btn view-group-trigger" data-name="${group.displayName}">View Submissions</button>
            </td>
        `;
            tbody.appendChild(tr);
        });

        // 6. Export button – exports all raw rows (not grouped)
        const exportBtn = document.getElementById('export-nominations-btn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                const all = window.__ALL_NOMINATIONS__ || [];
                if (!all.length) return alert('No data to export');
                exportCSV(all);
            };
        }
    }

    async function populateCategoryDropdown() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    // Clear existing options (keep the "All Categories" one)
    select.innerHTML = '<option value="all">All Categories</option>';

    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('name')
            .order('display_order', { ascending: true });

        if (!error && categories) {
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = cat.name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Could not load categories for filter', e);
    }
}

    async function finalizeAndNotify() {
        if (!confirm('Are you sure? This will LOCK all current finalists and send emails to their email addresses. This cannot be undone.')) return;

        const finalizeBtn = document.getElementById('finalize-notify-btn');
        finalizeBtn.disabled = true;
        finalizeBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Finalizing...';

        try {
            // 1. Set finalized_at for all current finalists
            const { data: finalists, error: fetchErr } = await supabase
                .from('nominations')
                .select('*')
                .eq('stage', 'finalist');

            if (fetchErr || !finalists || finalists.length === 0) {
                alert('No finalists to finalize.');
                finalizeBtn.disabled = false;
                finalizeBtn.innerHTML = '<i class="bx bx-lock-alt"></i> Finalize & Notify';
                return;
            }

            const { error: updateErr } = await supabase
                .from('nominations')
                .update({ finalized_at: new Date().toISOString() })
                .eq('stage', 'finalist');

            if (updateErr) {
                alert('Failed to lock finalists: ' + updateErr.message);
                finalizeBtn.disabled = false;
                finalizeBtn.innerHTML = '<i class="bx bx-lock-alt"></i> Finalize & Notify';
                return;
            }

            // 2. Collect unique nominee names and all emails per name
            const emailMap = new Map(); // key = displayName, value = Set of emails
            finalists.forEach(n => {
                const key = n.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
                const display = n.nominee_name.trim();
                if (!emailMap.has(display)) {
                    emailMap.set(display, { emails: new Set(), name: display });
                }
                // Add all emails from this nomination (and possibly nominee_email)
                if (n.nominee_email) emailMap.get(display).emails.add(n.nominee_email);
                // If you have multiple emails in other fields, add them here
            });

            const emails = [];
            const names = [];
            emailMap.forEach((value, key) => {
                value.emails.forEach(email => {
                    emails.push(email);
                    names.push(value.name);
                });
            });

            // 3. Send emails via Edge Function
            const { data: emailResult, error: emailErr } = await supabase.functions.invoke('send-finalist-emails', {
                body: { emails, names }
            });

            if (emailErr) {
                console.error('Email sending failed', emailErr);
                alert('Finalists locked, but email sending failed. Check console.');
            } else {
                alert('Finalists locked and emails sent successfully!');
            }

            // 4. Show WhatsApp panel (admin can decide to send later)
            showWhatsAppPanel(finalists);

        } catch (err) {
            console.error('Finalization error', err);
            alert('An unexpected error occurred.');
        } finally {
            finalizeBtn.disabled = true; // remain disabled because it's now locked
            finalizeBtn.innerHTML = '<i class="bx bx-check"></i> Finalized';
            loadFinalists(); // refresh UI
        }
    }


    function showWhatsAppPanel(finalists) {
        const panel = document.getElementById('whatsapp-panel');
        if (!panel) return;
        panel.style.display = 'block';

        // Group finalists by name, collect all phone numbers
        const grouped = {};
        finalists.forEach(n => {
            const key = n.nominee_name.trim();
            if (!grouped[key]) {
                grouped[key] = { name: key, phones: new Set() };
            }
            // Collect all non-empty whatsapp_contact fields
            if (n.whatsapp_contact && n.whatsapp_contact.trim()) {
                grouped[key].phones.add(n.whatsapp_contact.trim());
            }
        });

        const container = document.getElementById('whatsapp-list-container');
        if (!container) return;

        container.innerHTML = '';
        if (Object.keys(grouped).length === 0) {
            container.innerHTML = '<p>No finalists to notify via WhatsApp.</p>';
            return;
        }

        for (const key in grouped) {
            const { name, phones } = grouped[key];
            const phoneArray = [...phones];
            const hasMultiple = phoneArray.length > 1;

            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);';

            let phoneDisplay = phoneArray.length > 0 ? phoneArray.join(', ') : 'No phone numbers';
            item.innerHTML = `
            <div>
                <strong>${name}</strong><br/>
                <small style="color: var(--text-muted);">${phoneDisplay}</small>
            </div>
            <div>
                <button class="view-btn send-whatsapp-btn" data-name="${name}" data-phones='${JSON.stringify(phoneArray)}'>
                    <i class='bx bxl-whatsapp'></i> Send WhatsApp
                </button>
            </div>
        `;
            container.appendChild(item);
        }

        // Event delegation for send buttons (handled in the global click listener)
    }



    function handleWhatsAppSend(name, phones) {
        if (!phones || phones.length === 0) {
            alert('No WhatsApp number available for this nominee.');
            return;
        }

        const template = document.getElementById('whatsapp-message-template').value;
        const message = template.replace('{name}', name);

        if (phones.length === 1) {
            // Directly open link
            const url = `https://wa.me/${phones[0].replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            return;
        }

        // Multiple numbers: show a mini popup to let admin choose
        const modal = document.getElementById('detailsModal');
        document.getElementById('modal-title').textContent = `Send WhatsApp to ${name}`;
        document.getElementById('modal-subtitle').textContent = 'Select which number(s) to use:';
        let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
        phones.forEach(phone => {
            const clean = phone.replace(/[^0-9]/g, '');
            html += `
            <button class="view-btn send-single-wa" data-phone="${clean}" data-name="${name}" style="justify-content: flex-start; padding: 8px 12px;">
                <i class='bx bxl-whatsapp'></i> ${phone}
            </button>
        `;
        });
        html += '</div>';
        html += '<div style="margin-top: 16px; text-align: right;"><button class="btn-secondary close-modal">Cancel</button></div>';
        document.getElementById('modal-data').innerHTML = html;
        modal.style.display = 'flex';
    }



async function showMergeSuggestions() {
    const allRows = window.__ALL_NOMINATIONS__ || [];
    if (!allRows.length) {
        alert('No data loaded.');
        return;
    }

    // --- 1. Get unique normalized names ---
    const nameMap = new Map();
    allRows.forEach(nom => {
        const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!nameMap.has(key)) {
            nameMap.set(key, {
                display: nom.nominee_name.trim(),
                count: 0,
                ids: []
            });
        }
        const entry = nameMap.get(key);
        entry.count++;
        entry.ids.push(nom.id);
    });

    const uniqueNames = Array.from(nameMap.values());

    // --- 2. Build union-find for all similar pairs ---
    // Map each name display to its index
    const indexMap = new Map();
    uniqueNames.forEach((item, idx) => indexMap.set(item.display, idx));

    // Union-Find helpers
    const parent = Array.from({ length: uniqueNames.length }, (_, i) => i);
    function find(x) {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
    function union(a, b) {
        const ra = find(a), rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    }

    // Fuse.js to find all similar pairs
    const fuse = new Fuse(uniqueNames, {
        keys: ['display'],
        threshold: 0.5,          // slightly looser for better recall
        includeScore: true
    });

    // For each name, find all similar names and union them
    for (let i = 0; i < uniqueNames.length; i++) {
        const nameObj = uniqueNames[i];
        const results = fuse.search(nameObj.display);
        results.forEach(result => {
            const other = result.item;
            if (other.display === nameObj.display) return;
            const j = indexMap.get(other.display);
            if (j !== undefined && result.score <= 0.5) {
                union(i, j);
            }
        });
    }

    // --- 3. Build groups from connected components ---
    const groupsMap = new Map();  // root -> { names: [], ids: [], totalCount: 0 }
    for (let i = 0; i < uniqueNames.length; i++) {
        const root = find(i);
        if (!groupsMap.has(root)) {
            groupsMap.set(root, { names: [], ids: [], totalCount: 0 });
        }
        const group = groupsMap.get(root);
        const item = uniqueNames[i];
        group.names.push(item);
        group.ids.push(...item.ids);
        group.totalCount += item.count;
    }

    // Convert to array, keep only groups with at least 2 different names
    let groups = [];
    groupsMap.forEach((group, root) => {
        if (group.names.length > 1) {
            // Determine primary: the name with highest count
            group.names.sort((a, b) => b.count - a.count);
            groups.push({
                primary: group.names[0],
                variants: group.names.slice(1),
                totalCount: group.totalCount,
                allIds: group.ids
            });
        }
    });

    // Store for detail view
    window.__mergeGroups = groups;

    // --- 4. Build main list HTML ---
    let html = '<div style="max-height: 400px; overflow-y: auto;">';

    html += `
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
        <button class="view-btn refresh-groups-btn" style="font-size:12px;">
            <i class='bx bx-refresh'></i> Refresh Groups
        </button>
        <button class="view-btn manual-merge-btn" style="font-size:12px; margin-left:8px;">
    <i class='bx bx-git-merge'></i> Manual Merge
</button>
    </div>`;

    if (groups.length === 0) {
        html += '<p>No potential duplicates found.</p>';
    } else {
        groups.forEach((group, index) => {
            const variantCount = group.variants.length;
            const variantPreview = group.variants.map(v => `${v.display} (${v.count})`).join(', ');
            html += `
            <div style="border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${group.primary.display}</strong> (${group.primary.count} entries)
                        <br/><small style="color:var(--text-muted);">${variantCount} similar name(s): ${variantPreview}</small>
                    </div>
                    <button class="view-btn open-group-btn" data-group="${index}">
                        <i class='bx bx-expand-vertical'></i> Open
                    </button>
                </div>
            </div>`;
        });
    }
    html += '</div>';

    // --- 5. Render logs (unchanged) ---
    const logs = window.__mergeLogs || [];
    html += '<div id="merge-logs" style="margin-top:16px; border-top:1px solid var(--border-color); padding-top:12px; max-height:150px; overflow-y:auto; background:#f9fafb; border-radius:6px; padding:8px;">';
    if (logs.length === 0) {
        html += '<p style="color:var(--text-muted); font-size:12px;">No merge actions yet.</p>';
    } else {
        logs.forEach(log => {
            const icon = log.success ? '<i class="bx bx-check-circle" style="color:#22c55e;"></i>' : '<i class="bx bx-error-circle" style="color:#ef4444;"></i>';
            html += `<div style="font-size:12px; margin-bottom:4px;">${icon} ${log.message}</div>`;
        });
    }
    html += '</div>';

    // Close button
    html += '<div style="margin-top:20px; text-align:right;"><button class="btn-secondary close-modal">Close</button></div>';

    // --- 6. Set modal content ---
    const modal = document.getElementById('detailsModal');
    document.getElementById('modal-title').textContent = 'Merge Suggestions';
    document.getElementById('modal-subtitle').textContent = 'Groups of similar names';
    document.getElementById('modal-data').innerHTML = html;
    modal.style.display = 'flex';
}

function openManualMergeModal() {
    const allRows = window.__ALL_NOMINATIONS__ || [];
    if (!allRows.length) {
        alert('No data loaded.');
        return;
    }

    // Get unique names (display version)
    const uniqueNames = [...new Set(allRows.map(n => n.nominee_name.trim()))].sort();

    let html = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <p>Select the name to <strong>replace</strong> (source) and the correct name (target).</p>

            <div>
                <label style="font-weight:600; display:block; margin-bottom:4px;">Source name (to be replaced)</label>
                <input type="text" id="source-name-input" list="source-list" placeholder="Type or select a name" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:6px;">
                <datalist id="source-list">
                    ${uniqueNames.map(n => `<option value="${n}">`).join('')}
                </datalist>
            </div>

            <div>
                <label style="font-weight:600; display:block; margin-bottom:4px;">Target name (correct spelling)</label>
                <input type="text" id="target-name-input" list="target-list" placeholder="Type or select a name" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:6px;">
                <datalist id="target-list">
                    ${uniqueNames.map(n => `<option value="${n}">`).join('')}
                </datalist>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
                <button class="btn-secondary back-to-groups-btn">Cancel</button>
                <button class="btn-primary" id="execute-manual-merge-btn">
                    <i class='bx bx-git-merge'></i> Merge
                </button>
            </div>
        </div>
    `;

    document.getElementById('modal-title').textContent = 'Manual Merge';
    document.getElementById('modal-subtitle').textContent = 'Merge one name into another';
    document.getElementById('modal-data').innerHTML = html;
    document.getElementById('detailsModal').style.display = 'flex';
}

function showMergeGroupDetail(groupIndex) {
    const groups = window.__mergeGroups || [];
    const group = groups[groupIndex];
    if (!group) return;

    // Ensure we work on the current group data (variants may have been removed)
    const currentGroup = group;
    const allCandidates = [currentGroup.primary, ...currentGroup.variants];

    let html = `
        <div style="margin-bottom:16px;">
            <button class="view-btn back-to-groups-btn">
                <i class='bx bx-arrow-back'></i> Back to list
            </button>
        </div>
        <p style="margin-bottom:12px; font-weight:600;">Select the correct spelling for this group:</p>
        <div style="max-height:350px; overflow-y:auto; margin-bottom:16px;">
    `;

    allCandidates.forEach((candidate, idx) => {
        const isPrimary = idx === 0;
        const checked = isPrimary ? 'checked' : '';
        html += `
            <div style="display:flex; align-items:center; padding:8px; border:1px solid var(--border-color); border-radius:6px; margin-bottom:6px; ${isPrimary ? 'background: #f0f9ff;' : ''}">
                <label style="display:flex; align-items:center; flex:1; cursor:pointer; margin:0;">
                    <input type="radio" name="selected-name" value="${candidate.display}" data-ids="${candidate.ids.join(',')}" ${checked} style="margin-right:8px;">
                    <div>
                        <strong>${candidate.display}</strong>
                        <span style="font-size:12px; color:var(--text-muted);"> (${candidate.count} entries)</span>
                        ${isPrimary ? '<span style="font-size:10px; background:var(--jci-blue); color:#fff; padding:1px 6px; border-radius:4px; margin-left:6px;">main</span>' : ''}
                    </div>
                </label>
                ${!isPrimary ? `
                <button class="view-btn remove-variant-btn" data-group="${groupIndex}" data-name="${candidate.display}" style="color:#ef4444; font-size:11px; padding:2px 8px; margin-left:8px;" title="Remove this variant from the group">
                    <i class='bx bx-x'></i> Remove
                </button>` : ''}
            </div>
        `;
    });

    html += `
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-secondary close-modal">Cancel</button>
            ${currentGroup.variants.length > 0 ? `
            <button class="btn-primary merge-group-btn" data-group="${groupIndex}">
                <i class='bx bx-git-merge'></i> Merge all into selected name
            </button>` : '<span style="color:var(--text-muted);">No variants left to merge.</span>'}
        </div>
    `;

    document.getElementById('modal-subtitle').textContent = `Editing: ${currentGroup.primary.display}`;
    document.getElementById('modal-data').innerHTML = html;
}

    // Helper to generate CSV (placed outside, e.g., after loadNominations)
    function exportCSV(items) {
        const headers = ['id', 'nominee_name', 'nominee_email', 'nominator_email', 'category', 'faculty', 'department', 'level', 'status', 'whatsapp_contact', 'reason', 'created_at'];
        const csvRows = [headers.join(',')];
        items.forEach(it => {
            const row = headers.map(h => '"' + String(it[h] || '').replace(/"/g, '""') + '"').join(',');
            csvRows.push(row);
        });
        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nominations_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Event Delegation
    document.addEventListener('click', async (e) => {
        // ----- Apply filters -----
        if (e.target.id === 'apply-filters-btn') {
            await loadNominations();
            return;
        }

        // ----- Open single nomination details (profile card) -----
        if (e.target.classList.contains('review-trigger')) {
            const id = e.target.getAttribute('data-id');
            const nom = (window.__NOMINATIONS_MAP__ || {})[id];
            if (nom) {
                openNominationModal(nom);
                return;
            }
        }

        // ---- Edit Finalist Details ----
if (e.target.id === 'edit-finalist-profile-btn') {
    const name = e.target.getAttribute('data-name');
    const ids = e.target.getAttribute('data-ids').split(',').map(Number);
    openEditFinalistModal(name, ids);
    return;
}

// ---- Save Finalist Details ----
if (e.target.id === 'save-finalist-details-btn') {
    const btn = e.target;
    const ids = btn.getAttribute('data-ids').split(',').map(Number);
    const newName = document.getElementById('edit-name').value.trim();

    // Collect emails
    const emailInputs = document.querySelectorAll('#emails-container input[data-prefix="email"]');
    const emails = [];
    emailInputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) emails.push(val);
    });

    // Collect phones
    const phoneInputs = document.querySelectorAll('#phones-container input[data-prefix="phone"]');
    const phones = [];
    phoneInputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) phones.push(val);
    });

    if (!newName) {
        alert('Name cannot be empty.');
        return;
    }

    if (!confirm('Save changes? This will update all nomination records for this person.')) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';

    try {
        // Update name for all rows
        const { error: nameErr } = await supabase
            .from('nominations')
            .update({ nominee_name: newName })
            .in('id', ids);
        if (nameErr) throw nameErr;

        // Update emails – set the first email as the primary, and optionally save others
        // For simplicity, we'll set the first email to all rows, and append other emails only if we have a field for them.
        // Since your nominations table likely has one nominee_email, we'll set it to the first email (or empty if none).
        const primaryEmail = emails.length > 0 ? emails[0] : null;
        const primaryPhone = phones.length > 0 ? phones[0] : null;

        // Update all rows with the chosen primary email and phone
        const updatePayload = {};
        if (primaryEmail !== null) updatePayload.nominee_email = primaryEmail;
        if (primaryPhone !== null) updatePayload.whatsapp_contact = primaryPhone;

        if (Object.keys(updatePayload).length > 0) {
            const { error: contactErr } = await supabase
                .from('nominations')
                .update(updatePayload)
                .in('id', ids);
            if (contactErr) throw contactErr;
        }

        // If there are additional emails/phones, we could store them in a new field,
        // but for now we only update the primary fields.

        if (typeof showToast === 'function') showToast('Details updated successfully!');
        document.getElementById('detailsModal').style.display = 'none';

        // Refresh the finalist table
        if (typeof loadFinalists === 'function') await loadFinalists();
        if (typeof loadNominations === 'function') await loadNominations().catch(e => console.error(e));

    } catch (err) {
        console.error(err);
        alert('Failed to update details: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bx bx-save"></i> Save Changes';
    }
    return;
}

        // ----- Open grouped submissions list -----
        if (e.target.classList.contains('view-group-trigger')) {
            const displayName = e.target.getAttribute('data-name');
            const allRows = window.__ALL_NOMINATIONS__ || [];
            const matching = allRows.filter(nom =>
                nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ') === displayName.toLowerCase().replace(/\s+/g, ' ')
            );

            let rowsHtml = '';
            matching.forEach(nom => {
                rowsHtml += `
                <tr>
                    <td style="padding:8px;">${new Date(nom.created_at).toLocaleDateString()}</td>
                    <td style="padding:8px;">${nom.category || '—'}</td>
                    <td style="padding:8px;"><span class="status-badge ${nom.status || 'pending'}">${nom.status || 'Pending'}</span></td>
                    <td style="padding:8px;"><button class="view-btn review-trigger" data-id="${nom.id}">Details</button></td>
                </tr>
            `;
            });

            document.getElementById('modal-title').textContent = `Submissions for ${displayName}`;
            document.getElementById('modal-subtitle').textContent = `${matching.length} nomination(s)`;
            document.getElementById('modal-data').innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr>
                        <th>Date</th><th>Category</th><th>Status</th><th></th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <div style="margin-top:20px; text-align:right;">
                <button class="btn-secondary close-modal">Close</button>
            </div>
        `;
            document.getElementById('detailsModal').style.display = 'flex';
            return;
        }

        // ----- Close modals (both the main and grouped) -----
        if (e.target.classList.contains('close-modal') || e.target.closest('.close-modal')) {
            document.getElementById('detailsModal').style.display = 'none';
            return;
        }

        // ----- Keep your existing voting, categories, etc. handlers below -----
        // (do not remove them – just make sure they are after the above)
        // ... the rest of your event handlers (voting, categories, etc.) ...
        if (e.target.classList.contains('begin-judgement')) {
            const category = e.target.getAttribute('data-category');
            openWorkflowModal(category);
            return;
        }

        if (e.target.classList.contains('remove-finalist-btn')) {
            const ids = e.target.getAttribute('data-ids').split(',').map(Number);
            if (!confirm('Remove these finalists? Stage will revert to nominated.')) return;
            await supabase.from('nominations').update({ stage: 'nominated' }).in('id', ids);
            loadFinalists();
            return;
        }

        // ---- View Finalist Profile ----
if (e.target.classList.contains('view-nominee-finalist') || e.target.closest('.view-nominee-finalist')) {
    const btn = e.target.closest('.view-nominee-finalist');
    const ids = btn.getAttribute('data-ids').split(',').map(Number);
    const name = btn.getAttribute('data-name');
    openFinalistProfileModal(name, ids);
    return;
}

        // Show merge suggestions
        if (e.target.id === 'show-merge-suggestions-btn') {
            showMergeSuggestions();
            return;
        }

        // ---- Open Manual Merge modal ----
if (e.target.classList.contains('manual-merge-btn') || e.target.closest('.manual-merge-btn')) {
    openManualMergeModal();
    return;
}

// ---- Execute manual merge ----
if (e.target.id === 'execute-manual-merge-btn') {
    const sourceInput = document.getElementById('source-name-input');
    const targetInput = document.getElementById('target-name-input');
    if (!sourceInput || !targetInput) return;

    const source = sourceInput.value.trim();
    const target = targetInput.value.trim();

    if (!source || !target) {
        alert('Please fill in both names.');
        return;
    }
    if (source === target) {
        alert('Source and target are the same.');
        return;
    }

    if (!confirm(`Merge ALL entries from "${source}" into "${target}"? This cannot be undone.`)) return;

    const btn = document.getElementById('execute-manual-merge-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Merging...';

    try {
        const { error } = await supabase
            .from('nominations')
            .update({ nominee_name: target })
            .eq('nominee_name', source);

        if (error) throw error;

        window.__mergeLogs.push({
            success: true,
            message: `Manual merge: "${source}" → "${target}"`
        });
        if (typeof showToast === 'function') showToast(`Merged "${source}" → "${target}"`);

    } catch (err) {
        console.error(err);
        window.__mergeLogs.push({
            success: false,
            message: `Manual merge failed: ${err.message}`
        });
        if (typeof showToast === 'function') showToast(`Merge failed`, false);
    }

    await loadNominations().catch(e => console.error(e));
    showMergeSuggestions();  // return to updated list
    return;
}


        // ---- Remove a variant from a merge group ----
if (e.target.classList.contains('remove-variant-btn') || e.target.closest('.remove-variant-btn')) {
    const btn = e.target.closest('.remove-variant-btn');
    const groupIndex = parseInt(btn.getAttribute('data-group'), 10);
    const nameToRemove = btn.getAttribute('data-name');
    const groups = window.__mergeGroups || [];
    const group = groups[groupIndex];
    if (!group) return;

    // Remove the variant from the group
    group.variants = group.variants.filter(v => v.display !== nameToRemove);

    // If no variants left, optionally remove the whole group from the list
    if (group.variants.length === 0) {
        // You could remove the group entirely:
        // groups.splice(groupIndex, 1);
        // But we'll just let the detail view show "No variants left" for now.
    }

    // Refresh the detail view
    showMergeGroupDetail(groupIndex);
    return;
}

if (e.target.classList.contains('refresh-groups-btn') || e.target.closest('.refresh-groups-btn')) {
    // Re-run the merge suggestions algorithm with fresh data
    await loadNominations().catch(e => console.error(e));  // ensure latest data
    await showMergeSuggestions();
    return;
}

        // ---- FINALIZE & NOTIFY BUTTON ----
        if (e.target.id === 'finalize-notify-btn') {
            finalizeAndNotify();
            return;
        }

        // ---- CLOSE WHATSAPP PANEL ----
        if (e.target.id === 'close-whatsapp-panel') {
            document.getElementById('whatsapp-panel').style.display = 'none';
            return;
        }

        // ---- SEND WHATSAPP BUTTON (main list) ----
        if (e.target.classList.contains('send-whatsapp-btn') || e.target.closest('.send-whatsapp-btn')) {
            const btn = e.target.closest('.send-whatsapp-btn');
            const name = btn.getAttribute('data-name');
            const phones = JSON.parse(btn.getAttribute('data-phones'));
            handleWhatsAppSend(name, phones);
            return;
        }

        // ---- SEND TO SINGLE WHATSAPP NUMBER (popup) ----
        if (e.target.classList.contains('send-single-wa') || e.target.closest('.send-single-wa')) {
            const btn = e.target.closest('.send-single-wa');
            const phone = btn.getAttribute('data-phone');
            const name = btn.getAttribute('data-name');
            const template = document.getElementById('whatsapp-message-template').value;
            const message = template.replace('{name}', name);
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            document.getElementById('detailsModal').style.display = 'none';
            return;
        }

    // ---- Open group detail ----
if (e.target.classList.contains('open-group-btn') || e.target.closest('.open-group-btn')) {
    const btn = e.target.closest('.open-group-btn');
    const groupIndex = btn.getAttribute('data-group');
    showMergeGroupDetail(groupIndex);
    return;
}

// ---- Back to groups list ----
if (e.target.classList.contains('back-to-groups-btn') || e.target.closest('.back-to-groups-btn')) {
    showMergeSuggestions();
    return;
}

// ---- Merge group (from detail view) ----
if (e.target.classList.contains('merge-group-btn') || e.target.closest('.merge-group-btn')) {
    const btn = e.target.closest('.merge-group-btn');
    const groupIndex = btn.getAttribute('data-group');
    const groups = window.__mergeGroups || [];
    const group = groups[groupIndex];
    if (!group) return;

    // Get selected name and its IDs
    const selectedRadio = document.querySelector('input[name="selected-name"]:checked');
    if (!selectedRadio) {
        alert('Please select a name.');
        return;
    }
    const keepName = selectedRadio.value;
    const keepIds = selectedRadio.getAttribute('data-ids').split(',').map(Number);

    // Collect all other IDs from the group (variants + primary if not selected)
    const allOtherIds = [];
    const allCandidates = [group.primary, ...group.variants];
    allCandidates.forEach(c => {
        if (c.display !== keepName) {
            allOtherIds.push(...c.ids);
        }
    });

    if (allOtherIds.length === 0) {
        alert('Nothing to merge.');
        return;
    }

    if (!confirm(`Merge all entries into "${keepName}"? This will update ${allOtherIds.length} entries.`)) return;

    // Disable merge button
    document.querySelectorAll('.merge-group-btn').forEach(b => b.disabled = true);
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Merging...';

    try {
        const chunkSize = 50;
        for (let i = 0; i < allOtherIds.length; i += chunkSize) {
            const chunk = allOtherIds.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('nominations')
                .update({ nominee_name: keepName })
                .in('id', chunk);
            if (error) throw error;
        }

        window.__mergeLogs.push({
            success: true,
            message: `Merged ${allOtherIds.length} entries into "${keepName}"`
        });
        if (typeof showToast === 'function') showToast(`All merged into "${keepName}"`);

    } catch (err) {
        console.error(err);
        window.__mergeLogs.push({
            success: false,
            message: `Merge failed: ${err.message}`
        });
        if (typeof showToast === 'function') showToast(`Merge failed`, false);
    }

    // Refresh data and return to main list
    await loadNominations().catch(e => console.error(e));
    await showMergeSuggestions();
    return;
}
    
    });


    // --- MOBILE MENU LOGIC ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Add overlay to body if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    const overlay = document.querySelector('.sidebar-overlay');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    // Close menu when a navigation item is clicked
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    });


    // inside DOMContentLoaded, just before applySecurityRoles()
function showToast(message, success = true) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (success ? 'toast-success' : 'toast-error');
    toast.innerHTML = `<i class='bx ${success ? 'bx-check-circle' : 'bx-error-circle'}'></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

    applySecurityRoles();
});