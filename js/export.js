/**
 * Data Export Controller (CSV, Excel, PDF)
 */

class ExportController {

  // --- CSV Export ---
  exportCSV(filename, rows) {
    const processRow = function (row) {
      let finalVal = '';
      for (let j = 0; j < row.length; j++) {
        let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        let result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
          result = '"' + result + '"';
        if (j > 0)
          finalVal += ',';
        finalVal += result;
      }
      return finalVal + '\n';
    };

    let csvFile = '';
    for (let i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // --- Excel Export (.xls HTML table) ---
  exportExcel(filename, htmlTableString) {
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background-color: #1e293b; color: #ffffff; padding: 10px; border: 1px solid #334155; }
          td { padding: 8px; border: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        ${htmlTableString}
      </body>
      </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- PDF Print Export ---
  exportPDF(title, htmlContent) {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${htmlContent}</div>
        <div class="footer">Generated on ${new Date().toLocaleString()} | Premier Mini Cricket League</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  // --- Pre-built Export Functions ---
  exportAllPlayersCSV() {
    const players = store.getPlayers();
    const rows = [
      ['Player ID', 'Full Name', 'Display Name', 'Category', 'Batting Style', 'Bowling Style', 'City', 'Base Price (INR)', 'Status', 'Sold To Team', 'Sold Price (INR)']
    ];

    players.forEach(p => {
      const team = p.soldToTeamId ? store.getTeamById(p.soldToTeamId) : null;
      rows.push([
        p.id,
        p.fullName,
        p.displayName || p.fullName,
        p.category,
        p.battingStyle,
        p.bowlingStyle,
        p.city,
        p.basePrice,
        p.status,
        team ? team.teamName : '-',
        p.soldPrice || '-'
      ]);
    });

    this.exportCSV('mini_auction_players.csv', rows);
  }

  exportTeamSquadsExcel() {
    const teams = store.getTeams();
    const players = store.getPlayers();
    const tournament = store.getTournament();

    let tableHtml = `<h2>${tournament.name} - Team Squads Summary</h2>`;

    teams.forEach(t => {
      const squadPlayers = players.filter(p => t.squad.includes(p.id));
      tableHtml += `
        <h3>${t.teamName} (Captain: ${t.captainName})</h3>
        <p>Total Purse: ₹${t.purse.toLocaleString('en-IN')} | Spent: ₹${(t.purse - t.remainingPurse).toLocaleString('en-IN')} | Remaining: ₹${t.remainingPurse.toLocaleString('en-IN')}</p>
        <table>
          <thead>
            <tr>
              <th>Player ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Batting</th>
              <th>Bowling</th>
              <th>Bought Price</th>
            </tr>
          </thead>
          <tbody>
      `;

      squadPlayers.forEach(p => {
        tableHtml += `
          <tr>
            <td>${p.id}</td>
            <td>${p.fullName}</td>
            <td>${p.category}</td>
            <td>${p.battingStyle}</td>
            <td>${p.bowlingStyle}</td>
            <td>₹${(p.soldPrice || 0).toLocaleString('en-IN')}</td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table><br/>`;
    });

    this.exportExcel('mini_auction_squads.xls', tableHtml);
  }

  exportAuctionResultsPDF() {
    const tournament = store.getTournament();
    const players = store.getPlayers();
    const teams = store.getTeams();

    const soldPlayers = players.filter(p => p.status === 'Sold');

    let contentHtml = `
      <p><strong>Tournament:</strong> ${tournament.name}</p>
      <p><strong>Date & Venue:</strong> ${tournament.date} at ${tournament.venue}</p>
      <p><strong>Total Sold Players:</strong> ${soldPlayers.length}</p>
      <table>
        <thead>
          <tr>
            <th>Player ID</th>
            <th>Player Name</th>
            <th>Category</th>
            <th>Winning Team</th>
            <th>Sold Price (INR)</th>
          </tr>
        </thead>
        <tbody>
    `;

    soldPlayers.forEach(p => {
      const team = store.getTeamById(p.soldToTeamId);
      contentHtml += `
        <tr>
          <td>${p.id}</td>
          <td>${p.fullName}</td>
          <td>${p.category}</td>
          <td>${team ? team.teamName : 'Unknown'}</td>
          <td>₹${(p.soldPrice || 0).toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    contentHtml += `</tbody></table>`;

    this.exportPDF(`${tournament.name} - Official Auction Results`, contentHtml);
  }
}

window.exportCtrl = new ExportController();
