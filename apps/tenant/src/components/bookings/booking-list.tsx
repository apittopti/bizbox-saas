"use client"

import { useState } from 'react'
import { Card, Button, Input, Select } from '@bizbox/shared-ui'

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

interface BookingListProps {
  bookings: Booking[]
  services: Service[]
  staff: Staff[]
  onEdit: (booking: Booking) => void
  onDelete: (bookingId: string) => void
  onUpdateStatus: (bookingId: string, status: Booking['status']) => void
  isLoading?: boolean
}

export function BookingList({
  bookings,
  services,
  staff,
  onEdit,
  onDelete,
  onUpdateStatus,
  isLoading
}: BookingListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'customer' | 'service' | 'staff'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.staffName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !statusFilter || booking.status === statusFilter
    const matchesStaff = !staffFilter || booking.staffId === staffFilter
    
    let matchesDate = true
    if (dateFilter) {
      const bookingDate = new Date(booking.startTime).toISOString().split('T')[0]
      const filterDate = new Date(dateFilter).toISOString().split('T')[0]
      matchesDate = bookingDate === filterDate
    }

    return matchesSearch && matchesStatus && matchesStaff && matchesDate
  })

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.startTime).getTime()
        bValue = new Date(b.startTime).getTime()
        break
      case 'customer':
        aValue = a.customerName.toLowerCase()
        bValue = b.customerName.toLowerCase()
        break
      case 'service':
        aValue = a.serviceName.toLowerCase()
        bValue = b.serviceName.toLowerCase()
        break
      case 'staff':
        aValue = a.staffName.toLowerCase()
        bValue = b.staffName.toLowerCase()
        break
      default:
        aValue = a.startTime
        bValue = b.startTime
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-GB'),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }
  }

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <Select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              <option value="">All Staff</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
            />
          </div>
          <div className="flex justify-end">
            <span className="text-sm text-muted-foreground self-center">
              {sortedBookings.length} of {bookings.length} bookings
            </span>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      {sortedBookings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            {bookings.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p>Your first booking will appear here.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('date')}
                  >
                    Date & Time {getSortIcon('date')}
                  </th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('customer')}
                  >
                    Customer {getSortIcon('customer')}
                  </th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('service')}
                  >
                    Service {getSortIcon('service')}
                  </th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('staff')}
                  >
                    Staff {getSortIcon('staff')}
                  </th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Price</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map(booking => {
                  const { date, time } = formatDateTime(booking.startTime)
                  const endTime = formatDateTime(booking.endTime).time
                  
                  return (
                    <tr key={booking.id} className="border-b hover:bg-muted/25">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{date}</div>
                          <div className="text-sm text-muted-foreground">
                            {time} - {endTime}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{booking.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.customerEmail}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {booking.customerPhone}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{booking.serviceName}</div>
                        {booking.notes && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {booking.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{booking.staffName}</div>
                      </td>
                      <td className="p-4">
                        <Select
                          value={booking.status}
                          onChange={(e) => onUpdateStatus(booking.id, e.target.value as Booking['status'])}
                          className={`text-sm ${getStatusColor(booking.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">
                          £{(booking.price / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(booking)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(booking.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}