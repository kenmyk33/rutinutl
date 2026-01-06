import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image as ImageIcon, MapPin } from 'lucide-react-native';
import { type SearchResult } from '../lib/searchTools';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onResultPress: (result: SearchResult) => void;
}

export default function SearchResults({
  results,
  loading,
  query,
  onResultPress,
}: SearchResultsProps) {
  if (!query.trim()) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tools found for &quot;{query}&quot;</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {results.map((result, index) => (
          <TouchableOpacity
            key={result.id}
            style={[
              styles.resultItem,
              index === results.length - 1 && styles.lastResultItem,
            ]}
            onPress={() => onResultPress(result)}
            activeOpacity={0.7}
          >
            {result.image_url ? (
              <Image
                source={{ uri: result.image_url }}
                style={styles.resultImage}
              />
            ) : (
              <View style={styles.resultImagePlaceholder}>
                <ImageIcon size={24} color="#C7C7CC" />
              </View>
            )}
            <View style={styles.resultInfo}>
              <Text style={styles.resultName} numberOfLines={1}>
                {result.name}
              </Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#8E8E93" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {result.location_name || `Location ${result.location_marker_id.slice(-4)}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 280,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  lastResultItem: {
    borderBottomWidth: 0,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  resultImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
