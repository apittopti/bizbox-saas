"use client"

import { useState } from 'react'
import { 
  Card, 
  Button, 
  Input,
  Select
} from '@bizbox/shared-ui'

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
}

interface StaffListProps {
  staff: Staff[]
  onEdit: (staff: Staff) => void
  onDelete: (staffId: string) => void
  onToggleActive: (staffId: string, isActive: boolean) => void
  isLoading?: boolean
}

export function StaffList({ 
  staff, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  isLoading 
}: StaffListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSkill = !skillFilter || member.skills.includes(skillFilter)
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && member.isActive) ||
                         (statusFilter === 'inactive' && !member.isActive)

    return matchesSearch && matchesSkill && matchesStatus
  })

  const allSkills = Array.from(new Set(staff.flatMap(s => s.skills))).filter(Boolean)

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            >
              <option value="">All Skills</option>
              {allSkills.map(skill => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex justify-end">
            <span className="text-sm text-muted-foreground self-center">
              {filteredStaff.length} of {staff.length} staff members
            </span>
          </div>
        </div>
      </Card>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            {staff.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No staff members yet</h3>
                <p>Add your first staff member to start managing your team.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(member => (
            <Card key={member.id} className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {member.avatar ? (
                    <img 
                      src={member.avatar} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium text-gray-500">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{member.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      member.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  <p className="text-sm text-muted-foreground truncate">{member.phone}</p>
                </div>
              </div>

              {member.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {member.bio}
                </p>
              )}

              <div className="space-y-3 mb-4">
                {member.skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map(skill => (
                        <span 
                          key={skill}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{member.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {member.specializations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Specializations:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.specializations.slice(0, 2).map(spec => (
                        <span 
                          key={spec}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                        >
                          {spec}
                        </span>
                      ))}
                      {member.specializations.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{member.specializations.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {(member.hourlyRate || member.commissionRate) && (
                  <div className="text-sm">
                    {member.hourlyRate && (
                      <p className="text-muted-foreground">
                        Hourly Rate: £{member.hourlyRate.toFixed(2)}
                      </p>
                    )}
                    {member.commissionRate && (
                      <p className="text-muted-foreground">
                        Commission: {member.commissionRate}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(member)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleActive(member.id, !member.isActive)}
                  >
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(member.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}