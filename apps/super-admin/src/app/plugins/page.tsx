import { PluginApprovalQueue } from '@/components/plugins/plugin-approval-queue';

export default function PluginsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plugin Marketplace</h1>
        <p className="text-muted-foreground">
          Manage plugin submissions, approvals, and marketplace content.
        </p>
      </div>

      <PluginApprovalQueue />
    </div>
  );
}