
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, columnInfoTable } from '../db/schema';
import { type GetDatasetInput } from '../schema';
import { getDataset } from '../handlers/get_dataset';

describe('getDataset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get a dataset with its columns', async () => {
    // Create test dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A dataset for testing',
        file_path: '/test/path/data.csv',
        file_size: 1024,
        columns_count: 3,
        rows_count: 100,
        sample_rows: [
          ['John', '25', 'male'],
          ['Jane', '30', 'female'],
          ['Bob', '35', 'male'],
          ['Alice', '28', 'female'],
          ['Charlie', '42', 'male']
        ],
        status: 'ready'
      })
      .returning()
      .execute();

    const dataset = datasetResult[0];

    // Create test column info
    await db.insert(columnInfoTable)
      .values([
        {
          dataset_id: dataset.id,
          column_name: 'age',
          data_type: 'numeric',
          null_count: 0,
          unique_count: 50,
          sample_values: ['25', '30', '35'],
          is_potential_target: false,
          is_potential_treatment: false
        },
        {
          dataset_id: dataset.id,
          column_name: 'gender',
          data_type: 'categorical',
          null_count: 2,
          unique_count: 2,
          sample_values: ['male', 'female'],
          is_potential_target: false,
          is_potential_treatment: true
        },
        {
          dataset_id: dataset.id,
          column_name: 'income',
          data_type: 'numeric',
          null_count: 5,
          unique_count: 95,
          sample_values: ['50000', '75000', '100000'],
          is_potential_target: true,
          is_potential_treatment: false
        }
      ])
      .execute();

    const input: GetDatasetInput = {
      dataset_id: dataset.id
    };

    const result = await getDataset(input);

    // Verify dataset fields
    expect(result.id).toEqual(dataset.id);
    expect(result.name).toEqual('Test Dataset');
    expect(result.description).toEqual('A dataset for testing');
    expect(result.file_path).toEqual('/test/path/data.csv');
    expect(result.file_size).toEqual(1024);
    expect(result.columns_count).toEqual(3);
    expect(result.rows_count).toEqual(100);
    expect(result.sample_rows).toBeDefined();
    expect(result.sample_rows).toHaveLength(5);
    expect(result.sample_rows![0]).toEqual(['John', '25', 'male']);
    expect(result.sample_rows![4]).toEqual(['Charlie', '42', 'male']);
    expect(result.status).toEqual('ready');
    expect(result.uploaded_at).toBeInstanceOf(Date);
    expect(result.processed_at).toBeNull();

    // Verify columns
    expect(result.columns).toHaveLength(3);
    
    const ageColumn = result.columns.find(col => col.column_name === 'age');
    expect(ageColumn).toBeDefined();
    expect(ageColumn!.data_type).toEqual('numeric');
    expect(ageColumn!.null_count).toEqual(0);
    expect(ageColumn!.unique_count).toEqual(50);
    expect(ageColumn!.sample_values).toEqual(['25', '30', '35']);
    expect(ageColumn!.is_potential_target).toBe(false);
    expect(ageColumn!.is_potential_treatment).toBe(false);

    const genderColumn = result.columns.find(col => col.column_name === 'gender');
    expect(genderColumn).toBeDefined();
    expect(genderColumn!.data_type).toEqual('categorical');
    expect(genderColumn!.is_potential_treatment).toBe(true);

    const incomeColumn = result.columns.find(col => col.column_name === 'income');
    expect(incomeColumn).toBeDefined();
    expect(incomeColumn!.data_type).toEqual('numeric');
    expect(incomeColumn!.is_potential_target).toBe(true);
  });

  it('should return dataset with empty columns array if no columns exist', async () => {
    // Create test dataset without columns
    const datasetResult = await db.insert(datasetsTable)
      .values({
        name: 'Empty Dataset',
        description: 'A dataset with no columns',
        file_path: '/test/path/empty.csv',
        file_size: 0,
        columns_count: 0,
        rows_count: 0,
        sample_rows: null,
        status: 'processing'
      })
      .returning()
      .execute();

    const dataset = datasetResult[0];

    const input: GetDatasetInput = {
      dataset_id: dataset.id
    };

    const result = await getDataset(input);

    expect(result.id).toEqual(dataset.id);
    expect(result.name).toEqual('Empty Dataset');
    expect(result.sample_rows).toBeNull();
    expect(result.columns).toHaveLength(0);
  });

  it('should throw error when dataset does not exist', async () => {
    const input: GetDatasetInput = {
      dataset_id: 999999
    };

    await expect(getDataset(input)).rejects.toThrow(/Dataset with id 999999 not found/i);
  });
});
