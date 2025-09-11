"use client"

import { useState, useMemo } from 'react'
import { Card, Button, Select } from '@bizbox/shared-ui'

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

interface BookingCalendarProps {
  bookings: Booking[]
  services: Service[]
  staff: Staff[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEditBooking: (booking: Booking) => void
  onDeleteBooking: (bookingId: string) => void
  onUpdateStatus: (bookingId: string, status: Booking['status']) => void
  isLoading?: boolean
}

export function BookingCalendar({
  bookings,
  services,
  staff,
  selectedDate,
  onDateSelect,
  onEditBooking,
  onDeleteBooking,
  onUpdateStatus,
  isLoading
}: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedStaff, setSelectedStaff] = useState<string>('')

  // Generate time slots for day/week view
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }, [])

  // Get bookings for selected date
  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return bookings.filter(booking => 
      booking.startTime.startsWith(dateStr) &&
      (!selectedStaff || booking.staffId === selectedStaff)
    )
  }

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek)
      weekDate.setDate(startOfWeek.getDate() + i)
      week.push(weekDate)
    }
    return week
  }

  // Get month dates
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const endDate = new Date(lastDay)

    // Adjust to show full weeks
    const startDay = startDate.getDay()
    startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1))
    
    const endDay = endDate.getDay()
    endDate.setDate(endDate.getDate() + (endDay === 0 ? 0 : 7 - endDay))

    const dates = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    
    onDateSelect(newDate)
  }

  const getDateTitle = () => {
    switch (viewMode) {
      case 'day':
        return selectedDate.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'week':
        const weekDates = getWeekDates(selectedDate)
        const start = weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const end = weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return `${start} - ${end}, ${selectedDate.getFullYear()}`
      case 'month':
        return selectedDate.toLocaleDateString('en-GB', { 
          year: 'numeric', 
          month: 'long' 
        })
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                ←
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {getDateTitle()}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                →
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateSelect(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
            >
              <option value="">All Staff</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>

            <div className="flex rounded-md border">
              {(['day', 'week', 'month'] as const).map(mode => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar View */}
      <Card className="p-6">
        {viewMode === 'day' && (
          <DayView
            date={selectedDate}
            bookings={getBookingsForDate(selectedDate)}
            timeSlots={timeSlots}
            onEditBooking={onEditBooking}
            onDeleteBooking={onDeleteBooking}
            onUpdateStatus={onUpdateStatus}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            weekDates={getWeekDates(selectedDate)}
            bookings={bookings}
            timeSlots={timeSlots}
            selectedStaff={selectedStaff}
            onEditBooking={onEditBooking}
            onDeleteBooking={onDeleteBooking}
            onUpdateStatus={onUpdateStatus}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            monthDates={getMonthDates(selectedDate)}
            bookings={bookings}
            selectedDate={selectedDate}
            selectedStaff={selectedStaff}
            onDateSelect={onDateSelect}
            onEditBooking={onEditBooking}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}
      </Card>
    </div>
  )
}

// Day View Component
function DayView({ 
  date, 
  bookings, 
  timeSlots, 
  onEditBooking, 
  onDeleteBooking, 
  onUpdateStatus, 
  getStatusColor, 
  formatTime 
}: any) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-lg mb-4">
        {date.toLocaleDateString('en-GB', { weekday: 'long' })}
      </h3>
      
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {timeSlots.map((time: string) => {
          const slotBookings = bookings.filter((booking: any) => {
            const bookingTime = formatTime(booking.startTime)
            return bookingTime === time
          })

          return (
            <div key={time} className="flex items-center min-h-[40px] border-b border-gray-100">
              <div className="w-16 text-sm text-muted-foreground font-mono">
                {time}
              </div>
              <div className="flex-1 pl-4">
                {slotBookings.map((booking: any) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onEdit={onEditBooking}
                    onDelete={onDeleteBooking}
                    onUpdateStatus={onUpdateStatus}
                    getStatusColor={getStatusColor}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Week View Component  
function WeekView({ 
  weekDates, 
  bookings, 
  timeSlots, 
  selectedStaff, 
  onEditBooking, 
  onDeleteBooking, 
  onUpdateStatus, 
  getStatusColor, 
  formatTime 
}: any) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Week Header */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="w-16"></div>
          {weekDates.map((date: Date) => (
            <div key={date.toISOString()} className="text-center">
              <div className="font-medium">
                {date.toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
              <div className="text-sm text-muted-foreground">
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Week Grid */}
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {timeSlots.slice(0, 20).map((time: string) => (
            <div key={time} className="grid grid-cols-8 gap-2 min-h-[40px] border-b border-gray-100">
              <div className="w-16 text-sm text-muted-foreground font-mono">
                {time}
              </div>
              {weekDates.map((date: Date) => {
                const dateStr = date.toISOString().split('T')[0]
                const dayBookings = bookings.filter((booking: any) => 
                  booking.startTime.startsWith(dateStr) &&
                  formatTime(booking.startTime) === time &&
                  (!selectedStaff || booking.staffId === selectedStaff)
                )

                return (
                  <div key={date.toISOString()} className="min-h-[40px]">
                    {dayBookings.map((booking: any) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onEdit={onEditBooking}
                        onDelete={onDeleteBooking}
                        onUpdateStatus={onUpdateStatus}
                        getStatusColor={getStatusColor}
                        formatTime={formatTime}
                        compact
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Month View Component
function MonthView({ 
  monthDates, 
  bookings, 
  selectedDate, 
  selectedStaff, 
  onDateSelect, 
  onEditBooking, 
  getStatusColor, 
  formatTime 
}: any) {
  const weeks = []
  for (let i = 0; i < monthDates.length; i += 7) {
    weeks.push(monthDates.slice(i, i + 7))
  }

  return (
    <div className="space-y-2">
      {/* Month Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center font-medium text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="space-y-2">
        {weeks.map((week: Date[], weekIndex: number) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((date: Date) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayBookings = bookings.filter((booking: any) => 
                booking.startTime.startsWith(dateStr) &&
                (!selectedStaff || booking.staffId === selectedStaff)
              )
              
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
              const isToday = dateStr === new Date().toISOString().split('T')[0]

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[80px] p-2 border rounded cursor-pointer hover:bg-accent ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/50'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => onDateSelect(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map((booking: any) => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded border cursor-pointer ${getStatusColor(booking.status)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditBooking(booking)
                        }}
                      >
                        <div className="truncate font-medium">
                          {formatTime(booking.startTime)} {booking.customerName}
                        </div>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Booking Card Component
function BookingCard({ 
  booking, 
  onEdit, 
  onDelete, 
  onUpdateStatus, 
  getStatusColor, 
  formatTime, 
  compact = false 
}: any) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`border rounded p-2 cursor-pointer relative ${getStatusColor(booking.status)} ${
        compact ? 'text-xs' : 'text-sm'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onEdit(booking)}
    >
      <div className="font-medium truncate">
        {formatTime(booking.startTime)} - {booking.customerName}
      </div>
      {!compact && (
        <>
          <div className="text-xs text-muted-foreground truncate">
            {booking.serviceName} with {booking.staffName}
          </div>
          <div className="text-xs font-medium">
            £{(booking.price / 100).toFixed(2)}
          </div>
        </>
      )}

      {showActions && (
        <div className="absolute top-1 right-1 flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(booking)
            }}
          >
            ✏️
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(booking.id)
            }}
          >
            🗑️
          </Button>
        </div>
      )}
    </div>
  )
}