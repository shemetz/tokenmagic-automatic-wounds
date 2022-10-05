export const systemBasedHpFromActor = (actor) => {
  if (game.system.id === 'pf2e') {
    return {
      currentHp: actor.system.attributes.hp?.value,
      maxHp: actor.system.attributes.hp?.max,
    }
  } else if (game.system.id === 'dnd5e') {
    return {
      currentHp: actor.system.attributes.hp.value,
      maxHp: actor.system.attributes.hp.max,
    }
  } else if (game.system.id === 'dungeonworld') {
    return {
      currentHp: actor.system.attributes.hp.value,
      maxHp: actor.system.attributes.hp.max,
    }
  } else if (game.system.id === 'cyberpunk-red-core') {
    return {
      currentHp: actor.system.derivedStats.hp.value,
      maxHp: actor.system.derivedStats.hp.max,
    }
  } else if (game.system.id === 'swade') {
    return {
      currentHp: actor.system.wounds.max - actor.system.wounds.value,
      maxHp: actor.system.wounds.max,
    }
  } else if (game.system.id === 'hexxen-1733') {
    return {
      currentHp: actor.system.health.value,
      maxHp: actor.system.health.max,
    }
  } else if (game.system.id === 'wfrp4e') {
    return {
      currentHp: actor.system.status.wounds.value,
      maxHp: actor.system.status.wounds.max,
    }
  } else {
    // not a supported system
    return {
      currentHp: undefined,
      maxHp: undefined
    }
  }
}
export const systemBasedHpFromUpdate = (actor, data) => {
  if (game.system.id === 'pf2e') {
    // hpDiff = options.damageTaken
    return data.system?.attributes?.hp?.value
  } else if (game.system.id === 'dnd5e') {
    return data.system?.attributes?.hp?.value
  } else if (game.system.id === 'dungeonworld') {
    return data.system?.attributes?.hp?.value
  } else if (game.system.id === 'cyberpunk-red-core') {
    return data.system?.derivedStats?.hp?.value
  } else if (game.system.id === 'swade') {
    return actor?.system?.wounds?.max - data.system?.wounds?.value
  } else if (game.system.id === 'hexxen-1733') {
    return data.system?.health?.value
  } else if (game.system.id === 'wfrp4e') {
    return data.system?.status?.wounds?.value
  } else {
    // not a supported system
    return undefined
  }
}
