import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Build query parameters for product filtering
    const params = new URLSearchParams();
    params.set('tenantId', tenantId);
    
    // Add filter parameters
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy');
    const includeOutOfStock = searchParams.get('includeOutOfStock');

    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sortBy) params.set('sortBy', sortBy);
    if (includeOutOfStock) params.set('includeOutOfStock', includeOutOfStock);

    // Fetch products from the e-commerce system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/ecommerce/products?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const products = await response.json();
      return NextResponse.json(products);
    } else {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}