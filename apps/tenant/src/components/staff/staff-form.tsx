"use client"

import { useState, useEffect, useRef } from 'react'
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
  FormDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@bizbox/shared-ui'

interface WorkingHours {
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorking: boolean
  breaks?: Array<{
    startTime: string
    endTime: string
    name?: string
  }>
}

interface Staff {
  id?: string
  name: string
  email: string
  phone: string
  skills: string[]
  specializations: string[]
  hourlyRate?: number
  commissionRate?: number
  isActive: boolean
  avatar?: string
  bio: string
  workingHours: WorkingHours[]
}

interface StaffFormProps {
  initialData?: Partial<Staff>
  onSave: (data: Staff) => Promise<void>
  onCancel: () => void
  onAvatarUpload: (file: File) => Promise<string>
  isLoading?: boolean
  availableSkills?: string[]
}

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

const defaultWorkingHours: WorkingHours[] = daysOfWeek.map(day => ({
  dayOfWeek: day.value,
  startTime: '09:00',
  endTime: '17:00',
  isWorking: day.value >= 1 && day.value <= 5, // Monday to Friday
  breaks: [
    { startTime: '12:00', endTime: '13:00', name: 'Lunch Break' }
  ]
}))

export function StaffForm({ 
  initialData, 
  onSave, 
  onCancel, 
  onAvatarUpload,
  isLoading, 
  availableSkills = [] 
}: StaffFormProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [formData, setFormData] = useState<Staff>({
    name: '',
    email: '',
    phone: '',
    skills: [],
    specializations: [],
    hourlyRate: undefined,
    commissionRate: undefined,
    isActive: true,
    avatar: '',
    bio: '',
    workingHours: defaultWorkingHours,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [newSpecialization, setNewSpecialization] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        workingHours: initialData.workingHours || defaultWorkingHours,
      }))
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else {
      const phoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?1\d{3}|\(?01\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?20\s?|020\s?)\d{4}\s?\d{4}$/
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Invalid UK phone number format'
      }
    }

    if (formData.hourlyRate && formData.hourlyRate < 0) {
      newErrors.hourlyRate = 'Hourly rate cannot be negative'
    }

    if (formData.commissionRate && (formData.commissionRate < 0 || formData.commissionRate > 100)) {
      newErrors.commissionRate = 'Commission rate must be between 0 and 100'
    }

    // Validate working hours
    formData.workingHours.forEach((wh, index) => {
      if (wh.isWorking) {
        if (wh.startTime >= wh.endTime) {
          newErrors[`workingHours.${index}`] = 'Start time must be before end time'
        }

        // Validate breaks
        if (wh.breaks) {
          wh.breaks.forEach((breakPeriod, breakIndex) => {
            if (breakPeriod.startTime >= breakPeriod.endTime) {
              newErrors[`workingHours.${index}.breaks.${breakIndex}`] = 'Break start time must be before end time'
            }
            if (breakPeriod.startTime < wh.startTime || breakPeriod.endTime > wh.endTime) {
              newErrors[`workingHours.${index}.breaks.${breakIndex}`] = 'Break must be within working hours'
            }
          })
        }
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
      await onSave(formData)
    } catch (error) {
      console.error('Error saving staff:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: 'Please select an image file' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'Image must be smaller than 5MB' }))
      return
    }

    setIsUploadingAvatar(true)
    try {
      const avatarUrl = await onAvatarUpload(file)
      setFormData(prev => ({ ...prev, avatar: avatarUrl }))
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.avatar
        return newErrors
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setErrors(prev => ({ ...prev, avatar: 'Failed to upload avatar' }))
    } finally {
      setIsUploadingAvatar(false)
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

    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[path]
        return newErrors
      })
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }))
  }

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }))
      setNewSpecialization('')
    }
  }

  const removeSpecialization = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== specialization)
    }))
  }

  const updateWorkingHours = (dayIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((wh, index) => 
        index === dayIndex ? { ...wh, [field]: value } : wh
      )
    }))
  }

  const addBreak = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((wh, index) => 
        index === dayIndex ? {
          ...wh,
          breaks: [
            ...(wh.breaks || []),
            { startTime: '12:00', endTime: '13:00', name: 'Break' }
          ]
        } : wh
      )
    }))
  }

  const removeBreak = (dayIndex: number, breakIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((wh, index) => 
        index === dayIndex ? {
          ...wh,
          breaks: wh.breaks?.filter((_, i) => i !== breakIndex)
        } : wh
      )
    }))
  }

  const updateBreak = (dayIndex: number, breakIndex: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((wh, index) => 
        index === dayIndex ? {
          ...wh,
          breaks: wh.breaks?.map((breakPeriod, i) => 
            i === breakIndex ? { ...breakPeriod, [field]: value } : breakPeriod
          )
        } : wh
      )
    }))
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          {initialData?.id ? 'Edit Staff Member' : 'Add New Staff Member'}
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure staff details, skills, and availability
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" onClick={() => setActiveTab('details')}>
              Personal Details
            </TabsTrigger>
            <TabsTrigger value="skills" onClick={() => setActiveTab('skills')}>
              Skills & Rates
            </TabsTrigger>
            <TabsTrigger value="schedule" onClick={() => setActiveTab('schedule')}>
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" active={activeTab === 'details'}>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Photo</h3>
                
                <FormField>
                  <FormLabel>Avatar</FormLabel>
                  <div className="space-y-4">
                    {formData.avatar && (
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 border rounded-full overflow-hidden bg-gray-50 flex items-center justify-center">
                          <img 
                            src={formData.avatar} 
                            alt="Staff Avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                          disabled={isUploadingAvatar}
                        >
                          Remove Photo
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                      >
                        {isUploadingAvatar ? 'Uploading...' : formData.avatar ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                    </div>
                  </div>
                  {errors.avatar && <FormMessage>{errors.avatar}</FormMessage>}
                </FormField>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <FormField>
                  <FormLabel htmlFor="name">Full Name *</FormLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Enter staff member's full name"
                  />
                  {errors.name && <FormMessage>{errors.name}</FormMessage>}
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField>
                    <FormLabel htmlFor="email">Email *</FormLabel>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="email@example.com"
                    />
                    {errors.email && <FormMessage>{errors.email}</FormMessage>}
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="phone">Phone *</FormLabel>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="020 7946 0958"
                    />
                    {errors.phone && <FormMessage>{errors.phone}</FormMessage>}
                  </FormField>
                </div>

                <FormField>
                  <FormLabel htmlFor="bio">Bio</FormLabel>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => updateFormData('bio', e.target.value)}
                    placeholder="Brief description about the staff member"
                    rows={3}
                  />
                  <FormDescription>
                    This will be displayed on your website
                  </FormDescription>
                </FormField>

                <FormField>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => updateFormData('isActive', e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>Staff member is active</span>
                  </label>
                  <FormDescription>
                    Inactive staff members won't be available for bookings
                  </FormDescription>
                </FormField>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skills" active={activeTab === 'skills'}>
            <div className="space-y-6">
              {/* Skills */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Skills</h3>
                
                <FormField>
                  <FormLabel>Current Skills</FormLabel>
                  <div className="space-y-2">
                    {formData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map(skill => (
                          <span 
                            key={skill}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills added yet</p>
                    )}
                  </div>
                </FormField>

                <FormField>
                  <FormLabel>Add Skill</FormLabel>
                  <div className="flex space-x-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Enter a skill"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} disabled={!newSkill.trim()}>
                      Add
                    </Button>
                  </div>
                  {availableSkills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">Suggested skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableSkills
                          .filter(skill => !formData.skills.includes(skill))
                          .map(skill => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  skills: [...prev.skills, skill]
                                }))
                              }}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                            >
                              + {skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </FormField>
              </div>

              {/* Specializations */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Specializations</h3>
                
                <FormField>
                  <FormLabel>Current Specializations</FormLabel>
                  <div className="space-y-2">
                    {formData.specializations.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.specializations.map(spec => (
                          <span 
                            key={spec}
                            className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                          >
                            {spec}
                            <button
                              type="button"
                              onClick={() => removeSpecialization(spec)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specializations added yet</p>
                    )}
                  </div>
                </FormField>

                <FormField>
                  <FormLabel>Add Specialization</FormLabel>
                  <div className="flex space-x-2">
                    <Input
                      value={newSpecialization}
                      onChange={(e) => setNewSpecialization(e.target.value)}
                      placeholder="Enter a specialization"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                    />
                    <Button type="button" onClick={addSpecialization} disabled={!newSpecialization.trim()}>
                      Add
                    </Button>
                  </div>
                </FormField>
              </div>

              {/* Rates */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Rates</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField>
                    <FormLabel htmlFor="hourlyRate">Hourly Rate (£)</FormLabel>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourlyRate || ''}
                      onChange={(e) => updateFormData('hourlyRate', parseFloat(e.target.value) || undefined)}
                    />
                    {errors.hourlyRate && <FormMessage>{errors.hourlyRate}</FormMessage>}
                    <FormDescription>
                      Optional: Used for internal cost calculations
                    </FormDescription>
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="commissionRate">Commission Rate (%)</FormLabel>
                    <Input
                      id="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.commissionRate || ''}
                      onChange={(e) => updateFormData('commissionRate', parseFloat(e.target.value) || undefined)}
                    />
                    {errors.commissionRate && <FormMessage>{errors.commissionRate}</FormMessage>}
                    <FormDescription>
                      Optional: Percentage of service price as commission
                    </FormDescription>
                  </FormField>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" active={activeTab === 'schedule'}>
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Working Hours</h3>
              
              {daysOfWeek.map((day, dayIndex) => {
                const workingHours = formData.workingHours[dayIndex]
                return (
                  <Card key={day.value} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{day.label}</h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={workingHours.isWorking}
                            onChange={(e) => updateWorkingHours(dayIndex, 'isWorking', e.target.checked)}
                            className="rounded border-input"
                          />
                          <span className="text-sm">Working</span>
                        </label>
                      </div>

                      {workingHours.isWorking && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField>
                              <FormLabel>Start Time</FormLabel>
                              <Input
                                type="time"
                                value={workingHours.startTime}
                                onChange={(e) => updateWorkingHours(dayIndex, 'startTime', e.target.value)}
                              />
                            </FormField>
                            <FormField>
                              <FormLabel>End Time</FormLabel>
                              <Input
                                type="time"
                                value={workingHours.endTime}
                                onChange={(e) => updateWorkingHours(dayIndex, 'endTime', e.target.value)}
                              />
                            </FormField>
                          </div>

                          {errors[`workingHours.${dayIndex}`] && (
                            <FormMessage>{errors[`workingHours.${dayIndex}`]}</FormMessage>
                          )}

                          {/* Breaks */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel>Breaks</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addBreak(dayIndex)}
                              >
                                Add Break
                              </Button>
                            </div>

                            {workingHours.breaks?.map((breakPeriod, breakIndex) => (
                              <div key={breakIndex} className="grid grid-cols-3 gap-2 items-end">
                                <FormField>
                                  <Input
                                    type="time"
                                    value={breakPeriod.startTime}
                                    onChange={(e) => updateBreak(dayIndex, breakIndex, 'startTime', e.target.value)}
                                  />
                                </FormField>
                                <FormField>
                                  <Input
                                    type="time"
                                    value={breakPeriod.endTime}
                                    onChange={(e) => updateBreak(dayIndex, breakIndex, 'endTime', e.target.value)}
                                  />
                                </FormField>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeBreak(dayIndex, breakIndex)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isLoading || isUploadingAvatar}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Staff' : 'Create Staff'}
          </Button>
        </div>
      </Form>
    </Card>
  )
}