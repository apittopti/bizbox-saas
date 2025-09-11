import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantId } from '@bizbox/core-auth'

// Mock data for now - in real implementation, this would use the database
let mockServices: any[] = []

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = mockServices.filter(service => service.tenantId === tenantId)
    
    return NextResponse.json({ services })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const service = {
      id: `svc_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      tenantId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockServices.push(service)

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    )
  }
}