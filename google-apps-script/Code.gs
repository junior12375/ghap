/**
 * GHACEM Corporate Permit-to-Work (GHACPerm)
 * Google Apps Script Web App Backend for Google Sheets + Automatic Email Dispatch
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename sheet tabs to: "General_Permits", "HotWork_Permits", "Height_Permits"
 * 3. Click Extensions > Apps Script
 * 4. Paste this complete code into Code.gs
 * 5. Click Deploy > New deployment (or Manage deployments > Edit > New version)
 * 6. Select type: "Web app"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"
 * 9. Click Deploy and authorize Gmail/Sheets permissions if prompted
 */

const EHS_EMAIL = 'sebastianerchiejnr4@gmail.com';
const HOD_EMAIL = 'oseiemmanue67@gmail.com';
const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbz8L1Izxu4dXNaQ9uIgwIGLtxT9o3N8w3kNA7cba2r27YD3YSfEIahLCs4fkQ5W_Igv/exec';

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const mode = (params && params.mode) ? String(params.mode).toLowerCase() : '';
    const formType = (params && (params.formType || params.permit))
      ? String(params.formType || params.permit).toLowerCase()
      : 'general';

    if (mode === 'ehs_test') {
      return renderEhsGasTestPage(
        formType,
        String(params.id || '').trim(),
        String(params.workorder || '').trim()
      );
    }

    if (mode === 'review' || (!mode && params && params.permit && params.id)) {
      return renderPermitReviewPage(
        formType,
        String(params.id || '').trim(),
        String(params.workorder || '').trim()
      );
    }

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

    if (action === 'ping') {
      return createJsonResponse({
        ok: true,
        message: 'GHACPerm Cloud Backend & Automatic Email Dispatch Online',
        timestamp: new Date().toISOString()
      });
    }

    const submissionId = payload.submissionId || ('GHAC-' + Date.now());
    const incomingData = payload.data || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = getSheetNameForForm(formType);
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = initializeSheet(ss, sheetName);
    }

    const nowIso = new Date().toISOString();
    let hodFieldCode = '';

    // Enrich action-specific metadata
    if (action === 'request_ehs_test') {
      hodFieldCode = 'GH-' + Math.floor(100000 + Math.random() * 900000);
      incomingData['Department Authorization'] = 'Approved';
      incomingData['EHS Test Status'] = 'Requested';
      incomingData['EHS Alert Dispatched At'] = nowIso;
      incomingData['HoD Field Code'] = hodFieldCode;
    } else if (action === 'close') {
      incomingData['Status'] = 'Closed';
      incomingData['Closed At'] = incomingData['Closed At'] || new Date().toLocaleString();
    } else if (action === 'hod_decision') {
      const decision = String(incomingData['HoD Approval'] || incomingData['Approval Status'] || '').toLowerCase();
      if (decision === 'rejected') {
        incomingData['HoD Approval'] = 'Rejected';
        incomingData['Approval Status'] = 'Rejected';
        incomingData['Permit Status'] = 'Rejected';
        incomingData['Status'] = 'Rejected';
      } else {
        incomingData['HoD Approval'] = 'Approved';
        incomingData['Approval Status'] = 'Approved';
        incomingData['Permit Status'] = 'Approved';
        incomingData['Status'] = incomingData['Status'] || 'Active';
      }
      incomingData['HoD Approval At'] = incomingData['HoD Approval At'] || new Date().toLocaleString();
    }

    // Get current headers & data to merge safely when updating an existing row
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].filter(String);
    const data = sheet.getDataRange().getValues();
    let rowIndexToUpdate = -1;
    const subIdColIdxExisting = currentHeaders.indexOf('Submission ID');
    const mergedRecord = {};

    if (data.length > 1 && subIdColIdxExisting !== -1) {
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][subIdColIdxExisting]) === String(submissionId)) {
          rowIndexToUpdate = r + 1;
          for (let c = 0; c < currentHeaders.length; c++) {
            mergedRecord[currentHeaders[c]] = data[r][c];
          }
          break;
        }
      }
    }

    // Merge incoming fields into existing record
    const incomingKeys = Object.keys(incomingData);
    for (let i = 0; i < incomingKeys.length; i++) {
      const k = incomingKeys[i];
      mergedRecord[k] = incomingData[k];
    }

    mergedRecord['Submission ID'] = submissionId;
    mergedRecord['Last Updated'] = nowIso;
    if (!mergedRecord['Created At']) {
      mergedRecord['Created At'] = nowIso;
    }

    const allKeys = Object.keys(mergedRecord);
    const allHeaders = [...currentHeaders];
    for (let i = 0; i < allKeys.length; i++) {
      if (allHeaders.indexOf(allKeys[i]) === -1) {
        allHeaders.push(allKeys[i]);
      }
    }

    if (allHeaders.length > currentHeaders.length) {
      sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
      sheet.getRange(1, 1, 1, allHeaders.length).setFontWeight('bold').setBackground('#E5ECE8');
    }

    const rowValues = allHeaders.map(function(header) {
      const val = mergedRecord[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });

    if (rowIndexToUpdate > 0) {
      sheet.getRange(rowIndexToUpdate, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    // Automatic background email dispatch (unless already delivered by Express server)
    let emailDispatched = false;
    if (!payload.skipAppsScriptEmail) {
      emailDispatched = dispatchAutomaticEmail(action, formType, submissionId, mergedRecord, hodFieldCode);
    }

    return createJsonResponse({
      ok: true,
      submissionId: submissionId,
      action: action,
      formType: formType,
      hodFieldCode: hodFieldCode || undefined,
      emailDispatched: emailDispatched,
      updatedRow: rowIndexToUpdate > 0 ? rowIndexToUpdate : sheet.getLastRow(),
      timestamp: nowIso
    });
  } catch (err) {
    return createJsonResponse({ ok: false, error: err.toString() });
  }
}

function escapeHtmlText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getWebAppReviewBaseUrl() {
  try {
    const svcUrl = ScriptApp.getService().getUrl();
    if (svcUrl && svcUrl.indexOf('http') === 0 && svcUrl.indexOf('/exec') !== -1) {
      return svcUrl;
    }
  } catch (ignore) {}
  return DEFAULT_WEB_APP_URL;
}

function buildReviewActionUrl(formType, submissionId, workOrder, existingUrl) {
  if (
    existingUrl &&
    String(existingUrl).indexOf('script.google.com/') !== -1 &&
    String(existingUrl).indexOf('mode=review') !== -1
  ) {
    return String(existingUrl);
  }
  const base = getWebAppReviewBaseUrl();
  let url =
    base +
    (base.indexOf('?') === -1 ? '?' : '&') +
    'mode=review&permit=' +
    encodeURIComponent(formType) +
    '&id=' +
    encodeURIComponent(submissionId);
  if (workOrder && workOrder !== 'UNSPECIFIED') {
    url += '&workorder=' + encodeURIComponent(workOrder);
  }
  return url;
}

function buildEhsTestActionUrl(formType, submissionId, workOrder, existingUrl) {
  if (
    existingUrl &&
    String(existingUrl).indexOf('script.google.com/') !== -1 &&
    String(existingUrl).indexOf('mode=ehs_test') !== -1
  ) {
    return String(existingUrl);
  }
  const base = getWebAppReviewBaseUrl();
  let url =
    base +
    (base.indexOf('?') === -1 ? '?' : '&') +
    'mode=ehs_test&permit=' +
    encodeURIComponent(formType) +
    '&id=' +
    encodeURIComponent(submissionId);
  if (workOrder && workOrder !== 'UNSPECIFIED') {
    url += '&workorder=' + encodeURIComponent(workOrder);
  }
  return url;
}

function dispatchAutomaticEmail(action, formType, submissionId, record, hodFieldCode) {
  try {
    const wo = record['Work Order Number'] || record['Work Order No.'] || 'UNSPECIFIED';
    const loc = record['Location'] || record['Department/Location'] || 'Plant Grounds';
    const dept = record['Department'] || 'Plant Operations';
    const eq = record['Equipment ID'] || 'N/A';
    const desc = record['Description'] || record['Purpose'] || record['Type of Work'] || 'Plant Maintenance';
    let actionUrl = buildReviewActionUrl(formType, submissionId, wo, record['Verification URL']);
    const formLabel =
      formType === 'hotwork'
        ? 'Hot Work / Confined Space / Silo Entry (04B)'
        : formType === 'height'
        ? 'Working at Height (04C)'
        : 'General Work Permit (04A)';

    let recipients = [];
    let subject = '';
    let heading = '';
    let intro = '';
    let bannerColor = '#0f8a3c';
    let ctaLabel = 'Open Permit to Approve or Reject';

    if (action === 'request_ehs_test') {
      recipients = [EHS_EMAIL];
      actionUrl = buildEhsTestActionUrl(formType, submissionId, wo, record['EHS Test URL']);
      subject = '[RED PROTOCOL ALERT] Enter EHS Confined Space Gas Test Results - WO #' + wo + ' (' + loc + ')';
      heading = 'RED PROTOCOL: EHS ATMOSPHERIC GAS TEST REQUIRED';
      intro = 'An on-site EHS Atmospheric Gas Test (O2, LEL, CO, Temperature) is required before Confined Space / Silo Entry may commence. Click the button below to enter and submit the gas test results.';
      bannerColor = '#c5221f';
      ctaLabel = 'Enter Atmospheric Gas Test Results';
    } else if (action === 'ehs_test_completed') {
      recipients = [HOD_EMAIL, EHS_EMAIL];
      subject = '[GHACPerm EHS Gas Test Logged] Review & Approve Permit - WO #' + wo + ' (' + submissionId + ')';
      heading = 'EHS ATMOSPHERIC GAS TEST RESULTS LOGGED';
      intro = 'EHS has submitted atmospheric gas test readings for this Confined Space / Silo Entry permit. Click the button below to review the gas readings and approve or reject the permit.';
      bannerColor = String(record['EHS Test Status'] || '').toLowerCase().indexOf('unsafe') !== -1 ? '#c5221f' : '#0f8a3c';
      ctaLabel = 'Open Permit to Approve or Reject';
    } else if (action === 'close') {
      recipients = [HOD_EMAIL, EHS_EMAIL];
      subject = '[GHACPerm Closed] Work Completed & Handed Back - WO #' + wo + ' (' + submissionId + ')';
      heading = 'PERMIT CLOSED & HANDED BACK';
      intro = 'Work under this permit has been marked completed and closed by ' + (record['Closed By'] || 'Executive Operations') + '.';
      bannerColor = '#1d4ed8';
      ctaLabel = 'View Closed Permit Record';
    } else if (action === 'hod_decision') {
      const isRejected = String(record['HoD Approval'] || '').toLowerCase() === 'rejected';
      recipients = [HOD_EMAIL, EHS_EMAIL];
      if (isRejected) {
        subject = '[GHACPerm REJECTED] Permit Denied - WO #' + wo + ' (' + submissionId + ')';
        heading = 'PERMIT FORMALLY REJECTED';
        intro = 'This Permit-to-Work was rejected by ' + (record['HoD Rejected By'] || 'Head of Department (HoD)') + '.';
        bannerColor = '#c5221f';
        ctaLabel = 'View Rejection Details';
      } else {
        subject = '[GHACPerm APPROVED] Permit Authorized - WO #' + wo + ' (' + submissionId + ')';
        heading = 'PERMIT FORMALLY APPROVED';
        intro = 'This Permit-to-Work has been approved by ' + (record['HoD Approved By'] || 'Head of Department (HoD)') + '.';
        bannerColor = '#0f8a3c';
        ctaLabel = 'Open Permit Record';
      }
    } else if (action === 'submit') {
      recipients = formType === 'hotwork' ? [HOD_EMAIL, EHS_EMAIL] : [HOD_EMAIL];
      subject = '[GHACPerm] Permit Submitted for Approval - WO #' + wo + ' (' + submissionId + ')';
      heading = formType === 'hotwork' ? 'HIGH-RISK RED PROTOCOL PERMIT SUBMITTED' : 'PERMIT SUBMITTED FOR AUTHORIZATION';
      intro = 'A Permit-to-Work has been submitted and requires authorization review. Click the button below to open the permit and approve or reject it with a reason.';
      bannerColor = formType === 'hotwork' ? '#c5221f' : '#0f8a3c';
      ctaLabel = 'Open Permit to Approve or Reject';
    } else {
      return false;
    }

    const detailRows = [
      ['Permit Classification', formLabel],
      ['Submission ID', submissionId],
      ['Work Order Number', wo],
      ['Location', loc],
      ['Department', dept],
      ['Equipment ID', eq],
      ['Work Scope', desc],
      ['Status', record['Status'] || 'Active']
    ];
    if (hodFieldCode) detailRows.push(['HoD Field Code', hodFieldCode]);
    if (action === 'ehs_test_completed') {
      detailRows.push(['O2 Reading', (record['O2 Reading'] || 'N/A') + ' (' + (record['O2 Date'] || '') + ' ' + (record['O2 Time'] || '') + ')']);
      detailRows.push(['LEL Reading', (record['LEL Reading'] || 'N/A') + ' (' + (record['LEL Date'] || '') + ' ' + (record['LEL Time'] || '') + ')']);
      detailRows.push(['CO Reading', (record['CO Reading'] || 'N/A') + ' (' + (record['CO Date'] || '') + ' ' + (record['CO Time'] || '') + ')']);
      detailRows.push(['Temperature', (record['Temp Reading'] || 'N/A') + ' (' + (record['Temp Date'] || '') + ' ' + (record['Temp Time'] || '') + ')']);
      if (record['Confined Space Tested By']) detailRows.push(['Tested By (EHS)', record['Confined Space Tested By']]);
      if (record['EHS Test Status']) detailRows.push(['EHS Test Status', record['EHS Test Status']]);
      if (record['EHS Test Remarks']) detailRows.push(['EHS Remarks', record['EHS Test Remarks']]);
    }
    if (record['HoD Rejection Reason']) detailRows.push(['Rejection Reason', record['HoD Rejection Reason']]);
    if (record['HoD Decision Remarks'] && !record['HoD Rejection Reason']) detailRows.push(['Decision Remarks', record['HoD Decision Remarks']]);
    if (record['Closed By']) detailRows.push(['Closed By', record['Closed By']]);
    if (record['Closure Remarks']) detailRows.push(['Closure Remarks', record['Closure Remarks']]);
    detailRows.push(['Timestamp', new Date().toLocaleString()]);

    const lines = [
      'GHACEM CORPORATE PERMIT-TO-WORK (GHACPerm)',
      heading,
      '============================================================',
      intro,
      '',
      ...detailRows.map(function(row) { return row[0] + ': ' + row[1]; }),
      'Open Permit to Approve/Reject: ' + actionUrl,
      '',
      '-- Automated Dispatch from GHACPerm Corporate Safety System'
    ];

    const htmlRows = detailRows.map(function(row) {
      return '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:180px;">' +
        escapeHtmlText(row[0]) +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">' +
        escapeHtmlText(row[1]) +
        '</td></tr>';
    }).join('');

    const htmlBody =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#ffffff;">' +
        '<div style="background:' + bannerColor + ';color:#ffffff;padding:18px 22px;">' +
          '<div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">GHACEM Corporate Permit-to-Work</div>' +
          '<h2 style="margin:6px 0 0;font-size:18px;line-height:1.3;">' + escapeHtmlText(heading) + '</h2>' +
        '</div>' +
        '<div style="padding:20px 22px;color:#1f2937;font-size:14px;line-height:1.5;">' +
          '<p style="margin-top:0;">' + escapeHtmlText(intro) + '</p>' +
          '<div style="margin:20px 0;text-align:center;">' +
            '<a href="' + escapeHtmlText(actionUrl) + '" style="display:inline-block;background:' + bannerColor + ';color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;font-size:14px;">' +
              escapeHtmlText(ctaLabel) +
            '</a>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;border:1px solid #e5e7eb;">' +
            htmlRows +
          '</table>' +
          '<p style="margin:12px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">' +
            'Direct Permit Link: <a href="' + escapeHtmlText(actionUrl) + '" style="color:' + bannerColor + ';">' + escapeHtmlText(actionUrl) + '</a>' +
          '</p>' +
        '</div>' +
        '<div style="background:#f9fafb;padding:12px 22px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;">' +
          'Automated notification dispatched by GHACPerm ISO 45001 Safety System.' +
        '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: subject,
      body: lines.join('\n'),
      htmlBody: htmlBody
    });
    return true;
  } catch (mailErr) {
    Logger.log('MailApp dispatch error: ' + mailErr.toString());
    return false;
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

function findPermitRecordAcrossSheets(preferredFormType, submissionId, workOrder) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const candidates = ['general', 'hotwork', 'height'].filter(function(t) {
    return t !== preferredFormType;
  });
  const searchOrder = [preferredFormType].concat(candidates);

  for (let i = 0; i < searchOrder.length; i++) {
    const fType = searchOrder[i];
    const sheet = ss.getSheetByName(getSheetNameForForm(fType));
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const headers = data[0];
    const subIdIdx = headers.indexOf('Submission ID');
    const woIdx1 = headers.indexOf('Work Order Number');
    const woIdx2 = headers.indexOf('Work Order No.');

    for (let r = data.length - 1; r >= 1; r--) {
      const row = data[r];
      const rowSubId = subIdIdx !== -1 ? String(row[subIdIdx] || '').trim() : '';
      const rowWo = String(
        (woIdx1 !== -1 ? row[woIdx1] : '') || (woIdx2 !== -1 ? row[woIdx2] : '') || ''
      ).trim();

      const matchedById = submissionId && rowSubId === submissionId;
      const matchedByWo = !submissionId && workOrder && rowWo === workOrder;

      if (matchedById || matchedByWo) {
        const record = {};
        for (let c = 0; c < headers.length; c++) {
          if (headers[c]) record[headers[c]] = row[c];
        }
        return {
          formType: fType,
          sheet: sheet,
          headers: headers,
          rowIndex: r + 1,
          record: record,
          submissionId: rowSubId || submissionId
        };
      }
    }
  }
  return null;
}

function submitPermitDecisionFromWeb(formType, submissionId, decision, reviewerName, notes) {
  const cleanDecision = String(decision || '').toLowerCase() === 'rejected' ? 'rejected' : 'approved';
  const cleanNotes = String(notes || '').trim();
  const cleanReviewer = String(reviewerName || '').trim() || 'Head of Department (HoD)';

  if (cleanDecision === 'rejected' && !cleanNotes) {
    return { ok: false, error: 'A rejection reason is required before rejecting this permit.' };
  }

  const found = findPermitRecordAcrossSheets(
    String(formType || 'general').toLowerCase(),
    String(submissionId || '').trim(),
    ''
  );
  if (!found) {
    return { ok: false, error: 'Permit record not found in Google Sheets.' };
  }

  const nowIso = new Date().toISOString();
  const nowDisplay = new Date().toLocaleString();
  const mergedRecord = Object.assign({}, found.record);

  if (cleanDecision === 'rejected') {
    mergedRecord['HoD Approval'] = 'Rejected';
    mergedRecord['Approval Status'] = 'Rejected';
    mergedRecord['Permit Status'] = 'Rejected';
    mergedRecord['Status'] = 'Rejected';
    mergedRecord['HoD Rejected By'] = cleanReviewer;
    mergedRecord['HoD Approved By'] = '';
    mergedRecord['HoD Rejection Reason'] = cleanNotes;
    mergedRecord['Rejection Reason'] = cleanNotes;
    mergedRecord['HoD Decision Remarks'] = cleanNotes;
  } else {
    mergedRecord['HoD Approval'] = 'Approved';
    mergedRecord['Approval Status'] = 'Approved';
    mergedRecord['Permit Status'] = 'Approved';
    mergedRecord['Status'] = 'Active';
    mergedRecord['HoD Approved By'] = cleanReviewer;
    mergedRecord['HoD Rejected By'] = '';
    mergedRecord['HoD Rejection Reason'] = '';
    mergedRecord['Rejection Reason'] = '';
    mergedRecord['HoD Decision Remarks'] = cleanNotes;
  }

  mergedRecord['HoD Approval At'] = nowDisplay;
  mergedRecord['Last Updated'] = nowIso;

  const sheet = found.sheet;
  const allHeaders = found.headers.slice();
  const keys = Object.keys(mergedRecord);
  for (let i = 0; i < keys.length; i++) {
    if (allHeaders.indexOf(keys[i]) === -1) {
      allHeaders.push(keys[i]);
    }
  }

  if (allHeaders.length > found.headers.length) {
    sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
    sheet.getRange(1, 1, 1, allHeaders.length).setFontWeight('bold').setBackground('#E5ECE8');
  }

  const rowValues = allHeaders.map(function(h) {
    const val = mergedRecord[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });

  sheet.getRange(found.rowIndex, 1, 1, rowValues.length).setValues([rowValues]);

  dispatchAutomaticEmail('hod_decision', found.formType, found.submissionId, mergedRecord, '');

  return {
    ok: true,
    decision: cleanDecision,
    status: mergedRecord['Status'],
    decidedBy: cleanReviewer,
    decisionAt: nowDisplay,
    reason: mergedRecord['HoD Rejection Reason'] || '',
    remarks: mergedRecord['HoD Decision Remarks'] || ''
  };
}

function renderPermitReviewPage(formType, submissionId, workOrder) {
  const found = findPermitRecordAcrossSheets(formType, submissionId, workOrder);

  if (!found) {
    const notFoundHtml =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>GHACPerm · Permit Not Found</title></head>' +
      '<body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827;">' +
        '<div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;text-align:center;">' +
          '<div style="font-size:12px;font-weight:700;color:#0f8a3c;letter-spacing:1px;">GHACEM CORPORATE PERMIT-TO-WORK</div>' +
          '<h1 style="font-size:20px;margin:10px 0;">Permit Record Not Found</h1>' +
          '<p style="font-size:14px;color:#4b5563;">Could not locate Submission ID <strong>' + escapeHtmlText(submissionId || 'N/A') + '</strong> in the central register yet. If it was just submitted offline, wait for sync and retry.</p>' +
        '</div>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(notFoundHtml)
      .setTitle('GHACPerm · Permit Not Found')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const r = found.record;
  const resolvedType = found.formType;
  const resolvedId = found.submissionId;
  const wo = r['Work Order Number'] || r['Work Order No.'] || workOrder || 'N/A';
  const loc = r['Location'] || r['Department/Location'] || 'Plant Grounds';
  const dept = r['Department'] || 'General';
  const eq = r['Equipment ID'] || 'N/A';
  const contractor = r['Contractor'] || r['Dept/Contractor'] || 'In-House';
  const desc = r['Description'] || r['Purpose'] || r['Type of Work'] || 'N/A';
  const supName = r['Authorization Signed By'] || r['Safe Commence - Mgr'] || r['Auth - Mgr'] || r['Approved By'] || 'Supervisor';
  const supId = r['Authorization Signed By ID'] || r['Safe Commence - Mgr ID'] || r['Auth - Mgr ID'] || r['Supervisor Work ID'] || 'Verified';
  const crewName = r['Crew Leader Signed By'] || r['Safe Commence - Crew'] || r['Auth - Crew'] || 'Crew Leader';
  const updated = r['Last Updated'] || r['Timestamp'] || '';
  const hodApproval = String(r['HoD Approval'] || r['Approval Status'] || '').toLowerCase();
  const statusStr = String(r['Status'] || '').toLowerCase();
  const isClosed = statusStr === 'closed' || statusStr === 'cancelled';
  const isRejected = hodApproval === 'rejected' || statusStr === 'rejected';
  const isApproved = !isRejected && hodApproval === 'approved';
  const existingReason = String(r['HoD Rejection Reason'] || r['Rejection Reason'] || '');
  const existingRemarks = String(r['HoD Decision Remarks'] || '');
  const existingOfficer = String(r['HoD Approved By'] || r['HoD Rejected By'] || '');
  const existingAt = String(r['HoD Approval At'] || '');

  const formLabel =
    resolvedType === 'hotwork'
      ? 'Hot Work / Confined Space / Silo Entry (04B)'
      : resolvedType === 'height'
      ? 'Working at Height (04C)'
      : 'General Work Permit (04A)';

  const badgeText = isRejected ? 'REJECTED' : isClosed ? 'CLOSED' : isApproved ? 'HOD APPROVED' : 'PENDING REVIEW';
  const badgeBg = isRejected ? '#fee2e2' : isClosed ? '#e5e7eb' : isApproved ? '#dcfce7' : '#fef3c7';
  const badgeColor = isRejected ? '#b91c1c' : isClosed ? '#374151' : isApproved ? '#15803d' : '#b45309';

  const gasBlock = resolvedType === 'hotwork'
    ? '<div style="margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">' +
        '<div style="font-size:11px;font-weight:700;color:#0f8a3c;text-transform:uppercase;margin-bottom:8px;">Atmospheric Gas Readings</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px;">' +
          '<div><span style="color:#6b7280;display:block;font-size:10px;">O2</span><strong>' + escapeHtmlText(r['O2 Reading'] || 'N/A') + '</strong></div>' +
          '<div><span style="color:#6b7280;display:block;font-size:10px;">LEL</span><strong>' + escapeHtmlText(r['LEL Reading'] || 'N/A') + '</strong></div>' +
          '<div><span style="color:#6b7280;display:block;font-size:10px;">CO</span><strong>' + escapeHtmlText(r['CO Reading'] || 'N/A') + '</strong></div>' +
          '<div><span style="color:#6b7280;display:block;font-size:10px;">Temp</span><strong>' + escapeHtmlText(r['Temp Reading'] || 'N/A') + '</strong></div>' +
        '</div>' +
      '</div>'
    : '';

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>GHACPerm · Review Permit ' + escapeHtmlText(resolvedId) + '</title>' +
    '<style>' +
      'body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:16px;color:#111827;}' +
      '.card{max-width:740px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);}' +
      '.hdr{background:#0b3b24;color:#ffffff;padding:18px 22px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;}' +
      '.badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.4px;}' +
      '.body{padding:20px 22px;}' +
      '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-top:14px;font-size:13px;}' +
      '@media(max-width:540px){.grid{grid-template-columns:1fr;}}' +
      '.lbl{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;display:block;margin-bottom:2px;}' +
      '.decision-box{border:2px solid #0f8a3c;background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:18px;}' +
      'input,textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:inherit;background:#ffffff;}' +
      '.btn-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:12px;}' +
      '.btn{border:none;border-radius:8px;padding:11px 18px;font-size:13px;font-weight:700;cursor:pointer;color:#ffffff;}' +
      '.btn:disabled{opacity:0.6;cursor:not-allowed;}' +
      '.btn-approve{background:#0f8a3c;}' +
      '.btn-reject{background:#dc2626;}' +
      '.msg{margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;display:none;}' +
    '</style></head><body>' +
    '<div class="card">' +
      '<div class="hdr">' +
        '<div>' +
          '<div style="font-size:11px;letter-spacing:1px;opacity:0.85;">GHACEM CORPORATE PERMIT-TO-WORK</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:3px;">Work Order ' + escapeHtmlText(wo) + ' · ' + escapeHtmlText(loc) + '</div>' +
          '<div style="font-size:12px;opacity:0.85;margin-top:2px;">' + escapeHtmlText(formLabel) + ' · ID: ' + escapeHtmlText(resolvedId) + '</div>' +
        '</div>' +
        '<span id="statusBadge" class="badge" style="background:' + badgeBg + ';color:' + badgeColor + ';">' + escapeHtmlText(badgeText) + '</span>' +
      '</div>' +
      '<div class="body">' +
        (isClosed
          ? '<div style="padding:12px 14px;border-radius:8px;background:#f3f4f6;border:1px solid #d1d5db;font-size:13px;margin-bottom:16px;"><strong>Permit Closed:</strong> Work has already been completed and handed back.</div>'
          : '<div class="decision-box">' +
              '<div style="font-size:15px;font-weight:700;color:#065f46;margin-bottom:4px;">HoD / EHS Authorization Decision</div>' +
              '<div style="font-size:12px;color:#374151;margin-bottom:12px;">Review the permit details below, then approve or reject with a mandatory reason.</div>' +
              '<label class="lbl" for="reviewerName">Authorizing Officer / HoD Name</label>' +
              '<input id="reviewerName" type="text" placeholder="e.g. Osei Emmanuel (HoD)" value="' + escapeHtmlText(existingOfficer) + '" style="margin-bottom:10px;" />' +
              '<label class="lbl" for="decisionNotes">Approval Remarks or Mandatory Rejection Reason</label>' +
              '<textarea id="decisionNotes" rows="3" placeholder="Optional remarks when approving, or enter the exact rejection reason when rejecting...">' + escapeHtmlText(existingReason || existingRemarks) + '</textarea>' +
              '<div id="feedbackMsg" class="msg"></div>' +
              '<div class="btn-row">' +
                '<button id="rejectBtn" class="btn btn-reject" type="button" onclick="handleDecision(\'rejected\')">Reject Permit with Reason</button>' +
                '<button id="approveBtn" class="btn btn-approve" type="button" onclick="handleDecision(\'approved\')">Approve Permit</button>' +
              '</div>' +
            '</div>'
        ) +
        (isRejected && existingReason
          ? '<div style="padding:12px 14px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;margin-bottom:14px;"><strong>Recorded Rejection Reason:</strong> ' + escapeHtmlText(existingReason) + (existingAt ? ' <span style="font-size:11px;color:#6b7280;">(' + escapeHtmlText(existingAt) + ')</span>' : '') + '</div>'
          : ''
        ) +
        '<div class="grid">' +
          '<div><span class="lbl">Work Order Number</span><strong>' + escapeHtmlText(wo) + '</strong></div>' +
          '<div><span class="lbl">Department</span>' + escapeHtmlText(dept) + '</div>' +
          '<div><span class="lbl">Location</span>' + escapeHtmlText(loc) + '</div>' +
          '<div><span class="lbl">Contractor / Crew</span>' + escapeHtmlText(contractor) + '</div>' +
          '<div><span class="lbl">Equipment ID</span>' + escapeHtmlText(eq) + '</div>' +
          '<div><span class="lbl">Last Updated</span>' + escapeHtmlText(updated || 'N/A') + '</div>' +
        '</div>' +
        '<div style="margin-top:14px;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;font-size:13px;">' +
          '<span class="lbl">Scope of Activity & Description</span>' +
          '<div style="margin-top:4px;line-height:1.5;">' + escapeHtmlText(desc) + '</div>' +
        '</div>' +
        gasBlock +
        '<div class="grid">' +
          '<div><span class="lbl">Site Supervisor Authorization</span><strong>' + escapeHtmlText(supName) + '</strong> (' + escapeHtmlText(supId) + ')</div>' +
          '<div><span class="lbl">Crew Leader Receipt</span><strong>' + escapeHtmlText(crewName) + '</strong></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<script>' +
      'var PERMIT_TYPE = ' + JSON.stringify(resolvedType) + ';' +
      'var SUBMISSION_ID = ' + JSON.stringify(resolvedId) + ';' +
      'function showMsg(text, isErr){' +
        'var el=document.getElementById("feedbackMsg");' +
        'if(!el)return;' +
        'el.style.display="block";' +
        'el.style.background=isErr?"#fef2f2":"#dcfce7";' +
        'el.style.color=isErr?"#b91c1c":"#166534";' +
        'el.style.border=isErr?"1px solid #fecaca":"1px solid #86efac";' +
        'el.textContent=text;' +
      '}' +
      'function setBusy(busy){' +
        'var a=document.getElementById("approveBtn");' +
        'var r=document.getElementById("rejectBtn");' +
        'if(a)a.disabled=busy;' +
        'if(r)r.disabled=busy;' +
      '}' +
      'function handleDecision(decision){' +
        'var nameEl=document.getElementById("reviewerName");' +
        'var notesEl=document.getElementById("decisionNotes");' +
        'var reviewer=nameEl?nameEl.value.trim():"";' +
        'var notes=notesEl?notesEl.value.trim():"";' +
        'if(decision==="rejected"&&!notes){' +
          'showMsg("Please enter a specific rejection reason before rejecting this permit.",true);' +
          'if(notesEl)notesEl.focus();' +
          'return;' +
        '}' +
        'setBusy(true);' +
        'showMsg(decision==="rejected"?"Recording rejection and notifying team...":"Recording approval and updating permit register...",false);' +
        'google.script.run' +
          '.withSuccessHandler(function(res){' +
            'setBusy(false);' +
            'if(!res||!res.ok){showMsg((res&&res.error)||"Failed to update permit.",true);return;}' +
            'var badge=document.getElementById("statusBadge");' +
            'if(badge){' +
              'if(res.decision==="rejected"){badge.textContent="REJECTED";badge.style.background="#fee2e2";badge.style.color="#b91c1c";}' +
              'else{badge.textContent="HOD APPROVED";badge.style.background="#dcfce7";badge.style.color="#15803d";}' +
            '}' +
            'showMsg(res.decision==="rejected"?"Permit formally rejected with reason and saved to Google Sheets.":"Permit approved and saved to Google Sheets.",false);' +
          '})' +
          '.withFailureHandler(function(err){' +
            'setBusy(false);' +
            'showMsg("Error saving decision: "+(err&&err.message?err.message:String(err)),true);' +
          '})' +
          '.submitPermitDecisionFromWeb(PERMIT_TYPE,SUBMISSION_ID,decision,reviewer,notes);' +
      '}' +
    '</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('GHACPerm · Permit Review (' + resolvedId + ')')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function submitEhsGasTestFromWeb(formType, submissionId, testPayload) {
  const payload = testPayload || {};
  const tester = String(payload.testedBy || '').trim();
  if (!tester) {
    return { ok: false, error: 'Please enter the EHS Officer / Gas Tester name.' };
  }

  const found = findPermitRecordAcrossSheets(
    String(formType || 'hotwork').toLowerCase(),
    String(submissionId || '').trim(),
    ''
  );
  if (!found) {
    return { ok: false, error: 'Permit record not found in Google Sheets.' };
  }

  const nowIso = new Date().toISOString();
  const nowDisplay = new Date().toLocaleString();
  const clearance = String(payload.clearance || 'Completed') === 'Unsafe' ? 'Unsafe - Entry Denied' : 'Completed';
  const mergedRecord = Object.assign({}, found.record);

  mergedRecord['O2 Reading'] = String(payload.o2Reading || '').trim();
  mergedRecord['O2 Date'] = String(payload.o2Date || '').trim();
  mergedRecord['O2 Time'] = String(payload.o2Time || '').trim();
  mergedRecord['LEL Reading'] = String(payload.lelReading || '').trim();
  mergedRecord['LEL Date'] = String(payload.lelDate || '').trim();
  mergedRecord['LEL Time'] = String(payload.lelTime || '').trim();
  mergedRecord['CO Reading'] = String(payload.coReading || '').trim();
  mergedRecord['CO Date'] = String(payload.coDate || '').trim();
  mergedRecord['CO Time'] = String(payload.coTime || '').trim();
  mergedRecord['Temp Reading'] = String(payload.tempReading || '').trim();
  mergedRecord['Temp Date'] = String(payload.tempDate || '').trim();
  mergedRecord['Temp Time'] = String(payload.tempTime || '').trim();
  mergedRecord['Confined Space Tested By'] = tester;
  mergedRecord['EHS Test Completed'] = clearance === 'Completed' ? 'Completed' : 'Unsafe';
  mergedRecord['EHS Test Status'] = clearance;
  mergedRecord['EHS Test Remarks'] = String(payload.remarks || '').trim();
  mergedRecord['EHS Test Completed At'] = nowDisplay;
  mergedRecord['Last Updated'] = nowIso;

  const sheet = found.sheet;
  const allHeaders = found.headers.slice();
  const keys = Object.keys(mergedRecord);
  for (let i = 0; i < keys.length; i++) {
    if (allHeaders.indexOf(keys[i]) === -1) {
      allHeaders.push(keys[i]);
    }
  }

  if (allHeaders.length > found.headers.length) {
    sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
    sheet.getRange(1, 1, 1, allHeaders.length).setFontWeight('bold').setBackground('#E5ECE8');
  }

  const rowValues = allHeaders.map(function(h) {
    const val = mergedRecord[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });

  sheet.getRange(found.rowIndex, 1, 1, rowValues.length).setValues([rowValues]);

  dispatchAutomaticEmail('ehs_test_completed', found.formType, found.submissionId, mergedRecord, '');

  return {
    ok: true,
    status: clearance,
    completedAt: nowDisplay
  };
}

function renderEhsGasTestPage(formType, submissionId, workOrder) {
  const found = findPermitRecordAcrossSheets(formType || 'hotwork', submissionId, workOrder);

  if (!found) {
    const notFoundHtml =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>GHACPerm · Permit Not Found</title></head>' +
      '<body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827;">' +
        '<div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;text-align:center;">' +
          '<div style="font-size:12px;font-weight:700;color:#c5221f;letter-spacing:1px;">GHACEM RED PROTOCOL EHS</div>' +
          '<h1 style="font-size:20px;margin:10px 0;">Permit Record Not Found</h1>' +
          '<p style="font-size:14px;color:#4b5563;">Could not locate Submission ID <strong>' + escapeHtmlText(submissionId || 'N/A') + '</strong> in Google Sheets yet.</p>' +
        '</div>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(notFoundHtml)
      .setTitle('GHACPerm · Permit Not Found')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const r = found.record;
  const resolvedType = found.formType;
  const resolvedId = found.submissionId;
  const wo = r['Work Order Number'] || r['Work Order No.'] || workOrder || 'N/A';
  const loc = r['Location'] || r['Department/Location'] || 'Plant Grounds';
  const eq = r['Equipment ID'] || 'N/A';
  const desc = r['Purpose'] || r['Description'] || r['Type of Work'] || 'Confined Space / Silo Entry';
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  const nowTimeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'HH:mm');

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>GHACPerm · EHS Gas Test Entry (' + escapeHtmlText(resolvedId) + ')</title>' +
    '<style>' +
      'body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:16px;color:#111827;}' +
      '.card{max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);}' +
      '.hdr{background:#991b1b;color:#ffffff;padding:18px 22px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;}' +
      '.body{padding:20px 22px;}' +
      '.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;font-size:13px;margin-bottom:18px;}' +
      '@media(max-width:540px){.meta{grid-template-columns:1fr;}}' +
      '.lbl{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;display:block;margin-bottom:3px;}' +
      'table{width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin-bottom:16px;font-size:13px;}' +
      'th{background:#fef2f2;color:#991b1b;text-align:left;padding:10px;font-size:11px;text-transform:uppercase;border-bottom:1px solid #fecaca;}' +
      'td{padding:8px 10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;}' +
      'input,textarea,select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;background:#ffffff;}' +
      '.btn{border:none;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;color:#ffffff;background:#c5221f;width:100%;}' +
      '.btn:disabled{opacity:0.6;cursor:not-allowed;}' +
      '.msg{margin:12px 0;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;display:none;}' +
    '</style></head><body>' +
    '<div class="card">' +
      '<div class="hdr">' +
        '<div>' +
          '<div style="font-size:11px;letter-spacing:1px;opacity:0.9;">GHACEM RED PROTOCOL · EHS ATMOSPHERIC CLEARANCE</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:3px;">Confined Space Gas Test Entry</div>' +
          '<div style="font-size:12px;opacity:0.9;margin-top:2px;">WO ' + escapeHtmlText(wo) + ' · ' + escapeHtmlText(loc) + ' · ID: ' + escapeHtmlText(resolvedId) + '</div>' +
        '</div>' +
        '<span id="ehsBadge" style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">' + escapeHtmlText(String(r['EHS Test Status'] || 'REQUESTED').toUpperCase()) + '</span>' +
      '</div>' +
      '<div class="body">' +
        '<div class="meta">' +
          '<div><span class="lbl">Work Order</span><strong>' + escapeHtmlText(wo) + '</strong></div>' +
          '<div><span class="lbl">Location</span>' + escapeHtmlText(loc) + '</div>' +
          '<div><span class="lbl">Equipment ID</span>' + escapeHtmlText(eq) + '</div>' +
          '<div><span class="lbl">HoD Field Code</span>' + escapeHtmlText(r['HoD Field Code'] || 'Pending') + '</div>' +
          '<div style="grid-column:1/-1;"><span class="lbl">Scope / Purpose</span>' + escapeHtmlText(desc) + '</div>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
          '<table>' +
            '<thead><tr><th>Gas / Parameter</th><th>Permissible Limit</th><th>Measured Reading</th><th>Date</th><th>Time</th></tr></thead>' +
            '<tbody>' +
              '<tr>' +
                '<td><strong>% Oxygen (O2)</strong></td>' +
                '<td>&gt;19.5% &amp; &lt;22.0%</td>' +
                '<td><input id="o2Reading" type="text" value="' + escapeHtmlText(r['O2 Reading'] || '20.9%') + '" /></td>' +
                '<td><input id="o2Date" type="date" value="' + escapeHtmlText(r['O2 Date'] || todayStr) + '" /></td>' +
                '<td><input id="o2Time" type="time" value="' + escapeHtmlText(r['O2 Time'] || nowTimeStr) + '" /></td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>% LEL (Flammable)</strong></td>' +
                '<td>&lt; 10%</td>' +
                '<td><input id="lelReading" type="text" value="' + escapeHtmlText(r['LEL Reading'] || '0%') + '" /></td>' +
                '<td><input id="lelDate" type="date" value="' + escapeHtmlText(r['LEL Date'] || todayStr) + '" /></td>' +
                '<td><input id="lelTime" type="time" value="' + escapeHtmlText(r['LEL Time'] || nowTimeStr) + '" /></td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>Carbon Monoxide (CO)</strong></td>' +
                '<td>&lt; 35 ppm</td>' +
                '<td><input id="coReading" type="text" value="' + escapeHtmlText(r['CO Reading'] || '0 ppm') + '" /></td>' +
                '<td><input id="coDate" type="date" value="' + escapeHtmlText(r['CO Date'] || todayStr) + '" /></td>' +
                '<td><input id="coTime" type="time" value="' + escapeHtmlText(r['CO Time'] || nowTimeStr) + '" /></td>' +
              '</tr>' +
              '<tr>' +
                '<td><strong>Temperature</strong></td>' +
                '<td>&lt; 40°C</td>' +
                '<td><input id="tempReading" type="text" value="' + escapeHtmlText(r['Temp Reading'] || '28°C') + '" /></td>' +
                '<td><input id="tempDate" type="date" value="' + escapeHtmlText(r['Temp Date'] || todayStr) + '" /></td>' +
                '<td><input id="tempTime" type="time" value="' + escapeHtmlText(r['Temp Time'] || nowTimeStr) + '" /></td>' +
              '</tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
          '<div>' +
            '<label class="lbl" for="testedBy">EHS Officer / Authorized Gas Tester *</label>' +
            '<input id="testedBy" type="text" placeholder="Enter EHS Officer name & ID" value="' + escapeHtmlText(r['Confined Space Tested By'] || '') + '" />' +
          '</div>' +
          '<div>' +
            '<label class="lbl" for="clearance">Atmospheric Clearance Status</label>' +
            '<select id="clearance">' +
              '<option value="Completed">Cleared - Safe for Entry</option>' +
              '<option value="Unsafe">Unsafe - Entry Denied</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<label class="lbl" for="ehsRemarks">EHS Observations / Ventilation Notes (Optional)</label>' +
          '<textarea id="ehsRemarks" rows="2" placeholder="Optional gas calibration notes or purging remarks...">' + escapeHtmlText(r['EHS Test Remarks'] || '') + '</textarea>' +
        '</div>' +
        '<div id="gasFeedback" class="msg"></div>' +
        '<button id="submitGasBtn" class="btn" type="button" onclick="submitGasResults()">Save &amp; Submit Atmospheric Gas Test Results</button>' +
      '</div>' +
    '</div>' +
    '<script>' +
      'var PERMIT_TYPE = ' + JSON.stringify(resolvedType) + ';' +
      'var SUBMISSION_ID = ' + JSON.stringify(resolvedId) + ';' +
      'function showGasMsg(text, isErr){' +
        'var el=document.getElementById("gasFeedback");' +
        'if(!el)return;' +
        'el.style.display="block";' +
        'el.style.background=isErr?"#fef2f2":"#dcfce7";' +
        'el.style.color=isErr?"#b91c1c":"#166534";' +
        'el.style.border=isErr?"1px solid #fecaca":"1px solid #86efac";' +
        'el.textContent=text;' +
      '}' +
      'function submitGasResults(){' +
        'var testedBy=document.getElementById("testedBy").value.trim();' +
        'if(!testedBy){showGasMsg("Please enter the EHS Officer / Authorized Gas Tester name.",true);document.getElementById("testedBy").focus();return;}' +
        'var btn=document.getElementById("submitGasBtn");' +
        'if(btn)btn.disabled=true;' +
        'showGasMsg("Saving atmospheric gas readings to Google Sheets and notifying HoD...",false);' +
        'var payload={' +
          'o2Reading:document.getElementById("o2Reading").value,' +
          'o2Date:document.getElementById("o2Date").value,' +
          'o2Time:document.getElementById("o2Time").value,' +
          'lelReading:document.getElementById("lelReading").value,' +
          'lelDate:document.getElementById("lelDate").value,' +
          'lelTime:document.getElementById("lelTime").value,' +
          'coReading:document.getElementById("coReading").value,' +
          'coDate:document.getElementById("coDate").value,' +
          'coTime:document.getElementById("coTime").value,' +
          'tempReading:document.getElementById("tempReading").value,' +
          'tempDate:document.getElementById("tempDate").value,' +
          'tempTime:document.getElementById("tempTime").value,' +
          'testedBy:testedBy,' +
          'clearance:document.getElementById("clearance").value,' +
          'remarks:document.getElementById("ehsRemarks").value' +
        '};' +
        'google.script.run' +
          '.withSuccessHandler(function(res){' +
            'if(btn)btn.disabled=false;' +
            'if(!res||!res.ok){showGasMsg((res&&res.error)||"Failed to save gas test results.",true);return;}' +
            'var badge=document.getElementById("ehsBadge");' +
            'if(badge){badge.textContent=String(res.status||"COMPLETED").toUpperCase();badge.style.background=res.status==="Completed"?"#dcfce7":"#fee2e2";badge.style.color=res.status==="Completed"?"#15803d":"#b91c1c";}' +
            'showGasMsg("✓ Atmospheric gas test results saved and HoD notified for final permit review.",false);' +
          '})' +
          '.withFailureHandler(function(err){' +
            'if(btn)btn.disabled=false;' +
            'showGasMsg("Error saving readings: "+(err&&err.message?err.message:String(err)),true);' +
          '})' +
          '.submitEhsGasTestFromWeb(PERMIT_TYPE,SUBMISSION_ID,payload);' +
      '}' +
    '</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('GHACPerm · EHS Gas Test (' + resolvedId + ')')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
