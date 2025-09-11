import { NextRequest, NextResponse } from 'next/server'
import { businessModel } from '@bizbox/core-database'
import { getCurrentTenantId } from '@bizbox/core-auth'

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Check if business exists
    let business = await businessModel.findByTenantId(tenantId)
    
    if (!business) {
      // Create new business record
      business = await businessModel.create({
        tenantId,
        name: data.name,
        description: data.description,
        address: data.address,
        contact: data.contact,
        ukBusinessRegistration: data.ukBusinessRegistration,
        branding: {},
        socialMedia: {},
        legalDocuments: []
      })
    } else {
      // Update existing business
      business = await businessModel.update(tenantId, {
        name: data.name,
        description: data.description,
        address: data.address,
        contact: data.contact,
        ukBusinessRegistration: data.ukBusinessRegistration
      })
    }

    return NextResponse.json({ success: true, business })
  } catch (error) {
    console.error('Error saving business details:', error)
    return NextResponse.json(
      { error: 'Failed to save business details' },
      { status: 500 }
    )
  }
}