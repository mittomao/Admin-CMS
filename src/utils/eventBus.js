const EventEmitter = require('events');

class InternalEventBus extends EventEmitter {}

// Singleton event bus instance for Phase 8 internal communication
const eventBus = new InternalEventBus();

// Max listeners to avoid memory leak warnings on high throughput
eventBus.setMaxListeners(50);

module.exports = eventBus;

