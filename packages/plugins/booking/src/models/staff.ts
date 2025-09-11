import { z } from 'zod';

export interface Staff {
  id: string;
  tenantId: string;
  userId?: string; // Link to user account if staff member has login
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  specializations: string[];
  hourlyRate?: number;
  commissionRate?: number; // percentage
  isActive: boolean;
  avatar?: string;
  bio?: string;
  workingHours: WorkingHours[];
  timeOff: TimeOffPeriod[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isWorking: boolean;
  breaks?: Array<{
    startTime: string;
    endTime: string;
    name?: string;
  }>;
}

export interface TimeOffPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  type: 'vacation' | 'sick' | 'personal' | 'training' | 'other';
  reason?: string;
  isApproved: boolean;
  approvedBy?: string;
  createdAt: Date;
}

export interface StaffAvailability {
  staffId: string;
  date: Date;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    reason?: string; // 'booked', 'break', 'time-off', etc.
  }>;
}

export const staffSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  skills: z.array(z.string()).default([]),
  specializations: z.array(z.string()).default([]),
  hourlyRate: z.number().min(0).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().default(true),
  avatar: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
  workingHours: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isWorking: z.boolean(),
    breaks: z.array(z.object({
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      name: z.string().optional(),
    })).optional(),
  })).default([]),
  timeOff: z.array(z.object({
    id: z.string().uuid(),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(['vacation', 'sick', 'personal', 'training', 'other']),
    reason: z.string().optional(),
    isApproved: z.boolean().default(false),
    approvedBy: z.string().uuid().optional(),
    createdAt: z.date(),
  })).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createStaffSchema = staffSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStaffSchema = createStaffSchema.partial();

export class StaffManager {
  private staff: Map<string, Staff> = new Map();

  /**
   * Create a new staff member
   */
  async createStaff(data: z.infer<typeof createStaffSchema>): Promise<Staff> {
    const validation = createStaffSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Staff validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    const staffMember: Staff = {
      id: this.generateId(),
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.staff.set(staffMember.id, staffMember);
    return staffMember;
  }

  /**
   * Update an existing staff member
   */
  async updateStaff(id: string, updates: z.infer<typeof updateStaffSchema>): Promise<Staff | null> {
    const staffMember = this.staff.get(id);
    if (!staffMember) {
      return null;
    }

    const validation = updateStaffSchema.safeParse(updates);
    if (!validation.success) {
      throw new Error(`Staff validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    const updatedStaff: Staff = {
      ...staffMember,
      ...validation.data,
      updatedAt: new Date(),
    };

    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  /**
   * Get staff member by ID
   */
  async getStaff(id: string): Promise<Staff | null> {
    return this.staff.get(id) || null;
  }

  /**
   * Get all staff for a tenant
   */
  async getStaffByTenant(tenantId: string): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(
      staff => staff.tenantId === tenantId
    );
  }

  /**
   * Get active staff for a tenant
   */
  async getActiveStaff(tenantId: string): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(
      staff => staff.tenantId === tenantId && staff.isActive
    );
  }

  /**
   * Get staff members with specific skills
   */
  async getStaffWithSkills(tenantId: string, requiredSkills: string[]): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(staff => {
      if (staff.tenantId !== tenantId || !staff.isActive) {
        return false;
      }

      // Check if staff has all required skills
      return requiredSkills.every(skill => staff.skills.includes(skill));
    });
  }

  /**
   * Delete a staff member
   */
  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  /**
   * Add time off for a staff member
   */
  async addTimeOff(staffId: string, timeOff: Omit<TimeOffPeriod, 'id' | 'createdAt'>): Promise<Staff | null> {
    const staffMember = this.staff.get(staffId);
    if (!staffMember) {
      return null;
    }

    const newTimeOff: TimeOffPeriod = {
      id: this.generateId(),
      ...timeOff,
      createdAt: new Date(),
    };

    const updatedStaff: Staff = {
      ...staffMember,
      timeOff: [...staffMember.timeOff, newTimeOff],
      updatedAt: new Date(),
    };

    this.staff.set(staffId, updatedStaff);
    return updatedStaff;
  }

  /**
   * Update working hours for a staff member
   */
  async updateWorkingHours(staffId: string, workingHours: WorkingHours[]): Promise<Staff | null> {
    const staffMember = this.staff.get(staffId);
    if (!staffMember) {
      return null;
    }

    const updatedStaff: Staff = {
      ...staffMember,
      workingHours,
      updatedAt: new Date(),
    };

    this.staff.set(staffId, updatedStaff);
    return updatedStaff;
  }

  /**
   * Check if staff member is available at a specific time
   */
  isAvailable(staff: Staff, dateTime: Date, durationMinutes: number): {
    available: boolean;
    reason?: string;
  } {
    const dayOfWeek = dateTime.getDay();
    const timeString = this.formatTime(dateTime);
    const endTime = new Date(dateTime.getTime() + durationMinutes * 60000);
    const endTimeString = this.formatTime(endTime);

    // Check working hours
    const workingDay = staff.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
    if (!workingDay || !workingDay.isWorking) {
      return { available: false, reason: 'Not working on this day' };
    }

    // Check if time falls within working hours
    if (timeString < workingDay.startTime || endTimeString > workingDay.endTime) {
      return { available: false, reason: 'Outside working hours' };
    }

    // Check breaks
    if (workingDay.breaks) {
      for (const breakPeriod of workingDay.breaks) {
        if (this.timeOverlaps(timeString, endTimeString, breakPeriod.startTime, breakPeriod.endTime)) {
          return { available: false, reason: `Break time: ${breakPeriod.name || 'Break'}` };
        }
      }
    }

    // Check time off
    const dateOnly = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate());
    for (const timeOff of staff.timeOff) {
      if (timeOff.isApproved && dateOnly >= timeOff.startDate && dateOnly <= timeOff.endDate) {
        return { available: false, reason: `Time off: ${timeOff.type}` };
      }
    }

    return { available: true };
  }

  /**
   * Get staff availability for a date range
   */
  async getAvailability(staffId: string, startDate: Date, endDate: Date): Promise<StaffAvailability[]> {
    const staffMember = this.staff.get(staffId);
    if (!staffMember) {
      return [];
    }

    const availability: StaffAvailability[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayAvailability = this.getDayAvailability(staffMember, currentDate);
      availability.push(dayAvailability);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  }

  /**
   * Calculate staff utilization for a period
   */
  async calculateUtilization(staffId: string, startDate: Date, endDate: Date): Promise<{
    totalWorkingHours: number;
    bookedHours: number;
    utilizationPercentage: number;
  }> {
    const staffMember = this.staff.get(staffId);
    if (!staffMember) {
      return { totalWorkingHours: 0, bookedHours: 0, utilizationPercentage: 0 };
    }

    // Calculate total working hours in the period
    let totalWorkingHours = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const workingDay = staffMember.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (workingDay && workingDay.isWorking) {
        const dayHours = this.calculateDayWorkingHours(workingDay);
        totalWorkingHours += dayHours;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // In a real implementation, you would calculate booked hours from appointments
    const bookedHours = 0; // Placeholder

    const utilizationPercentage = totalWorkingHours > 0 
      ? (bookedHours / totalWorkingHours) * 100 
      : 0;

    return {
      totalWorkingHours,
      bookedHours,
      utilizationPercentage,
    };
  }

  private getDayAvailability(staff: Staff, date: Date): StaffAvailability {
    const dayOfWeek = date.getDay();
    const workingDay = staff.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
    
    const timeSlots: StaffAvailability['timeSlots'] = [];

    if (!workingDay || !workingDay.isWorking) {
      return {
        staffId: staff.id,
        date,
        timeSlots: [{
          startTime: '00:00',
          endTime: '23:59',
          isAvailable: false,
          reason: 'Not working',
        }],
      };
    }

    // Generate time slots (15-minute intervals)
    const startMinutes = this.timeToMinutes(workingDay.startTime);
    const endMinutes = this.timeToMinutes(workingDay.endTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(minutes + 15);
      
      let isAvailable = true;
      let reason: string | undefined;

      // Check breaks
      if (workingDay.breaks) {
        for (const breakPeriod of workingDay.breaks) {
          if (this.timeOverlaps(slotStart, slotEnd, breakPeriod.startTime, breakPeriod.endTime)) {
            isAvailable = false;
            reason = 'Break';
            break;
          }
        }
      }

      // Check time off
      if (isAvailable) {
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        for (const timeOff of staff.timeOff) {
          if (timeOff.isApproved && dateOnly >= timeOff.startDate && dateOnly <= timeOff.endDate) {
            isAvailable = false;
            reason = timeOff.type;
            break;
          }
        }
      }

      timeSlots.push({
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable,
        reason,
      });
    }

    return {
      staffId: staff.id,
      date,
      timeSlots,
    };
  }

  private calculateDayWorkingHours(workingDay: WorkingHours): number {
    const startMinutes = this.timeToMinutes(workingDay.startTime);
    const endMinutes = this.timeToMinutes(workingDay.endTime);
    let totalMinutes = endMinutes - startMinutes;

    // Subtract break time
    if (workingDay.breaks) {
      for (const breakPeriod of workingDay.breaks) {
        const breakStart = this.timeToMinutes(breakPeriod.startTime);
        const breakEnd = this.timeToMinutes(breakPeriod.endTime);
        totalMinutes -= (breakEnd - breakStart);
      }
    }

    return totalMinutes / 60; // Convert to hours
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  private generateId(): string {
    return 'stf_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const staffManager = new StaffManager();