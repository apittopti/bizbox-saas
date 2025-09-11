import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Create new cart through the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({ tenantId }),
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else {
      return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}