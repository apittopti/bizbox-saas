import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const { cartId } = params;

    // Fetch cart from the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart/${cartId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else if (response.status === 404) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const { cartId } = params;

    // Clear cart through the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart/${cartId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else {
      return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}