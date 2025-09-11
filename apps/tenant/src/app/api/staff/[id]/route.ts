import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantId } from '@bizbox/core-auth'

// Mock data for now - in real implementation, this would use the database
let mockStaff: any[] = []

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
    const staffId = params.id

    const staffIndex = mockStaff.findIndex(
      member => member.id === staffId && member.tenantId === tenantId
    )

    if (staffIndex === -1) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    mockStaff[staffIndex] = {
      ...mockStaff[staffIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, staff: mockStaff[staffIndex] })
  } catch (error) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
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

    const staffId = params.id

    const staffIndex = mockStaff.findIndex(
      member => member.id === staffId && member.tenantId === tenantId
    )

    if (staffIndex === -1) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    mockStaff.splice(staffIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}