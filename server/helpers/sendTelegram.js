const TelegramBot = require('node-telegram-bot-api')
const stripTags = require('striptags')
const fs = require('fs')
const path = require('path')
const Handlebars = require('handlebars')
const promiseRetry = require('promise-retry')
const config = require('../../config/config')
const moment = require('moment')

const {
  getLivepeerDelegatorAccount,
  getLivepeerTranscoderAccount,
  getLivepeerCurrentRound
} = require('./livepeerAPI')
const Earning = require('../earning/earning.model')
const { createEarning, getButtonsBySubscriptor, truncateStringInTheMiddle } = require('./utils')
const { telegramBotKey } = config

const sendTelegram = async data => {
  const { chatId, address, body } = data

  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(telegramBotKey, { polling: true })

  if (!['test'].includes(config.env)) {
    try {
      const { buttons, welcomeText } = await getButtonsBySubscriptor({ address, chatId })
      await bot.sendMessage(
        chatId,
        `${body}

${welcomeText}`,
        {
          reply_markup: {
            keyboard: buttons
          },
          parse_mode: 'HTML'
        }
      )
      console.log(`Telegram sended to chatId ${chatId} successfully`)
    } catch (err) {
      console.log(err)
    }
  }
  return
}

const getTelegramBody = async subscriber => {
  let delegatorAccount, transcoderAccount, currentRound
  await promiseRetry(async retry => {
    // Get delegator Account
    try {
      delegatorAccount = await getLivepeerDelegatorAccount(subscriber.address)
      if (delegatorAccount && delegatorAccount.status == 'Bonded') {
        // Get transcoder account
        transcoderAccount = await getLivepeerTranscoderAccount(delegatorAccount.delegateAddress)
        currentRound = await getLivepeerCurrentRound()
      }
    } catch (err) {
      retry()
    }
  })
  if (!delegatorAccount || !transcoderAccount || !currentRound) {
    throw new Error('There is no telegram to send')
  }

  // Check if call reward
  const callReward = transcoderAccount.lastRewardRound === currentRound

  // Calculate fees, fromRound, toRound, earnedFromInflation
  let earnings = await Earning.find({ address: subscriber.address }).exec()

  // Sort earnings
  earnings.sort(function compare(a, b) {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB - dateA
  })

  // Reduce to obtain last two rounds
  earnings = earnings.reduce(function(r, a) {
    r[a.round] = r[a.round] || []
    r[a.round] = a
    return r
  }, Object.create(null))

  // Calculate rounds and earnings
  const earningFromValue =
    Object.keys(earnings) && Object.keys(earnings)[0] ? earnings[Object.keys(earnings)[0]] : null
  const earningToValue =
    Object.keys(earnings) && Object.keys(earnings)[1] ? earnings[Object.keys(earnings)[1]] : null

  const roundFrom = earningFromValue ? earningFromValue.round : 0
  const roundTo = earningToValue ? earningToValue.round : roundFrom
  const earningFromRound = earningFromValue ? earningFromValue.earning : 0
  const earningToRound = earningToValue ? earningToValue.earning : 0

  let lptEarned = 0
  if (earningFromRound && earningToRound) {
    lptEarned = earningFromRound - earningToRound
  }
  const dateYesterday = moment()
    .subtract(1, 'days')
    .startOf('day')
    .format('dddd DD, YYYY hh:mm A')

  // Open template file
  const filename = callReward
    ? '../notifications/telegram/templates/notification_success.hbs'
    : '../notifications/telegram/templates/notification_warning.hbs'
  const fileTemplate = path.join(__dirname, filename)
  const source = fs.readFileSync(fileTemplate, 'utf8')

  const { delegateAddress, totalStake } = delegatorAccount

  // Create telegram generator
  const template = Handlebars.compile(source)
  const body = template({
    transcoderAddressUrl: `https://explorer.livepeer.org/accounts/${delegateAddress}/transcoding`,
    transcoderAddress: truncateStringInTheMiddle(delegateAddress),
    dateYesterday: dateYesterday,
    roundFrom: roundFrom,
    roundTo: roundTo,
    lptEarned: lptEarned,
    delegatingStatusUrl: `https://explorer.livepeer.org/accounts/${subscriber.address}/delegating`
  })

  return {
    dateYesterday,
    lptEarned,
    roundFrom,
    roundTo,
    callReward,
    totalStake,
    currentRound,
    body,
    delegateAddress
  }
}

const sendNotificationTelegram = async (subscriber, createEarningOnSend = false) => {
  try {
    // Get telegram body
    const { callReward, totalStake, currentRound, body } = await getTelegramBody(subscriber)

    // Create earning
    if (createEarningOnSend) {
      await createEarning({ subscriber, totalStake, currentRound })
    }

    // Send telegram
    await sendTelegram({
      chatId: subscriber.telegramChatId,
      address: subscriber.address,
      body: body
    })

    // Save last telegram sent
    subscriber.lastTelegramSent = Date.now()
    return await subscriber.save({ validateBeforeSave: false })
  } catch (e) {
    return
  }
}

module.exports = { sendNotificationTelegram, getTelegramBody }