import { useRef, useState, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import { PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import * as Brightness from 'expo-brightness';

interface GestureControlConfig {
    volume: number;
    setVolume: (value: number) => void;
    brightness?: number;
    setBrightness?: (value: number) => void;
    volumeRange?: { min: number; max: number };
    volumeSensitivity?: number;
    brightnessSensitivity?: number;
    overlayTimeout?: number;
    debugMode?: boolean;
}

export const usePlayerGestureControls = (config: GestureControlConfig) => {
    const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
    const [showBrightnessOverlay, setShowBrightnessOverlay] = useState(false);
    const [showResizeModeOverlay, setShowResizeModeOverlay] = useState(false);

    const volumeGestureTranslateY = useRef(new Animated.Value(0)).current;
    const brightnessGestureTranslateY = useRef(new Animated.Value(0)).current;
    const volumeOverlayOpacity = useRef(new Animated.Value(0)).current;
    const brightnessOverlayOpacity = useRef(new Animated.Value(0)).current;
    const resizeModeOverlayOpacity = useRef(new Animated.Value(0)).current;

    const lastVolumeGestureY = useRef(0);
    const lastBrightnessGestureY = useRef(0);

    const volumeOverlayTimeout = useRef<NodeJS.Timeout | null>(null);
    const brightnessOverlayTimeout = useRef<NodeJS.Timeout | null>(null);
    const resizeModeOverlayTimeout = useRef<NodeJS.Timeout | null>(null);

    const volumeRange = config.volumeRange || { min: 0, max: 1 };
    const baseVolumeSensitivity = config.volumeSensitivity || 0.006;
    const baseBrightnessSensitivity = config.brightnessSensitivity || 0.004;
    const overlayTimeout = config.overlayTimeout || 1500;

    const platformMultiplier = Platform.OS === 'android' ? 1.6 : 1.0;
    const volumeSensitivity = baseVolumeSensitivity * platformMultiplier;
    const brightnessSensitivity = baseBrightnessSensitivity * platformMultiplier;

    const cleanup = () => {
        if (volumeOverlayTimeout.current) {
            clearTimeout(volumeOverlayTimeout.current);
        }
        if (brightnessOverlayTimeout.current) {
            clearTimeout(brightnessOverlayTimeout.current);
        }
        if (resizeModeOverlayTimeout.current) {
            clearTimeout(resizeModeOverlayTimeout.current);
        }
    };

    useEffect(() => {
        return () => cleanup();
    }, []);

    const onVolumeGestureEvent = Animated.event([
        { nativeEvent: { translationY: volumeGestureTranslateY } }
    ], {
        useNativeDriver: false,
        listener: (event: PanGestureHandlerGestureEvent) => {
            const { translationY, state } = event.nativeEvent;

            if (state === State.ACTIVE) {
                if (Math.abs(translationY) < 5 && Math.abs(lastVolumeGestureY.current - translationY) > 20) {
                    lastVolumeGestureY.current = translationY;
                    return;
                }

                const deltaY = -(translationY - lastVolumeGestureY.current);
                lastVolumeGestureY.current = translationY;
                const rangeMultiplier = volumeRange.max - volumeRange.min;
                const volumeChange = deltaY * volumeSensitivity * rangeMultiplier;
                const newVolume = Math.max(volumeRange.min, Math.min(volumeRange.max, config.volume + volumeChange));
                config.setVolume(newVolume);

                if (config.debugMode) {
                    console.log(`[GestureControls] Volume: ${newVolume.toFixed(2)} (Sensitivity: ${volumeSensitivity.toFixed(4)})`);
                }
                if (!showVolumeOverlay) {
                    setShowVolumeOverlay(true);
                    volumeOverlayOpacity.setValue(1);
                }
                if (volumeOverlayTimeout.current) {
                    clearTimeout(volumeOverlayTimeout.current);
                }
                volumeOverlayTimeout.current = setTimeout(() => {
                    Animated.timing(volumeOverlayOpacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => setShowVolumeOverlay(false));
                }, overlayTimeout);
            }
        }
    });

    const onBrightnessGestureEvent = config.brightness !== undefined && config.setBrightness ? Animated.event([
        { nativeEvent: { translationY: brightnessGestureTranslateY } }
    ], {
        useNativeDriver: false,
        listener: (event: PanGestureHandlerGestureEvent) => {
            const { translationY, state } = event.nativeEvent;

            if (state === State.ACTIVE) {
                if (Math.abs(translationY) < 5 && Math.abs(lastBrightnessGestureY.current - translationY) > 20) {
                    lastBrightnessGestureY.current = translationY;
                    return;
                }

                const deltaY = -(translationY - lastBrightnessGestureY.current);
                lastBrightnessGestureY.current = translationY;
                const brightnessChange = deltaY * brightnessSensitivity;
                const currentBrightness = config.brightness as number;
                const newBrightness = Math.max(0, Math.min(1, currentBrightness + brightnessChange));
                config.setBrightness!(newBrightness);
                Brightness.setBrightnessAsync(newBrightness).catch((error) => {
                    if (config.debugMode) {
                        console.error('[GestureControls] Failed to set brightness:', error);
                    }
                });

                if (config.debugMode) {
                    console.log(`[GestureControls] Brightness: ${newBrightness.toFixed(2)} (Sensitivity: ${brightnessSensitivity.toFixed(4)})`);
                }
                if (!showBrightnessOverlay) {
                    setShowBrightnessOverlay(true);
                    brightnessOverlayOpacity.setValue(1);
                }
                if (brightnessOverlayTimeout.current) {
                    clearTimeout(brightnessOverlayTimeout.current);
                }
                brightnessOverlayTimeout.current = setTimeout(() => {
                    Animated.timing(brightnessOverlayOpacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => setShowBrightnessOverlay(false));
                }, overlayTimeout);
            }
        }
    }) : undefined;

    const showResizeModeOverlayFn = (callback?: () => void) => {
        if (resizeModeOverlayTimeout.current) {
            clearTimeout(resizeModeOverlayTimeout.current);
        }
        setShowResizeModeOverlay(true);
        Animated.timing(resizeModeOverlayOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            if (callback) callback();
            resizeModeOverlayTimeout.current = setTimeout(() => {
                Animated.timing(resizeModeOverlayOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => setShowResizeModeOverlay(false));
            }, overlayTimeout);
        });
    };

    return {
        onVolumeGestureEvent,
        onBrightnessGestureEvent,
        showVolumeOverlay,
        showBrightnessOverlay,
        showResizeModeOverlay,
        volumeOverlayOpacity,
        brightnessOverlayOpacity,
        resizeModeOverlayOpacity,
        showResizeModeOverlayFn,
        cleanup,
    };
};