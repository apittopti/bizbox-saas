"use client"

import { useState, useEffect } from 'react'
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  Card,
  Button,
  Input,
  Select
} from '@bizbox/shared-ui'
import { BookingCalendar } from '@/components/bookings/booking-calendar'
import { BookingList } from '@/components/bookings/booking-list'
import { BookingForm } from '@/components/bookings/booking-form'

interface Booking {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceId: string
  serviceName: string
  staffId: string
  staffName: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  notes?: string
  price: number
  createdAt: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface Staff {
  id: string
  name: string
  skills: string[]
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)

  useEffect(() => {
    loadBookings()
    loadServices()
    loadStaff()
  }, [])

  const loadBookings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error loading staff:', error)
    }
  }

  const handleSaveBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      const isEditing = !!bookingData.id
      const url = isEditing ? `/api/bookings/${bookingData.id}` : '/api/bookings'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        throw new Error('Failed to save booking')
      }

      await loadBookings()
      setShowBookingForm(false)
      setEditingBooking(null)
    } catch (error) {
      console.error('Error saving booking:', error)
      throw error
    }
  }

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking)
    setShowBookingForm(true)
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete booking')
      }

      await loadBookings()
    } catch (error) {
      console.error('Error deleting booking:', error)
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

      await loadBookings()
    } catch (error) {
      console.error('Error updating booking status:', error)
    }
  }

  const handleAddBooking = () => {
    setEditingBooking(null)
    setShowBookingForm(true)
  }

  const handleCancelForm = () => {
    setEditingBooking(null)
    setShowBookingForm(false)
  }

  const getBookingStats = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const todayBookings = bookings.filter(b => 
      b.startTime.startsWith(todayStr)
    )
    
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
    const pendingBookings = bookings.filter(b => b.status === 'pending')
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.price, 0)

    return {
      todayBookings: todayBookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: pendingBookings.length,
      totalRevenue: totalRevenue / 100 // Convert from pence to pounds
    }
  }

  const stats = getBookingStats()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bookings & Calendar</h1>
            <p className="text-muted-foreground mt-2">
              Manage appointments and view your booking calendar
            </p>
          </div>
          <Button onClick={handleAddBooking}>
            Add Booking
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.todayBookings}</div>
            <div className="text-sm text-muted-foreground">Today's Bookings</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.confirmedBookings}</div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">£{stats.totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Revenue</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="calendar"
            onClick={() => setActiveTab('calendar')}
          >
            Calendar View
          </TabsTrigger>
          <TabsTrigger
            value="list"
            onClick={() => setActiveTab('list')}
          >
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" active={activeTab === 'calendar'}>
          <BookingCalendar
            bookings={bookings}
            services={services}
            staff={staff}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEditBooking={handleEditBooking}
            onDeleteBooking={handleDeleteBooking}
            onUpdateStatus={handleUpdateBookingStatus}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="list" active={activeTab === 'list'}>
          <BookingList
            bookings={bookings}
            services={services}
            staff={staff}
            onEdit={handleEditBooking}
            onDelete={handleDeleteBooking}
            onUpdateStatus={handleUpdateBookingStatus}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          initialData={editingBooking || undefined}
          services={services}
          staff={staff}
          onSave={handleSaveBooking}
          onCancel={handleCancelForm}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}