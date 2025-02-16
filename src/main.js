import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import VueNativeSock from 'vue-native-websocket-vue3'
import VueVirtualScroller from 'vue-virtual-scroller'
import { defineRule } from 'vee-validate'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
const app = createApp(App)
defineRule('atLeastOneFieldRule', (value, [field1, field2, field3, field4]) => {
  if (value && field1 && field2 && field3 && field4) {
    return true
  }
  return '請勾選所有欄位'
})
app.use(createPinia())
app.use(router)
app.use(VueVirtualScroller)
app.use(VueNativeSock, 'wss:' + import.meta.env.VITE_WS_PATH, {
  reconnection: true, // (Boolean) whether to reconnect automatically (false)
  reconnectionAttempts: 5, // (Number) number of reconnection attempts before giving up (Infinity),
  reconnectionDelay: 3000, // (Number) how long to initially wait before attempting a new (1000)
})

app.mount('#app')
