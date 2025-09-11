import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantId } from '@bizbox/core-auth'

// Mock data for now - in real implementation, this would use the database
let mockServices: any[] = []

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const serviceId = params.id

    const serviceIndex = mockServices.findIndex(
      service => service.id === serviceId && service.tenantId === tenantId
    )

    if (serviceIndex === -1) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    mockServices[serviceIndex] = {
      ...mockServices[serviceIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, service: mockServices[serviceIndex] })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceId = params.id

    const serviceIndex = mockServices.findIndex(
      service => service.id === serviceId && service.tenantId === tenantId
    )

    if (serviceIndex === -1) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    mockServices.splice(serviceIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    )
  }
}