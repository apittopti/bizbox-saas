import { Service } from '../models/service';
import { Staff } from '../models/staff';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  serviceId: string;
  isAvailable: boolean;
  price?: number;
}

export interface AvailabilityOptions {
  date?: Date;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  staffIds?: string[];
  includeUnavailable?: boolean;
  slotDuration?: number; // in minutes, defaults to service duration
}

export interface BookingConflict {
  type: 'appointment' | 'break' | 'time-off' | 'outside-hours';
  startTime: Date;
  endTime: Date;
  description: string;
}

export class AvailabilityCalculator {
  private appointments: Map<string, Array<{ startTime: Date; endTime: Date; staffId: string }>> = new Map();

  /**
   * Calculate available time slots for a service
   */
  async calculateAvailability(
    service: Service,
    availableStaff: Staff[],
    options: AvailabilityOptions = {}
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const slotDuration = options.slotDuration || service.duration;
    
    // Determine date range
    const startDate = options.date || options.dateRange?.startDate || new Date();
    const endDate = options.date || options.dateRange?.endDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filter staff who can perform this service
    const qualifiedStaff = availableStaff.filter(staff => 
      this.canStaffPerformService(staff, service)
    );

    if (qualifiedStaff.length === 0) {
      return slots;
    }

    // Generate slots for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const daySlots = await this.calculateDayAvailability(
        service,
        qualifiedStaff,
        currentDate,
        slotDuration,
        options.includeUnavailable || false
      );
      slots.push(...daySlots);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Calculate availability for a specific day
   */
  private async calculateDayAvailability(
    service: Service,
    staff: Staff[],
    date: Date,
    slotDuration: number,
    includeUnavailable: boolean
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const dayOfWeek = date.getDay();

    for (const staffMember of staff) {
      // Get working hours for this day
      const workingDay = staffMember.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      if (!workingDay || !workingDay.isWorking) {
        continue;
      }

      // Generate time slots for this staff member
      const staffSlots = this.generateStaffTimeSlots(
        service,
        staffMember,
        date,
        workingDay,
        slotDuration,
        includeUnavailable
      );

      slots.push(...staffSlots);
    }

    return slots;
  }

  /**
   * Generate time slots for a specific staff member
   */
  private generateStaffTimeSlots(
    service: Service,
    staff: Staff,
    date: Date,
    workingDay: any,
    slotDuration: number,
    includeUnavailable: boolean
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const totalDuration = service.duration + service.bufferBefore + service.bufferAfter;
    
    // Convert working hours to minutes
    const startMinutes = this.timeToMinutes(workingDay.startTime);
    const endMinutes = this.timeToMinutes(workingDay.endTime);

    // Generate slots at 15-minute intervals
    for (let minutes = startMinutes; minutes <= endMinutes - totalDuration; minutes += 15) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
      const totalSlotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

      // Check if this slot is available
      const conflicts = this.checkConflicts(staff, slotStart, totalSlotEnd, workingDay);
      const isAvailable = conflicts.length === 0;

      if (isAvailable || includeUnavailable) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          staffId: staff.id,
          serviceId: service.id,
          isAvailable,
          price: service.price,
        });
      }
    }

    return slots;
  }

  /**
   * Check for booking conflicts
   */
  checkConflicts(
    staff: Staff,
    startTime: Date,
    endTime: Date,
    workingDay?: any
  ): BookingConflict[] {
    const conflicts: BookingConflict[] = [];

    // Check existing appointments
    const staffAppointments = this.appointments.get(staff.id) || [];
    for (const appointment of staffAppointments) {
      if (this.timeOverlaps(startTime, endTime, appointment.startTime, appointment.endTime)) {
        conflicts.push({
          type: 'appointment',
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          description: 'Existing appointment',
        });
      }
    }

    // Check breaks
    if (workingDay?.breaks) {
      for (const breakPeriod of workingDay.breaks) {
        const breakStart = new Date(startTime);
        breakStart.setHours(...this.parseTime(breakPeriod.startTime), 0, 0);
        const breakEnd = new Date(startTime);
        breakEnd.setHours(...this.parseTime(breakPeriod.endTime), 0, 0);

        if (this.timeOverlaps(startTime, endTime, breakStart, breakEnd)) {
          conflicts.push({
            type: 'break',
            startTime: breakStart,
            endTime: breakEnd,
            description: breakPeriod.name || 'Break',
          });
        }
      }
    }

    // Check time off
    const dateOnly = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
    for (const timeOff of staff.timeOff) {
      if (timeOff.isApproved && dateOnly >= timeOff.startDate && dateOnly <= timeOff.endDate) {
        conflicts.push({
          type: 'time-off',
          startTime: timeOff.startDate,
          endTime: timeOff.endDate,
          description: `${timeOff.type}: ${timeOff.reason || ''}`,
        });
      }
    }

    return conflicts;
  }

  /**
   * Find the next available slot for a service
   */
  async findNextAvailableSlot(
    service: Service,
    staff: Staff[],
    fromDate: Date = new Date()
  ): Promise<TimeSlot | null> {
    const maxDaysAhead = service.maxAdvanceBooking || 30;
    const endDate = new Date(fromDate.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);

    const availability = await this.calculateAvailability(service, staff, {
      dateRange: { startDate: fromDate, endDate },
    });

    const availableSlots = availability.filter(slot => slot.isAvailable);
    return availableSlots.length > 0 ? availableSlots[0] : null;
  }

  /**
   * Get optimal staff assignment for a time slot
   */
  getOptimalStaffAssignment(
    service: Service,
    availableStaff: Staff[],
    requestedTime: Date
  ): {
    staff: Staff | null;
    score: number;
    reasons: string[];
  } {
    let bestStaff: Staff | null = null;
    let bestScore = -1;
    const reasons: string[] = [];

    for (const staff of availableStaff) {
      if (!this.canStaffPerformService(staff, service)) {
        continue;
      }

      const availability = staff.isActive ? 1 : 0;
      if (!availability) continue;

      let score = 0;
      const staffReasons: string[] = [];

      // Score based on skill match
      const skillMatch = this.calculateSkillMatch(staff, service);
      score += skillMatch * 40;
      if (skillMatch > 0.8) staffReasons.push('Excellent skill match');

      // Score based on specialization
      const specializationMatch = this.calculateSpecializationMatch(staff, service);
      score += specializationMatch * 30;
      if (specializationMatch > 0) staffReasons.push('Relevant specialization');

      // Score based on availability (no conflicts)
      const totalDuration = service.duration + service.bufferBefore + service.bufferAfter;
      const endTime = new Date(requestedTime.getTime() + totalDuration * 60000);
      const conflicts = this.checkConflicts(staff, requestedTime, endTime);
      
      if (conflicts.length === 0) {
        score += 30;
        staffReasons.push('No scheduling conflicts');
      } else {
        continue; // Skip staff with conflicts
      }

      if (score > bestScore) {
        bestScore = score;
        bestStaff = staff;
        reasons.length = 0;
        reasons.push(...staffReasons);
      }
    }

    return {
      staff: bestStaff,
      score: bestScore,
      reasons,
    };
  }

  /**
   * Add an appointment to the calendar (for conflict checking)
   */
  addAppointment(staffId: string, startTime: Date, endTime: Date): void {
    if (!this.appointments.has(staffId)) {
      this.appointments.set(staffId, []);
    }
    
    this.appointments.get(staffId)!.push({ startTime, endTime, staffId });
  }

  /**
   * Remove an appointment from the calendar
   */
  removeAppointment(staffId: string, startTime: Date, endTime: Date): void {
    const appointments = this.appointments.get(staffId);
    if (!appointments) return;

    const index = appointments.findIndex(apt => 
      apt.startTime.getTime() === startTime.getTime() && 
      apt.endTime.getTime() === endTime.getTime()
    );

    if (index !== -1) {
      appointments.splice(index, 1);
    }
  }

  /**
   * Check if staff can perform a service
   */
  private canStaffPerformService(staff: Staff, service: Service): boolean {
    if (!staff.isActive) return false;
    
    // Check if staff has all required skills
    return service.requiredSkills.every(skill => staff.skills.includes(skill));
  }

  /**
   * Calculate skill match score (0-1)
   */
  private calculateSkillMatch(staff: Staff, service: Service): number {
    if (service.requiredSkills.length === 0) return 1;

    const matchingSkills = service.requiredSkills.filter(skill => 
      staff.skills.includes(skill)
    );

    return matchingSkills.length / service.requiredSkills.length;
  }

  /**
   * Calculate specialization match score (0-1)
   */
  private calculateSpecializationMatch(staff: Staff, service: Service): number {
    if (!service.category || staff.specializations.length === 0) return 0;

    return staff.specializations.includes(service.category) ? 1 : 0;
  }

  /**
   * Check if two time periods overlap
   */
  private timeOverlaps(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Parse time string to [hours, minutes]
   */
  private parseTime(time: string): [number, number] {
    const [hours, minutes] = time.split(':').map(Number);
    return [hours, minutes];
  }
}

export const availabilityCalculator = new AvailabilityCalculator();