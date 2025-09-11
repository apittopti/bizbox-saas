import { z } from 'zod'
import { BaseModel } from '@bizbox/core-database'

export interface Skill {
  id: string
  tenantId: string
  name: string
  description?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  certificationRequired: boolean
  createdAt: Date
  updatedAt: Date
}

export const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  certificationRequired: z.boolean().default(false),
})

export class SkillModel extends BaseModel<Skill> {
  constructor() {
    super('skills')
  }

  async createSkill(tenantId: string, skillData: z.infer<typeof SkillSchema>): Promise<Skill> {
    const validation = SkillSchema.safeParse(skillData)
    if (!validation.success) {
      throw new Error(`Invalid skill data: ${validation.error.message}`)
    }

    const skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      ...validation.data,
    }

    return this.create(skill)
  }

  async updateSkill(id: string, tenantId: string, updates: Partial<z.infer<typeof SkillSchema>>): Promise<Skill | null> {
    if (Object.keys(updates).length > 0) {
      const validation = SkillSchema.partial().safeParse(updates)
      if (!validation.success) {
        throw new Error(`Invalid skill updates: ${validation.error.message}`)
      }
    }

    return this.update(id, updates, { tenantId })
  }

  async getSkillsByCategory(tenantId: string, category: string): Promise<Skill[]> {
    return this.findMany({ tenantId, category })
  }

  async getSkillsByLevel(tenantId: string, level: Skill['level']): Promise<Skill[]> {
    return this.findMany({ tenantId, level })
  }

  async searchSkills(tenantId: string, query: string): Promise<Skill[]> {
    // In a real implementation, this would use full-text search
    const skills = await this.findMany({ tenantId })
    return skills.filter(skill => 
      skill.name.toLowerCase().includes(query.toLowerCase()) ||
      skill.description?.toLowerCase().includes(query.toLowerCase())
    )
  }

  async deleteSkill(id: string, tenantId: string): Promise<boolean> {
    return this.delete(id, { tenantId })
  }
}

export const skillModel = new SkillModel()