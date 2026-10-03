/**
 * Mini Cricket Auction - Main Application Controller & UI Renderer
 */

class Application {
  constructor() {
    this.currentView = 'landing';
    this.playerViewMode = 'grid';
    this.cropper = null;
    this.croppedBase64 = null;
    this.unsubscribeStore = null;
    this.isAdminAuthenticated = false;

    this.init();
  }

  init() {
    this.initTheme();
    this.bindEvents();
    this.subscribeToStore();

    // Initial Render
    this.renderAll();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('mini_auction_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mini_auction_theme', next);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
  }

  subscribeToStore() {
    this.unsubscribeStore = store.subscribe((type) => {
      this.renderAll();
    });
  }

  bindEvents() {
    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Category Tabs in Players Directory
    const catTabs = document.getElementById('playerCatTabs');
    if (catTabs) {
      catTabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          catTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.renderPlayersDirectory();
        }
      });
    }

    // Search and Sort inputs
    document.getElementById('playerSearchInput')?.addEventListener('input', () => this.renderPlayersDirectory());
    document.getElementById('playerSortSelect')?.addEventListener('change', () => this.renderPlayersDirectory());

    // Organizer Tabs
    const orgTabs = document.getElementById('orgTabs');
    if (orgTabs) {
      orgTabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          orgTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          const targetTab = e.target.getAttribute('data-orgtab');
          document.querySelectorAll('.org-tab-pane').forEach(pane => pane.style.display = 'none');
          const activePane = document.getElementById(`orgtab-${targetTab}`);
          if (activePane) activePane.style.display = 'block';
        }
      });
    }
  }

  // --- View Routing & Navigation ---
  navigateTo(viewId, params = {}) {
    // Admin password check for organizer/admin view
    if (viewId === 'organizer') {
      const isAuth = this.isAdminAuthenticated || sessionStorage.getItem('mini_auction_admin_auth') === 'true';
      if (!isAuth) {
        this.openAdminAuthModal();
        return;
      }
    }

    this.currentView = viewId;

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) targetSection.classList.add('active');

    // Update Nav bar links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Mobile Nav links
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile dropdown menu
    document.querySelector('.nav-menu')?.classList.remove('active');

    // Params handling
    if (params.category && viewId === 'players') {
      const catTabs = document.getElementById('playerCatTabs');
      if (catTabs) {
        catTabs.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-cat') === params.category);
        });
      }
    }

    this.renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
      navMenu.classList.toggle('active');
    }
  }

  // --- Admin Password Auth Helpers ---
  openAdminAuthModal() {
    const modal = document.getElementById('modalAdminAuth');
    const input = document.getElementById('adminPasswordInput');
    if (input) input.value = '';
    if (modal) modal.classList.add('active');
  }

  closeAdminAuthModal() {
    document.getElementById('modalAdminAuth')?.classList.remove('active');
  }

  submitAdminAuth(e) {
    e.preventDefault();
    const input = document.getElementById('adminPasswordInput');
    const pwd = input ? input.value : '';
    if (pwd === '1234') {
      this.isAdminAuthenticated = true;
      sessionStorage.setItem('mini_auction_admin_auth', 'true');
      this.closeAdminAuthModal();
      this.showToast('✅ Admin Access Granted!', 'success');
      this.navigateTo('organizer');
    } else {
      this.showToast('⚠️ Incorrect Admin Password!', 'danger');
      if (input) input.value = '';
    }
  }

  lockAdmin() {
    this.isAdminAuthenticated = false;
    sessionStorage.removeItem('mini_auction_admin_auth');
    this.showToast('🔒 Admin section locked.', 'info');
    this.navigateTo('landing');
  }

  exportPlayersJSON() {
    const players = store.getPlayers();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "mini_auction_players.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.showToast('📋 Exported players to mini_auction_players.json', 'success');
  }

  // --- Player Full Details Modal ---
  openPlayerDetailsModal(playerId) {
    const player = store.getPlayerById(playerId);
    if (!player) return;

    const modal = document.getElementById('modalPlayerDetails');
    const body = document.getElementById('detPlayerBody');
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';

    const photoSrc = player.photo || defaultAvatar;
    const pName = player.name || player.fullName || 'Player';
    const pRole = player.role || player.category || 'Batsman';
    const pPhone = player.phone || player.mobile || '-';
    const catBadgeClass = pRole === 'Batsman' ? 'badge-batsman' : pRole === 'Bowler' ? 'badge-bowler' : pRole === 'All-Rounder' ? 'badge-allrounder' : 'badge-wicketkeeper';
    const statusClass = `status-${(player.status || 'registered').toLowerCase()}`;
    const formattedRegDate = player.registrationDate ? new Date(player.registrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Oct 1, 2026';

    let soldInfoHtml = '';
    if (player.soldToTeamId) {
      const team = store.getTeamById(player.soldToTeamId);
      soldInfoHtml = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-green); padding: 0.85rem; border-radius: var(--radius-md); margin-top: 1rem;">
          <div style="font-weight: 700; color: var(--accent-green); font-size: 0.95rem;">🎉 AUCTION SOLD DETAILS</div>
          <div style="font-size: 0.88rem; margin-top: 0.35rem;">
            Bought By: <strong>${team ? team.teamName : 'Team'}</strong> for <strong style="color: var(--accent-gold);">₹${(player.soldPrice || 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>
      `;
    }

    if (body) {
      body.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <img src="${photoSrc}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-gold); box-shadow: var(--shadow-md); margin-bottom: 0.75rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800;">${pName}</h2>
          <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center; margin-top: 0.35rem; flex-wrap: wrap;">
            <span class="badge ${catBadgeClass}">${pRole}</span>
            <span class="badge ${statusClass}">${player.status || 'Registered'}</span>
            <span class="badge badge-gold" style="background: rgba(245,158,11,0.15); color: var(--accent-gold); border: 1px solid var(--border-gold);">${player.id}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Tournament:</span> <div style="font-weight: 600; color: var(--accent-gold);">${player.tournamentName || 'Premier Mini Cricket League 2026'}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Base Price:</span> <div style="font-weight: 700; font-size: 1.1rem; color: var(--accent-gold);">₹${(player.basePrice || 2000).toLocaleString('en-IN')}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Phone / Mobile:</span> <div style="font-weight: 600;">📱 ${pPhone}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">City / Location:</span> <div style="font-weight: 600;">📍 ${player.city || 'Metropolis'}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Batting Style:</span> <div style="font-weight: 600;">🏏 ${player.battingStyle || 'Right Hand'}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Bowling Style:</span> <div style="font-weight: 600;">🎯 ${player.bowlingStyle || 'None'}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Registration Date:</span> <div style="font-weight: 600;">📅 ${formattedRegDate}</div></div>
          <div><span style="color: var(--text-secondary); font-size: 0.8rem;">Age / Exp:</span> <div style="font-weight: 600;">${player.age || 22} yrs (${player.experienceYears || 0} yrs exp)</div></div>
        </div>

        ${player.description ? `<div style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);"><strong>Bio:</strong> ${player.description}</div>` : ''}
        ${soldInfoHtml}
      `;
    }

    if (modal) modal.classList.add('active');
  }

  closePlayerDetailsModal() {
    document.getElementById('modalPlayerDetails')?.classList.remove('active');
  }

  // --- Toast Notification Helper ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast status-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'danger' ? '⚠️' : 'ℹ️'}</span> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  // --- Global Render Manager ---
  renderAll() {
    this.renderHeaderAndLanding();
    this.renderPlayersDirectory();
    this.renderTeamSquads();
    this.renderPublicLiveScreen();
    this.renderOrganizerDashboard();
    this.renderCaptainDashboard();
  }

  // --- 1. LANDING & HEADER RENDERER ---
  renderHeaderAndLanding() {
    const tournament = store.getTournament();
    const players = store.getPlayers();
    const teams = store.getTeams();

    // Nav Header
    const navTitle = document.getElementById('navTournamentTitle');
    if (navTitle) navTitle.textContent = tournament.name;

    // Landing Hero
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = tournament.name;

    const heroDate = document.getElementById('heroDate');
    if (heroDate) heroDate.textContent = tournament.date;

    const heroVenue = document.getElementById('heroVenue');
    if (heroVenue) heroVenue.textContent = tournament.venue || "Metropolis Cricket Ground (MCG)";

    const heroPurse = document.getElementById('heroPurse');
    if (heroPurse) heroPurse.textContent = `₹${tournament.pursePerTeam.toLocaleString('en-IN')}`;

    // Stats Counters (3 main stat cards: Total Players Registered, Total Teams, Total Purse)
    const elPlayers = document.getElementById('statPlayersCount');
    if (elPlayers) elPlayers.textContent = players.length;

    const elTeams = document.getElementById('statTeamsCount');
    if (elTeams) elTeams.textContent = teams.length;

    const totalPurse = teams.length * tournament.pursePerTeam;
    const elTotalPurse = document.getElementById('statTotalPurse');
    if (elTotalPurse) elTotalPurse.textContent = `₹${totalPurse.toLocaleString('en-IN')}`;

    // Calculate Purse Progress
    const spentPurse = teams.reduce((acc, t) => acc + (t.purse - (t.remainingPurse || 0)), 0);
    const pursePct = totalPurse > 0 ? Math.min(100, Math.round((spentPurse / totalPurse) * 100)) : 0;

    const progressBar = document.getElementById('purseProgressBar');
    if (progressBar) progressBar.style.width = `${pursePct}%`;

    const progressLabel = document.getElementById('purseProgressLabel');
    if (progressLabel) {
      progressLabel.textContent = `Spent: ₹${spentPurse.toLocaleString('en-IN')} / Total: ₹${totalPurse.toLocaleString('en-IN')} (${pursePct}%)`;
    }

    // Category Breakdown
    const elBatsmen = document.getElementById('catCountBatsmen');
    if (elBatsmen) elBatsmen.textContent = players.filter(p => (p.category === 'Batsman' || p.role === 'Batsman')).length;

    const elBowlers = document.getElementById('catCountBowlers');
    if (elBowlers) elBowlers.textContent = players.filter(p => (p.category === 'Bowler' || p.role === 'Bowler')).length;

    const elAll = document.getElementById('catCountAllRounders');
    if (elAll) elAll.textContent = players.filter(p => (p.category === 'All-Rounder' || p.role === 'All-Rounder')).length;

    const elKeepers = document.getElementById('catCountKeepers');
    if (elKeepers) elKeepers.textContent = players.filter(p => (p.category === 'Wicket-Keeper' || p.role === 'Wicket-Keeper')).length;

    // Rules & Contact
    const rulesText = document.getElementById('landingRulesText');
    if (rulesText) rulesText.textContent = tournament.rulesText;

    if (tournament.contactInfo) {
      const phoneDisplay = document.getElementById('contactPhoneDisplay');
      if (phoneDisplay) phoneDisplay.textContent = tournament.contactInfo.phone || '-';

      const emailDisplay = document.getElementById('contactEmailDisplay');
      if (emailDisplay) emailDisplay.textContent = tournament.contactInfo.email || '-';

      const cityDisplay = document.getElementById('contactCityDisplay');
      if (cityDisplay) cityDisplay.textContent = tournament.contactInfo.city || '-';
    }
  }

  // --- 2. PLAYERS DIRECTORY RENDERER ---
  setPlayerViewMode(mode) {
    this.playerViewMode = mode;
    this.renderPlayersDirectory();
  }

  renderPlayersDirectory() {
    const container = document.getElementById('playersContainer');
    if (!container) return;

    let players = store.getPlayers();
    const totalRegCount = players.length;

    // Update Header info
    const tournTitle = document.getElementById('playersTournamentName');
    if (tournTitle) tournTitle.textContent = "Premier Mini Cricket League 2026";

    const badgeTotal = document.getElementById('totalRegBadge');
    if (badgeTotal) badgeTotal.textContent = `Total Registrations: ${totalRegCount} Players`;

    // Filter by Active Category Tab
    const activeTab = document.querySelector('#playerCatTabs .tab-btn.active');
    const selectedCat = activeTab ? activeTab.getAttribute('data-cat') : 'ALL';
    if (selectedCat && selectedCat !== 'ALL') {
      players = players.filter(p => (p.category === selectedCat || p.role === selectedCat));
    }

    // Filter by Role Dropdown Select
    const selectedRole = document.getElementById('playerRoleSelect')?.value || 'ALL';
    if (selectedRole && selectedRole !== 'ALL') {
      players = players.filter(p => (p.role === selectedRole || p.category === selectedRole));
    }

    // Filter by Selected Status
    const selectedStatus = document.getElementById('playerStatusSelect')?.value || 'ALL';
    if (selectedStatus && selectedStatus !== 'ALL') {
      players = players.filter(p => p.status === selectedStatus);
    }

    // Search Filter (Search by name or phone)
    const query = (document.getElementById('playerSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
      players = players.filter(p => {
        const nameVal = (p.name || p.fullName || '').toLowerCase();
        const phoneVal = (p.phone || p.mobile || '').toLowerCase();
        const idVal = (p.id || '').toLowerCase();
        const cityVal = (p.city || '').toLowerCase();
        return nameVal.includes(query) || phoneVal.includes(query) || idVal.includes(query) || cityVal.includes(query);
      });
    }

    // Sort Filter
    const sortVal = document.getElementById('playerSortSelect')?.value || 'name';
    players.sort((a, b) => {
      const nameA = a.name || a.fullName || '';
      const nameB = b.name || b.fullName || '';
      if (sortVal === 'name') return nameA.localeCompare(nameB);
      if (sortVal === 'price-asc') return (a.basePrice || 0) - (b.basePrice || 0);
      if (sortVal === 'price-desc') return (b.basePrice || 0) - (a.basePrice || 0);
      if (sortVal === 'category') return (a.role || a.category || '').localeCompare(b.role || b.category || '');
      return 0;
    });

    if (players.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md);">No players found matching current search/filters.</div>`;
      return;
    }

    let html = '';
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';

    players.forEach(p => {
      const photoSrc = p.photo || defaultAvatar;
      const pRole = p.role || p.category || 'Batsman';
      const pName = p.name || p.fullName || 'Player';
      const catBadgeClass = pRole === 'Batsman' ? 'badge-batsman' : pRole === 'Bowler' ? 'badge-bowler' : pRole === 'All-Rounder' ? 'badge-allrounder' : 'badge-wicketkeeper';
      const statusClass = `status-${(p.status || 'registered').toLowerCase()}`;
      const tournName = p.tournamentName || "Premier Mini Cricket League 2026";

      html += `
        <div class="player-card" style="cursor: pointer;" onclick="app.openPlayerDetailsModal('${p.id}')">
          <div class="player-card-image-wrapper">
            <img src="${photoSrc}" class="player-card-img" alt="${pName}">
            <div class="player-card-id-badge">${p.id}</div>
            <div class="player-card-status">
              <span class="badge ${statusClass}">${p.status || 'Registered'}</span>
            </div>
          </div>
          <div class="player-card-body">
            <div>
              <div class="player-card-name" style="font-size: 1.15rem; font-weight: 700;">${pName}</div>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
                <span class="badge ${catBadgeClass}">${pRole}</span>
              </div>
            </div>
            <div class="player-card-meta" style="margin: 0.75rem 0;">
              <div class="player-card-meta-row">
                <span>Tournament:</span>
                <strong style="color: var(--accent-gold); font-size: 0.78rem;">${tournName}</strong>
              </div>
              <div class="player-card-meta-row">
                <span>Batting / Bowling:</span>
                <span style="font-size: 0.82rem;">${p.battingStyle || '-'} / ${p.bowlingStyle || '-'}</span>
              </div>
              ${p.phone || p.mobile ? `<div class="player-card-meta-row"><span>Mobile:</span><span>📱 ${p.phone || p.mobile}</span></div>` : ''}
            </div>
            <div class="player-card-footer">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Base Price</div>
                <div class="price-tag">₹${(p.basePrice || 2000).toLocaleString('en-IN')}</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.openPlayerDetailsModal('${p.id}')">View Details</button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- 3. TEAM SQUADS RENDERER ---
  renderTeamSquads() {
    const tabsContainer = document.getElementById('teamTabs');
    const rosterContainer = document.getElementById('teamSquadContainer');
    if (!tabsContainer || !rosterContainer) return;

    const teams = store.getTeams();
    const players = store.getPlayers();
    if (teams.length === 0) return;

    // Render Tabs
    let selectedTeamId = localStorage.getItem('mini_auction_active_squad_team') || teams[0].id;
    if (!teams.some(t => t.id === selectedTeamId)) selectedTeamId = teams[0].id;

    let tabsHtml = '';
    teams.forEach(t => {
      const activeClass = t.id === selectedTeamId ? 'active' : '';
      tabsHtml += `<button class="tab-btn ${activeClass}" onclick="app.selectSquadTeam('${t.id}')">${t.teamName}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    // Active Team Details
    const team = teams.find(t => t.id === selectedTeamId) || teams[0];
    const squadPlayers = players.filter(p => team.squad.includes(p.id));
    const spentPurse = team.purse - team.remainingPurse;
    const defaultCaptainPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop';

    let html = `
      <div class="stat-card" style="margin-bottom: 1.5rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <img src="${team.captainPhoto || defaultCaptainPhoto}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">
          <div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem;">${team.teamName}</h3>
            <div style="color: var(--accent-gold); font-weight: 600;">Captain: ${team.captainName}</div>
          </div>
        </div>
        <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-left: auto;">
          <div>
            <div class="stat-label">Total Purse</div>
            <div class="stat-value">₹${team.purse.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div class="stat-label">Spent Purse</div>
            <div class="stat-value" style="color: var(--accent-red);">₹${spentPurse.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div class="stat-label">Remaining Purse</div>
            <div class="stat-value" style="color: var(--accent-green);">₹${team.remainingPurse.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div class="stat-label">Squad Count</div>
            <div class="stat-value">${squadPlayers.length} / ${store.getTournament().maxSquadSize}</div>
          </div>
        </div>
      </div>
    `;

    if (squadPlayers.length === 0) {
      html += `<div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md);">No players acquired by ${team.teamName} yet in auction.</div>`;
    } else {
      html += `
        <div class="players-grid">
      `;
      squadPlayers.forEach(p => {
        const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';
        html += `
          <div class="player-card">
            <div class="player-card-image-wrapper">
              <img src="${p.photo || defaultAvatar}" class="player-card-img">
              <div class="player-card-id-badge">${p.id}</div>
              <div class="player-card-status"><span class="badge status-sold">Bought</span></div>
            </div>
            <div class="player-card-body">
              <div>
                <div class="player-card-name">${p.fullName}</div>
                <span class="badge badge-batsman">${p.category}</span>
              </div>
              <div class="player-card-meta">
                <div>Style: <strong>${p.battingStyle} / ${p.bowlingStyle}</strong></div>
              </div>
              <div class="player-card-footer">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Purchase Price</span>
                <span class="price-tag" style="color: var(--accent-green);">₹${(p.soldPrice || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    rosterContainer.innerHTML = html;
  }

  selectSquadTeam(teamId) {
    localStorage.setItem('mini_auction_active_squad_team', teamId);
    this.renderTeamSquads();
  }

  // --- 4. PUBLIC SPECTATOR LIVE RENDERER ---
  renderPublicLiveScreen() {
    const auctionState = store.getAuctionState();
    const player = auctionState.currentPlayerId ? store.getPlayerById(auctionState.currentPlayerId) : null;
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';

    if (player) {
      document.getElementById('pubPlayerPhoto').src = player.photo || defaultAvatar;
      document.getElementById('pubPlayerName').textContent = player.fullName;
      document.getElementById('pubPlayerId').textContent = player.id;
      document.getElementById('pubPlayerCategory').textContent = player.category;
      document.getElementById('pubPlayerBatting').textContent = player.battingStyle;
      document.getElementById('pubPlayerBowling').textContent = player.bowlingStyle;
      document.getElementById('pubPlayerBasePrice').textContent = `₹${(player.basePrice || 2000).toLocaleString('en-IN')}`;
    } else {
      document.getElementById('pubPlayerPhoto').src = defaultAvatar;
      document.getElementById('pubPlayerName').textContent = 'Waiting for Auction...';
      document.getElementById('pubPlayerId').textContent = 'PLY-0000';
    }

    // Bid display
    document.getElementById('pubCurrentBid').textContent = `₹${auctionState.currentBid.toLocaleString('en-IN')}`;
    const highestTeam = auctionState.highestBidTeamId ? store.getTeamById(auctionState.highestBidTeamId) : null;
    document.getElementById('pubBidderTeamName').textContent = highestTeam ? highestTeam.teamName : 'No Bids Yet';

    const timerBadge = document.getElementById('pubTimerBadge');
    if (timerBadge) {
      timerBadge.textContent = `⏱️ ${auctionState.timerSeconds}s`;
      timerBadge.classList.toggle('pulse', auctionState.timerSeconds <= 5 && auctionState.status === 'BIDDING');
    }

    // Feed Log
    const feed = document.getElementById('pubBidFeed');
    if (feed && auctionState.bidHistory) {
      if (auctionState.bidHistory.length === 0) {
        feed.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No bids placed yet.</div>`;
      } else {
        feed.innerHTML = auctionState.bidHistory.map(b => `
          <div class="bid-feed-item">
            <div><strong>${b.teamName}</strong> <span style="color: var(--text-muted); font-size: 0.75rem;">${b.timestamp}</span></div>
            <div style="color: var(--accent-gold); font-weight: 700;">₹${b.amount.toLocaleString('en-IN')}</div>
          </div>
        `).join('');
      }
    }
  }

  // --- 5. ORGANIZER DASHBOARD RENDERER ---
  renderOrganizerDashboard() {
    const players = store.getPlayers();
    const tournament = store.getTournament();
    const teams = store.getTeams();
    const auctionState = store.getAuctionState();

    // 1. Available Player Selector Dropdown
    const select = document.getElementById('orgPlayerSelect');
    if (select) {
      const availPlayers = players.filter(p => p.status === 'Available' || p.status === 'Pending' || p.status === 'Unsold');
      select.innerHTML = `<option value="">-- Choose Player for Bidding (${availPlayers.length} available) --</option>` +
        availPlayers.map(p => `<option value="${p.id}">${p.id} - ${p.fullName} (${p.category} - ${p.status} - ₹${(p.basePrice || 2000).toLocaleString('en-IN')})</option>`).join('');
      if (auctionState.currentPlayerId) select.value = auctionState.currentPlayerId;
    }

    // 2. Active Auction Card
    const currentPlayer = auctionState.currentPlayerId ? store.getPlayerById(auctionState.currentPlayerId) : null;
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';
    if (currentPlayer) {
      document.getElementById('orgPlayerPhoto').src = currentPlayer.photo || defaultAvatar;
      document.getElementById('orgPlayerName').textContent = currentPlayer.fullName;
      document.getElementById('orgPlayerId').textContent = currentPlayer.id;
      document.getElementById('orgPlayerCategory').textContent = currentPlayer.category;
      document.getElementById('orgPlayerStyles').textContent = `Batting: ${currentPlayer.battingStyle} | Bowling: ${currentPlayer.bowlingStyle}`;
    }
    document.getElementById('orgCurrentBid').textContent = `₹${auctionState.currentBid.toLocaleString('en-IN')}`;
    const highestTeam = auctionState.highestBidTeamId ? store.getTeamById(auctionState.highestBidTeamId) : null;
    document.getElementById('orgBidderTeamName').textContent = highestTeam ? highestTeam.teamName : 'None';
    document.getElementById('orgTimerBadge').textContent = `⏱️ ${auctionState.timerSeconds}s`;

    const feed = document.getElementById('orgBidFeed');
    if (feed && auctionState.bidHistory) {
      feed.innerHTML = auctionState.bidHistory.map(b => `
        <div class="bid-feed-item">
          <div><strong>${b.teamName}</strong></div>
          <div style="color: var(--accent-gold); font-weight: 700;">₹${b.amount.toLocaleString('en-IN')}</div>
        </div>
      `).join('');
    }

    // 3. Player Approvals Table
    const approvalsBody = document.getElementById('orgApprovalsTable');
    if (approvalsBody) {
      if (players.length === 0) {
        approvalsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No registered players.</td></tr>`;
      } else {
        approvalsBody.innerHTML = players.map(p => `
          <tr>
            <td><strong>${p.id}</strong></td>
            <td><img src="${p.photo || defaultAvatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;"></td>
            <td><strong>${p.fullName}</strong>${p.mobile ? `<br><small style="color: var(--text-muted); font-size: 0.78rem;">📱 ${p.mobile}</small>` : ''}</td>
            <td><span class="badge badge-batsman">${p.category}</span></td>
            <td>${p.city}</td>
            <td>₹${(p.basePrice || 2000).toLocaleString('en-IN')}</td>
            <td><span class="badge status-${(p.status || 'pending').toLowerCase()}">${p.status || 'Pending'}</span></td>
            <td>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                ${p.status !== 'Available' ? `<button class="btn btn-success btn-sm" onclick="organizer.approvePlayer('${p.id}')">Approve</button>` : ''}
                ${p.status !== 'Rejected' ? `<button class="btn btn-danger btn-sm" onclick="organizer.rejectPlayer('${p.id}')">Reject</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="if(confirm('Are you sure you want to delete player ${p.fullName}?')) organizer.deletePlayer('${p.id}')" title="Delete Player">🗑️</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 4. Teams Grid
    const teamsGrid = document.getElementById('orgTeamsGrid');
    if (teamsGrid) {
      teamsGrid.innerHTML = teams.map(t => `
        <div class="player-card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="font-family: var(--font-display);">${t.teamName}</h3>
            <span class="badge status-approved">${t.shortCode}</span>
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem;">
            <div>Captain: <strong>${t.captainName}</strong></div>
            <div>Captain PIN: <strong>${t.captainPin}</strong></div>
            <div>Purse: <strong>₹${t.purse.toLocaleString('en-IN')}</strong></div>
            <div>Remaining: <strong style="color: var(--accent-green);">₹${t.remainingPurse.toLocaleString('en-IN')}</strong></div>
            <div>Squad Size: <strong>${t.squad.length} / ${tournament.maxSquadSize}</strong></div>
          </div>
          <div style="margin-top: 1rem;">
            <button class="btn btn-secondary btn-sm" onclick="app.openEditTeamModal('${t.id}')">✏️ Edit Team</button>
          </div>
        </div>
      `).join('');
    }

    // 5. Config Form Fields
    document.getElementById('cfgName').value = tournament.name;
    document.getElementById('cfgDate').value = tournament.date;
    document.getElementById('cfgVenue').value = tournament.venue;
    document.getElementById('cfgPurse').value = tournament.pursePerTeam;
    document.getElementById('cfgMinSquad').value = tournament.minSquadSize;
    document.getElementById('cfgMaxSquad').value = tournament.maxSquadSize;
    document.getElementById('cfgMinBatsmen').value = tournament.minBatsmen;
    document.getElementById('cfgMinBowlers').value = tournament.minBowlers;
    document.getElementById('cfgMinAllRounders').value = tournament.minAllRounders;
    document.getElementById('cfgMinKeepers').value = tournament.minWicketKeepers;
    document.getElementById('cfgBasePrice').value = tournament.defaultBasePrice;
    document.getElementById('cfgBidStep').value = tournament.bidIncrement;
    if (document.getElementById('cfgPhone')) document.getElementById('cfgPhone').value = tournament.contactInfo ? (tournament.contactInfo.phone || '') : '';
    if (document.getElementById('cfgEmail')) document.getElementById('cfgEmail').value = tournament.contactInfo ? (tournament.contactInfo.email || '') : '';
    if (document.getElementById('cfgCity')) document.getElementById('cfgCity').value = tournament.contactInfo ? (tournament.contactInfo.city || '') : '';
    document.getElementById('cfgRules').value = tournament.rulesText;

    // 6. Unsold Pool Table
    const unsoldBody = document.getElementById('orgUnsoldTable');
    if (unsoldBody) {
      const unsoldPlayers = players.filter(p => p.status === 'Unsold');
      if (unsoldPlayers.length === 0) {
        unsoldBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No unsold players currently.</td></tr>`;
      } else {
        unsoldBody.innerHTML = unsoldPlayers.map(p => `
          <tr>
            <td><strong>${p.id}</strong></td>
            <td><img src="${p.photo || defaultAvatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;"></td>
            <td>${p.fullName}</td>
            <td><span class="badge badge-batsman">${p.category}</span></td>
            <td>₹${(p.basePrice || 2000).toLocaleString('en-IN')}</td>
            <td><button class="btn btn-primary btn-sm" onclick="organizer.resetUnsoldPlayer('${p.id}')">Return to Auction Pool</button></td>
          </tr>
        `).join('');
      }
    }
  }

  orgSelectPlayer() {
    const select = document.getElementById('orgPlayerSelect');
    if (!select || !select.value) {
      this.showToast('Please choose an available player from dropdown.', 'info');
      return;
    }
    auction.selectPlayerForAuction(select.value);
    this.showToast('Player loaded to auction arena!', 'success');
  }

  orgMarkSold() {
    const res = auction.markSold();
    if (res.success) {
      this.showToast(`🎉 SOLD! ${res.player.fullName} bought by ${res.team.teamName} for ₹${res.amount.toLocaleString('en-IN')}!`, 'success');
    } else {
      this.showToast(res.message || 'Cannot mark SOLD.', 'danger');
    }
  }

  orgMarkUnsold() {
    const res = auction.markUnsold();
    if (res.success) {
      this.showToast(`Player marked UNSOLD and stored in unsold pool.`, 'info');
    }
  }

  saveOrgSettings(e) {
    e.preventDefault();
    const formData = {
      name: document.getElementById('cfgName').value,
      date: document.getElementById('cfgDate').value,
      venue: document.getElementById('cfgVenue').value,
      pursePerTeam: document.getElementById('cfgPurse').value,
      minSquadSize: document.getElementById('cfgMinSquad').value,
      maxSquadSize: document.getElementById('cfgMaxSquad').value,
      minBatsmen: document.getElementById('cfgMinBatsmen').value,
      minBowlers: document.getElementById('cfgMinBowlers').value,
      minAllRounders: document.getElementById('cfgMinAllRounders').value,
      minWicketKeepers: document.getElementById('cfgMinKeepers').value,
      defaultBasePrice: document.getElementById('cfgBasePrice').value,
      bidIncrement: document.getElementById('cfgBidStep').value,
      contactPhone: document.getElementById('cfgPhone')?.value || '',
      contactEmail: document.getElementById('cfgEmail')?.value || '',
      contactCity: document.getElementById('cfgCity')?.value || '',
      rulesText: document.getElementById('cfgRules').value
    };

    organizer.saveTournamentSettings(formData);
    this.showToast('Tournament settings saved successfully!', 'success');
  }

  // --- 6. CAPTAIN DASHBOARD RENDERER ---
  renderCaptainDashboard() {
    const teams = store.getTeams();
    const activeTeam = captain.getActiveTeam();
    const auctionState = store.getAuctionState();
    const tournament = store.getTournament();
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';
    const defaultCaptainPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop';

    // Team selector dropdown
    const select = document.getElementById('capTeamSelect');
    if (select) {
      select.innerHTML = teams.map(t => `<option value="${t.id}" ${t.id === activeTeam.id ? 'selected' : ''}>${t.teamName} (${t.captainName})</option>`).join('');
    }

    // Captain Header Card
    const headerCard = document.getElementById('captainHeaderCard');
    if (headerCard && activeTeam) {
      headerCard.innerHTML = `
        <div class="stat-card" style="flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${activeTeam.captainPhoto || defaultCaptainPhoto}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">
            <div>
              <h3 style="font-family: var(--font-display); font-size: 1.4rem;">${activeTeam.teamName}</h3>
              <div style="color: var(--accent-gold); font-size: 0.9rem;">Captain: ${activeTeam.captainName}</div>
            </div>
          </div>
          <div style="display: flex; gap: 1.5rem; margin-left: auto; flex-wrap: wrap;">
            <div>
              <div class="stat-label">Purse Balance</div>
              <div class="stat-value" style="color: var(--accent-green);">₹${activeTeam.remainingPurse.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div class="stat-label">Squad Slots</div>
              <div class="stat-value">${activeTeam.squad.length} / ${tournament.maxSquadSize}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Category Deficiencies
    const defBar = document.getElementById('captainDeficiencyBar');
    if (defBar && activeTeam) {
      const defs = captain.getCategoryDeficiencies(activeTeam.id);
      if (defs.length > 0) {
        defBar.innerHTML = `<div style="background: rgba(245, 158, 11, 0.12); border: 1px solid var(--border-gold); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; color: var(--accent-gold);"><strong>Required Category Warnings:</strong> ${defs.join(' • ')}</div>`;
      } else {
        defBar.innerHTML = `<div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--accent-green); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; color: var(--accent-green);">All minimum squad category requirements fulfilled!</div>`;
      }
    }

    // Current Bidding Card
    const currentPlayer = auctionState.currentPlayerId ? store.getPlayerById(auctionState.currentPlayerId) : null;
    if (currentPlayer) {
      document.getElementById('capPlayerPhoto').src = currentPlayer.photo || defaultAvatar;
      document.getElementById('capPlayerName').textContent = currentPlayer.fullName;
      document.getElementById('capPlayerId').textContent = currentPlayer.id;
      document.getElementById('capPlayerCategory').textContent = currentPlayer.category;
      document.getElementById('capPlayerStyles').textContent = `Batting: ${currentPlayer.battingStyle} | Bowling: ${currentPlayer.bowlingStyle}`;
    } else {
      document.getElementById('capPlayerPhoto').src = defaultAvatar;
      document.getElementById('capPlayerName').textContent = 'Waiting for Organizer...';
      document.getElementById('capPlayerId').textContent = 'PLY-0000';
    }

    document.getElementById('capCurrentBid').textContent = `₹${auctionState.currentBid.toLocaleString('en-IN')}`;
    const highestTeam = auctionState.highestBidTeamId ? store.getTeamById(auctionState.highestBidTeamId) : null;
    document.getElementById('capBidderTeamName').textContent = highestTeam ? highestTeam.teamName : 'None';
    document.getElementById('capTimerBadge').textContent = `⏱️ ${auctionState.timerSeconds}s`;

    // Button states
    const btnBid = document.getElementById('btnCapSubmitBid');
    const errBox = document.getElementById('capBidError');

    if (btnBid && errBox) {
      let nextBid = auctionState.currentBid;
      if (auctionState.highestBidTeamId) nextBid += tournament.bidIncrement;
      btnBid.textContent = `🔨 PLACE BID (₹${nextBid.toLocaleString('en-IN')})`;

      // Disable conditions
      if (auctionState.status !== 'BIDDING') {
        btnBid.disabled = true;
        errBox.textContent = 'Bidding paused or idle.';
      } else if (activeTeam.remainingPurse < nextBid) {
        btnBid.disabled = true;
        errBox.textContent = `Insufficient Purse balance (₹${activeTeam.remainingPurse.toLocaleString('en-IN')}).`;
      } else if (activeTeam.squad.length >= tournament.maxSquadSize) {
        btnBid.disabled = true;
        errBox.textContent = `Squad is full (${tournament.maxSquadSize} players).`;
      } else if (auctionState.highestBidTeamId === activeTeam.id) {
        btnBid.disabled = true;
        errBox.textContent = 'Your team currently holds highest bid!';
      } else {
        btnBid.disabled = false;
        errBox.textContent = '';
      }
    }

    // Bid feed
    const feed = document.getElementById('capBidFeed');
    if (feed && auctionState.bidHistory) {
      feed.innerHTML = auctionState.bidHistory.map(b => `
        <div class="bid-feed-item">
          <div><strong>${b.teamName}</strong></div>
          <div style="color: var(--accent-gold); font-weight: 700;">₹${b.amount.toLocaleString('en-IN')}</div>
        </div>
      `).join('');
    }
  }

  capPlaceBid() {
    const activeTeam = captain.getActiveTeam();
    if (!activeTeam) return;

    const res = auction.placeBid(activeTeam.id);
    if (res.success) {
      this.showToast(`Bid of ₹${res.amount.toLocaleString('en-IN')} submitted!`, 'success');
    } else {
      this.showToast(res.message || 'Bid failed.', 'danger');
    }
  }

  // --- PHOTO MANAGEMENT & CROPPER MODAL ---
  resetRegisterForm() {
    const form = document.getElementById('playerRegisterForm');
    if (form) form.reset();
    this.croppedBase64 = null;
    const preview = document.getElementById('registerPhotoPreview');
    if (preview) {
      preview.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop';
    }
    const fileInput = document.getElementById('filePhotoInput');
    if (fileInput) fileInput.value = '';
  }

  openRegisterModal() {
    this.resetRegisterForm();
    document.getElementById('modalRegister')?.classList.add('active');
  }

  closeRegisterModal() {
    document.getElementById('modalRegister')?.classList.remove('active');
  }

  handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      this.openCropperModal(evt.target.result);
    };
    reader.readAsDataURL(file);
  }

  openCropperModal(imageSrc) {
    const modal = document.getElementById('modalCropper');
    const wrapper = document.getElementById('cropperWrapper');
    if (!modal || !wrapper) return;

    modal.classList.add('active');
    wrapper.innerHTML = `<div id="cropperTarget"></div>`;

    this.cropper = new CanvasCropper('cropperTarget', { outputWidth: 300, outputHeight: 300 });
    this.cropper.loadImage(imageSrc);
  }

  closeCropperModal() {
    document.getElementById('modalCropper')?.classList.remove('active');
  }

  applyCrop() {
    if (this.cropper) {
      this.croppedBase64 = this.cropper.getCroppedBase64();
      const preview = document.getElementById('registerPhotoPreview');
      if (preview) preview.src = this.croppedBase64;
    }
    this.closeCropperModal();
    this.showToast('Profile photo cropped successfully!', 'success');
  }

  // --- PLAYER REGISTRATION SUBMIT ---
  submitPlayerRegistration(e) {
    e.preventDefault();

    const fullName = (document.getElementById('regFullName').value || '').trim();
    const mobile = (document.getElementById('regMobile').value || '').trim();
    const email = (document.getElementById('regEmail').value || '').trim();

    if (!fullName || !mobile) {
      this.showToast('Please provide both Full Name and Mobile Number.', 'danger');
      return;
    }

    const players = store.getPlayers();

    // Prevent registration of duplicate mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) {
      const existingMobile = players.find(p => (p.phone && p.phone.replace(/\D/g, '') === cleanMobile) || (p.mobile && p.mobile.replace(/\D/g, '') === cleanMobile));
      if (existingMobile) {
        this.showToast(`Mobile number ${mobile} is already registered (${existingMobile.fullName || existingMobile.name} - ${existingMobile.id})!`, 'danger');
        return;
      }
    }

    // Check duplicate full name warning
    const existingName = players.find(p => (p.fullName || p.name || '').toLowerCase().trim() === fullName.toLowerCase());
    if (existingName) {
      if (!confirm(`A player named "${fullName}" (${existingName.id}) is already registered. Do you still want to register another player with the same name?`)) {
        return;
      }
    }

    const regRole = document.getElementById('regCategory').value;
    const basePriceVal = parseFloat(document.getElementById('regBasePrice')?.value);
    const basePrice = !isNaN(basePriceVal) && basePriceVal > 0 ? basePriceVal : (store.getTournament().defaultBasePrice || 2000);

    const playerData = {
      name: fullName,
      fullName: fullName,
      phone: mobile,
      mobile: mobile,
      role: regRole,
      category: regRole,
      basePrice: basePrice,
      tournamentName: "Premier Mini Cricket League 2026",
      photo: this.croppedBase64 || '',
      registrationDate: new Date().toISOString(),
      status: "Registered",
      city: (document.getElementById('regCity').value || '').trim(),
      age: parseInt(document.getElementById('regAge').value, 10) || 20,
      email: email,
      battingStyle: document.getElementById('regBattingStyle').value,
      bowlingStyle: document.getElementById('regBowlingStyle').value,
      experienceYears: parseInt(document.getElementById('regExperience').value, 10) || 0,
      prevExperience: (document.getElementById('regPrevExp').value || '').trim(),
      description: (document.getElementById('regDescription').value || '').trim(),
      displayName: (document.getElementById('regDisplayName').value || '').trim() || fullName.split(' ')[0]
    };

    const newPlayer = store.addPlayer(playerData);
    this.resetRegisterForm();
    this.closeRegisterModal();
    this.navigateTo('players');
    this.showToast("Player Registered Successfully", "success");
  }

  handleCaptainPhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      this.captainPhotoBase64 = evt.target.result;
      const preview = document.getElementById('captainPhotoPreview');
      if (preview) preview.src = this.captainPhotoBase64;
    };
    reader.readAsDataURL(file);
  }

  // --- TEAM ADD / EDIT MODAL ---
  openAddTeamModal() {
    this.captainPhotoBase64 = null;
    document.getElementById('editingTeamId').value = '';
    document.getElementById('teamNameInput').value = '';
    document.getElementById('teamCodeInput').value = '';
    document.getElementById('teamCaptainInput').value = '';
    document.getElementById('teamPinInput').value = '1234';
    const defaultCapPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop';
    if (document.getElementById('captainPhotoPreview')) document.getElementById('captainPhotoPreview').src = defaultCapPhoto;
    if (document.getElementById('modalTeamTitle')) document.getElementById('modalTeamTitle').textContent = '🧢 Register Team & Captain';
    if (document.getElementById('btnSaveTeam')) document.getElementById('btnSaveTeam').textContent = 'Register Team & Captain';
    document.getElementById('modalAddTeam')?.classList.add('active');
  }

  openEditTeamModal(teamId) {
    const team = store.getTeamById(teamId);
    if (!team) return;
    this.captainPhotoBase64 = team.captainPhoto || null;
    document.getElementById('editingTeamId').value = team.id;
    document.getElementById('teamNameInput').value = team.teamName;
    document.getElementById('teamCodeInput').value = team.shortCode;
    document.getElementById('teamCaptainInput').value = team.captainName;
    document.getElementById('teamPinInput').value = team.captainPin;
    const defaultCapPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop';
    if (document.getElementById('captainPhotoPreview')) document.getElementById('captainPhotoPreview').src = team.captainPhoto || defaultCapPhoto;
    if (document.getElementById('modalTeamTitle')) document.getElementById('modalTeamTitle').textContent = '✏️ Edit Team & Captain Info';
    if (document.getElementById('btnSaveTeam')) document.getElementById('btnSaveTeam').textContent = 'Update Team & Captain Info';
    document.getElementById('modalAddTeam')?.classList.add('active');
  }

  closeAddTeamModal() {
    document.getElementById('modalAddTeam')?.classList.remove('active');
  }

  submitAddTeam(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingTeamId').value;
    const teamData = {
      teamName: document.getElementById('teamNameInput').value,
      shortCode: document.getElementById('teamCodeInput').value,
      captainName: document.getElementById('teamCaptainInput').value,
      captainPin: document.getElementById('teamPinInput').value,
      captainPhoto: this.captainPhotoBase64 || ''
    };

    if (editingId) {
      store.updateTeam(editingId, teamData);
      this.showToast('Team & Captain details updated successfully!', 'success');
    } else {
      const newTeam = store.addTeam(teamData);
      this.showToast(`Team '${newTeam.teamName}' and Captain '${newTeam.captainName}' registered successfully!`, 'success');
    }
    this.closeAddTeamModal();
    this.renderAll();
  }
}

window.app = new Application();
