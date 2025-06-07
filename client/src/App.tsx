
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUp, Brain, Activity, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { DatasetUpload } from '@/components/DatasetUpload';
import { DatasetList } from '@/components/DatasetList';
import { AnalysisCreator } from '@/components/AnalysisCreator';
import { AnalysisList } from '@/components/AnalysisList';
import { ResultsViewer } from '@/components/ResultsViewer';
import type { Dataset, Analysis } from '../../server/src/schema';

function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('datasets');

  const loadDatasets = useCallback(async () => {
    try {
      const result = await trpc.getDatasets.query();
      setDatasets(result);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  }, []);

  const loadAnalyses = useCallback(async () => {
    try {
      const result = await trpc.getAnalyses.query();
      setAnalyses(result);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    }
  }, []);

  useEffect(() => {
    loadDatasets();
    loadAnalyses();
  }, [loadDatasets, loadAnalyses]);

  const handleDatasetUploaded = useCallback((newDataset: Dataset) => {
    setDatasets((prev: Dataset[]) => [...prev, newDataset]);
    setActiveTab('datasets');
  }, []);

  const handleAnalysisCreated = useCallback((newAnalysis: Analysis) => {
    setAnalyses((prev: Analysis[]) => [...prev, newAnalysis]);
    setActiveTab('analyses');
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'bg-green-500';
      case 'processing':
      case 'running':
        return 'bg-blue-500';
      case 'pending':
      case 'uploading':
        return 'bg-yellow-500';
      case 'error':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const runningAnalyses = analyses.filter(a => a.status === 'running').length;
  const completedAnalyses = analyses.filter(a => a.status === 'completed').length;
  const readyDatasets = datasets.filter(d => d.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Brain className="h-10 w-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              🏥 Healthcare Causal Discovery
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover hidden connections in your healthcare data! 🔍 
            Upload your datasets and let our AI find which treatments really work and why. 
            Results explained so simply, even kids can understand! 🎈
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                📊 Ready Datasets
              </CardTitle>
              <FileUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{readyDatasets}</div>
              <p className="text-xs text-gray-500">
                Datasets ready for analysis
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                🔬 Running Analyses
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{runningAnalyses}</div>
              <p className="text-xs text-gray-500">
                AI working on discoveries
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ✅ Completed Studies
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{completedAnalyses}</div>
              <p className="text-xs text-gray-500">
                Discoveries ready to explore
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">
              🚀 Your Research Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="datasets" className="flex items-center gap-2">
                  📊 Datasets
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  ⬆️ Upload
                </TabsTrigger>
                <TabsTrigger value="analyses" className="flex items-center gap-2">
                  🔬 Analyses
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2">
                  🎯 Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="datasets" className="space-y-6">
                <div className="text-center py-4">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    📚 Your Data Library
                  </h3>
                  <p className="text-gray-600">
                    Here are all your uploaded datasets. Click on one to explore its columns and create new analyses!
                  </p>
                </div>
                <DatasetList
                  datasets={datasets}
                  onDatasetSelect={setSelectedDataset}
                  selectedDataset={selectedDataset}
                  onRefresh={loadDatasets}
                  getStatusColor={getStatusColor}
                />
                {selectedDataset && (
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('analyses')}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      🔬 Create Analysis with {selectedDataset.name}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <div className="text-center py-4">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    📤 Upload Your Healthcare Data
                  </h3>
                  <p className="text-gray-600">
                    Upload CSV files with patient data, treatment records, or health outcomes. 
                    Our AI will help you discover what really makes patients better! 🏥✨
                  </p>
                </div>
                <DatasetUpload
                  onDatasetUploaded={handleDatasetUploaded}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </TabsContent>

              <TabsContent value="analyses" className="space-y-6">
                <div className="text-center py-4">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    🔬 Causal Analysis Lab
                  </h3>
                  <p className="text-gray-600">
                    Create new studies or monitor existing ones. Watch as our AI discovers 
                    which treatments cause real improvements! 🧪
                  </p>
                </div>
                
                {selectedDataset && (
                  <div className="mb-6">
                    <Alert className="border-indigo-200 bg-indigo-50">
                      <Brain className="h-4 w-4 text-indigo-600" />
                      <AlertDescription className="text-indigo-800">
                        🎯 Ready to analyze: <strong>{selectedDataset.name}</strong>
                        <br />
                        Create a new causal analysis to discover hidden relationships in your data!
                      </AlertDescription>
                    </Alert>
                    <div className="mt-4">
                      <AnalysisCreator
                        dataset={selectedDataset}
                        onAnalysisCreated={handleAnalysisCreated}
                      />
                    </div>
                  </div>
                )}

                <AnalysisList
                  analyses={analyses}
                  onAnalysisSelect={setSelectedAnalysis}
                  selectedAnalysis={selectedAnalysis}
                  onRefresh={loadAnalyses}
                  getStatusColor={getStatusColor}
                />
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                <div className="text-center py-4">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    🎯 Discovery Results
                  </h3>
                  <p className="text-gray-600">
                    Explore your causal discoveries! Each result explains what causes what, 
                    and why - in simple terms anyone can understand! 🌟
                  </p>
                </div>
                
                {selectedAnalysis ? (
                  <ResultsViewer analysis={selectedAnalysis} />
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      🔍 Select an analysis from the Analyses tab to see results
                    </p>
                    <Button
                      onClick={() => setActiveTab('analyses')}
                      variant="outline"
                      className="mt-4"
                    >
                      🔬 Go to Analyses
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
