
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, analysesTable } from '../db/schema';
import { type GetAnalysisResultsInput } from '../schema';
import { getAnalysisResults } from '../handlers/get_analysis_results';

describe('getAnalysisResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analysis results by ID', async () => {
    // Create a dataset first
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A dataset for testing',
        file_path: '/test/path/dataset.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Create an analysis with completed_at timestamp
    const completedAt = new Date();
    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetId,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment1', 'treatment2'],
        control_variables: ['control1', 'control2'],
        method: 'doubleml',
        status: 'completed',
        results: { effect: 0.25, confidence_interval: [0.1, 0.4] },
        simple_explanation: 'The treatment has a positive effect',
        completed_at: completedAt
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    const input: GetAnalysisResultsInput = {
      analysis_id: analysisId
    };

    const result = await getAnalysisResults(input);

    // Verify all fields are returned correctly
    expect(result.id).toEqual(analysisId);
    expect(result.dataset_id).toEqual(datasetId);
    expect(result.name).toEqual('Test Analysis');
    expect(result.target_variable).toEqual('outcome');
    expect(result.treatment_variables).toEqual(['treatment1', 'treatment2']);
    expect(result.control_variables).toEqual(['control1', 'control2']);
    expect(result.method).toEqual('doubleml');
    expect(result.status).toEqual('completed');
    expect(result.results).toEqual({ effect: 0.25, confidence_interval: [0.1, 0.4] });
    expect(result.simple_explanation).toEqual('The treatment has a positive effect');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should return analysis with null values correctly', async () => {
    // Create a dataset first
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: null,
        file_path: '/test/path/dataset.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Create an analysis with null optional fields
    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetId,
        name: 'Pending Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment1'],
        control_variables: ['control1'],
        method: 'causalml',
        status: 'pending',
        results: null,
        simple_explanation: null
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    const input: GetAnalysisResultsInput = {
      analysis_id: analysisId
    };

    const result = await getAnalysisResults(input);

    // Verify null fields are handled correctly
    expect(result.id).toEqual(analysisId);
    expect(result.dataset_id).toEqual(datasetId);
    expect(result.name).toEqual('Pending Analysis');
    expect(result.target_variable).toEqual('outcome');
    expect(result.treatment_variables).toEqual(['treatment1']);
    expect(result.control_variables).toEqual(['control1']);
    expect(result.method).toEqual('causalml');
    expect(result.status).toEqual('pending');
    expect(result.results).toBeNull();
    expect(result.simple_explanation).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should throw error when analysis not found', async () => {
    const input: GetAnalysisResultsInput = {
      analysis_id: 999999
    };

    await expect(getAnalysisResults(input)).rejects.toThrow(/Analysis with ID 999999 not found/i);
  });

  it('should handle complex results object', async () => {
    // Create a dataset first
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Complex Dataset',
        description: 'A dataset with complex results',
        file_path: '/test/path/complex.csv',
        file_size: 2048,
        columns_count: 10,
        rows_count: 500,
        status: 'ready'
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Create an analysis with complex results
    const complexResults = {
      average_treatment_effect: 0.42,
      confidence_intervals: {
        lower: 0.25,
        upper: 0.59
      },
      p_value: 0.001,
      model_metrics: {
        r_squared: 0.78,
        rmse: 0.12
      },
      heterogeneity_analysis: [
        { subgroup: 'age_young', effect: 0.35 },
        { subgroup: 'age_old', effect: 0.48 }
      ]
    };

    const completedAt = new Date();
    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetId,
        name: 'Complex Analysis',
        target_variable: 'sales',
        treatment_variables: ['marketing_campaign'],
        control_variables: ['age', 'income', 'education'],
        method: 'econml',
        status: 'completed',
        results: complexResults,
        simple_explanation: 'Marketing campaign increased sales by 42%',
        completed_at: completedAt
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    const input: GetAnalysisResultsInput = {
      analysis_id: analysisId
    };

    const result = await getAnalysisResults(input);

    // Verify complex results object is preserved
    expect(result.results).toEqual(complexResults);
    expect(result.results?.['average_treatment_effect']).toEqual(0.42);
    expect(result.results?.['confidence_intervals']).toEqual({
      lower: 0.25,
      upper: 0.59
    });
    expect(result.results?.['heterogeneity_analysis']).toHaveLength(2);
  });
});
