/**
 * Mock de @react-native-community/slider para el entorno de test Jest.
 *
 * Sustituye el Slider nativo por un View genérico con las props necesarias
 * para que fireEvent(slider, 'valueChange', value) funcione en los tests.
 */

const React = require("react");
const { View } = require("react-native");

function Slider({
  value,
  onValueChange,
  testID,
  minimumValue,
  maximumValue,
  step,
  style,
  ...rest
}) {
  return React.createElement(View, {
    testID,
    value,
    onValueChange,
    minimumValue,
    maximumValue,
    step,
    style,
    accessibilityRole: "adjustable",
    ...rest,
  });
}

Slider.displayName = "Slider";

module.exports = Slider;
module.exports.default = Slider;
