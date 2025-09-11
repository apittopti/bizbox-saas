import { NextRequest, NextResponse } from 'next/server'
import { businessModel } from '@bizbox/core-database'
import { getCurrentTenantId } from '@bizbox/core-auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const business = await businessModel.getForCurrentTenant()
    
    if (!business) {
      return NextResponse.json({
        details: null,
        branding: null,
        socialMedia: null,
        legalDocuments: []
      })
    }

    return NextResponse.json({
      details: {
        name: business.name,
        description: business.description,
        address: business.address,
        contact: business.contact,
        ukBusinessRegistration: business.ukBusinessRegistration
      },
      branding: business.branding,
      socialMedia: business.socialMedia,
      legalDocuments: business.legalDocuments || []
    })
  } catch (error) {
    console.error('Error fetching business data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business data' },
      { status: 500 }
    )
  }
}