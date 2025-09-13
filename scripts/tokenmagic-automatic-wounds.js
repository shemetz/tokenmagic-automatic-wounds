import {
  systemBasedHpFromActor,
  systemBasedHpFromUpdate,
  systemBasedUpdateShouldBeIgnored,
} from './system-compatibility.js'
import { getSplatterBloodColor } from './module-compatibility.js'

const MODULE_ID = 'tokenmagic-automatic-wounds'
const FLAG_BLOOD_COLOR = 'blood-color'
const FLAG_DISABLE_WOUNDS = 'enabled-for-token'
const localize = (key, data) => data ? game.i18n.format(`${MODULE_ID}.${key}`, data) : game.i18n.localize(`${MODULE_ID}.${key}`)

const DAMAGE_SCALE_MULTIPLIER = 4.5
const MINIMUM_CREATED_WOUND_SCALE = 0.08
const MINIMUM_LEFTOVER_WOUND_SCALE = 0.03
const AUTOMATIC_FILTER_ID = 'automaticWoundEffect'
const DEFAULT_BLOOD_COLOR = '0x990505'

export const registerAutomaticWoundEffectsSettings = () => {
  game.settings.register(MODULE_ID, 'clear-wounds-on-full-heal', {
    name: localize('setting.clear-wounds-on-full-heal.name'),
    hint: localize('setting.clear-wounds-on-full-heal.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  })
  game.settings.register(MODULE_ID, 'token-images-are-circular', {
    name: localize('setting.token-images-are-circular.name'),
    hint: localize('setting.token-images-are-circular.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  })
  game.settings.register(MODULE_ID, 'manual-override', {
    name: localize('setting.manual-override.name'),
    hint: localize('setting.manual-override.hint'),
    scope: 'world',
    requiresReload: true,
    config: true,
    type: Object,
    default: {},
  })
  if (game.system.id === "mosh") {
    game.settings.register(MODULE_ID, 'mosh-attribute', {
    name: localize('setting.mosh-attribute.name'),
    hint: localize('setting.mosh-attribute.hint'),
    requiresReload: true, // Could also do a callback
    scope: 'world',
    config: true,
    type: String,
    choices: { 
      "netHP" : localize('setting.mosh-attribute.netHP'), 
      "wounds" : localize('setting.mosh-attribute.wounds')
    },
    default: "netHP",
  })
  }
}

export const hookAutomaticWoundEffects = () => {
  Hooks.on('preUpdateActor', onPreUpdateActor)
}

const onPreUpdateActor = (actor, data) => {
  if (actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)) return
  const { currentHp, maxHp } = systemBasedHpFromActor(actor)
  if (currentHp === undefined || maxHp === undefined) return
  const oldHp = currentHp
  const newHp = systemBasedHpFromUpdate(actor, data)
  if (systemBasedUpdateShouldBeIgnored(actor, data)) return
  if (newHp === undefined) return
  const hpDiff = newHp - oldHp
  if (!hpDiff || newHp > maxHp) return
  for (const token of actor.getActiveTokens()) {
    if (newHp >= maxHp && game.settings.get(MODULE_ID, 'clear-wounds-on-full-heal')) removeWoundsOnToken(token)
    else if (hpDiff < 0) createWoundOnToken(token, -hpDiff / maxHp)
    else healWoundsOnToken(token, hpDiff / maxHp)
  }
}

const createWoundOnToken = async (token, damageFraction) => {
  const isImageCircular = game.settings.get(MODULE_ID, 'token-images-are-circular')
  const woundScale = Math.max(MINIMUM_CREATED_WOUND_SCALE, damageFraction * DAMAGE_SCALE_MULTIPLIER)
  const bloodColor = token.actor.getFlag(MODULE_ID, FLAG_BLOOD_COLOR)
    || getSplatterBloodColor(token)
    || DEFAULT_BLOOD_COLOR
  let anchorX, anchorY
  do {
    anchorX = Math.random() * 2 - 1
    anchorY = Math.random() * 2 - 1
  } while (isImageCircular && Math.pow(anchorX, 2) + Math.pow(anchorY, 2) > 1)
  const anchorRadius = 0.4
  // convert values from [-1, +1] to [0, 1]
  anchorX = 0.5 + anchorRadius * anchorX
  anchorY = 0.5 + anchorRadius * anchorY
  const params =
    [
      {
        filterType: 'splash',
        filterId: AUTOMATIC_FILTER_ID,
        rank: 5,
        color: bloodColor,
        padding: 0,
        time: 1,
        seed: Math.random(),
        splashFactor: 1,
        spread: woundScale,
        blend: 1,
        dimX: 1,
        dimY: 1,
        cut: false,
        sticky: true,
        textureAlphaBlend: true,
        anchorX,
        anchorY,
      }]
  return TokenMagic.addFilters(token, params)
}

const healWoundsOnToken = async (token, healingFraction) => {
  const existingFlags = token.document.getFlag('tokenmagic', 'filters')
  const numOfWounds = existingFlags?.filter(f => f.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)?.length
  if (!numOfWounds) {
    return
  }
  // healing is "stronger" than wounds when there's 3+ wounds, but also tiny wounds are bigger so it kinda evens out
  const reducedWoundSpreadPerWound = 0.04 + healingFraction / numOfWounds * DAMAGE_SCALE_MULTIPLIER

  const workingFlags = []
  existingFlags.forEach(originalFlag => {
    const flag = foundry.utils.duplicate(originalFlag)
    if (flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID) {
      // shrink visible wounds
      const oldSpread = flag.tmFilters.tmParams.spread
      const newSpread = oldSpread - reducedWoundSpreadPerWound * (Math.random() * 2.0)
      if (newSpread < MINIMUM_LEFTOVER_WOUND_SCALE) {
        // just remove the flag by not keeping it
        return
      }
      flag.tmFilters.tmParams.spread = newSpread
      flag.tmFilters.tmParams.updateId = foundry.utils.randomID()
    }
    workingFlags.push(flag)
  })
  return token._TMFXsetFlag(workingFlags)
}

const removeWoundsOnToken = async (token) => {
  const existingFlags = token.document.getFlag('tokenmagic', 'filters')
  const numOfWounds = existingFlags?.filter(f => f.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)?.length
  if (!numOfWounds) {
    return
  }
  const workingFlags = existingFlags.filter(
    flag => !(flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID))
  return token._TMFXsetFlag(workingFlags)
}

function rgbToHex (r, g, b) {
  return '0x' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

const setBloodColor = async (token, newColor) => {
  const color = newColor === null ? DEFAULT_BLOOD_COLOR : newColor
  if (!token.actor) return

  // get rgb of hex color
  let r = parseInt(color.substring(2, 4), 16)
  let g = parseInt(color.substring(4, 6), 16)
  let b = parseInt(color.substring(6, 8), 16)
  // if all color components are 0, it doesn't work
  if (r + g + b === 0) {
    r = g = b = 0x01
  }
  const okayColor = rgbToHex(r, g, b)
  if (newColor === null) {
    await token.actor.unsetFlag(MODULE_ID, FLAG_BLOOD_COLOR)
  } else {
    await token.actor.setFlag(MODULE_ID, FLAG_BLOOD_COLOR, okayColor)
  }

  // change any existing wounds
  const existingFlags = token.document.getFlag('tokenmagic', 'filters')
  const numOfWounds = existingFlags?.filter(f => f.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)?.length
  if (!numOfWounds) {
    return
  }
  const workingFlags = existingFlags.map(flag => {
    if (!(flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)) return flag
    flag.tmFilters.tmParams.color = okayColor
    flag.tmFilters.tmParams.updateId = foundry.utils.randomID()
    return flag
  })
  await token._TMFXsetFlag(workingFlags)
}

const openBloodColorPicker = async (tokens) => {
  const firstToken = tokens[0]
  const currentBloodColor = firstToken.actor.getFlag(MODULE_ID, FLAG_BLOOD_COLOR)
  const splatterBloodColor = getSplatterBloodColor(firstToken)
  const inputBloodColor = currentBloodColor || splatterBloodColor || DEFAULT_BLOOD_COLOR
  const bloodColorInputValue = inputBloodColor.replace('0x', '#')
  const color = await new Promise((resolve) => {
    new Dialog({
      title: localize('dialog.change-blood-color.title'),
      content: `
<div class="form-group">
    <label>${localize('dialog.change-blood-color.selected-tokens', { tokens: tokens.map(t => t.name).join(', ') })}</label>
    <br/>`
        + (
          (splatterBloodColor && [splatterBloodColor, DEFAULT_BLOOD_COLOR].includes(inputBloodColor)) ?
            `<label>${localize('dialog.change-blood-color.currently-defaulting-to-splatter', { color: splatterBloodColor })}</label>` :
            splatterBloodColor ?
              `<label>${localize('dialog.change-blood-color.splatter-color', { color: splatterBloodColor })}</label>` :
              inputBloodColor === DEFAULT_BLOOD_COLOR ?
                `<label>${localize('dialog.change-blood-color.currently-defaulting-to-red', { color: DEFAULT_BLOOD_COLOR })}</label>` :
                ``
        ) +
        `   <div>
        <input type="color" value="${bloodColorInputValue}" style="height: 100px; width: 100px"/>
    </div>
</div>
`,
      buttons: {
        change: {
          icon: '<i class="fas fa-fa-droplet"></i>',
          label: localize('dialog.change-blood-color.buttons.set-new-color'),
          callback: (html) => {
            const color = html.find('input').val().replace('#', '0x')
            resolve(color)
          },
        },
        ...((inputBloodColor !== DEFAULT_BLOOD_COLOR && splatterBloodColor === undefined) && {
          revertToDefault: {
            icon: '<i class="fas fa-undo"></i>',
            label: localize('dialog.change-blood-color.buttons.reset-to-default', { color: DEFAULT_BLOOD_COLOR }),
            callback: () => {
              resolve(null)
            },
          },
        }),
        ...((inputBloodColor !== splatterBloodColor && splatterBloodColor !== undefined) && {
          splatter: {
            icon: '<i class="fas fa-undo"></i>',
            label: localize('dialog.change-blood-color.buttons.reset-to-splatter', { color: splatterBloodColor }),
            callback: () => {
              resolve(null)
            },
          },
        }),
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: localize('dialog.common.cancel'),
          callback: () => {
            resolve(undefined)
          },
        },
      },
    }).render(true)
  })
  if (color !== undefined) {
    for (const token of tokens) {
      await setBloodColor(token, color)
    }
  }
}

const reapplyWoundsBasedOnCurrentHp = async (token) => {
  if (!token.actor) return
  await removeWoundsOnToken(token)
  if (token.actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)) return
  const { currentHp, maxHp } = systemBasedHpFromActor(token.actor)
  if (currentHp === undefined || maxHp === undefined) return
  const damage = maxHp - currentHp
  if (damage <= 0) return
  const woundCount = Math.max(1, Math.log2(damage))
  let leftoverDamage = damage
  for (let i = 0; i < woundCount; i++) {
    const appliedDamage = i === woundCount - 1 ? leftoverDamage : (Math.random() * leftoverDamage)
    leftoverDamage -= appliedDamage
    if (appliedDamage < MINIMUM_CREATED_WOUND_SCALE) continue
    await createWoundOnToken(token, appliedDamage / maxHp)
  }
}

const toggleDisableWounds = async (actor) => {
  const wasDisabled = actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)
  const disabled = !wasDisabled
  await actor.setFlag(MODULE_ID, FLAG_DISABLE_WOUNDS, disabled)
  if (disabled) {
    for (const tok of actor.getActiveTokens()) {
      await removeWoundsOnToken(tok)
    }
  } else {
    for (const tok of actor.getActiveTokens()) {
      await reapplyWoundsBasedOnCurrentHp(tok)
    }
  }
  return disabled
}

const macroToggleAutoWoundsForActors = async () => {
  const tokens = canvas.tokens.controlled
  const disabledNames = []
  const enabledNames = []
  for (const tok of tokens) {
    const realActor = game.actors.get(tok.actor.id)
    const disabled = await TokenMagicAutomaticWounds.toggleDisableWounds(realActor)
    if (disabled) {
      disabledNames.push(tok.name)
    } else {
      enabledNames.push(tok.name)
    }
  }
  if (disabledNames.length > 0) {
    ui.notifications.info(localize('notifications.disabled-for-actors', { names: disabledNames.join(', ') }))
  }
  if (enabledNames.length > 0) {
    ui.notifications.info(localize('notifications.enabled-for-actors', { names: enabledNames.join(', ') }))
  }
}

const macroToggleAutoWoundsForTokens = async () => {
  const tokens = canvas.tokens.controlled
  const disabledNames = []
  const enabledNames = []
  for (const tok of tokens) {
    const tokenActor = tok.actor
    const disabled = await TokenMagicAutomaticWounds.toggleDisableWounds(tokenActor)
    if (disabled) {
      disabledNames.push(tok.name)
    } else {
      enabledNames.push(tok.name)
    }
  }
  if (disabledNames.length > 0) {
    ui.notifications.info(localize('notifications.disabled-for-tokens', { names: disabledNames.join(', ') }))
  }
  if (enabledNames.length > 0) {
    ui.notifications.info(localize('notifications.enabled-for-tokens', { names: enabledNames.join(', ') }))
  }
}

const macroReapplyWoundsBasedOnCurrentHp = async () => {
  const tokens = canvas.tokens.controlled
  if (!tokens)
    return ui.notifications.warn(
      localize('notifications.select-tokens-reapply'))
  for (const tok of tokens) {
    await TokenMagicAutomaticWounds.reapplyWoundsBasedOnCurrentHp(tok)
  }
}

const macroOpenBloodColorPicker = async () => {
  const tokens = canvas.tokens.controlled
  const firstToken = tokens[0]
  if (!firstToken) return ui.notifications.warn(localize('notifications.no-tokens-selected-for-color-picker'))
  if (firstToken.actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)) {
    return ui.notifications.warn(localize('notifications.disabled-on-token-cannot-open-color-picker'))
  }
  await TokenMagicAutomaticWounds.openBloodColorPicker(tokens)
}

self.TokenMagicAutomaticWounds = {
  hookAutomaticWoundEffects,
  onPreUpdateActor,
  createWoundOnToken,
  healWoundsOnToken,
  removeWoundsOnToken,
  setBloodColor,
  openBloodColorPicker,
  reapplyWoundsBasedOnCurrentHp,
  toggleDisableWounds,
  macroToggleAutoWoundsForActors,
  macroToggleAutoWoundsForTokens,
  macroReapplyWoundsBasedOnCurrentHp,
  macroOpenBloodColorPicker,
}
