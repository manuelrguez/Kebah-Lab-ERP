const crypto = require('crypto')

const ALGORITHM = 'aes-256-cbc'
const KEY       = crypto.scryptSync(
  process.env.JWT_SECRET || 'fallback_key_change_in_production',
  'email_config_salt',
  32
)

const encrypt = (text) => {
  const iv         = crypto.randomBytes(16)
  const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

const decrypt = (encryptedText) => {
  const [ivHex, encHex] = encryptedText.split(':')
  const iv              = Buffer.from(ivHex, 'hex')
  const encrypted       = Buffer.from(encHex, 'hex')
  const decipher        = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

module.exports = { encrypt, decrypt }
