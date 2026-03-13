module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src",
          },
        },
      ],
      // react-native-reanimated/plugin DEBE ir siempre al final
      "react-native-reanimated/plugin",
    ],
  };
};
