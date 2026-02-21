/**
 * JCI UNIBEN TOYP - Master Admin Script
 * Includes: Nominations, Voting, Audit, and Category Scripts
 */
// import * as dashboard from './views/overview.js';
// import {nominationsPage} from './views/nominations.js';


// 1. SYSTEM STATE & SECURITY (Requirement 2)
const currentUser = {
    name: "Admin User",
    role: "super-admin", // Toggle to 'auditor' to test Read-Only mode
    isAuthenticated: true
};


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
    audit: {
        filePath: './views/audit.html',
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
        badge.textContent = currentUser.role === 'super-admin' ? 'Super Admin' : 'Auditor';
        badge.className = `role-badge ${currentUser.role}`;
    }

    // Auditor Restricted Access 
    if (currentUser.role === 'auditor') {
        const controls = document.querySelectorAll('.btn-primary, .btn-reject, #btn-approve, .switch-ui input, #add-cat-btn');
        controls.forEach(el => {
            if (el.tagName === 'INPUT') {
                el.disabled = true;
                el.parentElement.style.opacity = "0.5";
            } else {
                el.style.display = 'none';
            }
        });

        if (!document.querySelector('.audit-banner')) {
            const banner = document.createElement('div');
            banner.className = 'audit-banner';
            banner.style.cssText = "background: #FEF9C3; color: #854D0E; padding: 10px; font-size: 12px; text-align: center; border-bottom: 1px solid #FDE047;";
            banner.innerHTML = `<i class='bx bx-lock-alt'></i> <b>Audit Mode:</b> You have read-only access to all TOYP data.`;
            document.querySelector('.main-content').prepend(banner);
        }
        // Disable Visibility Toggles
        const toggles = document.querySelectorAll('.visibility-toggle');
        toggles.forEach(toggle => {
            toggle.disabled = true; // Prevents clicking
            toggle.parentElement.style.opacity = "0.6"; // Visual cue it's locked
            toggle.parentElement.style.cursor = "not-allowed";
        });

        // Hide "Toggle All" Bulk Action
        const bulkToggle = document.getElementById('toggle-all-visibility');
        if (bulkToggle) bulkToggle.style.display = 'none';

        // Content Panel Specific Restrictions
        const inputs = document.querySelectorAll('.card input, .card textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.backgroundColor = "#f8fafc";
        });

        const sendBtn = document.getElementById('send-announcement');
        const publishBtn = document.getElementById('publish-all-btn');
        if (sendBtn) sendBtn.style.display = 'none';
        if (publishBtn) publishBtn.style.display = 'none';
    }
}

/**
 * Opens nomination details modal with nominee profile, achievement write-up, and approval actions
 * 
 * @returns {void}
 */
function openNominationModal() {
    const modalBody = document.getElementById('modal-data');
    modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--bg-slate);">
                    <div>
                        <h3 style="color: var(--jci-blue); font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Nominee Profile</h3>
                        <p style="font-weight: 700; font-size: 15px;">Osasere Idahosa</p>
                        <p style="font-size: 13px; color: var(--text-muted);">osas.idahosa@example.com</p>
                        <p style="font-size: 13px; color: var(--text-muted);">+234 xxx xxx xxxx</p>
                    </div>
                    <div>
                        <h3 style="color: var(--jci-teal); font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Nominator Details</h3>
                        <p style="font-weight: 700; font-size: 15px;">Dr. Kelvin Uwaila</p>
                        <p style="font-size: 13px; color: var(--text-muted);">k.uwaila@jcinuniben.edu</p>
                        <p style="font-size: 13px; color: var(--text-muted);">+234 xxx xxx xxxx</p>
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 12px; margin-bottom: 10px; text-transform: uppercase; color: var(--text-muted);">Nominee Achievement Write-up</h3>
                    <div style="background: var(--bg-slate); padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: var(--text-main);">
                        "The nominee has developed a low-cost solar inverter system currently used by 15 rural schools in Edo State. This project has provided consistent electricity to over 5,000 students, enabling the use of digital learning tools for the first time in these communities. Osasere led a team of 5 student engineers to build these units using locally sourced recycled materials..."
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 12px; margin-bottom: 10px; text-transform: uppercase; color: var(--text-muted);">Evidence & Attachments</h3>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <div style="border: 1px solid var(--bg-slate); padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <i class='bx bxs-file-pdf' style="color: #ef4444; font-size: 20px;"></i>
                            <span style="font-size: 12px;">Project_Report.pdf</span>
                        </div>
                        <div style="border: 1px solid var(--bg-slate); padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <i class='bx bxs-image' style="color: var(--jci-blue); font-size: 20px;"></i>
                            <span style="font-size: 12px;">Installation_Photo.jpg</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="margin-top: 10px; padding-top: 20px; border-top: 1px solid var(--bg-slate); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-primary flag-trigger" style="background: var(--jci-yellow); color: var(--jci-black); border: 1px solid var(--border-color);">
                        <i class='bx bxs-flag-alt'></i> Flag
                    </button>
                    <button class="btn-primary reject-trigger" style="background: #ef4444; color: white; border: 1px solid var(--border-color);">
                        <i class='bx bx-x'></i> Reject
                    </button>
                    <button class="btn-primary approve-trigger" style="background: var(--jci-teal);">
                        <i class='bx bx-check'></i> Approve Nomination
                    </button>
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
    document.addEventListener('click', (e) => {
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
    contentArea.innerHTML = await getViewMarkup('overview');

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
            }
        });
    });

    // Event Delegation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('review-trigger')) openNominationModal();
        if (e.target.classList.contains('close-modal')) modal.style.display = 'none';
        //nomination approval Workflow
        if (e.target.closest('.approve-trigger')) {
            alert("Nomination Approved and moved to Verified status.");
            modal.style.display = 'none';
        }
        // Nomination flagging Workflow
        if (e.target.closest('.flag-trigger')) {

            const concern = prompt("Specify the concern for flagging (e.g., Potential duplicate, suspicious documentation):");

            if (concern !== null && concern.trim() !== "") {
                if (confirm("Flag this nomination for Auditor review?")) {

                    alert("Entry Flagged.\nConcern: " + concern + "\nAn Auditor has been notified for investigation.");

                    const modal = document.getElementById('detailsModal');
                    modal.style.display = 'none';

                    console.log("Nomination flagged by Admin. Concern: " + concern);

                }
            } else if (concern === "") {
                alert("Action Cancelled: You must specify a concern to flag an entry.");
            }
        }
        // Nomination rejection Workflow
        if (e.target.closest('.reject-trigger')) {

            const reason = prompt("Please enter the reason for rejection (e.g., Ineligible age, Missing documents):");

            if (reason !== null && reason.trim() !== "") {
                if (confirm("Confirm Rejection? This action cannot be undone.")) {

                    alert("Nomination Rejected.\nReason: " + reason + "\nStatus updated for Audit Log.");

                    const modal = document.getElementById('detailsModal');
                    modal.style.display = 'none';

                    console.log("Nomination rejected by Admin. Reason: " + reason);
                }
            } else if (reason === "") {
                alert("Action Cancelled: A reason is required to reject a nomination.");
            }
        }


        //CATEGORY MODAL MANAGEMENT TRIGGERS
        // Trigger for Add Category
        if (e.target.id === 'add-cat-trigger') {
            openCategoryModal(false);
        }
        // Trigger for Edit Category
        if (e.target.closest('.edit-cat-trigger')) {
            const btn = e.target.closest('.edit-cat-trigger');
            const name = btn.getAttribute('data-name');
            const desc = btn.getAttribute('data-desc'); // Now fetching description
            openCategoryModal(true, { name, desc });
        }
        // Handle the "Save" inside the modal
        if (e.target.id === 'save-category-btn') {
            const newName = document.getElementById('cat-name-input').value;
            const newDesc = document.getElementById('cat-desc-input').value;

            if (newName.trim() !== "" && newDesc.trim() !== "") {
                alert("Success: '" + newName + "' has been updated in the database.");
                document.getElementById('detailsModal').style.display = 'none';
            } else {
                alert("Please fill in both the Category Name and Description.");
            }
        }

        // Trigger for Finalist Dossier Modal
        if (e.target.closest('.live-profile-trigger')) {
            openDossierModal();
        }

        // Voting Phase Control
        if (e.target.id === 'start-v') {
            alert("SUCCESS: Voting portal is now open to the public.");
            e.target.style.display = 'none';
            document.getElementById('stop-v').style.display = 'block';
            document.getElementById('v-status').textContent = "Phase: Active";
            document.getElementById('v-status').style.background = "#dcfce7";
            document.getElementById('v-status').style.color = "#166534";
        }
        if (e.target.id === 'stop-v') {
            alert("CONFIRMED: Voting portal is now closed.");
            e.target.style.display = 'none';
            document.getElementById('start-v').style.display = 'block';
            const statusLabel = document.getElementById('v-status');
            statusLabel.textContent = "Phase: Paused";
            statusLabel.style.background = "#FEE2E2";
            statusLabel.style.color = "#991B1B";
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