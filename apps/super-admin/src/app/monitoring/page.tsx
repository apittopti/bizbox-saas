import { SystemHealthDashboard } from '@/components/monitoring/system-health';

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor platform health, performance metrics, and system alerts in real-time.
        </p>
      </div>

      <SystemHealthDashboard />
    </div>
  );
}