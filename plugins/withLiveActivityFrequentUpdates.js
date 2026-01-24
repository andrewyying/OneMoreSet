const { withInfoPlist } = require('@expo/config-plugins');

const withLiveActivityFrequentUpdates = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return config;
  });

module.exports = withLiveActivityFrequentUpdates;
