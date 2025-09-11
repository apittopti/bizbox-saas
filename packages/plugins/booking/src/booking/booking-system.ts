import { z } from 'zod';
import { Service } from '../models/service';
import { Staff } from '../models/staff';
import { AvailabilityCalculator, TimeSlot } from '../availability/availability-calculator';

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes?: string;
  customerNotes?: string;
  internalNotes?: string;
  price: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  remindersSent: ReminderType[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum ReminderType {
  EMAIL_24H = 'email_24h',
  EMAIL_2H = 'email_2h',
  SMS_24H = 'sms_24h',
  SMS_2H = 'sms_2h',
}

export interface BookingRequest {
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId?: string; // Optional - system can auto-assign
  preferredTime: Date;
  alternativeTimes?: Date[];
  notes?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface BookingConfirmation {
  booking: Booking;
  service: Service;
  staff: Staff;
  customer: any;
  confirmationCode: string;
  calendarLinks: {
    google: string;
    outlook: string;
    ics: string;
  };
}

export const bookingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date(),
  status: z.nativeEnum(BookingStatus),
  notes: z.string().max(1000).optional(),
  customerNotes: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('GBP'),
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentId: z.string().optional(),
  cancellationReason: z.string().max(500).optional(),
  cancellationFee: z.number().min(0).optional(),
  remindersSent: z.array(z.nativeEnum(ReminderType)).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class BookingSystem {
  private bookings: Map<string, Booking> = new Map();
  private availabilityCalculator: AvailabilityCalculator;

  constructor(availabilityCalculator: AvailabilityCalculator) {
    this.availabilityCalculator = availabilityCalculator;
  }

  /**
   * Create a new booking
   */
  async createBooking(
    request: BookingRequest,
    service: Service,
    availableStaff: Staff[]
  ): Promise<{
    success: boolean;
    booking?: Booking;
    confirmation?: BookingConfirmation;
    error?: string;
    alternatives?: TimeSlot[];
  }> {
    try {
      // Validate booking request
      const validation = this.validateBookingRequest(request, service);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Find optimal staff assignment if not specified
      let assignedStaff: Staff;
      if (request.staffId) {
        const staff = availableStaff.find(s => s.id === request.staffId);
        if (!staff) {
          return { success: false, error: 'Requested staff member not found' };
        }
        assignedStaff = staff;
      } else {
        const assignment = this.availabilityCalculator.getOptimalStaffAssignment(
          service,
          availableStaff,
          request.preferredTime
        );
        
        if (!assignment.staff) {
          // Try to find alternatives
          const alternatives = await this.findAlternativeSlots(
            service,
            availableStaff,
            request.preferredTime,
            request.alternativeTimes
          );
          
          return {
            success: false,
            error: 'No staff available at requested time',
            alternatives,
          };
        }
        
        assignedStaff = assignment.staff;
      }

      // Check final availability
      const totalDuration = service.duration + service.bufferBefore + service.bufferAfter;
      const endTime = new Date(request.preferredTime.getTime() + service.duration * 60000);
      const totalEndTime = new Date(request.preferredTime.getTime() + totalDuration * 60000);

      const conflicts = this.availabilityCalculator.checkConflicts(
        assignedStaff,
        request.preferredTime,
        totalEndTime
      );

      if (conflicts.length > 0) {
        const alternatives = await this.findAlternativeSlots(
          service,
          availableStaff,
          request.preferredTime,
          request.alternativeTimes
        );
        
        return {
          success: false,
          error: `Time slot not available: ${conflicts[0].description}`,
          alternatives,
        };
      }

      // Create the booking
      const booking: Booking = {
        id: this.generateId(),
        tenantId: request.tenantId,
        customerId: request.customerId,
        serviceId: service.id,
        staffId: assignedStaff.id,
        startTime: request.preferredTime,
        endTime,
        status: BookingStatus.PENDING,
        notes: request.notes,
        price: service.price,
        currency: service.currency,
        paymentStatus: PaymentStatus.PENDING,
        remindersSent: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save booking
      this.bookings.set(booking.id, booking);

      // Add to availability calculator
      this.availabilityCalculator.addAppointment(
        assignedStaff.id,
        request.preferredTime,
        totalEndTime
      );

      // Generate confirmation
      const confirmation = await this.generateConfirmation(booking, service, assignedStaff);

      return {
        success: true,
        booking,
        confirmation,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): Promise<Booking | null> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return null;
    }

    const updatedBooking: Booking = {
      ...booking,
      status,
      updatedAt: new Date(),
    };

    if (status === BookingStatus.CANCELLED && reason) {
      updatedBooking.cancellationReason = reason;
    }

    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    reason: string,
    cancelledBy: 'customer' | 'staff' | 'admin'
  ): Promise<{
    success: boolean;
    booking?: Booking;
    cancellationFee?: number;
    error?: string;
  }> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return { success: false, error: 'Booking is already cancelled' };
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return { success: false, error: 'Cannot cancel completed booking' };
    }

    // Calculate cancellation fee
    const cancellationFee = this.calculateCancellationFee(booking);

    // Update booking
    const updatedBooking: Booking = {
      ...booking,
      status: BookingStatus.CANCELLED,
      cancellationReason: reason,
      cancellationFee,
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, updatedBooking);

    // Remove from availability calculator
    this.availabilityCalculator.removeAppointment(
      booking.staffId,
      booking.startTime,
      booking.endTime
    );

    return {
      success: true,
      booking: updatedBooking,
      cancellationFee,
    };
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(
    bookingId: string,
    newTime: Date,
    service: Service,
    availableStaff: Staff[]
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    alternatives?: TimeSlot[];
  }> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      return { success: false, error: 'Cannot reschedule cancelled or completed booking' };
    }

    // Find staff member
    const staff = availableStaff.find(s => s.id === booking.staffId);
    if (!staff) {
      return { success: false, error: 'Staff member not found' };
    }

    // Check availability at new time
    const totalDuration = service.duration + service.bufferBefore + service.bufferAfter;
    const newEndTime = new Date(newTime.getTime() + service.duration * 60000);
    const totalNewEndTime = new Date(newTime.getTime() + totalDuration * 60000);

    // Temporarily remove current booking from conflicts
    this.availabilityCalculator.removeAppointment(
      booking.staffId,
      booking.startTime,
      booking.endTime
    );

    const conflicts = this.availabilityCalculator.checkConflicts(staff, newTime, totalNewEndTime);

    if (conflicts.length > 0) {
      // Restore original booking
      this.availabilityCalculator.addAppointment(
        booking.staffId,
        booking.startTime,
        booking.endTime
      );

      // Find alternatives
      const alternatives = await this.findAlternativeSlots(service, availableStaff, newTime);

      return {
        success: false,
        error: `New time slot not available: ${conflicts[0].description}`,
        alternatives,
      };
    }

    // Update booking
    const updatedBooking: Booking = {
      ...booking,
      startTime: newTime,
      endTime: newEndTime,
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, updatedBooking);

    // Add new appointment time
    this.availabilityCalculator.addAppointment(
      booking.staffId,
      newTime,
      totalNewEndTime
    );

    return {
      success: true,
      booking: updatedBooking,
    };
  }

  /**
   * Get booking by ID
   */
  async getBooking(id: string): Promise<Booking | null> {
    return this.bookings.get(id) || null;
  }

  /**
   * Get bookings for a tenant
   */
  async getBookingsByTenant(
    tenantId: string,
    filters?: {
      status?: BookingStatus;
      staffId?: string;
      customerId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<Booking[]> {
    let bookings = Array.from(this.bookings.values()).filter(
      booking => booking.tenantId === tenantId
    );

    if (filters) {
      if (filters.status) {
        bookings = bookings.filter(b => b.status === filters.status);
      }
      if (filters.staffId) {
        bookings = bookings.filter(b => b.staffId === filters.staffId);
      }
      if (filters.customerId) {
        bookings = bookings.filter(b => b.customerId === filters.customerId);
      }
      if (filters.dateFrom) {
        bookings = bookings.filter(b => b.startTime >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        bookings = bookings.filter(b => b.startTime <= filters.dateTo!);
      }
    }

    return bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Get upcoming bookings for a staff member
   */
  async getUpcomingBookingsForStaff(staffId: string, days = 7): Promise<Booking[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.bookings.values()).filter(booking =>
      booking.staffId === staffId &&
      booking.startTime >= now &&
      booking.startTime <= endDate &&
      booking.status !== BookingStatus.CANCELLED
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Send booking reminders
   */
  async sendReminders(): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    for (const booking of this.bookings.values()) {
      if (booking.status !== BookingStatus.CONFIRMED) continue;

      // 24-hour reminder
      if (booking.startTime <= in24Hours && 
          booking.startTime > now &&
          !booking.remindersSent.includes(ReminderType.EMAIL_24H)) {
        
        await this.sendReminder(booking, ReminderType.EMAIL_24H);
        booking.remindersSent.push(ReminderType.EMAIL_24H);
        booking.updatedAt = new Date();
      }

      // 2-hour reminder
      if (booking.startTime <= in2Hours && 
          booking.startTime > now &&
          !booking.remindersSent.includes(ReminderType.EMAIL_2H)) {
        
        await this.sendReminder(booking, ReminderType.EMAIL_2H);
        booking.remindersSent.push(ReminderType.EMAIL_2H);
        booking.updatedAt = new Date();
      }
    }
  }

  private validateBookingRequest(request: BookingRequest, service: Service): {
    valid: boolean;
    error?: string;
  } {
    // Check service timing constraints
    const validation = service.validateBookingTime ? 
      service.validateBookingTime(request.preferredTime) : 
      { valid: true, errors: [] };

    if (!validation.valid) {
      return { valid: false, error: validation.errors.join(', ') };
    }

    // Check if booking is in the past
    if (request.preferredTime <= new Date()) {
      return { valid: false, error: 'Cannot book appointments in the past' };
    }

    return { valid: true };
  }

  private async findAlternativeSlots(
    service: Service,
    staff: Staff[],
    preferredTime: Date,
    alternativeTimes?: Date[]
  ): Promise<TimeSlot[]> {
    const alternatives: TimeSlot[] = [];
    
    // Check alternative times provided by customer
    if (alternativeTimes) {
      for (const altTime of alternativeTimes) {
        const slots = await this.availabilityCalculator.calculateAvailability(
          service,
          staff,
          { date: altTime }
        );
        
        const availableSlots = slots.filter(slot => 
          slot.isAvailable && 
          Math.abs(slot.startTime.getTime() - altTime.getTime()) < 30 * 60 * 1000 // Within 30 minutes
        );
        
        alternatives.push(...availableSlots);
      }
    }

    // Find next available slots
    const nextSlot = await this.availabilityCalculator.findNextAvailableSlot(
      service,
      staff,
      preferredTime
    );
    
    if (nextSlot) {
      alternatives.push(nextSlot);
    }

    return alternatives.slice(0, 5); // Return up to 5 alternatives
  }

  private calculateCancellationFee(booking: Booking): number {
    const hoursUntilBooking = (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    // Example cancellation policy - would be configurable per service
    if (hoursUntilBooking < 2) {
      return booking.price; // 100% fee
    } else if (hoursUntilBooking < 24) {
      return booking.price * 0.5; // 50% fee
    }
    
    return 0; // No fee
  }

  private async generateConfirmation(
    booking: Booking,
    service: Service,
    staff: Staff
  ): Promise<BookingConfirmation> {
    const confirmationCode = this.generateConfirmationCode();
    
    // Generate calendar links
    const calendarLinks = this.generateCalendarLinks(booking, service, staff);

    return {
      booking,
      service,
      staff,
      customer: null, // Would be fetched from customer service
      confirmationCode,
      calendarLinks,
    };
  }

  private generateCalendarLinks(booking: Booking, service: Service, staff: Staff) {
    const startTime = booking.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = booking.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`${service.name} with ${staff.name}`);
    const description = encodeURIComponent(`Booking confirmation: ${booking.id}`);

    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${description}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${description}`,
      ics: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`,
    };
  }

  private async sendReminder(booking: Booking, type: ReminderType): Promise<void> {
    // Implementation would integrate with email/SMS service
    console.log(`Sending ${type} reminder for booking ${booking.id}`);
  }

  private generateId(): string {
    return 'bkg_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

export const bookingSystem = new BookingSystem(new AvailabilityCalculator());