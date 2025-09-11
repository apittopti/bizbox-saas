import { TenantList } from '@/components/tenants/tenant-list';

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
        <p className="text-muted-foreground">
          Manage all tenant accounts, monitor usage, and control access across the platform.
        </p>
      </div>

      <TenantList />
    </div>
  );
}