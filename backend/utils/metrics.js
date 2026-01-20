/**
 * Compute classification metrics
 * 
 * Formulas:
 * - Accuracy = (correct predictions) / (total predictions)
 * - Precision = TP / (TP + FP) for each class, then averaged
 * - Recall = TP / (TP + FN) for each class, then averaged
 * - F1 = 2 * (Precision * Recall) / (Precision + Recall)
 * 
 * For multi-class problems, we compute macro-averaged metrics:
 * - Calculate precision/recall for each class separately
 * - Average across all classes (macro average)
 */

/**
 * Compute all metrics from predictions and actual labels
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {Object} - { accuracy, precision, recall, f1, matches }
 */
export function computeMetrics(predictions) {
  if (!predictions || predictions.length === 0) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      matches: 0
    };
  }

  const total = predictions.length;
  let matches = 0;

  // Count matches
  predictions.forEach(pred => {
    if (pred.predicted === pred.actual) {
      matches++;
    }
  });

  // Compute accuracy
  const accuracy = matches / total;

  // Get all unique labels from both predicted and actual
  const allLabels = new Set();
  predictions.forEach(pred => {
    allLabels.add(pred.predicted);
    allLabels.add(pred.actual);
  });

  const labels = Array.from(allLabels);

  // Compute precision and recall for each class
  const precisions = [];
  const recalls = [];
  const f1Scores = [];

  labels.forEach(label => {
    // True Positives: predicted as label AND actually label
    const tp = predictions.filter(
      pred => pred.predicted === label && pred.actual === label
    ).length;

    // False Positives: predicted as label BUT actually something else
    const fp = predictions.filter(
      pred => pred.predicted === label && pred.actual !== label
    ).length;

    // False Negatives: predicted as something else BUT actually label
    const fn = predictions.filter(
      pred => pred.predicted !== label && pred.actual === label
    ).length;

    // Precision for this class
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    precisions.push(precision);

    // Recall for this class
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    recalls.push(recall);

    // F1 score for this class
    const classF1 = (precision + recall) > 0 
      ? 2 * (precision * recall) / (precision + recall)
      : 0;
    f1Scores.push(classF1);
  });

  // Macro-averaged precision and recall
  const avgPrecision = precisions.reduce((sum, p) => sum + p, 0) / precisions.length;
  const avgRecall = recalls.reduce((sum, r) => sum + r, 0) / recalls.length;

  // Macro F1 score (average of per-class F1 scores)
  const macroF1 = f1Scores.reduce((sum, f) => sum + f, 0) / f1Scores.length;

  // F1 score from averaged precision and recall
  const f1 = (avgPrecision + avgRecall) > 0 
    ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall)
    : 0;

  return {
    accuracy: parseFloat(accuracy.toFixed(6)),
    precision: parseFloat(avgPrecision.toFixed(6)),
    recall: parseFloat(avgRecall.toFixed(6)),
    f1: parseFloat(f1.toFixed(6)),
    macro_f1: parseFloat(macroF1.toFixed(6)),
    matches
  };
}

/**
 * Compare user submission with canonical answer CSV
 * @param {Array} userCSVData - User's uploaded CSV data
 * @param {Array} answerCSVData - Canonical answer CSV data
 * @param {string} idColumn - Name of the ID column
 * @param {string} labelColumn - Name of the label column
 * @returns {Object} - Comparison results with metrics and preview
 */
export function compareCSVData(userCSVData, answerCSVData, idColumn = 'row_id', labelColumn = 'label') {
  // Sort both arrays by ID to ensure consistent ordering
  const sortedUserData = [...userCSVData].sort((a, b) => {
    const idA = String(a[idColumn]);
    const idB = String(b[idColumn]);
    return idA.localeCompare(idB, undefined, { numeric: true });
  });

  const sortedAnswerData = [...answerCSVData].sort((a, b) => {
    const idA = String(a[idColumn]);
    const idB = String(b[idColumn]);
    return idA.localeCompare(idB, undefined, { numeric: true });
  });

  // Create a map for quick lookup of canonical answers by ID
  const answerMap = new Map();
  sortedAnswerData.forEach(row => {
    answerMap.set(row[idColumn], row[labelColumn]);
  });

  // Create a map for user submissions
  const userMap = new Map();
  sortedUserData.forEach(row => {
    userMap.set(row[idColumn], row[labelColumn]);
  });

  // Find common IDs and compare
  const comparisons = [];
  const missingInUser = [];
  const extraInUser = [];

  // Check each row in canonical answer
  sortedAnswerData.forEach(answerRow => {
    const rowId = answerRow[idColumn];
    if (userMap.has(rowId)) {
      const predicted = userMap.get(rowId);
      const actual = answerRow[labelColumn];
      comparisons.push({
        row_id: rowId,
        predicted,
        actual,
        match: predicted === actual
      });
    } else {
      missingInUser.push(rowId);
    }
  });

  // Check for extra rows in user submission
  sortedUserData.forEach(userRow => {
    if (!answerMap.has(userRow[idColumn])) {
      extraInUser.push(userRow[idColumn]);
    }
  });

  // Compute metrics on compared rows
  const metrics = computeMetrics(comparisons);

  return {
    comparisons,
    metrics,
    rowsInCanonical: answerCSVData.length,
    rowsInSubmission: userCSVData.length,
    rowsCompared: comparisons.length,
    missingRows: missingInUser.length,
    extraRows: extraInUser.length,
    missingRowIds: missingInUser.slice(0, 10), // Sample
    extraRowIds: extraInUser.slice(0, 10) // Sample
  };
}

/**
 * Compute regression metrics
 * 
 * Formulas:
 * - MAE (Mean Absolute Error) = (1/n) * Σ|predicted - actual|
 * - MSE (Mean Squared Error) = (1/n) * Σ(predicted - actual)²
 * - RMSE (Root Mean Squared Error) = √MSE
 * - R² (R-squared) = 1 - (SS_res / SS_tot)
 *   where SS_res = Σ(actual - predicted)²
 *         SS_tot = Σ(actual - mean(actual))²
 * - MAPE (Mean Absolute Percentage Error) = (1/n) * Σ|(actual - predicted) / actual| * 100
 */

/**
 * Compute regression metrics from predictions and actual values
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {Object} - { mae, mse, rmse, r2, mape }
 */
export function computeRegressionMetrics(predictions) {
  if (!predictions || predictions.length === 0) {
    return {
      mae: 0,
      mse: 0,
      rmse: 0,
      r2: 0,
      mape: 0
    };
  }

  const n = predictions.length;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumActual = 0;
  let sumPercentError = 0;
  let validMapeCount = 0;

  // First pass: calculate sum of actual values
  predictions.forEach(pred => {
    const actual = parseFloat(pred.actual);
    sumActual += actual;
  });

  const meanActual = sumActual / n;

  // Second pass: calculate errors and SS_tot
  let ssTot = 0;
  predictions.forEach(pred => {
    // Use parseFloat with precision handling
    const actual = parseFloat(parseFloat(pred.actual).toFixed(10));
    const predicted = parseFloat(parseFloat(pred.predicted).toFixed(10));
    
    const error = actual - predicted;
    const absError = Math.abs(error);
    const squaredError = error * error;

    sumAbsError += absError;
    sumSquaredError += squaredError;
    ssTot += Math.pow(actual - meanActual, 2);

    // MAPE calculation (avoid division by zero)
    if (Math.abs(actual) > 1e-10) { // Use epsilon for near-zero comparison
      sumPercentError += Math.abs(error / actual);
      validMapeCount++;
    }
  });

  // Calculate metrics
  const mae = sumAbsError / n;
  const mse = sumSquaredError / n;
  const rmse = Math.sqrt(mse);
  const r2 = ssTot > 0 ? 1 - (sumSquaredError / ssTot) : 0;
  const mape = validMapeCount > 0 ? (sumPercentError / validMapeCount) * 100 : 0;

  return {
    mae: parseFloat(mae.toFixed(6)),
    mse: parseFloat(mse.toFixed(6)),
    rmse: parseFloat(rmse.toFixed(6)),
    r2: parseFloat(r2.toFixed(6)),
    mape: parseFloat(mape.toFixed(6))
  };
}

/**
 * Compare CSV data and compute metrics based on problem type
 * @param {Array} userCSVData - User's uploaded CSV data
 * @param {Array} answerCSVData - Canonical answer CSV data
 * @param {string} idColumn - Name of the ID column
 * @param {string} labelColumn - Name of the label column
 * @param {string} problemType - 'classification' or 'regression'
 * @returns {Object} - Comparison results with appropriate metrics
 */
export function compareCSVDataWithType(userCSVData, answerCSVData, idColumn = 'row_id', labelColumn = 'label', problemType = 'classification') {
  const baseComparison = compareCSVData(userCSVData, answerCSVData, idColumn, labelColumn);
  
  if (problemType === 'regression') {
    // Recalculate with regression metrics
    const regressionMetrics = computeRegressionMetrics(baseComparison.comparisons);
    return {
      ...baseComparison,
      metrics: regressionMetrics,
      problemType: 'regression'
    };
  }
  
  // Default to classification
  return {
    ...baseComparison,
    problemType: 'classification'
  };
}

/**
 * Compute Log Loss (Logarithmic Loss) for classification
 * Note: Requires probability predictions (0-1 range)
 * LogLoss = -(1/n) * Σ[y*log(p) + (1-y)*log(1-p)]
 * 
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {number} - Log loss value
 */
export function computeLogLoss(predictions) {
  if (!predictions || predictions.length === 0) return 0;

  const epsilon = 1e-15; // To avoid log(0)
  let sum = 0;

  predictions.forEach(pred => {
    const predicted = Math.max(epsilon, Math.min(1 - epsilon, parseFloat(pred.predicted)));
    const actual = parseFloat(pred.actual);
    
    sum += actual * Math.log(predicted) + (1 - actual) * Math.log(1 - predicted);
  });

  return parseFloat((-sum / predictions.length).toFixed(6));
}

/**
 * Compute Matthews Correlation Coefficient (MCC) for binary classification
 * MCC = (TP*TN - FP*FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))
 * Range: -1 to +1, where +1 is perfect, 0 is random, -1 is inverse
 * 
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {number} - MCC value
 */
export function computeMCC(predictions) {
  if (!predictions || predictions.length === 0) return 0;

  let tp = 0, tn = 0, fp = 0, fn = 0;

  predictions.forEach(pred => {
    const predicted = String(pred.predicted);
    const actual = String(pred.actual);
    
    // Assume binary: '1' or '0', 'true' or 'false', etc.
    const predPositive = ['1', 'true', 'yes'].includes(predicted.toLowerCase());
    const actualPositive = ['1', 'true', 'yes'].includes(actual.toLowerCase());

    if (predPositive && actualPositive) tp++;
    else if (!predPositive && !actualPositive) tn++;
    else if (predPositive && !actualPositive) fp++;
    else if (!predPositive && actualPositive) fn++;
  });

  const numerator = (tp * tn) - (fp * fn);
  const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));

  if (denominator === 0) return 0;
  
  return parseFloat((numerator / denominator).toFixed(6));
}

/**
 * Compute Root Mean Squared Logarithmic Error (RMSLE) for regression
 * RMSLE = √[(1/n) * Σ(log(predicted + 1) - log(actual + 1))²]
 * 
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {number} - RMSLE value
 */
export function computeRMSLE(predictions) {
  if (!predictions || predictions.length === 0) return 0;

  let sumSquaredLogError = 0;
  const n = predictions.length;

  predictions.forEach(pred => {
    const actual = Math.max(0, parseFloat(pred.actual));
    const predicted = Math.max(0, parseFloat(pred.predicted));
    
    const logError = Math.log(predicted + 1) - Math.log(actual + 1);
    sumSquaredLogError += logError * logError;
  });

  return parseFloat(Math.sqrt(sumSquaredLogError / n).toFixed(6));
}

/**
 * Compute AUC-ROC (Area Under Receiver Operating Characteristic curve)
 * Note: Requires probability predictions for binary classification
 * 
 * @param {Array} predictions - Array of { row_id, predicted, actual }
 * @returns {number} - AUC value (0 to 1)
 */
export function computeAUC(predictions) {
  if (!predictions || predictions.length === 0) return 0;

  // Sort by predicted probability (descending)
  const sorted = [...predictions].sort((a, b) => 
    parseFloat(b.predicted) - parseFloat(a.predicted)
  );

  let positives = 0;
  let negatives = 0;
  let sumRanks = 0;

  // Count positives and negatives
  sorted.forEach(pred => {
    const actual = String(pred.actual);
    if (['1', 'true', 'yes'].includes(actual.toLowerCase())) {
      positives++;
    } else {
      negatives++;
    }
  });

  if (positives === 0 || negatives === 0) return 0;

  // Calculate sum of ranks for positive class
  let currentRank = 1;
  sorted.forEach(pred => {
    const actual = String(pred.actual);
    if (['1', 'true', 'yes'].includes(actual.toLowerCase())) {
      sumRanks += currentRank;
    }
    currentRank++;
  });

  // Wilcoxon-Mann-Whitney statistic
  const auc = (sumRanks - (positives * (positives + 1)) / 2) / (positives * negatives);
  
  return parseFloat(auc.toFixed(6));
}

