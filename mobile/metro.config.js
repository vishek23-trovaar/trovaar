// Metro config — extends the Expo default.
//
// The ONLY customization is a web-only alias: react-native-maps is a
// native-only module and importing it (the contractor dashboard does) breaks
// the Metro web bundle. We redirect it to a no-op stub when platform === 'web'
// so the app can run in a browser for design preview. Native iOS/Android
// bundling is completely unaffected.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const WEB_ALIASES = {
  "react-native-maps": path.resolve(__dirname, "web-stubs/react-native-maps.js"),
};

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_ALIASES[moduleName]) {
    return { type: "sourceFile", filePath: WEB_ALIASES[moduleName] };
  }
  return (upstreamResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
