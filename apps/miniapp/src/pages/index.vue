<script setup lang="ts">
import { ref, computed } from 'vue'
import CustomTabBar from '@/components/CustomTabBar.vue'

definePage({
  type: 'home',
})

// 状态
const currentArea = ref('A')

// 区域列表
const areas = ['A', 'B', 'C']

// 优惠券数据
const vouchers = ref([
  { id: 1, price: 50, value: 100, desc: '购100元券\n全场通用' },
  { id: 2, price: 29, value: 60, desc: '购60元券\n餐饮专享' },
  { id: 3, price: 9.9, value: 20, desc: '单人下午茶\n限时抢购' },
])

// 分类数据
const categories = ref([
  { id: 1, name: '特色餐饮', icon: '🍽️' },
  { id: 2, name: '休闲娱乐', icon: '🎭' },
  { id: 3, name: '零售商超', icon: '🛒' },
  { id: 4, name: '智慧教培', icon: '📚' },
])

// 商户数据
const merchants = ref([
  { id: 1, name: 'Green Life', desc: '轻食主义', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvCUwKVaYrs4AnCjSnl42WiuW9fajnK0HRLSorlZBtyRTDS0mvfHPRvSfAL_HAk77RdUDN-A32tYCjrhgDVqlzHjxI3x6cwpzTOFXd1vPicbo_cWzSI0sDdiqPEv98ZCYlrzv_po3GwC_bFaanCY-qfrWeGnm8fDSOs50Zsi3anhlO8X8v-MTgxi_3DoaKmnUVxHxje0iNnLw6UsSZFT-Q_gjt60qm5BC3WdTXFfZ17dECLvJmIZEvoZ3YsXwU8g20MwOXJkf6SOM', area: 'A' },
  { id: 2, name: '壹碗面道', desc: '手工研磨', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrXhiTaCraHXfzWXtaj57KHhXMk3xjMf-g2bvisKUAK9FVaCzQTTRKWpYaf3idBnbJfwi4CjlPRN8twbRn_4411uUJZO-r6dgWaNihxZAfnA2joubvsdeEaAs-W6S5Xe9eHIwYM4WMjo3XwnGFqXctva5mPQ9UqNCMiySrToQotSxzrO1u_gb9IWZZb5OtEJdR5mOammnefXdZ-bYLGBGe26DL1VKdNC7vVKfGpAxO9_KdWkAOeiTtyP4x0tCD18pXe3bFa1kCp4s', area: 'A' },
  { id: 3, name: 'The Coffee Lab', desc: '精品手冲', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUNEmwu__TOkmG9irmGJVjvt8zmUAX9VyWsQA0yfP207ZDKZx_cZLQerf8gNgic1v3vzlHJ5QXcyjHOv73JrjQAh_lPQY2QSCptKR0UepmQu8hSFcexLqr6FV1th7sFGLw2CST6wLQJsxXTnhVvuYnhdmjRPOQqTHnKD3C3_cpZn0k1ddNZ4pGd3zThyd7ecPu0Kvpak2GAgZ16kTVITk3nTPGqY-IyFBijUPL4pp3TNCM2-lBOfbmXWBypmCRKfwfbQkgIonVvxs', area: 'A' },
  { id: 4, name: '美妆空间', desc: '精致护肤', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvCUwKVaYrs4AnCjSnl42WiuW9fajnK0HRLSorlZBtyRTDS0mvfHPRvSfAL_HAk77RdUDN-A32tYCjrhgDVqlzHjxI3x6cwpzTOFXd1vPicbo_cWzSI0sDdiqPEv98ZCYlrzv_po3GwC_bFaanCY-qfrWeGnm8fDSOs50Zsi3anhlO8X8v-MTgxi_3DoaKmnUVxHxje0iNnLw6UsSZFT-Q_gjt60qm5BC3WdTXFfZ17dECLvJmIZEvoZ3YsXwU8g20MwOXJkf6SOM', area: 'A' },
  { id: 5, name: '潮玩部落', desc: '限量发售', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrXhiTaCraHXfzWXtaj57KHhXMk3xjMf-g2bvisKUAK9FVaCzQTTRKWpYaf3idBnbJfwi4CjlPRN8twbRn_4411uUJZO-r6dgWaNihxZAfnA2joubvsdeEaAs-W6S5Xe9eHIwYM4WMjo3XwnGFqXctva5mPQ9UqNCMiySrToQotSxzrO1u_gb9IWZZb5OtEJdR5mOammnefXdZ-bYLGBGe26DL1VKdNC7vVKfGpAxO9_KdWkAOeiTtyP4x0tCD18pXe3bFa1kCp4s', area: 'A' },
  { id: 6, name: '亲子乐园', desc: '欢聚时光', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUNEmwu__TOkmG9irmGJVjvt8zmUAX9VyWsQA0yfP207ZDKZx_cZLQerf8gNgic1v3vzlHJ5QXcyjHOv73JrjQAh_lPQY2QSCptKR0UepmQu8hSFcexLqr6FV1th7sFGLw2CST6wLQJsxXTnhVvuYnhdmjRPOQqTHnKD3C3_cpZn0k1ddNZ4pGd3zThyd7ecPu0Kvpak2GAgZ16kTVITk3nTPGqY-IyFBijUPL4pp3TNCM2-lBOfbmXWBypmCRKfwfbQkgIonVvxs', area: 'A' },
  { id: 7, name: '悦动健身', desc: '专业私教', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvCUwKVaYrs4AnCjSnl42WiuW9fajnK0HRLSorlZBtyRTDS0mvfHPRvSfAL_HAk77RdUDN-A32tYCjrhgDVqlzHjxI3x6cwpzTOFXd1vPicbo_cWzSI0sDdiqPEv98ZCYlrzv_po3GwC_bFaanCY-qfrWeGnm8fDSOs50Zsi3anhlO8X8v-MTgxi_3DoaKmnUVxHxje0iNnLw6UsSZFT-Q_gjt60qm5BC3WdTXFfZ17dECLvJmIZEvoZ3YsXwU8g20MwOXJkf6SOM', area: 'A' },
  { id: 8, name: '书香一角', desc: '静谧阅读', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrXhiTaCraHXfzWXtaj57KHhXMk3xjMf-g2bvisKUAK9FVaCzQTTRKWpYaf3idBnbJfwi4CjlPRN8twbRn_4411uUJZO-r6dgWaNihxZAfnA2joubvsdeEaAs-W6S5Xe9eHIwYM4WMjo3XwnGFqXctva5mPQ9UqNCMiySrToQotSxzrO1u_gb9IWZZb5OtEJdR5mOammnefXdZ-bYLGBGe26DL1VKdNC7vVKfGpAxO9_KdWkAOeiTtyP4x0tCD18pXe3bFa1kCp4s', area: 'A' },
])

// 新闻数据
const newsList = ref([
  {
    id: 1,
    title: '汉都天地智慧停车系统全面升级',
    date: '2023-11-20',
    tag: '公告',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvCUwKVaYrs4AnCjSnl42WiuW9fajnK0HRLSorlZBtyRTDS0mvfHPRvSfAL_HAk77RdUDN-A32tYCjrhgDVqlzHjxI3x6cwpzTOFXd1vPicbo_cWzSI0sDdiqPEv98ZCYlrzv_po3GwC_bFaanCY-qfrWeGnm8fDSOs50Zsi3anhlO8X8v-MTgxi_3DoaKmnUVxHxje0iNnLw6UsSZFT-Q_gjt60qm5BC3WdTXFfZ17dECLvJmIZEvoZ3YsXwU8g20MwOXJkf6SOM',
  },
  {
    id: 2,
    title: '冬日漫游计划：中庭冰雪艺术展启幕',
    date: '2023-11-18',
    tag: '活动',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7mJHuMWILTiyDVLj7hPfpemu_JwcxVMMIdJPiLn-fXWWoaB0jeEfPjPpckVoq8DGuUTMLmEW1sioMf5rF-Alszf7ueqCfBxbtZxktQOeg-fwlsly-BExX0WTaarT0zLBET3PTgZiS-0j-Igp8I3UCnScIAxeKd5q1a2x7qe_wJTbeVFPnOt0Pi0g3KvZBU91dA7wbvksDHTzP_XAukTEgFVPdai_G6ZLZcSB1FieEbEn5XkAij_r5lghZ_XoijlTZ38ubk-XNVnU',
  },
])

// 筛选商户
const filteredMerchants = computed(() => {
  return merchants.value.filter(m => m.area === currentArea.value)
})

// 切换区域
function switchArea(area: string) {
  currentArea.value = area
}

// 抢购优惠券
function grabVoucher(voucher: any) {
  uni.showToast({
    title: `抢购${voucher.price}元券`,
    icon: 'none',
  })
}

// 查看商户详情
function goToMerchant(merchant: any) {
  uni.showToast({
    title: '商户详情功能开发中',
    icon: 'none',
  })
}
</script>

<template>
  <view class="index-page">
    <!-- 背景品牌图案 - The Curated Canvas -->
    <view class="brand-pattern" />

    <!-- 顶部导航栏 - Glassmorphism -->
    <view class="top-bar">
      <view class="logo-wrapper">
        <image
          class="logo"
          src="https://lh3.googleusercontent.com/aida/ADBb0uiV675zUJL7aB66Qy8xbacdQP9XwJJGccu19iTA4HF-V-V0orowAFerT_eGhlHkKtVqdMMkF27ofkIQoDGnVJ5GSHoYVTS0I_tDTNbTAs-HgklMFAtncUmAgCGQ5kEWYJ7xB6egYkgHU05PCIOEBisBhxzXFXJATQCM5LHA9VdUwRALZoH-_wwPRdpXs4GHe5tuyodsdH8C_92xXqqj4t5N3qihxRY3jBHNpz1rm5ZmNOIOGKL2mZwZnlxRTd1jurMJhRc8Q_V0"
          mode="heightFix"
        />
      </view>
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <text class="search-text">搜索商户或优惠</text>
      </view>
    </view>

    <!-- 主内容区域 - Architectural Planes -->
    <view class="main-content">
      <!-- Hero Section - Tonal Gradient -->
      <view class="hero-section">
        <view class="banner-card">
          <image
            class="banner-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7mJHuMWILTiyDVLj7hPfpemu_JwcxVMMIdJPiLn-fXWWoaB0jeEfPjPpckVoq8DGuUTMLmEW1sioMf5rF-Alszf7ueqCfBxbtZxktQOeg-fwlsly-BExX0WTaarT0zLBET3PTgZiS-0j-Igp8I3UCnScIAxeKd5q1a2x7qe_wJTbeVFPnOt0Pi0g3KvZBU91dA7wbvksDHTzP_XAukTEgFVPdai_G6ZLZcSB1FieEbEn5XkAij_r5lghZ_XoijlTZ38ubk-XNVnU"
            mode="aspectFill"
          />
          <view class="banner-overlay">
            <text class="banner-tag">Featured Event</text>
            <text class="banner-title">悦享邻里味</text>
            <text class="banner-subtitle">汉都初冬美食季</text>
          </view>
        </view>
      </view>

      <!-- 热门优惠券 - Surface Layering -->
      <view class="voucher-section">
        <view class="section-header">
          <view class="header-left">
            <text class="section-tag">Limited Offer</text>
            <text class="section-title">抢购超值券</text>
          </view>
          <text class="more-link">更多优惠 →</text>
        </view>
        <scroll-view class="voucher-scroll no-scrollbar" scroll-x enable-flex>
          <view
            v-for="voucher in vouchers"
            :key="voucher.id"
            class="voucher-card"
            @click="grabVoucher(voucher)"
          >
            <view class="voucher-accent" />
            <view class="voucher-content">
              <view class="voucher-price">
                <text class="price-number">{{ voucher.price }}</text>
                <text class="price-unit">元</text>
              </view>
              <text class="voucher-desc">{{ voucher.desc }}</text>
              <button class="grab-btn">立即抢</button>
            </view>
          </view>
          <view class="scroll-end-spacer" />
        </scroll-view>
      </view>

      <!-- 分类图标网格 - Tone Transition -->
      <view class="category-grid">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
        >
          <view class="category-icon-wrapper">
            <text class="category-icon">{{ cat.icon }}</text>
          </view>
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>

      <!-- 精选商户 - No-Line Rule -->
      <view class="merchant-section">
        <view class="section-header">
          <text class="section-tag">Selected Stores</text>
          <text class="section-title">汉都天地 · 严选</text>
        </view>

        <!-- 区域筛选 - Ghost Border -->
        <scroll-view class="area-filter no-scrollbar" scroll-x enable-flex>
          <button
            v-for="area in areas"
            :key="area"
            :class="['area-btn', { active: currentArea === area }]"
            @click="switchArea(area)"
          >
            {{ area }}区
          </button>
        </scroll-view>

        <!-- 商户网格 - Ambient Light Shadow -->
        <view class="merchant-grid">
          <view
            v-for="merchant in filteredMerchants"
            :key="merchant.id"
            class="merchant-card"
            @click="goToMerchant(merchant)"
          >
            <view class="merchant-image-wrapper">
              <image
                class="merchant-image"
                :src="merchant.image"
                mode="aspectFill"
              />
            </view>
            <view class="merchant-info">
              <text class="merchant-name">{{ merchant.name }}</text>
              <text class="merchant-desc">{{ merchant.desc }}</text>
            </view>
          </view>
        </view>

        <button class="view-all-btn">查看全部</button>
      </view>

      <!-- 商场快讯 - Asymmetric Layout -->
      <view class="news-section">
        <view class="section-header">
          <text class="section-tag">Latest News</text>
          <text class="section-title">商场快讯</text>
        </view>
        <view class="news-grid">
          <view
            v-for="news in newsList"
            :key="news.id"
            class="news-card"
          >
            <view class="news-image-wrapper">
              <image
                class="news-image"
                :src="news.image"
                mode="aspectFill"
              />
              <view class="news-tag">{{ news.tag }}</view>
            </view>
            <view class="news-content">
              <text class="news-title">{{ news.title }}</text>
              <text class="news-date">{{ news.date }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <CustomTabBar :current="0" />
  </view>
</template>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background: #f5faff; // surface - Base Canvas
  padding-bottom: 96px;
  font-family: sans-serif;
  color: #171c20; // on-surface - Soft Black (Never 100% Black)
  -webkit-font-smoothing: antialiased;
  position: relative;
}


// The Curated Canvas - 背景品牌图案
.brand-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  /* background pattern removed for mp-weixin compatibility */

  opacity: 0.03;
  pointer-events: none;
}

// Glassmorphism - 顶部导航栏
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(245, 250, 255, 0.9); // surface at 90% opacity
  /* backdrop-filter not supported in mp-weixin */

  .logo-wrapper {
    display: flex;
    align-items: center;
    height: 28px;

    .logo {
      height: 100%;
      width: auto;
      object-fit: contain;
      mix-blend-mode: multiply;
    }
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    background: rgba(228, 233, 238, 0.8); // surface-container-high
    border-radius: 999px; // full - pill
    transition: all 0.2s;

    &:active {
      opacity: 0.8;
      transform: scale(0.95);
    }

    .search-icon {
      font-size: 14px;
      color: #6e7881; // on-surface-variant
    }

    .search-text {
      font-size: 10px;
      color: #6e7881; // on-surface-variant
      font-weight: 500;
    }
  }
}

// Architectural Planes - 主内容
.main-content {
  position: relative;
  z-index: 10;
  padding-bottom: 24px;
}

// Tonal Gradient - Hero Section
.hero-section {
  padding: 4px 24px;

  .banner-card {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 12px; // lg
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .banner-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .banner-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(23, 28, 32, 0.4), transparent);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20px;

      .banner-tag {
        display: block;
        font-size: 10px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.8);
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }

      .banner-title {
        display: block;
        font-size: 24px;
        font-weight: 800;
        color: #fff;
        line-height: 1.2;
      }

      .banner-subtitle {
        display: block;
        font-size: 24px;
        font-weight: 800;
        color: #fff;
        line-height: 1.2;
      }
    }
  }
}

// Surface Layering - 优惠券区域
.voucher-section {
  padding: 16px 0;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 24px 8px;

    .header-left {
      .section-tag {
        display: block;
        font-size: 10px;
        font-weight: 800;
        color: #00AEEF; // primary-container
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }

      .section-title {
        display: block;
        font-size: 20px;
        font-weight: 800;
        color: #171c20; // on-surface
      }
    }

    .more-link {
      font-size: 12px;
      font-weight: 700;
      color: #00AEEF; // primary-container
      margin-bottom: 2px;
    }
  }

  .voucher-scroll {
    display: flex;
    gap: 12px;
    padding: 0 24px;
    white-space: nowrap;

    .scroll-end-spacer {
      flex-shrink: 0;
      width: 8px;
    }
  }

  .voucher-card {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    width: 115px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.9); // surface-container-lowest at 90%
    /* backdrop-filter not supported in mp-weixin */
    border-radius: 8px; // DEFAULT
    box-shadow: 0 4px 16px rgba(23, 28, 32, 0.04); // Ambient Light Shadow (4-6% opacity)
    flex-shrink: 0;
    overflow: hidden;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }

    .voucher-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #00658d, #00aeef); // Tonal Gradient
    }

    .voucher-content {
      display: flex;
      flex-direction: column;

      .voucher-price {
        display: flex;
        align-items: baseline;
        gap: 2px;
        margin-bottom: 8px;

        .price-number {
          font-size: 20px;
          font-weight: 800;
          color: #00aeef; // primary-container
        }

        .price-unit {
          font-size: 10px;
          font-weight: 700;
          color: #6e7881; // on-surface-variant
        }
      }

      .voucher-desc {
        display: block;
        font-size: 9px;
        font-weight: 500;
        color: rgba(110, 120, 129, 0.6);
        line-height: 1.4;
        white-space: pre-line;
        margin-bottom: 12px;
      }

      .grab-btn {
        width: 100%;
        padding: 6px 0;
        background: #00aeef; // primary-container
        color: #fff; // on-primary
        font-size: 10px;
        font-weight: 700;
        border-radius: 6px;
        border: none;
        transition: transform 0.2s;

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

// Tone Transition - 分类网格
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px 24px;

  .category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }

    .category-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: rgba(239, 244, 250, 0.8); // surface-container-low at 80%
      /* backdrop-filter not supported in mp-weixin */
      border-radius: 16px;
      box-shadow: 0 2px 4px rgba(0, 174, 239, 0.1);
      // Ghost Border (outline-variant at 20% opacity)
      border: 1px solid rgba(189, 200, 209, 0.2);

      .category-icon {
        font-size: 30px;
        color: #00AEEF; // primary-container
      }
    }

    .category-name {
      font-size: 10px;
      font-weight: 700;
      color: #6e7881; // on-surface-variant
      letter-spacing: 0.5px;
    }
  }
}

// No-Line Rule - 商户区域
.merchant-section {
  padding: 0 24px 24px;

  .section-header {
    margin-bottom: 12px;

    .section-tag {
      display: block;
      font-size: 10px;
      font-weight: 800;
      color: #00AEEF; // primary-container
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .section-title {
      display: block;
      font-size: 20px;
      font-weight: 800;
      color: #171c20; // on-surface
      line-height: 1.2;
    }
  }

  .area-filter {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    white-space: nowrap;
    padding: 4px 0;

    .area-btn {
      flex-shrink: 0;
      padding: 6px 20px;
      background: rgba(228, 233, 238, 0.6); // surface-container-high at 60%
      color: #6e7881; // on-surface-variant
      font-size: 10px;
      font-weight: 700;
      border-radius: 999px; // full - pill
      // Ghost Border (outline-variant at 20% opacity)
      border: 1px solid rgba(189, 200, 209, 0.2);
      transition: all 0.3s;

      &:active {
        transform: scale(0.95);
      }

      &.active {
        background: #00AEEF; // primary-container
        color: #fff; // on-primary
        box-shadow: 0 4px 8px rgba(0, 174, 239, 0.2);
      }
    }
  }

  // Ambient Light Shadow - 商户网格
  .merchant-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;

    .merchant-card {
      background: rgba(255, 255, 255, 0.9); // surface-container-lowest at 90%
      /* backdrop-filter not supported in mp-weixin */
      border-radius: 8px; // DEFAULT
      overflow: hidden;
      // Ambient Shadow: X:0, Y:2-8px, Blur:32px, Color:on-surface at 3-4% opacity
      box-shadow: 0 2px 8px rgba(23, 28, 32, 0.03);
      // Ghost Border (outline-variant at 30% opacity - slightly more visible)
      border: 1px solid rgba(189, 200, 209, 0.3);
      transition: transform 0.2s;
      display: flex;
      flex-direction: column;

      &:active {
        transform: scale(0.98);
      }

      .merchant-image-wrapper {
        position: relative;
        aspect-ratio: 1;

        .merchant-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .merchant-info {
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .merchant-name {
          display: block;
          font-size: 9px;
          font-weight: 700;
          color: #171c20; // on-surface
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .merchant-desc {
          display: block;
          font-size: 8px;
          font-weight: 500;
          color: rgba(110, 120, 129, 0.8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .view-all-btn {
    width: 100%;
    padding: 8px 32px;
    background: rgba(0, 174, 239, 0.05); // primary-container at 5%
    color: #00aeef; // primary-container
    font-size: 10px;
    font-weight: 700;
    border-radius: 999px; // full - pill
    // Ghost Border (primary-container at 30% opacity)
    border: 2px solid rgba(0, 174, 239, 0.3);
    display: flex;
    justify-content: center;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }
  }
}

// Asymmetric Layout - 商场快讯
.news-section {
  padding: 32px 24px 24px;

  .section-header {
    margin-bottom: 12px;

    .section-tag {
      display: block;
      font-size: 10px;
      font-weight: 800;
      color: #00AEEF; // primary-container
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .section-title {
      display: block;
      font-size: 20px;
      font-weight: 800;
      color: #171c20; // on-surface
      line-height: 1.2;
    }
  }

  .news-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .news-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.2s;

      &:active {
        transform: scale(0.98);
      }

      .news-image-wrapper {
        position: relative;
        aspect-ratio: 4 / 3;
        border-radius: 12px; // lg
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        .news-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .news-tag {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 2px 8px;
          background: #00AEEF; // primary-container
          color: #fff; // on-primary
          font-size: 8px;
          font-weight: 700;
          border-radius: 4px;
        }
      }

      .news-content {
        padding: 0 2px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .news-title {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #171c20; // on-surface
          line-height: 1.4;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .news-date {
          display: block;
          font-size: 9px;
          font-weight: 500;
          font-style: italic;
          color: rgba(110, 120, 129, 0.6);
        }
      }
    }
  }
}

// 无滚动条样式
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>