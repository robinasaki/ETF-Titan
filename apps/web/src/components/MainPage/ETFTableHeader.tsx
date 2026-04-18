import { Spinner, Text, XStack, useTheme } from "tamagui";

type ETFTableHeaderProps = {
  activeEtfId: string;
  summaryLabel: string;
  isLoading: boolean;
};

export function ETFTableHeader({
  activeEtfId,
  summaryLabel,
  isLoading,
}: ETFTableHeaderProps) {
  const theme = useTheme();

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      flexWrap="nowrap"
      paddingHorizontal={18}
      paddingVertical={14}
      backgroundColor={theme.panePrimary}
      overflow="hidden"
      borderBottomWidth={1}
      borderBottomColor={theme.paneBorderPrimary}
    >
      <Text
        color={theme.paneTextPrimary}
        fontSize={14}
        fontWeight="600"
        numberOfLines={1}
        ellipsizeMode="tail"
        minWidth={0}
        flexShrink={1}
      >
        {activeEtfId || "Loading ETFs"}
      </Text>

      <XStack
        alignItems="center"
        gap={10}
        minWidth={0}
        marginLeft="auto"
        flexShrink={0}
        flexWrap="nowrap"
      >
        {isLoading ? <Spinner color={theme.paneTextPrimary?.val} size="small" /> : null}

        <Text
          color={theme.paneTextPrimary}
          fontSize={14}
          numberOfLines={1}
          ellipsizeMode="tail"
          minWidth={0}
          flexShrink={1}
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {summaryLabel}
        </Text>
      </XStack>
    </XStack>
  );
}
