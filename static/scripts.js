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
        filePath: './views/overview.html',
        htmlContent: '',
    },
    nominations: {
        filePath: './views/nominations.html',
        htmlContent: '',
    },
    categories: {
        filePath: './views/categories.html',
        htmlContent: '',
    },
    finalists: {
        filePath: './views/finalists.html',
        htmlContent: '',
    },
    voting: {
        filePath: './views/voting.html',
        htmlContent: '',
    },
    results: {
        filePath: './views/results.html',
        htmlContent: '',
    },
    // Both dashboard links lead to the existing audit-trail screen.
    audit: {
        filePath: './views/audit-log.html',
        htmlContent: '',
    },
    logs: {
        filePath: './views/audit-log.html',
        htmlContent: '',
    },
    content: {
        filePath: './views/content.html',
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
function escapeHTML(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function openNominationModal(nomination = null) {
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modal-data');

    if (!nomination) {
        modalBody.innerHTML = '<div style="padding:20px">No nomination data available.</div>';
        modal.style.display = 'flex';
        return;
    }

    const nomineeName = escapeHTML(nomination.nominee_name || 'Unnamed nominee');
    const nomineeEmail = escapeHTML(nomination.nominee_email || '—');
    const category = escapeHTML(nomination.category || '—');
    const status = escapeHTML(nomination.status || 'Pending');
    const statusClass = /^[a-z0-9_-]+$/i.test(nomination.status || '') ? nomination.status : 'pending';
    const nominatorEmail = escapeHTML(nomination.nominator_email || '—');
    const faculty = escapeHTML(nomination.faculty || '');
    const department = escapeHTML(nomination.department || '');
    const reason = escapeHTML(nomination.reason || 'No write-up provided.');
    const whatsapp = escapeHTML(nomination.whatsapp_contact || '');

    // Set modal title dynamically
    document.getElementById('modal-title').textContent = nomination.nominee_name || 'Unnamed nominee';
    document.getElementById('modal-subtitle').textContent = nomination.category || 'Category not specified';

    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Profile header -->
            <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--jci-blue); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;">
                    ${nomineeName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: var(--jci-black);">${nomineeName}</h3>
                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">${nomineeEmail}</p>
                </div>
            </div>

            <!-- Detail grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Category</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">${category}</p>
                </div>
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Status</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">
                        <span class="status-badge ${statusClass}">${status}</span>
                    </p>
                </div>
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Nominator</span>
                    <p style="font-weight: 600; margin: 4px 0 0;">${nominatorEmail}</p>
                    <p style="font-size: 13px; color: var(--text-muted);">${faculty}${department ? ' — ' + department : ''}</p>
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
                    ${reason}
                </div>
            </div>

            <!-- Contact (if available) -->
            ${nomination.whatsapp_contact ? `
            <div>
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">WhatsApp Contact</span>
                <p style="font-weight: 600; margin: 4px 0 0;">${whatsapp}</p>
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
    // Require a real Supabase session before loading admin data.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        window.location.replace('index.html');
        return;
    }
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
        // Hard-stop all legacy bulk identity edits and merge actions before their handlers run.
        if (e.target.closest('#edit-finalist-profile-btn, #save-finalist-details-btn, .manual-merge-btn, #execute-manual-merge-btn, .merge-group-btn, .remove-variant-btn')) {
            e.preventDefault();
            alert('Merge and bulk nominee identity edits are disabled. Original nomination records must remain unchanged.');
            return;
        }
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
            if (viewKey === 'voting') await loadVoting();
            if (viewKey === 'nominations') await loadNominationControl();
            if (viewKey === 'results') await loadResults();   // ✅ now after viewKey is defined
        }
    });
});

    // Overview shortcuts and the "View Full Logs" link use the same
    // navigation path as the sidebar so every link loads its matching template.
    document.addEventListener('click', (e) => {
        const shortcut = e.target.closest('.dashboard-action, [data-view].view-btn');
        if (!shortcut) return;

        const viewKey = shortcut.getAttribute('data-view');
        const navItem = document.querySelector(`.nav-item[data-view="${viewKey}"]`);
        if (navItem) navItem.click();
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

    // Fetch every matching row in bounded pages so Supabase's default row cap
    // cannot silently truncate dashboard statistics.
    async function fetchAllRows(buildQuery, pageSize = 1000) {
        const rows = [];
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await buildQuery().range(from, from + pageSize - 1);
            if (error) throw error;
            const page = data || [];
            rows.push(...page);
            if (page.length < pageSize) break;
        }
        return rows;
    }

    // helper to load overview data
    async function loadOverview() {
        contentArea.innerHTML = await getViewMarkup('overview');
        applySecurityRoles();
        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        document.getElementById('refresh-dashboard')?.addEventListener('click', loadOverview);
        try {
            const [n,c,verified,pending,setting] = await Promise.all([
                supabase.from('nominations').select('id', {count:'exact',head:true}),
                supabase.from('categories').select('id', {count:'exact',head:true}),
                supabase.from('nominations').select('id', {count:'exact',head:true}).eq('status','verified'),
                supabase.from('nominations').select('id', {count:'exact',head:true}).eq('status','pending'),
                supabase.from('settings').select('key,value').eq('key','voting_open').maybeSingle()
            ]);
            const failed=[n,c,verified,pending,setting].find(result=>result.error); if(failed)throw failed.error;
            setText('stat-total-nominations',n.count??0); setText('stat-categories',c.count??0);
            // Count pending records by their actual status; do not infer them as total minus verified.
            setText('stat-verified',verified.count??0); setText('stat-pending',pending.count??0);
            const open=String(setting.data?.value).toLowerCase()==='true';
            setText('stat-voting-status',open?'Open':'Closed'); setText('portal-status',open?'Open':'Closed');
            setText('db-status','Connected');
        } catch(error) {
            console.error('Overview core data check failed',error);
            ['stat-total-nominations','stat-categories','stat-verified','stat-pending','stat-voting-status'].forEach(id=>setText(id,'Unavailable'));
            setText('db-status','Connection error'); setText('portal-status','Unavailable');
        }
        try {
            const {count,error}=await supabase.from('votes').select('id',{count:'exact',head:true});
            if(error)throw error;
            setText('stat-votes',count??0);
        } catch(error) {
            console.warn('Vote count is unavailable under current Supabase permissions',error);
            setText('stat-votes','Restricted');
        }
        setText('backup-time','Not available'); setText('last-sync','Not available');
        loadRecentActivityForOverview();
    }

    async function loadRecentActivityForOverview() {
        const tbody = document.getElementById('overview-logs-body');
        if (!tbody) return;

        try {
            const limit = 5;
            const [{ data: noms }, { data: vts }, { data: cats }] = await Promise.all([
                supabase.from('nominations').select('id, nominee_name, nominator_email, created_at, category').order('created_at', { ascending: false }).limit(limit),
                supabase.from('votes').select('id, nomination_id, voter_id, created_at').order('created_at', { ascending: false }).limit(limit),
                supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
            ]);

            const events = [];
            (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
            (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: 'Voter', status: 'Voted' }));
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
                supabase.from('votes').select('id, nomination_id, created_at').order('created_at', { ascending: false }).limit(limit),
                supabase.from('categories').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
            ]);

            const events = [];
            (noms || []).forEach(n => events.push({ time: n.created_at, activity: `New Nomination: ${n.nominee_name}`, user: 'Public Portal', status: 'Received' }));
            (vts || []).forEach(v => events.push({ time: v.created_at, activity: `Vote cast for nomination ${v.nomination_id}`, user: 'Voter', status: 'Voted' }));
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

        // Count every nomination, paging beyond the REST API's default row limit.
        const normalizeCategory = value => String(value || '').trim().toLocaleLowerCase();
        const officialCategories = new Map((cats || []).map(cat => [normalizeCategory(cat.name), cat.name]));
        const categoryCounts = {};
        const unmatchedCategoryCounts = {};
        let categoryCountsAvailable = true;
        try {
            const allNominations = await fetchAllRows(() =>
                supabase.from('nominations').select('category')
            );
            allNominations.forEach(nom => {
                const rawCategory = String(nom.category || '').trim();
                if (!rawCategory) {
                    unmatchedCategoryCounts['Uncategorized'] = (unmatchedCategoryCounts['Uncategorized'] || 0) + 1;
                    return;
                }
                const officialName = officialCategories.get(normalizeCategory(rawCategory));
                if (!officialName) {
                    unmatchedCategoryCounts[rawCategory] = (unmatchedCategoryCounts[rawCategory] || 0) + 1;
                    return;
                }
                categoryCounts[officialName] = (categoryCounts[officialName] || 0) + 1;
            });
            const note = document.getElementById('category-data-quality-note');
            if (note) {
                const unmatchedTotal = Object.values(unmatchedCategoryCounts).reduce((sum, count) => sum + count, 0);
                note.textContent = unmatchedTotal
                    ? `${unmatchedTotal} nomination(s) use category labels outside the official list: ${Object.entries(unmatchedCategoryCounts).map(([name, count]) => `${name} (${count})`).join(', ')}. These records have not been changed.`
                    : 'All nomination category labels match the official categories.';
                note.style.color = unmatchedTotal ? '#b45309' : 'var(--text-muted)';
            }
        } catch (e) {
            categoryCountsAvailable = false;
            console.error('Could not fetch complete nomination counts', e);
            const note = document.getElementById('category-data-quality-note');
            if (note) {
                note.textContent = 'Nomination category counts are unavailable. Refresh or check database access.';
                note.style.color = '#b91c1c';
            }
        }

        // Attach exact, complete counts to each official category.
        cats.forEach(function (cat) {
            cat._entries = categoryCountsAvailable ? (categoryCounts[cat.name] || 0) : null;
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
        document.getElementById('total-category-entries').textContent = categoryCountsAvailable
            ? cats.reduce((sum, cat) => sum + (cat._entries || 0), 0)
            : 'Unavailable';

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
        const [{ data: categories, error: catErr }, finalistResult, approvedResult] = await Promise.all([
            supabase.from('categories').select('*').order('display_order', { ascending: true }),
            fetchAllRows(() => supabase.from('nominations').select('*').eq('stage', 'finalist').order('id', { ascending: true }))
                .then(data => ({ data, error: null }))
                .catch(error => ({ data: null, error })),
            supabase.from('finalists').select('id', { count: 'exact', head: true })
        ]);

        if (catErr) console.error('Failed to load categories', catErr);
        if (finalistResult.error) console.error('Failed to load all finalist-stage nominations', finalistResult.error);

        const cats = categories || [];
        const finalistList = finalistResult.data || [];
        const finalistNote = document.getElementById('finalist-data-quality-note');
        if (finalistNote) {
            if (finalistResult.error || approvedResult.error) {
                finalistNote.textContent = 'Finalist counts are incomplete because one of the database queries failed. Please refresh or check database access.';
                finalistNote.style.color = '#b91c1c';
            } else {
                finalistNote.textContent = `Nomination records marked as finalist stage: ${finalistList.length.toLocaleString()}. Approved records in the finalists table: ${(approvedResult.count || 0).toLocaleString()}. These are different measures; a finalist-stage nomination is not automatically an approved finalist.`;
                finalistNote.style.color = '#b45309';
            }
        }

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

        // Render finalist-stage nominations; this is not proof of approved finalist records.
        if (finalistResult.error) {
            const finalistBody = document.getElementById('finalist-table-body');
            if (finalistBody) finalistBody.innerHTML = '<tr><td colspan="6" style="padding:15px;text-align:center;color:#b91c1c;">Could not load the complete finalist-stage list.</td></tr>';
        } else {
            renderFinalistTable(finalistList);
        }

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

async function loadResults() {
    const body = document.getElementById('results-table-body');
    if (!body) return;
    const put = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    body.innerHTML = '<tr><td colspan="7" style="padding:24px;text-align:center;">Loading verified voting results…</td></tr>';

    try {
        const [nominees, categories, summaryResult] = await Promise.all([
            fetchAllRows(() => supabase.from('nominations')
                .select('id, nominee_name, category, status, ready_for_voting')
                .eq('ready_for_voting', true)),
            fetchAllRows(() => supabase.from('categories').select('name')),
            supabase.rpc('get_admin_voting_summary')
        ]);
        if (summaryResult.error || !summaryResult.data) {
            throw new Error('Global vote totals are unavailable. The administrator-only voting summary must be deployed before rankings can be calculated.');
        }

        const summary = summaryResult.data;
        const countRows = Array.isArray(summary.nominee_counts) ? summary.nominee_counts : [];
        const counts = new Map();
        countRows.forEach(row => {
            counts.set(String(row.nomination_id), Number(row.vote_count || 0));
        });
        const rows = (nominees || []).map(record => {
            const name = record.nominee_name || 'Unnamed nominee';
            const category = record.category || 'Uncategorised';
            return {
                id: record.id,
                name,
                category,
                status: record.status || 'Ready for voting',
                votes: counts.get(String(record.id)) || 0
            };
        });

        const totalVotes = Number(summary.total_votes || 0);
        put('total-categories', new Set([...(categories || []).map(item => item.name), ...rows.map(item => item.category)]).size);
        put('total-finalists', rows.length);
        put('results-total-votes', totalVotes.toLocaleString());

        const categorySelect = document.getElementById('results-category-filter');
        const uniqueCategories = [...new Set(rows.map(row => row.category))].sort((a,b) => a.localeCompare(b));
        if (categorySelect) {
            const previous = categorySelect.value;
            categorySelect.innerHTML = '<option value="">All Categories</option>' +
                uniqueCategories.map(category => '<option value="' + escapeHTML(category) + '">' + escapeHTML(category) + '</option>').join('');
            categorySelect.value = uniqueCategories.includes(previous) ? previous : '';
        }

        const render = () => {
            const query = (document.getElementById('results-search')?.value || '').trim().toLowerCase();
            const category = categorySelect?.value || '';
            const position = document.getElementById('results-status-filter')?.value || '';
            const filtered = rows.filter(row =>
                row.name.toLowerCase().includes(query) &&
                (!category || row.category === category) &&
                (!position || position === 'Finalist' || row.status.toLowerCase() === position.toLowerCase())
            );

            const categoryTotals = new Map();
            rows.forEach(row => categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + row.votes));
            const ranked = [...filtered].sort((a,b) =>
                a.category.localeCompare(b.category) || b.votes-a.votes || a.name.localeCompare(b.name)
            );
            const leaders = new Map();
            ranked.forEach(row => {
                if (row.votes <= 0) return;
                const current = leaders.get(row.category);
                if (!current || row.votes > current[0].votes) leaders.set(row.category, [row]);
                else if (row.votes === current[0].votes) current.push(row);
            });

            body.innerHTML = '';
            if (!ranked.length) {
                body.innerHTML = '<tr><td colspan="7" style="padding:24px;text-align:center;">No nominees are currently marked ready for voting.</td></tr>';
            } else {
                ranked.forEach(row => {
                    const sameCategory = rows.filter(other => other.category === row.category);
                    const rank = sameCategory.filter(other => other.votes > row.votes).length + 1;
                    const denominator = categoryTotals.get(row.category) || 0;
                    const percentage = denominator ? (row.votes / denominator * 100).toFixed(1) : '0.0';
                    const tr = document.createElement('tr');
                    tr.innerHTML =
                        '<td>' + rank + '</td>' +
                        '<td>' + escapeHTML(row.name) + '</td>' +
                        '<td>' + escapeHTML(row.category) + '</td>' +
                        '<td>' + row.votes.toLocaleString() + '</td>' +
                        '<td>' + percentage + '%</td>' +
                        '<td>' + escapeHTML(row.status) + '</td><td>—</td>';
                    body.appendChild(tr);
                });
            }
            put('results-count', ranked.length + ' Results');
            const winnerGrid = document.getElementById('winner-grid');
            if (winnerGrid) {
                winnerGrid.innerHTML = leaders.size
                    ? [...leaders.entries()].map(([category, tiedLeaders]) =>
                        '<div class="card"><h4>' + escapeHTML(category) + '</h4>' +
                        (tiedLeaders.length > 1 ? '<strong>Joint vote leaders</strong>' : '<strong>Leading vote-getter</strong>') +
                        tiedLeaders.map(row => '<p>' + escapeHTML(row.name) + ' — ' + row.votes.toLocaleString() + ' votes</p>').join('') +
                        '<small style="color:var(--text-muted);">Uncertified voting position; not an award decision.</small></div>'
                    ).join('')
                    : 'No category has recorded votes yet. No winners are declared by this dashboard.';
            }
        };

        ['results-search','results-category-filter','results-status-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (!element || element.dataset.resultsBound === 'true') return;
            element.addEventListener(id === 'results-search' ? 'input' : 'change', render);
            element.dataset.resultsBound = 'true';
        });
        const refresh = document.getElementById('refresh-results');
        if (refresh) refresh.onclick = loadResults;
        const exportButton = document.getElementById('export-results');
        if (exportButton) {
            exportButton.disabled = false;
            exportButton.title = 'Download the currently filtered results with aggregate vote counts only.';
            exportButton.onclick = () => {
                const query = (document.getElementById('results-search')?.value || '').trim().toLowerCase();
                const selectedCategory = categorySelect?.value || '';
                const selectedPosition = document.getElementById('results-status-filter')?.value || '';
                const exportRows = rows.filter(row =>
                    row.name.toLowerCase().includes(query) &&
                    (!selectedCategory || row.category === selectedCategory) &&
                    (!selectedPosition || selectedPosition === 'Finalist' || row.status.toLowerCase() === selectedPosition.toLowerCase())
                );
                const totals = new Map();
                rows.forEach(row => totals.set(row.category, (totals.get(row.category) || 0) + row.votes));
                const csvData = [
                    ['Nominee','Category','Votes','Category Vote Share','Status'],
                    ...exportRows.map(row => [
                        row.name,
                        row.category,
                        row.votes,
                        (totals.get(row.category) ? (row.votes / totals.get(row.category) * 100).toFixed(1) : '0.0') + '%',
                        row.status
                    ])
                ];
                const csv = '\uFEFF' + csvData.map(line => line.map(value => '"' + String(value ?? '').replace(/"/g,'""') + '"').join(',')).join('\r\n');
                const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
                const link = document.createElement('a');
                link.href = url;
                link.download = 'toyp-voting-results-' + new Date().toISOString().slice(0,10) + '.csv';
                link.click();
                URL.revokeObjectURL(url);
            };
        }
        const publishButton = document.getElementById('publish-results');
        if (publishButton) {
            publishButton.disabled = true;
            publishButton.title = 'Publishing remains disabled pending formal result verification and approval.';
            publishButton.textContent = 'Publishing Disabled';
        }
        render();
    } catch (error) {
        console.warn('Results cannot yet be calculated:', error);
        body.innerHTML = '<tr><td colspan="7" style="padding:24px;text-align:center;">' +
            escapeHTML(error.message || 'Global voting data is unavailable. Secure administrator reporting is required.') +
            '</td></tr>';
        put('total-categories', '—');
        put('total-finalists', '—');
        put('results-total-votes', 'Restricted');
        put('results-count', 'Results unavailable');
        const winnerGrid = document.getElementById('winner-grid');
        if (winnerGrid) winnerGrid.textContent = 'Winner information is unavailable until secure administrator voting reports are enabled.';
        const exportButton = document.getElementById('export-results');
        if (exportButton) exportButton.disabled = true;
        const publishButton = document.getElementById('publish-results');
        if (publishButton) publishButton.disabled = true;
    }
}

async function loadNominationControl() {
    const status = document.getElementById('nomination-window-status');
    const openButton = document.getElementById('open-nominations-btn');
    const closeButton = document.getElementById('close-nominations-btn');
    if (!status || !openButton || !closeButton) return;

    const render = (isOpen) => {
        status.textContent = isOpen
            ? 'Nominations are OPEN. The public form is accepting submissions.'
            : 'Nominations are CLOSED. New public submissions are blocked.';
        status.style.color = isOpen ? '#15803d' : '#b91c1c';
        openButton.disabled = isOpen;
        closeButton.disabled = !isOpen;
    };

    status.textContent = 'Checking nomination status…';
    openButton.disabled = true;
    closeButton.disabled = true;

    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'nominations_open')
        .maybeSingle();

    if (error || !data) {
        console.error('Could not load nomination window setting:', error);
        status.textContent = 'Unable to verify nomination status. Controls are disabled.';
        return;
    }

    let isOpen = data.value === 'true';
    render(isOpen);

    const setWindow = async (nextOpen) => {
        const action = nextOpen ? 'OPEN' : 'CLOSE';
        const confirmed = window.confirm(
            nextOpen
                ? 'Open nominations now? The public will be able to submit new nominations.'
                : 'Close nominations now? New public submissions will be blocked immediately.'
        );
        if (!confirmed) return;

        openButton.disabled = true;
        closeButton.disabled = true;
        status.textContent = action === 'OPEN' ? 'Opening nominations…' : 'Closing nominations…';

        const { data: updated, error: updateError } = await supabase
            .from('settings')
            .update({ value: String(nextOpen) })
            .eq('key', 'nominations_open')
            .select('value')
            .maybeSingle();

        if (updateError || !updated) {
            console.error('Nomination window update failed:', updateError);
            status.textContent = 'Could not change the nomination window. Check administrator access.';
            openButton.disabled = false;
            closeButton.disabled = false;
            window.alert('The nomination setting was not changed. Confirm that you are signed in as an authorised administrator.');
            return;
        }

        isOpen = updated.value === 'true';
        render(isOpen);
        window.alert(isOpen ? 'Nominations are now open.' : 'Nominations are now closed.');
    };

    openButton.onclick = () => setWindow(true);
    closeButton.onclick = () => setWindow(false);
}

async function loadVoting() {
    const get = id => document.getElementById(id);
    const statusBadge = get('v-status');
    const banner = get('voting-banner');
    const bannerText = get('voting-banner-text');
    const openButton = get('open-voting-btn');
    const closeButton = get('close-voting-btn');
    const scheduleButton = get('save-voting-schedule');
    const startTimeInput = get('start-time-input');
    const closeTimeInput = get('close-time-input');
    const totalVotesEl = get('total-votes');
    const todayVotesEl = get('votes-today');
    const uniqueVotersEl = get('unique-voters');
    const nomineeBody = get('nominee-votes-tbody');
    const recentBody = get('recent-votes-tbody');

    const setStatsRestricted = () => {
        if (totalVotesEl) totalVotesEl.textContent = 'Restricted';
        if (todayVotesEl) todayVotesEl.textContent = 'Restricted';
        if (uniqueVotersEl) uniqueVotersEl.textContent = 'Restricted';
        if (nomineeBody) nomineeBody.innerHTML = '<tr><td colspan="3" style="padding:15px;text-align:center;">Unable to load aggregate nominee vote counts. Use Refresh Statistics to try again.</td></tr>';
        if (recentBody) recentBody.innerHTML = '<tr><td colspan="3" style="padding:15px;text-align:center;">Unable to load privacy-safe recent activity. Use Refresh Statistics to try again.</td></tr>';
    };

    const toLocalInputValue = value => {
        if (!value || !Number.isFinite(Date.parse(value))) return '';
        const date = new Date(value);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    const fromLocalInputValue = value => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    };
    const formatLocal = value => value && Number.isFinite(Date.parse(value))
        ? new Date(value).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        })
        : 'Not set';

    const renderStatus = (isOpen, startAt, closeAt) => {
        const validWindow = startAt && closeAt && Number.isFinite(Date.parse(startAt)) &&
            Number.isFinite(Date.parse(closeAt)) && Date.parse(startAt) < Date.parse(closeAt) &&
            Date.parse(closeAt) > Date.now();
        const now = Date.now();
        const beforeStart = validWindow && now < Date.parse(startAt);
        const afterClose = validWindow && now >= Date.parse(closeAt);
        if (statusBadge) statusBadge.textContent = isOpen ? 'Voting Enabled' : 'Voting Closed';
        if (banner) {
            banner.style.borderLeftColor = isOpen ? '#16a34a' : '#ef4444';
            banner.setAttribute('aria-label', isOpen ? 'Manual voting switch: ON' : 'Manual voting switch: OFF');
        }
        if (bannerText) {
            if (!validWindow) bannerText.textContent = 'Voting is blocked until valid opening and closing times are saved. Configure the schedule, then enable the manual voting switch.';
            else if (!isOpen) bannerText.textContent = 'The manual voting switch is OFF. Public voting remains closed.';
            else if (beforeStart) bannerText.textContent = 'The manual switch is ON, but the database will block ballots until the scheduled opening time.';
            else if (afterClose) bannerText.textContent = 'The scheduled closing time has passed. The database blocks new ballots even if the manual switch remains ON. Turn the switch OFF.';
            else bannerText.textContent = 'Voting is enabled and within its scheduled window. Authenticated voters may cast one ballot per category for eligible nominees.';
        }
        if (openButton) openButton.disabled = isOpen || !validWindow;
        if (closeButton) closeButton.disabled = !isOpen;
        const timer = get('voting-timer');
        if (timer) {
            timer.textContent = formatLocal(closeAt);
            timer.title = 'Scheduled closing time. The database enforces the opening and closing timestamps on every vote.';
        }
        const startDisplay = get('voting-start-display');
        const closeDisplay = get('voting-close-display');
        if (startDisplay) startDisplay.textContent = formatLocal(startAt);
        if (closeDisplay) closeDisplay.textContent = formatLocal(closeAt);
    };

    if (bannerText) bannerText.textContent = 'Checking voting settings…';
    [openButton, closeButton, scheduleButton].forEach(button => { if (button) button.disabled = true; });

    try {
        const { data: settings, error } = await supabase.from('settings')
            .select('key,value')
            .in('key', ['voting_open', 'voting_start_time', 'voting_close_time']);
        if (error) throw error;
        const settingMap = new Map((settings || []).map(item => [item.key, item.value]));
        for (const key of ['voting_open', 'voting_start_time', 'voting_close_time']) {
            if (!settingMap.has(key)) throw new Error('The ' + key + ' setting is missing.');
        }

        let isOpen = String(settingMap.get('voting_open')).toLowerCase() === 'true';
        let startAt = settingMap.get('voting_start_time') || '';
        let closeAt = settingMap.get('voting_close_time') || '';
        if (startTimeInput) startTimeInput.value = toLocalInputValue(startAt);
        if (closeTimeInput) closeTimeInput.value = toLocalInputValue(closeAt);
        renderStatus(isOpen, startAt, closeAt);

        const updateSetting = async (key, value) => {
            const { data, error: updateError } = await supabase.from('settings')
                .update({ value: String(value) })
                .eq('key', key)
                .select('key,value')
                .maybeSingle();
            if (updateError) throw updateError;
            if (!data) throw new Error('No setting was updated. Confirm administrator permissions and that the setting exists.');
            return data.value;
        };

        const setVoting = async nextOpen => {
            if (nextOpen && (!startAt || !closeAt || !Number.isFinite(Date.parse(startAt)) ||
                !Number.isFinite(Date.parse(closeAt)) || Date.parse(startAt) >= Date.parse(closeAt))) {
                window.alert('Save a valid voting schedule before enabling voting.');
                return;
            }
            if (!window.confirm(nextOpen
                ? 'Enable the manual voting switch? The database will still block ballots outside the saved schedule.'
                : 'Close public voting now? New ballots will be blocked immediately.')) return;
            [openButton, closeButton].forEach(button => { if (button) button.disabled = true; });
            if (bannerText) bannerText.textContent = nextOpen ? 'Enabling voting…' : 'Closing voting…';
            try {
                await updateSetting('voting_open', nextOpen ? 'true' : 'false');
                isOpen = nextOpen;
                renderStatus(isOpen, startAt, closeAt);
            } catch (updateError) {
                console.error('Voting control update failed:', updateError);
                if (bannerText) bannerText.textContent = 'Voting status was not changed. Check administrator permissions.';
                window.alert('Could not update voting. No setting was changed.');
                renderStatus(isOpen, startAt, closeAt);
            }
        };

        if (openButton) openButton.onclick = () => setVoting(true);
        if (closeButton) closeButton.onclick = () => setVoting(false);

        if (scheduleButton) {
            scheduleButton.disabled = false;
            scheduleButton.onclick = async () => {
                const nextStart = fromLocalInputValue(startTimeInput?.value);
                const nextClose = fromLocalInputValue(closeTimeInput?.value);
                if (!nextStart || !nextClose) {
                    window.alert('Enter both the opening and closing date/time.');
                    return;
                }
                if (Date.parse(nextStart) >= Date.parse(nextClose)) {
                    window.alert('The closing date/time must be later than the opening date/time.');
                    return;
                }
                if (Date.parse(nextClose) <= Date.now()) {
                    window.alert('The closing date/time must be in the future.');
                    return;
                }
                scheduleButton.disabled = true;
                try {
                    if (isOpen) {
                        await updateSetting('voting_open', 'false');
                        isOpen = false;
                    }
                    startAt = await updateSetting('voting_start_time', nextStart);
                    closeAt = await updateSetting('voting_close_time', nextClose);
                    renderStatus(isOpen, startAt, closeAt);
                    window.alert('Voting schedule saved. Voting remains closed until you explicitly enable the manual switch.');
                } catch (updateError) {
                    console.error('Voting schedule update failed:', updateError);
                    window.alert('The schedule could not be fully saved. The manual voting switch has been left OFF; review the saved values and try again.');
                    try {
                        await updateSetting('voting_open', 'false');
                        isOpen = false;
                    } catch (closeError) {
                        console.error('Could not confirm voting is closed after schedule update failure:', closeError);
                    }
                    renderStatus(isOpen, startAt, closeAt);
                } finally {
                    scheduleButton.disabled = false;
                }
            };
        }

        // Use only the administrator-gated aggregate RPC. Never read vote_details or
        // treat the current voter's RLS-filtered rows as global totals.
        const { data: summary, error: summaryError } = await supabase.rpc('get_admin_voting_summary');
        if (summaryError || !summary) {
            console.warn('Admin voting summary is not available:', summaryError);
            setStatsRestricted();
        } else {
            if (totalVotesEl) totalVotesEl.textContent = Number(summary.total_votes || 0).toLocaleString();
            if (todayVotesEl) todayVotesEl.textContent = Number(summary.votes_today || 0).toLocaleString();
            if (uniqueVotersEl) uniqueVotersEl.textContent = Number(summary.unique_voters || 0).toLocaleString();

            if (nomineeBody) {
                const counts = Array.isArray(summary.nominee_counts) ? summary.nominee_counts : [];
                nomineeBody.innerHTML = counts.length ? counts.map(row =>
                    '<tr><td style="padding:10px;">' + escapeHTML(row.nominee_name || 'Unnamed nominee') +
                    '</td><td style="padding:10px;">' + escapeHTML(row.category || 'Uncategorised') +
                    '</td><td style="padding:10px;text-align:center;font-weight:600;">' +
                    Number(row.vote_count || 0).toLocaleString() + '</td></tr>'
                ).join('') : '<tr><td colspan="3" style="padding:15px;text-align:center;">No votes have been recorded.</td></tr>';
            }
            if (recentBody) {
                const activity = Array.isArray(summary.recent_activity) ? summary.recent_activity : [];
                recentBody.innerHTML = activity.length ? activity.map(row =>
                    '<tr><td style="padding:10px;">' + escapeHTML(row.created_at ? new Date(row.created_at).toLocaleString() : '—') +
                    '</td><td style="padding:10px;">' + escapeHTML(row.category || '—') +
                    '</td><td style="padding:10px;">' + escapeHTML(row.nominee_name || '—') + '</td></tr>'
                ).join('') : '<tr><td colspan="3" style="padding:15px;text-align:center;">No recent votes.</td></tr>';
            }
        }

        const exportVotes = get('export-votes-btn');
        if (exportVotes) {
            exportVotes.disabled = !!summaryError || !summary;
            exportVotes.title = 'Download aggregate nominee/category vote counts. No voter identity data is included.';
            exportVotes.onclick = () => {
                if (!summary || summaryError) return;
                const rows = Array.isArray(summary.nominee_counts) ? summary.nominee_counts : [];
                const csvRows = [
                    ['Nominee','Category','Vote Count'],
                    ...rows.map(row => [row.nominee_name || '', row.category || '', Number(row.vote_count || 0)])
                ];
                const csv = '\uFEFF' + csvRows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g,'""') + '"').join(',')).join('\r\n');
                const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
                const link = document.createElement('a');
                link.href = url;
                link.download = 'toyp-vote-summary-' + new Date().toISOString().slice(0,10) + '.csv';
                link.click();
                URL.revokeObjectURL(url);
            };
        }
        const refresh = get('refresh-stats-btn');
        if (refresh) refresh.onclick = loadVoting;
    } catch (error) {
        console.error('Voting dashboard load failed:', error);
        if (bannerText) bannerText.textContent = 'Unable to verify voting settings. Voting controls are disabled.';
        if (statusBadge) statusBadge.textContent = 'Status Unavailable';
        [openButton, closeButton, scheduleButton, get('toggle-voting'), get('export-votes-btn')].forEach(button => {
            if (button) button.disabled = true;
        });
        setStatsRestricted();
    }
}

// Helper SQL functions (run in SQL Editor)
/*
CREATE OR REPLACE FUNCTION count_unique_voters()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(DISTINCT voter_id) FROM votes);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_nominee_vote_counts()
RETURNS TABLE(nominee_name TEXT, category TEXT, vote_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT n.nominee_name, v.category, COUNT(*)::BIGINT
    FROM votes v
    JOIN nominations n ON v.nomination_id = n.id
    GROUP BY n.nominee_name, v.category
    ORDER BY v.category, COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;
*/

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
                    showMultipleNominations();
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
            tbody.innerHTML = '<tr><td colspan="6" style="padding:15px; text-align:center; color:var(--text-muted);">No finalists yet.</td></tr>';
            return;
        }

        // Group duplicate nomination rows by nominee and category so eligibility
        // is managed independently for each category entry.
        const grouped = new Map();
        finalists.forEach(n => {
            const name = String(n.nominee_name || 'Unnamed nominee').trim();
            const category = String(n.category || 'Uncategorised').trim();
            const key = `${name.toLowerCase()}::${category.toLowerCase()}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    name,
                    category,
                    votes: 0,
                    flagged: false,
                    ids: [],
                    allEligible: true,
                    anyEligible: false,
                    isFinalized: false
                });
            }
            const group = grouped.get(key);
            group.votes += Number(n.votes || 0);
            group.flagged = group.flagged || Boolean(n.flagged);
            group.ids.push(Number(n.id));
            group.allEligible = group.allEligible && n.ready_for_voting === true;
            group.anyEligible = group.anyEligible || n.ready_for_voting === true;
            group.isFinalized = group.isFinalized || Boolean(n.finalized_at);
        });

        for (const group of grouped.values()) {
            const ids = group.ids.filter(Number.isInteger);
            const idsAttribute = ids.join(',');
            const eligibilityLabel = group.allEligible
                ? '<span class="status-badge verified">Eligible</span>'
                : group.anyEligible
                    ? '<span class="status-badge">Partially eligible</span>'
                    : '<span class="status-badge">Not eligible</span>';
            const nextValue = !group.allEligible;
            const actionLabel = nextValue ? 'Make eligible' : 'Remove eligibility';
            const disabled = ids.length === 0 ? 'disabled' : '';
            const eligibilityAction = `<div>${eligibilityLabel}</div>
                <button type="button" class="view-btn toggle-voting-eligibility"
                    data-ids="${idsAttribute}" data-ready="${nextValue}" ${disabled}
                    style="margin-top:7px;">${actionLabel}</button>`;

            const actionsHtml = group.isFinalized
                ? '<span style="font-size:12px;color:var(--text-muted);">Locked</span>'
                : `<button class="view-btn view-nominee-finalist" data-ids="${idsAttribute}" data-name="${escapeHTML(group.name)}">View</button>
                   <button class="view-btn remove-finalist-btn" data-ids="${idsAttribute}" style="color:#ef4444;">Remove</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px;font-weight:600;">${escapeHTML(group.name)}</td>
                <td style="padding:12px;">${escapeHTML(group.category)}</td>
                <td style="padding:12px;">${group.votes}</td>
                <td style="padding:12px;">${group.flagged ? '<i class="bx bxs-flag" style="color:#ef4444;"></i>' : '—'}</td>
                <td style="padding:12px;">${eligibilityAction}</td>
                <td style="padding:12px;">${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        }

        const uniqueNames = new Set(finalists.map(n => String(n.nominee_name || '').trim()));
        const countBadge = document.getElementById('finalist-count-badge');
        if (countBadge) countBadge.textContent = uniqueNames.size;

        // Assign once per render; the handler updates only ready_for_voting via
        // a narrowly scoped, administrator-checked database function.
        tbody.onclick = async (event) => {
            const button = event.target.closest('.toggle-voting-eligibility');
            if (!button || button.disabled) return;

            const ids = button.dataset.ids.split(',').map(Number).filter(Number.isInteger);
            const ready = button.dataset.ready === 'true';
            if (!ids.length) return;

            const nomineeRow = button.closest('tr');
            button.disabled = true;
            button.textContent = 'Saving…';

            const { data, error } = await supabase.rpc('set_nomination_voting_eligibility', {
                p_nomination_ids: ids,
                p_ready_for_voting: ready
            });

            if (error) {
                console.error('Could not update voting eligibility:', error);
                alert(error.message || 'Could not update voting eligibility. Please check administrator access and the database function deployment.');
                button.disabled = false;
                button.textContent = ready ? 'Make eligible' : 'Remove eligibility';
                return;
            }

            if (Number(data) !== ids.length) {
                alert('The database did not update every nomination in this nominee/category group. Refresh the list and check the records.');
            } else {
                alert(`${ready ? 'Nominee marked eligible' : 'Voting eligibility removed'} for ${ids.length} nomination record(s).`);
            }
            await loadFinalists();
        };
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
        window.__FILTERED_NOMINATIONS__ = [];
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
        window.__FILTERED_NOMINATIONS__ = filteredRows;

        // 4. Group by normalized nominee name
        const groups = {};
        filteredRows.forEach(nom => {
            // Normalize: trim, lowercase, collapse multiple spaces
            const displayName = (nom.nominee_name || '').trim() || 'Unnamed nominee';
            const key = displayName.toLowerCase().replace(/\s+/g, ' ');
            if (!groups[key]) {
                groups[key] = {
                    displayName, // keep original casing from first occurrence
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

        // Bind export controls before the empty-results return so Export All
        // remains available even when the current filters match no rows.
        const exportBtn = document.getElementById('export-nominations-btn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                const all = window.__ALL_NOMINATIONS__ || [];
                if (!all.length) return alert('No data to export');
                exportCSV(all, 'all_nominations');
            };
        }
        const filteredExportBtn = document.getElementById('export-filtered-nominations-btn');
        if (filteredExportBtn) {
            filteredExportBtn.onclick = () => {
                // Reapply the current controls at export time so the CSV
                // always matches the filters currently shown on screen.
                const all = window.__ALL_NOMINATIONS__ || [];
                const nameSearch = (document.getElementById('name-search')?.value || '').trim().toLowerCase();
                const categoryVal = document.getElementById('category-filter')?.value || 'all';
                const statusVal = document.getElementById('status-filter')?.value || 'all';

                const filtered = all.filter(nom => {
                    const matchesName = !nameSearch ||
                        (nom.nominee_name || '').toLowerCase().includes(nameSearch);
                    const matchesCategory = categoryVal === 'all' || nom.category === categoryVal;
                    const matchesStatus = statusVal === 'all' || nom.status === statusVal;
                    return matchesName && matchesCategory && matchesStatus;
                });

                window.__FILTERED_NOMINATIONS__ = filtered;
                if (!filtered.length) return alert('There are no nominations matching the current filters to export.');
                exportCSV(filtered, 'filtered_nominations');
            };
        }

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
            <td class="nominee-name-cell" style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;"></td>
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
            tr.querySelector('.nominee-name-cell').textContent = group.displayName;
            tbody.appendChild(tr);
        });

    }

    async function populateCategoryDropdown() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    // Remember the user's choice before refreshing the options.
    const selectedValue = select.value || 'all';

    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('name')
            .order('display_order', { ascending: true });

        // Keep the existing options if the categories table is empty or unavailable.
        if (error) {
            console.warn('Could not load categories for filter', error);
            return;
        }
        if (!categories || categories.length === 0) return;

        select.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });

        // Restore the selected category if it is still available.
        if ([...select.options].some(option => option.value === selectedValue)) {
            select.value = selectedValue;
        }
    } catch (e) {
        console.warn('Could not load categories for filter', e);
    }
}

// ==============================================
// INVITATION FUNCTIONS
// ==============================================

async function sendInvitationToNominee(nomineeEmail, nomineeName, category) {
    console.log('📨 Sending invitation to:', nomineeEmail);
    
    try {
        // Check if user already exists in auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        let userExists = false;
        if (!listError && users) {
            userExists = users.some(u => u.email === nomineeEmail);
        }

        if (userExists) {
            // User already has an account - send password reset instead
            const { data, error } = await supabase.auth.resetPasswordForEmail(
                nomineeEmail,
                {
                    redirectTo: window.location.origin + '/set-password-profile-nominee.html'
                }
            );
            
            if (error) throw error;
            console.log('✅ Password reset sent to existing user');
            return { success: true, message: 'Password reset email sent!' };
        }

        // Step 1: Invite user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            nomineeEmail,
            {
                data: {
                    nominee_name: nomineeName,
                    category: category,
                    invited_at: new Date().toISOString()
                }
            }
        );

        if (authError) {
            console.error('❌ Auth Error:', authError);
            
            // If user already exists, send password reset
            if (authError.message.includes('already registered')) {
                const { data, error } = await supabase.auth.resetPasswordForEmail(
                    nomineeEmail,
                    {
                        redirectTo: window.location.origin + '/set-password-profile-nominee.html'
                    }
                );
                if (error) throw error;
                return { success: true, message: 'Password reset sent to existing user!' };
            }
            
            throw authError;
        }

        console.log('✅ Invitation sent successfully to:', nomineeEmail);
        return { success: true, message: 'Invitation sent successfully!' };

    } catch (error) {
        console.error('❌ Invitation failed:', error);
        return { success: false, error: error.message };
    }
}

async function sendInvitationsToFinalists() {
    // Get all finalists
    const { data: finalists, error } = await supabase
        .from('nominations')
        .select('*')
        .eq('stage', 'finalist');

    if (error) {
        console.error('Error fetching finalists:', error);
        alert('Could not fetch finalists.');
        return;
    }

    if (!finalists || finalists.length === 0) {
        alert('No finalists found.');
        return;
    }

    // Group by nominee name to avoid duplicates
    const uniqueNominees = new Map();
    finalists.forEach(nom => {
        const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!uniqueNominees.has(key)) {
            uniqueNominees.set(key, {
                name: nom.nominee_name.trim(),
                email: nom.nominee_email,
                category: nom.category
            });
        }
    });

    const nomineeList = Array.from(uniqueNominees.values());
    
    console.log(`📤 Sending invitations to ${nomineeList.length} nominees...`);

    // Send invitations one by one
    let successCount = 0;
    let failCount = 0;
    const failedEmails = [];

    for (const nominee of nomineeList) {
        const result = await sendInvitationToNominee(
            nominee.email,
            nominee.name,
            nominee.category
        );

        if (result.success) {
            successCount++;
            console.log(`✅ Sent to ${nominee.name} (${nominee.email})`);
        } else {
            failCount++;
            failedEmails.push(`${nominee.name} (${nominee.email}): ${result.error}`);
            console.error(`❌ Failed for ${nominee.name}: ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Show detailed results
    let message = `📨 Invitation Summary\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`;
    
    if (failedEmails.length > 0) {
        message += `\n\nFailed:\n${failedEmails.join('\n')}`;
    }
    
    alert(message);
    console.log('📊 Invitation Summary:', { successCount, failCount, failedEmails });
}

// Add this to your scripts.js file

async function sendInvitationToNominee(nomineeEmail, nomineeName, category) {
    console.log('📨 Sending invitation to:', nomineeEmail);
    
    try {
        // First, check if user already exists
        const { data: existingUser } = await supabase
            .from('nominations')
            .select('user_id')
            .eq('nominee_email', nomineeEmail)
            .single();

        if (existingUser?.user_id) {
            // User already has an account - send password reset instead
            const { data, error } = await supabase.auth.resetPasswordForEmail(
                nomineeEmail,
                {
                    redirectTo: window.location.origin + '/set-password-profile-nominee.html'
                }
            );
            
            if (error) throw error;
            console.log('✅ Password reset sent to existing user');
            return { success: true, message: 'Password reset email sent!' };
        }

        // Step 1: Invite user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            nomineeEmail,
            {
                data: {
                    nominee_name: nomineeName,
                    category: category,
                    invited_at: new Date().toISOString()
                }
            }
        );

        if (authError) {
            console.error('❌ Auth Error:', authError);
            
            // If user already exists, send password reset
            if (authError.message.includes('already registered')) {
                const { data, error } = await supabase.auth.resetPasswordForEmail(
                    nomineeEmail,
                    {
                        redirectTo: window.location.origin + '/set-password-profile-nominee.html'
                    }
                );
                if (error) throw error;
                return { success: true, message: 'Password reset sent to existing user!' };
            }
            
            throw authError;
        }

        console.log('✅ Invitation sent successfully to:', nomineeEmail);
        return { success: true, message: 'Invitation sent successfully!' };

    } catch (error) {
        console.error('❌ Invitation failed:', error);
        return { success: false, error: error.message };
    }
}

// Function to send invitations to all finalists
async function sendInvitationsToFinalists() {
    // Get all finalists
    const { data: finalists, error } = await supabase
        .from('nominations')
        .select('*')
        .eq('stage', 'finalist');

    if (error) {
        console.error('Error fetching finalists:', error);
        alert('Could not fetch finalists.');
        return;
    }

    if (!finalists || finalists.length === 0) {
        alert('No finalists found.');
        return;
    }

    // Group by nominee name to avoid duplicates
    const uniqueNominees = new Map();
    finalists.forEach(nom => {
        const key = nom.nominee_name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!uniqueNominees.has(key)) {
            uniqueNominees.set(key, {
                name: nom.nominee_name.trim(),
                email: nom.nominee_email,
                category: nom.category
            });
        }
    });

    const nomineeList = Array.from(uniqueNominees.values());
    
    console.log(`📤 Sending invitations to ${nomineeList.length} nominees...`);

    // Send invitations one by one
    let successCount = 0;
    let failCount = 0;

    for (const nominee of nomineeList) {
        const result = await sendInvitationToNominee(
            nominee.email,
            nominee.name,
            nominee.category
        );

        if (result.success) {
            successCount++;
            console.log(`✅ Sent to ${nominee.name}`);
        } else {
            failCount++;
            console.error(`❌ Failed for ${nominee.name}: ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    alert(`📨 Done!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\nCheck the console for details.`);
}

    async function finalizeAndNotify() {
        if (!confirm('Are you sure? This will LOCK all current finalists and send emails to their email addresses. This cannot be undone.')) return;

    const finalizeBtn = document.getElementById('finalize-notify-btn');
    finalizeBtn.disabled = true;
    finalizeBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Finalizing...';

    try {
        // 1. Fetch all current finalists
        const { data: finalists, error: fetchErr } = await supabase
            .from('nominations')
            .select('id, nominee_name, nominee_email, category, nominee_phone')
            .eq('stage', 'finalist');

        if (fetchErr || !finalists || finalists.length === 0) {
            alert('No finalists to finalize.');
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i class="bx bx-lock-alt"></i> Finalize & Notify';
            return;
        }

        // 2. Lock finalists (set finalized_at)
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

        // 3. Call the edge function with the finalists list
        const { data: response, error: fnErr } = await supabase.functions.invoke('send-finalist-emails', {
            body: { finalists }
        });

        if (fnErr) {
            console.error('Edge function error:', fnErr);
            alert('Finalists locked, but account creation/email sending failed. Check console.');
        } else {
            const results = response?.results || [];
            const successCount = response?.summary?.successful || 0;
            const total = finalists.length;
            alert(`✅ Finalized! ${successCount}/${total} accounts created and notified.`);
            // Optionally show detailed results in console
            console.log('Detailed results:', results);
        }

        // 4. Show WhatsApp panel (optional)
        showWhatsAppPanel(finalists);

    } catch (err) {
        console.error('Finalization error', err);
        alert('An unexpected error occurred.');
    } finally {
        finalizeBtn.disabled = true;
        finalizeBtn.innerHTML = '<i class="bx bx-check"></i> Finalized';
        loadFinalists();
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



// Read-only multiple-nomination tracking. This feature never updates nomination rows.
function normalizeNomineeName(value = '') {
    return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function showMultipleNominations() {
    const rows = window.__ALL_NOMINATIONS__ || [];
    if (!rows.length) {
        alert('No nomination data is loaded.');
        return;
    }

    const groupsMap = new Map();
    rows.forEach(nomination => {
        const display = String(nomination.nominee_name || '').trim() || 'Unnamed nominee';
        const key = normalizeNomineeName(display) || '__unnamed__';
        if (!groupsMap.has(key)) {
            groupsMap.set(key, { display, records: [] });
        }
        groupsMap.get(key).records.push(nomination);
    });

    const groups = Array.from(groupsMap.values())
        .sort((a, b) => b.records.length - a.records.length || a.display.localeCompare(b.display));
    window.__nomineeTrackingGroups = groups;

    const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
            <p style="margin:0; color:var(--text-muted); font-size:13px;">All nomination records are retained. Groups are based on normalized nominee names and are for identification and review only.</p>
            <button class="view-btn refresh-groups-btn" style="font-size:12px;"><i class='bx bx-refresh'></i> Refresh</button>
        </div>
        <div style="max-height:480px; overflow-y:auto;">
            ${groups.map((group, index) => {
                const emails = new Set(group.records.map(r => String(r.nominee_email || r.primary_email || '').trim().toLowerCase()).filter(Boolean));
                const phones = new Set(group.records.map(r => String(r.nominee_phone || r.whatsapp_contact || r.other_contact || '').replace(/\D/g, '')).filter(Boolean));
                const categories = [...new Set(group.records.map(r => String(r.category || '').trim()).filter(Boolean))];
                const identityNote = emails.size > 1 || phones.size > 1
                    ? '<span style="color:#b45309; font-size:11px;">Identity details vary — review before treating as one person</span>'
                    : '<span style="color:var(--text-muted); font-size:11px;">Name-based group</span>';
                return `
                    <div style="border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:9px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                            <div style="min-width:0;">
                                <strong>${escapeHTML(group.display)}</strong>
                                <span class="status-badge" style="background:var(--jci-blue); color:white; margin-left:6px;">${group.records.length} nominations</span>
                                <div style="margin-top:5px;">${identityNote}</div>
                                <small style="color:var(--text-muted);">${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${emails.size} email identifier(s) · ${phones.size} phone identifier(s)</small>
                            </div>
                            <button class="view-btn open-nominee-group-btn" data-group="${index}"><i class='bx bx-folder-open'></i> View records</button>
                        </div>
                    </div>`;
            }).join('')}
        </div>
        <div style="margin-top:14px; text-align:right;"><button class="btn-secondary close-modal">Close</button></div>
    `;

    document.getElementById('modal-title').textContent = 'Multiple Nomination Tracking';
    document.getElementById('modal-subtitle').textContent = `${groups.length} name-based nominee groups · ${rows.length} nomination records`;
    document.getElementById('modal-data').innerHTML = html;
    document.getElementById('detailsModal').style.display = 'flex';
}

function showNomineeGroupDetail(groupIndex) {
    const group = (window.__nomineeTrackingGroups || [])[Number(groupIndex)];
    if (!group) return;

    const categoryCounts = new Map();
    group.records.forEach(record => {
        const category = String(record.category || 'Unspecified category').trim() || 'Unspecified category';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const recordRows = group.records.map(record => {
        const date = record.created_at ? new Date(record.created_at).toLocaleString() : 'Date unavailable';
        return `
            <tr>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(record.id)}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(record.category || '—')}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(record.nominator_email || '—')}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(record.nominee_email || record.primary_email || '—')}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(record.status || '—')}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);">${escapeHTML(date)}</td>
                <td style="padding:10px; border-bottom:1px solid var(--bg-slate);"><button class="view-btn view-nomination-detail-btn" data-nomination-id="${escapeHTML(record.id)}">Details</button></td>
            </tr>`;
    }).join('');

    document.getElementById('modal-title').textContent = group.display;
    document.getElementById('modal-subtitle').textContent = `${group.records.length} individual nomination records · records remain separate`;
    document.getElementById('modal-data').innerHTML = `
        <button class="view-btn back-to-groups-btn" style="margin-bottom:12px;"><i class='bx bx-arrow-back'></i> Back to groups</button>
        <div style="padding:12px; background:var(--bg-slate); border-radius:8px; margin-bottom:14px;">
            <strong>Nominations by category</strong>
            <ul style="margin:8px 0 0 18px;">${Array.from(categoryCounts.entries()).map(([category, count]) => `<li>${escapeHTML(category)}: ${count}</li>`).join('')}</ul>
            <p style="font-size:12px; color:var(--text-muted); margin:8px 0 0;">This is a name-based grouping, not a confirmed identity merge. Check contact details and individual records before drawing conclusions.</p>
        </div>
        <div class="table-responsive">
            <table style="width:100%; min-width:850px; border-collapse:collapse; text-align:left;">
                <thead><tr style="font-size:11px; color:var(--text-muted);">
                    <th style="padding:10px;">RECORD ID</th><th style="padding:10px;">CATEGORY</th><th style="padding:10px;">NOMINATOR</th><th style="padding:10px;">NOMINEE EMAIL</th><th style="padding:10px;">STATUS</th><th style="padding:10px;">SUBMITTED</th><th style="padding:10px;">ACTION</th>
                </tr></thead>
                <tbody>${recordRows}</tbody>
            </table>
        </div>`;
}

// Legacy merge functions are intentionally retained but are not exposed or callable from the UI.
    // Helper to generate CSV (placed outside, e.g., after loadNominations)
    function exportCSV(items, exportType = 'nominations') {
        const headers = ['id', 'nominee_name', 'nominee_email', 'nominator_email', 'category', 'faculty', 'department', 'level', 'status', 'whatsapp_contact', 'reason', 'created_at'];
        const csvRows = [headers.join(',')];
        items.forEach(it => {
            const row = headers.map(h => '"' + String(it[h] || '').replace(/"/g, '""') + '"').join(',');
            csvRows.push(row);
        });
        const csv = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Event Delegation
    document.addEventListener('click', async (e) => {
        // ----- Apply filters -----
        if (e.target.closest('#apply-filters-btn')) {
            await loadNominations();
            return;
        }
        if (e.target.closest('#clear-nomination-filters-btn')) {
            const search = document.getElementById('name-search');
            const category = document.getElementById('category-filter');
            const status = document.getElementById('status-filter');
            if (search) search.value = '';
            if (category) category.value = 'all';
            if (status) status.value = 'all';
            await loadNominations();
            return;
        }

        // ----- Open single nomination details (profile card) -----
        if (e.target.closest('.review-trigger')) {
            const id = e.target.closest('.review-trigger').getAttribute('data-id');
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
        if (e.target.closest('.view-group-trigger')) {
            const displayName = e.target.closest('.view-group-trigger').getAttribute('data-name');
            const allRows = window.__ALL_NOMINATIONS__ || [];
            const matching = allRows.filter(nom =>
                (nom.nominee_name || '').trim().toLowerCase().replace(/\s+/g, ' ') === (displayName || '').toLowerCase().replace(/\s+/g, ' ')
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

        // Open read-only multiple-nomination tracking
        if (e.target.closest('#show-merge-suggestions-btn')) {
            showMultipleNominations();
            return;
        }

        // Open all original nomination records in a name-based group
        if (e.target.closest('.open-nominee-group-btn')) {
            showNomineeGroupDetail(e.target.closest('.open-nominee-group-btn').dataset.group);
            return;
        }

        // Inspect an individual original nomination without changing it.
        if (e.target.closest('.view-nomination-detail-btn')) {
            const id = e.target.closest('.view-nomination-detail-btn').dataset.nominationId;
            const nomination = (window.__NOMINATIONS_MAP__ || {})[id];
            if (nomination) openNominationModal(nomination);
            return;
        }

        // Bulk finalist identity edits are also disabled because they overwrite multiple nomination records.
        if (e.target.closest('#edit-finalist-profile-btn, #save-finalist-details-btn')) {
            e.preventDefault();
            alert('Bulk nominee identity edits are disabled. Original nomination details must remain unchanged.');
            return;
        }

        // Legacy merge controls are blocked. Keep their implementation for possible restoration.
        if (e.target.closest('.manual-merge-btn, #execute-manual-merge-btn, .merge-group-btn, .remove-variant-btn')) {
            e.preventDefault();
            alert('Merge actions are disabled. All nomination records must remain unchanged.');
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
    showMultipleNominations();  // return to updated list
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
    showNomineeGroupDetail(groupIndex);
    return;
}

if (e.target.classList.contains('refresh-groups-btn') || e.target.closest('.refresh-groups-btn')) {
    await loadNominations().catch(e => console.error(e));
    showMultipleNominations();
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

        // ===== SEND INVITATIONS BUTTON =====
if (e.target.id === 'send-invitations-btn') {
    if (!confirm('Send invitation emails to all finalists? They will receive a link to set up their profiles.')) return;
    
    const btn = e.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Sending...';
    
    await sendInvitationsToFinalists();
    
    btn.disabled = false;
    btn.innerHTML = '<i class="bx bx-envelope"></i> Send Invitations';
    return;
}

if (e.target.id === 'test-invite-btn') {
        const testEmail = prompt('Enter email to test with:', 'test@example.com');
        if (!testEmail) return;
        
        const testName = prompt('Enter nominee name:', 'Test Nominee');
        if (!testName) return;
        
        const testCategory = prompt('Enter category:', 'Business Leadership');
        if (!testCategory) return;
        
        console.log('🧪 Testing with:', { testEmail, testName, testCategory });
        
        const btn = e.target;
        btn.disabled = true;
        btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Sending...';
        
        const result = await sendInvitationToNominee(
            testEmail,
            testName,
            testCategory
        );
        
        if (result.success) {
            alert(`✅ Invitation sent to ${testEmail}\nCheck your inbox/spam folder.`);
        } else {
            alert(`❌ Failed: ${result.error}`);
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="bx bx-test-tube"></i> Test Invite';
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
    showMultipleNominations();
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
    await showMultipleNominations();
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