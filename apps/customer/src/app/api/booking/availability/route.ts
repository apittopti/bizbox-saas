import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');

    if (!tenantId || !serviceId || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch availability from the booking system
    const params = new URLSearchParams({
      tenantId,
      serviceId,
      date,
      ...(staffId && { staffId }),
    });

    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/booking/availability?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      const availability = await response.json();
      return NextResponse.json(availability);
    } else {
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}