import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

export function ThinkingIndicator({ name = 'Jorge' }: { name?: string }) {
    const a1 = useRef(new Animated.Value(0.3)).current;
    const a2 = useRef(new Animated.Value(0.3)).current;
    const a3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = (v: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0.3, duration: 250, useNativeDriver: true }),
                ])
            );

        const p1 = pulse(a1, 0);
        const p2 = pulse(a2, 120);
        const p3 = pulse(a3, 240);

        p1.start();
        p2.start();
        p3.start();
        return () => {
            p1.stop();
            p2.stop();
            p3.stop();
        };
    }, [a1, a2, a3]);

    return (
        <View style={dotStyles.row}>
            <Text style={dotStyles.text}>{name} is thinking</Text>
            <View style={dotStyles.dots}>
                <Animated.View style={[dotStyles.dot, { opacity: a1 }]} />
                <Animated.View style={[dotStyles.dot, { opacity: a2 }]} />
                <Animated.View style={[dotStyles.dot, { opacity: a3 }]} />
            </View>
        </View>
    );
}

const dotStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { color: '#9aa0a6', fontSize: 14 },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: '#9aa0a6' },
});
