
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, analysesTable } from '../db/schema';
import { runCausalAnalysis } from '../handlers/run_causal_analysis';
import { eq } from 'drizzle-orm';

describe('runCausalAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should run causal analysis and return completed analysis', async () => {
    // Create a dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Dataset for testing',
        file_path: '/path/to/test.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 1000,
        status: 'ready'
      })
      .returning()
      .execute();

    const dataset = datasetResult[0];

    // Create an analysis
    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: dataset.id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['age', 'gender'],
        method: 'doubleml',
        status: 'pending'
      })
      .returning()
      .execute();

    const analysis = analysisResult[0];

    // Run the analysis
    const result = await runCausalAnalysis(analysis.id);

    // Verify the result
    expect(result.id).toEqual(analysis.id);
    expect(result.status).toEqual('completed');
    expect(result.results).toBeDefined();
    expect(result.simple_explanation).toBeDefined();
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(typeof result.simple_explanation).toBe('string');
    expect(result.simple_explanation).toContain('treatment');
    expect(result.simple_explanation).toContain('outcome');
  });

  it('should save analysis results to database', async () => {
    // Create prerequisite data
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Dataset for testing',
        file_path: '/path/to/test.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 1000,
        status: 'ready'
      })
      .returning()
      .execute();

    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetResult[0].id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['age', 'gender'],
        method: 'doubleml',
        status: 'pending'
      })
      .returning()
      .execute();

    const analysis = analysisResult[0];

    // Run analysis
    await runCausalAnalysis(analysis.id);

    // Verify database was updated
    const updatedAnalysis = await db.select()
      .from(analysesTable)
      .where(eq(analysesTable.id, analysis.id))
      .execute();

    expect(updatedAnalysis).toHaveLength(1);
    expect(updatedAnalysis[0].status).toEqual('completed');
    expect(updatedAnalysis[0].results).toBeDefined();
    expect(updatedAnalysis[0].simple_explanation).toBeDefined();
    expect(updatedAnalysis[0].completed_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent analysis', async () => {
    await expect(runCausalAnalysis(999)).rejects.toThrow(/not found/i);
  });

  it('should throw error if analysis is already running', async () => {
    // Create dataset and analysis
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Dataset for testing',
        file_path: '/path/to/test.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 1000,
        status: 'ready'
      })
      .returning()
      .execute();

    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetResult[0].id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['age', 'gender'],
        method: 'doubleml',
        status: 'running'
      })
      .returning()
      .execute();

    await expect(runCausalAnalysis(analysisResult[0].id)).rejects.toThrow(/already running/i);
  });

  it('should return completed analysis without re-running', async () => {
    // Create dataset and completed analysis
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Dataset for testing',
        file_path: '/path/to/test.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 1000,
        status: 'ready'
      })
      .returning()
      .execute();

    const existingResults = { treatment_effect: 0.25 };
    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetResult[0].id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['age', 'gender'],
        method: 'doubleml',
        status: 'completed',
        results: existingResults,
        simple_explanation: 'Previous explanation',
        completed_at: new Date()
      })
      .returning()
      .execute();

    const result = await runCausalAnalysis(analysisResult[0].id);

    expect(result.status).toEqual('completed');
    expect(result.results).toEqual(existingResults);
    expect(result.simple_explanation).toEqual('Previous explanation');
  });

  it('should throw error if dataset is not ready', async () => {
    // Create dataset that is not ready
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Dataset for testing',
        file_path: '/path/to/test.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 1000,
        status: 'processing'
      })
      .returning()
      .execute();

    const analysisResult = await db.insert(analysesTable)
      .values({
        dataset_id: datasetResult[0].id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['age', 'gender'],
        method: 'doubleml',
        status: 'pending'
      })
      .returning()
      .execute();

    await expect(runCausalAnalysis(analysisResult[0].id)).rejects.toThrow(/not ready/i);
  });
});
