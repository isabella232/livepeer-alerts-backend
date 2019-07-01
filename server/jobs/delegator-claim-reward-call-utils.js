const { getProtocolService } = require('../helpers/services/protocolService')
const { getDelegatorService } = require('../helpers/services/delegatorService')

const Promise = require('bluebird')
Promise.config({
  cancellation: true
})

const mongoose = require('../../config/mongoose')
const Subscriber = require('../models/subscriber.model')
const { sendDelegatorNotificationEmail } = require('../helpers/sendDelegatorEmail')
const { sendNotificationTelegram } = require('../helpers/sendTelegramClaimRewardCall')
const { getSubscriptorRole, getDidDelegateCallReward } = require('../helpers/utils')

const getSubscribersToSendEmails = async () => {
  const subscribers = await Subscriber.find({
    frequency: 'daily',
    activated: 1,
    email: { $ne: null }
  }).exec()

  let emailsToSend = []
  const protocolService = getProtocolService()
  const delegatorService = getDelegatorService()
  const [currentRound, currentRoundInfo] = await Promise.all([
    protocolService.getCurrentRound(),
    protocolService.getCurrentRoundInfo()
  ])
  for (const subscriber of subscribers) {
    // Send notification only for delegators
    const { role, constants, delegator } = await getSubscriptorRole(subscriber)
    if (role === constants.ROLE.TRANSCODER) {
      continue
    }
    const [delegateCalledReward, delegatorNextReward] = await Promise.all([
      getDidDelegateCallReward(delegator.delegateAddress),
      delegatorService.getDelegatorNextReward(delegator.address)
    ])
    emailsToSend.push(
      sendDelegatorNotificationEmail(
        subscriber,
        delegator,
        delegateCalledReward,
        delegatorNextReward,
        currentRound,
        currentRoundInfo,
        constants
      )
    )
  }

  console.log(
    `[Worker notification delegator claim reward call] - Emails subscribers to notify ${
      emailsToSend.length
    }`
  )
  return await Promise.all(emailsToSend)
}

const getSubscribersToSendTelegrams = async () => {
  const subscribers = await Subscriber.find({
    frequency: 'daily',
    activated: 1,
    telegramChatId: { $ne: null }
  }).exec()

  let telegramsMessageToSend = []
  for (const subscriber of subscribers) {
    // Send notification only for delegators
    const { role, constants } = await getSubscriptorRole(subscriber)
    if (role === constants.ROLE.TRANSCODER) {
      continue
    }
    telegramsMessageToSend.push(sendNotificationTelegram(subscriber))
  }

  console.log(
    `[Worker notification delegator claim reward call] - Telegrams subscribers to notify ${
      telegramsMessageToSend.length
    }`
  )
  return await Promise.all(telegramsMessageToSend)
}

module.exports = {
  getSubscribersToSendEmails,
  getSubscribersToSendTelegrams
}
