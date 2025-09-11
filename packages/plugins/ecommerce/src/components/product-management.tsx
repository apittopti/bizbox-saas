import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@bizbox/shared-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  Settings,
  Upload,
  Download,
  Copy,
  Star
} from 'lucide-react'
import { 
  Product, 
  ProductVariant, 
  ProductCategory, 
  StockAlert,
  enhancedProductManager 
} from '../models/enhanced-product'
import { MediaFormField } from '@bizbox/website-builder'

interface ProductManagementProps {
  tenantId: string
  userId: string
}

interface ProductFormProps {
  product?: Product
  onSave: (product: Partial<Product>) => void
  onCancel: () => void
  categories: ProductCategory[]
}

interface ProductStatsProps {
  tenantId: string
}

const ProductStats: React.FC<ProductStatsProps> = ({ tenantId }) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lowStockAlerts: 0,
    totalValue: 0,
    topCategories: [] as Array<{ name: string; count: number }>
  })

  useEffect(() => {
    loadStats()
  }, [tenantId])

  const loadStats = async () => {
    try {
      // Mock stats - in real implementation would fetch from API
      setStats({
        totalProducts: 156,
        activeProducts: 142,
        lowStockAlerts: 8,
        totalValue: 45230,
        topCategories: [
          { name: 'Electronics', count: 45 },
          { name: 'Clothing', count: 38 },
          { name: 'Home & Garden', count: 32 }
        ]
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeProducts}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{stats.lowStockAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold">£{stats.totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel, categories }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    currency: 'GBP',
    category: '',
    tags: [],
    images: [],
    stockQuantity: 0,
    lowStockThreshold: 5,
    sku: '',
    isActive: true,
    isFeatured: false,
    isDigital: false,
    requiresShipping: true,
    taxable: true,
    ...product
  })

  const [currentTag, setCurrentTag] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Product Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">SKU *</label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              placeholder="Enter SKU"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Price *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Compare At Price</label>
              <Input
                type="number"
                step="0.01"
                value={formData.compareAtPrice || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  compareAtPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              rows={4}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Stock Quantity</label>
              <Input
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Low Stock Threshold</label>
              <Input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))}
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Product Images</h3>
        <MediaFormField
          label="Main Product Image"
          value={formData.images?.[0] ? { 
            id: formData.images[0].id,
            originalName: 'Product Image',
            url: formData.images[0].url,
            mimeType: 'image/jpeg',
            size: 0,
            metadata: {}
          } as any : undefined}
          onChange={(file) => {
            if (file) {
              setFormData(prev => ({
                ...prev,
                images: [{
                  id: file.id,
                  url: file.url,
                  alt: formData.name || 'Product image',
                  position: 0,
                  isMain: true
                }]
              }))
            } else {
              setFormData(prev => ({ ...prev, images: [] }))
            }
          }}
          allowedTypes={['image/*']}
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
            />
            <span className="text-sm">Featured</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isDigital}
              onChange={(e) => setFormData(prev => ({ ...prev, isDigital: e.target.checked }))}
            />
            <span className="text-sm">Digital Product</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requiresShipping}
              onChange={(e) => setFormData(prev => ({ ...prev, requiresShipping: e.target.checked }))}
            />
            <span className="text-sm">Requires Shipping</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" className="flex-1">
          {product ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export const ProductManagement: React.FC<ProductManagementProps> = ({ tenantId, userId }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load products
      const productResult = await enhancedProductManager.getProducts(tenantId, {
        search: searchQuery || undefined,
        category: selectedCategory || undefined
      })
      setProducts(productResult.products)

      // Load categories
      const categoriesResult = await enhancedProductManager.getCategories(tenantId)
      setCategories(categoriesResult)

      // Load stock alerts
      const alertsResult = await enhancedProductManager.getLowStockAlerts(tenantId)
      setStockAlerts(alertsResult)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (productData: Partial<Product>) => {
    try {
      await enhancedProductManager.createProduct(tenantId, productData as any)
      setShowProductForm(false)
      await loadData()
    } catch (error) {
      console.error('Failed to create product:', error)
    }
  }

  const handleUpdateProduct = async (productData: Partial<Product>) => {
    if (!selectedProduct) return

    try {
      await enhancedProductManager.updateProduct(selectedProduct.id, productData)
      setSelectedProduct(null)
      setShowProductForm(false)
      await loadData()
    } catch (error) {
      console.error('Failed to update product:', error)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await enhancedProductManager.deleteProduct(productId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-gray-600">SKU: {product.sku}</p>
              </div>
              <div className="flex items-center gap-1">
                {product.isFeatured && <Star className="w-4 h-4 text-yellow-500" />}
                {!product.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">£{product.price.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  Stock: {product.stockQuantity}
                  {product.stockQuantity <= product.lowStockThreshold && (
                    <AlertTriangle className="w-4 h-4 text-orange-500 inline ml-1" />
                  )}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(product)
                    setShowProductForm(true)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Management</h1>
          <p className="text-gray-600">Manage your product catalog and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowProductForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ProductStats tenantId={tenantId} />

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Stock Alerts ({stockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-gray-600">
                      Current stock: {alert.currentStock} | Threshold: {alert.threshold}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Product
                  </Button>
                </div>
              ))}
              {stockAlerts.length > 3 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  +{stockAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
        
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">No products found</p>
          <Button onClick={() => setShowProductForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Product
          </Button>
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct ? 'Update product information' : 'Create a new product for your catalog'}
            </DialogDescription>
          </DialogHeader>
          
          <ProductForm
            product={selectedProduct || undefined}
            onSave={selectedProduct ? handleUpdateProduct : handleCreateProduct}
            onCancel={() => {
              setShowProductForm(false)
              setSelectedProduct(null)
            }}
            categories={categories}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}