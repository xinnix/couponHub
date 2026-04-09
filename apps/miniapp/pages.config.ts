import { defineUniPages } from "@uni-helper/vite-plugin-uni-pages";

export default defineUniPages({
  pages: [
    {
      path: "pages/index",
      type: "home",
    },
    {
      path: "pages/hi",
      type: "page",
      layout: "home",
    },
    {
      path: "pages/login",
      type: "page",
    },
    {
      path: "pages/coupon/detail",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
        navigationStyle: "default",
        navigationBarBackgroundColor: "#F5FAFF",
        navigationBarTextStyle: "black",
        navigationBarTitleText: "优惠券详情",
      },
    },
    {
      path: "pages/coupon/list",
      type: "page",
    },
    {
      path: "pages/handler/index",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
        navigationStyle: "default",
        navigationBarBackgroundColor: "#F5FAFF",
        navigationBarTextStyle: "black",
        navigationBarTitleText: "核销员工作台",
      },
    },
    {
      path: "pages/handler/records",
      type: "page",
    },
    {
      path: "pages/home/index",
      type: "page",
    },
    {
      path: "pages/merchant/detail",
      type: "page",
    },
    {
      path: "pages/merchant/list",
      type: "page",
    },
    {
      path: "pages/news/detail",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
      },
    },
    {
      path: "pages/profile/index",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
        navigationStyle: "default",
        navigationBarBackgroundColor: "#F5FAFF",
        navigationBarTextStyle: "black",
        navigationBarTitleText: "修改个人信息",
      },
    },
    {
      path: "pages/qrcode/index",
      type: "page",
    },
    {
      path: "pages/redemption/confirm",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
        navigationStyle: "custom",
      },
    },
    {
      path: "pages/scan/index",
      type: "page",
      style: {
        backgroundColor: "#F5FAFF",
        navigationStyle: "default",
        navigationBarBackgroundColor: "#F5FAFF",
        navigationBarTextStyle: "black",
        navigationBarTitleText: "扫码核销",
      },
    },
    {
      path: "pages/wallet/index",
      type: "page",
    },
  ],
  globalStyle: {
    backgroundColor: "@bgColor",
    backgroundColorBottom: "@bgColorBottom",
    backgroundColorTop: "@bgColorTop",
    backgroundTextStyle: "@bgTxtStyle",
    navigationBarBackgroundColor: "#000000",
    navigationBarTextStyle: "@navTxtStyle",
    navigationBarTitleText: "Vitesse-Uni",
    navigationStyle: "custom",
  },
});
