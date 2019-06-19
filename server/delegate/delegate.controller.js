/**
 * Activate subscriber.
 * @returns {Subscriber}
 */

const { getDelegate } = require('../helpers/graphql/delegate')

const delegateByAddress = async (req, res, next) => {
  const { address = null } = req.params
  let result = null
  try {
    result = await getDelegate(address)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  delegateByAddress
}
