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
import { BusinessDetailsForm } from '@/components/business/business-details-form'
import { BrandingForm } from '@/components/business/branding-form'
import { SocialMediaForm } from '@/components/business/social-media-form'
import { LegalDocumentsForm } from '@/components/business/legal-documents-form'

interface BusinessData {
  details?: any
  branding?: any
  socialMedia?: any
  legalDocuments?: any[]
}

export default function BusinessPage() {
  const [activeTab, setActiveTab] = useState('details')
  const [businessData, setBusinessData] = useState<BusinessData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [completionStatus, setCompletionStatus] = useState({
    details: false,
    branding: false,
    socialMedia: false,
    legalDocuments: false,
  })

  useEffect(() => {
    loadBusinessData()
  }, [])

  const loadBusinessData = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API calls
      const response = await fetch('/api/business')
      if (response.ok) {
        const data = await response.json()
        setBusinessData(data)
        updateCompletionStatus(data)
      }
    } catch (error) {
      console.error('Error loading business data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCompletionStatus = (data: BusinessData) => {
    setCompletionStatus({
      details: !!(data.details?.name && data.details?.address?.line1 && data.details?.contact?.email),
      branding: !!(data.branding?.primaryColor && data.branding?.secondaryColor),
      socialMedia: !!(data.socialMedia && Object.values(data.socialMedia).some(url => url)),
      legalDocuments: !!(data.legalDocuments && data.legalDocuments.length > 0),
    })
  }

  const handleSaveDetails = async (details: any) => {
    try {
      const response = await fetch('/api/business/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })

      if (!response.ok) {
        throw new Error('Failed to save business details')
      }

      const updatedData = { ...businessData, details }
      setBusinessData(updatedData)
      updateCompletionStatus(updatedData)
    } catch (error) {
      console.error('Error saving business details:', error)
      throw error
    }
  }

  const handleSaveBranding = async (branding: any) => {
    try {
      const response = await fetch('/api/business/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      })

      if (!response.ok) {
        throw new Error('Failed to save branding')
      }

      const updatedData = { ...businessData, branding }
      setBusinessData(updatedData)
      updateCompletionStatus(updatedData)
    } catch (error) {
      console.error('Error saving branding:', error)
      throw error
    }
  }

  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/business/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error('Error uploading logo:', error)
      throw error
    }
  }

  const handleSaveSocialMedia = async (socialMedia: any) => {
    try {
      const response = await fetch('/api/business/social-media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socialMedia),
      })

      if (!response.ok) {
        throw new Error('Failed to save social media')
      }

      const updatedData = { ...businessData, socialMedia }
      setBusinessData(updatedData)
      updateCompletionStatus(updatedData)
    } catch (error) {
      console.error('Error saving social media:', error)
      throw error
    }
  }

  const handleSaveLegalDocuments = async (legalDocuments: any[]) => {
    try {
      const response = await fetch('/api/business/legal-documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalDocuments }),
      })

      if (!response.ok) {
        throw new Error('Failed to save legal documents')
      }

      const updatedData = { ...businessData, legalDocuments }
      setBusinessData(updatedData)
      updateCompletionStatus(updatedData)
    } catch (error) {
      console.error('Error saving legal documents:', error)
      throw error
    }
  }

  const getTabStatus = (tab: keyof typeof completionStatus) => {
    return completionStatus[tab] ? '✓' : '○'
  }

  const getOverallCompletion = () => {
    const completed = Object.values(completionStatus).filter(Boolean).length
    const total = Object.keys(completionStatus).length
    return Math.round((completed / total) * 100)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading business information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Business Information</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business details, branding, and legal documents
        </p>
        
        {/* Completion Status */}
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Profile Completion</h3>
              <p className="text-sm text-muted-foreground">
                Complete your business profile to publish your website
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{getOverallCompletion()}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          <div className="mt-3 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${getOverallCompletion()}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="details"
            onClick={() => setActiveTab('details')}
            className="flex items-center space-x-2"
          >
            <span>Details</span>
            <span className="text-xs">{getTabStatus('details')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            onClick={() => setActiveTab('branding')}
            className="flex items-center space-x-2"
          >
            <span>Branding</span>
            <span className="text-xs">{getTabStatus('branding')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="social"
            onClick={() => setActiveTab('social')}
            className="flex items-center space-x-2"
          >
            <span>Social Media</span>
            <span className="text-xs">{getTabStatus('socialMedia')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="legal"
            onClick={() => setActiveTab('legal')}
            className="flex items-center space-x-2"
          >
            <span>Legal</span>
            <span className="text-xs">{getTabStatus('legalDocuments')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" active={activeTab === 'details'}>
          <BusinessDetailsForm
            initialData={businessData.details}
            onSave={handleSaveDetails}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="branding" active={activeTab === 'branding'}>
          <BrandingForm
            initialData={businessData.branding}
            onSave={handleSaveBranding}
            onLogoUpload={handleLogoUpload}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="social" active={activeTab === 'social'}>
          <SocialMediaForm
            initialData={businessData.socialMedia}
            onSave={handleSaveSocialMedia}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="legal" active={activeTab === 'legal'}>
          <LegalDocumentsForm
            initialData={businessData.legalDocuments}
            onSave={handleSaveLegalDocuments}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-8 p-6">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('details')}
            disabled={completionStatus.details}
          >
            {completionStatus.details ? '✓ Details Complete' : 'Complete Business Details'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('branding')}
            disabled={completionStatus.branding}
          >
            {completionStatus.branding ? '✓ Branding Complete' : 'Setup Branding'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('legal')}
            disabled={completionStatus.legalDocuments}
          >
            {completionStatus.legalDocuments ? '✓ Legal Docs Complete' : 'Add Legal Documents'}
          </Button>
        </div>
      </Card>
    </div>
  )
}