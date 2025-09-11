import { AuditLogDashboard } from '@/components/security/audit-log';

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Compliance</h1>
        <p className="text-muted-foreground">
          Monitor security events, manage admin access, and maintain compliance audit trails.
        </p>
      </div>

      <AuditLogDashboard />
    </div>
  );
}