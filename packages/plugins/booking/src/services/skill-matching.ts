import { Staff, StaffManager } from '../models/staff'
import { Service, ServiceManager } from '../models/service'

export interface SkillMatch {
  staffId: string
  staffName: string
  matchScore: number
  hasAllRequiredSkills: boolean
  missingSkills: string[]
  overqualifiedSkills: string[]
  skillDetails: Array<{
    skillId: string
    required: boolean
    hasSkill: boolean
    staffLevel?: string
    requiredLevel?: string
  }>
}

export interface SkillMatchingOptions {
  requireAllSkills?: boolean
  allowOverqualified?: boolean
  preferExactMatch?: boolean
  minimumMatchScore?: number
}

export class SkillMatchingService {
  private staffManager: StaffManager
  private serviceManager: ServiceManager

  constructor(staffManager: StaffManager, serviceManager: ServiceManager) {
    this.staffManager = staffManager
    this.serviceManager = serviceManager
  }

  /**
   * Find staff members who can perform a specific service
   */
  async findQualifiedStaff(
    tenantId: string,
    serviceId: string,
    options: SkillMatchingOptions = {}
  ): Promise<SkillMatch[]> {
    const service = await this.serviceManager.getService(serviceId)
    if (!service) {
      throw new Error('Service not found')
    }

    const allStaff = await this.staffManager.getActiveStaff(tenantId)
    const matches: SkillMatch[] = []

    for (const staff of allStaff) {
      const match = this.calculateSkillMatch(staff, service, options)
      
      // Apply filters based on options
      if (options.requireAllSkills && !match.hasAllRequiredSkills) {
        continue
      }
      
      if (options.minimumMatchScore && match.matchScore < options.minimumMatchScore) {
        continue
      }

      matches.push(match)
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Find services that a staff member can perform
   */
  async findServicesForStaff(
    tenantId: string,
    staffId: string,
    options: SkillMatchingOptions = {}
  ): Promise<Array<{ service: Service; match: SkillMatch }>> {
    const staff = await this.staffManager.getStaff(staffId)
    if (!staff) {
      throw new Error('Staff member not found')
    }

    const allServices = await this.serviceManager.getActiveServices(tenantId)
    const results: Array<{ service: Service; match: SkillMatch }> = []

    for (const service of allServices) {
      const match = this.calculateSkillMatch(staff, service, options)
      
      // Apply filters
      if (options.requireAllSkills && !match.hasAllRequiredSkills) {
        continue
      }
      
      if (options.minimumMatchScore && match.matchScore < options.minimumMatchScore) {
        continue
      }

      results.push({ service, match })
    }

    // Sort by match score
    return results.sort((a, b) => b.match.matchScore - a.match.matchScore)
  }

  /**
   * Calculate skill match between staff and service
   */
  private calculateSkillMatch(
    staff: Staff,
    service: Service,
    options: SkillMatchingOptions = {}
  ): SkillMatch {
    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert']
    const getLevelIndex = (level: string) => skillLevels.indexOf(level)

    let totalScore = 0
    let maxPossibleScore = 0
    const missingSkills: string[] = []
    const overqualifiedSkills: string[] = []
    const skillDetails: SkillMatch['skillDetails'] = []

    // If service has no required skills, everyone matches perfectly
    if (service.requiredSkills.length === 0) {
      return {
        staffId: staff.id,
        staffName: staff.name,
        matchScore: 100,
        hasAllRequiredSkills: true,
        missingSkills: [],
        overqualifiedSkills: [],
        skillDetails: []
      }
    }

    // Check each required skill
    for (const requiredSkill of service.requiredSkills) {
      maxPossibleScore += 100 // Each skill worth 100 points when perfectly matched

      const staffSkill = staff.skills.find(s => s === requiredSkill)
      
      if (!staffSkill) {
        // Staff doesn't have this skill
        missingSkills.push(requiredSkill)
        skillDetails.push({
          skillId: requiredSkill,
          required: true,
          hasSkill: false
        })
      } else {
        // Staff has the skill - calculate match quality
        let skillScore = 100 // Base score for having the skill

        // In a more advanced implementation, you could compare skill levels
        // For now, having the skill gives full points
        totalScore += skillScore

        skillDetails.push({
          skillId: requiredSkill,
          required: true,
          hasSkill: true,
          staffLevel: 'qualified' // Simplified for now
        })
      }
    }

    // Check for additional skills (overqualification)
    for (const staffSkill of staff.skills) {
      if (!service.requiredSkills.includes(staffSkill)) {
        overqualifiedSkills.push(staffSkill)
        skillDetails.push({
          skillId: staffSkill,
          required: false,
          hasSkill: true,
          staffLevel: 'qualified'
        })
      }
    }

    // Calculate final match score
    let matchScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0

    // Bonus for overqualification (if allowed)
    if (options.allowOverqualified && overqualifiedSkills.length > 0) {
      const bonusPoints = Math.min(overqualifiedSkills.length * 5, 20) // Max 20% bonus
      matchScore = Math.min(matchScore + bonusPoints, 100)
    }

    // Penalty for exact match preference
    if (options.preferExactMatch && overqualifiedSkills.length > 0) {
      const penalty = overqualifiedSkills.length * 2 // 2% penalty per extra skill
      matchScore = Math.max(matchScore - penalty, 0)
    }

    return {
      staffId: staff.id,
      staffName: staff.name,
      matchScore: Math.round(matchScore),
      hasAllRequiredSkills: missingSkills.length === 0,
      missingSkills,
      overqualifiedSkills,
      skillDetails
    }
  }

  /**
   * Get skill gap analysis for a staff member
   */
  async getSkillGapAnalysis(
    tenantId: string,
    staffId: string
  ): Promise<{
    currentSkills: string[]
    availableServices: number
    skillGaps: Array<{
      skillId: string
      servicesUnlocked: number
      priority: 'high' | 'medium' | 'low'
    }>
    recommendations: Array<{
      skillId: string
      reason: string
      impact: string
    }>
  }> {
    const staff = await this.staffManager.getStaff(staffId)
    if (!staff) {
      throw new Error('Staff member not found')
    }

    const allServices = await this.serviceManager.getActiveServices(tenantId)
    const currentServices = await this.findServicesForStaff(tenantId, staffId, {
      requireAllSkills: true
    })

    // Find all unique skills required across services
    const allRequiredSkills = new Set<string>()
    allServices.forEach(service => {
      service.requiredSkills.forEach(skill => allRequiredSkills.add(skill))
    })

    // Calculate skill gaps
    const skillGaps: Array<{
      skillId: string
      servicesUnlocked: number
      priority: 'high' | 'medium' | 'low'
    }> = []

    for (const skill of allRequiredSkills) {
      if (!staff.skills.includes(skill)) {
        // Count how many services this skill would unlock
        const servicesWithSkill = allServices.filter(service =>
          service.requiredSkills.includes(skill)
        )
        
        const servicesUnlocked = servicesWithSkill.filter(service => {
          // Check if staff would be qualified if they had this skill
          const otherRequiredSkills = service.requiredSkills.filter(s => s !== skill)
          return otherRequiredSkills.every(s => staff.skills.includes(s))
        }).length

        if (servicesUnlocked > 0) {
          let priority: 'high' | 'medium' | 'low' = 'low'
          if (servicesUnlocked >= 5) priority = 'high'
          else if (servicesUnlocked >= 2) priority = 'medium'

          skillGaps.push({
            skillId: skill,
            servicesUnlocked,
            priority
          })
        }
      }
    }

    // Generate recommendations
    const recommendations = skillGaps
      .sort((a, b) => b.servicesUnlocked - a.servicesUnlocked)
      .slice(0, 5) // Top 5 recommendations
      .map(gap => ({
        skillId: gap.skillId,
        reason: `Learning this skill would qualify you for ${gap.servicesUnlocked} additional services`,
        impact: gap.priority === 'high' ? 'High impact - significantly expands service capabilities' :
                gap.priority === 'medium' ? 'Medium impact - adds valuable service options' :
                'Low impact - provides additional flexibility'
      }))

    return {
      currentSkills: staff.skills,
      availableServices: currentServices.length,
      skillGaps: skillGaps.sort((a, b) => b.servicesUnlocked - a.servicesUnlocked),
      recommendations
    }
  }

  /**
   * Suggest optimal staff assignments for multiple services
   */
  async suggestStaffAssignments(
    tenantId: string,
    serviceIds: string[],
    options: SkillMatchingOptions = {}
  ): Promise<Array<{
    serviceId: string
    recommendedStaff: SkillMatch[]
    alternativeStaff: SkillMatch[]
  }>> {
    const results: Array<{
      serviceId: string
      recommendedStaff: SkillMatch[]
      alternativeStaff: SkillMatch[]
    }> = []

    for (const serviceId of serviceIds) {
      const matches = await this.findQualifiedStaff(tenantId, serviceId, options)
      
      // Split into recommended (high match) and alternative (lower match)
      const recommended = matches.filter(m => m.matchScore >= 80)
      const alternative = matches.filter(m => m.matchScore >= 60 && m.matchScore < 80)

      results.push({
        serviceId,
        recommendedStaff: recommended,
        alternativeStaff: alternative
      })
    }

    return results
  }
}

export const skillMatchingService = new SkillMatchingService(
  new StaffManager(),
  new ServiceManager()
)