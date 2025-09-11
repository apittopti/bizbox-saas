import { PlatformOverview } from '@/components/dashboard/platform-overview';

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage the entire BizBox platform from this central control panel.
        </p>
      </div>

      <PlatformOverview />
    </div>
  );
}