import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const checkoutData = await request.json();

    if (!checkoutData.tenantId || !checkoutData.items || checkoutData.items.length === 0) {
      return NextResponse.json({ error: 'Invalid checkout data' }, { status: 400 });
    }

    // Process checkout through the payment system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/checkout/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify(checkoutData),
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: response.status });
    }
  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}