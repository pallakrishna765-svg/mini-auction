import React, { useState, useEffect } from 'react';

// Storage Helpers (Isolated logic ready for Supabase replacement later)
const getStoredTournament = () => {
  try {
    const data = localStorage.getItem('tournament_v2');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to parse tournament_v2 from localStorage", e);
    return null;
  }
};

const saveStoredTournament = (data) => {
  try {
    localStorage.setItem('tournament_v2', JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save tournament_v2 to localStorage", e);
  }
};

const getStoredPlayers = () => {
  try {
    const data = localStorage.getItem('players_v2');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse players_v2 from localStorage", e);
    return [];
  }
};

const saveStoredPlayers = (players) => {
  try {
    localStorage.setItem('players_v2', JSON.stringify(players));
  } catch (e) {
    console.error("Failed to save players_v2 to localStorage", e);
  }
};

export default function App() {
  // ---------------- STATE MANAGEMENT ----------------
  const [tournament, setTournament] = useState(() => getStoredTournament());
  const [players, setPlayers] = useState(() => getStoredPlayers());
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'auction' | 'admin'
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // Setup Form State
  const [setupForm, setSetupForm] = useState({
    name: '',
    village: '',
    password: ''
  });
  const [setupError, setSetupError] = useState('');

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    village: '',
    phone: '',
    role: 'Batsman'
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Confirmation Dialog Modal State
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, title: '', message: '' });

  // ---------------- CROSS-DEVICE / CROSS-TAB SYNC & LIVE POLLING ----------------
  useEffect(() => {
    const syncFromStorage = () => {
      // 1. Sync Tournament setup data
      const latestTournament = getStoredTournament();
      setTournament(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(latestTournament)) {
          return latestTournament;
        }
        return prev;
      });

      // 2. Sync Players list
      const latestPlayers = getStoredPlayers();
      setPlayers(prev => {
        if (prev.length !== latestPlayers.length || JSON.stringify(prev) !== JSON.stringify(latestPlayers)) {
          return latestPlayers;
        }
        return prev;
      });
    };

    // Initial sync check on mount
    syncFromStorage();

    // 2000ms Live Polling for cross-device updates
    const intervalId = setInterval(syncFromStorage, 2000);

    // Instant cross-tab sync via window storage event
    const handleStorageChange = (e) => {
      if (e.key === 'players_v2' || e.key === 'tournament_v2') {
        syncFromStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Pre-fill village name in registration form when tournament is available
  useEffect(() => {
    if (tournament && tournament.village && !regForm.village) {
      setRegForm(prev => ({ ...prev, village: tournament.village }));
    }
  }, [tournament]);

  // ---------------- EVENT HANDLERS ----------------

  // 1. Tournament Mandatory Setup Submission
  const handleTournamentSetup = (e) => {
    e.preventDefault();
    setSetupError('');

    const name = setupForm.name.trim();
    const village = setupForm.village.trim();
    const password = setupForm.password.trim();

    if (!name || !village || !password) {
      setSetupError('All fields marked with * are mandatory!');
      return;
    }

    const newTournament = {
      name,
      village,
      password,
      createdAt: new Date().toISOString()
    };

    saveStoredTournament(newTournament);
    setTournament(newTournament);
    setSetupForm({ name: '', village: '', password: '' });
    setRegForm(prev => ({ ...prev, village }));
  };

  // 2. Admin Password Verification
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAdminLoginError('');

    const targetPassword = tournament?.password || 'admin123';
    if (adminPasswordInput.trim() === targetPassword) {
      setIsAdmin(true);
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
      setActiveTab('admin');
    } else {
      setAdminLoginError('Incorrect admin password! Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setActiveTab('register');
  };

  // 3. Player Registration with One-Time Unique Phone Check
  const handleRegisterPlayer = (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const name = regForm.name.trim();
    const village = regForm.village.trim();
    const phone = regForm.phone.trim();
    const role = regForm.role;

    if (!name || !village || !phone || !role) {
      setRegError('All fields are mandatory!');
      return;
    }

    // Clean phone number (strip whitespace & non-digits for strict check)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setRegError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check duplicate phone number in players_v2
    const currentPlayers = getStoredPlayers();
    const isDuplicate = currentPlayers.some(
      p => p.phone.replace(/[^0-9]/g, '') === cleanPhone
    );

    if (isDuplicate) {
      setRegError('Already registered! One time only');
      return;
    }

    const newPlayer = {
      id: 'plr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name,
      village,
      phone: cleanPhone,
      role,
      status: 'Available', // Available | Sold | Unsold
      registeredAt: new Date().toISOString()
    };

    const updatedPlayers = [newPlayer, ...currentPlayers];
    saveStoredPlayers(updatedPlayers);
    setPlayers(updatedPlayers);

    setRegSuccess(`🎉 Registration Successful! ${name} registered for auction.`);
    setRegForm({
      name: '',
      village: tournament?.village || '',
      phone: '',
      role: 'Batsman'
    });
  };

  // Admin: Update player auction status
  const handleUpdatePlayerStatus = (playerId, newStatus) => {
    const updated = players.map(p => p.id === playerId ? { ...p, status: newStatus } : p);
    saveStoredPlayers(updated);
    setPlayers(updated);
  };

  // Admin: Delete single player
  const handleDeletePlayer = (playerId) => {
    const updated = players.filter(p => p.id !== playerId);
    saveStoredPlayers(updated);
    setPlayers(updated);
  };

  // Admin: Reset Players List
  const handleResetPlayers = () => {
    saveStoredPlayers([]);
    setPlayers([]);
    setConfirmModal({ show: false, action: null, title: '', message: '' });
  };

  // Admin: Reset Entire Tournament Setup & Players
  const handleResetEverything = () => {
    localStorage.removeItem('players_v2');
    localStorage.removeItem('tournament_v2');
    setPlayers([]);
    setTournament(null);
    setIsAdmin(false);
    setActiveTab('register');
    setConfirmModal({ show: false, action: null, title: '', message: '' });
  };

  // Filtered Players Array
  const filteredPlayers = players.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'All' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Badge Styling Helpers
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Batsman':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Bowler':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'All-Rounder':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Wicket Keeper':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Captain':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Sold':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Unsold':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // ---------------- 1. MANDATORY TOURNAMENT SETUP SCREEN ----------------
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
          {/* Glowing Ambient Backdrop */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-slate-950 text-4xl font-black shadow-lg mb-4 ring-4 ring-white/10">
              🏆
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
              Tournament Setup
            </h1>
            <p className="text-slate-300 mt-2 text-sm sm:text-base font-medium">
              Mandatory Setup: Initialize your tournament details to continue.
            </p>
          </div>

          {setupError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm font-bold flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>{setupError}</div>
            </div>
          )}

          <form onSubmit={handleTournamentSetup} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Tournament Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Premier Mini League 2026"
                value={setupForm.name}
                onChange={e => setSetupForm({ ...setupForm, name: e.target.value })}
                className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Village Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Greenfield Village"
                value={setupForm.village}
                onChange={e => setSetupForm({ ...setupForm, village: e.target.value })}
                className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Set Admin Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                placeholder="Create secret admin password"
                value={setupForm.password}
                onChange={e => setSetupForm({ ...setupForm, password: e.target.value })}
                className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-lg tracking-wide hover:brightness-110 hover:shadow-cyan-500/30 hover:shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              🚀 Save & Launch App
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------- 2. MAIN APPLICATION ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white font-sans antialiased selection:bg-cyan-500 selection:text-white pb-16">

      {/* STICKY HEADER WITH GLASSMORPHISM */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Brand Logo & Tournament Meta */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg ring-2 ring-white/20">
                🏏
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                  {tournament.name}
                </h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span>📍 {tournament.village}</span>
                </div>
              </div>
            </div>

            {/* Mobile Live Count Badge */}
            <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>LIVE: {players.length}</span>
            </div>
          </div>

          {/* Desktop Live Count & Admin Access Pill */}
          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-end">

            {/* Live Registration Count */}
            <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-xs sm:text-sm font-extrabold text-red-400 shadow-inner">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span>LIVE REGISTRATIONS: <strong className="text-white text-base ml-1">{players.length}</strong></span>
            </div>

            {/* Admin Action Button */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('admin')}
                  className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-full hover:bg-amber-300 transition text-xs sm:text-sm shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  👑 Admin Dashboard
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition text-xs cursor-pointer border border-white/20"
                >
                  Exit Admin
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdminLoginModal(true)}
                className="px-5 py-2.5 bg-white text-slate-950 font-black rounded-full hover:bg-slate-100 transition text-xs sm:text-sm shadow-xl hover:shadow-white/20 transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                🔐 Admin
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION PILL BUTTONS */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-5 sm:px-8 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md cursor-pointer flex items-center gap-2 ${activeTab === 'register'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-cyan-500/20 scale-105'
              : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
              }`}
          >
            📝 Register
          </button>

          <button
            onClick={() => setActiveTab('auction')}
            className={`px-5 sm:px-8 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md cursor-pointer flex items-center gap-2 ${activeTab === 'auction'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-cyan-500/20 scale-105'
              : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
              }`}
          >
            🏏 Auction Pool ({players.length})
          </button>

          <button
            onClick={() => {
              if (isAdmin) {
                setActiveTab('admin');
              } else {
                setShowAdminLoginModal(true);
              }
            }}
            className={`px-5 sm:px-8 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md cursor-pointer flex items-center gap-2 ${activeTab === 'admin'
              ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-950 shadow-amber-500/20 scale-105'
              : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
              }`}
          >
            👑 Admin ({players.length})
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">

        {/* ---------------- VIEW 1: PLAYER REGISTRATION ---------------- */}
        {activeTab === 'register' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                  Player Registration
                </h2>
                <p className="text-slate-300 text-sm font-medium">
                  Register once to participate in the upcoming tournament auction.
                </p>
                <div className="mt-3 inline-block px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300">
                  ⚡ One Time Registration Only
                </div>
              </div>

              {/* Error & Success Feedback Alerts */}
              {regError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm font-extrabold flex items-center gap-3">
                  <span className="text-2xl">🚫</span>
                  <div>{regError}</div>
                </div>
              )}

              {regSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-extrabold flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>{regSuccess}</div>
                </div>
              )}

              <form onSubmit={handleRegisterPlayer} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Player Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={regForm.name}
                    onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Village Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter village name"
                    value={regForm.village}
                    onChange={e => setRegForm({ ...regForm, village: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Phone Number (Unique ID) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={regForm.phone}
                    onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Used to prevent duplicate registrations.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Playing Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regForm.role}
                    onChange={e => setRegForm({ ...regForm, role: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white text-slate-900 font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 shadow-inner cursor-pointer"
                    required
                  >
                    <option value="Batsman">🏏 Batsman</option>
                    <option value="Bowler">🎯 Bowler</option>
                    <option value="All-Rounder">⚡ All-Rounder</option>
                    <option value="Wicket Keeper">🧤 Wicket Keeper</option>
                    <option value="Captain">🧢 Captain</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-lg tracking-wide hover:brightness-110 hover:shadow-cyan-500/30 hover:shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  🚀 Submit Registration
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---------------- VIEW 2: AUCTION PLAYER CARDS GRID ---------------- */}
        {activeTab === 'auction' && (
          <div className="space-y-6">

            {/* SEARCH & ROLE FILTER BAR */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search player name, village..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-base">🔍</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper', 'Captain'].map(role => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition cursor-pointer ${roleFilter === role
                      ? 'bg-cyan-400 text-slate-950 shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* PLAYER CARDS GRID */}
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-[30px] p-8">
                <div className="text-5xl mb-4">🏏</div>
                <h3 className="text-xl font-extrabold text-slate-300">No Players Found</h3>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filter or register a new player.</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="mt-6 px-6 py-2.5 bg-cyan-400 text-slate-950 font-black rounded-xl hover:bg-cyan-300 transition text-sm cursor-pointer shadow-lg"
                >
                  Register Player
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map(player => (
                  <div
                    key={player.id}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] p-6 shadow-xl hover:scale-[1.03] hover:shadow-cyan-500/20 transition-all duration-300 flex flex-col justify-between relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">

                        {/* Gradient Avatar Circle */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center text-white text-2xl font-black shadow-lg ring-2 ring-white/30 shrink-0">
                          {player.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Status & Role Badges */}
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border uppercase tracking-wider ${getStatusBadgeClass(player.status)}`}>
                            ● {player.status}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(player.role)}`}>
                            {player.role}
                          </span>
                        </div>
                      </div>

                      {/* Player Name & Meta */}
                      <h3 className="text-xl font-black text-white group-hover:text-yellow-300 transition truncate">
                        {player.name}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs font-bold text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📍 Village:</span>
                          <span className="text-white">{player.village}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📞 Phone:</span>
                          <span className="text-white tracking-wide">{player.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>ID: #{player.id.slice(-6)}</span>
                      <span>Ready for Auction</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- VIEW 3: ADMIN DASHBOARD ---------------- */}
        {activeTab === 'admin' && (
          <div className="space-y-8">

            {/* BIG BEAUTIFUL GRADIENT CARD (YELLOW TO ORANGE) */}
            <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-slate-950 p-6 sm:p-10 rounded-[30px] shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="inline-block px-3 py-1 bg-slate-950/20 rounded-full text-xs font-black uppercase tracking-wider mb-2 text-slate-900">
                    👑 Official Admin Dashboard
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                    {tournament.name}
                  </h2>
                  <p className="text-slate-900 text-sm font-bold mt-1">
                    Village: {tournament.village}
                  </p>
                </div>

                {/* Big Total Live Count Card */}
                <div className="bg-slate-950/80 backdrop-blur-md text-white px-8 py-5 rounded-2xl shadow-xl flex flex-col items-center justify-center border border-white/10 shrink-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Total Live Registrations
                  </div>
                  <div className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-yellow-400 to-amber-200 bg-clip-text text-transparent">
                    {players.length}
                  </div>
                </div>
              </div>

              {/* Role Stats Row */}
              <div className="mt-8 pt-6 border-t border-slate-950/20 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper', 'Captain'].map(role => {
                  const count = players.filter(p => p.role === role).length;
                  return (
                    <div key={role} className="bg-slate-950/10 rounded-xl p-3">
                      <div className="text-xs font-bold text-slate-900 uppercase">{role}</div>
                      <div className="text-xl font-black text-slate-950 mt-0.5">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADMIN ROSTER & RESET ACTION BUTTONS */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] p-6 sm:p-8 space-y-6">

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">Full Player Roster</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Manage status, view phone numbers, or clear player registrations.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setConfirmModal({
                      show: true,
                      action: handleResetPlayers,
                      title: 'Reset Registered Players?',
                      message: 'Are you sure you want to delete all registered players? This cannot be undone!'
                    })}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    🗑️ Reset Players
                  </button>

                  <button
                    onClick={() => setConfirmModal({
                      show: true,
                      action: handleResetEverything,
                      title: 'Reset Entire Tournament?',
                      message: 'This will reset tournament setup AND delete all registered players. You will return to Setup.'
                    })}
                    className="px-4 py-2.5 bg-red-900 hover:bg-red-800 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer border border-red-500/30"
                  >
                    💥 Reset Tournament Setup
                  </button>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Search by player name, phone number, village..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* ROSTER TABLE */}
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  No player records match your query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-200 border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Player Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Village</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold">
                      {filteredPlayers.map((player, index) => (
                        <tr key={player.id} className="hover:bg-white/5 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-400">{index + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-white text-base">{player.name}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeClass(player.role)}`}>
                              {player.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{player.village}</td>
                          <td className="py-3.5 px-4 font-mono text-cyan-300 font-bold">{player.phone}</td>
                          <td className="py-3.5 px-4">
                            <select
                              value={player.status}
                              onChange={e => handleUpdatePlayerStatus(player.id, e.target.value)}
                              className="px-2.5 py-1 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                            >
                              <option value="Available">Available</option>
                              <option value="Sold">Sold</option>
                              <option value="Unsold">Unsold</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition border border-rose-500/30 cursor-pointer"
                              title="Delete player"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ---------------- ADMIN LOGIN MODAL ---------------- */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-[30px] p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3">
                🔐
              </div>
              <h3 className="text-2xl font-black text-white">Admin Authentication</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Enter your admin password to access the dashboard.
              </p>
            </div>

            {adminLoginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                ⚠️ {adminLoginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl font-bold border border-slate-200 focus:outline-none focus:ring-4 focus:ring-amber-400/50"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-sm transition hover:brightness-110 cursor-pointer shadow-lg"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- CONFIRMATION ACTION MODAL ---------------- */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-[30px] p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl mb-3 text-rose-400">
              ⚠️
            </div>
            <h3 className="text-xl font-black text-white">{confirmModal.title}</h3>
            <p className="text-xs font-medium text-slate-300 mt-2 mb-6">
              {confirmModal.message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, action: null, title: '', message: '' })}
                className="w-1/2 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.action}
                className="w-1/2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition cursor-pointer shadow-lg"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
