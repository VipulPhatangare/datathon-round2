/**
 * In-memory data store for large datasets that can't fit in MongoDB
 * This keeps the full answer CSV data in memory for quick access during scoring
 */

import fs from 'fs';
import Papa from 'papaparse';
import AnswerCSV from '../models/AnswerCSV.js';

let answerCSVData = {
  publicData: [],
  privateData: [],
  allData: [],
  publicPercentage: 50,
  totalRows: 0,
  publicRows: 0,
  privateRows: 0,
  filepath: null,
  idColumn: 'row_id',
  labelColumn: 'label'
};

export const setAnswerCSVData = (data) => {
  answerCSVData = {
    publicData: data.publicData || [],
    privateData: data.privateData || [],
    allData: data.allData || [],
    publicPercentage: data.publicPercentage || 50,
    totalRows: data.totalRows || data.allData?.length || 0,
    publicRows: data.publicRows || data.publicData?.length || 0,
    privateRows: data.privateRows || data.privateData?.length || 0,
    filepath: data.filepath || null,
    idColumn: data.idColumn || 'row_id',
    labelColumn: data.labelColumn || 'label'
  };
};

export const getAnswerCSVData = () => answerCSVData;

export const getPublicData = () => answerCSVData.publicData;

export const getPrivateData = () => answerCSVData.privateData;

export const getAllData = () => answerCSVData.allData;

export const isDataLoaded = () => answerCSVData.totalRows > 0;

export const clearAnswerCSVData = () => {
  answerCSVData = {
    publicData: [],
    privateData: [],
    allData: [],
    publicPercentage: 50,
    totalRows: 0,
    publicRows: 0,
    privateRows: 0,
    filepath: null,
    idColumn: 'row_id',
    labelColumn: 'label'
  };
};

export const getAnswerCSVStats = () => ({
  totalRows: answerCSVData.totalRows,
  publicRows: answerCSVData.publicRows,
  privateRows: answerCSVData.privateRows,
  publicPercentage: answerCSVData.publicPercentage,
  isLoaded: isDataLoaded()
});

/**
 * Reload answer CSV data from the database
 * Called when the data is needed but not in memory (e.g., after server restart)
 * Attempts to re-parse the original CSV file
 */
export const reloadAnswerCSVData = async () => {
  try {
    const answerCSVRecord = await AnswerCSV.findOne();
    
    if (!answerCSVRecord) {
      return false; // No answer CSV exists yet
    }

    // Check if the file still exists
    const filepath = answerCSVRecord.filepath || getFilepathFromMetadata(answerCSVRecord);
    
    if (!filepath || !fs.existsSync(filepath)) {
      console.error('Answer CSV file not found:', filepath);
      return false;
    }

    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filepath, 'utf8');
    
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors during reload:', parseResult.errors);
      return false;
    }

    const columns = parseResult.meta.fields;
    const idColumn = answerCSVRecord.idColumn || 'row_id';
    const labelColumn = answerCSVRecord.labelColumn || 'label';

    // Reconstruct data with proper column names
    const allData = parseResult.data.map(row => {
      const rowData = {};
      columns.forEach(col => {
        rowData[col] = String(row[col] || '').trim();
      });
      return rowData;
    });

    if (allData.length === 0) {
      return false;
    }

    // Split into public and private
    const publicPercentage = answerCSVRecord.publicPercentage || 50;
    const publicCount = Math.ceil(allData.length * (publicPercentage / 100));
    const publicData = allData.slice(0, publicCount);
    const privateData = allData.slice(publicCount);

    // Populate the data store
    setAnswerCSVData({
      publicData,
      privateData,
      allData,
      publicPercentage,
      totalRows: allData.length,
      publicRows: publicData.length,
      privateRows: privateData.length,
      idColumn,
      labelColumn,
      filepath
    });

    return true;

  } catch (error) {
    console.error('Error reloading answer CSV data:', error);
    return false;
  }
};

/**
 * Helper: Try to reconstruct filepath from database metadata
 * Looks for files in uploads/ directory with matching metadata
 */
const getFilepathFromMetadata = (answerCSVRecord) => {
  if (!answerCSVRecord.filename) return null;

  // First check if we have stored filepath in the record
  if (answerCSVRecord.filepath) {
    return answerCSVRecord.filepath;
  }

  // Try to find file in uploads directory
  const uploadsDir = './uploads';
  if (!fs.existsSync(uploadsDir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(uploadsDir);
    // Look for any file (since multer stores with random names)
    // This is a fallback - ideally filepath should be stored in DB
    if (files.length > 0) {
      return `${uploadsDir}/${files[0]}`;
    }
  } catch (err) {
    console.error('Error reading uploads directory:', err);
  }

  return null;
};

export default {
  setAnswerCSVData,
  getAnswerCSVData,
  getPublicData,
  getPrivateData,
  getAllData,
  clearAnswerCSVData,
  getAnswerCSVStats,
  isDataLoaded,
  reloadAnswerCSVData
};
