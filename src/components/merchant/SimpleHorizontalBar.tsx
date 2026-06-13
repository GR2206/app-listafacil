import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface SimpleHorizontalBarProps {
  value: number;
  max: number;
  color: string;
  width?: number;
  height?: number;
}

export function SimpleHorizontalBar({
  value,
  max,
  color,
  width = 280,
  height = 10,
}: SimpleHorizontalBarProps) {
  const safeMax = Math.max(max, 1);
  const fillWidth = Math.min(width, (value / safeMax) * width);

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={height / 2} fill="#E2E8F0" />
        <Rect x={0} y={0} width={fillWidth} height={height} rx={height / 2} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'flex-start',
  },
});
