"use client"

import { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Textarea,
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@bizbox/shared-ui'

interface LegalDocument {
  type: 'terms' | 'privacy' | 'cookies'
  content: string
  version: string
  updatedAt: Date
}

interface LegalDocuments {
  terms?: LegalDocument
  privacy?: LegalDocument
  cookies?: LegalDocument
}

interface LegalDocumentsFormProps {
  initialData?: LegalDocument[]
  onSave: (documents: LegalDocument[]) => Promise<void>
  isLoading?: boolean
}

const documentTypes = [
  {
    key: 'terms' as const,
    label: 'Terms & Conditions',
    description: 'Terms of service for your business',
    template: `TERMS AND CONDITIONS

Last updated: [DATE]

1. ACCEPTANCE OF TERMS
By accessing and using our services, you accept and agree to be bound by the terms and provision of this agreement.

2. SERVICES
We provide [DESCRIBE YOUR SERVICES] to customers in the United Kingdom.

3. BOOKING AND CANCELLATION
- Bookings must be made in advance
- Cancellations must be made at least [X] hours before the appointment
- Late cancellations may incur charges

4. PAYMENT TERMS
- Payment is due at the time of service
- We accept [PAYMENT METHODS]
- Refunds are available in accordance with our refund policy

5. LIABILITY
Our liability is limited to the cost of the service provided.

6. GOVERNING LAW
These terms are governed by the laws of England and Wales.

Contact us at [YOUR EMAIL] for any questions about these terms.`
  },
  {
    key: 'privacy' as const,
    label: 'Privacy Policy',
    description: 'How you collect and use customer data',
    template: `PRIVACY POLICY

Last updated: [DATE]

1. INFORMATION WE COLLECT
We collect information you provide directly to us, such as:
- Name and contact information
- Booking details and preferences
- Payment information

2. HOW WE USE YOUR INFORMATION
We use the information we collect to:
- Provide and maintain our services
- Process bookings and payments
- Communicate with you about your appointments
- Improve our services

3. INFORMATION SHARING
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.

4. DATA SECURITY
We implement appropriate security measures to protect your personal information.

5. YOUR RIGHTS
Under UK GDPR, you have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Object to processing of your data

6. CONTACT US
For questions about this privacy policy, contact us at [YOUR EMAIL].`
  },
  {
    key: 'cookies' as const,
    label: 'Cookie Policy',
    description: 'Information about cookies used on your website',
    template: `COOKIE POLICY

Last updated: [DATE]

1. WHAT ARE COOKIES
Cookies are small text files that are placed on your computer by websites that you visit.

2. HOW WE USE COOKIES
We use cookies to:
- Remember your preferences
- Understand how you use our website
- Improve your experience

3. TYPES OF COOKIES WE USE
- Essential cookies: Required for the website to function
- Analytics cookies: Help us understand website usage
- Preference cookies: Remember your settings

4. MANAGING COOKIES
You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed.

5. CONTACT US
For questions about our use of cookies, contact us at [YOUR EMAIL].`
  }
]

export function LegalDocumentsForm({ initialData, onSave, isLoading }: LegalDocumentsFormProps) {
  const [documents, setDocuments] = useState<LegalDocuments>({})
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'cookies'>('terms')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      const documentsMap: LegalDocuments = {}
      initialData.forEach(doc => {
        documentsMap[doc.type] = doc
      })
      setDocuments(documentsMap)
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Check if at least terms and privacy policy are provided
    if (!documents.terms?.content?.trim()) {
      newErrors.terms = 'Terms & Conditions are required'
    }

    if (!documents.privacy?.content?.trim()) {
      newErrors.privacy = 'Privacy Policy is required'
    }

    // Validate content length
    Object.entries(documents).forEach(([type, doc]) => {
      if (doc?.content && doc.content.length < 100) {
        newErrors[type] = `${documentTypes.find(t => t.key === type)?.label} must be at least 100 characters`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const documentsArray: LegalDocument[] = Object.entries(documents)
        .filter(([_, doc]) => doc && doc.content.trim())
        .map(([type, doc]) => ({
          type: type as 'terms' | 'privacy' | 'cookies',
          content: doc!.content.trim(),
          version: doc!.version || '1.0',
          updatedAt: new Date()
        }))

      await onSave(documentsArray)
    } catch (error) {
      console.error('Error saving legal documents:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateDocument = (type: 'terms' | 'privacy' | 'cookies', content: string) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        type,
        content,
        version: prev[type]?.version || '1.0',
        updatedAt: new Date()
      }
    }))

    // Clear error for this document
    if (errors[type]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[type]
        return newErrors
      })
    }
  }

  const useTemplate = (type: 'terms' | 'privacy' | 'cookies') => {
    const template = documentTypes.find(t => t.key === type)?.template || ''
    const today = new Date().toLocaleDateString('en-GB')
    const templateWithDate = template.replace('[DATE]', today)
    
    updateDocument(type, templateWithDate)
  }

  const getDocumentStatus = (type: 'terms' | 'privacy' | 'cookies') => {
    const doc = documents[type]
    if (!doc || !doc.content.trim()) {
      return { status: 'missing', color: 'text-destructive' }
    }
    if (doc.content.length < 100) {
      return { status: 'incomplete', color: 'text-yellow-600' }
    }
    return { status: 'complete', color: 'text-green-600' }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Legal Documents</h2>
        <p className="text-muted-foreground mt-1">
          Manage your legal documents that will be displayed on your website
        </p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> These templates are provided as a starting point. 
            Please consult with a legal professional to ensure your documents comply with UK law and your specific business needs.
          </p>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {documentTypes.map(docType => {
              const status = getDocumentStatus(docType.key)
              return (
                <TabsTrigger
                  key={docType.key}
                  value={docType.key}
                  onClick={() => setActiveTab(docType.key)}
                  className="flex items-center space-x-2"
                >
                  <span>{docType.label}</span>
                  <span className={`text-xs ${status.color}`}>
                    {status.status === 'missing' && '●'}
                    {status.status === 'incomplete' && '◐'}
                    {status.status === 'complete' && '●'}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {documentTypes.map(docType => (
            <TabsContent key={docType.key} value={docType.key} active={activeTab === docType.key}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{docType.label}</h3>
                    <p className="text-sm text-muted-foreground">{docType.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => useTemplate(docType.key)}
                    disabled={isSubmitting}
                  >
                    Use Template
                  </Button>
                </div>

                <FormField>
                  <FormLabel htmlFor={`${docType.key}-content`}>
                    Document Content {(docType.key === 'terms' || docType.key === 'privacy') && '*'}
                  </FormLabel>
                  <Textarea
                    id={`${docType.key}-content`}
                    value={documents[docType.key]?.content || ''}
                    onChange={(e) => updateDocument(docType.key, e.target.value)}
                    placeholder={`Enter your ${docType.label.toLowerCase()} here...`}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  {errors[docType.key] && <FormMessage>{errors[docType.key]}</FormMessage>}
                  <FormDescription>
                    {docType.key === 'terms' || docType.key === 'privacy' 
                      ? 'This document is required and will be linked in your website footer.'
                      : 'This document is optional but recommended for GDPR compliance.'
                    }
                  </FormDescription>
                </FormField>

                {documents[docType.key]?.content && (
                  <div className="text-sm text-muted-foreground">
                    Character count: {documents[docType.key]?.content.length || 0}
                    {documents[docType.key]?.updatedAt && (
                      <span className="ml-4">
                        Last updated: {documents[docType.key]?.updatedAt.toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Summary */}
        <div className="mt-8 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-sm font-medium mb-3">Document Status</h3>
          <div className="space-y-2">
            {documentTypes.map(docType => {
              const status = getDocumentStatus(docType.key)
              return (
                <div key={docType.key} className="flex items-center justify-between text-sm">
                  <span>{docType.label}</span>
                  <span className={status.color}>
                    {status.status === 'missing' && 'Missing'}
                    {status.status === 'incomplete' && 'Incomplete'}
                    {status.status === 'complete' && 'Complete'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : 'Save Documents'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}