const Promise = require('bluebird')
Promise.config({
  cancellation: true
})

const mongoose = require('../../config/mongoose')

const { getDelegateService } = require('../helpers/services/delegateService')
const Delegate = require('../delegate/delegate.model')

const workerCheckDelegateChangeRules = async () => {
  const delegateService = getDelegateService()
  const delegatesFetched = await delegateService.getDelegates()
  const delegatesUpdated = []

  console.log(`[Check-Delegate-Change-Rules] - Delegates ${delegatesFetched.length}`)

  for (let delegateIterator of delegatesFetched) {
    let delegateOnDbFound = await Delegate.findOne({ _id: delegateIterator.id })
    if (delegateOnDbFound) {
      if (hasDelegateChangedRules(delegateOnDbFound, delegateIterator)) {
        delegateOnDbFound = {
          _id: delegateOnDbFound._id,
          ...delegateIterator
        }
        const updatedDelegate = new Delegate({ ...delegateOnDbFound })
        // Updates local delegate
        delegatesUpdated.push(updatedDelegate.save())

        // TODO - Dispatch notification of rules changes
        console.log(
          `[Check-Delegate-Change-Rules] - Send notification to delegate ${delegateOnDbFound._id}`
        )
      }
    } else {
      // Saves new delegate on db
      const newDelegate = new Delegate({
        _id: delegateIterator.id,
        ...delegateIterator
      })
      delegatesUpdated.push(newDelegate.save())
    }
  }
  // Finally update the delegates
  await Promise.all(delegatesUpdated)
  process.exit(0)
}

const hasDelegateChangedRules = (oldDelegate, newDelegate) => {
  const { feeShare, pendingFeeShare, rewardCut, pendingRewardCut } = oldDelegate
  const hasChanged =
    feeShare !== newDelegate.feeShare ||
    pendingFeeShare !== newDelegate.pendingFeeShare ||
    rewardCut !== newDelegate.rewardCut ||
    pendingRewardCut !== newDelegate.pendingRewardCut

  if (hasChanged)
    console.log(`[Check-Delegate-Change-Rules] - Delegate ${oldDelegate._id} has changed`)

  return hasChanged
}

return workerCheckDelegateChangeRules()