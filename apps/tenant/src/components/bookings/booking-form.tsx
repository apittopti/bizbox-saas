"use client"

import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Dialog } from '@bizbox/shared-ui'

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

interface BookingFormProps {
  initialData?: Booking
  services: Service[]
  staff: Staff[]
  onSave: (booking: Omit<Booking, 'id' | 'createdAt'> & { id?: string }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function BookingForm({
  initialData,
  services,
  staff,
  onSave,
  onCancel,
  isLoading
}: BookingFormProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    status: 'pending' as Booking['status'],
    notes: '',
    ...initialData
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([])

  useEffect(() => {
    if (formData.serviceId) {
      const service = services.find(s => s.id === formData.serviceId)
      if (service) {
        // Filter staff who have the required skills for this service
        // For now, we'll show all staff - in a real implementation,
        // you'd check service.requiredSkills against staff.skills
        setAvailableStaff(staff)
        
        // Calculate end time based on service duration
        if (formData.startTime) {
          const startDate = new Date(formData.startTime)
          const endDate = new Date(startDate.getTime() + service.duration * 60000)
          setFormData(prev => ({
            ...prev,
            endTime: endDate.toISOString().slice(0, 16)
          }))
        }
      }
    } else {
      setAvailableStaff(staff)
    }
  }, [formData.serviceId, formData.startTime, services, staff])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address'
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Customer phone is required'
    }

    if (!formData.serviceId) {
      newErrors.serviceId = 'Please select a service'
    }

    if (!formData.staffId) {
      newErrors.staffId = 'Please select a staff member'
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Please select a start time'
    } else {
      const startDate = new Date(formData.startTime)
      const now = new Date()
      if (startDate < now) {
        newErrors.startTime = 'Start time cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      const service = services.find(s => s.id === formData.serviceId)
      const staffMember = staff.find(s => s.id === formData.staffId)
      
      if (!service || !staffMember) {
        throw new Error('Invalid service or staff selection')
      }

      await onSave({
        ...formData,
        serviceName: service.name,
        staffName: staffMember.name,
        price: service.price,
        customerId: formData.customerId || 'temp-' + Date.now(), // Generate temp ID for new customers
        id: initialData?.id
      })
    } catch (error) {
      console.error('Error saving booking:', error)
      setErrors({ submit: 'Failed to save booking. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedService = services.find(s => s.id === formData.serviceId)

  return (
    <Dialog open onClose={onCancel}>
      <Card className="w-full max-w-2xl mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {initialData ? 'Edit Booking' : 'New Booking'}
            </h2>
            <Button variant="ghost" onClick={onCancel}>
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Customer Name *
                  </label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    className={errors.customerName ? 'border-red-500' : ''}
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="customer@example.com"
                    className={errors.customerEmail ? 'border-red-500' : ''}
                  />
                  {errors.customerEmail && (
                    <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="07123 456789"
                  className={errors.customerPhone ? 'border-red-500' : ''}
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Booking Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Service *
                  </label>
                  <Select
                    value={formData.serviceId}
                    onChange={(e) => handleInputChange('serviceId', e.target.value)}
                    className={errors.serviceId ? 'border-red-500' : ''}
                  >
                    <option value="">Select a service</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} - £{(service.price / 100).toFixed(2)} ({service.duration}min)
                      </option>
                    ))}
                  </Select>
                  {errors.serviceId && (
                    <p className="text-red-500 text-sm mt-1">{errors.serviceId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Staff Member *
                  </label>
                  <Select
                    value={formData.staffId}
                    onChange={(e) => handleInputChange('staffId', e.target.value)}
                    className={errors.staffId ? 'border-red-500' : ''}
                    disabled={!formData.serviceId}
                  >
                    <option value="">Select staff member</option>
                    {availableStaff.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </Select>
                  {errors.staffId && (
                    <p className="text-red-500 text-sm mt-1">{errors.staffId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Time *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className={errors.startTime ? 'border-red-500' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.endTime}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically calculated based on service duration
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special requirements or notes..."
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Booking Summary */}
            {selectedService && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span>{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedService.duration} minutes</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Price:</span>
                    <span>£{(selectedService.price / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
              >
                {isSaving ? 'Saving...' : initialData ? 'Update Booking' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </Dialog>
  )
}