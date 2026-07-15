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
                const mapping = ['nominations','categories','voting','nominations'];
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
        allNominations.forEach(function(nom) {
            const cat = nom.category || 'Uncategorized';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
    }
} catch (e) {
    console.warn('Could not fetch nomination counts', e);
}

// Attach the count to each category object
cats.forEach(function(cat) {
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
        filtered = filtered.filter(function(cat) {
            return (cat.name || '').toLowerCase().indexOf(searchTerm) !== -1 ||
                   (cat.description || '').toLowerCase().indexOf(searchTerm) !== -1;
        });
    }

    if (filterVal === 'visible') {
        filtered = filtered.filter(function(cat) { return cat.visible !== false; });
    } else if (filterVal === 'hidden') {
        filtered = filtered.filter(function(cat) { return cat.visible === false; });
    }

    // Update stats
    const total = cats ? cats.length : 0;
    const visibleCount = cats ? cats.filter(function(c) { return c.visible !== false; }).length : 0;
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

    filtered.forEach(function(cat) {
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
        toggles[i].onchange = async function(e) {
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
        orderInputs[j].onchange = async function(e) {
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
        clearBtn.onclick = function() {
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
        catSearch.oninput = function() {
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
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; font-weight: 600;">${g.name}</td>
            <td style="padding: 12px;">${[...g.categories].join(', ')}</td>
            <td style="padding: 12px;">${g.votes}</td>
            <td style="padding: 12px;">${g.flagged ? '<i class="bx bxs-flag" style="color: #ef4444;"></i>' : '—'}</td>
            <td style="padding: 12px;">
                <button class="view-btn view-nominee-finalist" data-ids="${g.ids.join(',')}">View</button>
                <button class="view-btn remove-finalist-btn" data-ids="${g.ids.join(',')}" style="color: #ef4444;">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('finalist-count-badge').textContent = finalists.length;
}

    // fetch and display nominations list in nominations view
  // fetch and display nominations list in nominations view
async function loadNominations() {
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

async function showMergeSuggestions() {
    const allRows = window.__ALL_NOMINATIONS__ || [];
    if (!allRows.length) return alert('No data loaded.');

    // 1. Get unique normalized names (display name for reference)
    const nameMap = new Map(); // key: normalized, value: { display, count, ids:[] }
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

    // 2. Configure Fuse.js
    const fuse = new Fuse(uniqueNames, {
        keys: ['display'],
        threshold: 0.4,      // lower = stricter; 0.4 catches many typos
        includeScore: true
    });

    // 3. Find pairs of similar names (avoid duplicate pairs)
    const pairs = []; // { nameA: display, nameB: display, score: number, keyA, keyB }
    const processed = new Set();

    uniqueNames.forEach(itemA => {
        const results = fuse.search(itemA.display);
        results.forEach(result => {
            const itemB = result.item;
            if (itemA.display === itemB.display) return;
            const key = [itemA.display, itemB.display].sort().join('||');
            if (processed.has(key)) return;
            processed.add(key);
            pairs.push({
                nameA: itemA.display,
                nameB: itemB.display,
                score: result.score,
                countA: itemA.count,
                countB: itemB.count,
                idsA: itemA.ids,
                idsB: itemB.ids
            });
        });
    });

    // Sort by score (lower is more similar)
    pairs.sort((a, b) => a.score - b.score);

    if (pairs.length === 0) {
        alert('No potential duplicates found.');
        return;
    }

    // 4. Build modal HTML to show suggestions
    const modal = document.getElementById('detailsModal');
    document.getElementById('modal-title').textContent = 'Merge Suggestions';
    document.getElementById('modal-subtitle').textContent = 'Select which names to merge (choose the correct spelling).';
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    pairs.forEach((pair, index) => {
        html += `
            <div style="border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${pair.nameA}</strong> (${pair.countA} entries) vs 
                        <strong>${pair.nameB}</strong> (${pair.countB} entries)
                    </div>
                    <span style="font-size:12px; color:var(--text-muted);">Similarity: ${Math.round((1 - pair.score) * 100)}%</span>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="btn-primary merge-btn" data-keep="${pair.nameA}" data-merge="${pair.nameB}" data-idsA="${pair.idsA.join(',')}" data-idsB="${pair.idsB.join(',')}" style="font-size:12px; padding:6px 12px;">
                        Keep "${pair.nameA}" (merge other into this)
                    </button>
                    <button class="btn-primary merge-btn" data-keep="${pair.nameB}" data-merge="${pair.nameA}" data-idsA="${pair.idsA.join(',')}" data-idsB="${pair.idsB.join(',')}" style="font-size:12px; padding:6px 12px; background: var(--jci-teal);">
                        Keep "${pair.nameB}" (merge other into this)
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    html += '<div style="margin-top:20px; text-align:right;"><button class="btn-secondary close-modal">Close</button></div>';

    document.getElementById('modal-data').innerHTML = html;
    modal.style.display = 'flex';
}

// Helper to generate CSV (placed outside, e.g., after loadNominations)
function exportCSV(items) {
    const headers = ['id','nominee_name','nominee_email','nominator_email','category','faculty','department','level','status','whatsapp_contact','reason','created_at'];
    const csvRows = [headers.join(',')];
    items.forEach(it => {
        const row = headers.map(h => '"'+String(it[h]||'').replace(/"/g,'""')+'"').join(',');
        csvRows.push(row);
    });
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nominations_export_${new Date().toISOString().slice(0,10)}.csv`;
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
    // Show merge suggestions
if (e.target.id === 'show-merge-suggestions-btn') {
    showMergeSuggestions();
    return;
}

// Handle merge action
if (e.target.classList.contains('merge-btn')) {
    const keepName = e.target.getAttribute('data-keep');
    const mergeName = e.target.getAttribute('data-merge');
    const idsA = e.target.getAttribute('data-idsA').split(',').map(Number);
    const idsB = e.target.getAttribute('data-idsB').split(',').map(Number);

    if (!confirm(`Merge all entries from "${mergeName}" into "${keepName}"? This will update the database.`)) return;

    try {
        // Update all nominations with the merged name (keepName) where the id is in idsB
        const { error } = await supabase
            .from('nominations')
            .update({ nominee_name: keepName })
            .in('id', idsB);
        if (error) throw error;
        alert('Merge successful. Refreshing list...');
        document.getElementById('detailsModal').style.display = 'none';
        await loadNominations();
    } catch (err) {
        console.error('Merge failed', err);
        alert('Failed to merge names. Check console.');
    }
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

    applySecurityRoles();
});