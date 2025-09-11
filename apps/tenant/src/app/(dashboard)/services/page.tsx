"use client"

import { useState, useEffect } from 'react'
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  Card,
  Button
} from '@bizbox/shared-ui'
import { ServiceForm } from '@/components/services/service-form'
import { ServiceList } from '@/components/services/service-list'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  currency: string
  bufferBefore: number
  bufferAfter: number
  requiredSkills: string[]
  category: string
  isActive: boolean
  maxAdvanceBooking?: number
  minAdvanceBooking?: number
  cancellationPolicy: {
    allowCancellation: boolean
    cancellationDeadline: number
    cancellationFee?: number
  }
}

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('list')
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [availableSkills, setAvailableSkills] = useState<string[]>([])

  useEffect(() => {
    loadServices()
    loadAvailableSkills()
  }, [])

  const loadServices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableSkills = async () => {
    try {
      const response = await fetch('/api/staff/skills')
      if (response.ok) {
        const data = await response.json()
        setAvailableSkills(data.skills || [])
      }
    } catch (error) {
      console.error('Error loading skills:', error)
    }
  }

  const handleSaveService = async (serviceData: Omit<Service, 'id'> & { id?: string }) => {
    try {
      const isEditing = !!serviceData.id
      const url = isEditing ? `/api/services/${serviceData.id}` : '/api/services'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      })

      if (!response.ok) {
        throw new Error('Failed to save service')
      }

      await loadServices()
      setActiveTab('list')
      setEditingService(null)
    } catch (error) {
      console.error('Error saving service:', error)
      throw error
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setActiveTab('form')
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return
    }

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete service')
      }

      await loadServices()
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const handleToggleServiceActive = async (serviceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update service')
      }

      await loadServices()
    } catch (error) {
      console.error('Error updating service:', error)
    }
  }

  const handleAddService = () => {
    setEditingService(null)
    setActiveTab('form')
  }

  const handleCancelForm = () => {
    setEditingService(null)
    setActiveTab('list')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground mt-2">
              Manage your service catalog and pricing
            </p>
          </div>
          {activeTab === 'list' && (
            <Button onClick={handleAddService}>
              Add Service
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{services.length}</div>
            <div className="text-sm text-muted-foreground">Total Services</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {services.filter(s => s.isActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Services</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Array.from(new Set(services.map(s => s.category))).filter(Boolean).length}
            </div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              £{services.reduce((sum, s) => sum + s.price, 0) / 100}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="list"
            onClick={() => setActiveTab('list')}
          >
            Service List
          </TabsTrigger>
          <TabsTrigger
            value="form"
            onClick={() => setActiveTab('form')}
          >
            {editingService ? 'Edit Service' : 'Add Service'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" active={activeTab === 'list'}>
          <ServiceList
            services={services}
            onEdit={handleEditService}
            onDelete={handleDeleteService}
            onToggleActive={handleToggleServiceActive}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="form" active={activeTab === 'form'}>
          <ServiceForm
            initialData={editingService || undefined}
            onSave={handleSaveService}
            onCancel={handleCancelForm}
            availableSkills={availableSkills}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}