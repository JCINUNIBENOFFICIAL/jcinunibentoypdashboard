/**
 * JCI UNIBEN TOYP - Master Admin Script
 * Includes: Nominations, Voting, Audit, and Category Config
 */

// 1. SYSTEM STATE & SECURITY (Requirement 2)
const currentUser = {
    name: "Admin User",
    role: "super-admin", // Toggle to 'auditor' to test Read-Only mode
    isAuthenticated: true
};

// 2. VIEW TEMPLATES (Requirement 3B - 3H)
const views = {
    overview: `
        <div class="view-header">
            <h1>Dashboard Overview</h1>
            <p>Welcome back, Admin. Here is a summary of the TOYP 2026 activity.</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-info"><span>Total Nominations</span><h2>452</h2></div>
                <i class='bx bxs-file-import' style="color: var(--jci-blue); font-size: 32px;"></i>
            </div>
            <div class="stat-card">
                <div class="stat-info"><span>Verified Entries</span><h2>398</h2></div>
                <i class='bx bxs-check-shield' style="color: var(--jci-teal); font-size: 32px;"></i>
            </div>
            <div class="stat-card">
                <div class="stat-info"><span>Total Votes Cast</span><h2>1,205</h2></div>
                <i class='bx bxs-bolt-circle' style="color: var(--jci-yellow); font-size: 32px;"></i>
            </div>
            <div class="stat-card">
                <div class="stat-info"><span>Pending Review</span><h2 style="color: #ef4444;">54</h2></div>
                <i class='bx bxs-time-five' style="color: #ef4444; font-size: 32px;"></i>
            </div>
        </div>

        <div class="card" style="margin-top: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Recent Activity</h3>
                <button class="view-btn" style="font-size: 12px;">View All Logs</button>
            </div>
            <div class="table-responsive">
                <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 600px;">
                    <thead>
                        <tr style="font-size: 11px; color: var(--text-muted); border-bottom: 2px solid var(--bg-slate);">
                            <th style="padding: 12px;">TIME</th>
                            <th style="padding: 12px;">ACTIVITY</th>
                            <th style="padding: 12px;">USER</th>
                            <th style="padding: 12px;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px; font-size: 13px;">10:45 AM</td>
                            <td style="padding: 12px; font-size: 13px;">New Nomination: <b>Osasere Idahosa</b></td>
                            <td style="padding: 12px; font-size: 13px;">Public Portal</td>
                            <td style="padding: 12px;"><span class="status-badge" style="background:#dcfce7; color:#166534; font-size: 10px;">Received</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-size: 13px;">09:12 AM</td>
                            <td style="padding: 12px; font-size: 13px;">Nomination Verified: <b>Efe Williams</b></td>
                            <td style="padding: 12px; font-size: 13px;">Admin (You)</td>
                            <td style="padding: 12px;"><span class="status-badge" style="background:#dbeafe; color:#1e40af; font-size: 10px;">Verified</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-size: 13px;">Yesterday</td>
                            <td style="padding: 12px; font-size: 13px;">Category Added: <b>Philanthropy</b></td>
                            <td style="padding: 12px; font-size: 13px;">Super Admin</td>
                            <td style="padding: 12px;"><span class="status-badge" style="background:#fef9c3; color:#854d0e; font-size: 10px;">Updated</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,

    nominations: `
        <div class="view-header">
            <h1>Nomination Management</h1>
            <div class="header-actions">
                <button class="btn-primary" style="font-size: 12px;"><i class='bx bx-export'></i> Export List</button>
            </div>
        </div>

        <div class="card" style="margin-bottom: 20px; padding: 15px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 11px; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 5px;">FILTER BY CATEGORY</label>
                    <select class="filter-select" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--bg-slate); background: white;">
                        <option value="all">All Categories</option>
                        <option value="academic">Academic Excellence</option>
                        <option value="leadership">Leadership Development</option>
                    </select>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 11px; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 5px;">FILTER BY STATUS</label>
                    <select class="filter-select" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--bg-slate); background: white;">
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending Review</option>
                        <option value="verified">Verified</option>
                    </select>
                </div>
                <div style="display: flex; align-items: flex-end; height: 100%;">
                    <button class="view-btn" style="padding: 9px 20px;">Apply Filters</button>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 850px;">
                    <thead>
                        <tr style="font-size: 11px; color: var(--text-muted); border-bottom: 2px solid var(--bg-slate);">
                            <th style="padding: 12px;">DATE SUBMITTED</th>
                            <th style="padding: 12px;">NOMINEE</th>
                            <th style="padding: 12px;">CATEGORY</th>
                            <th style="padding: 12px;">STATUS</th>
                            <th style="padding: 12px;">PUBLIC ACCESS</th>
                            <th style="padding: 12px;">ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">Feb 08, 2026</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">Osasere Idahosa</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">Academic Excellence</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><span class="status-badge pending">Pending</span></td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                <label class="switch-ui"><input type="checkbox" checked><span class="slider"></span></label>
                            </td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><button class="view-btn review-trigger">Review</button></td>
                        </tr>
                        <tr style="background: var(--bg-slate);">
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">Feb 07, 2026</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">Efe Williams</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">Leadership</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><span class="status-badge" style="background:#dcfce7; color:#166534;">Verified</span></td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                <label class="switch-ui"><input type="checkbox" checked><span class="slider"></span></label>
                            </td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);"><button class="view-btn review-trigger">Review</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,


    categories: `
        <div class="view-header">
            <h1>Category Management</h1>
            <button class="btn-primary" id="add-cat-trigger">
                <i class='bx bx-plus-circle'></i> Add New Category
            </button>
        </div>

        <div class="stats-grid" style="margin-bottom: 25px;">
            <div class="stat-card">
                <div class="stat-info"><span>Active Categories</span><h2>10</h2></div>
                <i class='bx bxs-category' style="color: var(--jci-blue); font-size: 24px;"></i>
            </div>
            <div class="stat-card">
                <div class="stat-info"><span>Currently Hidden</span><h2 style="color: #ef4444;">2</h2></div>
                <i class='bx bxs-hide' style="color: #ef4444; font-size: 24px;"></i>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 800px;">
                    <thead>
                        <tr style="font-size: 11px; color: var(--text-muted); border-bottom: 2px solid var(--bg-slate);">
                            <th style="padding: 12px; width: 25%;">CATEGORY NAME</th>
                            <th style="padding: 12px; width: 35%;">DESCRIPTION</th>
                            <th style="padding: 12px; width: 15%; text-align: center;">PUBLIC STATUS</th>
                            <th style="padding: 12px; width: 10%;">ENTRIES</th>
                            <th style="padding: 12px; width: 15%;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="category-table-body">
                        <tr>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">Academic Excellence</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px; color: var(--text-muted);">Recognition for scholastic achievement...</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                                <label class="switch-ui">
                                    <input type="checkbox" class="cat-toggle" checked>
                                    <span class="slider"></span>
                                </label>
                            </td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">85</td>
                            <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                <div style="display: flex; gap: 8px;">
                                    <button class="view-btn edit-cat-trigger" data-name="Academic Excellence" data-desc="Recognition for scholastic..."><i class='bx bx-edit-alt'></i></button>
                                    <button class="view-btn delete-cat" style="color: #ef4444;"><i class='bx bx-trash'></i></button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,

   finalists: `
    <div class="view-header">
        <h1>Nominee & Finalist Management</h1>
        <div class="header-actions">
            <button class="view-btn" id="toggle-all-visibility">
                <i class='bx bx-low-vision'></i> Toggle All Public
            </button>
        </div>
    </div>

    <div class="card">
        <div class="table-responsive">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead>
                    <tr style="font-size: 11px; color: var(--text-muted); border-bottom: 2px solid var(--bg-slate);">
                        <th style="padding: 12px;">CANDIDATE NAME</th>
                        <th style="padding: 12px;">CATEGORY</th>
                        <th style="padding: 12px;">STATUS</th>
                        <th style="padding: 12px; text-align: center;">PUBLIC VISIBILITY</th>
                        <th style="padding: 12px;">MORE DETAILS</th>
                    </tr>
                </thead>
                <tbody id="finalist-table-body">
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <div style="font-weight: 600;">Osasere Idahosa</div>
                            <div style="font-size: 11px; color: var(--text-muted);">Ref: JCI-TOYP-26-001</div>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">Academic Excellence</td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <span class="status-badge status-shortlisted">Shortlisted</span>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                            <label class="switch-ui">
                                <input type="checkbox" class="visibility-toggle" checked>
                                <span class="slider"></span>
                            </label>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <button class="view-btn live-profile-trigger"><i class='bx bx-file-find'></i> View Profile</button>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <div style="font-weight: 600;">Efe Williams</div>
                            <div style="font-size: 11px; color: var(--text-muted);">Ref: JCI-TOYP-26-042</div>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-size: 13px;">Leadership</td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <span class="status-badge status-honouree">Honouree</span>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); text-align: center;">
                            <label class="switch-ui">
                                <input type="checkbox" class="visibility-toggle" checked>
                                <span class="slider"></span>
                            </label>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                            <button class="view-btn live-profile-trigger"><i class='bx bx-file-find'></i> View Profile</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
`,

   voting: `
        <div class="view-header">
            <h1>Voting Management</h1>
            <div class="header-actions">
                <span class="status-badge pending" id="v-status">Phase: Paused</span>
            </div>
        </div>

        <div id="voting-banner" class="voting-banner locked">
            <i class='bx bxs-lock'></i>
            <span>VOTING IS CURRENTLY LOCKED: Public access is disabled.</span>
        </div>

        <div class="stats-grid" style="margin-bottom: 25px;">
            <div class="stat-card" style="border-left: 4px solid var(--jci-teal);">
                <div class="stat-info">
                    <span>Total Ballots Cast</span>
                    <h2 id="live-vote-count">1,205</h2>
                </div>
                <div class="live-indicator">
                    <span class="dot"></span> Live
                </div>
            </div>
            <div class="stat-card" style="border-left: 4px solid var(--jci-yellow);">
                <div class="stat-info">
                    <span>Time Remaining</span>
                    <h2 id="voting-timer">00:00:00</h2>
                </div>
                <i class='bx bx-timer' style="color: var(--jci-yellow); font-size: 24px;"></i>
            </div>
        </div>

        <div class="card" style="margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h3 style="margin-bottom: 5px;">Public Portal Control</h3>
                    <p style="color: var(--text-muted); font-size: 14px;">Launch the 2026 voting cycle or terminate early.</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" id="start-v" style="background: var(--jci-teal); padding: 10px 20px;">Open Voting</button>
                    <button class="btn-reject" id="stop-v" style="display:none; padding: 10px 20px;">Close Voting</button>
                </div>
            </div>
        </div>
        `,

    audit: `
        <div class="view-header">
            <h1>Final Results & Audit</h1>
            <div class="header-actions">
                <button class="btn-primary" style="background: var(--jci-blue);">
                    <i class='bx bxs-file-pdf'></i> Export Certified Results
                </button>
            </div>
        </div>

        <div class="result-section" style="margin-bottom: 40px;">
            <div class="category-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <i class='bx bxs-graduation' style="color: var(--jci-blue); font-size: 24px;"></i>
                <h2 style="font-size: 16px; color: var(--text-main);">Academic Excellence & Scholastic Achievement</h2>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                            <tr style="font-size: 11px; color: var(--text-muted); border-bottom: 2px solid var(--bg-slate);">
                                <th style="padding: 12px; width: 80px;">RANK</th>
                                <th style="padding: 12px;">NOMINEE</th>
                                <th style="padding: 12px;">VOTES</th>
                                <th style="padding: 12px;">PERCENTAGE</th>
                                <th style="padding: 12px;">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background: #f0fdf4;">
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 800; color: #166534;">#1</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                    <div style="font-weight: 600;">Osasere Idahosa</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">JCI-TOYP-001</div>
                                </td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">1,240</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">94/100</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                    <span class="status-badge status-honouree">Honouree</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600; color: var(--text-muted);">#2</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                    <div style="font-weight: 600;">Blessing Adebayo</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">JCI-TOYP-015</div>
                                </td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate); font-weight: 600;">1,105</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">88/100</td>
                                <td style="padding: 15px; border-bottom: 1px solid var(--bg-slate);">
                                    <span class="status-badge status-finalist">Finalist</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    
    content: `
        <div class="view-header">
            <h1>Content & Announcements</h1>
            <button class="btn-primary" id="publish-all-btn">
                <i class='bx bx-cloud-upload'></i> Publish Changes
            </button>
        </div>

        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px;">
            
            <div class="card">
                <h3 style="margin-bottom: 15px; font-size: 14px; color: var(--jci-blue);">Portal Landing Page Content</h3>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label class="modal-label">Hero Title</label>
                        <input type="text" value="JCI UNIBEN TOYP 2026" style="width: 100%; padding: 10px; border: 1px solid var(--bg-slate); border-radius: 6px;">
                    </div>
                    <div>
                        <label class="modal-label">Welcome Message (About)</label>
                        <textarea rows="6" style="width: 100%; padding: 10px; border: 1px solid var(--bg-slate); border-radius: 6px; font-family: inherit; font-size: 13px;">The Ten Outstanding Young Persons (TOYP) program serves to formally recognize young people who excel in their chosen fields...</textarea>
                    </div>
                </div>
            </div>

            <div class="card" style="border-top: 4px solid var(--jci-teal);">
                <h3 style="margin-bottom: 15px; font-size: 14px; color: var(--jci-teal);">Broadcast Announcement</h3>
                <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px;">This will appear as a banner on the public nomination site.</p>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <input type="text" id="announcement-title" placeholder="Announcement Title (e.g. Deadline Extended)" style="width: 100%; padding: 10px; border: 1px solid var(--bg-slate); border-radius: 6px;">
                    <textarea id="announcement-body" placeholder="Message body..." rows="3" style="width: 100%; padding: 10px; border: 1px solid var(--bg-slate); border-radius: 6px; font-family: inherit;"></textarea>
                    
                    <button class="btn-primary" style="background: var(--jci-teal); border: none; width: 100%;" id="send-announcement">
                        <i class='bx bx-send'></i> Post Announcement
                    </button>
                </div>

                <div style="margin-top: 20px; border-top: 1px solid var(--bg-slate); padding-top: 15px;">
                    <label class="modal-label">Active Banners</label>
                    <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; border: 1px solid #dcfce7; margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #166534;">"Nomination deadline: Feb 28th"</span>
                        <i class='bx bx-x' style="cursor: pointer; color: #166534;"></i>
                    </div>
                </div>
            </div>
        </div>
    `,
};

// 3. CORE CONTROLLER
document.addEventListener('DOMContentLoaded', () => {
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
    contentArea.innerHTML = views.overview;

    // Navigation Switcher Logic
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.classList.contains('logout')) return;
            e.preventDefault();
            
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            const viewKey = this.getAttribute('data-view');
            if (views[viewKey]) {
                contentArea.innerHTML = views[viewKey];
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

    applySecurityRoles();
});