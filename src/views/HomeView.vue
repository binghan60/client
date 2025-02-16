<script>
import axios from 'axios'
import { Field, Form, ErrorMessage } from 'vee-validate'

export default {
  name: 'StockDashBoard',
  components: {
    VField: Field,
    VForm: Form,
    ErrorMessage,
  },
  data() {
    return {
      stockInfo: [],
      stockMap: new Map(),
      changedRows: new Set(),
      socket: null,
      selectedStock: null,
      orderBox: [],
      currentOrder: {
        transaction: '',
        category: '',
        type: '',
        buySell: '',
        amount: 1,
      },
    }
  },
  methods: {
    async getStockInfo() {
      try {
        const { data } = await axios.get(import.meta.env.VITE_API_PATH + '/stockInfo')
        this.stockMap = new Map(data.map(stock => [stock.symbol, stock]))
        return data
      } catch (error) {
        console.error('Get基本資料錯誤:', error)
        return []
      }
    },
    getColorClass(change) {
      if (change === 10) {
        return 'bg-red-600 text-gray-300'
      }
      if (change === -10) {
        return 'bg-green-600 text-gray-300'
      }

      if (change > 0) return 'text-red-500'

      if (change < 0) return 'text-green-500'
      return 'text-gray-300'
    },
    updateStockData(newData) {
      newData.forEach(item => {
        const existingStock = this.stockMap.get(item.symbol)
        if (!existingStock) return
        const isChanged = existingStock.price !== item.price || existingStock.amountChange !== item.amountChange || existingStock.change !== item.change
        if (!isChanged) return
        this.changedRows.add(item.symbol)
        setTimeout(() => this.changedRows.delete(item.symbol), 1000)
        const updatedStock = { ...existingStock, ...item }
        this.stockMap.set(item.symbol, updatedStock)
        if (this.selectedStock?.symbol === item.symbol) {
          this.selectedStock = updatedStock
        }
      })
      this.stockInfo = Array.from(this.stockMap.values())
    },

    selectStock(stock) {
      this.selectedStock = stock
    },
    onderStock() {
      const mixForm = Object.assign(this.selectedStock, this.currentOrder)
      const timeStamp = new Date().getTime()
      mixForm.id = timeStamp
      this.orderBox.push(mixForm)
      localStorage.setItem('orderBox', JSON.stringify(this.orderBox))
    },
    translateTransaction(value) {
      if (value === 'Common') return '整股'
      if (value === 'IntradayOdd') return '盤中零股'
      if (value === 'Od') return '盤後'
      if (value === 'Odd') return '盤後零股'
    },
    translateCategory(value) {
      if (value === 'Stock') return '現股'
      if (value === 'Margin') return '融資'
      if (value === 'Short') return '融券'
      if (value === 'SBL') return '借券'
    },
    handleInput(event) {
      let value = parseInt(event.target.value) || 1
      if (value < 1) value = 1
      this.currentOrder.amount = value
      event.target.value = value
    },
    decreaseAmount() {
      if (this.currentOrder.amount > 1) {
        this.currentOrder.amount--
      }
    },
    deleteOrder(id) {
      const index = this.orderBox.findIndex(order => order.id === id)
      if (index !== -1) {
        this.orderBox.splice(index, 1)

        // 刪除後更新 localStorage
        localStorage.setItem('orderBox', JSON.stringify(this.orderBox))
      }
    },
  },
  computed: {
    soldPrice() {
      const price = this.selectedStock?.price
      if (price == null) return ''
      if (price < 10) return (price - 0.01).toFixed(2)
      if (price < 50) return (price - 0.05).toFixed(2)
      if (price < 100) return (price - 0.1).toFixed(1)
      if (price < 500) return (price - 0.5).toFixed(1)
      if (price < 1000) return (price - 1).toFixed(0)
      if (price >= 1000) return (price - 5).toFixed(0)
      return price
    },
  },
  async mounted() {
    const stockInfo = await this.getStockInfo()
    this.stockInfo = stockInfo
    this.selectedStock = this.stockInfo[0]
    this.$options.sockets.onmessage = event => {
      const data = JSON.parse(event.data)
      this.updateStockData(data)
      this.stockInfo = Array.from(this.stockMap.values())
    }
    const savedOrderBox = localStorage.getItem('orderBox')
    if (savedOrderBox) {
      this.orderBox = JSON.parse(savedOrderBox)
    }
  },
}
</script>

<template>
  <div class="bg-black text-white max-w-7xl mx-auto grid lg:grid-cols-2">
    <div class="w-full overflow-hidden">
      <div class="grid grid-cols-5 gap-0">
        <!-- 表格頭 -->
        <div class="border border-white px-2 py-2 text-center">名稱</div>
        <div class="border border-white px-2 py-2 text-center">代號</div>
        <div class="border border-white px-2 py-2 text-center">成交</div>
        <div class="border border-white px-2 py-2 text-center">漲跌</div>
        <div class="border border-white px-2 py-2 text-center">幅度</div>
      </div>
      <RecycleScroller class="scroller cursor-pointer" :items="stockInfo" :item-size="41.6" key-field="symbol" v-slot="{ item }">
        <div :class="{ 'outline-2 outline-white animate-outline-fade grid grid-cols-5': changedRows.has(item.symbol), 'grid grid-cols-5 gap-0': !changedRows.has(item.symbol), 'bg-[rgba(45,212,191,0.5)]': this.selectedStock.symbol == item.symbol }" @click="selectStock(item)">
          <div class="border border-white px-2 py-2 text-center text-nowrap">{{ item.name }}</div>
          <div class="border border-white px-2 py-2 text-center">{{ item.symbol }}</div>
          <div class="border border-white px-2 text-right py-2" :class="getColorClass(item.change)">
            {{ item.price }}
          </div>
          <div class="border border-white px-2 text-right py-2" :class="getColorClass(item.change)">
            {{ item.amountChange > 0 ? '+' + item.amountChange : item.amountChange }}
          </div>
          <div class="border border-white px-2 text-right py-2" :class="getColorClass(item.change)">{{ item.change }}%</div>
        </div>
      </RecycleScroller>
    </div>
    <div class="w-full">
      <div class="text-center p-2 border-b border-white">
        <h3 class="text-xl">{{ selectedStock?.name }}</h3>
        <h3 class="text-xl">{{ selectedStock?.symbol }}</h3>
      </div>
      <VForm @submit="onderStock" class="text-white p-4 w-108 space-y-4 mx-auto">
        <!-- 交易 -->
        <div class="flex items-center space-x-2">
          <span class="w-12">交易</span>
          <div class="flex space-x-2">
            <label class="flex items-center">
              <VField type="radio" name="transaction" rules="atLeastOneFieldRule:@category,@type,@buySell,@amount" v-model="currentOrder.transaction" class="hidden peer" value="Common" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">整股</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="transaction" rules="atLeastOneFieldRule:@category,@type,@buySell,@amount" v-model="currentOrder.transaction" class="hidden peer" value="IntradayOdd" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">盤中零股</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="transaction" rules="atLeastOneFieldRule:@category,@type,@buySell,@amount" v-model="currentOrder.transaction" class="hidden peer" value="Od" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">盤後</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="transaction" rules="atLeastOneFieldRule:@category,@type,@buySell,@amount" v-model="currentOrder.transaction" class="hidden peer" value="Odd" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">盤後零股</span>
            </label>
          </div>
        </div>
        <!-- 類別 -->
        <div class="flex items-center space-x-2">
          <span class="w-12">類別</span>
          <div class="flex space-x-2">
            <label class="flex items-center">
              <VField type="radio" name="category" class="hidden peer" v-model="currentOrder.category" value="Stock" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">現股</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="category" class="hidden peer" v-model="currentOrder.category" value="Margin" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">融資</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="category" class="hidden peer" v-model="currentOrder.category" value="Short" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">融券</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="category" class="hidden peer" v-model="currentOrder.category" value="SBL" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">借券</span>
            </label>
          </div>
        </div>

        <!-- 種類 -->
        <div class="flex items-center space-x-2">
          <span class="w-12">種類</span>
          <div class="flex space-x-2">
            <label class="flex items-center">
              <VField type="radio" name="type" class="hidden peer" v-model="currentOrder.type" value="ROD" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">ROD</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="type" class="hidden peer" v-model="currentOrder.type" value="IOC" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">IOC</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="type" class="hidden peer" v-model="currentOrder.type" value="FOK" />
              <span class="bg-gray-700 px-3 py-2 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">FOK</span>
            </label>
          </div>
        </div>

        <!-- 買賣 -->
        <div class="flex space-x-2">
          <span class="w-12">買賣</span>
          <div class="flex space-x-2">
            <label class="flex items-center">
              <VField type="radio" name="buySell" class="hidden peer" v-model="currentOrder.buySell" value="buy" />
              <span class="bg-gray-700 px-3 text-center py-2 w-20 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">買進</span>
            </label>
            <label class="flex items-center">
              <VField type="radio" name="buySell" class="hidden peer" v-model="currentOrder.buySell" value="sell" />
              <span class="bg-gray-700 text-center px-3 py-2 w-20 rounded peer-checked:bg-white peer-checked:text-black cursor-pointer">賣出</span>
            </label>
          </div>
        </div>

        <!-- 張數 -->
        <div class="flex items-center space-x-2">
          <span class="w-12 text-yellow-400">張數</span>
          <div class="flex items-center">
            <button class="text-white px-3 py-2" @click="decreaseAmount">-</button>
            <VField type="text" name="amount" min="0" v-model="currentOrder.amount" class="w-12 text-white text-center" @input="handleInput" />
            <button class="text-white px-3 py-2" @click="currentOrder.amount + 1">+</button>
          </div>
          <span class="ml-auto text-sm">1單位 1000.0股</span>
        </div>
        <div class="text-center">
          <ErrorMessage name="transaction" class="text-sm text-red-500 dark:text-rose-400" />
        </div>

        <div class="col-span-2 flex justify-around">
          <button type="button" class="bg-gray-200 text-black py-2 px-8 cursor-pointer">取消</button>
          <button type="submit" class="bg-red-400 py-2 px-8 cursor-pointer">下單</button>
        </div>
      </VForm>
    </div>
    <div class="w-full h-[300px] col-span-2">
      <div class="border border-white text-orange-300 text-center grid grid-cols-9">
        <div class="">買賣</div>
        <div class="">動作</div>
        <div class="">商品</div>
        <div class="">價格</div>
        <div class="">數量</div>
        <div class="">狀態</div>
        <div class="">交易</div>
        <div class="">類別</div>
        <div class="">種類</div>
      </div>
      <ul>
        <li v-for="order in orderBox" class="grid grid-cols-9 border-b border-white py-2" :key="order.id">
          <div class="text-center">{{ order.buySell === 'buy' ? '買進' : '賣出' }}</div>
          <div class="text-center">
            <button class="bg-gray-300 px-2 text-black rounded-lg cursor-pointer" type="button" @click="deleteOrder(order.id)">刪單</button>
          </div>
          <div class="text-center">{{ order.name }}</div>
          <div class="text-center">{{ order.price }}</div>
          <div class="text-center">{{ order.amount }}</div>
          <div class="text-center">未成交</div>
          <div class="text-center">{{ translateTransaction(order.transaction) }}</div>
          <div class="text-center">{{ translateCategory(order.category) }}</div>
          <div class="text-center">{{ order.type }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scope>
@keyframes outlineFade {
  from {
    outline-color: rgb(103 232 249);
    /* background-color: gray; */
  }
  to {
    outline-color: transparent;
    /* background-color: black; */
  }
}
.animate-outline-fade {
  animation: outlineFade 1s ease-out;
}

.scroller {
  height: 416px; /* 給定滾動容器固定高度 */
  overflow: auto; /* 讓容器有滾動條 */
  overflow: hidden;
}

.scroller::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.user {
  height: 32px; /* 每個項目的高度 */
  padding: 0 12px;
  display: flex;
  align-items: center;
}

.card {
  overflow-y: auto;
  scrollbar-gutter: stable;
}
</style>
