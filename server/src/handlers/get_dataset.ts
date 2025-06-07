
import { db } from '../db';
import { datasetsTable, columnInfoTable } from '../db/schema';
import { type Dataset, type ColumnInfo, type GetDatasetInput } from '../schema';
import { eq } from 'drizzle-orm';

export interface DatasetWithColumns extends Dataset {
  columns: ColumnInfo[];
}

export const getDataset = async (input: GetDatasetInput): Promise<DatasetWithColumns> => {
  try {
    // First, get the dataset
    const datasets = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, input.dataset_id))
      .execute();

    if (datasets.length === 0) {
      throw new Error(`Dataset with id ${input.dataset_id} not found`);
    }

    const dataset = datasets[0];

    // Then get the column info for this dataset
    const columns = await db.select()
      .from(columnInfoTable)
      .where(eq(columnInfoTable.dataset_id, input.dataset_id))
      .execute();

    return {
      ...dataset,
      columns
    };
  } catch (error) {
    console.error('Get dataset failed:', error);
    throw error;
  }
};
