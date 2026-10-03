/**
 * Captain Dashboard Controller
 */

class CaptainController {
  constructor() {
    this.activeTeamId = null;
  }

  setActiveTeam(teamId) {
    this.activeTeamId = teamId;
    localStorage.setItem('mini_auction_active_captain_team', teamId);
    app.renderCaptainDashboard();
  }

  getActiveTeam() {
    if (!this.activeTeamId) {
      this.activeTeamId = localStorage.getItem('mini_auction_active_captain_team') || 'TEAM-01';
    }
    let team = store.getTeamById(this.activeTeamId);
    if (!team) {
      const teams = store.getTeams();
      team = teams[0] || null;
      if (team) this.activeTeamId = team.id;
    }
    return team;
  }

  getCategoryDeficiencies(teamId) {
    const team = store.getTeamById(teamId);
    const tournament = store.getTournament();
    const players = store.getPlayers();
    if (!team) return [];

    const squadPlayers = players.filter(p => team.squad.includes(p.id));

    const counts = {
      Batsman: squadPlayers.filter(p => p.category === 'Batsman').length,
      Bowler: squadPlayers.filter(p => p.category === 'Bowler').length,
      'All-Rounder': squadPlayers.filter(p => p.category === 'All-Rounder').length,
      'Wicket-Keeper': squadPlayers.filter(p => p.category === 'Wicket-Keeper').length
    };

    const deficiencies = [];
    if (counts.Batsman < tournament.minBatsmen) {
      deficiencies.push(`Needs ${tournament.minBatsmen - counts.Batsman} more Batsmen (Has ${counts.Batsman}/${tournament.minBatsmen})`);
    }
    if (counts.Bowler < tournament.minBowlers) {
      deficiencies.push(`Needs ${tournament.minBowlers - counts.Bowler} more Bowlers (Has ${counts.Bowler}/${tournament.minBowlers})`);
    }
    if (counts['All-Rounder'] < tournament.minAllRounders) {
      deficiencies.push(`Needs ${tournament.minAllRounders - counts['All-Rounder']} more All-Rounders (Has ${counts['All-Rounder']}/${tournament.minAllRounders})`);
    }
    if (counts['Wicket-Keeper'] < tournament.minWicketKeepers) {
      deficiencies.push(`Needs ${tournament.minWicketKeepers - counts['Wicket-Keeper']} more Wicket-Keepers (Has ${counts['Wicket-Keeper']}/${tournament.minWicketKeepers})`);
    }

    return deficiencies;
  }
}

window.captain = new CaptainController();
