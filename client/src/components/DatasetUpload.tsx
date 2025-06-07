
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileUp, Upload, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Dataset, UploadDatasetInput } from '../../../server/src/schema';

interface DatasetUploadProps {
  onDatasetUploaded: (dataset: Dataset) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function DatasetUpload({ onDatasetUploaded, isLoading, setIsLoading }: DatasetUploadProps) {
  const [formData, setFormData] = useState<Omit<UploadDatasetInput, 'file_data'>>({
    name: '',
    description: null,
    file_name: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData((prev: Omit<UploadDatasetInput, 'file_data'>) => ({
        ...prev,
        file_name: file.name,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '') // Remove extension for default name
      }));
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setUploadProgress(0);
    setSuccess(false);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const fileData = await convertFileToBase64(selectedFile);
      
      const uploadData: UploadDatasetInput = {
        ...formData,
        file_data: fileData
      };

      const result = await trpc.uploadDataset.mutate(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Show success state
      setSuccess(true);
      onDatasetUploaded(result);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: '',
          description: null,
          file_name: ''
        });
        setSelectedFile(null);
        setUploadProgress(0);
        setSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to upload dataset:', error);
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            🎉 Upload Successful!
          </h3>
          <p className="text-green-700">
            Your healthcare data is now being processed by our AI. 
            Soon you'll be able to discover amazing insights! ✨
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <FileUp className="h-5 w-5" />
          📊 Upload Healthcare Dataset
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              📄 Choose Your CSV File
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-blue-500" />
                  <p className="mb-2 text-sm text-blue-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-blue-500">CSV files only</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            </div>
            {selectedFile && (
              <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                📁 Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Dataset Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              🏷️ Dataset Name
            </label>
            <Input
              placeholder="e.g., Patient Treatment Outcomes 2024"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: Omit<UploadDatasetInput, 'file_data'>) => ({ 
                  ...prev, 
                  name: e.target.value 
                }))
              }
              className="border-blue-200 focus:border-blue-400"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              📝 Description (Optional)
            </label>
            <Textarea
              placeholder="Describe your dataset... What kind of patients? What treatments? What outcomes did you measure?"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: Omit<UploadDatasetInput, 'file_data'>) => ({
                  ...prev,
                  description: e.target.value || null
                }))
              }
              className="border-blue-200 focus:border-blue-400"
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-700">
                <span>🚀 Uploading your data...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <FileUp className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              💡 <strong>Pro Tip:</strong> Make sure your CSV has columns for treatments (what was given to patients), 
              outcomes (what happened), and other patient characteristics. Our AI will help identify 
              which columns to use for causal analysis!
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {isLoading ? (
              <>🔄 Processing...</>
            ) : (
              <>🚀 Upload & Start Processing</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
