import { TenantDetails } from '@/components/tenants/tenant-details';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TenantPageProps {
  params: {
    id: string;
  };
}

export default function TenantPage({ params }: TenantPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/tenants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenants
          </Button>
        </Link>
      </div>

      <TenantDetails tenantId={params.id} />
    </div>
  );
}