// ==========================================
// Google Sheets API Integration
// ==========================================

/**
 * Configuration for Google Sheets API
 * IMPORTANT: Replace these values with your own
 */
const SHEETS_CONFIG = {
    // Get your API key from: https://console.cloud.google.com/apis/credentials
    apiKey: 'AIzaSyA60Jf1yEiJzi_ITIMXpai3cC9ZMPMxGjQ',

    // Your Google Sheet ID (from the URL)
    // Example: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
    sheetId: '1tduOvSMWvESlycDutgEknhMCCG9V54RvlfYQi5kTh00',

    // Sheet name (tab name in your Google Sheet)
    sheetName: 'template-sheet.csv',

    // Column mapping (adjust if your columns are different)
    columns: {
        studentId: 0,      // Column A
        birthDate: 1,      // Column B
        studentName: 2,    // Column C
        subject: 3,        // Column D
        grade: 4,          // Column E
        section: 5,        // Column F
        imageUrl: 6       // Column G
    }
};

/**
 * Cache for storing fetched data
 */
let dataCache = {
    data: null,
    timestamp: null,
    ttl: 3 * 1000 // 5 minutes cache
};

/**
 * Fetch specific range from Google Sheets
 * @param {string} range - Range to fetch (e.g., "A:B" or "A5:G5")
 * @returns {Promise<Object>} API response
 */
async function fetchRange(range) {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.sheetId}/values/${SHEETS_CONFIG.sheetName}!${range}?key=${SHEETS_CONFIG.apiKey}`;

        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error fetching range ${range}:`, error);
        throw error;
    }
}

/**
 * Fetch only Student IDs and Birth Dates (Columns A & B) for searching
 * @returns {Promise<Array>} Array of [studentId, birthDate] rows
 */
async function fetchSearchIndex() {
    // Check cache first
    if (dataCache.data && dataCache.timestamp && (Date.now() - dataCache.timestamp < dataCache.ttl)) {
        console.log('Returning cached index');
        return dataCache.data;
    }

    try {
        // Fetch only columns A and B
        // We use "A:B" to get the first two columns of all rows
        const values = await fetchRange('A:B');
        
        if (values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // Update cache
        dataCache.data = values;
        dataCache.timestamp = Date.now();

        console.log(`Fetched ${values.length} records for index`);
        return values;
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch full student details for a specific row
 * @param {number} rowIndex - The 1-based row index in the sheet
 * @returns {Promise<Array>} Array of cell values for the row
 */
async function fetchStudentRow(rowIndex) {
    try {
        // Fetch the specific row. Assuming data extends up to column G (index 6, 7th column) or more.
        // We can fetch just the row number, e.g., "5:5" to get the whole row, 
        // or specific columns like "A5:G5". Let's fetch the whole row to be safe.
        const values = await fetchRange(`${rowIndex}:${rowIndex}`);
        return values[0] || [];
    } catch (error) {
        console.error(`Error fetching row ${rowIndex}:`, error);
        throw error;
    }
}

/**
 * Search for a student by ID and birth date
 * @param {string} studentId - Student ID
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Student record or null if not found
 */
async function searchStudent(studentId, birthDate) {
    try {
        // Check if using demo data (when API is not configured)
        const usingDemo = SHEETS_CONFIG.apiKey === 'YOUR_API_KEY_HERE' ||
            SHEETS_CONFIG.sheetId === 'YOUR_SHEET_ID_HERE';

        if (usingDemo && window.DEMO_DATA) {
            console.log('🎮 Using demo data for testing...');
            await new Promise(resolve => setTimeout(resolve, 500));
            const searchId = studentId.trim().toLowerCase();
            const searchDate = birthDate.trim();
            const student = window.DEMO_DATA.find(s =>
                s.studentId.toLowerCase() === searchId &&
                s.birthDate === searchDate
            );
            return student || null;
        }

        // 1. Fetch the search index (Columns A & B only)
        const indexData = await fetchSearchIndex();

        // Normalize search values
        const searchId = studentId.trim().toLowerCase();
        const searchDate = birthDate.trim();

        // 2. Find the row index locally
        let foundRowIndex = -1;
        
        // Loop through index data
        // i=0 is typically the header, but we check all just in case, 
        // or start from 1 if we are sure row 1 is header.
        // The previous code sliced(1), so it assumed row 1 is header.
        for (let i = 1; i < indexData.length; i++) {
            const row = indexData[i];
            // Safety check if row is shorter than expected
            if (!row) continue;

            const rowId = (row[SHEETS_CONFIG.columns.studentId] || '').toString().trim().toLowerCase();
            const rowDate = (row[SHEETS_CONFIG.columns.birthDate] || '').toString().trim();

            if (rowId === searchId && rowDate === searchDate) {
                // Found match at array index i
                // In flexible A1 notation, array index 0 is Row 1.
                // So array index i is Row i+1.
                foundRowIndex = i + 1;
                break;
            }
        }

        if (foundRowIndex === -1) {
            return null;
        }

        console.log(`Match found at Row ${foundRowIndex}. Fetching details...`);

        // 3. Fetch full details for the specific row
        const fullRow = await fetchStudentRow(foundRowIndex);

        if (!fullRow || fullRow.length === 0) {
             console.error('Found index but failed to fetch row details.');
             return null;
        }

        // 4. Process the full row data (copied from previous logic)
        // Note: fullRow is just the array of values for that row [col0, col1, ...]
        
        let rawImage = fullRow[6] || '';
        let imageUrl;

        if (rawImage.startsWith('http')) {
            imageUrl = rawImage;
        } else {
            // Reconstruct split base64 if necessary
            let fullString = fullRow.slice(6).join('');
            imageUrl = fullString
                .replace(/_/g, '')
                .replace(/(\r\n|\n|\r)/gm, "")
                .replace(/ /g, '+');
        }

        return {
            studentId: fullRow[SHEETS_CONFIG.columns.studentId] || '',
            birthDate: fullRow[SHEETS_CONFIG.columns.birthDate] || '',
            studentName: fullRow[SHEETS_CONFIG.columns.studentName] || '',
            subject: fullRow[SHEETS_CONFIG.columns.subject] || '',
            grade: parseFloat(fullRow[SHEETS_CONFIG.columns.grade]) || 0,
            imageUrl: imageUrl
        };

    } catch (error) {
        console.error('Error searching for student:', error);
        throw error;
    }
}

/**
 * Convert Google Drive sharing link to direct image URL
 * @param {string} url - Google Drive sharing URL
 * @returns {string} Direct image URL
 */
function convertDriveUrl(url) {
    if (!url) return '';

    // If it's a data URI (Base64), return as is
    if (url.startsWith('data:')) return url;

    // If it's not a web URL (doesn't start with http), return as is
    if (!url.startsWith('http')) return url;

    // Check if it's a Google Drive URL
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        const fileId = driveMatch[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Return original URL if not a Drive link
    return url;
}

/**
 * Clear the data cache
 */
function clearCache() {
    dataCache.data = null;
    dataCache.timestamp = 30 * 1000;
    console.log('Cache cleared');
}

/**
 * Validate API configuration
 * @returns {boolean} True if configuration is valid
 */
function validateConfig() {
    const isDemo = SHEETS_CONFIG.apiKey === 'YOUR_API_KEY_HERE' ||
        SHEETS_CONFIG.sheetId === 'YOUR_SHEET_ID_HERE';

    if (isDemo) {
        console.log('%c🎮 DEMO MODE ACTIVE', 'color: #6366f1; font-size: 16px; font-weight: bold;');
        console.log('%cاستخدام بيانات تجريبية للاختبار', 'color: #8b5cf6; font-size: 14px;');
        console.log('%cلاستخدام Google Sheets، يرجى تكوين API Key و Sheet ID في sheets-api.js', 'color: #64748b; font-size: 12px;');

        if (!window.DEMO_DATA) {
            console.error('Demo data not loaded. Make sure demo-data.js is included.');
            return false;
        }

        return true; // Allow demo mode
    }

    return true;
}

// Export functions for use in app.js
window.SheetsAPI = {
    searchStudent,
    convertDriveUrl,
    clearCache,
    validateConfig
};
