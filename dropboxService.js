import { Dropbox } from 'dropbox';
import fetch from 'isomorphic-fetch';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level setup: reconstruct __dirname in ES Modules
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration: load Dropbox credentials from external config
// ─────────────────────────────────────────────────────────────────────────────
const {
  DROPBOX_ACCESS_TOKEN,
  DROPBOX_REFRESH_TOKEN,
  DROPBOX_CLIENT_ID,
  DROPBOX_CLIENT_SECRET
} = config;

// ─────────────────────────────────────────────────────────────────────────────
// Initialize a Dropbox client instance with the initial access token
// ─────────────────────────────────────────────────────────────────────────────
let dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN, fetch });

// ─────────────────────────────────────────────────────────────────────────────
// refreshAccessToken: obtains a new OAuth access token using the refresh token
// - Logs each step for debugging
// - Updates the `dbx` instance
// Returns: the new access token string
// Throws: an Error if the refresh HTTP request fails or returns an error
// ─────────────────────────────────────────────────────────────────────────────
export async function refreshAccessToken() {
  console.debug('🔄 [refreshAccessToken] Starting token refresh...');
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: DROPBOX_REFRESH_TOKEN,
    client_id: DROPBOX_CLIENT_ID,
    client_secret: DROPBOX_CLIENT_SECRET
  });

  try {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`❌ [refreshAccessToken] HTTP ${res.status} -`, data.error_description || data.error);
      throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
    }

    // Swap out the Dropbox client with the new token
    dbx = new Dropbox({ accessToken: data.access_token, fetch });
    console.debug('✅ [refreshAccessToken] Token refreshed successfully');
    return data.access_token;
  } catch (err) {
    console.error('❌ [refreshAccessToken] Unexpected error:', err);
    throw err;  // propagate to caller
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// downloadFromDropbox: fetches a file from a Dropbox path to local disk
// - Handles token expiration by refreshing and retrying once
// - Writes binary file data synchronously
// Parameters:
//   dropboxFilePath   - path in Dropbox, e.g. '/folder/file.txt'
//   localRelativePath - path relative to project root, e.g. 'downloads/file.txt'
// Throws: an Error if download fails after retry
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadFromDropbox(dropboxFilePath, localRelativePath) {
  const outPath = join(__dirname, localRelativePath);
  console.debug(`⬇️ [downloadFromDropbox] Starting download from '${dropboxFilePath}' to '${outPath}'`);

  try {
    let res;
    try {
      // First attempt with current token
      res = await dbx.filesDownload({ path: dropboxFilePath });
    } catch (err) {
      // If unauthorized or bad request, refresh token and retry
      if (err.status === 401 || err.status === 400) {
        console.warn('⚠️ [downloadFromDropbox] Token expired or invalid, refreshing token and retrying...');
        const newToken = await refreshAccessToken();
        dbx = new Dropbox({ accessToken: newToken, fetch });
        res = await dbx.filesDownload({ path: dropboxFilePath });
      } else {
        console.error('❌ [downloadFromDropbox] Download failed:', err);
        throw err;
      }
    }

    // Write file to disk
    fs.writeFileSync(outPath, res.result.fileBinary, 'binary');
    console.info(`✔️ [downloadFromDropbox] File successfully downloaded to '${outPath}'`);
  } catch (err) {
    console.error('❌ [downloadFromDropbox] Error during download operation:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadToDropbox: uploads a local file to Dropbox, overwriting any existing file
// - Verifies local file exists before reading
// - Handles token expiration by refreshing and retrying once
// Parameters:
//   dropboxPath       - destination path in Dropbox, e.g. '/folder/file.txt'
//   localRelativePath - path relative to project root, e.g. 'uploads/file.txt'
// Returns: the Dropbox API response object on success
// Throws: an Error if upload fails after retry
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadToDropbox(dropboxPath, localRelativePath) {
  const fullPath = join(__dirname, localRelativePath);
  console.debug(`⬆️ [uploadToDropbox] Preparing to upload local file '${fullPath}' to Dropbox path '${dropboxPath}'`);

  if (!fs.existsSync(fullPath)) {
    const errMsg = `Local file not found: '${fullPath}'`;
    console.error(`❌ [uploadToDropbox] ${errMsg}`);
    throw new Error(errMsg);
  }

  const contents = fs.readFileSync(fullPath);

  try {
    // Attempt upload with current token
    const response = await dbx.filesUpload({
      path: dropboxPath,
      contents,
      mode: { '.tag': 'overwrite' }
    });
    console.info(`✅ [uploadToDropbox] File uploaded successfully to '${dropboxPath}'`);
    return response;
  } catch (err) {
    if (err.status === 401) {
      console.warn('⚠️ [uploadToDropbox] Token expired or invalid, refreshing token and retrying upload...');
      const newToken = await refreshAccessToken();
      dbx = new Dropbox({ accessToken: newToken, fetch });
      const retryResp = await dbx.filesUpload({
        path: dropboxPath,
        contents,
        mode: { '.tag': 'overwrite' }
      });
      console.info(`🔁 [uploadToDropbox] Retry upload succeeded for '${dropboxPath}'`);
      return retryResp;
    }
    console.error('❌ [uploadToDropbox] Upload failed:', err);
    throw err;
  }
}
