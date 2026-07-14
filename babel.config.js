module.exports = function (api) {
  // Invalidate Babel cache when worklets changes — otherwise Metro can keep
  // transforming with a previous plugin version (e.g. 0.10.1 vs 0.10.0).
  api.cache.using(() =>
    require('react-native-worklets/package.json').version,
  );
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
