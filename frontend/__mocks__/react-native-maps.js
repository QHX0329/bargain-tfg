/**
 * Mock de react-native-maps para el entorno de test de Jest.
 *
 * MapView y Marker son componentes nativos que requieren TurboModules
 * no disponibles en el entorno Node.js de Jest. Este mock los sustituye
 * por componentes React simples que permiten hacer pruebas de renderizado.
 */

const React = require("react");
const { View, Text } = require("react-native");

const MapView = React.forwardRef(function MapView({ children, testID }, ref) {
  // Exponer animateToRegion a través de la ref
  React.useImperativeHandle(ref, () => ({
    animateToRegion: jest.fn(),
  }));
  return React.createElement(
    View,
    { testID: testID || "mock-map-view" },
    children,
  );
});
MapView.displayName = "MapView";

function Marker({ title, description }) {
  return React.createElement(
    View,
    { testID: `marker-${title}` },
    React.createElement(Text, null, title),
    description ? React.createElement(Text, null, description) : null,
  );
}
Marker.displayName = "Marker";

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.MapView = MapView;
module.exports.PROVIDER_GOOGLE = "google";
module.exports.PROVIDER_DEFAULT = null;
