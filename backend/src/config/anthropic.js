// Lazy init — ensures dotenv runs first (learned pattern from LexDesk)
let _client = null

const getClient = () => {
  if (!_client) {
    const Anthropic = require('@anthropic-ai/sdk')
    _client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

module.exports = { getClient }
