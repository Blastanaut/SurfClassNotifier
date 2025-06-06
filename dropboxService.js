import { Dropbox } from 'dropbox';
import fetch from 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import config from './config.js';

const {
    DROPBOX_ACCESS_TOKEN,
    DROPBOX_REFRESH_TOKEN,
    DROPBOX_CLIENT_ID,
    DROPBOX_CLIENT_SECRET
} = config;

let dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN, fetch });

// Function to refresh the Dropbox access token using the stored refresh token
export async function refreshAccessToken() {
    try {
        // Send a POST request to Dropbox API for token refresh
        const response = await fetch('https://api.dropbox.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: DROPBOX_REFRESH_TOKEN,
                client_id: DROPBOX_CLIENT_ID,
                client_secret: DROPBOX_CLIENT_SECRET
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${data.error}`);
        }

        dbx = new Dropbox({ accessToken: data.access_token, fetch });
        return data.access_token;
    } catch (error) {
        console.error('❌Error in refreshAccessToken:', error);
        throw error;
    }
}

// Function to download a file from Dropbox to a specified local path
export async function downloadFromDropbox(dropboxFilePath, localFilePath) {
    try {
        let response;

        // Attempt initial download from Dropbox
        try {
            response = await dbx.filesDownload({ path: dropboxFilePath });
        } catch (error) {
            // Check for 401 (unauthorized) or 400 (bad request) errors, indicating token issues
            if (error.status === 401 || error.status === 400) {
                console.log('🌐Refreshing Access Token...');

                // Refresh the access token
                const newAccessToken = await refreshAccessToken();
                dbx = new Dropbox({ accessToken: newAccessToken, fetch });

                // Retry the download after refreshing the token
                response = await dbx.filesDownload({ path: dropboxFilePath });
            } else {
                throw error;
            }
        }

        // Write the downloaded file to the specified local path
        fs.writeFileSync(localFilePath, response.result.fileBinary, 'binary');
        console.log(`✔️File downloaded successfully to ${localFilePath}`);
    } catch (error) {
        console.error('❌Error downloading file from Dropbox:', error);
        throw error;
    }
}

// Function to upload a local file to Dropbox at the specified Dropbox path
export const uploadToDropbox = async (dropboxPath, localFile) => {
    try {
        // Build the full local file path
        const fullPath = path.join(__dirname, localFile);

        // Check if the file exists locally
        if (!fs.existsSync(fullPath)) {
            console.error('❌ File does not exist:', fullPath);
            return;
        }

        // Read file content
        const fileContent = fs.readFileSync(fullPath);

        // Attempt initial file upload to Dropbox
        let response;
        try {
            response = await dbx.filesUpload({
                path: dropboxPath,      // Destination path on Dropbox
                contents: fileContent, // File content
                mode: 'overwrite'    // Overwrite if file already exists
            });
        } catch (error) {
            // Handle 401 (unauthorized) errors by refreshing access token
            if (error.status === 401) {
                console.log('🌐Refreshing Access Token...');
                const newAccessToken = await refreshAccessToken();

                // Update Dropbox instance with the refreshed access token
                dbx.setAccessToken(newAccessToken);

                // Retry the file upload with the new token
                response = await dbx.filesUpload({
                    path: dropboxPath,
                    contents: fileContent,
                    mode: 'overwrite'
                });
            } else {
                throw error; // Re-throw if error is not related to authorization
            }
        }

        // Check if the upload was successful
        if (response.status === 200) {
            console.log('✅Successfully uploaded file to Dropbox. Code: 200');
        } else {
            throw new Error('❌Upload failed with status code: ' + response.status);
        }

    } catch (error) {
        // Log any errors encountered during the upload process
        console.error('❌Error uploading file to Dropbox:', error.message);
    }
};