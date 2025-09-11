import { BizBoxWidget } from '../../core/widget-base';
import { ContactFormWidgetConfig, ContactData, ContactResult, ValidationResult } from '../../types';

export class ContactFormWidget extends BizBoxWidget {
  private form: HTMLFormElement | null = null;
  private isSubmitting = false;

  constructor(containerId: string, config: ContactFormWidgetConfig) {
    super(containerId, config);
  }

  protected get contactConfig(): ContactFormWidgetConfig {
    return this.config as ContactFormWidgetConfig;
  }

  async render(): Promise<void> {
    this.container.innerHTML = '';
    
    const widgetElement = this.createElement('div', 'bizbox-contact-form');
    
    // Create form header
    const headerElement = this.createHeader();
    widgetElement.appendChild(headerElement);
    
    // Create contact form
    const formElement = this.createContactForm();
    widgetElement.appendChild(formElement);
    
    this.container.appendChild(widgetElement);
  }

  private createHeader(): HTMLElement {
    const header = this.createElement('div', 'bizbox-contact-form__header');
    header.innerHTML = `
      <h3 class="bizbox-contact-form__title">Get in Touch</h3>
      <p class="bizbox-contact-form__subtitle">Send us a message and we'll get back to you soon.</p>
    `;
    return header;
  }

  private createContactForm(): HTMLElement {
    const formContainer = this.createElement('div', 'bizbox-contact-form__container');
    
    this.form = this.createElement('form', 'bizbox-contact-form__form') as HTMLFormElement;
    
    // Name field
    const nameGroup = this.createFormGroup(
      'name',
      'Name',
      'text',
      'Your full name',
      true
    );
    this.form.appendChild(nameGroup);
    
    // Email field
    const emailGroup = this.createFormGroup(
      'email',
      'Email',
      'email',
      'your.email@example.com',
      true
    );
    this.form.appendChild(emailGroup);
    
    // Phone field (optional based on config)
    if (this.contactConfig.showPhone !== false) {
      const phoneGroup = this.createFormGroup(
        'phone',
        'Phone',
        'tel',
        'Your phone number',
        false
      );
      this.form.appendChild(phoneGroup);
    }
    
    // Category selection (if categories provided)
    if (this.contactConfig.categories && this.contactConfig.categories.length > 0) {
      const categoryGroup = this.createCategorySelect();
      this.form.appendChild(categoryGroup);
    }
    
    // Subject field (optional based on config)
    if (this.contactConfig.showSubject !== false) {
      const subjectGroup = this.createFormGroup(
        'subject',
        'Subject',
        'text',
        'What is this regarding?',
        true
      );
      this.form.appendChild(subjectGroup);
    }
    
    // Message field
    const messageGroup = this.createMessageField();
    this.form.appendChild(messageGroup);
    
    // Submit button
    const submitButton = this.createSubmitButton();
    this.form.appendChild(submitButton);
    
    // Add form event listener
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
    
    // Add real-time validation
    this.addRealTimeValidation();
    
    formContainer.appendChild(this.form);
    return formContainer;
  }

  private createFormGroup(
    name: string, 
    label: string, 
    type: string, 
    placeholder: string, 
    required: boolean = false
  ): HTMLElement {
    const group = this.createElement('div', 'bizbox-contact-form__form-group');
    
    group.innerHTML = `
      <label for="bizbox-${name}" class="bizbox-contact-form__label">
        ${this.escapeHtml(label)}${required ? ' *' : ''}
      </label>
      <input 
        type="${type}" 
        id="bizbox-${name}" 
        name="${name}" 
        class="bizbox-contact-form__input" 
        placeholder="${this.escapeHtml(placeholder)}"
        ${required ? 'required' : ''}
      >
      <div class="bizbox-contact-form__error" id="bizbox-${name}-error"></div>
    `;
    
    return group;
  }

  private createCategorySelect(): HTMLElement {
    const group = this.createElement('div', 'bizbox-contact-form__form-group');
    
    const categoryOptions = this.contactConfig.categories!.map(category => 
      `<option value="${this.escapeHtml(category)}">${this.escapeHtml(category)}</option>`
    ).join('');
    
    group.innerHTML = `
      <label for="bizbox-category" class="bizbox-contact-form__label">Category</label>
      <select id="bizbox-category" name="category" class="bizbox-contact-form__select">
        <option value="">Select a category...</option>
        ${categoryOptions}
      </select>
      <div class="bizbox-contact-form__error" id="bizbox-category-error"></div>
    `;
    
    return group;
  }

  private createMessageField(): HTMLElement {
    const group = this.createElement('div', 'bizbox-contact-form__form-group');
    
    group.innerHTML = `
      <label for="bizbox-message" class="bizbox-contact-form__label">Message *</label>
      <textarea 
        id="bizbox-message" 
        name="message" 
        class="bizbox-contact-form__textarea" 
        placeholder="Tell us how we can help you..."
        rows="5"
        required
      ></textarea>
      <div class="bizbox-contact-form__error" id="bizbox-message-error"></div>
    `;
    
    return group;
  }

  private createSubmitButton(): HTMLElement {
    const buttonContainer = this.createElement('div', 'bizbox-contact-form__button-container');
    
    buttonContainer.innerHTML = `
      <button type="submit" class="bizbox-contact-form__submit-btn" id="bizbox-submit-btn">
        <span class="bizbox-contact-form__submit-text">Send Message</span>
        <span class="bizbox-contact-form__submit-spinner" style="display: none;">
          <span class="bizbox-spinner"></span> Sending...
        </span>
      </button>
    `;
    
    return buttonContainer;
  }

  private addRealTimeValidation(): void {
    if (!this.form) return;
    
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      
      // Validate on blur
      element.addEventListener('blur', () => {
        this.validateField(element);
      });
      
      // Clear errors on focus
      element.addEventListener('focus', () => {
        this.clearFieldError(element);
      });
      
      // Validate email on input
      if (element.type === 'email') {
        element.addEventListener('input', () => {
          if (element.value) {
            this.validateField(element);
          }
        });
      }
    });
  }

  private validateField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
    const name = element.name;
    const value = element.value.trim();
    
    // Clear previous error
    this.clearFieldError(element);
    
    // Required field validation
    if (element.hasAttribute('required') && !value) {
      this.showFieldError(element, `${this.getFieldLabel(name)} is required.`);
      return false;
    }
    
    // Email validation
    if (element.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.showFieldError(element, 'Please enter a valid email address.');
        return false;
      }
    }
    
    // Phone validation (basic)
    if (element.type === 'tel' && value) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value) || value.length < 10) {
        this.showFieldError(element, 'Please enter a valid phone number.');
        return false;
      }
    }
    
    // Message length validation
    if (name === 'message' && value) {
      if (value.length < 10) {
        this.showFieldError(element, 'Please provide a more detailed message (at least 10 characters).');
        return false;
      }
      if (value.length > 1000) {
        this.showFieldError(element, 'Message is too long (maximum 1000 characters).');
        return false;
      }
    }
    
    // Name validation
    if (name === 'name' && value) {
      if (value.length < 2) {
        this.showFieldError(element, 'Please enter your full name.');
        return false;
      }
    }
    
    return true;
  }

  private validateForm(): ValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    if (!this.form) {
      return { isValid: false, errors: { form: 'Form not found' } };
    }
    
    const formData = new FormData(this.form);
    const data: Record<string, string> = {};
    
    // Extract form data
    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'message'];
    if (this.contactConfig.showSubject !== false) {
      requiredFields.push('subject');
    }
    
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors[field] = `${this.getFieldLabel(field)} is required.`;
        isValid = false;
      }
    });
    
    // Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address.';
        isValid = false;
      }
    }
    
    // Validate message length
    if (data.message) {
      if (data.message.length < 10) {
        errors.message = 'Please provide a more detailed message (at least 10 characters).';
        isValid = false;
      }
      if (data.message.length > 1000) {
        errors.message = 'Message is too long (maximum 1000 characters).';
        isValid = false;
      }
    }
    
    // Show field errors
    Object.entries(errors).forEach(([field, message]) => {
      const element = this.form!.querySelector(`[name="${field}"]`) as HTMLInputElement;
      if (element) {
        this.showFieldError(element, message);
      }
    });
    
    return { isValid, errors };
  }

  private showFieldError(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, message: string): void {
    const errorElement = document.getElementById(`bizbox-${element.name}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    
    element.classList.add('bizbox-contact-form__input--error');
  }

  private clearFieldError(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const errorElement = document.getElementById(`bizbox-${element.name}-error`);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
    
    element.classList.remove('bizbox-contact-form__input--error');
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      subject: 'Subject',
      message: 'Message',
      category: 'Category'
    };
    
    return labels[fieldName] || fieldName;
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;
    
    try {
      // Validate form
      const validation = this.validateForm();
      if (!validation.isValid) {
        return;
      }
      
      this.setSubmittingState(true);
      
      // Collect form data
      const formData = new FormData(this.form!);
      const contactData: ContactData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string || undefined,
        subject: formData.get('subject') as string || 'Contact Form Submission',
        message: formData.get('message') as string,
        category: formData.get('category') as string || undefined
      };
      
      // Submit to API
      const result = await this.submitContactForm(contactData);
      
      // Emit events
      this.emit('contact:submitted', { contactData, result }, this.widgetId);
      this.contactConfig.onSubmit?.(result);
      
      // Show success message
      this.showSuccessMessage(result);
      
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setSubmittingState(false);
    }
  }

  private async submitContactForm(data: ContactData): Promise<ContactResult> {
    return this.apiClient.post<ContactResult>('/api/contact', data);
  }

  private setSubmittingState(submitting: boolean): void {
    this.isSubmitting = submitting;
    
    const submitBtn = document.getElementById('bizbox-submit-btn') as HTMLButtonElement;
    const submitText = submitBtn.querySelector('.bizbox-contact-form__submit-text') as HTMLElement;
    const submitSpinner = submitBtn.querySelector('.bizbox-contact-form__submit-spinner') as HTMLElement;
    
    if (submitting) {
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitSpinner.style.display = 'inline-flex';
    } else {
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitSpinner.style.display = 'none';
    }
  }

  private showSuccessMessage(result: ContactResult): void {
    if (!this.form) return;
    
    const successElement = this.createElement('div', 'bizbox-contact-form__success');
    successElement.innerHTML = `
      <div class="bizbox-contact-form__success-icon">✅</div>
      <h3 class="bizbox-contact-form__success-title">Message Sent Successfully!</h3>
      <p class="bizbox-contact-form__success-message">
        Thank you for contacting us. We'll get back to you soon.
      </p>
      <button class="bizbox-contact-form__new-message-btn">Send Another Message</button>
    `;
    
    const newMessageBtn = successElement.querySelector('.bizbox-contact-form__new-message-btn') as HTMLButtonElement;
    newMessageBtn.addEventListener('click', () => {
      this.resetForm();
    });
    
    // Replace form with success message
    this.form.parentElement!.replaceChild(successElement, this.form);
  }

  private resetForm(): void {
    // Re-render the widget to show the form again
    this.render();
  }

  // Public methods for external form management
  public getFormData(): ContactData | null {
    if (!this.form) return null;
    
    const formData = new FormData(this.form);
    
    return {
      name: formData.get('name') as string || '',
      email: formData.get('email') as string || '',
      phone: formData.get('phone') as string || undefined,
      subject: formData.get('subject') as string || 'Contact Form Submission',
      message: formData.get('message') as string || '',
      category: formData.get('category') as string || undefined
    };
  }

  public clearForm(): void {
    if (this.form) {
      this.form.reset();
      
      // Clear all error messages
      const errorElements = this.form.querySelectorAll('.bizbox-contact-form__error');
      errorElements.forEach(element => {
        element.textContent = '';
        (element as HTMLElement).style.display = 'none';
      });
      
      // Remove error classes
      const inputElements = this.form.querySelectorAll('.bizbox-contact-form__input--error');
      inputElements.forEach(element => {
        element.classList.remove('bizbox-contact-form__input--error');
      });
    }
  }

  public setFieldValue(fieldName: string, value: string): void {
    if (!this.form) return;
    
    const field = this.form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (field) {
      field.value = value;
    }
  }
}