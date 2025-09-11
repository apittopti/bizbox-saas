import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Fetch categories from the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/categories?tenantId=${tenantId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const categories = await response.json();
      return NextResponse.json(categories);
    } else {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}