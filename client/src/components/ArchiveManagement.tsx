
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Archive, Category, User, CreateArchiveInput, SearchArchivesInput, ArchiveFileType } from '../../../server/src/schema';

interface ArchiveManagementProps {
  currentUser: User;
}

export function ArchiveManagement({ currentUser }: ArchiveManagementProps) {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');

  // Upload form state  
  const [uploadFormData, setUploadFormData] = useState<Omit<CreateArchiveInput, 'uploaded_by'>>({
    title: '',
    description: null,
    file_name: '',
    file_path: '',
    file_type: 'other',
    file_size: 0,
    category_id: null
  });

  const loadArchives = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getArchives.query();
      setArchives(result);
      setError(null);
    } catch (err) {
      setError('Failed to load archives');
      console.error('Failed to load archives:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadArchives();
    loadCategories();
  }, [loadArchives, loadCategories]);

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const searchInput: SearchArchivesInput = {
        query: searchQuery || undefined,
        category_id: selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
        file_type: selectedFileType !== 'all' ? selectedFileType as ArchiveFileType : undefined,
        limit: 50,
        offset: 0
      };
      const result = await trpc.searchArchives.query(searchInput);
      setArchives(result);
    } catch (err) {
      setError('Failed to search archives');
      console.error('Failed to search archives:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      // In a real implementation, this would handle file upload
      // For now, we'll create a stub archive entry
      const newArchive = await trpc.createArchive.mutate({
        ...uploadFormData,
        uploaded_by: currentUser.id
      });
      setArchives((prev: Archive[]) => [newArchive, ...prev]);
      setUploadFormData({
        title: '',
        description: null,
        file_name: '',
        file_path: '',
        file_type: 'other',
        file_size: 0,
        category_id: null
      });
      setIsUploadDialogOpen(false);
    } catch (err) {
      console.error('Failed to upload archive:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteArchive = async (archiveId: number) => {
    if (!confirm('Are you sure you want to delete this archive?')) return;
    
    try {
      await trpc.deleteArchive.mutate({ archiveId });
      setArchives((prev: Archive[]) => prev.filter((archive: Archive) => archive.id !== archiveId));
    } catch (err) {
      console.error('Failed to delete archive:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: ArchiveFileType): string => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      default: return '📎';
    }
  };

  return (
    <div className="space-y-6">
      {/* Note about stub implementation */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-700">
          📁 Archive management is currently using stub implementation. Real file upload and storage will be available when the backend handlers are fully implemented.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Archive Management</CardTitle>
              <CardDescription>Upload, search, and organize your digital archives</CardDescription>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>📤 Upload Archive</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Archive</DialogTitle>
                  <DialogDescription>Add a new file to your digital archive</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={uploadFormData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Enter archive title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={uploadFormData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setUploadFormData(prev => ({ 
                            ...prev, 
                            description: e.target.value || null 
                          }))
                        }
                        placeholder="Enter archive description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="file_name">File Name</Label>
                        <Input
                          id="file_name"
                          value={uploadFormData.file_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUploadFormData(prev => ({ ...prev, file_name: e.target.value }))
                          }
                          placeholder="example.pdf"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file_type">File Type</Label>
                        <Select 
                          value={uploadFormData.file_type} 
                          onValueChange={(value: ArchiveFileType) => 
                            setUploadFormData(prev => ({ ...prev, file_type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select file type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">📄 PDF</SelectItem>
                            <SelectItem value="docx">📝 DOCX</SelectItem>
                            <SelectItem value="jpg">🖼️ JPG</SelectItem>
                            <SelectItem value="jpeg">🖼️ JPEG</SelectItem>
                            <SelectItem value="png">🖼️ PNG</SelectItem>
                            <SelectItem value="gif">🖼️ GIF</SelectItem>
                            <SelectItem value="other">📎 Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="file_size">File Size (bytes)</Label>
                        <Input
                          id="file_size"
                          type="number"
                          value={uploadFormData.file_size}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUploadFormData(prev => ({ ...prev, file_size: parseInt(e.target.value) || 0 }))
                          }
                          placeholder="1024"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category (Optional)</Label>
                        <Select 
                          value={uploadFormData.category_id?.toString() || 'none'} 
                          onValueChange={(value: string) => 
                            setUploadFormData(prev => ({ 
                              ...prev, 
                              category_id: value !== 'none' ? parseInt(value) : null 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((category: Category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file_path">File Path (Stub)</Label>
                      <Input
                        id="file_path"
                        value={uploadFormData.file_path}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, file_path: e.target.value }))
                        }
                        placeholder="/uploads/documents/example.pdf"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        In a real implementation, this would be automatically generated during file upload.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload Archive'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search Archives</Label>
              <Input
                id="search"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_filter">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_filter">File Type</Label>
              <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">📄 PDF</SelectItem>
                  <SelectItem value="docx">📝 DOCX</SelectItem>
                  <SelectItem value="jpg">🖼️ JPG</SelectItem>
                  <SelectItem value="jpeg">🖼️ JPEG</SelectItem>
                  <SelectItem value="png">🖼️ PNG</SelectItem>
                  <SelectItem value="gif">🖼️ GIF</SelectItem>
                  <SelectItem value="other">📎 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                🔍 Search
              </Button>
            </div>
          </div>

          {/* Archives Table */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : archives.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">📁</p>
              <p>No archives found. Upload your first archive above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((archive: Archive) => (
                  <TableRow key={archive.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileTypeIcon(archive.file_type)}</span>
                        <span className="text-sm">{archive.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{archive.title}</p>
                        {archive.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {archive.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {archive.file_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(archive.file_size)}</TableCell>
                    <TableCell>
                      {archive.category_id ? (
                        <Badge variant="outline">
                          {categories.find((c: Category) => c.id === archive.category_id)?.name || 'Unknown'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>{archive.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          👁️ View
                        </Button>
                        <Button variant="outline" size="sm">
                          📥 Download
                        </Button>
                        {(currentUser.role === 'admin' || archive.uploaded_by === currentUser.id) && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteArchive(archive.id)}
                          >
                            🗑️ Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
