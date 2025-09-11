import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { cartId: string; itemId: string } }
) {
  try {
    const { cartId, itemId } = params;
    const updateData = await request.json();

    // Update cart item through the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart/${cartId}/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to update cart item' }, { status: response.status });
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cartId: string; itemId: string } }
) {
  try {
    const { cartId, itemId } = params;

    // Remove item from cart through the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const cart = await response.json();
      return NextResponse.json(cart);
    } else {
      return NextResponse.json({ error: 'Failed to remove item from cart' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}