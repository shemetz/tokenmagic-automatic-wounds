export const systemBasedHpFromActor = (actor) => {
  if (game.system.id === 'pf2e') {
    return {
      currentHp: actor.data.data.attributes.hp?.value,
      maxHp: actor.data.data.attributes.hp?.max,
    }
  } else if (game.system.id === 'dnd5e') {
    return {
      currentHp: actor.data.data.attributes.hp.value,
      maxHp: actor.data.data.attributes.hp.max,
    }
  } else if (game.system.id === 'swade') {
    return {
      currentHp: actor.data.data.wounds.max - actor.data.data.wounds.value,
      maxHp: actor.data.data.wounds.max,
    }
  } else if (game.system.id === 'hexxen-1733') {
    return {
      currentHp: actor.data.data.health.value,
      maxHp: actor.data.data.health.max,
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
    return data.data?.attributes?.hp?.value
  } else if (game.system.id === 'dnd5e') {
    return data.data?.attributes?.hp?.value
  } else if (game.system.id === 'swade') {
    return actor?.data?.data?.wounds?.max - data.data?.wounds?.value
  } else if (game.system.id === 'hexxen-1733') {
    return data.data?.health?.value
  } else {
    // not a supported system
    return undefined
  }
}
