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
    const allSkills = Array.from(new Set(staff.flatMap(member => member.skills || [])))
    
    return NextResponse.json({ skills: allSkills })
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}