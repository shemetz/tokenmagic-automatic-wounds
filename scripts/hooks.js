import { registerAutomaticWoundEffectsSettings, hookAutomaticWoundEffects } from './tokenmagic-automatic-wounds.js'

Hooks.on('init', () => {
  registerAutomaticWoundEffectsSettings()
})

Hooks.on('ready', () => {
  hookAutomaticWoundEffects()
})
