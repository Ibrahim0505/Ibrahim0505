import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { MapPin } from "phosphor-react-native";

export type { Region };

import { useTheme } from "@/src/theme";
import type { Location } from "@/src/api";

export type KrotoMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

type Props = {
  locations: Location[];
  selectedId?: string | null;
  mapType?: "standard" | "hybrid";
  initialRegion?: Region;
  showsUserLocation?: boolean;
  onMarkerPress?: (loc: Location) => void;
  onMapPress?: () => void;
};

export const KrotoMap = forwardRef<KrotoMapHandle, Props>(function KrotoMap(
  { locations, selectedId, mapType = "standard", initialRegion, showsUserLocation, onMarkerPress, onMapPress },
  ref,
) {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [track, setTrack] = useState(true);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 600) => {
      mapRef.current?.animateToRegion(region, duration);
    },
  }));

  useEffect(() => {
    const t = setTimeout(() => setTrack(false), 1600);
    return () => clearTimeout(t);
  }, [locations.length]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      mapType={mapType}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      onPress={onMapPress}
      testID="kroto-map"
    >
      {locations.map((loc) => {
        const ready = loc.status === "ready";
        const color = ready ? colors.success : colors.warning;
        const selected = selectedId === loc.id;
        return (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            onPress={() => onMarkerPress?.(loc)}
            tracksViewChanges={track}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.pin,
                { backgroundColor: color, borderColor: colors.surfaceSecondary },
                selected && styles.pinSelected,
              ]}
            >
              <MapPin size={selected ? 20 : 16} weight="fill" color={ready ? colors.onSuccess : colors.onWarning} />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
});

const styles = StyleSheet.create({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
});
