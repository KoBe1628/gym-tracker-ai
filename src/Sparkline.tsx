import React from "react";
import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

export default function Sparkline({ data = [] }: { data: number[] }) {
  if (!data || data.length < 2) return null;

  const width = 80;
  const height = 30;

  // 1. Find Range
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1; // Avoid division by zero

  // 2. Generate Points String for SVG
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      // Flip Y because SVG 0 is at the top
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={{ width, height, justifyContent: "center" }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke="#bef264" // Lime Green
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
