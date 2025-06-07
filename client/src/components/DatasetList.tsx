
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Calendar, BarChart3, Layers } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Dataset } from '../../../server/src/schema';

interface DatasetListProps {
  datasets: Dataset[];
  onDatasetSelect: (dataset: Dataset) => void;
  selectedDataset: Dataset | null;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
}

export function DatasetList({ 
  datasets, 
  onDatasetSelect, 
  selectedDataset, 
  onRefresh, 
  getStatusColor 
}: DatasetListProps) {
  const [processingDatasets, setProcessingDatasets] = useState<Set<number>>(new Set());

  const handleProcessDataset = async (datasetId: number) => {
    setProcessingDatasets(prev => new Set(prev).add(datasetId));
    try {
      await trpc.processDataset.mutate({ dataset_id: datasetId });
      // Refresh the datasets list after processing
      setTimeout(() => {
        onRefresh();
        setProcessingDatasets(prev => {
          const newSet = new Set(prev);
          newSet.delete(datasetId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to process dataset:', error);
      setProcessingDatasets(prev => {
        const newSet = new Set(prev);
        newSet.delete(datasetId);
        return newSet;
      });
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'ready': return '✅';
      case 'processing': return '⚙️';
      case 'uploading': return '⬆️';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Ready for Analysis';
      case 'processing': return 'Processing Data';
      case 'uploading': return 'Uploading...';
      case 'error': return 'Error Occurred';
      default: return 'Unknown Status';
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          📚 No Datasets Yet
        </h3>
        <p className="text-gray-500 mb-4">
          Upload your first healthcare dataset to start discovering causal relationships!
        </p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700">
          📋 Your Datasets ({datasets.length})
        </h3>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {datasets.map((dataset: Dataset) => {
          const isSelected = selectedDataset?.id === dataset.id;
          const isProcessing = processingDatasets.has(dataset.id);
          
          return (
            <Card 
              key={dataset.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onDatasetSelect(dataset)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-800 mb-1">
                      📊 {dataset.name}
                    </CardTitle>
                    {dataset.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {dataset.description}
                      </p>
                    )}
                  </div>
                  <Badge 
                    className={`${getStatusColor(dataset.status)} text-white ml-4`}
                  >
                    {getStatusEmoji(dataset.status)} {getStatusText(dataset.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">
                      <strong>{dataset.columns_count}</strong> columns
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600">
                      <strong>{dataset.rows_count.toLocaleString()}</strong> rows
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-gray-600">
                      <strong>{(dataset.file_size / 1024 / 1024).toFixed(1)}</strong> MB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-gray-600">
                      {dataset.uploaded_at.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Processing Progress */}
                {(dataset.status === 'processing' || isProcessing) && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>🔍 Analyzing data structure...</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {dataset.status === 'ready' && isSelected && (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      🔬 Create Analysis
                    </Button>
                  )}
                  {dataset.status === 'uploading' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProcessDataset(dataset.id);
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '⚙️ Processing...' : '🚀 Process Now'}
                    </Button>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-3 p-3 bg-indigo-100 rounded-md">
                    <p className="text-sm text-indigo-800">
                      🎯 <strong>Selected!</strong> This dataset is ready for causal analysis. 
                      Switch to the Analyses tab to start discovering relationships.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
