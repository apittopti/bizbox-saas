"use client"

import { useState } from 'react'
import { 
  Card, 
  Button, 
  Input,
  Select
} from '@bizbox/shared-ui'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  currency: string
  category: string
  isActive: boolean
  requiredSkills: string[]
  bufferBefore: number
  bufferAfter: number
}

interface ServiceListProps {
  services: Service[]
  onEdit: (service: Service) => void
  onDelete: (serviceId: string) => void
  onToggleActive: (serviceId: string, isActive: boolean) => void
  isLoading?: boolean
}

export function ServiceList({ 
  services, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  isLoading 
}: ServiceListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || service.category === categoryFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && service.isActive) ||
                         (statusFilter === 'inactive' && !service.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = Array.from(new Set(services.map(s => s.category))).filter(Boolean)

  const formatPrice = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) {
      return `${mins}m`
    } else if (mins === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${mins}m`
    }
  }

  const getTotalDuration = (service: Service): number => {
    return service.duration + service.bufferBefore + service.bufferAfter
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex justify-end">
            <span className="text-sm text-muted-foreground self-center">
              {filteredServices.length} of {services.length} services
            </span>
          </div>
        </div>
      </Card>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            {services.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No services yet</h3>
                <p>Create your first service to get started with bookings.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No services found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <Card key={service.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {service.category && (
                    <p className="text-sm text-muted-foreground mb-2">{service.category}</p>
                  )}
                </div>
              </div>

              {service.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">{formatPrice(service.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formatDuration(service.duration)}</span>
                </div>
                {(service.bufferBefore > 0 || service.bufferAfter > 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Time:</span>
                    <span className="font-medium">{formatDuration(getTotalDuration(service))}</span>
                  </div>
                )}
                {service.requiredSkills.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {service.requiredSkills.map(skill => (
                        <span 
                          key={skill}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(service)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleActive(service.id, !service.isActive)}
                  >
                    {service.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(service.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}