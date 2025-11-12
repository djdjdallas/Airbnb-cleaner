module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@screens': './app/screens',
            '@services': './services',
            '@utils': './utils',
            '@constants': './constants',
            '@hooks': './hooks',
            '@types': './types'
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json'
          ]
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
