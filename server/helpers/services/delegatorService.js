const _ = require('lodash')

const { getDelegateService } = require('./delegateService')
const { MathBN } = require('../utils')

let delegatorServiceInstance
// The delegate information comes from the SDK as default, graphql is not implemented
const defaultSource = require('../sdk/delegator')

const getDelegatorService = (source = defaultSource) => {
  if (!delegatorServiceInstance) {
    delegatorServiceInstance = new DelegatorService(source)
  }
  return delegatorServiceInstance
}

class DelegatorService {
  constructor(source) {
    this.source = source
  }

  getDelegatorAccount = async address => {
    const { getLivepeerDelegatorAccount } = this.source
    return await getLivepeerDelegatorAccount(address)
  }

  getDelegatorTokenBalance = async address => {
    const { getLivepeerDelegatorTokenBalance } = this.source
    return await getLivepeerDelegatorTokenBalance(address)
  }

  getLivepeerDelegatorStake = async address => {
    const { getLivepeerDelegatorStake } = this.source
    return await getLivepeerDelegatorStake(address)
  }

  // Returns the delegator's next round-reward
  getDelegatorNextReward = async delegatorAddress => {
    const delegateService = getDelegateService()
    // FORMULA: rewardToDelegators * delegatorParticipationInTotalStake
    const delegator = await this.getDelegatorAccount(delegatorAddress)
    const { delegateAddress, totalStake } = delegator
    let [delegateTotalStake, rewardToDelegators] = await Promise.all([
      delegateService.getDelegateTotalStake(delegateAddress),
      delegateService.getDelegateRewardToDelegators(delegateAddress)
    ])
    // Delegator participation FORMULA: delegatorTotalStake / delegateTotalStake
    let delegatorParticipationInTotalStake = 0
    if (delegateTotalStake > 0) {
      delegatorParticipationInTotalStake = MathBN.div(totalStake, delegateTotalStake)
    }
    return MathBN.mul(rewardToDelegators, delegatorParticipationInTotalStake)
  }
}

module.exports = {
  getDelegatorService
}
