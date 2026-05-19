/**
 * Arava Distillery CRM — Google Sheets Backup Receiver
 *
 * Setup:
 * 1. Create a new Google Sheet named "Arava CRM Audit Log"
 * 2. Add headers in row 1: Timestamp | Action | Collection | Record ID | User | Data (JSON)
 * 3. Open Extensions > Apps Script
 * 4. Paste this code and save
 * 5. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL
 * 7. Set it as VITE_BACKUP_WEBHOOK_URL in your GitHub Secrets
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp,
    data.action,
    data.collection,
    data.recordId,
    data.userEmail,
    JSON.stringify(data.snapshot),
  ]);

  return ContentService.createTextOutput('ok');
}
