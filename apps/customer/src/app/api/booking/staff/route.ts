import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Fetch staff from the tenant's API
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/staff`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const staff = await response.json();
      return NextResponse.json(staff);
    } else {
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}