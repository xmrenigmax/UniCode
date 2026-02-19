import { useColorScheme } from "react-native";
import Colors, { type ThemeColors } from "@/constants/colors";

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}
