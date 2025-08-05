
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, CreateUserInput, UpdateUserInput, UserRole } from '../../../server/src/schema';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create user form state
  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'user'
  });

  // Update user form state
  const [updateFormData, setUpdateFormData] = useState<Partial<UpdateUserInput>>({});

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUsers.query();
      setUsers(result);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newUser = await trpc.createUser.mutate(createFormData);
      setUsers((prev: User[]) => [...prev, newUser]);
      setCreateFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'user'
      });
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create user:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsUpdating(true);
    try {
      const updatedUser = await trpc.updateUser.mutate({
        id: editingUser.id,
        ...updateFormData
      } as UpdateUserInput);
      setUsers((prev: User[]) => 
        prev.map((user: User) => user.id === editingUser.id ? updatedUser : user)
      );
      setEditingUser(null);
      setUpdateFormData({});
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await trpc.deleteUser.mutate({ userId });
      setUsers((prev: User[]) => prev.filter((user: User) => user.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setUpdateFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
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
          👥 User management is currently using stub implementation. Real user operations will be available when the backend handlers are fully implemented.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Create User Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their permissions</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>➕ Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={createFormData.first_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData(prev => ({ ...prev, first_name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={createFormData.last_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData(prev => ({ ...prev, last_name: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={createFormData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData(prev => ({ ...prev, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={createFormData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData(prev => ({ ...prev, password: e.target.value }))
                        }
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={createFormData.role} 
                        onValueChange={(value: UserRole) => 
                          setCreateFormData(prev => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">👤 User</SelectItem>
                          <SelectItem value="admin">👑 Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">👥</p>
              <p>No users found. Create your first user above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? '✅ Active' : '❌ Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEditUser(user)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_first_name">First Name</Label>
                    <Input
                      id="edit_first_name"
                      value={updateFormData.first_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUpdateFormData(prev => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_last_name">Last Name</Label>
                    <Input
                      id="edit_last_name"
                      value={updateFormData.last_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUpdateFormData(prev => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={updateFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData(prev => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_role">Role</Label>
                  <Select 
                    value={updateFormData.role || 'user'} 
                    onValueChange={(value: UserRole) => 
                      setUpdateFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">👤 User</SelectItem>
                      <SelectItem value="admin">👑 Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select 
                    value={updateFormData.is_active !== undefined ? (updateFormData.is_active ? 'true' : 'false') : 'true'} 
                    onValueChange={(value: string) => 
                      setUpdateFormData(prev => ({ ...prev, is_active: value === 'true' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">✅ Active</SelectItem>
                      <SelectItem value="false">❌ Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
