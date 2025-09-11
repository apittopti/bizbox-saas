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
import { StaffForm } from '@/components/staff/staff-form'
import { StaffList } from '@/components/staff/staff-list'

interface Staff {
  id: string
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
  workingHours: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isWorking: boolean
    breaks?: Array<{
      startTime: string
      endTime: string
      name?: string
    }>
  }>
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('list')
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [availableSkills, setAvailableSkills] = useState<string[]>([])

  useEffect(() => {
    loadStaff()
    loadAvailableSkills()
  }, [])

  const loadStaff = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableSkills = async () => {
    try {
      const response = await fetch('/api/staff/skills')
      if (response.ok) {
        const data = await response.json()
        setAvailableSkills(data.skills || [])
      }
    } catch (error) {
      console.error('Error loading skills:', error)
    }
  }

  const handleSaveStaff = async (staffData: Omit<Staff, 'id'> & { id?: string }) => {
    try {
      const isEditing = !!staffData.id
      const url = isEditing ? `/api/staff/${staffData.id}` : '/api/staff'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      })

      if (!response.ok) {
        throw new Error('Failed to save staff member')
      }

      await loadStaff()
      await loadAvailableSkills() // Refresh skills in case new ones were added
      setActiveTab('list')
      setEditingStaff(null)
    } catch (error) {
      console.error('Error saving staff member:', error)
      throw error
    }
  }

  const handleAvatarUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/staff/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload avatar')
      }

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw error
    }
  }

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember)
    setActiveTab('form')
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete staff member')
      }

      await loadStaff()
      await loadAvailableSkills() // Refresh skills
    } catch (error) {
      console.error('Error deleting staff member:', error)
    }
  }

  const handleToggleStaffActive = async (staffId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update staff member')
      }

      await loadStaff()
    } catch (error) {
      console.error('Error updating staff member:', error)
    }
  }

  const handleAddStaff = () => {
    setEditingStaff(null)
    setActiveTab('form')
  }

  const handleCancelForm = () => {
    setEditingStaff(null)
    setActiveTab('list')
  }

  const getActiveStaffCount = () => staff.filter(s => s.isActive).length
  const getTotalSkills = () => Array.from(new Set(staff.flatMap(s => s.skills))).length
  const getAverageHourlyRate = () => {
    const staffWithRates = staff.filter(s => s.hourlyRate)
    if (staffWithRates.length === 0) return 0
    return staffWithRates.reduce((sum, s) => sum + (s.hourlyRate || 0), 0) / staffWithRates.length
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your team members, skills, and schedules
            </p>
          </div>
          {activeTab === 'list' && (
            <Button onClick={handleAddStaff}>
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{staff.length}</div>
            <div className="text-sm text-muted-foreground">Total Staff</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {getActiveStaffCount()}
            </div>
            <div className="text-sm text-muted-foreground">Active Staff</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {getTotalSkills()}
            </div>
            <div className="text-sm text-muted-foreground">Total Skills</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              £{getAverageHourlyRate().toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">Avg. Hourly Rate</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="list"
            onClick={() => setActiveTab('list')}
          >
            Staff List
          </TabsTrigger>
          <TabsTrigger
            value="form"
            onClick={() => setActiveTab('form')}
          >
            {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" active={activeTab === 'list'}>
          <StaffList
            staff={staff}
            onEdit={handleEditStaff}
            onDelete={handleDeleteStaff}
            onToggleActive={handleToggleStaffActive}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="form" active={activeTab === 'form'}>
          <StaffForm
            initialData={editingStaff || undefined}
            onSave={handleSaveStaff}
            onCancel={handleCancelForm}
            onAvatarUpload={handleAvatarUpload}
            availableSkills={availableSkills}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}