import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "@/lib/useTheme";
import {
  getClassification,
  getClassificationColor,
} from "@/lib/types";

interface ProgressBarProps {
  current: number | null;
  target: number | null;
  label?: string;
  showPercentage?: boolean;
  height?: number;
}

export function ProgressBar({
  current,
  target,
  label,
  showPercentage = true,
  height = 8,
}: ProgressBarProps) {
  const { colors, isDark } = useTheme();
  const progress = current !== null ? Math.min(current / 100, 1) : 0;
  const classification = getClassification(current);
  const barColor = getClassificationColor(classification, isDark);
  const targetPosition = target !== null ? Math.min(target / 100, 1) : null;

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label && (
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {label}
            </Text>
          )}
          {showPercentage && (
            <Text style={[styles.percentage, { color: colors.text }]}>
              {current !== null ? `${Math.round(current)}%` : "--"}
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
            borderRadius: height / 2,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%` as any,
              backgroundColor: barColor,
              borderRadius: height / 2,
            },
          ]}
        />
        {targetPosition !== null && (
          <View
            style={[
              styles.targetMarker,
              {
                left: `${targetPosition * 100}%` as any,
                height: height + 8,
                top: -4,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  percentage: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    width: "100%",
    overflow: "visible",
    position: "relative",
  },
  fill: {
    height: "100%",
  },
  targetMarker: {
    position: "absolute",
    width: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 1,
  },
});
