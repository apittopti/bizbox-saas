import { NextRequest, NextResponse } from 'next/server'

// Mock data for demonstration - in a real app, this would come from the database
const mockBookings = [
  {
    id: '1',
    customerId: 'cust-1',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    customerPhone: '07123 456789',
    serviceId: 'svc-1',
    serviceName: 'Full Car Wash',
    staffId: 'staff-1',
    staffName: 'Mike Johnson',
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T11:00:00Z',
    status: 'confirmed' as const,
    notes: 'Customer requested extra attention to wheels',
    price: 2500, // £25.00 in pence
    createdAt: '2024-01-10T09:00:00Z'
  },
  {
    id: '2',
    customerId: 'cust-2',
    customerName: 'Sarah Wilson',
    customerEmail: 'sarah@example.com',
    customerPhone: '07987 654321',
    serviceId: 'svc-2',
    serviceName: 'Interior Detail',
    staffId: 'staff-2',
    staffName: 'Emma Davis',
    startTime: '2024-01-15T14:00:00Z',
    endTime: '2024-01-15T16:00:00Z',
    status: 'pending' as const,
    notes: '',
    price: 4500, // £45.00 in pence
    createdAt: '2024-01-12T11:30:00Z'
  },
  {
    id: '3',
    customerId: 'cust-3',
    customerName: 'David Brown',
    customerEmail: 'david@example.com',
    customerPhone: '07555 123456',
    serviceId: 'svc-1',
    serviceName: 'Full Car Wash',
    staffId: 'staff-1',
    staffName: 'Mike Johnson',
    startTime: '2024-01-16T09:00:00Z',
    endTime: '2024-01-16T10:00:00Z',
    status: 'completed' as const,
    notes: 'Regular customer',
    price: 2500, // £25.00 in pence
    createdAt: '2024-01-14T16:20:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    // In a real application, you would:
    // 1. Get the tenant ID from the session/auth
    // 2. Query the database for bookings belonging to this tenant
    // 3. Apply any filters from query parameters
    
    return NextResponse.json({
      success: true,
      bookings: mockBookings
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json()
    
    // In a real application, you would:
    // 1. Validate the booking data
    // 2. Check for conflicts with existing bookings
    // 3. Verify staff availability
    // 4. Save to database with tenant isolation
    // 5. Send confirmation emails
    
    const newBooking = {
      id: `booking-${Date.now()}`,
      ...bookingData,
      createdAt: new Date().toISOString()
    }
    
    // Add to mock data (in real app, save to database)
    mockBookings.push(newBooking)
    
    return NextResponse.json({
      success: true,
      booking: newBooking
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}