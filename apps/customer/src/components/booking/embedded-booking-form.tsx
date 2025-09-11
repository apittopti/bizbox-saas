'use client';

import React, { useState, useEffect } from 'react';

interface EmbeddedBookingFormProps {
  tenantId: string;
  preSelectedService?: string;
  preSelectedStaff?: string;
  className?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  requiredSkills: string[];
}

interface Staff {
  id: string;
  name: string;
  skills: string[];
  image?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  staffId: string;
}

export function EmbeddedBookingForm({
  tenantId,
  preSelectedService,
  preSelectedStaff,
  className = '',
}: EmbeddedBookingFormProps) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedService, setSelectedService] = useState<string>(preSelectedService || '');
  const [selectedStaff, setSelectedStaff] = useState<string>(preSelectedStaff || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    loadServices();
    loadStaff();
  }, [tenantId]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/booking/services?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch(`/api/booking/staff?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        serviceId: selectedService,
        date: selectedDate,
        ...(selectedStaff && { staffId: selectedStaff }),
      });
      
      const response = await fetch(`/api/booking/availability?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedTime || !customerInfo.name || !customerInfo.email) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          serviceId: selectedService,
          staffId: selectedStaff,
          date: selectedDate,
          time: selectedTime,
          customer: customerInfo,
        }),
      });

      if (response.ok) {
        const booking = await response.json();
        // Redirect to payment or confirmation
        window.location.href = `/booking/confirmation/${booking.id}`;
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = services.find(s => s.id === selectedService);
  const availableStaff = selectedService 
    ? staff.filter(s => {
        const service = services.find(srv => srv.id === selectedService);
        return !service?.requiredSkills.length || 
               service.requiredSkills.every(skill => s.skills.includes(skill));
      })
    : [];

  return (
    <div className={`embedded-booking-form ${className}`}>
      <div className="booking-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Service</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Date & Time</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Details</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Confirm</div>
      </div>

      {step === 1 && (
        <div className="step-content">
          <h3>Select a Service</h3>
          <div className="services-list">
            {services.map((service) => (
              <div
                key={service.id}
                className={`service-option ${selectedService === service.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(service.id)}
              >
                <h4>{service.name}</h4>
                <p>{service.description}</p>
                <div className="service-details">
                  <span>{service.duration} min</span>
                  <span>£{service.price}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            className="next-btn"
            disabled={!selectedService}
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <h3>Select Date & Time</h3>
          
          {availableStaff.length > 1 && (
            <div className="staff-selection">
              <h4>Preferred Staff (Optional)</h4>
              <div className="staff-options">
                <div
                  className={`staff-option ${!selectedStaff ? 'selected' : ''}`}
                  onClick={() => setSelectedStaff('')}
                >
                  <span>Any Available Staff</span>
                </div>
                {availableStaff.map((member) => (
                  <div
                    key={member.id}
                    className={`staff-option ${selectedStaff === member.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStaff(member.id)}
                  >
                    {member.image && (
                      <img src={member.image} alt={member.name} className="staff-avatar" />
                    )}
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="date-selection">
            <h4>Select Date</h4>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {selectedDate && (
            <div className="time-selection">
              <h4>Available Times</h4>
              {loading ? (
                <div className="loading">Loading available times...</div>
              ) : (
                <div className="time-slots">
                  {availableSlots.map((slot) => (
                    <button
                      key={`${slot.time}-${slot.staffId}`}
                      className={`time-slot ${selectedTime === slot.time ? 'selected' : ''} ${!slot.available ? 'disabled' : ''}`}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="step-actions">
            <button className="back-btn" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="next-btn"
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h3>Your Details</h3>
          <div className="customer-form">
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
              />
            </div>
          </div>

          <div className="step-actions">
            <button className="back-btn" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="next-btn"
              disabled={!customerInfo.name || !customerInfo.email}
              onClick={() => setStep(4)}
            >
              Review Booking
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="step-content">
          <h3>Confirm Your Booking</h3>
          <div className="booking-summary">
            <div className="summary-item">
              <strong>Service:</strong> {selectedServiceData?.name}
            </div>
            <div className="summary-item">
              <strong>Duration:</strong> {selectedServiceData?.duration} minutes
            </div>
            <div className="summary-item">
              <strong>Price:</strong> £{selectedServiceData?.price}
            </div>
            <div className="summary-item">
              <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}
            </div>
            <div className="summary-item">
              <strong>Time:</strong> {selectedTime}
            </div>
            {selectedStaff && (
              <div className="summary-item">
                <strong>Staff:</strong> {staff.find(s => s.id === selectedStaff)?.name}
              </div>
            )}
            <div className="summary-item">
              <strong>Customer:</strong> {customerInfo.name}
            </div>
            <div className="summary-item">
              <strong>Email:</strong> {customerInfo.email}
            </div>
            {customerInfo.phone && (
              <div className="summary-item">
                <strong>Phone:</strong> {customerInfo.phone}
              </div>
            )}
            {customerInfo.notes && (
              <div className="summary-item">
                <strong>Notes:</strong> {customerInfo.notes}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button className="back-btn" onClick={() => setStep(3)}>
              Back
            </button>
            <button
              className="confirm-btn"
              disabled={loading}
              onClick={handleBooking}
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .embedded-booking-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .booking-steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .step {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          background: #f3f4f6;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .step.active {
          background: #3b82f6;
          color: white;
        }

        .step-content h3 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .services-list {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .service-option {
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .service-option:hover {
          border-color: #3b82f6;
        }

        .service-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .service-option h4 {
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .service-option p {
          margin-bottom: 0.75rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .service-details {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
          color: #3b82f6;
        }

        .staff-selection {
          margin-bottom: 1.5rem;
        }

        .staff-selection h4 {
          margin-bottom: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .staff-options {
          display: grid;
          gap: 0.5rem;
        }

        .staff-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .staff-option:hover {
          border-color: #3b82f6;
        }

        .staff-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .staff-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .date-selection {
          margin-bottom: 1.5rem;
        }

        .date-selection h4 {
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .date-selection input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }

        .time-selection h4 {
          margin-bottom: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .time-slots {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.5rem;
        }

        .time-slot {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .time-slot:hover:not(.disabled) {
          border-color: #3b82f6;
        }

        .time-slot.selected {
          border-color: #3b82f6;
          background: #3b82f6;
          color: white;
        }

        .time-slot.disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .customer-form {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }

        .booking-summary {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .summary-item:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }

        .step-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .back-btn,
        .next-btn,
        .confirm-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .back-btn:hover {
          background: #e5e7eb;
        }

        .next-btn,
        .confirm-btn {
          background: #3b82f6;
          color: white;
        }

        .next-btn:hover,
        .confirm-btn:hover {
          background: #2563eb;
        }

        .next-btn:disabled,
        .confirm-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}