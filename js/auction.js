/**
 * Mini Cricket Auction - Live Auction Controller & Sound Engine
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type, duration) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback silent fail if user hasn't interacted yet
    }
  }

  playBidSound() {
    this.playTone(880, 'sine', 0.15); // High crisp ping A5
  }

  playTickSound() {
    this.playTone(440, 'triangle', 0.08); // Gentle tick A4
  }

  playSoldSound() {
    // Fanfare chords
    setTimeout(() => this.playTone(523.25, 'triangle', 0.2), 0);   // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.2), 150); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.4), 300); // G5
  }

  playUnsoldSound() {
    setTimeout(() => this.playTone(300, 'sawtooth', 0.25), 0);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.35), 200);
  }
}

class AuctionEngine {
  constructor() {
    this.sounds = new SoundEngine();
    this.timerInterval = null;
  }

  // --- Organizer Actions ---
  selectPlayerForAuction(playerId) {
    const player = store.getPlayerById(playerId);
    const tournament = store.getTournament();
    if (!player) return false;

    const auctionState = {
      status: 'IDLE',
      currentPlayerId: player.id,
      currentBid: player.basePrice || tournament.defaultBasePrice,
      highestBidTeamId: null,
      timerSeconds: tournament.timerDuration || 30,
      timerActive: false,
      bidHistory: []
    };

    store.saveAuctionState(auctionState);
    return true;
  }

  startBidding() {
    const state = store.getAuctionState();
    if (!state.currentPlayerId) return false;

    state.status = 'BIDDING';
    state.timerActive = true;
    store.saveAuctionState(state);
    this.startTimerInterval();
    return true;
  }

  pauseBidding() {
    const state = store.getAuctionState();
    state.status = 'PAUSED';
    state.timerActive = false;
    store.saveAuctionState(state);
    this.stopTimerInterval();
    return true;
  }

  resumeBidding() {
    const state = store.getAuctionState();
    state.status = 'BIDDING';
    state.timerActive = true;
    store.saveAuctionState(state);
    this.startTimerInterval();
    return true;
  }

  adjustTimer(deltaSeconds) {
    const state = store.getAuctionState();
    state.timerSeconds = Math.max(5, state.timerSeconds + deltaSeconds);
    store.saveAuctionState(state);
  }

  // --- Captain / Organizer Bid Submission ---
  placeBid(teamId, proposedAmount = null) {
    const state = store.getAuctionState();
    const tournament = store.getTournament();
    const team = store.getTeamById(teamId);
    const player = store.getPlayerById(state.currentPlayerId);

    if (state.status !== 'BIDDING' || !player || !team) {
      return { success: false, message: 'Auction is not actively accepting bids.' };
    }

    // Determine next bid amount
    let nextBid = proposedAmount;
    if (!nextBid) {
      if (!state.highestBidTeamId) {
        nextBid = state.currentBid; // Starting base price
      } else {
        nextBid = state.currentBid + (tournament.bidIncrement || 500);
      }
    }

    // Validation 1: Highest bidder cannot bid against themselves immediately
    if (state.highestBidTeamId === teamId) {
      return { success: false, message: 'Your team already holds the highest bid!' };
    }

    // Validation 2: Purse check
    if (team.remainingPurse < nextBid) {
      return {
        success: false,
        message: `Insufficient purse! Remaining balance: ₹${team.remainingPurse.toLocaleString('en-IN')}, required: ₹${nextBid.toLocaleString('en-IN')}.`
      };
    }

    // Validation 3: Maximum squad size check
    if (team.squad.length >= tournament.maxSquadSize) {
      return {
        success: false,
        message: `Squad full! Team already has maximum ${tournament.maxSquadSize} players.`
      };
    }

    // Validation 4: Bid must be greater than current bid
    if (state.highestBidTeamId && nextBid <= state.currentBid) {
      return {
        success: false,
        message: `Bid must be greater than current bid of ₹${state.currentBid.toLocaleString('en-IN')}.`
      };
    }

    // Update Auction State
    state.currentBid = nextBid;
    state.highestBidTeamId = teamId;
    state.timerSeconds = tournament.timerDuration || 30; // Reset timer on new bid
    state.bidHistory.unshift({
      teamId: team.id,
      teamName: team.teamName,
      amount: nextBid,
      timestamp: new Date().toLocaleTimeString()
    });

    store.saveAuctionState(state);
    this.sounds.playBidSound();
    return { success: true, amount: nextBid };
  }

  // --- Finalizing Actions ---
  markSold() {
    const state = store.getAuctionState();
    if (!state.currentPlayerId || !state.highestBidTeamId) {
      return { success: false, message: 'Cannot mark SOLD without a highest bidder!' };
    }

    const player = store.getPlayerById(state.currentPlayerId);
    const winningTeam = store.getTeamById(state.highestBidTeamId);

    // Update player
    store.updatePlayer(player.id, {
      status: 'Sold',
      soldToTeamId: winningTeam.id,
      soldPrice: state.currentBid
    });

    // Update team
    const teams = store.getTeams();
    const tIndex = teams.findIndex(t => t.id === winningTeam.id);
    if (tIndex !== -1) {
      teams[tIndex].squad.push(player.id);
      teams[tIndex].remainingPurse = Math.max(0, teams[tIndex].remainingPurse - state.currentBid);
      store.saveTeams(teams);
    }

    // Update Auction State
    state.status = 'SOLD';
    state.timerActive = false;
    store.saveAuctionState(state);
    this.stopTimerInterval();
    this.sounds.playSoldSound();

    return { success: true, player, team: winningTeam, amount: state.currentBid };
  }

  markUnsold() {
    const state = store.getAuctionState();
    if (!state.currentPlayerId) return { success: false };

    const player = store.getPlayerById(state.currentPlayerId);

    // Update player status
    store.updatePlayer(player.id, {
      status: 'Unsold',
      soldToTeamId: null,
      soldPrice: null
    });

    // Update Auction State
    state.status = 'UNSOLD';
    state.timerActive = false;
    store.saveAuctionState(state);
    this.stopTimerInterval();
    this.sounds.playUnsoldSound();

    return { success: true, player };
  }

  // --- Timer Tick Management ---
  startTimerInterval() {
    this.stopTimerInterval();
    this.timerInterval = setInterval(() => {
      const state = store.getAuctionState();
      if (state.status === 'BIDDING' && state.timerActive && state.timerSeconds > 0) {
        state.timerSeconds -= 1;
        if (state.timerSeconds <= 5) {
          this.sounds.playTickSound();
        }
        store.saveAuctionState(state);

        if (state.timerSeconds === 0) {
          state.timerActive = false;
          store.saveAuctionState(state);
          this.stopTimerInterval();
        }
      }
    }, 1000);
  }

  stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

window.auction = new AuctionEngine();
