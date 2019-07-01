const createRewardObject = (transcoderId, roundId) => {
  // ID between 1 and 100
  const id = Math.floor(Math.random() * 100 + 1)
  // Reward token between 1*10.pow(21) and 99 * 10.pow(21)
  const base = Math.pow(10, 21)
  const top = 9 * Math.pow(10, 21)
  const rewardTokens = Math.floor(Math.random() * top + base).toString()
  const transcoder = createTranscoder(transcoderId)
  const round = createRoundObject(roundId)
  return {
    id,
    rewardTokens,
    transcoder,
    round
  }
}

const createRoundObject = roundId => {
  return {
    id: roundId
  }
}

// TODO Complete with all the fields
const createTranscoder = transcoderId => {
  const mockTranscoder = {
    id: transcoderId,
    active: true,
    ensName: null,
    status: 'Registered',
    lastRewardRound: '1092',
    rewardCut: '100000',
    feeShare: '450000',
    pricePerSegment: '150000000000',
    pendingRewardCut: '50000',
    pendingFeeShare: '450000',
    pendingPricePerSegment: '150000000000',
    totalStake: '440522208151278163711606'
  }
  return mockTranscoder
}

const createDelegator = delegatorId => {
  const mockDelegator = {
    address: delegatorId,
    allowance: '9000000000000000000000',
    bondedAmount: '1648721740335621049244',
    delegateAddress: delegatorId,
    delegatedAmount: '0',
    fees: '0',
    lastClaimRound: '1348',
    pendingFees: '0',
    pendingStake: '1880033099473791560404',
    startRound: '1241',
    status: 'Bonded',
    withdrawRound: '0',
    withdrawAmount: '0',
    nextUnbondingLockId: '1',
    totalStake: '1880033099473791560404'
  }

  return mockDelegator
}

module.exports = {
  createRewardObject,
  createRoundObject,
  createTranscoder,
  createDelegator
}