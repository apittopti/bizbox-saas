import { BizBoxWidget } from '../../core/widget-base';
import { BookingWidgetConfig, Service, Staff, TimeSlot, BookingData, BookingResult } from '../../types';

export class BookingWidget extends BizBoxWidget {
  private services: Service[] = [];
  private staff: Staff[] = [];
  private selectedService?: Service;
  private selectedStaff?: Staff;
  private selectedDate?: Date;
  private selectedTimeSlot?: TimeSlot;
  private availableSlots: TimeSlot[] = [];
  
  private currentStep: 'service' | 'staff' | 'datetime' | 'details' | 'confirmation' = 'service';

  constructor(containerId: string, config: BookingWidgetConfig) {
    super(containerId, config);
  }

  protected get bookingConfig(): BookingWidgetConfig {
    return this.config as BookingWidgetConfig;
  }

  async render(): Promise<void> {
    this.container.innerHTML = '';
    
    const widgetElement = this.createElement('div', 'bizbox-booking');
    
    // Create progress indicator
    const progressElement = this.createProgressIndicator();
    widgetElement.appendChild(progressElement);
    
    // Create main content area
    const contentElement = this.createElement('div', 'bizbox-booking__content');
    widgetElement.appendChild(contentElement);
    
    // Render current step
    await this.renderCurrentStep(contentElement);
    
    this.container.appendChild(widgetElement);
  }

  private createProgressIndicator(): HTMLElement {
    const steps = [
      { key: 'service', label: 'Service', icon: '🛎️' },
      { key: 'staff', label: 'Staff', icon: '👤' },
      { key: 'datetime', label: 'Date & Time', icon: '📅' },
      { key: 'details', label: 'Details', icon: '📝' },
      { key: 'confirmation', label: 'Confirmation', icon: '✅' }
    ];

    const progressElement = this.createElement('div', 'bizbox-booking__progress');
    
    steps.forEach((step, index) => {
      const stepElement = this.createElement('div', 'bizbox-booking__step');
      
      if (step.key === this.currentStep) {
        stepElement.classList.add('bizbox-booking__step--active');
      } else if (this.isStepCompleted(step.key)) {
        stepElement.classList.add('bizbox-booking__step--completed');
      }
      
      stepElement.innerHTML = `
        <div class="bizbox-booking__step-icon">${step.icon}</div>
        <div class="bizbox-booking__step-label">${step.label}</div>
      `;
      
      progressElement.appendChild(stepElement);
    });
    
    return progressElement;
  }

  private async renderCurrentStep(container: HTMLElement): Promise<void> {
    container.innerHTML = '';
    
    switch (this.currentStep) {
      case 'service':
        await this.renderServiceSelection(container);
        break;
      case 'staff':
        await this.renderStaffSelection(container);
        break;
      case 'datetime':
        await this.renderDateTimeSelection(container);
        break;
      case 'details':
        await this.renderDetailsForm(container);
        break;
      case 'confirmation':
        await this.renderConfirmation(container);
        break;
    }
  }

  private async renderServiceSelection(container: HTMLElement): Promise<void> {
    const titleElement = this.createElement('h3', 'bizbox-booking__title', 'Select a Service');
    container.appendChild(titleElement);
    
    try {
      this.services = await this.loadServices();
      
      const servicesGrid = this.createElement('div', 'bizbox-booking__services-grid');
      
      this.services.forEach(service => {
        const serviceCard = this.createServiceCard(service);
        servicesGrid.appendChild(serviceCard);
      });
      
      container.appendChild(servicesGrid);
    } catch (error) {
      this.showError('Failed to load services. Please try again.');
    }
  }

  private createServiceCard(service: Service): HTMLElement {
    const card = this.createElement('div', 'bizbox-booking__service-card');
    
    card.innerHTML = `
      <div class="bizbox-booking__service-image">
        ${service.imageUrl ? `<img src="${service.imageUrl}" alt="${service.name}">` : '🛎️'}
      </div>
      <div class="bizbox-booking__service-info">
        <h4 class="bizbox-booking__service-name">${this.escapeHtml(service.name)}</h4>
        <p class="bizbox-booking__service-description">${this.escapeHtml(service.description)}</p>
        <div class="bizbox-booking__service-meta">
          <span class="bizbox-booking__service-duration">${service.duration} min</span>
          ${this.bookingConfig.showPricing ? 
            `<span class="bizbox-booking__service-price">${this.formatCurrency(service.price, service.currency)}</span>` : 
            ''
          }
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      this.selectService(service);
    });
    
    return card;
  }

  private async renderStaffSelection(container: HTMLElement): Promise<void> {
    const titleElement = this.createElement('h3', 'bizbox-booking__title', 'Select Staff Member');
    container.appendChild(titleElement);
    
    // Back button
    const backButton = this.createElement('button', 'bizbox-booking__back-btn', '← Back');
    backButton.addEventListener('click', () => this.goToStep('service'));
    container.appendChild(backButton);
    
    try {
      this.staff = await this.loadStaffForService(this.selectedService!.id);
      
      const staffGrid = this.createElement('div', 'bizbox-booking__staff-grid');
      
      // Add "Any available staff" option
      const anyStaffCard = this.createElement('div', 'bizbox-booking__staff-card');
      anyStaffCard.innerHTML = `
        <div class="bizbox-booking__staff-image">👥</div>
        <div class="bizbox-booking__staff-info">
          <h4>Any Available Staff</h4>
          <p>First available team member</p>
        </div>
      `;
      anyStaffCard.addEventListener('click', () => this.selectStaff(null));
      staffGrid.appendChild(anyStaffCard);
      
      this.staff.forEach(staffMember => {
        const staffCard = this.createStaffCard(staffMember);
        staffGrid.appendChild(staffCard);
      });
      
      container.appendChild(staffGrid);
    } catch (error) {
      this.showError('Failed to load staff. Please try again.');
    }
  }

  private createStaffCard(staff: Staff): HTMLElement {
    const card = this.createElement('div', 'bizbox-booking__staff-card');
    
    card.innerHTML = `
      <div class="bizbox-booking__staff-image">
        ${staff.imageUrl ? `<img src="${staff.imageUrl}" alt="${staff.name}">` : '👤'}
      </div>
      <div class="bizbox-booking__staff-info">
        <h4>${this.escapeHtml(staff.name)}</h4>
        <p>${this.escapeHtml(staff.role)}</p>
      </div>
    `;
    
    card.addEventListener('click', () => {
      this.selectStaff(staff);
    });
    
    return card;
  }

  private async renderDateTimeSelection(container: HTMLElement): Promise<void> {
    const titleElement = this.createElement('h3', 'bizbox-booking__title', 'Select Date & Time');
    container.appendChild(titleElement);
    
    // Back button
    const backButton = this.createElement('button', 'bizbox-booking__back-btn', '← Back');
    backButton.addEventListener('click', () => this.goToStep('staff'));
    container.appendChild(backButton);
    
    // Create calendar and time slots
    const dateTimeContainer = this.createElement('div', 'bizbox-booking__datetime-container');
    
    const calendarContainer = this.createElement('div', 'bizbox-booking__calendar-container');
    const calendar = await this.createCalendar();
    calendarContainer.appendChild(calendar);
    dateTimeContainer.appendChild(calendarContainer);
    
    const timeSlotsContainer = this.createElement('div', 'bizbox-booking__time-slots-container');
    const timeSlotsTitle = this.createElement('h4', 'bizbox-booking__time-slots-title', 'Available Times');
    timeSlotsContainer.appendChild(timeSlotsTitle);
    
    const timeSlotsList = this.createElement('div', 'bizbox-booking__time-slots');
    timeSlotsList.id = 'time-slots';
    timeSlotsContainer.appendChild(timeSlotsList);
    
    dateTimeContainer.appendChild(timeSlotsContainer);
    container.appendChild(dateTimeContainer);
    
    // Load today's availability by default
    const today = new Date();
    await this.loadAndDisplayTimeSlots(today);
  }

  private async createCalendar(): Promise<HTMLElement> {
    const calendar = this.createElement('div', 'bizbox-booking__calendar');
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calendar header
    const header = this.createElement('div', 'bizbox-booking__calendar-header');
    const monthYear = this.createElement('h4', 'bizbox-booking__calendar-month', 
      new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now)
    );
    header.appendChild(monthYear);
    calendar.appendChild(header);
    
    // Days of week
    const daysHeader = this.createElement('div', 'bizbox-booking__calendar-days-header');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      const dayElement = this.createElement('div', 'bizbox-booking__calendar-day-name', day);
      daysHeader.appendChild(dayElement);
    });
    calendar.appendChild(daysHeader);
    
    // Calendar grid
    const daysGrid = this.createElement('div', 'bizbox-booking__calendar-days');
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const dayElement = this.createElement('div', 'bizbox-booking__calendar-day');
      dayElement.textContent = cellDate.getDate().toString();
      
      if (cellDate.getMonth() !== currentMonth) {
        dayElement.classList.add('bizbox-booking__calendar-day--other-month');
      }
      
      if (cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        dayElement.classList.add('bizbox-booking__calendar-day--disabled');
      } else {
        dayElement.addEventListener('click', async () => {
          // Remove previous selection
          calendar.querySelectorAll('.bizbox-booking__calendar-day--selected')
            .forEach(el => el.classList.remove('bizbox-booking__calendar-day--selected'));
          
          // Select current day
          dayElement.classList.add('bizbox-booking__calendar-day--selected');
          this.selectedDate = cellDate;
          
          // Load time slots
          await this.loadAndDisplayTimeSlots(cellDate);
        });
      }
      
      daysGrid.appendChild(dayElement);
    }
    
    calendar.appendChild(daysGrid);
    return calendar;
  }

  private async renderDetailsForm(container: HTMLElement): Promise<void> {
    const titleElement = this.createElement('h3', 'bizbox-booking__title', 'Your Details');
    container.appendChild(titleElement);
    
    // Back button
    const backButton = this.createElement('button', 'bizbox-booking__back-btn', '← Back');
    backButton.addEventListener('click', () => this.goToStep('datetime'));
    container.appendChild(backButton);
    
    // Booking summary
    const summary = this.createElement('div', 'bizbox-booking__summary');
    summary.innerHTML = `
      <h4>Booking Summary</h4>
      <p><strong>Service:</strong> ${this.escapeHtml(this.selectedService!.name)}</p>
      <p><strong>Staff:</strong> ${this.selectedStaff ? this.escapeHtml(this.selectedStaff.name) : 'Any available'}</p>
      <p><strong>Date:</strong> ${this.formatDate(this.selectedDate!)}</p>
      <p><strong>Time:</strong> ${this.formatTime(this.selectedTimeSlot!.startTime)}</p>
      <p><strong>Duration:</strong> ${this.selectedService!.duration} minutes</p>
      ${this.bookingConfig.showPricing ? 
        `<p><strong>Price:</strong> ${this.formatCurrency(this.selectedTimeSlot!.price || this.selectedService!.price, this.selectedService!.currency)}</p>` : 
        ''
      }
    `;
    container.appendChild(summary);
    
    // Details form
    const form = this.createElement('form', 'bizbox-booking__form') as HTMLFormElement;
    form.innerHTML = `
      <div class="bizbox-booking__form-group">
        <label for="customer-name">Name *</label>
        <input type="text" id="customer-name" name="name" required>
      </div>
      <div class="bizbox-booking__form-group">
        <label for="customer-email">Email *</label>
        <input type="email" id="customer-email" name="email" required>
      </div>
      <div class="bizbox-booking__form-group">
        <label for="customer-phone">Phone</label>
        <input type="tel" id="customer-phone" name="phone">
      </div>
      <div class="bizbox-booking__form-group">
        <label for="customer-notes">Special Requests</label>
        <textarea id="customer-notes" name="notes" rows="3"></textarea>
      </div>
      <button type="submit" class="bizbox-booking__submit-btn">Confirm Booking</button>
    `;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitBooking(form);
    });
    
    container.appendChild(form);
  }

  private async renderConfirmation(container: HTMLElement): Promise<void> {
    const confirmation = this.createElement('div', 'bizbox-booking__confirmation');
    confirmation.innerHTML = `
      <div class="bizbox-booking__confirmation-icon">✅</div>
      <h3>Booking Confirmed!</h3>
      <p>Your booking has been successfully created.</p>
      <div class="bizbox-booking__confirmation-details">
        <!-- Booking details will be added here -->
      </div>
      <button class="bizbox-booking__new-booking-btn">Make Another Booking</button>
    `;
    
    const newBookingBtn = confirmation.querySelector('.bizbox-booking__new-booking-btn') as HTMLButtonElement;
    newBookingBtn.addEventListener('click', () => {
      this.resetBooking();
    });
    
    container.appendChild(confirmation);
  }

  // Event handlers and utility methods
  private selectService(service: Service): void {
    this.selectedService = service;
    this.emit('service:selected', { service }, this.widgetId);
    this.goToStep('staff');
  }

  private selectStaff(staff: Staff | null): void {
    this.selectedStaff = staff;
    this.emit('staff:selected', { staff }, this.widgetId);
    this.goToStep('datetime');
  }

  private selectTimeSlot(timeSlot: TimeSlot): void {
    this.selectedTimeSlot = timeSlot;
    this.emit('timeslot:selected', { timeSlot }, this.widgetId);
    this.goToStep('details');
  }

  private async goToStep(step: typeof this.currentStep): Promise<void> {
    this.currentStep = step;
    await this.render();
  }

  private isStepCompleted(step: string): boolean {
    const stepOrder = ['service', 'staff', 'datetime', 'details', 'confirmation'];
    const currentIndex = stepOrder.indexOf(this.currentStep);
    const stepIndex = stepOrder.indexOf(step);
    return stepIndex < currentIndex;
  }

  private async loadServices(): Promise<Service[]> {
    const endpoint = this.bookingConfig.serviceId 
      ? `/api/services/${this.bookingConfig.serviceId}`
      : `/api/tenants/${this.config.tenantId}/services`;
    
    const data = await this.apiClient.get<Service[] | Service>(endpoint);
    return Array.isArray(data) ? data : [data];
  }

  private async loadStaffForService(serviceId: string): Promise<Staff[]> {
    return this.apiClient.get<Staff[]>(`/api/services/${serviceId}/staff`);
  }

  private async loadAndDisplayTimeSlots(date: Date): Promise<void> {
    try {
      const timeSlotsContainer = document.getElementById('time-slots');
      if (!timeSlotsContainer) return;
      
      timeSlotsContainer.innerHTML = '<div class="bizbox-loading-spinner"><div class="bizbox-spinner"></div></div>';
      
      this.availableSlots = await this.loadAvailability(this.selectedService!.id, date, this.selectedStaff?.id);
      
      timeSlotsContainer.innerHTML = '';
      
      if (this.availableSlots.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="bizbox-booking__no-slots">No available times for this date.</p>';
        return;
      }
      
      this.availableSlots.forEach(slot => {
        const slotElement = this.createElement('button', 'bizbox-booking__time-slot');
        slotElement.textContent = this.formatTime(slot.startTime);
        
        if (slot.price && this.bookingConfig.showPricing) {
          const priceSpan = this.createElement('span', 'bizbox-booking__time-slot-price');
          priceSpan.textContent = this.formatCurrency(slot.price, this.selectedService!.currency);
          slotElement.appendChild(priceSpan);
        }
        
        slotElement.addEventListener('click', () => {
          this.selectTimeSlot(slot);
        });
        
        timeSlotsContainer.appendChild(slotElement);
      });
    } catch (error) {
      console.error('Failed to load time slots:', error);
      const timeSlotsContainer = document.getElementById('time-slots');
      if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<p class="bizbox-booking__error">Failed to load available times.</p>';
      }
    }
  }

  private async loadAvailability(serviceId: string, date: Date, staffId?: string): Promise<TimeSlot[]> {
    const params = new URLSearchParams({
      date: date.toISOString().split('T')[0],
      ...(staffId && { staffId })
    });
    
    return this.apiClient.get<TimeSlot[]>(`/api/services/${serviceId}/availability?${params}`);
  }

  private async submitBooking(form: HTMLFormElement): Promise<void> {
    try {
      this.setLoading(true);
      
      const formData = new FormData(form);
      const bookingData: BookingData = {
        serviceId: this.selectedService!.id,
        staffId: this.selectedStaff?.id,
        startTime: this.selectedTimeSlot!.startTime,
        customerName: formData.get('name') as string,
        customerEmail: formData.get('email') as string,
        customerPhone: formData.get('phone') as string || undefined,
        notes: formData.get('notes') as string || undefined
      };
      
      const result = await this.apiClient.post<BookingResult>('/api/bookings', bookingData);
      
      this.emit('booking:created', { booking: result }, this.widgetId);
      this.bookingConfig.onBookingComplete?.(result);
      
      // Show confirmation
      this.currentStep = 'confirmation';
      await this.render();
      
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(false);
    }
  }

  private resetBooking(): void {
    this.selectedService = undefined;
    this.selectedStaff = undefined;
    this.selectedDate = undefined;
    this.selectedTimeSlot = undefined;
    this.currentStep = 'service';
    this.render();
  }
}