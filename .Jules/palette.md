## 2024-10-16 - Accessibility Label for Custom Buttons\n**Learning:** The application extensively uses `Pressable` from `react-native` to build custom buttons (e.g. `StampButton`), but many lack accessibility labels for screen readers. In React Native, `accessibilityLabel`, `accessibilityRole="button"`, and `accessibilityState={{ disabled }}` act as the ARIA equivalents.\n**Action:** Always verify that custom `Pressable` or `TouchableOpacity` components define clear `accessibilityLabel`, `accessibilityRole`, and `accessibilityState` attributes so interactive elements are discoverable by screen readers.

## 2024-03-24 - Accessible Grid Elements
**Learning:** Custom grid components in React Native need explicit accessibility attributes (role, label, state, hint) to be usable by screen readers.
**Action:** Always add ARIA equivalents to interactive grid cells.
