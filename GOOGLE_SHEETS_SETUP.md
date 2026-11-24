# GHACPerm Google Sheets Integration Guide

This guide explains how GHACPerm connects to **Google Sheets** as its centralized cloud database.

---

## 1. How It Works (Architecture Overview)

```
[ User in GHACPerm Web App ]
       │
       ▼ (Submits / Updates / Closes Permit)
[ syncEngine.ts ]
       │
       ▼ (HTTP POST with JSON payload)
[ Google Apps Script Web App (/exec) ]
       │
       ▼ (SpreadsheetApp API)
[ Google Sheets Database ]
  ├── Tab: General_Permits (Form 04A)
  ├── Tab: HotWork_Permits (Form 04B)
  └── Tab: Height_Permits  (Form 04C)
```

1. **Submissions & Authorizations**:
   - Whenever an engineer, supervisor, or manager submits a draft, signs with their Work ID, logs atmospheric gas tests, or completes job closure, GHACPerm automatically sends a `POST` request to the Google Apps Script Web App endpoint.
   - The script inspects the `Submission ID`. If it already exists, it updates the row; if not, it appends a new row.

2. **Fetching History & Registers**:
   - When viewing the **Approved Register**, **Rejected Register**, or **Executive Operations Dashboard**, the application sends a `GET` request (`?formType=hotwork&mode=history`).
   - The script reads the spreadsheet data and returns an array of formatted JSON records.

3. **Offline Outbox Queue**:
   - If work is conducted in plant areas without cellular or Wi-Fi coverage (e.g. underground tunnels, clinker silos, mills), permits are saved in the browser's local encrypted **Outbox Queue**.
   - As soon as the device reconnects to Wi-Fi/data, the app automatically flushes the queue to Google Sheets without losing records.

---

## 2. Step-by-Step Setup Guide

### Step A: Create Your Google Sheet
1. Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
2. Name it (e.g., `GHACEM Corporate PTW Register`).
3. Rename the default sheet tab to `General_Permits`.
4. Click the `+` button to add two more sheet tabs:
   - `HotWork_Permits`
   - `Height_Permits`

### Step B: Add the Google Apps Script
1. In your Google Sheet, click **Extensions > Apps Script** in the top menu.
2. Delete any boilerplate code in `Code.gs`.
3. Copy the entire contents of `google-apps-script/Code.gs` and paste it into the editor.
4. Click the **Save** icon (diskette).

### Step C: Deploy as a Web App
1. In Apps Script, click the blue **Deploy** button (top right) and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `GHACPerm Production Backend`
   - **Execute as**: `Me (<your-email@gmail.com>)`
   - **Who has access**: `Anyone` *(Crucial so the web app can post permits without requiring manual Google account sign-ins on the plant floor)*.
4. Click **Deploy**.
5. Google will ask for authorization on first deploy:
   - Click **Authorize access**, select your account.
   - If you see "Google hasn't verified this app", click **Advanced** > **Go to (Untitled project) (unsafe)** > **Allow**.
6. Copy the generated **Web App URL** (it ends with `/exec`).

### Step D: Link the URL in GHACPerm
1. Open GHACPerm in your browser.
2. In the top navigation bar, click the **Cloud / Sync status icon** (the cloud icon next to AES-256).
3. In the modal under **Google Apps Script Web App Endpoint URL**, paste your `/exec` URL.
4. Click **Save Endpoints**, then click **Test Connection**.
5. You will see:
   ```
   ✓ Cloud connection successful. Server responded with ok: true
   ```

Now, every permit submitted in the portal will stream directly into your Google Sheet in real time!
