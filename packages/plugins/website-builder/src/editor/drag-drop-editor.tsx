import React, { useState, useCallback, useRef, useEffect } from 'react'
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ComponentInstance, ComponentDefinition, componentLibraryInstance } from '../components/component-library'
import { PageRenderer } from '../rendering/page-renderer'
import { Button } from '@bizbox/shared-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@bizbox/shared-ui'

export interface DragDropEditorProps {
  initialComponents?: ComponentInstance[]
  onComponentsChange?: (components: ComponentInstance[]) => void
  businessData?: any
  services?: any[]
  staff?: any[]
  theme?: any
}

export interface DragItem {
  type: string
  id?: string
  componentType?: string
  index?: number
}

const ItemTypes = {
  COMPONENT: 'component',
  NEW_COMPONENT: 'new_component'
}

// Draggable component from palette
const DraggableComponent: React.FC<{
  definition: ComponentDefinition
  onDragStart?: () => void
}> = ({ definition, onDragStart }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.NEW_COMPONENT,
    item: { type: ItemTypes.NEW_COMPONENT, componentType: definition.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    begin: () => {
      onDragStart?.()
    }
  })

  return (
    <div
      ref={drag}
      className={`component-palette-item ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="component-icon">{definition.category}</div>
      <div className="component-info">
        <h4>{definition.name}</h4>
        <p>{definition.description}</p>
      </div>
    </div>
  )
}

// Draggable existing component
const DraggableExistingComponent: React.FC<{
  component: ComponentInstance
  index: number
  onMove: (dragIndex: number, hoverIndex: number) => void
  onEdit: (component: ComponentInstance) => void
  onDelete: (componentId: string) => void
  children: React.ReactNode
}> = ({ component, index, onMove, onEdit, onDelete, children }) => {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.COMPONENT,
    item: { type: ItemTypes.COMPONENT, id: component.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: ItemTypes.COMPONENT,
    hover: (item: DragItem, monitor: DropTargetMonitor) => {
      if (!ref.current) return

      const dragIndex = item.index!
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      onMove(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      className={`editable-component ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="component-overlay">
        <div className="component-controls">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(component)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(component.id)}
          >
            Delete
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

// Drop zone for new components
const DropZone: React.FC<{
  index: number
  onDrop: (item: DragItem, index: number) => void
}> = ({ index, onDrop }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.NEW_COMPONENT, ItemTypes.COMPONENT],
    drop: (item: DragItem) => {
      onDrop(item, index)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const isActive = isOver && canDrop

  return (
    <div
      ref={drop}
      className={`drop-zone ${isActive ? 'active' : ''} ${canDrop ? 'can-drop' : ''}`}
      style={{
        height: isActive ? '60px' : '20px',
        backgroundColor: isActive ? '#e3f2fd' : 'transparent',
        border: isActive ? '2px dashed #2196f3' : '2px dashed transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {isActive && (
        <div className="drop-indicator">
          Drop component here
        </div>
      )}
    </div>
  )
}

// Component property editor
const PropertyEditor: React.FC<{
  component: ComponentInstance | null
  onUpdate: (componentId: string, props: Record<string, any>) => void
  onClose: () => void
}> = ({ component, onUpdate, onClose }) => {
  const [props, setProps] = useState<Record<string, any>>({})

  useEffect(() => {
    if (component) {
      setProps(component.props)
    }
  }, [component])

  if (!component) return null

  const definition = componentLibraryInstance.getComponent(component.componentId)
  if (!definition) return null

  const handlePropChange = (propName: string, value: any) => {
    const newProps = { ...props, [propName]: value }
    setProps(newProps)
    onUpdate(component.id, newProps)
  }

  return (
    <Card className="property-editor">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Edit {definition.name}</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {definition.props.map((propDef) => (
            <div key={propDef.name} className="form-field">
              <label className="block text-sm font-medium mb-1">
                {propDef.label}
                {propDef.required && <span className="text-red-500">*</span>}
              </label>
              
              {propDef.type === 'string' && (
                <input
                  type="text"
                  value={props[propDef.name] || ''}
                  onChange={(e) => handlePropChange(propDef.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={propDef.defaultValue}
                />
              )}
              
              {propDef.type === 'number' && (
                <input
                  type="number"
                  value={props[propDef.name] || ''}
                  onChange={(e) => handlePropChange(propDef.name, Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              )}
              
              {propDef.type === 'boolean' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={props[propDef.name] || false}
                    onChange={(e) => handlePropChange(propDef.name, e.target.checked)}
                    className="mr-2"
                  />
                  {propDef.label}
                </label>
              )}
              
              {propDef.options && (
                <select
                  value={props[propDef.name] || ''}
                  onChange={(e) => handlePropChange(propDef.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {propDef.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {propDef.description && (
                <p className="text-xs text-gray-500 mt-1">{propDef.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main drag-drop editor component
export const DragDropEditor: React.FC<DragDropEditorProps> = ({
  initialComponents = [],
  onComponentsChange,
  businessData,
  services,
  staff,
  theme
}) => {
  const [components, setComponents] = useState<ComponentInstance[]>(initialComponents)
  const [selectedComponent, setSelectedComponent] = useState<ComponentInstance | null>(null)
  const [showPalette, setShowPalette] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)

  const pageRenderer = new PageRenderer()

  // Get all available component definitions
  const componentDefinitions = componentLibraryInstance.getAllComponents()

  const updateComponents = useCallback((newComponents: ComponentInstance[]) => {
    setComponents(newComponents)
    onComponentsChange?.(newComponents)
  }, [onComponentsChange])

  const handleDrop = useCallback((item: DragItem, index: number) => {
    if (item.type === ItemTypes.NEW_COMPONENT && item.componentType) {
      // Create new component instance
      const newComponent = componentLibraryInstance.createInstance(item.componentType)
      if (newComponent) {
        const newComponents = [...components]
        newComponents.splice(index, 0, newComponent)
        updateComponents(newComponents)
      }
    } else if (item.type === ItemTypes.COMPONENT && item.index !== undefined) {
      // Move existing component
      const newComponents = [...components]
      const [movedComponent] = newComponents.splice(item.index, 1)
      newComponents.splice(index, 0, movedComponent)
      updateComponents(newComponents)
    }
  }, [components, updateComponents])

  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    const newComponents = [...components]
    const [movedComponent] = newComponents.splice(dragIndex, 1)
    newComponents.splice(hoverIndex, 0, movedComponent)
    updateComponents(newComponents)
  }, [components, updateComponents])

  const handleEdit = useCallback((component: ComponentInstance) => {
    setSelectedComponent(component)
  }, [])

  const handleDelete = useCallback((componentId: string) => {
    const newComponents = components.filter(c => c.id !== componentId)
    updateComponents(newComponents)
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null)
    }
  }, [components, selectedComponent, updateComponents])

  const handlePropertyUpdate = useCallback((componentId: string, newProps: Record<string, any>) => {
    const newComponents = components.map(c => 
      c.id === componentId ? { ...c, props: newProps } : c
    )
    updateComponents(newComponents)
  }, [components, updateComponents])

  const renderComponent = (component: ComponentInstance, index: number) => {
    try {
      const element = pageRenderer.renderComponent(component, {
        theme,
        editable: false
      })

      return (
        <DraggableExistingComponent
          key={component.id}
          component={component}
          index={index}
          onMove={handleMove}
          onEdit={handleEdit}
          onDelete={handleDelete}
        >
          {element}
        </DraggableExistingComponent>
      )
    } catch (error) {
      return (
        <div key={component.id} className="component-error">
          Error rendering component: {component.componentId}
        </div>
      )
    }
  }

  if (previewMode) {
    return (
      <div className="preview-mode">
        <div className="preview-header">
          <Button onClick={() => setPreviewMode(false)}>
            Exit Preview
          </Button>
        </div>
        <div className="preview-content">
          {components.map((component, index) => (
            <div key={component.id}>
              {pageRenderer.renderComponent(component, { theme })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="drag-drop-editor">
        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <Button
              variant={showPalette ? 'default' : 'outline'}
              onClick={() => setShowPalette(!showPalette)}
            >
              Components
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewMode(true)}
            >
              Preview
            </Button>
          </div>
          <div className="toolbar-right">
            <span className="component-count">
              {components.length} components
            </span>
          </div>
        </div>

        <div className="editor-layout">
          {/* Component Palette */}
          {showPalette && (
            <div className="component-palette">
              <h3>Components</h3>
              <div className="palette-categories">
                {['layout', 'content', 'business', 'form', 'media'].map(category => (
                  <div key={category} className="category-section">
                    <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                    {componentDefinitions
                      .filter(def => def.category === category)
                      .map(definition => (
                        <DraggableComponent
                          key={definition.id}
                          definition={definition}
                        />
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="editor-canvas">
            <div className="canvas-content">
              <DropZone index={0} onDrop={handleDrop} />
              
              {components.map((component, index) => (
                <React.Fragment key={component.id}>
                  {renderComponent(component, index)}
                  <DropZone index={index + 1} onDrop={handleDrop} />
                </React.Fragment>
              ))}
              
              {components.length === 0 && (
                <div className="empty-canvas">
                  <h3>Start building your page</h3>
                  <p>Drag components from the palette to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Property Editor */}
          {selectedComponent && (
            <div className="property-panel">
              <PropertyEditor
                component={selectedComponent}
                onUpdate={handlePropertyUpdate}
                onClose={() => setSelectedComponent(null)}
              />
            </div>
          )}
        </div>

        {/* Styles */}
        <style jsx>{`
          .drag-drop-editor {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #f5f5f5;
          }

          .editor-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: white;
            border-bottom: 1px solid #e0e0e0;
          }

          .toolbar-left {
            display: flex;
            gap: 0.5rem;
          }

          .component-count {
            font-size: 0.875rem;
            color: #666;
          }

          .editor-layout {
            display: flex;
            flex: 1;
            overflow: hidden;
          }

          .component-palette {
            width: 300px;
            background: white;
            border-right: 1px solid #e0e0e0;
            overflow-y: auto;
            padding: 1rem;
          }

          .palette-categories h3 {
            margin: 0 0 1rem 0;
            font-size: 1.125rem;
            font-weight: 600;
          }

          .category-section {
            margin-bottom: 1.5rem;
          }

          .category-section h4 {
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
            font-weight: 500;
            color: #666;
            text-transform: uppercase;
          }

          .component-palette-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 0.375rem;
            cursor: grab;
            transition: all 0.2s ease;
          }

          .component-palette-item:hover {
            background: #e9ecef;
            border-color: #dee2e6;
          }

          .component-palette-item.dragging {
            cursor: grabbing;
          }

          .component-icon {
            width: 32px;
            height: 32px;
            background: #6c757d;
            border-radius: 0.25rem;
            margin-right: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
          }

          .component-info h4 {
            margin: 0 0 0.25rem 0;
            font-size: 0.875rem;
            font-weight: 500;
          }

          .component-info p {
            margin: 0;
            font-size: 0.75rem;
            color: #666;
          }

          .editor-canvas {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
          }

          .canvas-content {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            min-height: 600px;
          }

          .drop-zone {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0.5rem 0;
            border-radius: 0.25rem;
          }

          .drop-indicator {
            font-size: 0.875rem;
            color: #2196f3;
            font-weight: 500;
          }

          .editable-component {
            position: relative;
            margin: 1rem 0;
          }

          .component-overlay {
            position: absolute;
            top: 0;
            right: 0;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .editable-component:hover .component-overlay {
            opacity: 1;
          }

          .component-controls {
            display: flex;
            gap: 0.25rem;
            padding: 0.5rem;
          }

          .empty-canvas {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            text-align: center;
            color: #666;
          }

          .empty-canvas h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
          }

          .empty-canvas p {
            margin: 0;
            font-size: 0.875rem;
          }

          .property-panel {
            width: 320px;
            background: white;
            border-left: 1px solid #e0e0e0;
            overflow-y: auto;
            padding: 1rem;
          }

          .property-editor {
            position: sticky;
            top: 0;
          }

          .form-field {
            margin-bottom: 1rem;
          }

          .form-field label {
            display: block;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
            font-weight: 500;
          }

          .form-field input,
          .form-field select,
          .form-field textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 0.875rem;
          }

          .form-field input:focus,
          .form-field select:focus,
          .form-field textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .component-error {
            padding: 1rem;
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 0.375rem;
            color: #c33;
            text-align: center;
          }

          .preview-mode {
            height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .preview-header {
            padding: 1rem;
            background: white;
            border-bottom: 1px solid #e0e0e0;
          }

          .preview-content {
            flex: 1;
            overflow-y: auto;
          }
        `}</style>
      </div>
    </DndProvider>
  )
}

export default DragDropEditor