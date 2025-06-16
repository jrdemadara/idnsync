import axios from 'axios'

const api = axios.create({
  baseURL: 'https://azitsoroginc.com/api',
  timeout: 0
})

export default api
