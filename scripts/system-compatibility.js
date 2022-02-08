export const systemBasedGetHp = (actor) => {
  if (game.system.id === 'pf2e') {
    return {
      currentHp: actor.data.data.attributes.hp.value,
      maxHp: actor.data.data.attributes.hp.max,
    }
  } else if (game.system.id === 'dnd5e') {
    return {
      currentHp: actor.data.data.attributes.hp.value,
      maxHp: actor.data.data.attributes.hp.max,
    }
  } else {
    // not a supported system
    return {
      currentHp: undefined,
      maxHp: undefined
    }
  }
}
export const systemBasedUpdateHp = (data) => {
  if (game.system.id === 'pf2e') {
    // hpDiff = options.damageTaken
    return data.data?.attributes?.hp?.value
  } else if (game.system.id === 'dnd5e') {
    return data.data?.attributes?.hp?.value
  } else {
    // not a supported system
    return undefined
  }
}
