const systemBasedHpKeys = (actor) => {
  if (game.system.id === 'pf2e') {
    return {
      hpValue: 'system.attributes.hp.value',
      hpMax: 'system.attributes.hp.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'dnd5e') {
    return {
      hpValue: 'system.attributes.hp.value',
      hpMax: 'system.attributes.hp.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'dungeonworld') {
    return {
      hpValue: 'system.attributes.hp.value',
      hpMax: 'system.attributes.hp.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'cyberpunk-red-core') {
    return {
      hpValue: 'system.derivedStats.hp.value',
      hpMax: 'system.derivedStats.hp.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'swade') {
    return {
      hpValue: 'actor.system.wounds.value',
      hpMax: 'system.wounds.max',
      zeroIsBad: false,
    }
  } else if (game.system.id === 'hexxen-1733') {
    return {
      hpValue: 'system.health.value',
      hpMax: 'system.health.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'wfrp4e') {
    if (actor.type !== 'vehicle')
      return {
        hpValue: 'system.status.wounds.value',
        hpMax: 'system.status.wounds.max',
        zeroIsBad: true,
      }
    else return undefined
  } else if (game.system.id === 'alienrpg') {
    if (actor.type !== 'spacecraft' && actor.type !== 'vehicles')
      return {
        hpValue: 'system.header.health.value',
        hpMax: 'system.header.health.max',
        zeroIsBad: true,
      }
    else return undefined
  } else if (game.system.id === 'pf1') {
    return {
      hpValue: 'system.attributes.hp.value',
      hpMax: 'system.attributes.hp.max',
      zeroIsBad: true,
    }
  } else if (game.system.id === 'tormenta20') {
    return {
      hpValue: 'system.attributes.pv.value',
      hpMax: 'system.attributes.pv.max',
      zeroIsBad: true,
    }
  } else {
    // not a supported system
    return undefined
  }
}

export const systemBasedHpFromActor = (actor) => {
  const dataKeys = systemBasedHpKeys(actor)
  if (dataKeys === undefined)
    return {
      currentHp: undefined,
      maxHp: undefined,
    }

  // normalize to the "zero is bad" standard, i.e. taking damage decreases the value, down from max to 0, not up
  const currentHpKey = dataKeys.zeroIsBad ? dataKeys.hpValue : (dataKeys.hpMax - dataKeys.hpValue)
  const maxHpKey = dataKeys.hpMax

  return {
    currentHp: getProperty(actor, currentHpKey),
    maxHp: getProperty(actor, maxHpKey),
  }
}
export const systemBasedHpFromUpdate = (actor, data) => {
  const dataKeys = systemBasedHpKeys(actor)
  if (dataKeys === undefined)
    return undefined

  // normalize to the "zero is bad" standard, i.e. taking damage decreases the value, down from max to 0, not up
  const currentHpKey = dataKeys.zeroIsBad ? dataKeys.hpValue : (dataKeys.hpMax - dataKeys.hpValue)

  return getProperty(data, currentHpKey)
}
