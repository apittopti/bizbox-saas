"use client"

import { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Input, 
  Textarea, 
  Select,
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription
} from '@bizbox/shared-ui'

interface BusinessDetails {
  name: string
  description: string
  address: {
    line1: string
    line2?: string
    city: string
    county: string
    postcode: string
    country: string
  }
  contact: {
    email: string
    phone: string
    website?: string
    fax?: string
  }
  ukBusinessRegistration?: {
    companyNumber?: string
    vatNumber?: string
    businessType: string
    incorporationDate?: string
    registeredAddress?: any
  }
}

interface BusinessDetailsFormProps {
  initialData?: Partial<BusinessDetails>
  onSave: (data: BusinessDetails) => Promise<void>
  isLoading?: boolean
}

const businessTypes = [
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'llp', label: 'Limited Liability Partnership' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
]

export function BusinessDetailsForm({ initialData, onSave, isLoading }: BusinessDetailsFormProps) {
  const [formData, setFormData] = useState<BusinessDetails>({
    name: '',
    description: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
    },
    contact: {
      email: '',
      phone: '',
      website: '',
      fax: '',
    },
    ukBusinessRegistration: {
      companyNumber: '',
      vatNumber: '',
      businessType: 'sole_trader',
      incorporationDate: '',
    },
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        address: { ...prev.address, ...initialData.address },
        contact: { ...prev.contact, ...initialData.contact },
        ukBusinessRegistration: { 
          ...prev.ukBusinessRegistration, 
          ...initialData.ukBusinessRegistration 
        },
      }))
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required'
    }

    if (!formData.address.line1.trim()) {
      newErrors['address.line1'] = 'Address line 1 is required'
    }

    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required'
    }

    if (!formData.address.county.trim()) {
      newErrors['address.county'] = 'County is required'
    }

    if (!formData.address.postcode.trim()) {
      newErrors['address.postcode'] = 'Postcode is required'
    } else {
      // UK postcode validation
      const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i
      if (!postcodeRegex.test(formData.address.postcode)) {
        newErrors['address.postcode'] = 'Invalid UK postcode format'
      }
    }

    if (!formData.contact.email.trim()) {
      newErrors['contact.email'] = 'Email is required'
    } else {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.contact.email)) {
        newErrors['contact.email'] = 'Invalid email format'
      }
    }

    if (!formData.contact.phone.trim()) {
      newErrors['contact.phone'] = 'Phone number is required'
    } else {
      // UK phone validation
      const phoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?1\d{3}|\(?01\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?20\s?|020\s?)\d{4}\s?\d{4}$/
      if (!phoneRegex.test(formData.contact.phone)) {
        newErrors['contact.phone'] = 'Invalid UK phone number format'
      }
    }

    // Optional field validations
    if (formData.contact.website && formData.contact.website.trim()) {
      try {
        new URL(formData.contact.website)
      } catch {
        newErrors['contact.website'] = 'Invalid website URL'
      }
    }

    if (formData.ukBusinessRegistration?.companyNumber && formData.ukBusinessRegistration.companyNumber.trim()) {
      const companyNumberRegex = /^[A-Z0-9]{8}$/
      if (!companyNumberRegex.test(formData.ukBusinessRegistration.companyNumber)) {
        newErrors['ukBusinessRegistration.companyNumber'] = 'Invalid UK company number format'
      }
    }

    if (formData.ukBusinessRegistration?.vatNumber && formData.ukBusinessRegistration.vatNumber.trim()) {
      const vatRegex = /^GB\d{9}$/
      if (!vatRegex.test(formData.ukBusinessRegistration.vatNumber)) {
        newErrors['ukBusinessRegistration.vatNumber'] = 'Invalid UK VAT number format (GB123456789)'
      }
    }

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
      await onSave(formData)
    } catch (error) {
      console.error('Error saving business details:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current = newData as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })

    // Clear error for this field
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[path]
        return newErrors
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Business Details</h2>
        <p className="text-muted-foreground mt-1">
          Manage your business information and UK-specific details
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <FormField>
            <FormLabel htmlFor="name">Business Name *</FormLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Enter your business name"
            />
            {errors.name && <FormMessage>{errors.name}</FormMessage>}
          </FormField>

          <FormField>
            <FormLabel htmlFor="description">Description</FormLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Describe your business"
              rows={3}
            />
            <FormDescription>
              A brief description of your business and services
            </FormDescription>
          </FormField>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Business Address</h3>
          
          <FormField>
            <FormLabel htmlFor="address.line1">Address Line 1 *</FormLabel>
            <Input
              id="address.line1"
              value={formData.address.line1}
              onChange={(e) => updateFormData('address.line1', e.target.value)}
              placeholder="Street address"
            />
            {errors['address.line1'] && <FormMessage>{errors['address.line1']}</FormMessage>}
          </FormField>

          <FormField>
            <FormLabel htmlFor="address.line2">Address Line 2</FormLabel>
            <Input
              id="address.line2"
              value={formData.address.line2 || ''}
              onChange={(e) => updateFormData('address.line2', e.target.value)}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="address.city">City *</FormLabel>
              <Input
                id="address.city"
                value={formData.address.city}
                onChange={(e) => updateFormData('address.city', e.target.value)}
                placeholder="City"
              />
              {errors['address.city'] && <FormMessage>{errors['address.city']}</FormMessage>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="address.county">County *</FormLabel>
              <Input
                id="address.county"
                value={formData.address.county}
                onChange={(e) => updateFormData('address.county', e.target.value)}
                placeholder="County"
              />
              {errors['address.county'] && <FormMessage>{errors['address.county']}</FormMessage>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="address.postcode">Postcode *</FormLabel>
              <Input
                id="address.postcode"
                value={formData.address.postcode}
                onChange={(e) => updateFormData('address.postcode', e.target.value.toUpperCase())}
                placeholder="SW1A 1AA"
              />
              {errors['address.postcode'] && <FormMessage>{errors['address.postcode']}</FormMessage>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="address.country">Country</FormLabel>
              <Input
                id="address.country"
                value={formData.address.country}
                onChange={(e) => updateFormData('address.country', e.target.value)}
                disabled
              />
            </FormField>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="contact.email">Email *</FormLabel>
              <Input
                id="contact.email"
                type="email"
                value={formData.contact.email}
                onChange={(e) => updateFormData('contact.email', e.target.value)}
                placeholder="business@example.com"
              />
              {errors['contact.email'] && <FormMessage>{errors['contact.email']}</FormMessage>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="contact.phone">Phone *</FormLabel>
              <Input
                id="contact.phone"
                value={formData.contact.phone}
                onChange={(e) => updateFormData('contact.phone', e.target.value)}
                placeholder="020 7946 0958"
              />
              {errors['contact.phone'] && <FormMessage>{errors['contact.phone']}</FormMessage>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="contact.website">Website</FormLabel>
              <Input
                id="contact.website"
                type="url"
                value={formData.contact.website || ''}
                onChange={(e) => updateFormData('contact.website', e.target.value)}
                placeholder="https://www.example.com"
              />
              {errors['contact.website'] && <FormMessage>{errors['contact.website']}</FormMessage>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="contact.fax">Fax</FormLabel>
              <Input
                id="contact.fax"
                value={formData.contact.fax || ''}
                onChange={(e) => updateFormData('contact.fax', e.target.value)}
                placeholder="020 7946 0959"
              />
            </FormField>
          </div>
        </div>

        {/* UK Business Registration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">UK Business Registration</h3>
          
          <FormField>
            <FormLabel htmlFor="ukBusinessRegistration.businessType">Business Type</FormLabel>
            <Select
              id="ukBusinessRegistration.businessType"
              value={formData.ukBusinessRegistration?.businessType || 'sole_trader'}
              onChange={(e) => updateFormData('ukBusinessRegistration.businessType', e.target.value)}
            >
              {businessTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="ukBusinessRegistration.companyNumber">Company Number</FormLabel>
              <Input
                id="ukBusinessRegistration.companyNumber"
                value={formData.ukBusinessRegistration?.companyNumber || ''}
                onChange={(e) => updateFormData('ukBusinessRegistration.companyNumber', e.target.value.toUpperCase())}
                placeholder="12345678"
                maxLength={8}
              />
              {errors['ukBusinessRegistration.companyNumber'] && (
                <FormMessage>{errors['ukBusinessRegistration.companyNumber']}</FormMessage>
              )}
              <FormDescription>
                8-character Companies House number (if applicable)
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="ukBusinessRegistration.vatNumber">VAT Number</FormLabel>
              <Input
                id="ukBusinessRegistration.vatNumber"
                value={formData.ukBusinessRegistration?.vatNumber || ''}
                onChange={(e) => updateFormData('ukBusinessRegistration.vatNumber', e.target.value.toUpperCase())}
                placeholder="GB123456789"
              />
              {errors['ukBusinessRegistration.vatNumber'] && (
                <FormMessage>{errors['ukBusinessRegistration.vatNumber']}</FormMessage>
              )}
              <FormDescription>
                UK VAT registration number (if applicable)
              </FormDescription>
            </FormField>
          </div>

          <FormField>
            <FormLabel htmlFor="ukBusinessRegistration.incorporationDate">Incorporation Date</FormLabel>
            <Input
              id="ukBusinessRegistration.incorporationDate"
              type="date"
              value={formData.ukBusinessRegistration?.incorporationDate || ''}
              onChange={(e) => updateFormData('ukBusinessRegistration.incorporationDate', e.target.value)}
            />
            <FormDescription>
              Date when the business was incorporated (if applicable)
            </FormDescription>
          </FormField>
        </div>

        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}