
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Target, Zap, Shield, Lightbulb } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Dataset, Analysis, CreateAnalysisInput, ColumnInfo } from '../../../server/src/schema';
import type { DatasetWithColumns } from '../../../server/src/handlers/get_dataset';

interface AnalysisCreatorProps {
  dataset: Dataset;
  onAnalysisCreated: (analysis: Analysis) => void;
}

export function AnalysisCreator({ dataset, onAnalysisCreated }: AnalysisCreatorProps) {
  const [datasetDetails, setDatasetDetails] = useState<DatasetWithColumns | null>(null);
  const [formData, setFormData] = useState<CreateAnalysisInput>({
    dataset_id: dataset.id,
    name: '',
    target_variable: '',
    treatment_variables: [],
    control_variables: [],
    method: 'doubleml'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);

  const loadDatasetDetails = useCallback(async () => {
    setIsLoadingDataset(true);
    try {
      const result = await trpc.getDataset.query({ dataset_id: dataset.id });
      setDatasetDetails(result);
    } catch (error) {
      console.error('Failed to load dataset details:', error);
    } finally {
      setIsLoadingDataset(false);
    }
  }, [dataset.id]);

  useEffect(() => {
    loadDatasetDetails();
  }, [loadDatasetDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await trpc.createAnalysis.mutate(formData);
      onAnalysisCreated(result);
      // Reset form
      setFormData({
        dataset_id: dataset.id,
        name: '',
        target_variable: '',
        treatment_variables: [],
        control_variables: [],
        method: 'doubleml'
      });
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTreatmentVariableToggle = (columnName: string, checked: boolean) => {
    setFormData((prev: CreateAnalysisInput) => ({
      ...prev,
      treatment_variables: checked
        ? [...prev.treatment_variables, columnName]
        : prev.treatment_variables.filter(v => v !== columnName)
    }));
  };

  const handleControlVariableToggle = (columnName: string, checked: boolean) => {
    setFormData((prev: CreateAnalysisInput) => ({
      ...prev,
      control_variables: checked
        ? [...prev.control_variables, columnName]
        : prev.control_variables.filter(v => v !== columnName)
    }));
  };

  const getColumnTypeEmoji = (dataType: string) => {
    switch (dataType) {
      case 'numeric': return '🔢';
      case 'categorical': return '🏷️';
      case 'boolean': return '✅';
      case 'datetime': return '📅';
      case 'text': return '📝';
      default: return '❓';
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'doubleml':
        return '🎯 DoubleML - Like having two detectives double-check each other! Very accurate for finding real causes.';
      case 'causalml':
        return '🔍 CausalML - Smart AI that learns who responds best to treatments. Great for personalized medicine!';
      case 'econml':
        return '📊 EconML - The economics expert! Perfect for understanding treatment effects across different groups.';
      case 'pywhy':
        return '🤔 PyWhy - The philosopher! Asks deep questions about cause and effect relationships.';
      default:
        return 'Choose a method to see description';
    }
  };

  if (isLoadingDataset) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Brain className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">🔍 Analyzing your dataset structure...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!datasetDetails) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">
          ❌ Could not load dataset details. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const targetCandidates = datasetDetails.columns.filter((col: ColumnInfo) => col.is_potential_target);
  const treatmentCandidates = datasetDetails.columns.filter((col: ColumnInfo) => col.is_potential_treatment);
  const otherColumns = datasetDetails.columns.filter((col: ColumnInfo) => 
    !col.is_potential_target && !col.is_potential_treatment
  );

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Brain className="h-5 w-5" />
          🧪 Create Causal Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Analysis Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              📝 Analysis Name
            </label>
            <Input
              placeholder="e.g., Effect of Medicine X on Patient Recovery"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateAnalysisInput) => ({ ...prev, name: e.target.value }))
              }
              className="border-purple-200 focus:border-purple-400"
              required
            />
          </div>

          {/* Target Variable */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              🎯 What do you want to measure? (Target Variable)
            </label>
            <p className="text-sm text-gray-600">
              This is your outcome - what you want to see improve (like "patient recovered" or "pain level")
            </p>
            <Select
              value={formData.target_variable || ''}
              onValueChange={(value) =>
                setFormData((prev: CreateAnalysisInput) => ({ ...prev, target_variable: value }))
              }
            >
              <SelectTrigger className="border-purple-200 focus:border-purple-400">
                <SelectValue placeholder="Choose your outcome variable..." />
              </SelectTrigger>
              <SelectContent>
                {targetCandidates.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-sm mb-1">
                      🎯 Recommended Targets
                    </div>
                    {targetCandidates.map((column: ColumnInfo) => (
                      <SelectItem key={column.id} value={column.column_name}>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          {getColumnTypeEmoji(column.data_type)} {column.column_name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {otherColumns.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-sm mb-1 mt-2">
                      📊 Other Columns
                    </div>
                    {otherColumns.map((column: ColumnInfo) => (
                      <SelectItem key={column.id} value={column.column_name}>
                        <div className="flex items-center gap-2">
                          {getColumnTypeEmoji(column.data_type)} {column.column_name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Treatment Variables */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              💊 What treatments do you want to test? (Treatment Variables)
            </label>
            <p className="text-sm text-gray-600">
              These are the things you think might cause changes (like medicines, therapies, or procedures)
            </p>
            
            {treatmentCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  ⭐ AI Recommendations
                </p>
                {treatmentCandidates.map((column: ColumnInfo) => (
                  <div key={column.id} className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <Checkbox
                      id={`treatment-${column.id}`}
                      checked={formData.treatment_variables.includes(column.column_name)}
                      onCheckedChange={(checked) =>
                        handleTreatmentVariableToggle(column.column_name, checked as boolean)
                      }
                    />
                    <label htmlFor={`treatment-${column.id}`} className="flex items-center gap-2 cursor-pointer">
                      <Zap className="h-4 w-4 text-blue-500" />
                      {getColumnTypeEmoji(column.data_type)} {column.column_name}
                      <Badge variant="secondary" className="ml-2">
                        {column.unique_count} unique values
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                📊 All Other Columns
              </p>
              {otherColumns.map((column: ColumnInfo) => (
                <div key={column.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <Checkbox
                    id={`treatment-other-${column.id}`}
                    checked={formData.treatment_variables.includes(column.column_name)}
                    onCheckedChange={(checked) =>
                      handleTreatmentVariableToggle(column.column_name, checked as boolean)
                    }
                  />
                  <label htmlFor={`treatment-other-${column.id}`} className="flex items-center gap-2 cursor-pointer">
                    {getColumnTypeEmoji(column.data_type)} {column.column_name}
                    <Badge variant="outline" className="ml-2">
                      {column.unique_count} unique values
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Control Variables */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              🛡️ Control Variables (Optional but Recommended)
            </label>
            <p className="text-sm text-gray-600">
              These help us account for other factors (like age, gender, or health history) to make sure 
              we find the real cause, not just coincidences!
            </p>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {datasetDetails.columns
                .filter((col: ColumnInfo) => 
                  col.column_name !== formData.target_variable && 
                  !formData.treatment_variables.includes(col.column_name)
                )
                .map((column: ColumnInfo) => (
                <div key={column.id} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Checkbox
                    id={`control-${column.id}`}
                    checked={formData.control_variables.includes(column.column_name)}
                    onCheckedChange={(checked) =>
                      handleControlVariableToggle(column.column_name, checked as boolean)
                    }
                  />
                  <label htmlFor={`control-${column.id}`} className="flex items-center gap-2 cursor-pointer">
                    <Shield className="h-4 w-4 text-green-500" />
                    {getColumnTypeEmoji(column.data_type)} {column.column_name}
                    <Badge variant="outline" className="ml-2">
                      {column.unique_count} unique
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              🔬 Choose Your AI Method
            </label>
            <Select
              value={formData.method || 'doubleml'}
              onValueChange={(value) =>
                setFormData((prev: CreateAnalysisInput) => ({ 
                  ...prev, 
                  method: value as CreateAnalysisInput['method']
                }))
              }
            >
              <SelectTrigger className="border-purple-200 focus:border-purple-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doubleml">🎯 DoubleML - Double-Check Detective</SelectItem>
                <SelectItem value="causalml">🔍 CausalML - Smart Learner</SelectItem>
                <SelectItem value="econml">📊 EconML - Economics Expert</SelectItem>
                <SelectItem value="pywhy">🤔 PyWhy - The Philosopher</SelectItem>
              </SelectContent>
            </Select>
            
            <Alert className="border-indigo-200 bg-indigo-50">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              <AlertDescription className="text-indigo-800">
                {getMethodDescription(formData.method)}
              </AlertDescription>
            </Alert>
          </div>

          {/* Summary */}
          {formData.target_variable && formData.treatment_variables.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <Brain className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>🎯 Analysis Summary:</strong><br />
                We'll discover if <strong>{formData.treatment_variables.join(', ')}</strong> really causes 
                changes in <strong>{formData.target_variable}</strong>, while controlling for{' '}
                {formData.control_variables.length > 0 
                  ? formData.control_variables.join(', ')
                  : 'no additional factors'
                }.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !formData.name || !formData.target_variable || formData.treatment_variables.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {isLoading ? (
              <>🔄 Creating Analysis...</>
            ) : (
              <>🚀 Start Causal Discovery!</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
