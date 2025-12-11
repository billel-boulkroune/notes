// ==========================================
// Student Grades Viewer - Main Application
// ==========================================

/**
 * Application State
 */
const AppState = {
    currentStudent: null,
    isLoading: false
};

/**
 * DOM Elements
 */
const DOM = {
    // Sections
    searchSection: null,
    resultsSection: null,

    // Form elements
    searchForm: null,
    studentIdInput: null,
    birthDateInput: null,

    // Loading and error
    loadingSpinner: null,
    errorMessage: null,
    errorText: null,

    // Result elements
    studentName: null,
    displayStudentId: null,
    subjectName: null,
    gradeValue: null,
    gradeProgressCircle: null,
    answerSheetImage: null,
    answerSheetContainer: null,
    noImageMessage: null,

    // Buttons
    backBtn: null,
    zoomBtn: null,
    downloadBtn: null,

    // Modal
    zoomModal: null,
    zoomedImage: null,
    closeModal: null
};

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing Student Grades Viewer...');

    // Validate Google Sheets configuration
    if (!window.SheetsAPI.validateConfig()) {
        showError('خطأ في الإعداد: يرجى تكوين Google Sheets API في ملف sheets-api.js');
        return;
    }

    // Cache DOM elements
    cacheDOMElements();

    // Attach event listeners
    attachEventListeners();

    console.log('Application initialized successfully');
}

/**
 * Cache all DOM elements
 */
function cacheDOMElements() {
    // Sections
    DOM.searchSection = document.getElementById('searchSection');
    DOM.resultsSection = document.getElementById('resultsSection');

    // Form
    DOM.searchForm = document.getElementById('searchForm');
    DOM.studentIdInput = document.getElementById('studentId');
    DOM.birthDateInput = document.getElementById('birthDate');

    // Loading and error
    DOM.loadingSpinner = document.getElementById('loadingSpinner');
    DOM.errorMessage = document.getElementById('errorMessage');
    DOM.errorText = document.getElementById('errorText');

    // Results
    DOM.studentName = document.getElementById('studentName');
    DOM.displayStudentId = document.getElementById('displayStudentId');
    DOM.subjectName = document.getElementById('subjectName');
    DOM.gradeValue = document.getElementById('gradeValue');
    DOM.gradeProgressCircle = document.getElementById('gradeProgressCircle');
    DOM.answerSheetImage = document.getElementById('answerSheetImage');
    DOM.answerSheetContainer = document.getElementById('answerSheetContainer');
    DOM.noImageMessage = document.getElementById('noImageMessage');

    // Buttons
    DOM.backBtn = document.getElementById('backBtn');
    DOM.zoomBtn = document.getElementById('zoomBtn');
    DOM.downloadBtn = document.getElementById('downloadBtn');

    // Modal
    DOM.zoomModal = document.getElementById('zoomModal');
    DOM.zoomedImage = document.getElementById('zoomedImage');
    DOM.closeModal = document.getElementById('closeModal');
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // Form submission
    DOM.searchForm.addEventListener('submit', handleSearch);

    // Back button
    DOM.backBtn.addEventListener('click', showSearchSection);

    // Image zoom
    DOM.zoomBtn.addEventListener('click', openImageModal);

    // Modal close
    DOM.closeModal.addEventListener('click', closeImageModal);
    DOM.zoomModal.querySelector('.modal-backdrop').addEventListener('click', closeImageModal);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * Handle search form submission
 * @param {Event} e - Form submit event
 */
async function handleSearch(e) {
    e.preventDefault();

    // Prevent multiple simultaneous searches
    if (AppState.isLoading) return;

    // Get form values
    const studentId = DOM.studentIdInput.value.trim();
    const birthDate = DOM.birthDateInput.value.trim();

    // Validate inputs
    if (!studentId || !birthDate) {
        showError('يرجى إدخال رقم التعريف الدراسي وتاريخ الميلاد');
        return;
    }

    // Show loading state
    showLoading();

    try {
        // Search for student
        const student = await window.SheetsAPI.searchStudent(studentId, birthDate);

        if (student) {
            // Student found
            AppState.currentStudent = student;
            displayResults(student);
        } else {
            // Student not found
            showError('لم يتم العثور على نتيجة. يرجى التحقق من رقم التعريف وتاريخ الميلاد');
        }

    } catch (error) {
        console.error('Search error:', error);
        showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى');
    } finally {
        hideLoading();
    }
}

/**
 * Display student results
 * @param {Object} student - Student data
 */
function displayResults(student) {
    // Update student info
    DOM.studentName.textContent = student.studentName;
    DOM.displayStudentId.textContent = student.studentId;
    DOM.subjectName.textContent = student.subject;

    // Update grade
    const grade = Math.min(Math.max(student.grade, 0), 20); // Clamp between 0-20
    DOM.gradeValue.textContent = grade.toFixed(2);

    // Animate grade circle
    animateGradeCircle(grade);

    // Handle answer sheet image
    const imageUrl = window.SheetsAPI.convertDriveUrl(student.imageUrl);

    if (imageUrl) {
        DOM.answerSheetImage.src = imageUrl;
        DOM.answerSheetImage.alt = `ورقة إجابة ${student.studentName}`;
        DOM.answerSheetImage.parentElement.classList.remove('hidden');
        DOM.noImageMessage.classList.add('hidden');

        // Handle download
        DOM.downloadBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                // If it's base64, download directly
                if (imageUrl.startsWith('data:')) {
                    const a = document.createElement('a');
                    a.href = imageUrl;
                    a.download = `${student.studentName}_${student.subject}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    return;
                }

                // If it's a URL, try to fetch as blob to force download
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `${student.studentName}_${student.subject}.jpg`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.error('Download failed, falling back to new tab', error);
                window.open(imageUrl, '_blank');
            }
        };
    } else {
        DOM.answerSheetImage.parentElement.classList.add('hidden');
        DOM.noImageMessage.classList.remove('hidden');
    }

    // Show results section
    DOM.searchSection.classList.add('hidden');
    DOM.resultsSection.classList.remove('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Animate the grade progress circle
 * @param {number} grade - Grade value (0-20)
 */
function animateGradeCircle(grade) {
    const percentage = (grade / 20) * 100;
    const circumference = 2 * Math.PI * 90; // radius = 90
    const offset = circumference - (percentage / 100) * circumference;

    // Animate the circle
    setTimeout(() => {
        DOM.gradeProgressCircle.style.strokeDashoffset = offset;
        DOM.gradeProgressCircle.style.transition = 'stroke-dashoffset 1s ease-out';
    }, 100);
}

/**
 * Show loading state
 */
function showLoading() {
    AppState.isLoading = true;
    DOM.searchForm.classList.add('hidden');
    DOM.errorMessage.classList.add('hidden');
    DOM.loadingSpinner.classList.remove('hidden');
}

/**
 * Hide loading state
 */
function hideLoading() {
    AppState.isLoading = false;
    DOM.loadingSpinner.classList.add('hidden');
    DOM.searchForm.classList.remove('hidden');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    DOM.errorText.textContent = message;
    DOM.errorMessage.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        DOM.errorMessage.classList.add('hidden');
    }, 5000);
}

/**
 * Show search section
 */
function showSearchSection() {
    DOM.resultsSection.classList.add('hidden');
    DOM.searchSection.classList.remove('hidden');

    // Reset form
    DOM.searchForm.reset();
    DOM.errorMessage.classList.add('hidden');

    // Clear current student
    AppState.currentStudent = null;

    // Focus on student ID input
    DOM.studentIdInput.focus();
}

/**
 * Open image zoom modal
 */
function openImageModal() {
    if (!AppState.currentStudent || !AppState.currentStudent.imageUrl) return;

    const imageUrl = window.SheetsAPI.convertDriveUrl(AppState.currentStudent.imageUrl);
    DOM.zoomedImage.src = imageUrl;
    DOM.zoomModal.classList.remove('hidden');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Close image zoom modal
 */
function closeImageModal() {
    DOM.zoomModal.classList.add('hidden');

    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyPress(e) {
    // ESC key - close modal or go back
    if (e.key === 'Escape') {
        if (!DOM.zoomModal.classList.contains('hidden')) {
            closeImageModal();
        } else if (!DOM.resultsSection.classList.contains('hidden')) {
            showSearchSection();
        }
    }
}

/**
 * Format date for display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
