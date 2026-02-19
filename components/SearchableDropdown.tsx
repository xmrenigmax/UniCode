import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface SearchableDropdownProps {
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  endpoint: string;
  queryParams?: Record<string, string>;
  icon: keyof typeof Ionicons.glyphMap;
  autoFocus?: boolean;
  testID?: string;
}

export function SearchableDropdown({
  placeholder,
  value,
  onSelect,
  endpoint,
  queryParams = {},
  icon,
  autoFocus = false,
  testID,
}: SearchableDropdownProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSelected) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isSelected]);

  async function fetchResults(q: string) {
    try {
      const baseUrl = getApiUrl();
      const params = new URLSearchParams({ q, ...queryParams });
      const url = new URL(`${endpoint}?${params}`, baseUrl);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      }
    } catch {
      setResults([]);
    }
  }

  const handleSelect = (item: string) => {
    setQuery(item);
    setIsSelected(true);
    setShowResults(false);
    onSelect(item);
    Keyboard.dismiss();
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    setIsSelected(false);
    if (!text.trim()) {
      onSelect("");
    }
  };

  const handleFocus = () => {
    if (!isSelected) {
      fetchResults(query);
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsSelected(false);
    onSelect("");
    setShowResults(false);
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: isSelected ? colors.success : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isSelected ? colors.success : colors.textTertiary}
        />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          testID={testID}
        />
        {isSelected ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.success}
            />
          </Pressable>
        ) : query.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>

      {showResults && !isSelected && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.text,
            },
          ]}
        >
          <FlatList
            data={results.slice(0, 8)}
            keyExtractor={(item, index) => `${item}-${index}`}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.list}
            scrollEnabled={results.length > 4}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.resultItem,
                  {
                    backgroundColor: pressed
                      ? colors.inputBackground
                      : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={16}
                  color={colors.textTertiary}
                  style={styles.resultIcon}
                />
                <Text
                  style={[styles.resultText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    maxHeight: 300,
  },
  list: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resultIcon: {
    marginRight: 10,
  },
  resultText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
