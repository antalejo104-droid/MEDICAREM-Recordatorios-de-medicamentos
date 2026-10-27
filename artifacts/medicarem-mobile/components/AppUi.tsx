import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const TextScaleContext = createContext(false);

export function TextScaleProvider({
  large,
  children,
}: {
  large: boolean;
  children: ReactNode;
}) {
  return (
    <TextScaleContext.Provider value={large}>
      {children}
    </TextScaleContext.Provider>
  );
}

export function AppText({
  children,
  variant = "body",
  style,
  ...props
}: TextProps & {
  variant?: "body" | "title" | "heading" | "label" | "muted";
  children: ReactNode;
}) {
  const colors = useColors();
  const large = useContext(TextScaleContext);
  const sizes = { body: 17, title: 32, heading: 22, label: 15, muted: 15 };
  const flattened = StyleSheet.flatten(style);
  const size = flattened?.fontSize ?? sizes[variant];
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.8}
      {...props}
      style={[
        {
          color: variant === "muted" ? colors.mutedForeground : colors.foreground,
          fontFamily:
            variant === "title" || variant === "heading"
              ? "Manrope_700Bold"
              : variant === "label"
                ? "DMSans_700Bold"
                : "DMSans_400Regular",
          fontSize: large ? size * 1.14 : size,
          lineHeight: (large ? size * 1.14 : size) * 1.45,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: object;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === "web";
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingTop: web ? 67 : Math.max(insets.top, 12) + 12,
            paddingBottom: web ? 118 : Math.max(insets.bottom + 28, 40),
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ActionButton({
  title,
  icon,
  variant = "primary",
  style,
  disabled,
  ...props
}: PressableProps & {
  title: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
}) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.destructive
        : variant === "secondary"
          ? colors.secondary
          : "transparent";
  const fg =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "danger"
        ? colors.destructiveForeground
        : variant === "secondary"
          ? colors.secondaryForeground
          : colors.primary;
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed, hovered }) => {
        const customStyle =
          typeof style === "function" ? style({ pressed, hovered }) : style;
        return [
          styles.button,
          {
            backgroundColor: bg,
            borderColor: variant === "quiet" ? "transparent" : colors.border,
            opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
          },
          customStyle,
        ] as StyleProp<ViewStyle>;
      }}
    >
      {icon}
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.7}
        style={[
          styles.buttonText,
          { color: fg },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function AppInput({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const colors = useColors();
  const large = useContext(TextScaleContext);
  return (
    <View style={styles.inputWrap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        allowFontScaling
        maxFontSizeMultiplier={1.7}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={label}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            color: colors.foreground,
            borderRadius: colors.radius,
            fontSize: large ? 19 : 17,
          },
          style,
        ]}
      />
    </View>
  );
}

export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.heading}>
      <AppText variant="title">{title}</AppText>
      <AppText variant="muted">{subtitle}</AppText>
    </View>
  );
}

export function BrandMark() {
  const colors = useColors();
  return (
    <View style={[styles.brandMark, { backgroundColor: colors.secondary }]}>
      <Feather name="heart" size={22} color={colors.primary} />
    </View>
  );
}

export function InlineNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success";
}) {
  const colors = useColors();
  const color =
    tone === "warning"
      ? colors.destructive
      : tone === "success"
        ? colors.primary
        : colors.mutedForeground;
  return (
    <View style={[styles.notice, { borderColor: colors.border }]}>
      <Feather
        name={tone === "warning" ? "alert-circle" : tone === "success" ? "check-circle" : "info"}
        size={18}
        color={color}
      />
      <AppText variant="muted" style={{ flex: 1, color }}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 20, gap: 16 },
  card: { borderWidth: 1, padding: 18, gap: 12 },
  heading: { gap: 6, marginBottom: 4 },
  button: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 17,
    lineHeight: 23,
    textAlign: "center",
  },
  inputWrap: { gap: 7 },
  input: {
    minHeight: 56,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },
});
