import axios from 'axios'
import qs from 'qs'
import 'dotenv/config'

const paymentId = process.argv[2] || 'da3b05c5-326a-4816-87e8-d7128c78ea4f'
const clientId = process.env.BOG_CLIENT_ID
const clientSecret = process.env.BOG_CLIENT_SECRET

const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
const tokenRes = await axios.post(
  'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
  qs.stringify({ grant_type: 'client_credentials' }),
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
  },
)

const token = tokenRes.data.access_token
console.log('Token OK')

try {
  const receipt = await axios.get(
    `https://api.bog.ge/payments/v1/receipt/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  )
  console.log('Receipt:', JSON.stringify(receipt.data, null, 2))
} catch (err) {
  console.error('Receipt error:', err.response?.status, err.response?.data || err.message)
}
