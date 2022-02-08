import { registerAutomaticWoundEffects, hookAutomaticWoundEffects } from './automatic_wounds.js'

Hooks.on('init', () => {
  registerAutomaticWoundEffects()
})

Hooks.on('ready', () => {
  hookAutomaticWoundEffects()
})
