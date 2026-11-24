/**
 * GHACEM Corporate Permit-to-Work (GHACPerm)
 * Google Apps Script Web App Backend for Google Sheets
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename sheet tabs to: "General_Permits", "HotWork_Permits", "Height_Permits"
 * 3. Click Extensions > Apps Script
 * 4. Paste this complete code into Code.gs
 * 5. Click Deploy > New deployment
 * 6. Select type: "Web app"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"
 * 9. Click Deploy, copy the Web App URL (ending in /exec)
 * 10. Paste this URL into the GHACPerm Cloud Sync Settings modal!
 */

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const formType = (params && params.formType) ? params.formType.toLowerCase() : 'general';
    const mode = (params && params.mode) ? params.mode : 'history';

    const sheetName = getSheetNameForForm(formType);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = initializeSheet(ss, sheetName);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ ok: true, records: [] });
    }

    const headers = data[0];
    const records = [];

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const record = {};
      let hasData = false;

      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        const val = row[c];
        if (key) {
          record[key] = val;
          if (val !== '' && val !== null && val !== undefined) {
            hasData = true;
          }
        }
      }

      if (hasData) {
        records.push(record);
      }
    }

    // Return newest first
    records.reverse();

    return createJsonResponse({
      ok: true,
      records: records,
      count: records.length,
      formType: formType,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ ok: false, error: 'No POST payload provided' });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ ok: false, error: 'Malformed JSON payload' });
    }

    const formType = (payload.formType || 'general').toLowerCase();
    const action = payload.action || 'submit';
    const submissionId = payload.submissionId || ('GHAC-' + Date.now());
    const permitData = payload.data || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = getSheetNameForForm(formType);
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = initializeSheet(ss, sheetName);
    }

    // Ensure metadata fields exist
    permitData['Submission ID'] = submissionId;
    permitData['Last Updated'] = new Date().toISOString();
    if (!permitData['Created At']) {
      permitData['Created At'] = new Date().toISOString();
    }

    // Get current headers
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].filter(String);
    const incomingKeys = Object.keys(permitData);

    // Add any newly encountered fields as new columns
    const allHeaders = [...currentHeaders];
    for (let i = 0; i < incomingKeys.length; i++) {
      const k = incomingKeys[i];
      if (allHeaders.indexOf(k) === -1) {
        allHeaders.push(k);
      }
    }

    if (allHeaders.length > currentHeaders.length) {
      sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
      sheet.getRange(1, 1, 1, allHeaders.length).setFontWeight('bold').setBackground('#E5ECE8');
    }

    // Check if updating an existing record (by Submission ID)
    const data = sheet.getDataRange().getValues();
    let rowIndexToUpdate = -1;
    const subIdColIdx = allHeaders.indexOf('Submission ID');

    if (data.length > 1 && subIdColIdx !== -1) {
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][subIdColIdx]) === String(submissionId)) {
          rowIndexToUpdate = r + 1; // 1-indexed for Sheets API
          break;
        }
      }
    }

    const rowValues = allHeaders.map(function(header) {
      const val = permitData[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });

    if (rowIndexToUpdate > 0) {
      sheet.getRange(rowIndexToUpdate, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return createJsonResponse({
      ok: true,
      submissionId: submissionId,
      action: action,
      formType: formType,
      updatedRow: rowIndexToUpdate > 0 ? rowIndexToUpdate : sheet.getLastRow(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({ ok: false, error: err.toString() });
  }
}

function getSheetNameForForm(formType) {
  switch (String(formType).toLowerCase()) {
    case 'hotwork':
      return 'HotWork_Permits';
    case 'height':
      return 'Height_Permits';
    default:
      return 'General_Permits';
  }
}

function initializeSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const defaultHeaders = [
    'Submission ID',
    'Created At',
    'Last Updated',
    'Work Order Number',
    'Permit Number',
    'Location',
    'Department',
    'Status',
    'Approval Status',
    'Department Authorization',
    'HoD Approval'
  ];

  sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight('bold').setBackground('#E5ECE8');
  sheet.setFrozenRows(1);

  return sheet;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
