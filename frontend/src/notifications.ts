import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import dayjs from "dayjs";

import { storage } from "@/src/utils/storage";
import type { Location } from "@/src/api";

const MAP_KEY = "carikroto.notif.map";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function getMap(): Promise<Record<string, string>> {
  return (await storage.getItem<Record<string, string>>(MAP_KEY, {})) ?? {};
}

async function saveMap(map: Record<string, string>) {
  await storage.setItem(MAP_KEY, map);
}

export async function cancelHarvestReminder(locationId: string) {
  if (Platform.OS === "web") return;
  const map = await getMap();
  const id = map[locationId];
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
    delete map[locationId];
    await saveMap(map);
  }
}

// Schedules (or reschedules) a reminder at the location's next harvest time.
export async function scheduleHarvestReminder(location: Location): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await cancelHarvestReminder(location.id);

  if (!location.next_harvest_at) return false;
  const when = dayjs(location.next_harvest_at);
  if (when.isBefore(dayjs())) return false; // already due, no reminder needed

  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🐜 Waktunya panen kroto!",
      body: `${location.name} sudah siap dipanen. Ayo berangkat!`,
      data: { locationId: location.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when.toDate(),
    },
  });

  const map = await getMap();
  map[location.id] = id;
  await saveMap(map);
  return true;
}
