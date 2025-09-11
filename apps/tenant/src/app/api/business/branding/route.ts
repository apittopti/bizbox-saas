import { NextRequest, NextResponse } from 'next/server'
import { businessModel } from '@bizbox/core-database'
import { getCurrentTenantId } from '@bizbox/core-auth'

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const branding = await request.json()

    const business = await businessModel.updateBranding(tenantId, branding)
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, branding: business.branding })
  } catch (error) {
    console.error('Error saving branding:', error)
    return NextResponse.json(
      { error: 'Failed to save branding' },
      { status: 500 }
    )
  }
}