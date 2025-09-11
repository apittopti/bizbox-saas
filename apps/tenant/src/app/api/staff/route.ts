import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantId } from '@bizbox/core-auth'

// Mock data for now - in real implementation, this would use the database
let mockStaff: any[] = []

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staff = mockStaff.filter(member => member.tenantId === tenantId)
    
    return NextResponse.json({ staff })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
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

    const staffMember = {
      id: `stf_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      tenantId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockStaff.push(staffMember)

    return NextResponse.json({ success: true, staff: staffMember })
  } catch (error) {
    console.error('Error creating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    )
  }
}