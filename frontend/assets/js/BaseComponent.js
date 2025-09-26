/**
 * BaseComponent - Abstract base class for all frontend components
 * Provides common functionality for DOM manipulation, event handling, and state management
 */

class BaseComponent {
    constructor(element, options = {}) {
        if (this.constructor === BaseComponent) {
            throw new Error('BaseComponent is an abstract class and cannot be instantiated directly');
        }

        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = {};
        this.events = new Map();
        this.children = new Map();
        this.isInitialized = false;
        this.isDestroyed = false;

        // Bind methods to preserve context
        this.render = this.render.bind(this);
        this.destroy = this.destroy.bind(this);
        this.setState = this.setState.bind(this);
        this.getState = this.getState.bind(this);

        if (this.element) {
            this.initialize();
        }
    }

    /**
     * Get default options for the component
     */
    getDefaultOptions() {
        return {
            autoRender: true,
            className: '',
            data: {}
        };
    }

    /**
     * Initialize the component
     */
    initialize() {
        if (this.isInitialized || this.isDestroyed) return;

        try {
            this.beforeInit();
            this.setupEventListeners();
            this.initializeChildren();
            
            if (this.options.autoRender) {
                this.render();
            }
            
            this.afterInit();
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            console.error(`Error initializing ${this.constructor.name}:`, error);
            throw error;
        }
    }

    /**
     * Hook called before initialization
     */
    beforeInit() {
        // Override in child classes
    }

    /**
     * Hook called after initialization
     */
    afterInit() {
        // Override in child classes
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Override in child classes
    }

    /**
     * Initialize child components
     */
    initializeChildren() {
        // Override in child classes
    }

    /**
     * Render the component
     */
    render() {
        if (this.isDestroyed) return;

        try {
            this.beforeRender();
            const html = this.template();
            
            if (html && this.element) {
                this.element.innerHTML = html;
                this.bindEvents();
                this.renderChildren();
            }
            
            this.afterRender();
            this.emit('rendered');
        } catch (error) {
            console.error(`Error rendering ${this.constructor.name}:`, error);
            throw error;
        }
    }

    /**
     * Hook called before rendering
     */
    beforeRender() {
        // Override in child classes
    }

    /**
     * Hook called after rendering
     */
    afterRender() {
        // Override in child classes
    }

    /**
     * Generate HTML template
     */
    template() {
        // Must be implemented in child classes
        throw new Error('template() method must be implemented in child class');
    }

    /**
     * Bind events after rendering
     */
    bindEvents() {
        // Override in child classes
    }

    /**
     * Render child components
     */
    renderChildren() {
        this.children.forEach((child, key) => {
            if (child && typeof child.render === 'function') {
                child.render();
            }
        });
    }

    /**
     * Set component state
     */
    setState(newState, shouldRender = true) {
        if (this.isDestroyed) return;

        const oldState = { ...this.state };
        
        if (typeof newState === 'function') {
            this.state = { ...this.state, ...newState(this.state) };
        } else {
            this.state = { ...this.state, ...newState };
        }

        this.emit('stateChanged', { oldState, newState: this.state });

        if (shouldRender && this.isInitialized) {
            this.render();
        }
    }

    /**
     * Get component state
     */
    getState(key = null) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    /**
     * Add event listener
     */
    addEventListener(element, event, handler, options = {}) {
        const target = typeof element === 'string' ? 
            (this.element ? this.element.querySelector(element) : null) : element;
        
        if (!target) return;

        const boundHandler = handler.bind(this);
        target.addEventListener(event, boundHandler, options);

        // Store for cleanup
        const eventKey = `${target.tagName}_${event}_${Date.now()}`;
        this.events.set(eventKey, {
            element: target,
            event,
            handler: boundHandler,
            options
        });

        return eventKey;
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventKey) {
        const eventData = this.events.get(eventKey);
        if (eventData) {
            eventData.element.removeEventListener(
                eventData.event, 
                eventData.handler, 
                eventData.options
            );
            this.events.delete(eventKey);
        }
    }

    /**
     * Add child component
     */
    addChild(key, component) {
        this.children.set(key, component);
        component.parent = this;
    }

    /**
     * Remove child component
     */
    removeChild(key) {
        const child = this.children.get(key);
        if (child && typeof child.destroy === 'function') {
            child.destroy();
        }
        this.children.delete(key);
    }

    /**
     * Get child component
     */
    getChild(key) {
        return this.children.get(key);
    }

    /**
     * Find element within component
     */
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    /**
     * Find all elements within component
     */
    findAll(selector) {
        return this.element ? Array.from(this.element.querySelectorAll(selector)) : [];
    }

    /**
     * Show component
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('d-none', 'hidden');
            this.emit('shown');
        }
    }

    /**
     * Hide component
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.emit('hidden');
        }
    }

    /**
     * Toggle component visibility
     */
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if component is visible
     */
    isVisible() {
        if (!this.element) return false;
        const style = window.getComputedStyle(this.element);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    /**
     * Add CSS class
     */
    addClass(className) {
        if (this.element) {
            this.element.classList.add(...className.split(' '));
        }
    }

    /**
     * Remove CSS class
     */
    removeClass(className) {
        if (this.element) {
            this.element.classList.remove(...className.split(' '));
        }
    }

    /**
     * Toggle CSS class
     */
    toggleClass(className) {
        if (this.element) {
            this.element.classList.toggle(className);
        }
    }

    /**
     * Set attribute
     */
    setAttribute(name, value) {
        if (this.element) {
            this.element.setAttribute(name, value);
        }
    }

    /**
     * Get attribute
     */
    getAttribute(name) {
        return this.element ? this.element.getAttribute(name) : null;
    }

    /**
     * Remove attribute
     */
    removeAttribute(name) {
        if (this.element) {
            this.element.removeAttribute(name);
        }
    }

    /**
     * Simple event emitter
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { 
            detail: data,
            bubbles: true,
            cancelable: true
        });
        
        if (this.element) {
            this.element.dispatchEvent(event);
        }

        // Also emit on the component instance
        if (this.componentEvents && this.componentEvents[eventName]) {
            this.componentEvents[eventName].forEach(handler => {
                try {
                    handler.call(this, data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Listen for component events
     */
    on(eventName, handler) {
        if (!this.componentEvents) {
            this.componentEvents = {};
        }
        if (!this.componentEvents[eventName]) {
            this.componentEvents[eventName] = [];
        }
        this.componentEvents[eventName].push(handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        if (!this.componentEvents || !this.componentEvents[eventName]) return;
        
        const index = this.componentEvents[eventName].indexOf(handler);
        if (index > -1) {
            this.componentEvents[eventName].splice(index, 1);
        }
    }

    /**
     * Validate component data
     */
    validate() {
        // Override in child classes
        return true;
    }

    /**
     * Update component with new data
     */
    update(data = {}) {
        if (this.isDestroyed) return;

        this.options.data = { ...this.options.data, ...data };
        this.emit('updated', data);
        
        if (this.isInitialized) {
            this.render();
        }
    }

    /**
     * Refresh component
     */
    refresh() {
        if (this.isDestroyed) return;
        
        this.render();
        this.emit('refreshed');
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        if (this.isDestroyed) return;

        try {
            this.beforeDestroy();

            // Destroy children first
            this.children.forEach((child, key) => {
                if (child && typeof child.destroy === 'function') {
                    child.destroy();
                }
            });
            this.children.clear();

            // Remove all event listeners
            this.events.forEach((eventData, key) => {
                this.removeEventListener(key);
            });

            // Clear component events
            if (this.componentEvents) {
                this.componentEvents = {};
            }

            // Remove from DOM if needed
            if (this.options.removeOnDestroy && this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.afterDestroy();
            this.isDestroyed = true;
            this.emit('destroyed');
        } catch (error) {
            console.error(`Error destroying ${this.constructor.name}:`, error);
        }
    }

    /**
     * Hook called before destroy
     */
    beforeDestroy() {
        // Override in child classes
    }

    /**
     * Hook called after destroy
     */
    afterDestroy() {
        // Override in child classes
    }

    /**
     * Static method to create component instance
     */
    static create(element, options = {}) {
        return new this(element, options);
    }

    /**
     * Static method to create multiple instances
     */
    static createAll(selector, options = {}) {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(element => new this(element, options));
    }
}

// Export for use in other modules
window.BaseComponent = BaseComponent;
export default BaseComponent;

