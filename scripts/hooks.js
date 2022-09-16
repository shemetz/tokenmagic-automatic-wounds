import { registerAutomaticWoundEffects, hookAutomaticWoundEffects } from './tokenmagic-automatic-wounds.js'

Hooks.on('init', () => {
  registerAutomaticWoundEffects()
})

Hooks.on('ready', () => {
  hookAutomaticWoundEffects()
})
