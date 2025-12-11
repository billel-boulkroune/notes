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
        imageUrl: 5        // Column F
    }
};

/**
 * Cache for storing fetched data
 */
let dataCache = {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes cache
};

/**
 * Fetch data from Google Sheets
 * @returns {Promise<Array>} Array of student records
 */
async function fetchSheetData() {
    // Check cache first
    if (dataCache.data && dataCache.timestamp && (Date.now() - dataCache.timestamp < dataCache.ttl)) {
        console.log('Returning cached data');
        return dataCache.data;
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.sheetId}/values/${SHEETS_CONFIG.sheetName}?key=${SHEETS_CONFIG.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // Skip header row (first row)
        const rows = data.values.slice(1);

        // Update cache
        dataCache.data = rows;
        dataCache.timestamp = Date.now();

        console.log(`Fetched ${rows.length} records from Google Sheets`);
        return rows;

    } catch (error) {
        console.error('Error fetching sheet data:', error);
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

            // Simulate network delay for realistic experience
            await new Promise(resolve => setTimeout(resolve, 500));

            // Normalize search values
            const searchId = studentId.trim().toLowerCase();
            const searchDate = birthDate.trim();

            // Search in demo data
            const student = window.DEMO_DATA.find(s =>
                s.studentId.toLowerCase() === searchId &&
                s.birthDate === searchDate
            );

            return student || null;
        }

        // Use Google Sheets API
        const data = await fetchSheetData();

        // Normalize search values
        const searchId = studentId.trim().toLowerCase();
        const searchDate = birthDate.trim();

        // Search for matching record
        for (const row of data) {
            const rowId = (row[SHEETS_CONFIG.columns.studentId] || '').toString().trim().toLowerCase();
            const rowDate = (row[SHEETS_CONFIG.columns.birthDate] || '').toString().trim();

            if (rowId === searchId && rowDate === searchDate) {
                // Found a match
                return {
                    studentId: row[SHEETS_CONFIG.columns.studentId] || '',
                    birthDate: row[SHEETS_CONFIG.columns.birthDate] || '',
                    studentName: row[SHEETS_CONFIG.columns.studentName] || '',
                    subject: row[SHEETS_CONFIG.columns.subject] || '',
                    grade: parseFloat(row[SHEETS_CONFIG.columns.grade]) || 0,
                    imageUrl: row[SHEETS_CONFIG.columns.imageUrl] || ''
                };
            }
        }

        // No match found
        return null;

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
    dataCache.timestamp = null;
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
