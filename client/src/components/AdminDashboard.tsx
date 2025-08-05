
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { DashboardStats } from '../../../server/src/schema';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getDashboardStats.query();
      setStats(result);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>No statistics available</AlertDescription>
      </Alert>
    );
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Note about stub implementation */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-700">
          📊 Dashboard data is currently using stub implementation. Real statistics will be available when the backend handlers are fully implemented.
        </AlertDescription>
      </Alert>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.total_users}</div>
            <p className="text-xs text-blue-600 mt-1">Registered system users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Archives</CardTitle>
            <span className="text-2xl">📁</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.total_archives}</div>
            <p className="text-xs text-green-600 mt-1">Files in the system</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Categories</CardTitle>
            <span className="text-2xl">🏷️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.total_categories}</div>
            <p className="text-xs text-purple-600 mt-1">Organization categories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Recent Uploads</CardTitle>
            <span className="text-2xl">📤</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.recent_uploads}</div>
            <p className="text-xs text-orange-600 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Recent Access</CardTitle>
            <span className="text-2xl">👀</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.recent_accesses}</div>
            <p className="text-xs text-red-600 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Storage Used</CardTitle>
            <span className="text-2xl">💾</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatFileSize(stats.storage_used)}</div>
            <p className="text-xs text-gray-600 mt-1">Total disk usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Current system status and health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ✅ System Online
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              🔄 Database Connected
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              📡 API Responsive
            </Badge>
            {stats.total_users > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                👥 {stats.total_users} Active Users
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
