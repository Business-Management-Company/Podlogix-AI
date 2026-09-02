const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // The design is drawn at 1440px. Every px in the compiled CSS becomes rem so
    // the root font-size (see globals.css) can scale the whole layout on
    // narrower desktops without touching a single component value.
    "postcss-pxtorem": {
      rootValue: 16,
      unitPrecision: 5,
      propList: ["*"],
      selectorBlackList: [],
      replace: true,
      mediaQuery: false,
      minPixelValue: 1.5,
    },
  },
};

export default config;
