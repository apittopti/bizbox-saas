import { NextRequest, NextResponse } from 'next/server'

// Mock analytics data for demonstration
const generateMockAnalytics = (dateRange: string) => {
  const now = new Date()
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
  
  // Generate daily data
  const byDay = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    byDay.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10) + 1,
      amount: Math.floor(Math.random() * 50000) + 10000 // £100-£500 in pence
    })
  }

  // Generate hourly data (8 AM to 8 PM)
  const byHour = []
  for (let hour = 8; hour <= 20; hour++) {
    byHour.push({
      hour,
      count: Math.floor(Math.random() * 8) + 1
    })
  }

  // Generate monthly data for yearly view
  const byMonth = []
  if (dateRange === '1y') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months.forEach(month => {
      byMonth.push({
        month,
        count: Math.floor(Math.random() * 100) + 20,
        amount: Math.floor(Math.random() * 500000) + 100000
      })
    })
  }

  const totalBookings = byDay.reduce((sum, day) => sum + day.count, 0)
  const totalRevenue = byDay.reduce((sum, day) => sum + day.amount, 0)

  return {
    overview: {
      totalBookings,
      totalRevenue,
      averageBookingValue: totalBookings > 0 ? Math.floor(totalRevenue / totalBookings) : 0,
      customerRetentionRate: 72.5,
      bookingGrowth: Math.random() * 20 - 5, // -5% to +15%
      revenueGrowth: Math.random() * 25 - 5  // -5% to +20%
    },
    bookings: {
      byStatus: [
        { status: 'confirmed', count: Math.floor(totalBookings * 0.6) },
        { status: 'pending', count: Math.floor(totalBookings * 0.2) },
        { status: 'completed', count: Math.floor(totalBookings * 0.15) },
        { status: 'cancelled', count: Math.floor(totalBookings * 0.05) }
      ],
      byDay: byDay.map(d => ({ date: d.date, count: d.count })),
      byHour,
      byMonth: byMonth.map(m => ({ month: m.month, count: m.count }))
    },
    revenue: {
      byDay: byDay.map(d => ({ date: d.date, amount: d.amount })),
      byMonth: byMonth.map(m => ({ month: m.month, amount: m.amount })),
      byService: [
        { serviceName: 'Full Car Wash', amount: Math.floor(totalRevenue * 0.4), count: Math.floor(totalBookings * 0.5) },
        { serviceName: 'Interior Detail', amount: Math.floor(totalRevenue * 0.3), count: Math.floor(totalBookings * 0.25) },
        { serviceName: 'Exterior Wax', amount: Math.floor(totalRevenue * 0.2), count: Math.floor(totalBookings * 0.15) },
        { serviceName: 'Engine Clean', amount: Math.floor(totalRevenue * 0.1), count: Math.floor(totalBookings * 0.1) }
      ],
      byStaff: [
        { staffName: 'Mike Johnson', amount: Math.floor(totalRevenue * 0.35), count: Math.floor(totalBookings * 0.4) },
        { staffName: 'Emma Davis', amount: Math.floor(totalRevenue * 0.30), count: Math.floor(totalBookings * 0.35) },
        { staffName: 'Tom Wilson', amount: Math.floor(totalRevenue * 0.25), count: Math.floor(totalBookings * 0.15) },
        { staffName: 'Sarah Brown', amount: Math.floor(totalRevenue * 0.10), count: Math.floor(totalBookings * 0.1) }
      ]
    },
    staff: [
      {
        id: 'staff-1',
        name: 'Mike Johnson',
        totalBookings: Math.floor(totalBookings * 0.4),
        totalRevenue: Math.floor(totalRevenue * 0.35),
        averageRating: 4.8,
        utilizationRate: 85.2
      },
      {
        id: 'staff-2',
        name: 'Emma Davis',
        totalBookings: Math.floor(totalBookings * 0.35),
        totalRevenue: Math.floor(totalRevenue * 0.30),
        averageRating: 4.6,
        utilizationRate: 78.5
      },
      {
        id: 'staff-3',
        name: 'Tom Wilson',
        totalBookings: Math.floor(totalBookings * 0.15),
        totalRevenue: Math.floor(totalRevenue * 0.25),
        averageRating: 4.4,
        utilizationRate: 65.3
      },
      {
        id: 'staff-4',
        name: 'Sarah Brown',
        totalBookings: Math.floor(totalBookings * 0.1),
        totalRevenue: Math.floor(totalRevenue * 0.10),
        averageRating: 4.2,
        utilizationRate: 55.8
      }
    ],
    services: [
      {
        id: 'svc-1',
        name: 'Full Car Wash',
        totalBookings: Math.floor(totalBookings * 0.5),
        totalRevenue: Math.floor(totalRevenue * 0.4),
        averageRating: 4.7,
        conversionRate: 82.5
      },
      {
        id: 'svc-2',
        name: 'Interior Detail',
        totalBookings: Math.floor(totalBookings * 0.25),
        totalRevenue: Math.floor(totalRevenue * 0.3),
        averageRating: 4.5,
        conversionRate: 75.2
      },
      {
        id: 'svc-3',
        name: 'Exterior Wax',
        totalBookings: Math.floor(totalBookings * 0.15),
        totalRevenue: Math.floor(totalRevenue * 0.2),
        averageRating: 4.3,
        conversionRate: 68.8
      },
      {
        id: 'svc-4',
        name: 'Engine Clean',
        totalBookings: Math.floor(totalBookings * 0.1),
        totalRevenue: Math.floor(totalRevenue * 0.1),
        averageRating: 4.1,
        conversionRate: 62.4
      }
    ],
    customers: {
      totalCustomers: Math.floor(totalBookings * 0.7), // Some customers have multiple bookings
      newCustomers: Math.floor(totalBookings * 0.4),
      returningCustomers: Math.floor(totalBookings * 0.3),
      topCustomers: [
        { name: 'John Smith', email: 'john@example.com', totalBookings: 8, totalSpent: 20000 },
        { name: 'Sarah Wilson', email: 'sarah@example.com', totalBookings: 6, totalSpent: 15000 },
        { name: 'David Brown', email: 'david@example.com', totalBookings: 5, totalSpent: 12500 },
        { name: 'Lisa Johnson', email: 'lisa@example.com', totalBookings: 4, totalSpent: 10000 },
        { name: 'Mark Davis', email: 'mark@example.com', totalBookings: 3, totalSpent: 7500 }
      ]
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || '30d'
    
    // In a real application, you would:
    // 1. Get the tenant ID from the session/auth
    // 2. Query the database for analytics data with proper tenant isolation
    // 3. Calculate metrics based on actual booking and revenue data
    // 4. Apply date range filters
    
    const analyticsData = generateMockAnalytics(dateRange)
    
    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}