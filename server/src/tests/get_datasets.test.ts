
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type ListDatasetsInput } from '../schema';
import { getDatasets } from '../handlers/get_datasets';

describe('getDatasets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no datasets exist', async () => {
    const result = await getDatasets();
    
    expect(result).toEqual([]);
  });

  it('should return all datasets when no input provided', async () => {
    // Create test datasets with explicit timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000); // 1 second earlier

    await db.insert(datasetsTable).values([
      {
        name: 'Dataset 1',
        description: 'First dataset',
        file_path: '/path/to/file1.csv',
        file_size: 1000,
        columns_count: 5,
        rows_count: 100,
        status: 'ready',
        uploaded_at: earlier
      },
      {
        name: 'Dataset 2',
        description: 'Second dataset',
        file_path: '/path/to/file2.csv',
        file_size: 2000,
        columns_count: 8,
        rows_count: 200,
        status: 'processing',
        uploaded_at: now
      }
    ]).execute();

    const result = await getDatasets();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Dataset 2'); // Most recent first due to desc ordering
    expect(result[1].name).toEqual('Dataset 1');
    expect(result[0].status).toEqual('processing');
    expect(result[1].status).toEqual('ready');
  });

  it('should respect limit parameter', async () => {
    // Create multiple datasets with explicit timestamps
    const now = new Date();
    const time1 = new Date(now.getTime() - 2000);
    const time2 = new Date(now.getTime() - 1000);
    const time3 = now;

    await db.insert(datasetsTable).values([
      {
        name: 'Dataset 1',
        file_path: '/path/to/file1.csv',
        file_size: 1000,
        columns_count: 5,
        rows_count: 100,
        status: 'ready',
        uploaded_at: time1
      },
      {
        name: 'Dataset 2',
        file_path: '/path/to/file2.csv',
        file_size: 2000,
        columns_count: 8,
        rows_count: 200,
        status: 'ready',
        uploaded_at: time2
      },
      {
        name: 'Dataset 3',
        file_path: '/path/to/file3.csv',
        file_size: 3000,
        columns_count: 10,
        rows_count: 300,
        status: 'ready',
        uploaded_at: time3
      }
    ]).execute();

    const input: ListDatasetsInput = { limit: 2 };
    const result = await getDatasets(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Dataset 3'); // Most recent first
    expect(result[1].name).toEqual('Dataset 2');
  });

  it('should respect offset parameter', async () => {
    // Create test datasets with explicit timestamps
    const now = new Date();
    const time1 = new Date(now.getTime() - 2000);
    const time2 = new Date(now.getTime() - 1000);
    const time3 = now;

    await db.insert(datasetsTable).values([
      {
        name: 'Dataset 1',
        file_path: '/path/to/file1.csv',
        file_size: 1000,
        columns_count: 5,
        rows_count: 100,
        status: 'ready',
        uploaded_at: time1
      },
      {
        name: 'Dataset 2',
        file_path: '/path/to/file2.csv',
        file_size: 2000,
        columns_count: 8,
        rows_count: 200,
        status: 'ready',
        uploaded_at: time2
      },
      {
        name: 'Dataset 3',
        file_path: '/path/to/file3.csv',
        file_size: 3000,
        columns_count: 10,
        rows_count: 300,
        status: 'ready',
        uploaded_at: time3
      }
    ]).execute();

    const input: ListDatasetsInput = { offset: 1 };
    const result = await getDatasets(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Dataset 2'); // Skip first one (Dataset 3)
    expect(result[1].name).toEqual('Dataset 1');
  });

  it('should handle limit and offset together', async () => {
    // Create test datasets with explicit timestamps
    const now = new Date();
    const time1 = new Date(now.getTime() - 2000);
    const time2 = new Date(now.getTime() - 1000);
    const time3 = now;

    await db.insert(datasetsTable).values([
      {
        name: 'Dataset 1',
        file_path: '/path/to/file1.csv',
        file_size: 1000,
        columns_count: 5,
        rows_count: 100,
        status: 'ready',
        uploaded_at: time1
      },
      {
        name: 'Dataset 2',
        file_path: '/path/to/file2.csv',
        file_size: 2000,
        columns_count: 8,
        rows_count: 200,
        status: 'ready',
        uploaded_at: time2
      },
      {
        name: 'Dataset 3',
        file_path: '/path/to/file3.csv',
        file_size: 3000,
        columns_count: 10,
        rows_count: 300,
        status: 'ready',
        uploaded_at: time3
      }
    ]).execute();

    const input: ListDatasetsInput = { limit: 1, offset: 1 };
    const result = await getDatasets(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Dataset 2'); // Skip first (Dataset 3), take one
  });

  it('should return datasets with all required fields', async () => {
    await db.insert(datasetsTable).values({
      name: 'Test Dataset',
      description: 'A test dataset',
      file_path: '/path/to/test.csv',
      file_size: 5000,
      columns_count: 12,
      rows_count: 500,
      status: 'ready'
    }).execute();

    const result = await getDatasets();

    expect(result).toHaveLength(1);
    const dataset = result[0];
    
    expect(dataset.id).toBeDefined();
    expect(dataset.name).toEqual('Test Dataset');
    expect(dataset.description).toEqual('A test dataset');
    expect(dataset.file_path).toEqual('/path/to/test.csv');
    expect(dataset.file_size).toEqual(5000);
    expect(dataset.columns_count).toEqual(12);
    expect(dataset.rows_count).toEqual(500);
    expect(dataset.status).toEqual('ready');
    expect(dataset.uploaded_at).toBeInstanceOf(Date);
    expect(dataset.processed_at).toBeNull();
  });

  it('should order datasets by uploaded_at descending', async () => {
    // Create datasets with specific timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(datasetsTable).values([
      {
        name: 'Oldest Dataset',
        file_path: '/path/to/old.csv',
        file_size: 1000,
        columns_count: 5,
        rows_count: 100,
        status: 'ready',
        uploaded_at: twoDaysAgo
      },
      {
        name: 'Newest Dataset',
        file_path: '/path/to/new.csv',
        file_size: 3000,
        columns_count: 10,
        rows_count: 300,
        status: 'ready',
        uploaded_at: now
      },
      {
        name: 'Middle Dataset',
        file_path: '/path/to/middle.csv',
        file_size: 2000,
        columns_count: 8,
        rows_count: 200,
        status: 'ready',
        uploaded_at: yesterday
      }
    ]).execute();

    const result = await getDatasets();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Newest Dataset');
    expect(result[1].name).toEqual('Middle Dataset');
    expect(result[2].name).toEqual('Oldest Dataset');
  });
});
