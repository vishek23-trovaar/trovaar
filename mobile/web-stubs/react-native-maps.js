// Web-only stub for react-native-maps (which is native-only and breaks the
// Metro web bundle). Aliased in metro.config.js for platform === 'web' ONLY —
// native iOS/Android builds use the real library untouched. This exists so the
// app can run in a browser for design preview.
const React = require("react");
const { View, Text } = require("react-native");

function MapView(props) {
  return React.createElement(
    View,
    {
      style: [
        { alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", minHeight: 160 },
        props && props.style,
      ],
    },
    React.createElement(Text, { style: { color: "#94a3b8", fontSize: 13 } }, "Map view (native only)"),
    props && props.children
  );
}

function Marker() { return null; }
function Callout() { return null; }
function Polyline() { return null; }
function Circle() { return null; }

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Polyline = Polyline;
module.exports.Circle = Circle;
module.exports.PROVIDER_GOOGLE = "google";
module.exports.PROVIDER_DEFAULT = "default";
