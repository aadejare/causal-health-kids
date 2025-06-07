
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, analysesTable } from '../db/schema';
import { type ListAnalysesInput } from '../schema';
import { getAnalyses } from '../handlers/get_analyses';

describe('getAnalyses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all analyses when no input provided', async () => {
    // Create test dataset
    const dataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Test description',
        file_path: '/test/path.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    // Create test analyses
    await db.insert(analysesTable)
      .values([
        {
          dataset_id: dataset[0].id,
          name: 'Analysis 1',
          target_variable: 'outcome',
          treatment_variables: ['treatment1'],
          control_variables: ['control1'],
          method: 'doubleml',
          status: 'completed'
        },
        {
          dataset_id: dataset[0].id,
          name: 'Analysis 2',
          target_variable: 'outcome2',
          treatment_variables: ['treatment2'],
          control_variables: ['control2'],
          method: 'causalml',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getAnalyses();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Analysis 1');
    expect(result[0].target_variable).toEqual('outcome');
    expect(result[0].treatment_variables).toEqual(['treatment1']);
    expect(result[0].control_variables).toEqual(['control1']);
    expect(result[0].method).toEqual('doubleml');
    expect(result[0].status).toEqual('completed');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[1].name).toEqual('Analysis 2');
  });

  it('should filter analyses by dataset_id', async () => {
    // Create two test datasets
    const datasets = await db.insert(datasetsTable)
      .values([
        {
          name: 'Dataset 1',
          description: 'First dataset',
          file_path: '/test/path1.csv',
          file_size: 1024,
          columns_count: 5,
          rows_count: 100,
          status: 'ready'
        },
        {
          name: 'Dataset 2',
          description: 'Second dataset',
          file_path: '/test/path2.csv',
          file_size: 2048,
          columns_count: 8,
          rows_count: 200,
          status: 'ready'
        }
      ])
      .returning()
      .execute();

    // Create analyses for both datasets
    await db.insert(analysesTable)
      .values([
        {
          dataset_id: datasets[0].id,
          name: 'Analysis for Dataset 1',
          target_variable: 'outcome1',
          treatment_variables: ['treatment1'],
          control_variables: ['control1'],
          method: 'doubleml',
          status: 'completed'
        },
        {
          dataset_id: datasets[1].id,
          name: 'Analysis for Dataset 2',
          target_variable: 'outcome2',
          treatment_variables: ['treatment2'],
          control_variables: ['control2'],
          method: 'causalml',
          status: 'pending'
        }
      ])
      .execute();

    const input: ListAnalysesInput = {
      dataset_id: datasets[0].id
    };

    const result = await getAnalyses(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Analysis for Dataset 1');
    expect(result[0].dataset_id).toEqual(datasets[0].id);
  });

  it('should apply pagination correctly', async () => {
    // Create test dataset
    const dataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Test description',
        file_path: '/test/path.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    // Create multiple analyses
    const analysesData = Array.from({ length: 5 }, (_, i) => ({
      dataset_id: dataset[0].id,
      name: `Analysis ${i + 1}`,
      target_variable: `outcome${i + 1}`,
      treatment_variables: [`treatment${i + 1}`],
      control_variables: [`control${i + 1}`],
      method: 'doubleml' as const,
      status: 'pending' as const
    }));

    await db.insert(analysesTable)
      .values(analysesData)
      .execute();

    const input: ListAnalysesInput = {
      limit: 2,
      offset: 1
    };

    const result = await getAnalyses(input);

    expect(result).toHaveLength(2);
    // Results should be offset by 1, so we get analyses 2 and 3
    expect(result[0].name).toEqual('Analysis 2');
    expect(result[1].name).toEqual('Analysis 3');
  });

  it('should return empty array when no analyses exist', async () => {
    const result = await getAnalyses();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when filtering by non-existent dataset_id', async () => {
    // Create test dataset and analysis
    const dataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'Test description',
        file_path: '/test/path.csv',
        file_size: 1024,
        columns_count: 5,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    await db.insert(analysesTable)
      .values({
        dataset_id: dataset[0].id,
        name: 'Test Analysis',
        target_variable: 'outcome',
        treatment_variables: ['treatment'],
        control_variables: ['control'],
        method: 'doubleml',
        status: 'pending'
      })
      .execute();

    const input: ListAnalysesInput = {
      dataset_id: 99999 // Non-existent dataset ID
    };

    const result = await getAnalyses(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
