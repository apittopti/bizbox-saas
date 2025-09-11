import { EventEmitter } from 'events'
import { SectionTemplate } from './section-templates'

export interface TemplateCollection {
  id: string
  name: string
  description: string
  ownerId: string
  isPublic: boolean
  templateIds: string[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
  collaborators: Array<{
    userId: string
    role: 'viewer' | 'editor' | 'admin'
    addedAt: Date
  }>
  metadata: {
    totalTemplates: number
    totalDownloads: number
    averageRating: number
    category: string
  }
}

export interface SharingPermission {
  templateId: string
  userId: string
  grantedBy: string
  permissions: ('view' | 'use' | 'edit' | 'share')[]
  expiresAt?: Date
  createdAt: Date
}

export interface TemplateShare {
  id: string
  templateId: string
  sharedBy: string
  sharedWith: string[]
  shareType: 'direct' | 'link' | 'collection'
  permissions: ('view' | 'use' | 'edit')[]
  message?: string
  expiresAt?: Date
  createdAt: Date
  accessCount: number
  lastAccessedAt?: Date
}

export interface TemplateActivity {
  id: string
  templateId: string
  userId: string
  action: 'created' | 'updated' | 'shared' | 'used' | 'rated' | 'favorited' | 'downloaded'
  metadata: Record<string, any>
  timestamp: Date
}

export class TemplateSharingService extends EventEmitter {
  private collections: Map<string, TemplateCollection> = new Map()
  private permissions: Map<string, SharingPermission[]> = new Map()
  private shares: Map<string, TemplateShare> = new Map()
  private activities: TemplateActivity[] = []

  constructor() {
    super()
  }

  /**
   * Create a new template collection
   */
  async createCollection(
    ownerId: string,
    data: {
      name: string
      description: string
      isPublic?: boolean
      tags?: string[]
      category?: string
    }
  ): Promise<TemplateCollection> {
    const collection: TemplateCollection = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      ownerId,
      isPublic: data.isPublic || false,
      templateIds: [],
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      collaborators: [],
      metadata: {
        totalTemplates: 0,
        totalDownloads: 0,
        averageRating: 0,
        category: data.category || 'general'
      }
    }

    this.collections.set(collection.id, collection)
    
    await this.logActivity({
      templateId: collection.id,
      userId: ownerId,
      action: 'created',
      metadata: { type: 'collection', name: collection.name }
    })

    this.emit('collection:created', collection)
    return collection
  }

  /**
   * Add templates to a collection
   */
  async addTemplatesToCollection(
    collectionId: string,
    templateIds: string[],
    userId: string
  ): Promise<boolean> {
    const collection = this.collections.get(collectionId)
    if (!collection) {
      throw new Error('Collection not found')
    }

    if (!this.canEditCollection(collection, userId)) {
      throw new Error('Insufficient permissions to edit collection')
    }

    // Add unique template IDs
    const newTemplateIds = templateIds.filter(id => !collection.templateIds.includes(id))
    collection.templateIds.push(...newTemplateIds)
    collection.metadata.totalTemplates = collection.templateIds.length
    collection.updatedAt = new Date()

    await this.logActivity({
      templateId: collectionId,
      userId,
      action: 'updated',
      metadata: { 
        type: 'collection', 
        action: 'added_templates',
        templateIds: newTemplateIds
      }
    })

    this.emit('collection:updated', collection)
    return true
  }

  /**
   * Share a template with specific users
   */
  async shareTemplate(
    templateId: string,
    sharedBy: string,
    shareWith: string[],
    options: {
      permissions?: ('view' | 'use' | 'edit')[]
      message?: string
      expiresAt?: Date
    } = {}
  ): Promise<TemplateShare> {
    const share: TemplateShare = {
      id: this.generateId(),
      templateId,
      sharedBy,
      sharedWith: shareWith,
      shareType: 'direct',
      permissions: options.permissions || ['view', 'use'],
      message: options.message,
      expiresAt: options.expiresAt,
      createdAt: new Date(),
      accessCount: 0
    }

    this.shares.set(share.id, share)

    // Create individual permissions for each user
    for (const userId of shareWith) {
      await this.grantPermission(templateId, userId, sharedBy, share.permissions, options.expiresAt)
    }

    await this.logActivity({
      templateId,
      userId: sharedBy,
      action: 'shared',
      metadata: { 
        shareType: 'direct',
        sharedWith: shareWith.length,
        permissions: share.permissions
      }
    })

    this.emit('template:shared', share)
    return share
  }

  /**
   * Create a shareable link for a template
   */
  async createShareableLink(
    templateId: string,
    userId: string,
    options: {
      permissions?: ('view' | 'use')[]
      expiresAt?: Date
      maxUses?: number
    } = {}
  ): Promise<{
    shareId: string
    shareUrl: string
    permissions: string[]
    expiresAt?: Date
  }> {
    const share: TemplateShare = {
      id: this.generateId(),
      templateId,
      sharedBy: userId,
      sharedWith: [], // Public link
      shareType: 'link',
      permissions: options.permissions || ['view', 'use'],
      expiresAt: options.expiresAt,
      createdAt: new Date(),
      accessCount: 0
    }

    this.shares.set(share.id, share)

    const shareUrl = `${process.env.BASE_URL}/templates/shared/${share.id}`

    await this.logActivity({
      templateId,
      userId,
      action: 'shared',
      metadata: { 
        shareType: 'link',
        permissions: share.permissions,
        expiresAt: options.expiresAt
      }
    })

    return {
      shareId: share.id,
      shareUrl,
      permissions: share.permissions,
      expiresAt: options.expiresAt
    }
  }

  /**
   * Access a shared template via link
   */
  async accessSharedTemplate(
    shareId: string,
    userId?: string
  ): Promise<{
    template: SectionTemplate | null
    permissions: string[]
    canAccess: boolean
    message?: string
  }> {
    const share = this.shares.get(shareId)
    if (!share) {
      return {
        template: null,
        permissions: [],
        canAccess: false,
        message: 'Share link not found or expired'
      }
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      return {
        template: null,
        permissions: [],
        canAccess: false,
        message: 'Share link has expired'
      }
    }

    // Update access count
    share.accessCount++
    share.lastAccessedAt = new Date()

    // Log access
    if (userId) {
      await this.logActivity({
        templateId: share.templateId,
        userId,
        action: 'used',
        metadata: { 
          shareType: 'link',
          shareId: share.id
        }
      })
    }

    // In a real implementation, this would fetch the actual template
    // For now, return mock data
    return {
      template: null, // Would fetch from template manager
      permissions: share.permissions,
      canAccess: true
    }
  }

  /**
   * Get user's collections
   */
  async getUserCollections(
    userId: string,
    includeShared: boolean = true
  ): Promise<TemplateCollection[]> {
    let collections = Array.from(this.collections.values())

    // Filter by ownership
    collections = collections.filter(collection => 
      collection.ownerId === userId ||
      (includeShared && this.canViewCollection(collection, userId))
    )

    // Sort by updated date
    collections.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    return collections
  }

  /**
   * Get templates shared with a user
   */
  async getSharedTemplates(userId: string): Promise<Array<{
    templateId: string
    sharedBy: string
    permissions: string[]
    sharedAt: Date
    message?: string
  }>> {
    const userPermissions = this.permissions.get(userId) || []
    
    return userPermissions
      .filter(permission => !this.isExpired(permission))
      .map(permission => ({
        templateId: permission.templateId,
        sharedBy: permission.grantedBy,
        permissions: permission.permissions,
        sharedAt: permission.createdAt,
        message: undefined // Would come from share record
      }))
  }

  /**
   * Get template sharing analytics
   */
  async getTemplateAnalytics(
    templateId: string,
    userId: string
  ): Promise<{
    totalShares: number
    totalAccess: number
    shareBreakdown: Array<{
      type: 'direct' | 'link' | 'collection'
      count: number
    }>
    recentActivity: TemplateActivity[]
    topCollaborators: Array<{
      userId: string
      activityCount: number
      lastActivity: Date
    }>
  }> {
    const templateShares = Array.from(this.shares.values())
      .filter(share => share.templateId === templateId)

    const templateActivities = this.activities
      .filter(activity => activity.templateId === templateId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const shareBreakdown = templateShares.reduce((acc, share) => {
      const existing = acc.find(item => item.type === share.shareType)
      if (existing) {
        existing.count++
      } else {
        acc.push({ type: share.shareType, count: 1 })
      }
      return acc
    }, [] as Array<{ type: 'direct' | 'link' | 'collection'; count: number }>)

    // Calculate collaborator activity
    const collaboratorActivity = new Map<string, { count: number; lastActivity: Date }>()
    templateActivities.forEach(activity => {
      if (activity.userId !== userId) {
        const existing = collaboratorActivity.get(activity.userId)
        if (existing) {
          existing.count++
          if (activity.timestamp > existing.lastActivity) {
            existing.lastActivity = activity.timestamp
          }
        } else {
          collaboratorActivity.set(activity.userId, {
            count: 1,
            lastActivity: activity.timestamp
          })
        }
      }
    })

    const topCollaborators = Array.from(collaboratorActivity.entries())
      .map(([userId, data]) => ({
        userId,
        activityCount: data.count,
        lastActivity: data.lastActivity
      }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 10)

    return {
      totalShares: templateShares.length,
      totalAccess: templateShares.reduce((sum, share) => sum + share.accessCount, 0),
      shareBreakdown,
      recentActivity: templateActivities.slice(0, 20),
      topCollaborators
    }
  }

  /**
   * Revoke template access
   */
  async revokeAccess(
    templateId: string,
    userId: string,
    revokedBy: string
  ): Promise<boolean> {
    const userPermissions = this.permissions.get(userId) || []
    const templatePermissions = userPermissions.filter(p => p.templateId === templateId)

    if (templatePermissions.length === 0) {
      return false
    }

    // Check if revoker has permission to revoke
    const canRevoke = templatePermissions.some(p => 
      p.grantedBy === revokedBy || 
      this.isTemplateOwner(templateId, revokedBy)
    )

    if (!canRevoke) {
      throw new Error('Insufficient permissions to revoke access')
    }

    // Remove permissions
    const updatedPermissions = userPermissions.filter(p => p.templateId !== templateId)
    this.permissions.set(userId, updatedPermissions)

    await this.logActivity({
      templateId,
      userId: revokedBy,
      action: 'updated',
      metadata: { 
        action: 'revoked_access',
        revokedFrom: userId
      }
    })

    this.emit('access:revoked', { templateId, userId, revokedBy })
    return true
  }

  /**
   * Update collection collaborators
   */
  async updateCollectionCollaborators(
    collectionId: string,
    collaborators: Array<{
      userId: string
      role: 'viewer' | 'editor' | 'admin'
    }>,
    updatedBy: string
  ): Promise<boolean> {
    const collection = this.collections.get(collectionId)
    if (!collection) {
      throw new Error('Collection not found')
    }

    if (collection.ownerId !== updatedBy) {
      throw new Error('Only collection owner can update collaborators')
    }

    collection.collaborators = collaborators.map(collab => ({
      ...collab,
      addedAt: new Date()
    }))
    collection.updatedAt = new Date()

    await this.logActivity({
      templateId: collectionId,
      userId: updatedBy,
      action: 'updated',
      metadata: { 
        type: 'collection',
        action: 'updated_collaborators',
        collaboratorCount: collaborators.length
      }
    })

    this.emit('collection:collaborators_updated', collection)
    return true
  }

  /**
   * Grant permission to a user for a template
   */
  private async grantPermission(
    templateId: string,
    userId: string,
    grantedBy: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<void> {
    const permission: SharingPermission = {
      templateId,
      userId,
      grantedBy,
      permissions: permissions as ('view' | 'use' | 'edit' | 'share')[],
      expiresAt,
      createdAt: new Date()
    }

    const userPermissions = this.permissions.get(userId) || []
    
    // Remove existing permissions for this template
    const filteredPermissions = userPermissions.filter(p => p.templateId !== templateId)
    filteredPermissions.push(permission)
    
    this.permissions.set(userId, filteredPermissions)
  }

  /**
   * Check if user can view collection
   */
  private canViewCollection(collection: TemplateCollection, userId: string): boolean {
    if (collection.ownerId === userId || collection.isPublic) {
      return true
    }

    return collection.collaborators.some(collab => 
      collab.userId === userId && 
      ['viewer', 'editor', 'admin'].includes(collab.role)
    )
  }

  /**
   * Check if user can edit collection
   */
  private canEditCollection(collection: TemplateCollection, userId: string): boolean {
    if (collection.ownerId === userId) {
      return true
    }

    return collection.collaborators.some(collab => 
      collab.userId === userId && 
      ['editor', 'admin'].includes(collab.role)
    )
  }

  /**
   * Check if user is template owner
   */
  private isTemplateOwner(templateId: string, userId: string): boolean {
    // In a real implementation, this would check the template ownership
    return false
  }

  /**
   * Check if permission has expired
   */
  private isExpired(permission: SharingPermission): boolean {
    return permission.expiresAt ? permission.expiresAt < new Date() : false
  }

  /**
   * Log activity
   */
  private async logActivity(activity: Omit<TemplateActivity, 'id' | 'timestamp'>): Promise<void> {
    const fullActivity: TemplateActivity = {
      ...activity,
      id: this.generateId(),
      timestamp: new Date()
    }

    this.activities.push(fullActivity)

    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000)
    }

    this.emit('activity:logged', fullActivity)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'share_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}

export const templateSharingService = new TemplateSharingService()