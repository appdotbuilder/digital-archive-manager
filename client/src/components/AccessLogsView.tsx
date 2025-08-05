
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { AccessLog } from '../../../server/src/schema';

export function AccessLogsView() {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const loadAccessLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getAccessLogs.query();
      setAccessLogs(result);
      setError(null);
    } catch (err) {
      setError('Failed to load access logs');
      console.error('Failed to load access logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccessLogs();
  }, [loadAccessLogs]);

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'view': return '👁️';
      case 'download': return '📥';
      case 'upload': return '📤';
      case 'delete': return '🗑️';
      default: return '📋';
    }
  };

  const getActionColor = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (action) {
      case 'view': return 'secondary';
      case 'download': return 'outline';
      case 'upload': return 'default';
      case 'delete': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredLogs = accessLogs.filter((log: AccessLog) => {
    if (filterType === 'all') return true;
    return log.action === filterType;
  });

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
            {[...Array(5)].map((_, i) => (
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
          📋 Access logs are currently using stub implementation. Real activity tracking will be available when the backend handlers are fully implemented.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Access Logs Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>System Access Logs</CardTitle>
              <CardDescription>Monitor user activity and system interactions</CardDescription>
            </div>
            <div className="w-48">
              <Label htmlFor="action_filter">Filter by Action</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="view">👁️ View</SelectItem>
                  <SelectItem value="download">📥 Download</SelectItem>
                  <SelectItem value="upload">📤 Upload</SelectItem>
                  <SelectItem value="delete">🗑️ Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">📋</p>
              <p>No access logs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Archive ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: AccessLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      User #{log.user_id}
                    </TableCell>
                    <TableCell>
                      Archive #{log.archive_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)} className="capitalize">
                        {getActionIcon(log.action)} {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.ip_address ? (
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {log.ip_address}
                        </code>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {log.user_agent ? (
                        <span className="text-sm text-gray-600 truncate block">
                          {log.user_agent}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{log.created_at.toLocaleDateString()}</div>
                        <div className="text-gray-500">
                          {log.created_at.toLocaleTimeString()}
                        </div>
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
