const Joi = require('joi')

module.exports = {
  // POST /api/subscribers
  createSubscriber: {
    body: {
      email: Joi.string()
        .email()
        .required(),
      address: Joi.string().required(),
      frequency: Joi.string()
        .valid('monthly', 'weekly', 'daily', 'hourly')
        .required(),
      telegramChatId: [Joi.string().optional(), Joi.allow(null)]
    }
  },

  // UPDATE /api/subscribers/:subscriberId
  updateSubscriber: {
    body: {
      email: Joi.string()
        .email()
        .required(),
      address: Joi.string().required(),
      frequency: Joi.string()
        .valid('monthly', 'weekly', 'daily', 'hourly')
        .required(),
      telegramChatId: [Joi.string().optional(), Joi.allow(null)]
    },
    params: {
      subscriberId: Joi.string()
        .hex()
        .required()
    }
  },

  // DELETE /api/subscribers/:subscriberId
  deleteSubscriber: {
    params: {
      subscriberId: Joi.string()
        .hex()
        .required()
    }
  },

  // GET /api/subscribers/:subscriberId
  getSubscriber: {
    params: {
      subscriberId: Joi.string()
        .hex()
        .required()
    }
  },

  // GET /api/subscribers/summary/:address
  getSummary: {
    params: {
      addressWithoutSubscriber: Joi.string().required()
    }
  },

  // POST /api/subscribers/activate
  activateSubscriber: {
    body: {
      activatedCode: Joi.number().required()
    }
  },

  // GET /api/subscribers/address/:address
  // GET /api/delegates/address/:address
  // GET /api/delegators/address/:address
  getByAddress: {
    params: {
      address: Joi.string().required()
    }
  },

  // GET /api/delegates/roi/:address
  getROI: {
    params: {
      address: Joi.string().required()
    }
  },

  // GET /api/delegators/reward/:address
  getNextReward: {
    params: {
      address: Joi.string().required()
    }
  }
}
