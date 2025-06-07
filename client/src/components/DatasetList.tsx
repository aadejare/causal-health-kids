import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Database, Calendar, BarChart3, Layers, ChevronDown, Eye, FileText } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Dataset } from '../../../server/src/schema';
import type { DatasetWithColumns } from '../../../server/src/handlers/get_dataset';

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
  const [expandedDatasets, setExpandedDatasets] = useState<Set<number>>(new Set());
  const [datasetDetails, setDatasetDetails] = useState<DatasetWithColumns | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load dataset details when selected dataset changes
  const loadDatasetDetails = useCallback(async (dataset: Dataset) => {
    if (!dataset || dataset.status !== 'ready') {
      setDatasetDetails(null);
      return;
    }

    setLoadingDetails(true);
    try {
      const details = await trpc.getDataset.query({ dataset_id: dataset.id });
      setDatasetDetails(details);
    } catch (error) {
      console.error('Failed to load dataset details:', error);
      setDatasetDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      loadDatasetDetails(selectedDataset);
    } else {
      setDatasetDetails(null);
    }
  }, [selectedDataset, loadDatasetDetails]);

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

  const toggleExpanded = (datasetId: number) => {
    setExpandedDatasets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
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
          const isExpanded = expandedDatasets.has(dataset.id);
          
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
                  {dataset.status === 'ready' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(dataset.id);
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </>
                      )}
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

                {/* Dataset Details Section */}
                {isExpanded && dataset.status === 'ready' && (
                  <div className="mt-4 border-t pt-4">
                    {loadingDetails ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading dataset details...
                      </div>
                    ) : datasetDetails ? (
                      <div className="space-y-4">
                        {/* Column Information */}
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            📋 Column Information
                          </h4>
                          <div className="bg-gray-50 rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {datasetDetails.columns.map((column) => (
                                <div key={column.id} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                                  <span className="font-medium text-gray-700">{column.column_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {column.data_type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sample Data */}
                        {datasetDetails.sample_rows && datasetDetails.sample_rows.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              👀 Sample Data (First 5 Rows)
                            </h4>
                            <div className="bg-gray-50 rounded-md p-3 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {datasetDetails.columns.map((column) => (
                                      <TableHead key={column.id} className="text-xs font-medium text-gray-600">
                                        {column.column_name}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {datasetDetails.sample_rows.map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                      {row.map((cell, cellIndex) => (
                                        <TableCell key={cellIndex} className="text-xs text-gray-700">
                                          {cell || '-'}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              💡 This preview shows the structure of your data to help you understand 
                              what information will be used for causal analysis.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Failed to load dataset details. Please try refreshing.
                      </div>
                    )}
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