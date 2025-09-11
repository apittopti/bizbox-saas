// Core plugin framework exports
export * from "./plugin-registry";
export * from "./event-bus";
export * from "./hooks";
export * from "./types";
export * from "./validation";

// Plugin base classes and manager
export { BasePlugin } from "./base-plugin";
export { PluginManager } from "./plugin-manager";

// Re-export key classes for convenience
export { PluginRegistry, PluginStatus } from "./plugin-registry";
export { EventBus, PLATFORM_EVENTS } from "./event-bus";
export { HookSystem, STANDARD_HOOKS } from "./hooks";
export { PluginValidator } from "./validation";