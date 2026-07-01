module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo auto-adds react-native-worklets/plugin (for Reanimated) when the
    // package is installed, so it does not need to be listed here.
    presets: ['babel-preset-expo'],
  };
};

