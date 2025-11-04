import { saveAs } from 'file-saver';

/**
 * Download file from URL
 * @param {string} url - API endpoint URL
 * @param {string} filename - Filename for downloaded file
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Format filename with current date
 * @param {string} baseName - Base name for the file
 * @returns {string} Formatted filename with date
 */
export const formatFilename = (baseName) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${baseName}-${day}.${month}.${year}-${hours}.${minutes}.xlsx`;
};

/**
 * Build query string from object
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export const buildQueryString = (params) => {
  const queryParams = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Export students to Excel
 * @param {Object} filters - Filter parameters (institutionId, seasonId)
 */
export const exportStudents = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const url = `/api/export/students${queryString}`;
  const filename = formatFilename('ogrenciler');
  await downloadFile(url, filename);
};

/**
 * Export payments to Excel
 * @param {Object} filters - Filter parameters (institutionId, seasonId, startDate, endDate)
 */
export const exportPayments = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const url = `/api/export/payments${queryString}`;
  const filename = formatFilename('odemeler');
  await downloadFile(url, filename);
};

/**
 * Export expenses to Excel
 * @param {Object} filters - Filter parameters (institutionId, seasonId, startDate, endDate)
 */
export const exportExpenses = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const url = `/api/export/expenses${queryString}`;
  const filename = formatFilename('giderler');
  await downloadFile(url, filename);
};

/**
 * Export report to Excel
 * @param {Object} filters - Filter parameters (institutionId, seasonId, startDate, endDate)
 */
export const exportReport = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const url = `/api/export/report${queryString}`;
  const filename = formatFilename('rapor');
  await downloadFile(url, filename);
};
