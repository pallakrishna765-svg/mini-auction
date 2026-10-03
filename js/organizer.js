/**
 * Organizer Dashboard Controller
 */

class OrganizerController {
  constructor() {
    this.initEvents();
  }

  initEvents() {
    // We bind dynamic form submits & buttons via app delegate or direct bindings
  }

  saveTournamentSettings(formData) {
    const tournament = store.getTournament();
    const updated = {
      ...tournament,
      name: formData.name,
      date: formData.date,
      venue: formData.venue,
      pursePerTeam: parseFloat(formData.pursePerTeam) || 100000,
      numberOfTeams: parseInt(formData.numberOfTeams, 10) || 6,
      minSquadSize: parseInt(formData.minSquadSize, 10) || 12,
      maxSquadSize: parseInt(formData.maxSquadSize, 10) || 15,
      minBatsmen: parseInt(formData.minBatsmen, 10) || 5,
      minBowlers: parseInt(formData.minBowlers, 10) || 4,
      minAllRounders: parseInt(formData.minAllRounders, 10) || 2,
      minWicketKeepers: parseInt(formData.minWicketKeepers, 10) || 1,
      maxWicketKeepers: parseInt(formData.maxWicketKeepers, 10) || 3,
      defaultBasePrice: parseFloat(formData.defaultBasePrice) || 2000,
      bidIncrement: parseFloat(formData.bidIncrement) || 500,
      timerDuration: parseInt(formData.timerDuration, 10) || 30,
      rulesText: formData.rulesText,
      contactInfo: {
        phone: formData.contactPhone,
        email: formData.contactEmail,
        city: formData.contactCity
      }
    };

    store.saveTournament(updated);

    // Also update team purses if tournament total purse per team changed
    const teams = store.getTeams();
    let teamsModified = false;
    teams.forEach(t => {
      if (t.purse !== updated.pursePerTeam) {
        const spent = t.purse - t.remainingPurse;
        t.purse = updated.pursePerTeam;
        t.remainingPurse = Math.max(0, updated.pursePerTeam - spent);
        teamsModified = true;
      }
    });
    if (teamsModified) store.saveTeams(teams);

    return updated;
  }

  approvePlayer(playerId) {
    const player = store.updatePlayer(playerId, { status: 'Available' });
    app.showToast(`Player ${player.fullName} approved for auction!`, 'success');
  }

  rejectPlayer(playerId) {
    const player = store.updatePlayer(playerId, { status: 'Rejected' });
    app.showToast(`Player ${player.fullName} rejected.`, 'info');
  }

  resetUnsoldPlayer(playerId) {
    const player = store.updatePlayer(playerId, { status: 'Available', soldToTeamId: null, soldPrice: null });
    app.showToast(`Player ${player.fullName} returned to auction pool.`, 'success');
  }

  deletePlayer(playerId) {
    let players = store.getPlayers();
    players = players.filter(p => p.id !== playerId);
    store.savePlayers(players);
    app.showToast(`Player removed.`, 'info');
  }
}

window.organizer = new OrganizerController();
