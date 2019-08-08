const mongoose = require('../../config/mongoose')
const delegatorUtils = require('./delegatorUtils')
const subscriberUtils = require('./subscriberUtils')
const Share = require('../share/share.model')
const Round = require('../round/round.model')
const Delegator = require('../delegator/delegator.model')

const updateDelegatorSharesOfRound = async (round, delegator) => {
  console.log('[Update Delegators Shares] - Starts updating delegator shares')
  if (!round) {
    console.error('[Update Delegators Shares] - No round shares were provided')
    throw new Error('[Update Delegators Shares] - No round shares were provided')
  }
  if (!delegator) {
    console.error('[Update Delegators Shares] - No delegator was provided')
    throw new Error('[Update Delegators Shares] - No delegator was provided')
  }
  const delegatorAddress = delegator.address
  if (!delegatorAddress) {
    console.error(`[Update Delegators Shares] - delegator ${delegator} has not address`)
    throw new Error(`[Update Delegators Shares] - delegator ${delegator} has not address`)
  }
  // Checks that the delegator exists before continue
  delegator = await Delegator.findById(delegatorAddress)
  if (!delegator) {
    console.error(
      `[Update Delegators Shares] - Delegator ${delegatorAddress} not found, did you called checkAndUpdateMissingLocalDelegators() before?`
    )
    throw new Error(
      `[Update Delegators Shares] - Delegator ${delegatorAddress} not found, did you called checkAndUpdateMissingLocalDelegators() before?`
    )
  }
  // Checks that the round exists before continue
  const { roundId } = round
  round = await Round.findById(roundId)
  if (!round) {
    console.error('[Update Delegators Shares] - The round provided does not exists')
    throw new Error('[Update Delegators Shares] - The round provided does not exists')
  }

  // Creates the share object
  const { totalStake, delegate } = delegator
  const shareId = `${delegatorAddress}-${roundId}`
  const rewardTokens = await delegatorUtils.getDelegatorCurrentRewardTokens(
    roundId,
    delegatorAddress,
    totalStake
  )

  let newSavedShared = new Share({
    _id: shareId,
    rewardTokens,
    totalStakeOnRound: totalStake,
    delegator: delegatorAddress,
    delegate: delegate,
    round: roundId
  })
  // Checks that the share does not already exists
  const foundShare = await Share.findById(shareId)
  if (foundShare) {
    console.error(
      `[Update Delegators Shares] - Error Updating share: ${shareId} on delegator ${delegatorAddress}, the share already exists, skipping save`
    )
    throw new Error(
      `[Update Delegators Shares] - Error Updating share: ${shareId} on delegator ${delegatorAddress}, the share already exists, skipping save`
    )
  }
  try {
    // Saves the share
    console.log(`[Update Delegators Shares] - Saving new share for delegator ${delegatorAddress}`)
    newSavedShared = await newSavedShared.save()
    // Updates the pool with the share
    round.shares.push(newSavedShared)
    console.log('[Update Delegators Shares] - Updating round with share')
    round = await round.save()
    // Finally updates the delegator with the new share
    delegator.shares.push(newSavedShared)
    delegator = await delegator.save()
  } catch (err) {
    console.error(
      `[Update Delegators Shares] - Error Updating share on delegator ${delegatorAddress}`
    )
    console.error(err)
    throw err
  }
}

// Executed on round changed, only executes for the delegators which are subscribed
const updateDelegatorsShares = async newRound => {
  console.log('[Update Delegator shares] - Start')
  if (!newRound) {
    throw new Error('[Update Delegator shares] - No round was provided')
  }

  // Fetch all the delegators that are subscribed
  console.log('[Update Delegator shares] - Getting delegators subscribers')
  const delegatorsAndSubscribersList = await subscriberUtils.getDelegatorSubscribers()
  if (!delegatorsAndSubscribersList || delegatorsAndSubscribersList.length === 0) {
    console.log('[Update Delegator shares] - No delegators subscribers found')
    return
  }
  const delegators = []
  // Gets the list of delegators from the subscribers, removes the duplicated ones (could be more than one subscriptor with the same delegator address)
  delegatorsAndSubscribersList.forEach(element => {
    const { delegator } = element
    let isAlreadySaved = false
    // Checks if the array does contains the delegator before adding it
    for (let delegatorSaved of delegators) {
      if (delegatorSaved.address === delegator.address) {
        isAlreadySaved = true
        break
      }
    }
    if (!isAlreadySaved) {
      delegators.push(delegator)
    }
  })
  if (!delegators || delegators.length === 0) {
    console.log('[Update Delegator shares] - No delegators subscribers found')
    return
  }

  // Then checks if all the fetched delegators exists locally, otherwise, add the ones that are missing
  await delegatorUtils.checkAndUpdateMissingLocalDelegators(delegators)

  // Then updates the delegators shares on the current round
  for (let delegatorIterator of delegators) {
    try {
      await service.updateDelegatorSharesOfRound(newRound, delegatorIterator)
    } catch (err) {
      console.error(
        `[Update Delegators Share] - Error when updating delegators shares: ${err}, continue updating next delegator`
      )
      continue
    }
  }
  console.log('[Update Delegators Share] - Finished')
}

const service = {
  updateDelegatorsShares,
  updateDelegatorSharesOfRound
}

module.exports = service
