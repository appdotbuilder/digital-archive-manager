
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { UserManagement } from '@/components/UserManagement';
import { ArchiveManagement } from '@/components/ArchiveManagement';
import { AdminDashboard } from '@/components/AdminDashboard';
import { CategoryManagement } from '@/components/CategoryManagement';
import { AccessLogsView } from '@/components/AccessLogsView';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for stored auth token on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    if (storedToken && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        // Clear invalid stored data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trpc.login.mutate({ email, password });
      setCurrentUser(response.user);
      
      // Store auth data
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">📚 Digital Archive</CardTitle>
            <CardDescription>Sign in to access your archives</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <LoginForm onLogin={handleLogin} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">📚 Digital Archive</h1>
              <Badge variant="secondary" className="ml-3">
                {isAdmin ? '👑 Administrator' : '👤 User'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {currentUser.first_name} {currentUser.last_name}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="archives" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="archives">📁 Archives</TabsTrigger>
            <TabsTrigger value="categories">🏷️ Categories</TabsTrigger>
            {isAdmin && <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">👥 Users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="logs">📋 Access Logs</TabsTrigger>}
            <TabsTrigger value="profile">⚙️ Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="archives" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Archive Management</h2>
              <p className="text-gray-600">Upload, organize, and manage your digital archives</p>
            </div>
            <Separator />
            <ArchiveManagement currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Management</h2>
              <p className="text-gray-600">Organize your archives with custom categories</p>
            </div>
            <Separator />
            <CategoryManagement />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="dashboard" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
                <p className="text-gray-600">System overview and statistics</p>
              </div>
              <Separator />
              <AdminDashboard />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
                <p className="text-gray-600">Manage system users and permissions</p>
              </div>
              <Separator />
              <UserManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="logs" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Logs</h2>
                <p className="text-gray-600">Monitor system activity and user actions</p>
              </div>
              <Separator />
              <AccessLogsView />
            </TabsContent>
          )}

          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h2>
              <p className="text-gray-600">Manage your account information</p>
            </div>
            <Separator />
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <Input value={currentUser.first_name} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <Input value={currentUser.last_name} disabled />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={currentUser.email} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Input value={currentUser.role} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Account Status</label>
                  <Input value={currentUser.is_active ? 'Active' : 'Inactive'} disabled />
                </div>
                <Alert>
                  <AlertDescription>
                    Profile editing is not yet implemented. Contact an administrator to update your information.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
