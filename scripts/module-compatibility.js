export const getSplatterBloodColor = (token) => {
  if (!game.modules.get('splatter')?.active) return undefined

  // note:  I had to copy and edit some code from the splatter module, because the BloodSplatter class is not exported

  function getCreatureType (actorData) {
    return foundry.utils.getProperty(actorData.system, game.settings.get('splatter', 'creatureType')) ?? actorData.type
  }

  function getCreatureTypeCustom (actorData) {
    return foundry.utils.getProperty(
      actorData.system,
      game.settings.get('splatter', 'creatureTypeCustom'),
    )
  }

  function ColorStringToHexAlpha (colorString) {
    if (!colorString) return undefined
    const color = '0x' + colorString.slice(1, 7)
    const alpha = parseInt(colorString.slice(7), 16) / 255
    return { color: color, alpha: alpha }
  }

  const colorFlag = token.document.getFlag('splatter', 'bloodColor')
  const bloodSheet = game.settings.get('splatter', 'useBloodsheet')
  const bloodSheetData = game.settings.get('splatter', 'BloodSheetData')
  let colorData = undefined
  if (!colorFlag && bloodSheet) {
    const creatureType = getCreatureTypeCustom(token.actor) || getCreatureType(token.actor)
    let bloodSheetColor
    if (Array.isArray(creatureType)) {
      creatureType.forEach((type) => {
        if (bloodSheetData[type]) {
          bloodSheetColor = bloodSheetData[type]
        }
      })
    } else {
      bloodSheetColor = bloodSheetData[creatureType]
    }
    colorData = ColorStringToHexAlpha(bloodSheetColor)
  }
  if (colorFlag) {
    colorData = ColorStringToHexAlpha(colorFlag)
  }

  return colorData?.color
}