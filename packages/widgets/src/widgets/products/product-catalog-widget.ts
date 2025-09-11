import { BizBoxWidget } from '../../core/widget-base';
import { ProductCatalogWidgetConfig, Product, CartItem, ShoppingCart } from '../../types';

export class ProductCatalogWidget extends BizBoxWidget {
  private products: Product[] = [];
  private filteredProducts: Product[] = [];
  private cart: ShoppingCart = {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    currency: 'GBP'
  };
  private currentPage = 1;
  private filters = {
    category: '',
    search: '',
    priceRange: { min: 0, max: Infinity }
  };

  constructor(containerId: string, config: ProductCatalogWidgetConfig) {
    super(containerId, config);
  }

  protected get catalogConfig(): ProductCatalogWidgetConfig {
    return this.config as ProductCatalogWidgetConfig;
  }

  async render(): Promise<void> {
    this.container.innerHTML = '';
    
    const widgetElement = this.createElement('div', 'bizbox-product-catalog');
    
    // Create header with search and filters
    if (this.catalogConfig.showFilters !== false) {
      const headerElement = this.createHeader();
      widgetElement.appendChild(headerElement);
    }
    
    // Create cart summary (if enabled)
    if (this.catalogConfig.showCart !== false) {
      const cartElement = this.createCartSummary();
      widgetElement.appendChild(cartElement);
    }
    
    // Create main content area
    const contentElement = this.createElement('div', 'bizbox-product-catalog__content');
    
    try {
      await this.loadProducts();
      this.applyFilters();
      
      const productsElement = this.createProductsGrid();
      contentElement.appendChild(productsElement);
      
      // Create pagination
      if (this.catalogConfig.productsPerPage && this.filteredProducts.length > this.catalogConfig.productsPerPage) {
        const paginationElement = this.createPagination();
        contentElement.appendChild(paginationElement);
      }
    } catch (error) {
      this.handleError(error);
      return;
    }
    
    widgetElement.appendChild(contentElement);
    this.container.appendChild(widgetElement);
  }

  private createHeader(): HTMLElement {
    const header = this.createElement('div', 'bizbox-product-catalog__header');
    
    // Search box
    const searchContainer = this.createElement('div', 'bizbox-product-catalog__search-container');
    const searchInput = this.createElement('input', 'bizbox-product-catalog__search') as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search products...';
    searchInput.value = this.filters.search;
    
    searchInput.addEventListener('input', (e) => {
      this.filters.search = (e.target as HTMLInputElement).value;
      this.applyFilters();
      this.updateProductsDisplay();
    });
    
    searchContainer.appendChild(searchInput);
    header.appendChild(searchContainer);
    
    return header;
  }

  private createCartSummary(): HTMLElement {
    const cartSummary = this.createElement('div', 'bizbox-product-catalog__cart-summary');
    
    cartSummary.innerHTML = `
      <div class="bizbox-product-catalog__cart-info">
        <span class="bizbox-product-catalog__cart-count">
          🛒 ${this.cart.totalItems} items
        </span>
        <span class="bizbox-product-catalog__cart-total">
          ${this.formatCurrency(this.cart.totalPrice, this.cart.currency)}
        </span>
      </div>
      <button class="bizbox-product-catalog__checkout-btn" ${this.cart.totalItems === 0 ? 'disabled' : ''}>
        Checkout
      </button>
    `;
    
    const checkoutBtn = cartSummary.querySelector('.bizbox-product-catalog__checkout-btn') as HTMLButtonElement;
    checkoutBtn.addEventListener('click', () => {
      this.handleCheckout();
    });
    
    return cartSummary;
  }

  private createProductsGrid(): HTMLElement {
    const grid = this.createElement('div', 
      `bizbox-product-catalog__grid bizbox-product-catalog__grid--${this.catalogConfig.layout || 'grid'}`
    );
    
    const productsToShow = this.getPaginatedProducts();
    
    if (productsToShow.length === 0) {
      const emptyState = this.createElement('div', 'bizbox-product-catalog__empty');
      emptyState.innerHTML = `
        <div class="bizbox-product-catalog__empty-icon">📦</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filters.</p>
      `;
      grid.appendChild(emptyState);
      return grid;
    }
    
    productsToShow.forEach(product => {
      const productCard = this.createProductCard(product);
      grid.appendChild(productCard);
    });
    
    return grid;
  }

  private createProductCard(product: Product): HTMLElement {
    const card = this.createElement('div', 'bizbox-product-catalog__product-card');
    
    const imageUrl = product.imageUrl || product.images?.[0];
    const isInCart = this.cart.items.some(item => item.productId === product.id);
    const cartItem = this.cart.items.find(item => item.productId === product.id);
    
    card.innerHTML = `
      <div class="bizbox-product-catalog__product-image">
        ${imageUrl ? 
          `<img src="${imageUrl}" alt="${this.escapeHtml(product.name)}" loading="lazy">` : 
          '📦'
        }
        ${!product.inStock ? '<div class="bizbox-product-catalog__out-of-stock">Out of Stock</div>' : ''}
      </div>
      <div class="bizbox-product-catalog__product-info">
        <h3 class="bizbox-product-catalog__product-name">${this.escapeHtml(product.name)}</h3>
        <p class="bizbox-product-catalog__product-description">${this.escapeHtml(product.description)}</p>
        <div class="bizbox-product-catalog__product-price">
          ${this.formatCurrency(product.price, product.currency)}
        </div>
        ${product.variants && product.variants.length > 0 ? 
          `<div class="bizbox-product-catalog__product-variants">
            <select class="bizbox-product-catalog__variant-select">
              <option value="">Select variant...</option>
              ${product.variants.map(variant => 
                `<option value="${variant.id}" data-price="${variant.price}">
                  ${this.escapeHtml(variant.name)} - ${this.formatCurrency(variant.price, product.currency)}
                </option>`
              ).join('')}
            </select>
          </div>` : 
          ''
        }
        <div class="bizbox-product-catalog__product-actions">
          ${isInCart ? 
            `<div class="bizbox-product-catalog__quantity-controls">
              <button class="bizbox-product-catalog__quantity-btn" data-action="decrease" data-product-id="${product.id}">-</button>
              <span class="bizbox-product-catalog__quantity">${cartItem?.quantity || 0}</span>
              <button class="bizbox-product-catalog__quantity-btn" data-action="increase" data-product-id="${product.id}">+</button>
            </div>` :
            `<button class="bizbox-product-catalog__add-to-cart-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
              Add to Cart
            </button>`
          }
        </div>
      </div>
    `;
    
    // Add event listeners
    const addToCartBtn = card.querySelector('.bizbox-product-catalog__add-to-cart-btn') as HTMLButtonElement;
    const quantityBtns = card.querySelectorAll('.bizbox-product-catalog__quantity-btn');
    const variantSelect = card.querySelector('.bizbox-product-catalog__variant-select') as HTMLSelectElement;
    
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        let variantId: string | undefined;
        let price = product.price;
        
        if (variantSelect && variantSelect.value) {
          variantId = variantSelect.value;
          const selectedOption = variantSelect.selectedOptions[0];
          price = parseFloat(selectedOption.dataset.price || product.price.toString());
        }
        
        this.addToCart(product, variantId, price);
      });
    }
    
    quantityBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        const productId = (e.target as HTMLElement).dataset.productId;
        
        if (action === 'increase') {
          this.increaseQuantity(productId!);
        } else if (action === 'decrease') {
          this.decreaseQuantity(productId!);
        }
      });
    });
    
    return card;
  }

  private createPagination(): HTMLElement {
    const pagination = this.createElement('div', 'bizbox-product-catalog__pagination');
    
    const perPage = this.catalogConfig.productsPerPage || 12;
    const totalPages = Math.ceil(this.filteredProducts.length / perPage);
    
    // Previous button
    const prevBtn = this.createElement('button', 'bizbox-product-catalog__page-btn', '‹ Previous');
    if (this.currentPage === 1) {
      prevBtn.classList.add('bizbox-product-catalog__page-btn--disabled');
    } else {
      prevBtn.addEventListener('click', () => {
        this.currentPage--;
        this.updateProductsDisplay();
      });
    }
    pagination.appendChild(prevBtn);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = this.createElement('button', 'bizbox-product-catalog__page-btn', i.toString());
      if (i === this.currentPage) {
        pageBtn.classList.add('bizbox-product-catalog__page-btn--active');
      } else {
        pageBtn.addEventListener('click', () => {
          this.currentPage = i;
          this.updateProductsDisplay();
        });
      }
      pagination.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = this.createElement('button', 'bizbox-product-catalog__page-btn', 'Next ›');
    if (this.currentPage === totalPages) {
      nextBtn.classList.add('bizbox-product-catalog__page-btn--disabled');
    } else {
      nextBtn.addEventListener('click', () => {
        this.currentPage++;
        this.updateProductsDisplay();
      });
    }
    pagination.appendChild(nextBtn);
    
    return pagination;
  }

  private async loadProducts(): Promise<void> {
    const endpoint = this.catalogConfig.categoryId 
      ? `/api/products?categoryId=${this.catalogConfig.categoryId}`
      : `/api/tenants/${this.config.tenantId}/products`;
    
    this.products = await this.apiClient.get<Product[]>(endpoint);
  }

  private applyFilters(): void {
    this.filteredProducts = this.products.filter(product => {
      // Search filter
      if (this.filters.search) {
        const searchTerm = this.filters.search.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }
      
      // Price filter
      if (product.price < this.filters.priceRange.min || product.price > this.filters.priceRange.max) {
        return false;
      }
      
      return true;
    });
    
    // Reset to first page when filters change
    this.currentPage = 1;
  }

  private getPaginatedProducts(): Product[] {
    const perPage = this.catalogConfig.productsPerPage || 12;
    const startIndex = (this.currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    return this.filteredProducts.slice(startIndex, endIndex);
  }

  private addToCart(product: Product, variantId?: string, price?: number): void {
    const finalPrice = price || product.price;
    
    const existingItem = this.cart.items.find(item => 
      item.productId === product.id && item.variantId === variantId
    );
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.items.push({
        productId: product.id,
        variantId,
        quantity: 1,
        price: finalPrice
      });
    }
    
    this.updateCartTotals();
    this.emit('product:added-to-cart', { product, variantId, quantity: 1 }, this.widgetId);
    this.catalogConfig.onAddToCart?.({
      productId: product.id,
      variantId,
      quantity: 1,
      price: finalPrice
    });
    
    // Re-render to update cart display
    this.render();
  }

  private increaseQuantity(productId: string): void {
    const item = this.cart.items.find(item => item.productId === productId);
    if (item) {
      item.quantity++;
      this.updateCartTotals();
      this.render();
    }
  }

  private decreaseQuantity(productId: string): void {
    const itemIndex = this.cart.items.findIndex(item => item.productId === productId);
    if (itemIndex !== -1) {
      const item = this.cart.items[itemIndex];
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        this.cart.items.splice(itemIndex, 1);
      }
      this.updateCartTotals();
      this.render();
    }
  }

  private updateCartTotals(): void {
    this.cart.totalItems = this.cart.items.reduce((total, item) => total + item.quantity, 0);
    this.cart.totalPrice = this.cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  private updateProductsDisplay(): void {
    const contentElement = this.container.querySelector('.bizbox-product-catalog__content');
    if (contentElement) {
      contentElement.innerHTML = '';
      
      const productsElement = this.createProductsGrid();
      contentElement.appendChild(productsElement);
      
      if (this.catalogConfig.productsPerPage && this.filteredProducts.length > this.catalogConfig.productsPerPage) {
        const paginationElement = this.createPagination();
        contentElement.appendChild(paginationElement);
      }
    }
  }

  private handleCheckout(): void {
    this.emit('checkout:initiated', { cart: this.cart }, this.widgetId);
    this.catalogConfig.onCheckout?.(this.cart);
    
    // In a real implementation, this would integrate with payment processing
    console.log('Checkout initiated with cart:', this.cart);
  }

  // Public methods for external cart management
  public getCart(): ShoppingCart {
    return { ...this.cart };
  }

  public clearCart(): void {
    this.cart = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: 'GBP'
    };
    this.render();
  }

  public updateCartFromExternal(cart: ShoppingCart): void {
    this.cart = { ...cart };
    this.render();
  }
}