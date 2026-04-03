<script setup lang="ts">
onLaunch(() => { })
</script>

<style lang="scss">
/* 引入字体图标 */
@import './static/iconfont/iconfont.css';

/* 引入 SVG 图标 */
@import './static/iconfont/iconfont-weapp/iconfont-weapp-icon.css';

/* 字体图标基础样式 - 只设置字体大小，颜色由各组件控制 */
.iconfont {
    font-size: 28px;
}

/* SVG 图标样式 - 只能改变大小，不能改变颜色 */
.t-icon {
    width: 28px !important;
    height: 28px !important;
    background-size: contain !important;
}
</style>
