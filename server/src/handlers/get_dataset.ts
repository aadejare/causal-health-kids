
import { type Dataset, type ColumnInfo, type GetDatasetInput } from '../schema';

export interface DatasetWithColumns extends Dataset {
  columns: ColumnInfo[];
}

export declare function getDataset(input: GetDatasetInput): Promise<DatasetWithColumns>;
