const sgMail = require('@sendgrid/mail')
const config = require('../../config/config')
const moment = require('moment')

const {
  truncateStringInTheMiddle,
  formatBalance,
  getDelegatorRoundsUntilUnbonded
} = require('./utils')

const {
  sendgridAPIKEY,
  fromEmail,
  fromEmailName,
  bccEmail,
  unsubscribeEmailUrl,
  sendgridTemplateIdClaimRewardCallAllGood,
  sendgridTemplateIdClaimRewardCallPayAttention,
  sendgridTemplateIdClaimRewardUnbondedState,
  sendgridTemplateIdClaimRewardUnbondingState,
  sendgridTemplateIdNotificationDelegateChangeRules
} = config

const sendEmail = async data => {
  const {
    email,
    templateId,
    transcoderAddress,
    dateYesterday,
    roundFrom,
    roundTo,
    lptEarned,
    delegatingStatusUrl,
    delegateAddress,
    roundsUntilUnbonded,
    unsubscribeEmailUrl,
    oldRewardCut,
    oldFeeShare,
    oldPendingFeeShare,
    oldPendingRewardCut,
    oldActive,
    newRewardCut,
    newFeeShare,
    newPendingFeeShare,
    newPendingRewardCut,
    newActive
  } = data

  sgMail.setApiKey(sendgridAPIKEY)
  sgMail.setSubstitutionWrappers('{{', '}}')

  const msg = {
    to: email,
    bcc: bccEmail,
    from: {
      name: fromEmailName,
      email: fromEmail
    },
    templateId: templateId,
    dynamic_template_data: {
      delegateAddress,
      transcoderAddress,
      dateYesterday,
      roundFrom,
      roundTo,
      lptEarned,
      delegatingStatusUrl,
      unsubscribeEmailUrl,
      roundsUntilUnbonded,
      oldRewardCut,
      oldFeeShare,
      oldPendingFeeShare,
      oldPendingRewardCut,
      oldActive,
      newRewardCut,
      newFeeShare,
      newPendingFeeShare,
      newPendingRewardCut,
      newActive
    }
  }

  if (!['test'].includes(config.env)) {
    try {
      console.log(`Trying to send email to ${email}`)
      await sgMail.send(msg)
      console.log(`Email sended to ${email} successfully`)
    } catch (err) {
      console.error(`There was an error trying to send email to ${email}`)
      console.error(err)
      throw err
    }
  }
  return
}

const sendDelegatorNotificationEmail = async (
  subscriber,
  delegator,
  delegateCalledReward,
  delegatorNextReward,
  currentRound,
  currentRoundInfo,
  constants
) => {
  try {
    let templateId
    let body = {}

    switch (delegator.status) {
      case constants.DELEGATOR_STATUS.Bonded:
        // Select template based on call reward
        templateId = delegateCalledReward
          ? sendgridTemplateIdClaimRewardCallAllGood
          : sendgridTemplateIdClaimRewardCallPayAttention

        // Calculate lpt earned tokens
        const lptEarned = formatBalance(delegatorNextReward, 2, 'wei')

        const dateYesterday = moment()
          .subtract(1, 'days')
          .startOf('day')
          .format('dddd DD, YYYY hh:mm A')

        const { delegateAddress, totalStake } = delegator

        // Generate params for body
        body = {
          callReward: delegateCalledReward,
          totalStake,
          currentRound,
          transcoderAddress: truncateStringInTheMiddle(delegateAddress),
          dateYesterday,
          roundFrom: currentRound,
          roundTo: currentRound + 1,
          lptEarned,
          delegatingStatusUrl: `https://explorer.livepeer.org/accounts/${subscriber.address}/delegating`,
          delegateAddress
        }
        break

      case constants.DELEGATOR_STATUS.Unbonded:
        templateId = sendgridTemplateIdClaimRewardUnbondedState
        break

      case constants.DELEGATOR_STATUS.Unbonding:
        templateId = sendgridTemplateIdClaimRewardUnbondingState

        const roundsUntilUnbonded = getDelegatorRoundsUntilUnbonded({
          delegator,
          constants,
          currentRoundInfo
        })

        // Generate params for body
        body = {
          roundsUntilUnbonded
        }

        break
      default:
        return
    }

    body.email = subscriber.email
    body.templateId = templateId

    await sendEmail(body)

    // // Save last email sent
    subscriber.lastEmailSent = Date.now()
    return await subscriber.save({ validateBeforeSave: false })
  } catch (e) {
    console.error(e)
    return
  }
}

const sendDelegatorNotificationDelegateChangeRulesEmail = async (
  subscriber,
  delegateAddress,
  propertiesChanged
) => {
  try {
    if (!subscriber.email) {
      return
    }

    let body = {
      transcoderAddress: truncateStringInTheMiddle(delegateAddress),
      delegatingStatusUrl: `https://explorer.livepeer.org/accounts/${subscriber.address}/delegating`,
      delegateAddress: delegateAddress,
      templateId: sendgridTemplateIdNotificationDelegateChangeRules,
      email: subscriber.email,
      oldRewardCut: propertiesChanged.oldProperties.rewardCut,
      oldFeeShare: propertiesChanged.oldProperties.feeShare,
      oldPendingFeeShare: propertiesChanged.oldProperties.pendingFeeShare,
      oldPendingRewardCut: propertiesChanged.oldProperties.pendingRewardCut,
      oldActive: propertiesChanged.oldProperties.active,
      newRewardCut: propertiesChanged.newProperties.rewardCut,
      newFeeShare: propertiesChanged.newProperties.feeShare,
      newPendingFeeShare: propertiesChanged.newProperties.pendingFeeShare,
      newPendingRewardCut: propertiesChanged.newProperties.pendingRewardCut,
      newActive: propertiesChanged.newProperties.active
    }

    console.log(`Sending email to ${subscriber.email} - Delegate change the rules`)
    await sendEmail(body)
  } catch (e) {
    console.error(e)
  }
  return
}

module.exports = {
  sendDelegatorNotificationEmail,
  sendDelegatorNotificationDelegateChangeRulesEmail
}
