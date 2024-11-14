const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const config = require('./config');

let dbx = new Dropbox({ accessToken: config.DROPBOX_ACCESS_TOKEN, fetch: fetch });

// Function to refresh the Dropbox access token using the stored refresh token
async function refreshAccessToken() {
    try {
        // Send a POST request to Dropbox API for token refresh
        const response = await fetch('https://api.dropbox.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: process.env.DROPBOX_REFRESH_TOKEN, // Refresh token from environment variables
                client_id: process.env.DROPBOX_CLIENT_ID, // Client ID from environment variables
                client_secret: process.env.DROPBOX_CLIENT_SECRET // Client secret from environment variables
            })
        });

        // If the response is successful, update and return the new access token
        if (response.ok) {
            const data = await response.json();
            process.env.DROPBOX_ACCESS_TOKEN = data.access_token; // Store the new access token
            console.log('🌐Access token refreshed');
            return data.access_token; // Return the new access token
        } else {
            // Log and throw an error if the token refresh fails
            console.error('❌Failed to refresh access token:', await response.text());
            throw new Error('Could not refresh access token');
        }
    } catch (error) {
        // Handle and log any unexpected errors
        console.error('❌Error in refreshAccessToken:', error);
        throw error;
    }
}

// Function to download a file from Dropbox to a specified local path
async function downloadFromDropbox(dropboxFilePath, localFilePath) {
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

                // Re-initialize Dropbox instance with the new access token
                dbx = new Dropbox({ accessToken: newAccessToken, fetch: fetch });

                // Retry downloading the file with the refreshed token
                response = await dbx.filesDownload({ path: dropboxFilePath });
            } else {
                // Throw the error if it’s not an auth-related issue
                throw error;
            }
        }

        // Write the downloaded file content to the specified local path
        fs.writeFileSync(localFilePath, response.result.fileBinary, 'binary');
        console.log('💽Dropbox file downloaded successfully:', localFilePath);

    } catch (error) {
        // Log an error if download or refresh fails
        console.error('❌Error downloading file from Dropbox:', error.message);
    }
}

// Function to upload a local file to Dropbox at the specified Dropbox path
const uploadToDropbox = async (filePath, file) => {
    try {
        // Build the full local file path
        const fullPath = path.join(__dirname, file);

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
                path: filePath,      // Destination path on Dropbox
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
                    path: filePath,
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

module.exports = {
    downloadFromDropbox,
    uploadToDropbox
};