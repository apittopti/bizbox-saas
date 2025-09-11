'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../core/AnalyticsProvider';

interface BookingWidgetProps {
  tenantId: string;
  serviceId?: string;
  staffId?: string;
  embedded?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  showPricing?: boolean;
  allowServiceSelection?: boolean;
  allowStaffSelection?: boolean;
  className?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  image?: string;
  availability?: any;
}

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

export default function BookingWidget({
  tenantId,
  serviceId,
  staffId,
  embedded = false,
  theme = 'auto',
  showPricing = true,
  allowServiceSelection = true,
  allowStaffSelection = true,
  className = '',
}: BookingWidgetProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const { trackEvent, trackConversion } = useAnalytics();
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBookingData();
  }, [tenantId]);

  useEffect(() => {
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        if (!allowServiceSelection) setCurrentStep(2);
      }
    }
  }, [serviceId, services, allowServiceSelection]);

  useEffect(() => {
    if (staffId && staff.length > 0) {
      const member = staff.find(s => s.id === staffId);
      if (member) {
        setSelectedStaff(member);
        if (!allowStaffSelection) setCurrentStep(Math.max(currentStep, 2));
      }
    }
  }, [staffId, staff, allowStaffSelection, currentStep]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff]);

  const loadBookingData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetch(`/api/booking/services?tenantId=${tenantId}`),
        fetch(`/api/booking/staff?tenantId=${tenantId}`),
      ]);

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData);
      }
    } catch (error) {
      console.error('Failed to load booking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        serviceId: selectedService.id,
        date: selectedDate,
        ...(selectedStaff && { staffId: selectedStaff.id }),
      });

      const response = await fetch(`/api/booking/availability?${params}`);
      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Failed to load available slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    trackEvent({
      action: 'service_selected',
      category: 'booking',
      label: service.name,
      value: service.price,
    });
    
    if (allowStaffSelection) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStaffSelect = (member: Staff) => {
    setSelectedStaff(member);
    trackEvent({
      action: 'staff_selected',
      category: 'booking',
      label: member.name,
    });
    setCurrentStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    trackEvent({
      action: 'date_selected',
      category: 'booking',
      label: date,
    });
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    trackEvent({
      action: 'time_selected',
      category: 'booking',
      label: time,
    });
    setCurrentStep(4);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.email) {
      return;
    }

    setIsLoading(true);
    try {
      const bookingData = {
        tenantId,
        serviceId: selectedService.id,
        staffId: selectedStaff?.id,
        date: selectedDate,
        time: selectedTime,
        duration: selectedService.duration,
        price: selectedService.price,
        customer: customerInfo,
      };

      const response = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const booking = await response.json();
        
        // Track successful booking
        trackConversion('booking', selectedService.price, {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          staffId: selectedStaff?.id,
          staffName: selectedStaff?.name,
          date: selectedDate,
          time: selectedTime,
          bookingId: booking.id,
        });

        setCurrentStep(5); // Success step
      } else {
        throw new Error('Booking failed');
      }
    } catch (error) {
      console.error('Booking submission failed:', error);
      // Handle error - show error message
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-GB', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        isToday: i === 0,
      });
    }
    
    return days;
  };

  const renderStep1 = () => (
    <div className="booking-step">
      <h3>Select a Service</h3>
      <div className="services-list">
        {services.map((service) => (
          <div
            key={service.id}
            className={`service-item ${selectedService?.id === service.id ? 'selected' : ''}`}
            onClick={() => handleServiceSelect(service)}
          >
            <div className="service-info">
              <h4>{service.name}</h4>
              <p>{service.description}</p>
              <div className="service-meta">
                <span className="duration">{service.duration} min</span>
                {showPricing && <span className="price">£{service.price}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="booking-step">
      <h3>Choose Staff Member</h3>
      {!allowStaffSelection && (
        <button
          className="skip-button"
          onClick={() => setCurrentStep(3)}
        >
          No Preference
        </button>
      )}
      <div className="staff-list">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`staff-item ${selectedStaff?.id === member.id ? 'selected' : ''}`}
            onClick={() => handleStaffSelect(member)}
          >
            {member.image && (
              <img src={member.image} alt={member.name} className="staff-photo" />
            )}
            <div className="staff-info">
              <h4>{member.name}</h4>
              <p>{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="booking-step">
      <h3>Select Date & Time</h3>
      
      <div className="calendar-section">
        <h4>Choose Date</h4>
        <div className="calendar-days">
          {generateCalendarDays().map((day) => (
            <button
              key={day.date}
              className={`calendar-day ${selectedDate === day.date ? 'selected' : ''} ${day.isToday ? 'today' : ''}`}
              onClick={() => handleDateSelect(day.date)}
            >
              {day.display}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="time-slots-section">
          <h4>Available Times</h4>
          {isLoading ? (
            <div className="loading">Loading available times...</div>
          ) : availableSlots.length > 0 ? (
            <div className="time-slots">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                  onClick={() => handleTimeSelect(slot.time)}
                  disabled={!slot.available}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <p className="no-slots">No available times for this date</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="booking-step">
      <h3>Your Details</h3>
      
      <div className="booking-summary">
        <h4>Booking Summary</h4>
        <div className="summary-item">
          <label>Service:</label>
          <span>{selectedService?.name}</span>
        </div>
        {selectedStaff && (
          <div className="summary-item">
            <label>Staff:</label>
            <span>{selectedStaff.name}</span>
          </div>
        )}
        <div className="summary-item">
          <label>Date:</label>
          <span>{new Date(selectedDate).toLocaleDateString('en-GB')}</span>
        </div>
        <div className="summary-item">
          <label>Time:</label>
          <span>{selectedTime}</span>
        </div>
        <div className="summary-item">
          <label>Duration:</label>
          <span>{selectedService?.duration} minutes</span>
        </div>
        {showPricing && (
          <div className="summary-item total">
            <label>Total:</label>
            <span>£{selectedService?.price}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleBookingSubmit} className="customer-form">
        <div className="form-group">
          <label htmlFor="name">Full Name *</label>
          <input
            type="text"
            id="name"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="notes">Additional Notes</label>
          <textarea
            id="notes"
            value={customerInfo.notes}
            onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
            rows={3}
            placeholder="Any special requirements or notes..."
          />
        </div>
        
        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );

  const renderStep5 = () => (
    <div className="booking-step success-step">
      <div className="success-icon">✅</div>
      <h3>Booking Confirmed!</h3>
      <p>Your appointment has been successfully booked. You should receive a confirmation email shortly.</p>
      
      <div className="booking-details">
        <h4>Booking Details</h4>
        <div className="detail-item">
          <label>Service:</label>
          <span>{selectedService?.name}</span>
        </div>
        {selectedStaff && (
          <div className="detail-item">
            <label>Staff:</label>
            <span>{selectedStaff.name}</span>
          </div>
        )}
        <div className="detail-item">
          <label>Date & Time:</label>
          <span>
            {new Date(selectedDate).toLocaleDateString('en-GB')} at {selectedTime}
          </span>
        </div>
      </div>
      
      <button
        className="new-booking-button"
        onClick={() => {
          setCurrentStep(1);
          setSelectedService(null);
          setSelectedStaff(null);
          setSelectedDate('');
          setSelectedTime('');
          setCustomerInfo({ name: '', email: '', phone: '', notes: '' });
        }}
      >
        Book Another Appointment
      </button>
    </div>
  );

  if (isLoading && currentStep === 1) {
    return (
      <div className={`booking-widget loading ${className}`}>
        <div className="loading-spinner">Loading booking system...</div>
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      className={`booking-widget ${embedded ? 'embedded' : ''} ${className}`}
      data-theme={theme}
    >
      <div className="booking-header">
        <h2>Book an Appointment</h2>
        <div className="step-indicator">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step ${step === currentStep ? 'current' : ''} ${step < currentStep ? 'completed' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="booking-content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && allowStaffSelection && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {currentStep > 1 && currentStep < 5 && (
        <div className="booking-actions">
          <button
            className="back-button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}