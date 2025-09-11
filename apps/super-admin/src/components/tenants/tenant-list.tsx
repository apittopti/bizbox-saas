'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  Pause,
  Play,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatNumber, getStatusColor, getRelativeTime } from '@/lib/utils';
import type { Tenant, TenantFilters } from '@/types/admin';

// Mock data - replace with real API calls
const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    domain: 'acme-corp',
    customDomain: 'app.acmecorp.com',
    status: 'active',
    plan: 'enterprise',
    createdAt: new Date('2023-01-15'),
    lastActive: new Date('2024-01-10'),
    userCount: 145,
    monthlyRevenue: 4500,
    storageUsed: 2048,
    owner: {
      id: '1',
      email: 'admin@acmecorp.com',
      name: 'John Smith',
    },
  },
  {
    id: '2',
    name: 'TechStart Inc',
    domain: 'techstart',
    status: 'active',
    plan: 'professional',
    createdAt: new Date('2023-03-22'),
    lastActive: new Date('2024-01-11'),
    userCount: 32,
    monthlyRevenue: 890,
    storageUsed: 512,
    owner: {
      id: '2',
      email: 'ceo@techstart.io',
      name: 'Sarah Johnson',
    },
  },
  {
    id: '3',
    name: 'Local Business',
    domain: 'local-biz',
    status: 'suspended',
    plan: 'starter',
    createdAt: new Date('2023-08-10'),
    lastActive: new Date('2023-12-15'),
    userCount: 8,
    monthlyRevenue: 0,
    storageUsed: 128,
    owner: {
      id: '3',
      email: 'owner@localbiz.com',
      name: 'Mike Wilson',
    },
  },
];

interface TenantListProps {
  className?: string;
}

export function TenantList({ className }: TenantListProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>(mockTenants);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<TenantFilters>({
    search: '',
    status: '',
    plan: '',
  });

  // Filter tenants based on current filters
  useEffect(() => {
    let filtered = tenants;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        tenant =>
          tenant.name.toLowerCase().includes(searchTerm) ||
          tenant.domain.toLowerCase().includes(searchTerm) ||
          tenant.owner.email.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(tenant => tenant.status === filters.status);
    }

    if (filters.plan) {
      filtered = filtered.filter(tenant => tenant.plan === filters.plan);
    }

    setFilteredTenants(filtered);
  }, [tenants, filters]);

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      console.log(`Changing tenant ${tenantId} status to ${newStatus}`);
      
      // Update local state
      setTenants(prev =>
        prev.map(tenant =>
          tenant.id === tenantId
            ? { ...tenant, status: newStatus as Tenant['status'] }
            : tenant
        )
      );
    } catch (error) {
      console.error('Failed to update tenant status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Tenant['status']) => {
    const config = {
      active: { variant: 'default' as const, label: 'Active' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      terminated: { variant: 'outline' as const, label: 'Terminated' },
    };

    const { variant, label } = config[status];
    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    );
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    const config = {
      starter: { variant: 'outline' as const, label: 'Starter' },
      professional: { variant: 'secondary' as const, label: 'Professional' },
      enterprise: { variant: 'default' as const, label: 'Enterprise' },
      custom: { variant: 'destructive' as const, label: 'Custom' },
    };

    const { variant, label } = config[plan];
    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={filters.search}
            onChange={e =>
              setFilters(prev => ({ ...prev, search: e.target.value }))
            }
            className="pl-8"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={value =>
            setFilters(prev => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.plan}
          onValueChange={value =>
            setFilters(prev => ({ ...prev, plan: value }))
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map(tenant => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tenant.customDomain || `${tenant.domain}.bizbox.app`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenant.owner.name} • {tenant.owner.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                <TableCell>{getPlanBadge(tenant.plan)}</TableCell>
                <TableCell>{formatNumber(tenant.userCount)}</TableCell>
                <TableCell>{formatCurrency(tenant.monthlyRevenue)}</TableCell>
                <TableCell>{getRelativeTime(tenant.lastActive)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={isLoading}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => router.push(`/tenants/${tenant.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(`https://${tenant.customDomain || `${tenant.domain}.bizbox.app`}`, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Site
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(tenant.id, 'suspended')}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(tenant.id, 'active')}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Manage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredTenants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tenants found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredTenants.length} of {tenants.length} tenant(s)
        </p>
        <div className="space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}