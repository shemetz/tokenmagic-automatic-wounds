import { systemBasedHpFromActor, systemBasedHpFromUpdate } from './system-compatibility.js'

const MODULE_ID = 'tokenmagic-automatic-wounds'
const FLAG_BLOOD_COLOR = 'blood-color'
const FLAG_DISABLE_WOUNDS = 'enabled-for-token'

const DAMAGE_SCALE_MULTIPLIER = 4.5
const MINIMUM_CREATED_WOUND_SCALE = 0.08
const MINIMUM_LEFTOVER_WOUND_SCALE = 0.03
const AUTOMATIC_FILTER_ID = 'automaticWoundEffect'
const DEFAULT_BLOOD_COLOR = '0x990505'

export const registerAutomaticWoundEffects = () => {
  game.settings.register(MODULE_ID, 'clear-wounds-on-full-heal', {
    name: `Clear wounds on full heal`,
    hint: `When a token's health goes back to maximum, should it fully remove all wounds?`,
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  })
}

export const hookAutomaticWoundEffects = () => {
  Hooks.on('preUpdateActor', onPreUpdateActor)
}

const onPreUpdateActor = (actor, data) => {
  if (actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)) return
  const { currentHp, maxHp } = systemBasedHpFromActor(actor)
  if (currentHp === undefined || maxHp === undefined) return
  const oldHp = currentHp
  const newHp = systemBasedHpFromUpdate(data)
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
  const isImageCircular = true  // TODO add some config option or smart code to detect square tokens
  const woundScale = Math.max(MINIMUM_CREATED_WOUND_SCALE, damageFraction * DAMAGE_SCALE_MULTIPLIER)
  const bloodColor = token.actor.getFlag(MODULE_ID, FLAG_BLOOD_COLOR)
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
  let params =
    [{
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
    const flag = duplicate(originalFlag)
    if (flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID) {
      // shrink visible wounds
      const oldSpread = flag.tmFilters.tmParams.spread
      const newSpread = oldSpread - reducedWoundSpreadPerWound * (Math.random() * 2.0)
      if (newSpread < MINIMUM_LEFTOVER_WOUND_SCALE) {
        // just remove the flag by not keeping it
        return
      }
      flag.tmFilters.tmParams.spread = newSpread
      flag.tmFilters.tmParams.updateId = randomID()
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
  const workingFlags = existingFlags
    .filter(flag => !(flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID))
  return token._TMFXsetFlag(workingFlags)
}

function rgbToHex (r, g, b) {
  return '0x' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

const setBloodColor = async (token, color) => {
  if (!token.actor) return

  // TODO - remove color override after bug is solved: https://github.com/Feu-Secret/Tokenmagic/issues/184
  // if all color components are below 0x60 bad stuff happens
  // get rgb of hex color
  let r = parseInt(color.substring(2, 4), 16)
  let g = parseInt(color.substring(4, 6), 16)
  let b = parseInt(color.substring(6, 8), 16)
  if (r < 0x60 && g < 0x60 && b < 0x60) {
    r = g = b = 0x60
    ui.notifications.info('Blood color was too dark, so it was changed to gray.')
  }
  const okayColor = rgbToHex(r, g, b)
  await token.actor.setFlag(MODULE_ID, FLAG_BLOOD_COLOR, okayColor)

  // change any existing wounds
  const existingFlags = token.document.getFlag('tokenmagic', 'filters')
  const numOfWounds = existingFlags?.filter(f => f.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)?.length
  if (!numOfWounds) {
    return
  }
  const workingFlags = existingFlags
    .map(flag => {
      if (!(flag.tmFilters && flag.tmFilters.tmFilterId === AUTOMATIC_FILTER_ID)) return flag
      flag.tmFilters.tmParams.color = okayColor
      flag.tmFilters.tmParams.updateId = randomID()
      return flag
    })
  await token._TMFXsetFlag(workingFlags)
}

const openBloodColorPicker = async (tokens) => {
  const firstToken = tokens[0]
  const bloodColor = firstToken.actor.getFlag(MODULE_ID, 'bloodColor') || DEFAULT_BLOOD_COLOR
  const bloodColorInputValue = bloodColor.replace('0x', '#')
  const defaultColorNums = [
    parseInt(DEFAULT_BLOOD_COLOR.substring(2, 4), 16),
    parseInt(DEFAULT_BLOOD_COLOR.substring(4, 6), 16),
    parseInt(DEFAULT_BLOOD_COLOR.substring(6, 8), 16)
  ].join(', ')
  const color = await new Promise((resolve) => {
    new Dialog({
      title: 'Blood Color',
      content: `
<div class="form-group">
    <label>Selected tokens: ${tokens.map(t => t.name).join(', ')}</label>
    <br/>
    <label>Choose blood color.  (Dark colors will be converted to gray, known bug).</label>
    <br/>
    <label>Default color: ${DEFAULT_BLOOD_COLOR} (${defaultColorNums})</label>
    <div>
        <input type="color" value="${bloodColorInputValue}" style="height: 100px; width: 100px"/>
    </div>
</div>
`,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'OK',
          callback: (html) => {
            const color = html.find('input').val().replace('#', '0x')
            resolve(color)
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => {
            resolve(null)
          },
        },
      },
    }).render(true)
  })
  if (color) {
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

const macroToggleAutoWoundsForActor = async () => {
  if (canvas.tokens.controlled.length !== 1)
    return ui.notifications.warn(`Please select exactly 1 actor's token.`)
  const tok = canvas.tokens.controlled[0]
  const realActor = game.actors.get(tok.actor.id)
  const disabled = await TokenMagicAutomaticWounds.toggleDisableWounds(realActor)
  ui.notifications.info(`Automatic Wounds: ${disabled ? 'DISABLED' : 'ENABLED'} for ${realActor.name}`)
}

const macroToggleAutoWoundsForToken = async () => {
  if (canvas.tokens.controlled.length !== 1)
    return ui.notifications.warn(`Please select exactly 1 token.`)
  const tok = canvas.tokens.controlled[0]
  const disabled = await TokenMagicAutomaticWounds.toggleDisableWounds(tok.actor)
  ui.notifications.info(`Automatic Wounds: ${disabled ? 'DISABLED' : 'ENABLED'} for ${tok.name}`)
}

const macroReapplyWoundsBasedOnCurrentHp = async () => {
  const tok = canvas.scene.controlled[0]
  if (!tok)
    return ui.notifications.warn(`You need to select a token for the Reapply Wounds Based On Current HP macro to work.`)
  await TokenMagicAutomaticWounds.reapplyWoundsBasedOnCurrentHp(tok)
}

const macroOpenBloodColorPicker = async () => {
  const tokens = canvas.tokens.controlled
  const firstToken = tokens[0]
  if (!firstToken) return ui.notifications.warn('No tokens selected, can\'t open blood color picker.')
  if (firstToken.actor.getFlag(MODULE_ID, FLAG_DISABLE_WOUNDS)) {
    return ui.notifications.warn('Automatic wounds are disabled on this token, can\'t open blood color picker.')
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
  macroToggleAutoWoundsForActor,
  macroToggleAutoWoundsForToken,
  macroReapplyWoundsBasedOnCurrentHp,
  macroOpenBloodColorPicker,
}
