import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet} from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Circle } from 'react-native-svg';

// Pithoragarh District Coordinates (simplified polygon)
const GEO_FENCE_COORDINATES = [
  // Northwest Border (Uttarkashi/Tibet)
  { latitude: 31.0154, longitude: 79.1234 }, // Niti Pass
  { latitude: 30.8765, longitude: 79.3456 }, // Mana Pass
  { latitude: 30.7654, longitude: 79.5678 }, // Badrinath area

  // Western Border (Garhwal Region)
  { latitude: 30.4567, longitude: 79.0123 }, // Rudraprayag
  { latitude: 30.1234, longitude: 79.2345 }, // Chamoli
  { latitude: 29.8765, longitude: 79.4567 }, // Pauri border

  // Southern Border (Udham Singh Nagar/UP)
  { latitude: 29.3456, longitude: 79.0123 }, // Kashipur
  { latitude: 29.1234, longitude: 79.2345 }, // Bazpur
  { latitude: 28.9876, longitude: 79.4567 }, // Khatima

  // Eastern Border (Nepal)
  { latitude: 28.8765, longitude: 80.1234 }, // Banbasa
  { latitude: 29.1234, longitude: 80.3456 }, // Jhulaghat
  { latitude: 29.3456, longitude: 80.5678 }, // Dharchula
  { latitude: 29.6789, longitude: 80.7890 }, // Tawaghat

  // Northern Border (Tibet)
  { latitude: 30.1234, longitude: 80.8765 }, // Lipulekh Pass
  { latitude: 30.3456, longitude: 80.6543 }, // Kalapani
  { latitude: 30.5678, longitude: 80.4321 }, // Gunji
  { latitude: 30.7890, longitude: 80.2109 }, // Kuti Valley

  // Closing point
  { latitude: 31.0154, longitude: 79.1234 }  // Back to Niti Pass
];

const App = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [status, setStatus] = useState('OUTSIDE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if point is inside polygon
  const isPointInPolygon = (point:any, polygon:any) => {
    const x = point.latitude;
    const y = point.longitude;

    // if the current location is insde the geo-fencing 
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude, yi = polygon[i].longitude;
      const xj = polygon[j].latitude, yj = polygon[j].longitude;
      
      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Check if point is on the edge
  const isPointOnEdge = (point:any, polygon:any, margin = 0.0001) => {
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      
      // Check if point is near the line segment p1-p2
      if (isPointNearLine(point, p1, p2, margin)) {
        return true;
      }
    }
    return false;
  };

  const isPointNearLine = (point:any, lineStart:any, lineEnd:any, margin:any) => {
    // Calculate distance between point and line segment
    const d = distanceToLineSegment(point, lineStart, lineEnd);
    return d <= margin;
  };

  // Calculate distance from point to line segment
  const distanceToLineSegment = (point:any, lineStart:any, lineEnd:any) => {
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.latitude;
      yy = lineStart.longitude;
    } else if (param > 1) {
      xx = lineEnd.latitude;
      yy = lineEnd.longitude;
    } else {
      xx = lineStart.latitude + param * C;
      yy = lineStart.longitude + param * D;
    }

    const dx = point.latitude - xx;
    const dy = point.longitude - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Update location status
  const updateLocationStatus = (currentLocation:any) => {
    if (!currentLocation) return;
    
    const point = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude
    };

    if (isPointOnEdge(point, GEO_FENCE_COORDINATES)) {
      setStatus('ON THE EDGE');
    } else if (isPointInPolygon(point, GEO_FENCE_COORDINATES)) {
      setStatus('INSIDE');
    } else {
      setStatus('OUTSIDE');
    }
  };

  // Get location permission
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
          updateLocationStatus(newLocation);
        }
      );

      return () => locationSubscription?.remove();
    })();
  }, []);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>You are: {status} PITHORAGARH</Text>
        <Text style={styles.statusText}>{location?.coords.latitude}, {location?.coords.longitude} </Text>
      </View>
      
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 29.9715,  // Centered on Pithoragarh town
          longitude: 80.5456,
          latitudeDelta: 1.5,  // Zoomed out to show entire district
          longitudeDelta: 1.5,
        }}
        showsUserLocation={true}
        followsUserLocation={false}
      >
        <Polygon
          coordinates={GEO_FENCE_COORDINATES}
          fillColor="rgba(100, 188, 200, 0.3)"  // Semi-transparent green
          strokeColor="rgba(10, 0, 105, 0.8)"    // Dark green border
          strokeWidth={3}
        />
        
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
          >
            <Svg height="24" width="24">
              <Circle
                cx="12"
                cy="12"
                r="10"
                fill={
                  status === 'INSIDE' ? '#4CAF50' :
                  status === 'ON THE EDGE' ? '#FFC107' : '#F44336'
                }
                stroke="#333"
                strokeWidth="2"
              />
            </Svg>
          </Marker>
        )}
      </MapView>
      
      {/* Sample UI Preview (comment out in actual app) */}
      {/* <Image 
        source={require('./pithoragarh-preview.png')} 
        style={styles.previewImage}
        resizeMode="contain"
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  statusContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    alignItems: 'center',
    zIndex: 1,
    elevation: 5,
    borderRadius: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  previewImage: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 200,
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default App;
