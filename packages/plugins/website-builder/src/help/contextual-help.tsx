import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'

export interface HelpTopic {
  id: string
  title: string
  content: string
  category: 'getting-started' | 'components' | 'design' | 'publishing' | 'troubleshooting'
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // minutes
  steps?: HelpStep[]
  relatedTopics?: string[]
  videoUrl?: string
  images?: string[]
}

export interface HelpStep {
  id: string
  title: string
  description: string
  action?: string
  selector?: string // CSS selector for highlighting
  image?: string
  tip?: string
}

export interface ContextualHelpProps {
  currentContext?: string
  userProgress?: UserProgress
  onHelpComplete?: (topicId: string) => void
  onDismiss?: () => void
}

export interface UserProgress {
  completedTopics: string[]
  currentTopic?: string
  currentStep?: number
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  preferences: {
    showTips: boolean
    autoAdvance: boolean
    highlightElements: boolean
  }
}

export interface TutorialState {
  isActive: boolean
  currentTopic?: string
  currentStep: number
  highlightedElement?: string
}

const helpTopics: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Website Builder',
    content: 'Learn the basics of creating your first website with our drag-and-drop builder.',
    category: 'getting-started',
    tags: ['basics', 'introduction', 'first-time'],
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Website Builder',
        description: 'This tutorial will guide you through creating your first website. You\'ll learn how to add components, customize content, and publish your site.',
        tip: 'Take your time and don\'t worry about making mistakes - you can always undo changes!'
      },
      {
        id: 'component-palette',
        title: 'Component Palette',
        description: 'The component palette on the left contains all the building blocks for your website. Components are organized by category.',
        selector: '.component-palette',
        action: 'Look at the different component categories available'
      },
      {
        id: 'drag-component',
        title: 'Adding Components',
        description: 'Drag a component from the palette to the canvas to add it to your page. Try dragging the Hero Section component.',
        selector: '.component-palette-item[data-component-type="hero-section"]',
        action: 'Drag the Hero Section to the canvas'
      },
      {
        id: 'edit-component',
        title: 'Editing Components',
        description: 'Click on a component to select it, then use the property panel on the right to customize its content and appearance.',
        selector: '.property-panel',
        action: 'Try editing the hero title'
      },
      {
        id: 'preview',
        title: 'Preview Your Site',
        description: 'Click the Preview button to see how your website will look to visitors.',
        selector: 'button:contains("Preview")',
        action: 'Click Preview to see your site'
      }
    ],
    relatedTopics: ['adding-components', 'editing-content']
  },
  {
    id: 'adding-components',
    title: 'Adding and Arranging Components',
    content: 'Learn how to add different types of components and arrange them on your page.',
    category: 'components',
    tags: ['components', 'layout', 'drag-drop'],
    difficulty: 'beginner',
    estimatedTime: 8,
    steps: [
      {
        id: 'component-types',
        title: 'Understanding Component Types',
        description: 'Components are organized into categories: Layout (structure), Content (text/images), Business (services/team), Forms (contact), and Media (galleries).',
        tip: 'Start with layout components like Hero Section, then add content components'
      },
      {
        id: 'drag-drop',
        title: 'Drag and Drop',
        description: 'Simply drag any component from the palette to the blue drop zones on your page. The drop zones show you where the component will be placed.',
        action: 'Try adding a Services Grid component'
      },
      {
        id: 'reordering',
        title: 'Reordering Components',
        description: 'You can drag existing components to reorder them. Hover over a component and drag it to a new position.',
        action: 'Try moving a component to a different position'
      },
      {
        id: 'deleting',
        title: 'Removing Components',
        description: 'Hover over a component and click the Delete button to remove it from your page.',
        tip: 'Don\'t worry about deleting components - you can always add them back!'
      }
    ],
    relatedTopics: ['getting-started', 'editing-content']
  },
  {
    id: 'editing-content',
    title: 'Customizing Content',
    content: 'Learn how to edit text, images, and other content in your components.',
    category: 'components',
    tags: ['content', 'editing', 'customization'],
    difficulty: 'beginner',
    estimatedTime: 10,
    steps: [
      {
        id: 'property-panel',
        title: 'Using the Property Panel',
        description: 'When you select a component, the property panel appears on the right. This is where you can edit all the component\'s settings.',
        selector: '.property-panel'
      },
      {
        id: 'text-editing',
        title: 'Editing Text',
        description: 'Text fields allow you to change titles, descriptions, and other text content. Simply click in the field and type your new content.',
        action: 'Try changing a component title'
      },
      {
        id: 'images',
        title: 'Adding Images',
        description: 'For image fields, you can paste an image URL or upload an image file. Make sure to use high-quality images for the best results.',
        tip: 'Use images that are at least 1200px wide for best quality'
      },
      {
        id: 'styling',
        title: 'Styling Options',
        description: 'Many components have styling options like colors, layouts, and display preferences. Experiment with these to match your brand.',
        action: 'Try changing a component\'s layout or color options'
      }
    ],
    relatedTopics: ['adding-components', 'design-tips']
  },
  {
    id: 'design-tips',
    title: 'Design Best Practices',
    content: 'Learn design principles to make your website look professional and engaging.',
    category: 'design',
    tags: ['design', 'best-practices', 'professional'],
    difficulty: 'intermediate',
    estimatedTime: 15,
    steps: [
      {
        id: 'visual-hierarchy',
        title: 'Visual Hierarchy',
        description: 'Use different text sizes and weights to guide visitors\' attention. Your most important message should be the largest and most prominent.',
        tip: 'Hero sections should have the largest text, followed by section headings'
      },
      {
        id: 'color-consistency',
        title: 'Consistent Colors',
        description: 'Stick to 2-3 main colors throughout your site. Use your brand colors if you have them, or choose colors that reflect your business personality.',
        tip: 'Blue conveys trust, green suggests growth, red creates urgency'
      },
      {
        id: 'white-space',
        title: 'White Space',
        description: 'Don\'t try to fill every inch of your page. White space (empty areas) makes your content easier to read and more professional.',
        tip: 'If your page feels cluttered, try removing some content rather than making text smaller'
      },
      {
        id: 'mobile-friendly',
        title: 'Mobile Considerations',
        description: 'Most visitors will view your site on mobile devices. Keep text readable and buttons easy to tap.',
        tip: 'Preview your site on different screen sizes to ensure it looks good everywhere'
      }
    ],
    relatedTopics: ['editing-content', 'publishing']
  },
  {
    id: 'publishing',
    title: 'Publishing Your Website',
    content: 'Learn how to publish your website and make it live for visitors.',
    category: 'publishing',
    tags: ['publishing', 'live', 'domain'],
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'preview-first',
        title: 'Preview Before Publishing',
        description: 'Always preview your website before publishing to make sure everything looks correct.',
        action: 'Click Preview to check your site'
      },
      {
        id: 'publish-button',
        title: 'Publishing',
        description: 'When you\'re ready, click the Publish button to make your website live. Your site will be available at your custom URL.',
        action: 'Click Publish when ready'
      },
      {
        id: 'share-url',
        title: 'Sharing Your Site',
        description: 'Once published, you can share your website URL with customers, on social media, and in your marketing materials.',
        tip: 'Add your website URL to your business cards and email signature'
      }
    ],
    relatedTopics: ['design-tips']
  }
]

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  currentContext,
  userProgress,
  onHelpComplete,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [currentTopic, setCurrentTopic] = useState<HelpTopic | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isActive: false,
    currentStep: 0
  })

  // Get contextual help topics based on current context
  const getContextualTopics = useCallback(() => {
    if (!currentContext) return helpTopics.slice(0, 3)

    // Filter topics based on context
    const contextMap: Record<string, string[]> = {
      'editor': ['getting-started', 'adding-components', 'editing-content'],
      'component-palette': ['adding-components'],
      'property-panel': ['editing-content'],
      'canvas': ['adding-components', 'design-tips'],
      'preview': ['publishing', 'design-tips']
    }

    const relevantTopicIds = contextMap[currentContext] || []
    return helpTopics.filter(topic => relevantTopicIds.includes(topic.id))
  }, [currentContext])

  // Start tutorial for a specific topic
  const startTutorial = useCallback((topic: HelpTopic) => {
    setCurrentTopic(topic)
    setCurrentStep(0)
    setTutorialState({
      isActive: true,
      currentTopic: topic.id,
      currentStep: 0
    })
    setIsVisible(true)

    // Highlight first element if available
    if (topic.steps?.[0]?.selector) {
      highlightElement(topic.steps[0].selector)
    }
  }, [])

  // Navigate tutorial steps
  const nextStep = useCallback(() => {
    if (!currentTopic?.steps) return

    const newStep = currentStep + 1
    if (newStep >= currentTopic.steps.length) {
      // Tutorial complete
      setTutorialState({ isActive: false, currentStep: 0 })
      onHelpComplete?.(currentTopic.id)
      setIsVisible(false)
      return
    }

    setCurrentStep(newStep)
    setTutorialState(prev => ({ ...prev, currentStep: newStep }))

    // Highlight next element
    const step = currentTopic.steps[newStep]
    if (step.selector) {
      highlightElement(step.selector)
    }
  }, [currentTopic, currentStep, onHelpComplete])

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      setTutorialState(prev => ({ ...prev, currentStep: newStep }))

      // Highlight previous element
      const step = currentTopic?.steps?.[newStep]
      if (step?.selector) {
        highlightElement(step.selector)
      }
    }
  }, [currentStep, currentTopic])

  // Highlight element on page
  const highlightElement = useCallback((selector: string) => {
    // Remove existing highlights
    document.querySelectorAll('.help-highlight').forEach(el => {
      el.classList.remove('help-highlight')
    })

    // Add highlight to target element
    try {
      const element = document.querySelector(selector)
      if (element) {
        element.classList.add('help-highlight')
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTutorialState(prev => ({ ...prev, highlightedElement: selector }))
      }
    } catch (error) {
      console.warn('Could not highlight element:', selector)
    }
  }, [])

  // Clean up highlights
  const clearHighlights = useCallback(() => {
    document.querySelectorAll('.help-highlight').forEach(el => {
      el.classList.remove('help-highlight')
    })
    setTutorialState(prev => ({ ...prev, highlightedElement: undefined }))
  }, [])

  // Close tutorial
  const closeTutorial = useCallback(() => {
    setTutorialState({ isActive: false, currentStep: 0 })
    setCurrentTopic(null)
    setCurrentStep(0)
    setIsVisible(false)
    clearHighlights()
    onDismiss?.()
  }, [clearHighlights, onDismiss])

  // Auto-show help for first-time users
  useEffect(() => {
    if (userProgress?.skillLevel === 'beginner' && 
        !userProgress.completedTopics.includes('getting-started') &&
        currentContext === 'editor') {
      setIsVisible(true)
    }
  }, [userProgress, currentContext])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearHighlights()
    }
  }, [clearHighlights])

  if (!isVisible) {
    return (
      <Button
        className="help-trigger"
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
      >
        ? Help
      </Button>
    )
  }

  const contextualTopics = getContextualTopics()

  return (
    <>
      {/* Help Panel */}
      <Card className="contextual-help-panel">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>
              {tutorialState.isActive ? 'Tutorial' : 'Help & Tips'}
            </span>
            <Button variant="outline" size="sm" onClick={closeTutorial}>
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tutorialState.isActive && currentTopic ? (
            // Tutorial Mode
            <div className="tutorial-content">
              <div className="tutorial-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${((currentStep + 1) / (currentTopic.steps?.length || 1)) * 100}%` 
                    }}
                  />
                </div>
                <span className="progress-text">
                  Step {currentStep + 1} of {currentTopic.steps?.length || 0}
                </span>
              </div>

              {currentTopic.steps?.[currentStep] && (
                <div className="tutorial-step">
                  <h3>{currentTopic.steps[currentStep].title}</h3>
                  <p>{currentTopic.steps[currentStep].description}</p>
                  
                  {currentTopic.steps[currentStep].action && (
                    <div className="step-action">
                      <strong>Try this:</strong> {currentTopic.steps[currentStep].action}
                    </div>
                  )}
                  
                  {currentTopic.steps[currentStep].tip && (
                    <div className="step-tip">
                      <strong>💡 Tip:</strong> {currentTopic.steps[currentStep].tip}
                    </div>
                  )}
                </div>
              )}

              <div className="tutorial-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousStep}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                >
                  {currentStep === (currentTopic.steps?.length || 1) - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          ) : (
            // Help Topics List
            <div className="help-topics">
              <div className="quick-start">
                <h3>Quick Start</h3>
                <Button
                  className="start-tutorial-btn"
                  onClick={() => startTutorial(helpTopics[0])}
                >
                  Start Interactive Tutorial
                </Button>
              </div>

              <div className="contextual-topics">
                <h3>Helpful Topics</h3>
                {contextualTopics.map(topic => (
                  <div key={topic.id} className="help-topic-item">
                    <div className="topic-info">
                      <h4>{topic.title}</h4>
                      <p>{topic.content}</p>
                      <div className="topic-meta">
                        <span className="difficulty">{topic.difficulty}</span>
                        <span className="time">{topic.estimatedTime} min</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startTutorial(topic)}
                    >
                      Start
                    </Button>
                  </div>
                ))}
              </div>

              <div className="all-topics">
                <h3>All Help Topics</h3>
                {helpTopics.map(topic => (
                  <div key={topic.id} className="help-topic-item">
                    <div className="topic-info">
                      <h4>{topic.title}</h4>
                      <div className="topic-meta">
                        <span className="category">{topic.category}</span>
                        <span className="difficulty">{topic.difficulty}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startTutorial(topic)}
                    >
                      Learn
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Styles */}
      <style jsx>{`
        .contextual-help-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 350px;
          max-height: 80vh;
          overflow-y: auto;
          z-index: 1000;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .help-trigger {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999;
        }

        .tutorial-progress {
          margin-bottom: 1rem;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .tutorial-step h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .tutorial-step p {
          margin: 0 0 1rem 0;
          color: #4b5563;
          line-height: 1.5;
        }

        .step-action {
          padding: 0.75rem;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 0.375rem;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .step-tip {
          padding: 0.75rem;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 0.375rem;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .tutorial-controls {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
        }

        .help-topics h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .quick-start {
          margin-bottom: 2rem;
        }

        .start-tutorial-btn {
          width: 100%;
          margin-top: 0.5rem;
        }

        .contextual-topics,
        .all-topics {
          margin-bottom: 2rem;
        }

        .help-topic-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .help-topic-item:last-child {
          border-bottom: none;
        }

        .topic-info {
          flex: 1;
          margin-right: 1rem;
        }

        .topic-info h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .topic-info p {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .topic-meta {
          display: flex;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .topic-meta span {
          padding: 0.125rem 0.375rem;
          background: #f3f4f6;
          border-radius: 0.25rem;
          color: #6b7280;
        }

        .difficulty {
          background: #fef3c7 !important;
          color: #92400e !important;
        }

        .category {
          background: #e0e7ff !important;
          color: #3730a3 !important;
        }

        .time {
          background: #f0fdf4 !important;
          color: #166534 !important;
        }

        /* Global highlight styles */
        :global(.help-highlight) {
          position: relative;
          z-index: 999;
        }

        :global(.help-highlight::before) {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #3b82f6;
          border-radius: 0.375rem;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}

export default ContextualHelp