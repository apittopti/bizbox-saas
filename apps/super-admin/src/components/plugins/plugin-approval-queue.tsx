'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Check,
  X,
  MessageCircle,
  Shield,
  Star,
  Download,
  AlertTriangle,
  Eye,
  Code,
  FileText,
} from 'lucide-react';
import { formatNumber, getRelativeTime } from '@/lib/utils';
import type { Plugin, SecurityIssue } from '@/types/admin';

// Mock data - replace with real API calls
const mockPendingPlugins: Plugin[] = [
  {
    id: '1',
    name: 'Advanced Analytics Dashboard',
    description: 'Comprehensive analytics and reporting dashboard with real-time data visualization and custom KPI tracking.',
    version: '2.1.0',
    status: 'pending',
    category: 'Analytics',
    developer: {
      id: '1',
      name: 'DataViz Solutions',
      email: 'contact@dataviz.com',
    },
    installations: 0,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    submittedAt: new Date('2024-01-08'),
    lastUpdated: new Date('2024-01-10'),
    securityScan: {
      status: 'passed',
      issues: [],
      lastScanned: new Date('2024-01-09'),
    },
  },
  {
    id: '2',
    name: 'Social Media Integration',
    description: 'Connect and manage multiple social media accounts with automated posting and analytics.',
    version: '1.3.2',
    status: 'pending',
    category: 'Marketing',
    developer: {
      id: '2',
      name: 'SocialTech Inc',
      email: 'dev@socialtech.io',
    },
    installations: 0,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    submittedAt: new Date('2024-01-05'),
    lastUpdated: new Date('2024-01-07'),
    securityScan: {
      status: 'failed',
      issues: [
        {
          id: '1',
          severity: 'medium',
          type: 'Authentication',
          description: 'API keys are stored in plain text',
          file: 'src/auth.js',
          line: 45,
          recommendation: 'Use environment variables or encrypted storage for API keys',
        },
        {
          id: '2',
          severity: 'low',
          type: 'Dependencies',
          description: 'Outdated dependency with known vulnerabilities',
          file: 'package.json',
          recommendation: 'Update lodash to version 4.17.21 or higher',
        },
      ],
      lastScanned: new Date('2024-01-06'),
    },
  },
  {
    id: '3',
    name: 'Invoice Generator Pro',
    description: 'Professional invoice generation with templates, automated billing, and payment tracking.',
    version: '3.0.1',
    status: 'pending',
    category: 'Finance',
    developer: {
      id: '3',
      name: 'BillingSoft',
      email: 'support@billingsoft.com',
    },
    installations: 0,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    submittedAt: new Date('2024-01-12'),
    lastUpdated: new Date('2024-01-12'),
    securityScan: {
      status: 'pending',
      issues: [],
      lastScanned: new Date('2024-01-12'),
    },
  },
];

export function PluginApprovalQueue() {
  const [pendingPlugins, setPendingPlugins] = useState<Plugin[]>(mockPendingPlugins);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async (pluginId: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      console.log(`Approving plugin ${pluginId}`);
      
      setPendingPlugins(prev => prev.filter(plugin => plugin.id !== pluginId));
    } catch (error) {
      console.error('Failed to approve plugin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (pluginId: string, reason: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      console.log(`Rejecting plugin ${pluginId} with reason:`, reason);
      
      setPendingPlugins(prev => prev.filter(plugin => plugin.id !== pluginId));
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject plugin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChanges = async (pluginId: string, feedback: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      console.log(`Requesting changes for plugin ${pluginId} with feedback:`, feedback);
      
      setPendingPlugins(prev =>
        prev.map(plugin =>
          plugin.id === pluginId
            ? { ...plugin, status: 'pending' as const }
            : plugin
        )
      );
    } catch (error) {
      console.error('Failed to request changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityBadge = (status: Plugin['securityScan']['status']) => {
    const config = {
      passed: { variant: 'default' as const, label: 'Passed', icon: Check },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: X },
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Shield },
    };

    const { variant, label, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getSeverityColor = (severity: SecurityIssue['severity']) => {
    const colors = {
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[severity];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plugin Approval Queue</h2>
          <p className="text-muted-foreground">
            Review and approve plugin submissions for the marketplace.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {pendingPlugins.length} Pending
        </Badge>
      </div>

      {pendingPlugins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No plugins pending approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPlugins.map(plugin => (
            <Card key={plugin.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-semibold">{plugin.name}</h3>
                    <Badge variant="outline">{plugin.version}</Badge>
                    <Badge variant="secondary">{plugin.category}</Badge>
                  </div>
                  <p className="text-muted-foreground max-w-2xl">
                    {plugin.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>By {plugin.developer.name}</span>
                    <span>•</span>
                    <span>Submitted {getRelativeTime(plugin.submittedAt)}</span>
                    <span>•</span>
                    <span>Last updated {getRelativeTime(plugin.lastUpdated)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getSecurityBadge(plugin.securityScan.status)}
                </div>
              </div>

              {/* Security Issues */}
              {plugin.securityScan.issues.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Security Issues Found</span>
                  </div>
                  <div className="space-y-2">
                    {plugin.securityScan.issues.slice(0, 2).map(issue => (
                      <div key={issue.id} className="border rounded-lg p-3 bg-muted/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={getSeverityColor(issue.severity)}
                            >
                              {issue.severity}
                            </Badge>
                            <span className="text-sm font-medium">{issue.type}</span>
                          </div>
                          {issue.file && (
                            <span className="text-xs text-muted-foreground">
                              {issue.file}{issue.line && `:${issue.line}`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-blue-600">
                          {issue.recommendation}
                        </p>
                      </div>
                    ))}
                    {plugin.securityScan.issues.length > 2 && (
                      <Button variant="outline" size="sm">
                        View all {plugin.securityScan.issues.length} issues
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{plugin.name} v{plugin.version}</DialogTitle>
                        <DialogDescription>
                          Plugin details and code review
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground">{plugin.description}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Developer</h4>
                          <div className="text-sm">
                            <p>{plugin.developer.name}</p>
                            <p className="text-muted-foreground">{plugin.developer.email}</p>
                          </div>
                        </div>
                        {/* Add more plugin details here */}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="sm">
                    <Code className="h-4 w-4 mr-2" />
                    View Code
                  </Button>

                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Documentation
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Request Changes */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isLoading}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Changes</DialogTitle>
                        <DialogDescription>
                          Provide feedback to the developer about what needs to be changed.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Explain what changes are needed..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => handleRequestChanges(plugin.id, rejectionReason)}
                          disabled={!rejectionReason.trim() || isLoading}
                        >
                          Send Feedback
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Reject */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isLoading}>
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Plugin</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently reject the plugin submission. The developer will be notified.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Provide a reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRejectionReason('')}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReject(plugin.id, rejectionReason)}
                          disabled={!rejectionReason.trim()}
                        >
                          Reject Plugin
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Approve */}
                  <Button
                    onClick={() => handleApprove(plugin.id)}
                    disabled={plugin.securityScan.status === 'failed' || isLoading}
                    size="sm"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}