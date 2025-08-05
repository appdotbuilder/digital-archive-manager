
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../server/src/schema';

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create category form state
  const [createFormData, setCreateFormData] = useState<CreateCategoryInput>({
    name: '',
    description: null
  });

  // Update category form state
  const [updateFormData, setUpdateFormData] = useState<Partial<UpdateCategoryInput>>({});

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCategories.query();
      setCategories(result);
      setError(null);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newCategory = await trpc.createCategory.mutate(createFormData);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setCreateFormData({
        name: '',
        description: null
      });
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    setIsUpdating(true);
    try {
      const updatedCategory = await trpc.updateCategory.mutate({
        id: editingCategory.id,
        ...updateFormData
      } as UpdateCategoryInput);
      setCategories((prev: Category[]) => 
        prev.map((category: Category) => category.id === editingCategory.id ? updatedCategory : category)
      );
      setEditingCategory(null);
      setUpdateFormData({});
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? Archives in this category will be uncategorized.')) return;
    
    try {
      await trpc.deleteCategory.mutate({ categoryId });
      setCategories((prev: Category[]) => prev.filter((category: Category) => category.id !== categoryId));
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setUpdateFormData({
      name: category.name,
      description: category.description
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Note about stub implementation */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-700">
          🏷️ Category management is currently using stub implementation. Real category operations will be available when the backend handlers are fully implemented.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Category Management Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize your archives with custom categories</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>🏷️ Add Category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>Add a new category to organize your archives</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCategory}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        value={createFormData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter category name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={createFormData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCreateFormData(prev => ({ 
                            ...prev, 
                            description: e.target.value || null 
                          }))
                        }
                        placeholder="Enter category description"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Category'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">🏷️</p>
              <p>No categories found. Create your first category above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: Category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-xs">
                      {category.description ? (
                        <span className="text-sm text-gray-600">{category.description}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No description</span>
                      )}
                    </TableCell>
                    <TableCell>{category.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>{category.updated_at.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEditCategory(category)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleUpdateCategory}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Category Name</Label>
                  <Input
                    id="edit_name"
                    value={updateFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description (Optional)</Label>
                  <Textarea
                    id="edit_description"
                    value={updateFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUpdateFormData(prev => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Enter category description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Category'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
