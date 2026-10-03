/**
 * Mini Cricket Auction - Data Store Engine
 * Handles state management, persistence (LocalStorage + IndexedDB),
 * event broadcasting across browser tabs, and helper calculations.
 */

const STORAGE_KEY_TOURNAMENT = 'mini_auction_tournament';
const STORAGE_KEY_TEAMS = 'mini_auction_teams';
const STORAGE_KEY_PLAYERS = 'players';
const STORAGE_KEY_AUCTION = 'mini_auction_state';

// Pre-seeded Default Data
const DEFAULT_TOURNAMENT = {
  id: 'TRN-2026',
  name: 'Premier Mini Cricket League 2026',
  date: '2026-10-15',
  venue: 'Metropolis Cricket Ground (MCG)',
  logo: '',
  banner: '',
  pursePerTeam: 100000,
  numberOfTeams: 6,
  minSquadSize: 12,
  maxSquadSize: 15,
  minBatsmen: 5,
  minBowlers: 4,
  minAllRounders: 2,
  minWicketKeepers: 1,
  maxWicketKeepers: 3,
  defaultBasePrice: 2000,
  bidIncrement: 500,
  timerDuration: 30,
  rulesText: `1. Each team starts with an auction purse of ₹1,00,000.\n2. Minimum squad size is 12 players and maximum is 15 players.\n3. Squad must contain at least 5 Batsmen, 4 Bowlers, 2 All-Rounders, and 1 Wicket-Keeper.\n4. Bids cannot exceed the team's remaining purse balance.\n5. Decision of the Tournament Organizer in auction room is final.`,
  contactInfo: {
    phone: '+91 98765 43210',
    email: 'organizer@pmcl2026.org',
    city: 'Metropolis'
  }
};

const DEFAULT_TEAMS = [
  {
    id: 'TEAM-01',
    teamName: 'Royal Warriors',
    shortCode: 'RW',
    logo: '',
    captainName: 'Ravi Kumar',
    captainPhoto: '',
    captainPin: '1111',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  },
  {
    id: 'TEAM-02',
    teamName: 'Super Strikers',
    shortCode: 'SS',
    logo: '',
    captainName: 'Vikram Singh',
    captainPhoto: '',
    captainPin: '2222',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  },
  {
    id: 'TEAM-03',
    teamName: 'Thunder Titans',
    shortCode: 'TT',
    logo: '',
    captainName: 'Anand Patel',
    captainPhoto: '',
    captainPin: '3333',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  },
  {
    id: 'TEAM-04',
    teamName: 'Phoenix Kings',
    shortCode: 'PK',
    logo: '',
    captainName: 'Suresh Raina',
    captainPhoto: '',
    captainPin: '4444',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  },
  {
    id: 'TEAM-05',
    teamName: 'Cyber Panthers',
    shortCode: 'CP',
    logo: '',
    captainName: 'Dinesh Karthik',
    captainPhoto: '',
    captainPin: '5555',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  },
  {
    id: 'TEAM-06',
    teamName: 'Solar Chargers',
    shortCode: 'SC',
    logo: '',
    captainName: 'Kedar Jadhav',
    captainPhoto: '',
    captainPin: '6666',
    purse: 100000,
    remainingPurse: 100000,
    squad: []
  }
];

const DEFAULT_PLAYERS = [
  // Batsmen
  {
    id: 'PLY-1001',
    fullName: 'Rohit Sharma',
    displayName: 'Rohit',
    photo: '',
    age: 26,
    mobile: '9812345601',
    email: 'rohit@cricket.org',
    city: 'Mumbai',
    category: 'Batsman',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Spin',
    experienceYears: 5,
    prevExperience: 'District League Winner 2025',
    description: 'Aggressive opening batsman known for big hits.',
    basePrice: 5000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1002',
    fullName: 'Shikhar Dhawan',
    displayName: 'Gabbar',
    photo: '',
    age: 27,
    mobile: '9812345602',
    email: 'shikhar@cricket.org',
    city: 'Delhi',
    category: 'Batsman',
    battingStyle: 'Left Hand',
    bowlingStyle: 'None',
    experienceYears: 6,
    prevExperience: 'State Trophy Top Scorer',
    description: 'Solid left-handed top order player.',
    basePrice: 4000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1003',
    fullName: 'Shubman Gill',
    displayName: 'Gill',
    photo: '',
    age: 23,
    mobile: '9812345603',
    email: 'shubman@cricket.org',
    city: 'Chandigarh',
    category: 'Batsman',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Medium',
    experienceYears: 3,
    prevExperience: 'University Captain',
    description: 'Classy batsman with elegant strokeplay.',
    basePrice: 4000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1004',
    fullName: 'Yashasvi Jaiswal',
    displayName: 'Yashasvi',
    photo: '',
    age: 22,
    mobile: '9812345604',
    email: 'jaiswal@cricket.org',
    city: 'Bhadohi',
    category: 'Batsman',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Right Arm Spin',
    experienceYears: 3,
    prevExperience: 'State U-23 MVP',
    description: 'Dynamic power-hitter in powerplay.',
    basePrice: 3500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1005',
    fullName: 'Suryakumar Yadav',
    displayName: 'SKY',
    photo: '',
    age: 28,
    mobile: '9812345605',
    email: 'sky@cricket.org',
    city: 'Mumbai',
    category: 'Batsman',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Medium',
    experienceYears: 7,
    prevExperience: 'T20 Tournament Best Player',
    description: '360-degree shotmaker.',
    basePrice: 6000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },

  // Bowlers
  {
    id: 'PLY-1006',
    fullName: 'Jasprit Bumrah',
    displayName: 'Bumrah',
    photo: '',
    age: 27,
    mobile: '9812345606',
    email: 'bumrah@cricket.org',
    city: 'Ahmedabad',
    category: 'Bowler',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Fast',
    experienceYears: 6,
    prevExperience: 'Leading Wicket Taker 2025',
    description: 'Lethal yorkers in death overs.',
    basePrice: 6000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1007',
    fullName: 'Mohammed Shami',
    displayName: 'Shami',
    photo: '',
    age: 29,
    mobile: '9812345607',
    email: 'shami@cricket.org',
    city: 'Amroha',
    category: 'Bowler',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Fast',
    experienceYears: 8,
    prevExperience: 'State Fast Bowler Award',
    description: 'Seam specialist with high pace.',
    basePrice: 5000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1008',
    fullName: 'Arshdeep Singh',
    displayName: 'Arshdeep',
    photo: '',
    age: 24,
    mobile: '9812345608',
    email: 'arshdeep@cricket.org',
    city: 'Mohali',
    category: 'Bowler',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Left Arm Fast',
    experienceYears: 4,
    prevExperience: 'Regional T20 Winner',
    description: 'Left-arm pace bowler with swing.',
    basePrice: 4000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1009',
    fullName: 'Kuldeep Yadav',
    displayName: 'Kuldeep',
    photo: '',
    age: 26,
    mobile: '9812345609',
    email: 'kuldeep@cricket.org',
    city: 'Kanpur',
    category: 'Bowler',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Left Arm Spin',
    experienceYears: 5,
    prevExperience: 'Hat-trick hero 2024',
    description: 'Left-arm wrist spinner.',
    basePrice: 4500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1010',
    fullName: 'Yuzvendra Chahal',
    displayName: 'Chahal',
    photo: '',
    age: 28,
    mobile: '9812345610',
    email: 'chahal@cricket.org',
    city: 'Jind',
    category: 'Bowler',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Spin',
    experienceYears: 7,
    prevExperience: 'Top Leg Spinner',
    description: 'Crafty leg spinner who breaks partnerships.',
    basePrice: 4000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },

  // All-Rounders
  {
    id: 'PLY-1011',
    fullName: 'Hardik Pandya',
    displayName: 'Hardik',
    photo: '',
    age: 27,
    mobile: '9812345611',
    email: 'hardik@cricket.org',
    city: 'Baroda',
    category: 'All-Rounder',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Medium',
    experienceYears: 6,
    prevExperience: 'Tournament MVP 2025',
    description: 'Pace bowling all-rounder & explosive finisher.',
    basePrice: 6500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1012',
    fullName: 'Ravindra Jadeja',
    displayName: 'Jaddu',
    photo: '',
    age: 29,
    mobile: '9812345612',
    email: 'jadeja@cricket.org',
    city: 'Jamnagar',
    category: 'All-Rounder',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Left Arm Spin',
    experienceYears: 9,
    prevExperience: 'Best All-Rounder Award',
    description: 'Left-arm spin, clutch batting & gun fielder.',
    basePrice: 6000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1013',
    fullName: 'Axar Patel',
    displayName: 'Axar',
    photo: '',
    age: 26,
    mobile: '9812345613',
    email: 'axar@cricket.org',
    city: 'Anand',
    category: 'All-Rounder',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Left Arm Spin',
    experienceYears: 5,
    prevExperience: 'Inter-State Champions',
    description: 'Economical spinner & dependable lower order batter.',
    basePrice: 4500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1014',
    fullName: 'Washington Sundar',
    displayName: 'Washi',
    photo: '',
    age: 24,
    mobile: '9812345614',
    email: 'washi@cricket.org',
    city: 'Chennai',
    category: 'All-Rounder',
    battingStyle: 'Left Hand',
    bowlingStyle: 'Right Arm Spin',
    experienceYears: 4,
    prevExperience: 'Off-spin Specialist',
    description: 'Powerplay off-spinner & stroke player.',
    basePrice: 3500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },

  // Wicket-Keepers
  {
    id: 'PLY-1015',
    fullName: 'Rishabh Pant',
    displayName: 'Pant',
    photo: '',
    age: 25,
    mobile: '9812345615',
    email: 'pant@cricket.org',
    city: 'Roorkee',
    category: 'Wicket-Keeper',
    battingStyle: 'Left Hand',
    bowlingStyle: 'None',
    experienceYears: 5,
    prevExperience: 'Captain & Best Keeper',
    description: 'X-factor left-handed keeper batter.',
    basePrice: 5500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1016',
    fullName: 'KL Rahul',
    displayName: 'KL',
    photo: '',
    age: 28,
    mobile: '9812345616',
    email: 'kl@cricket.org',
    city: 'Bengaluru',
    category: 'Wicket-Keeper',
    battingStyle: 'Right Hand',
    bowlingStyle: 'None',
    experienceYears: 7,
    prevExperience: 'Consistent Run Scorer',
    description: 'Versatile top order keeper.',
    basePrice: 5000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1017',
    fullName: 'Sanju Samson',
    displayName: 'Sanju',
    photo: '',
    age: 26,
    mobile: '9812345617',
    email: 'sanju@cricket.org',
    city: 'Trivandrum',
    category: 'Wicket-Keeper',
    battingStyle: 'Right Hand',
    bowlingStyle: 'None',
    experienceYears: 6,
    prevExperience: 'Six Hitter Award 2025',
    description: 'High strike-rate middle order keeper.',
    basePrice: 4500,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  },
  {
    id: 'PLY-1018',
    fullName: 'Ishan Kishan',
    displayName: 'Ishan',
    photo: '',
    age: 24,
    mobile: '9812345618',
    email: 'ishan@cricket.org',
    city: 'Patna',
    category: 'Wicket-Keeper',
    battingStyle: 'Left Hand',
    bowlingStyle: 'None',
    experienceYears: 4,
    prevExperience: 'U-19 Captain',
    description: 'Explosive opener & lightning fast keeper.',
    basePrice: 4000,
    status: 'Available',
    soldToTeamId: null,
    soldPrice: null
  }
];

const DEFAULT_AUCTION = {
  status: 'IDLE', // 'IDLE', 'BIDDING', 'PAUSED', 'SOLD', 'UNSOLD'
  currentPlayerId: null,
  currentBid: 0,
  highestBidTeamId: null,
  timerSeconds: 30,
  timerActive: false,
  bidHistory: []
};

class DataStore {
  constructor() {
    this.channel = new BroadcastChannel('mini_auction_sync_channel');
    this.listeners = [];

    this.initData();
    this.listenCrossTab();
  }

  initData() {
    if (!localStorage.getItem(STORAGE_KEY_TOURNAMENT)) {
      localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(DEFAULT_TOURNAMENT));
    }
    if (!localStorage.getItem(STORAGE_KEY_TEAMS)) {
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(DEFAULT_TEAMS));
    }
    if (!localStorage.getItem('players') && !localStorage.getItem('mini_auction_players')) {
      localStorage.setItem('players', JSON.stringify(DEFAULT_PLAYERS));
      localStorage.setItem('mini_auction_players', JSON.stringify(DEFAULT_PLAYERS));
    }
    if (!localStorage.getItem(STORAGE_KEY_AUCTION)) {
      localStorage.setItem(STORAGE_KEY_AUCTION, JSON.stringify(DEFAULT_AUCTION));
    }
  }

  listenCrossTab() {
    this.channel.onmessage = (event) => {
      this.notifyListeners(event.data.type, event.data.payload);
    };

    window.addEventListener('storage', (e) => {
      this.notifyListeners('STORAGE_UPDATED', { key: e.key });
    });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(type, payload) {
    this.listeners.forEach(cb => cb(type, payload));
  }

  broadcast(type, payload) {
    this.channel.postMessage({ type, payload });
    this.notifyListeners(type, payload);
  }

  // --- Getters ---
  getTournament() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TOURNAMENT)) || DEFAULT_TOURNAMENT;
  }

  getTeams() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS)) || DEFAULT_TEAMS;
  }

  getTeamById(teamId) {
    const teams = this.getTeams();
    return teams.find(t => t.id === teamId);
  }

  getPlayers() {
    let raw = localStorage.getItem('players') || localStorage.getItem('mini_auction_players');
    if (raw) {
      try {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch(e) {}
    }
    return DEFAULT_PLAYERS;
  }

  getPlayerById(playerId) {
    const players = this.getPlayers();
    return players.find(p => p.id === playerId);
  }

  getAuctionState() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_AUCTION)) || DEFAULT_AUCTION;
  }

  // --- Setters ---
  saveTournament(data) {
    localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(data));
    this.broadcast('TOURNAMENT_UPDATED', data);
  }

  saveTeams(teams) {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
    this.broadcast('TEAMS_UPDATED', teams);
  }

  savePlayers(players) {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('mini_auction_players', JSON.stringify(players));
    this.broadcast('PLAYERS_UPDATED', players);
  }

  saveAuctionState(state) {
    localStorage.setItem(STORAGE_KEY_AUCTION, JSON.stringify(state));
    this.broadcast('AUCTION_UPDATED', state);
  }

  // Helper Methods
  generatePlayerId() {
    const players = this.getPlayers();
    const existingNums = players.map(p => {
      if (!p.id) return 1000;
      const parts = p.id.split('-');
      return parts.length > 1 ? parseInt(parts[1], 10) : 1000;
    }).filter(n => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums, 1000) + 1 : 1001;
    return `PLY-${nextNum}`;
  }

  addPlayer(playerData) {
    const players = this.getPlayers();
    const id = playerData.id || this.generatePlayerId();
    const newPlayer = {
      id: id,
      name: playerData.name || playerData.fullName || '',
      fullName: playerData.fullName || playerData.name || '',
      phone: playerData.phone || playerData.mobile || '',
      mobile: playerData.mobile || playerData.phone || '',
      role: playerData.role || playerData.category || 'Batsman',
      category: playerData.category || playerData.role || 'Batsman',
      basePrice: parseFloat(playerData.basePrice) || this.getTournament().defaultBasePrice || 2000,
      tournamentName: playerData.tournamentName || "Premier Mini Cricket League 2026",
      photo: playerData.photo || '',
      registrationDate: playerData.registrationDate || new Date().toISOString(),
      status: playerData.status || "Registered",
      city: playerData.city || '',
      age: parseInt(playerData.age, 10) || 20,
      email: playerData.email || '',
      battingStyle: playerData.battingStyle || 'Right Hand',
      bowlingStyle: playerData.bowlingStyle || 'Right Arm Medium',
      experienceYears: parseInt(playerData.experienceYears, 10) || 0,
      prevExperience: playerData.prevExperience || '',
      description: playerData.description || '',
      displayName: playerData.displayName || playerData.name || playerData.fullName || '',
      soldToTeamId: null,
      soldPrice: null
    };

    players.push(newPlayer);
    this.savePlayers(players);

    // Sync to Supabase if available
    if (window.supabase) {
      try {
        window.supabase.from('players').insert([newPlayer]);
      } catch (err) {
        console.warn('Supabase sync notice:', err);
      }
    }

    return newPlayer;
  }

  updatePlayer(playerId, updates) {
    const players = this.getPlayers();
    const index = players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      players[index] = { ...players[index], ...updates };
      if (updates.name) players[index].fullName = updates.name;
      if (updates.fullName) players[index].name = updates.fullName;
      if (updates.phone) players[index].mobile = updates.phone;
      if (updates.mobile) players[index].phone = updates.mobile;
      if (updates.role) players[index].category = updates.role;
      if (updates.category) players[index].role = updates.category;

      this.savePlayers(players);
      return players[index];
    }
    return null;
  }

  addTeam(teamData) {
    const teams = this.getTeams();
    const tournament = this.getTournament();
    const nextNum = teams.length + 1;
    const newTeam = {
      id: `TEAM-0${nextNum}`,
      teamName: teamData.teamName,
      shortCode: teamData.shortCode || `T${nextNum}`,
      logo: teamData.logo || '',
      captainName: teamData.captainName || `Captain ${nextNum}`,
      captainPhoto: teamData.captainPhoto || '',
      captainPin: teamData.captainPin || `${nextNum}${nextNum}${nextNum}${nextNum}`,
      purse: tournament.pursePerTeam,
      remainingPurse: tournament.pursePerTeam,
      squad: []
    };
    teams.push(newTeam);
    this.saveTeams(teams);
    return newTeam;
  }

  updateTeam(teamId, updates) {
    const teams = this.getTeams();
    const index = teams.findIndex(t => t.id === teamId);
    if (index !== -1) {
      teams[index] = { ...teams[index], ...updates };
      this.saveTeams(teams);
      return teams[index];
    }
    return null;
  }

  resetAllData() {
    localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(DEFAULT_TOURNAMENT));
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(DEFAULT_TEAMS));
    localStorage.setItem('players', JSON.stringify(DEFAULT_PLAYERS));
    localStorage.setItem('mini_auction_players', JSON.stringify(DEFAULT_PLAYERS));
    localStorage.setItem(STORAGE_KEY_AUCTION, JSON.stringify(DEFAULT_AUCTION));
    this.broadcast('DATA_RESET', {});
  }
}

window.store = new DataStore();
