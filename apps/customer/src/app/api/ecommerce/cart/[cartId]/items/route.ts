import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const { cartId } = params;
    const itemData = await request.json();

    if (!itemData.productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Add item to cart through the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart/${cartId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify(itemData),
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to add item to cart' }, { status: response.status });
    }
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}