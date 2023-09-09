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

  } else if (game.system.id === 'pbta') {
    if (actor.system?.attrTop?.harm !== undefined)
      // default for most PBTA-based systems
      // e.g. Monster of the Week
      return {
        hpValue: 'system.attrTop.harm.value',
        hpMax: 'system.attrTop.harm.max',
        zeroIsBad: false,
      }
    else if (actor.system?.attrTop?.hp !== undefined)
      // World of Dungeons
      return {
        hpValue: 'system.attrTop.hp.value',
        hpMax: 'system.attrTop.hp.max',
        zeroIsBad: false,
      }
    else if (actor.system?.attrTop?.hurt !== undefined)
      // Dungeon Bitches (maybe?)
      return {
        hpValue: 'system.attrTop.hurt.value',
        hpMax: 'system.attrTop.hurt.max',
        zeroIsBad: false,
      }
    else if (actor.system?.attributesTop?.hurt !== undefined)
      // Dungeon Bitches (maybe?)
      return {
        hpValue: 'system.attributesTop.hurt.value',
        hpMax: 'system.attributesTop.hurt.max',
        zeroIsBad: false,
      }
    else // unsupported PBTA system, e.g Root, or Fantasy World RPG, all the ones that don't call their thing "Harm"
      return undefined
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

  const currentHpInSystem = getProperty(actor, dataKeys.hpValue)
  const maxHpInSystem = getProperty(actor, dataKeys.hpMax)

  // normalize to the "zero is bad" standard, i.e. taking damage decreases the value, down from max to 0, not up
  return {
    currentHp: dataKeys.zeroIsBad ? currentHpInSystem : (maxHpInSystem - currentHpInSystem),
    maxHp: maxHpInSystem,
  }
}
export const systemBasedHpFromUpdate = (actor, data) => {
  const dataKeys = systemBasedHpKeys(actor)
  if (dataKeys === undefined)
    return undefined

  const currentHpInSystem = getProperty(data, dataKeys.hpValue)
  const maxHpInSystem = getProperty(actor, dataKeys.hpMax)

  // normalize to the "zero is bad" standard, i.e. taking damage decreases the value, down from max to 0, not up
  return dataKeys.zeroIsBad ? currentHpInSystem : (maxHpInSystem - currentHpInSystem)
}
