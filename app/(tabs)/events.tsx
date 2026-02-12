import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchDogEvents, type DogEvent } from '@/lib/events-data';
import { getEventsText } from '@/lib/events-l10n';

type CalendarCell = {
  dateIso: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

const QUICK_AREAS = ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Fukuoka'];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(dateIso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

function firstDayOfMonth(dateIso: string) {
  const parsed = parseIsoDate(dateIso);
  if (!parsed) return new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function buildCalendarCells(monthCursor: Date, todayIso: string): CalendarCell[] {
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
    return {
      dateIso: toIsoDate(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthCursor.getMonth(),
      isToday: toIsoDate(date) === todayIso,
    };
  });
}

function formatDateTime(dateTime: string, localeTag: string) {
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return dateTime;
  }
  return parsed.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
}

export default function EventsScreen() {
  const text = getEventsText();
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);
  const [monthCursor, setMonthCursor] = useState(() => firstDayOfMonth(todayIso));
  const [area, setArea] = useState('');
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [source, setSource] = useState<'eventbrite' | 'sample'>('eventbrite');
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const monthLabel = useMemo(
    () => monthCursor.toLocaleDateString(text.localeTag, { year: 'numeric', month: 'long' }),
    [monthCursor, text.localeTag]
  );
  const cells = useMemo(() => buildCalendarCells(monthCursor, todayIso), [monthCursor, todayIso]);

  const runSearch = async (dateIso: string, areaText: string) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await searchDogEvents({ dateIso, area: areaText });
      setEvents(result.events);
      setSource(result.source);

      if (result.reason === 'token-missing') {
        setMessage(text.tokenMissingNotice);
      } else if (result.reason === 'api-failed') {
        setMessage(text.apiFailedNotice);
      }
    } catch (error) {
      setEvents([]);
      setSource('eventbrite');
      setMessage(error instanceof Error ? error.message : 'Event search failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch(todayIso, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDate = (dateIso: string) => {
    setSelectedDateIso(dateIso);
    const parsed = parseIsoDate(dateIso);
    if (parsed) {
      setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
    void runSearch(dateIso, area);
  };

  const handleMoveMonth = (delta: number) => {
    setMonthCursor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const handleToday = () => {
    setSelectedDateIso(todayIso);
    setMonthCursor(firstDayOfMonth(todayIso));
    void runSearch(todayIso, area);
  };

  const handleAreaSearch = () => {
    void runSearch(selectedDateIso, area);
  };

  const handleClearArea = () => {
    setArea('');
    void runSearch(selectedDateIso, '');
  };

  const handleQuickArea = (value: string) => {
    setArea(value);
    void runSearch(selectedDateIso, value);
  };

  const handleOpenLink = async (url: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setMessage(text.openLinkFailed);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.caption}>{text.caption}</Text>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.label}>{text.selectedDate}</Text>
          <View style={styles.monthRow}>
            <Pressable style={styles.monthButton} onPress={() => handleMoveMonth(-1)}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <Pressable style={styles.monthButton} onPress={() => handleMoveMonth(1)}>
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {text.weekdays.map((label) => (
              <Text key={label} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((cell) => {
              const selected = cell.dateIso === selectedDateIso;
              return (
                <Pressable
                  key={cell.dateIso}
                  style={[
                    styles.dayCell,
                    !cell.inCurrentMonth ? styles.dayCellMuted : null,
                    selected ? styles.dayCellSelected : null,
                    cell.isToday && !selected ? styles.dayCellToday : null,
                  ]}
                  onPress={() => handleSelectDate(cell.dateIso)}>
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inCurrentMonth ? styles.dayTextMuted : null,
                      selected ? styles.dayTextSelected : null,
                    ]}>
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filterActions}>
            <Pressable style={styles.ghostButton} onPress={handleToday}>
              <Text style={styles.ghostButtonText}>{text.todayAction}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{text.areaLabel}</Text>
          <TextInput
            style={styles.input}
            value={area}
            onChangeText={setArea}
            placeholder={text.areaPlaceholder}
            autoCapitalize="words"
          />
          <View style={styles.filterActions}>
            <Pressable style={styles.primaryButton} onPress={handleAreaSearch}>
              <Text style={styles.primaryButtonText}>{text.searchAction}</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={handleClearArea}>
              <Text style={styles.ghostButtonText}>{text.clearAreaAction}</Text>
            </Pressable>
          </View>

          <Text style={styles.quickAreasLabel}>{text.quickAreasLabel}</Text>
          <View style={styles.quickAreaRow}>
            {QUICK_AREAS.map((quickArea) => (
              <Pressable
                key={quickArea}
                style={[
                  styles.quickAreaChip,
                  area.trim().toLowerCase() === quickArea.toLowerCase() ? styles.quickAreaChipActive : null,
                ]}
                onPress={() => handleQuickArea(quickArea)}>
                <Text
                  style={[
                    styles.quickAreaChipText,
                    area.trim().toLowerCase() === quickArea.toLowerCase() ? styles.quickAreaChipTextActive : null,
                  ]}>
                  {quickArea}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sourceLine}>
            {text.sourceLabel}: {source === 'eventbrite' ? text.sourceEventbrite : text.sourceSample}
          </Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#9b7a50" />
              <Text style={styles.loadingText}>{text.loading}</Text>
            </View>
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>{text.noResults}</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <Text style={styles.eventTime}>{formatDateTime(event.startAt, text.localeTag)}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.venueName ? <Text style={styles.eventMeta}>{event.venueName}</Text> : null}
                {event.area ? <Text style={styles.eventMeta}>{event.area}</Text> : null}
                {event.description ? <Text style={styles.eventDesc}>{event.description}</Text> : null}
                {event.url ? (
                  <Pressable style={styles.linkButton} onPress={() => void handleOpenLink(event.url)}>
                    <Text style={styles.linkButtonText}>{text.openLink}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6efe3',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#eadfcd',
    borderRadius: 16,
    padding: 16,
  },
  title: {
    color: '#4a3828',
    fontSize: 24,
    fontWeight: '800',
  },
  caption: {
    marginTop: 4,
    color: '#806a50',
    fontSize: 13,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d8c8af',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  label: {
    color: '#6a543c',
    fontSize: 13,
    fontWeight: '700',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 36,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dac9b2',
    backgroundColor: '#f9f3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: '#6a543c',
    fontSize: 16,
    fontWeight: '800',
  },
  monthText: {
    color: '#4d3a29',
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  weekLabel: {
    width: '14%',
    textAlign: 'center',
    color: '#9a8469',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2d4bf',
    backgroundColor: '#fffdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellMuted: {
    backgroundColor: '#f6f0e6',
    borderColor: '#eee2cf',
  },
  dayCellToday: {
    borderColor: '#b89062',
  },
  dayCellSelected: {
    backgroundColor: '#b89062',
    borderColor: '#b89062',
  },
  dayText: {
    color: '#5e4832',
    fontWeight: '700',
  },
  dayTextMuted: {
    color: '#b8a288',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d7c7ad',
    backgroundColor: '#f8f1e6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostButtonText: {
    color: '#6c5439',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: '#4a3828',
    fontSize: 14,
  },
  quickAreasLabel: {
    color: '#806a50',
    fontSize: 12,
    marginTop: 4,
  },
  quickAreaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAreaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8c8af',
    backgroundColor: '#fff8ef',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickAreaChipActive: {
    backgroundColor: '#b89062',
    borderColor: '#b89062',
  },
  quickAreaChipText: {
    color: '#6c5439',
    fontSize: 12,
    fontWeight: '700',
  },
  quickAreaChipTextActive: {
    color: '#ffffff',
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d8c8af',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  sourceLine: {
    color: '#806a50',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#6f583f',
    fontSize: 13,
  },
  emptyText: {
    color: '#6f583f',
    fontSize: 13,
  },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2d4bf',
    backgroundColor: '#fffdf9',
    padding: 10,
    gap: 4,
  },
  eventTime: {
    color: '#9b7a50',
    fontSize: 12,
    fontWeight: '800',
  },
  eventTitle: {
    color: '#4a3828',
    fontSize: 15,
    fontWeight: '700',
  },
  eventMeta: {
    color: '#806a50',
    fontSize: 12,
  },
  eventDesc: {
    color: '#5f4a34',
    fontSize: 12,
    marginTop: 2,
  },
  linkButton: {
    marginTop: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f4eadb',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkButtonText: {
    color: '#6a543c',
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    color: '#745d43',
    fontSize: 12,
  },
});
