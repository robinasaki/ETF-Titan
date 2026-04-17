import { APP_NAME } from "../../constants/app";
import { useTheme, Text, XStack, YStack } from "tamagui";

export function MainHeader() {
    const theme = useTheme();

    return (
        <YStack
            gap={6}
            paddingTop={24}
            paddingBottom={12}
        >
            {/* Normally I would define the app logo as a separate reusable .tsx.
                But it's just a Text here and there is no reuse case for it. So I'll leave it as a Text.
             */}
            <XStack>
                <Text fontSize={36} fontFamily="Futura PT" fontWeight="500">
                    {APP_NAME}
                </Text>
            </XStack>
        </YStack>
    );
}
