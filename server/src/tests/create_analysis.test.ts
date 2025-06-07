
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { analysesTable, datasetsTable } from '../db/schema';
import { type CreateAnalysisInput } from '../schema';
import { createAnalysis } from '../handlers/create_analysis';
import { eq } from 'drizzle-orm';

// Test dataset for prerequisite data
const testDataset = {
  name: 'Test Dataset',
  description: 'A dataset for testing',
  file_path: '/test/data.csv',
  file_size: 1024,
  columns_count: 5,
  rows_count: 100,
  status: 'ready' as const
};

// Test analysis input
const testInput: CreateAnalysisInput = {
  dataset_id: 1,
  name: 'Test Analysis',
  target_variable: 'outcome',
  treatment_variables: ['treatment'],
  control_variables: ['age', 'gender'],
  method: 'doubleml'
};

describe('createAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an analysis', async () => {
    // Create prerequisite dataset
    const datasetResult = await db.insert(datasetsTable)
      .values(testDataset)
      .returning()
      .execute();
    
    const input = { ...testInput, dataset_id: datasetResult[0].id };
    const result = await createAnalysis(input);

    // Basic field validation
    expect(result.name).toEqual('Test Analysis');
    expect(result.dataset_id).toEqual(datasetResult[0].id);
    expect(result.target_variable).toEqual('outcome');
    expect(result.treatment_variables).toEqual(['treatment']);
    expect(result.control_variables).toEqual(['age', 'gender']);
    expect(result.method).toEqual('doubleml');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save analysis to database', async () => {
    // Create prerequisite dataset
    const datasetResult = await db.insert(datasetsTable)
      .values(testDataset)
      .returning()
      .execute();
    
    const input = { ...testInput, dataset_id: datasetResult[0].id };
    const result = await createAnalysis(input);

    // Query using proper drizzle syntax
    const analyses = await db.select()
      .from(analysesTable)
      .where(eq(analysesTable.id, result.id))
      .execute();

    expect(analyses).toHaveLength(1);
    expect(analyses[0].name).toEqual('Test Analysis');
    expect(analyses[0].dataset_id).toEqual(datasetResult[0].id);
    expect(analyses[0].target_variable).toEqual('outcome');
    expect(analyses[0].treatment_variables).toEqual(['treatment']);
    expect(analyses[0].control_variables).toEqual(['age', 'gender']);
    expect(analyses[0].method).toEqual('doubleml');
    expect(analyses[0].status).toEqual('pending');
    expect(analyses[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent dataset', async () => {
    const input = { ...testInput, dataset_id: 999 };
    
    await expect(createAnalysis(input)).rejects.toThrow(/dataset with id 999 not found/i);
  });

  it('should handle different analysis methods', async () => {
    // Create prerequisite dataset
    const datasetResult = await db.insert(datasetsTable)
      .values(testDataset)
      .returning()
      .execute();
    
    const methods = ['doubleml', 'causalml', 'econml', 'pywhy'] as const;
    
    for (const method of methods) {
      const input = { 
        ...testInput, 
        dataset_id: datasetResult[0].id,
        name: `Test Analysis ${method}`,
        method 
      };
      const result = await createAnalysis(input);
      
      expect(result.method).toEqual(method);
      expect(result.name).toEqual(`Test Analysis ${method}`);
    }
  });

  it('should handle empty control variables array', async () => {
    // Create prerequisite dataset
    const datasetResult = await db.insert(datasetsTable)
      .values(testDataset)
      .returning()
      .execute();
    
    const input = { 
      ...testInput, 
      dataset_id: datasetResult[0].id,
      control_variables: []
    };
    const result = await createAnalysis(input);

    expect(result.control_variables).toEqual([]);
    expect(result.treatment_variables).toEqual(['treatment']);
  });
});
