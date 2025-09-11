import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();

    if (!bookingData.tenantId || !bookingData.serviceId || !bookingData.date || !bookingData.time) {
      return NextResponse.json({ error: 'Missing required booking information' }, { status: 400 });
    }

    // Create booking through the booking system
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/booking/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify(bookingData),
    });

    if (response.ok) {
      const booking = await response.json();
      return NextResponse.json(booking);
    } else {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: response.status });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}