import React from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/lib/useTheme";
import {
  getClassification,
  getClassificationColor,
} from "@/lib/types";

interface GradeRingProps {
  grade: number | null;
  size?: number;
  strokeWidth?: number;
  showClassification?: boolean;
  label?: string;
}

export function GradeRing({
  grade,
  size = 120,
  strokeWidth = 8,
  showClassification = true,
  label,
}: GradeRingProps) {
  const { colors, isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = grade !== null ? Math.min(grade / 100, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const classification = getClassification(grade);
  const ringColor = getClassificationColor(classification, isDark);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {grade !== null && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.gradeText,
            {
              color: grade !== null ? colors.text : colors.textTertiary,
              fontSize: size * 0.22,
            },
          ]}
        >
          {grade !== null ? `${Math.round(grade)}%` : "--"}
        </Text>
        {showClassification && (
          <Text
            style={[
              styles.classText,
              { color: ringColor, fontSize: size * 0.1 },
            ]}
          >
            {classification}
          </Text>
        )}
        {label && (
          <Text
            style={[
              styles.labelText,
              { color: colors.textSecondary, fontSize: size * 0.08 },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontFamily: "Inter_700Bold",
  },
  classText: {
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  labelText: {
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
